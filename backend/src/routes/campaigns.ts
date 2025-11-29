import { Router } from 'express';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  getFeaturedCampaigns,
  getRecentCampaigns,
  getCampaignDonations,
  getCampaignStats,
} from '../controllers/campaigns/campaign.controller.js';
import { authenticate, requireOrgManager } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// Public routes
router.get('/', asyncHandler(getCampaigns));
router.get('/featured', asyncHandler(getFeaturedCampaigns));
router.get('/recent', asyncHandler(getRecentCampaigns));
router.get('/:id', asyncHandler(getCampaign));
router.get('/:id/donations', asyncHandler(getCampaignDonations));
router.get('/:id/stats', asyncHandler(getCampaignStats));

// Protected routes
router.post('/', authenticate, requireOrgManager, asyncHandler(createCampaign));
router.patch('/:id', authenticate, requireOrgManager, asyncHandler(updateCampaign));

export default router;
