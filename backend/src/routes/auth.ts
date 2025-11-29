import { Router } from 'express';
import {
  login,
  getCurrentUser,
  createAdminUser,
  generateApiKey,
  revokeApiKey,
  listApiKeys,
} from '../controllers/auth/auth.controller.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// Public routes
router.post('/login', asyncHandler(login));

// Protected routes
router.get('/me', authenticate, asyncHandler(getCurrentUser));

// API key management
router.get('/api-keys', authenticate, asyncHandler(listApiKeys));
router.post('/api-keys', authenticate, asyncHandler(generateApiKey));
router.delete('/api-keys/:id', authenticate, asyncHandler(revokeApiKey));

// Admin user management (Super Admin only)
router.post('/users', authenticate, requireSuperAdmin, asyncHandler(createAdminUser));

export default router;
