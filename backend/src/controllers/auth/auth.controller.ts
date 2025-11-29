import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../db/prisma.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { LoginSchema, CreateAdminUserSchema } from '../../types/schemas.js';
import { successResponse } from '../../utils/response.js';
import { 
  hashPassword, 
  verifyPassword, 
  generateToken 
} from '../../middleware/auth.js';
import { 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../utils/errors.js';
import { apiLogger } from '../../utils/logger.js';

// ==========================================
// LOGIN
// ==========================================
export async function login(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const input = LoginSchema.parse(req.body);

  const user = await prisma.adminUser.findUnique({
    where: { email: input.email },
    include: { organization: true },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  if (!verifyPassword(input.password, user.passwordHash)) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Update last login
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'auth.login',
      entityType: 'admin_user',
      entityId: user.id,
      adminUserId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  apiLogger.info({ userId: user.id }, 'User logged in');

  res.json(successResponse({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
      } : null,
    },
  }));
}

// ==========================================
// GET CURRENT USER
// ==========================================
export async function getCurrentUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: req.user.id },
    include: { organization: true },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json(successResponse({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    walletAddress: user.walletAddress,
    organization: user.organization ? {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug,
    } : null,
    lastLoginAt: user.lastLoginAt,
  }));
}

// ==========================================
// CREATE ADMIN USER (Super Admin only)
// ==========================================
export async function createAdminUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const input = CreateAdminUserSchema.parse(req.body);

  // Check for existing user
  const existing = await prisma.adminUser.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new ConflictError('User with this email already exists');
  }

  // Verify organization if specified
  if (input.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
    });
    if (!org) {
      throw new ValidationError('Invalid organization ID');
    }
  }

  const user = await prisma.adminUser.create({
    data: {
      email: input.email,
      passwordHash: hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      organizationId: input.organizationId,
      walletAddress: input.walletAddress?.toLowerCase(),
    },
    include: { organization: true },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'admin_user.create',
      entityType: 'admin_user',
      entityId: user.id,
      adminUserId: req.user?.id,
      newValue: { email: user.email, role: user.role } as any,
    },
  });

  apiLogger.info({ newUserId: user.id, createdBy: req.user?.id }, 'Admin user created');

  res.status(201).json(successResponse({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organization: user.organization ? {
      id: user.organization.id,
      name: user.organization.name,
    } : null,
  }));
}

// ==========================================
// GENERATE API KEY
// ==========================================
export async function generateApiKey(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const { name, permissions, expiresInDays } = req.body as {
    name: string;
    permissions?: string[];
    expiresInDays?: number;
  };

  if (!name || name.length < 3) {
    throw new ValidationError('API key name must be at least 3 characters');
  }

  // Generate a secure random API key
  const apiKey = `lum_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await prisma.apiKey.create({
    data: {
      keyHash,
      name,
      adminUserId: req.user.id,
      permissions: permissions ?? [],
      expiresAt,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'api_key.create',
      entityType: 'api_key',
      adminUserId: req.user.id,
      metadata: { name } as any,
    },
  });

  // Return the key only once - it won't be shown again
  res.status(201).json(successResponse({
    apiKey,
    name,
    expiresAt,
    warning: 'Save this key securely. It will not be shown again.',
  }));
}

// ==========================================
// REVOKE API KEY
// ==========================================
export async function revokeApiKey(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!apiKey) {
    throw new NotFoundError('API key');
  }

  // Users can only revoke their own keys unless super admin
  if (req.user?.role !== 'SUPER_ADMIN' && apiKey.adminUserId !== req.user?.id) {
    throw new ForbiddenError('Cannot revoke this API key');
  }

  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'api_key.revoke',
      entityType: 'api_key',
      entityId: id,
      adminUserId: req.user?.id,
    },
  });

  res.json(successResponse({ message: 'API key revoked' }));
}

// ==========================================
// LIST USER'S API KEYS
// ==========================================
export async function listApiKeys(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const keys = await prisma.apiKey.findMany({
    where: { adminUserId: req.user.id },
    select: {
      id: true,
      name: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(successResponse(keys));
}
