import { Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { CreateWithdrawalSchema, PaginationSchema } from '../../types/schemas.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import { 
  NotFoundError, 
  ForbiddenError, 
  ValidationError,
} from '../../utils/errors.js';
import { apiLogger } from '../../utils/logger.js';

// ==========================================
// GET WITHDRAWALS
// ==========================================
export async function getWithdrawals(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const query = PaginationSchema.parse(req.query);

  const where: any = {};

  // Non-super admins can only see their organization's withdrawals
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.organizationId) {
    where.organizationId = req.user.organizationId;
  }

  const total = await prisma.withdrawal.count({ where });

  const withdrawals = await prisma.withdrawal.findMany({
    where,
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      requestedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  const result = withdrawals.map(w => ({
    id: w.id,
    txHash: w.txHash,
    campaign: w.campaign,
    organization: w.organization,
    amount: w.amount.toString(),
    toAddress: w.toAddress,
    status: w.status,
    requestedBy: w.requestedBy,
    requestedAt: w.requestedAt,
    processedAt: w.processedAt,
    notes: w.notes,
  }));

  res.json(paginatedResponse(result, query.page, query.limit, total));
}

// ==========================================
// REQUEST WITHDRAWAL
// ==========================================
export async function requestWithdrawal(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const input = CreateWithdrawalSchema.parse(req.body);

  // Get campaign with organization
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    include: { organization: true },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  // Check permission
  if (req.user?.role !== 'SUPER_ADMIN') {
    if (req.user?.role === 'VIEWER' || req.user?.role === 'ORG_MANAGER') {
      throw new ForbiddenError('You do not have permission to request withdrawals');
    }
    if (req.user?.organizationId !== campaign.organizationId) {
      throw new ForbiddenError('You can only request withdrawals for your organization');
    }
  }

  // Validate withdrawal amount
  const requestedAmount = BigInt(input.amount);
  const currentAmount = BigInt(campaign.currentAmount.toString());

  // Get pending/processing withdrawals total
  const pendingWithdrawals = await prisma.withdrawal.aggregate({
    where: {
      campaignId: campaign.id,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    _sum: { amount: true },
  });

  const pendingTotal = BigInt(pendingWithdrawals._sum.amount?.toString() ?? '0');
  const availableAmount = currentAmount - pendingTotal;

  if (requestedAmount > availableAmount) {
    throw new ValidationError(
      `Requested amount exceeds available funds. Available: ${availableAmount.toString()} wei`
    );
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      campaignId: campaign.id,
      organizationId: campaign.organizationId,
      amount: input.amount,
      toAddress: input.toAddress.toLowerCase(),
      status: 'PENDING',
      requestedById: req.user!.id,
      notes: input.notes,
    },
    include: {
      campaign: { select: { title: true } },
      organization: { select: { name: true } },
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'withdrawal.request',
      entityType: 'withdrawal',
      entityId: withdrawal.id,
      adminUserId: req.user?.id,
      newValue: {
        campaignId: campaign.id,
        amount: input.amount,
        toAddress: input.toAddress,
      } as any,
    },
  });

  apiLogger.info({
    withdrawalId: withdrawal.id,
    campaignId: campaign.id,
    amount: input.amount,
    requestedBy: req.user?.id,
  }, 'Withdrawal requested');

  res.status(201).json(successResponse({
    id: withdrawal.id,
    campaign: withdrawal.campaign,
    organization: withdrawal.organization,
    amount: withdrawal.amount.toString(),
    toAddress: withdrawal.toAddress,
    status: withdrawal.status,
    requestedAt: withdrawal.requestedAt,
    notes: withdrawal.notes,
  }));
}

// ==========================================
// APPROVE WITHDRAWAL (Super Admin)
// ==========================================
export async function approveWithdrawal(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id },
    include: { campaign: true },
  });

  if (!withdrawal) {
    throw new NotFoundError('Withdrawal');
  }

  if (withdrawal.status !== 'PENDING') {
    throw new ValidationError(`Cannot approve withdrawal with status: ${withdrawal.status}`);
  }

  // Update to processing - the actual on-chain transaction will be handled
  // either manually or by an automated system
  const updated = await prisma.withdrawal.update({
    where: { id },
    data: { status: 'PROCESSING' },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'withdrawal.approve',
      entityType: 'withdrawal',
      entityId: id,
      adminUserId: req.user?.id,
      oldValue: { status: 'PENDING' } as any,
      newValue: { status: 'PROCESSING' } as any,
    },
  });

  apiLogger.info({
    withdrawalId: id,
    approvedBy: req.user?.id,
  }, 'Withdrawal approved');

  res.json(successResponse({
    id: updated.id,
    status: updated.status,
    message: 'Withdrawal approved and ready for processing',
  }));
}

// ==========================================
// CANCEL WITHDRAWAL
// ==========================================
export async function cancelWithdrawal(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id },
  });

  if (!withdrawal) {
    throw new NotFoundError('Withdrawal');
  }

  // Check permission
  if (req.user?.role !== 'SUPER_ADMIN' && 
      req.user?.organizationId !== withdrawal.organizationId) {
    throw new ForbiddenError('Cannot cancel this withdrawal');
  }

  if (!['PENDING', 'PROCESSING'].includes(withdrawal.status)) {
    throw new ValidationError(`Cannot cancel withdrawal with status: ${withdrawal.status}`);
  }

  const updated = await prisma.withdrawal.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'withdrawal.cancel',
      entityType: 'withdrawal',
      entityId: id,
      adminUserId: req.user?.id,
      oldValue: { status: withdrawal.status } as any,
      newValue: { status: 'CANCELLED' } as any,
    },
  });

  res.json(successResponse({
    id: updated.id,
    status: updated.status,
    message: 'Withdrawal cancelled',
  }));
}

// ==========================================
// GET AUDIT LOGS
// ==========================================
export async function getAuditLogs(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const query = PaginationSchema.parse(req.query);
  const { action, entityType, entityId } = req.query as {
    action?: string;
    entityType?: string;
    entityId?: string;
  };

  const where: any = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  const total = await prisma.auditLog.count({ where });

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      adminUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  res.json(paginatedResponse(logs, query.page, query.limit, total));
}
