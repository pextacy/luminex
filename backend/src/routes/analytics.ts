import { Router } from 'express';
import {
  getGlobalAnalytics,
  getCampaignAnalytics,
  getRealtimeStats,
  getStatsByDateRange,
  getLiveActivity,
  getDonationTrends,
  getCategoryBreakdown,
} from '../controllers/analytics/analytics.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// Public analytics - these match frontend API calls
router.get('/overview', asyncHandler(getGlobalAnalytics));
router.get('/global', asyncHandler(getGlobalAnalytics)); // Alias
router.get('/live', asyncHandler(getLiveActivity));
router.get('/trends', asyncHandler(getDonationTrends));
router.get('/categories', asyncHandler(getCategoryBreakdown));

// Campaign-specific analytics
router.get('/campaigns/:id', asyncHandler(getCampaignAnalytics));

// Protected routes
router.get('/realtime', authenticate, asyncHandler(getRealtimeStats));
router.get('/range', authenticate, asyncHandler(getStatsByDateRange));

export default router;
