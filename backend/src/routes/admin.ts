import { Router } from 'express';
import {
  getWithdrawals,
  requestWithdrawal,
  approveWithdrawal,
  cancelWithdrawal,
  getAuditLogs,
} from '../controllers/admin/admin.controller.js';
import { 
  authenticate, 
  requireOrgAdmin, 
  requireSuperAdmin 
} from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// Withdrawal management
router.get('/withdrawals', requireOrgAdmin, asyncHandler(getWithdrawals));
router.post('/withdrawals', requireOrgAdmin, asyncHandler(requestWithdrawal));
router.post('/withdrawals/:id/approve', requireSuperAdmin, asyncHandler(approveWithdrawal));
router.post('/withdrawals/:id/cancel', requireOrgAdmin, asyncHandler(cancelWithdrawal));

// Audit logs (Super Admin only)
router.get('/audit-logs', requireSuperAdmin, asyncHandler(getAuditLogs));

export default router;
