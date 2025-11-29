import { Router } from 'express';
import {
  getDonations,
  getRecentDonations,
  getDonationByTxHash,
  getLeaderboard,
  getDonorStats,
} from '../controllers/donations/donation.controller.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// All donation routes are public
router.get('/', asyncHandler(getDonations));
router.get('/recent', asyncHandler(getRecentDonations));
router.get('/leaderboard', asyncHandler(getLeaderboard));
router.get('/tx/:txHash', asyncHandler(getDonationByTxHash));
router.get('/donor/:address', asyncHandler(getDonorStats));

export default router;
