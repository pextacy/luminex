import { Router } from 'express';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  verifyOrganization,
} from '../controllers/organizations/organization.controller.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// Public routes
router.get('/', asyncHandler(getOrganizations));
router.get('/:slug', asyncHandler(getOrganization));

// Protected routes (Super Admin only)
router.post('/', authenticate, requireSuperAdmin, asyncHandler(createOrganization));
router.post('/:id/verify', authenticate, requireSuperAdmin, asyncHandler(verifyOrganization));

export default router;
