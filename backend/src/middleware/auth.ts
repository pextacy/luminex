import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config/index.js';
import { prisma } from '../../db/prisma.js';
import { AuthenticatedRequest, AuthenticatedUser } from '../../types/index.js';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors.js';
import { apiLogger } from '../../utils/logger.js';
import { AdminRole } from '@prisma/client';

// ==========================================
// JWT HELPERS
// ==========================================

interface JwtPayload {
  userId: string;
  email: string;
  role: AdminRole;
  organizationId?: string | null;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
}

// ==========================================
// PASSWORD HELPERS
// ==========================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedError('No authorization header');
    }

    // Handle Bearer token
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      // Verify user still exists and is active
      const user = await prisma.adminUser.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      };

      next();
      return;
    }

    // Handle API key
    if (authHeader.startsWith('ApiKey ')) {
      const apiKey = authHeader.substring(7);
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const storedKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { adminUser: true },
      });

      if (!storedKey || !storedKey.isActive) {
        throw new UnauthorizedError('Invalid API key');
      }

      // Check expiration
      if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
        throw new UnauthorizedError('API key expired');
      }

      // Update last used
      await prisma.apiKey.update({
        where: { id: storedKey.id },
        data: { lastUsedAt: new Date() },
      });

      req.user = {
        id: storedKey.adminUser.id,
        email: storedKey.adminUser.email,
        role: storedKey.adminUser.role,
        organizationId: storedKey.adminUser.organizationId,
      };

      next();
      return;
    }

    throw new UnauthorizedError('Invalid authorization format');
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
      return;
    }
    next(error);
  }
}

// ==========================================
// OPTIONAL AUTHENTICATION
// ==========================================

export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }

  // Try to authenticate, but don't fail if it doesn't work
  try {
    await authenticate(req, res, next);
  } catch {
    next();
  }
}

// ==========================================
// ROLE-BASED ACCESS CONTROL
// ==========================================

const roleHierarchy: Record<AdminRole, number> = {
  SUPER_ADMIN: 4,
  ORG_ADMIN: 3,
  ORG_MANAGER: 2,
  VIEWER: 1,
};

export function requireRole(...allowedRoles: AdminRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const hasRole = allowedRoles.some(role => 
      roleHierarchy[req.user!.role] >= roleHierarchy[role]
    );

    if (!hasRole) {
      apiLogger.warn({
        userId: req.user.id,
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      }, 'Access denied - insufficient role');
      
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
}

// Shorthand middlewares
export const requireSuperAdmin = requireRole('SUPER_ADMIN');
export const requireOrgAdmin = requireRole('ORG_ADMIN');
export const requireOrgManager = requireRole('ORG_MANAGER');

// ==========================================
// ORGANIZATION ACCESS CONTROL
// ==========================================

export function requireOrganizationAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Super admins can access everything
  if (req.user.role === 'SUPER_ADMIN') {
    next();
    return;
  }

  // Get organization ID from various sources
  const requestedOrgId = 
    req.params.organizationId || 
    req.body?.organizationId || 
    req.query.organizationId;

  if (requestedOrgId && req.user.organizationId !== requestedOrgId) {
    throw new ForbiddenError('Access denied to this organization');
  }

  next();
}
