import { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
} from '../controllers/categories/category.controller.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// Public routes
router.get('/', asyncHandler(getCategories));
router.get('/:slug', asyncHandler(getCategory));

// Protected routes (Super Admin only)
router.post('/', authenticate, requireSuperAdmin, asyncHandler(createCategory));
router.patch('/:id', authenticate, requireSuperAdmin, asyncHandler(updateCategory));

export default router;
