import { Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AuthenticatedRequest } from '../types/index.js';
import { errorResponse, ErrorCodes } from './response.js';
import { apiLogger } from './logger.js';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(ErrorCodes.UNAUTHORIZED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(ErrorCodes.FORBIDDEN, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.CONFLICT, message, 409);
    this.name = 'ConflictError';
  }
}

export class BlockchainError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCodes.BLOCKCHAIN_ERROR, message, 500, details);
    this.name = 'BlockchainError';
  }
}

// Global error handler middleware
export function errorHandler(
  err: Error,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Log error
  apiLogger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json(
      errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        { errors: err.errors }
      )
    );
    return;
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details)
    );
    return;
  }

  // Handle unknown errors
  res.status(500).json(
    errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    )
  );
}

// Validate request body helper
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Validate query params helper
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Async handler wrapper
export function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
