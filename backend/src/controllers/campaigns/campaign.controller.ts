import { Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { redis, CacheKeys, CacheTTL } from '../../db/redis.js';
import { AuthenticatedRequest, CampaignWithStats } from '../../types/index.js';
import { 
  CampaignQuerySchema, 
  CreateCampaignSchema, 
  UpdateCampaignSchema 
} from '../../types/schemas.js';
import { successResponse, paginatedResponse, ErrorCodes } from '../../utils/response.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';
import { apiLogger } from '../../utils/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

// ==========================================
// GET ALL CAMPAIGNS
// ==========================================
export async function getCampaigns(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const query = CampaignQuerySchema.parse(req.query);
  
  const where: any = {};
  
  // Apply filters
  if (query.category) {
    const category = await prisma.category.findUnique({
      where: { slug: query.category },
    });
    if (category) {
      where.categoryId = category.id;
    }
  }
  
  if (query.status) {
    where.status = query.status;
  } else {
    // Default to showing active campaigns
    where.status = 'ACTIVE';
  }
  
  if (query.organizationId) {
    where.organizationId = query.organizationId;
  }
  
  if (query.featured !== undefined) {
    where.isFeatured = query.featured;
  }
  
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // Get total count
  const total = await prisma.campaign.count({ where });

  // Get campaigns with relations
  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
          logoUrl: true,
        },
      },
    },
    orderBy: {
      [query.sortBy]: query.sortOrder,
    },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  // Transform to include progress
  const campaignsWithStats: CampaignWithStats[] = campaigns.map(campaign => ({
    id: campaign.id,
    onChainId: campaign.onChainId,
    title: campaign.title,
    description: campaign.description,
    category: campaign.category,
    organization: campaign.organization,
    targetAmount: campaign.targetAmount.toString(),
    currentAmount: campaign.currentAmount.toString(),
    donorCount: campaign.donorCount,
    imageUrl: campaign.imageUrl,
    bannerUrl: campaign.bannerUrl,
    sdsStreamId: campaign.sdsStreamId,
    status: campaign.status,
    isVerified: campaign.isVerified,
    isFeatured: campaign.isFeatured,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    createdAt: campaign.createdAt,
    progress: calculateProgress(campaign.currentAmount, campaign.targetAmount),
  }));

  res.json(paginatedResponse(campaignsWithStats, query.page, query.limit, total));
}

// ==========================================
// GET SINGLE CAMPAIGN
// ==========================================
export async function getCampaign(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;

  // Try cache first
  const cached = await redis.get<CampaignWithStats>(CacheKeys.campaign(id));
  if (cached) {
    res.json(successResponse(cached));
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  const result: CampaignWithStats = {
    id: campaign.id,
    onChainId: campaign.onChainId,
    title: campaign.title,
    description: campaign.description,
    category: campaign.category,
    organization: campaign.organization,
    targetAmount: campaign.targetAmount.toString(),
    currentAmount: campaign.currentAmount.toString(),
    donorCount: campaign.donorCount,
    imageUrl: campaign.imageUrl,
    bannerUrl: campaign.bannerUrl,
    sdsStreamId: campaign.sdsStreamId,
    status: campaign.status,
    isVerified: campaign.isVerified,
    isFeatured: campaign.isFeatured,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    createdAt: campaign.createdAt,
    progress: calculateProgress(campaign.currentAmount, campaign.targetAmount),
  };

  // Cache the result
  await redis.set(CacheKeys.campaign(id), result, CacheTTL.campaign);

  res.json(successResponse(result));
}

// ==========================================
// CREATE CAMPAIGN (Admin only)
// ==========================================
export async function createCampaign(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const input = CreateCampaignSchema.parse(req.body);

  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) {
    throw new ValidationError('Invalid category ID');
  }

  // Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });
  if (!organization) {
    throw new ValidationError('Invalid organization ID');
  }

  // Check user has permission for this organization
  if (req.user?.role !== 'SUPER_ADMIN' && 
      req.user?.organizationId !== input.organizationId) {
    throw new ForbiddenError('You can only create campaigns for your organization');
  }

  // Generate unique on-chain ID and SDS stream ID
  const onChainId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const sdsStreamId = `luminex.${category.slug}-${onChainId}`;

  const campaign = await prisma.campaign.create({
    data: {
      onChainId,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      organizationId: input.organizationId,
      targetAmount: input.targetAmount,
      imageUrl: input.imageUrl,
      bannerUrl: input.bannerUrl,
      sdsStreamId,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      status: 'DRAFT',
    },
    include: {
      category: true,
      organization: true,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'campaign.create',
      entityType: 'campaign',
      entityId: campaign.id,
      adminUserId: req.user?.id,
      newValue: campaign as any,
    },
  });

  apiLogger.info({ campaignId: campaign.id }, 'Campaign created');

  res.status(201).json(successResponse(campaign));
}

// ==========================================
// UPDATE CAMPAIGN (Admin only)
// ==========================================
export async function updateCampaign(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const input = UpdateCampaignSchema.parse(req.body);

  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  // Check permission
  if (req.user?.role !== 'SUPER_ADMIN' && 
      req.user?.organizationId !== campaign.organizationId) {
    throw new ForbiddenError('You can only update your organization campaigns');
  }

  const oldValue = { ...campaign };

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.description && { description: input.description }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
      ...(input.endDate !== undefined && { 
        endDate: input.endDate ? new Date(input.endDate) : null 
      }),
      ...(input.status && { status: input.status }),
      ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
    },
    include: {
      category: true,
      organization: true,
    },
  });

  // Invalidate cache
  await redis.del(CacheKeys.campaign(id));
  await redis.delPattern(CacheKeys.campaignList('*'));

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'campaign.update',
      entityType: 'campaign',
      entityId: campaign.id,
      adminUserId: req.user?.id,
      oldValue: oldValue as any,
      newValue: updated as any,
    },
  });

  res.json(successResponse(updated));
}

// ==========================================
// GET FEATURED CAMPAIGNS
// ==========================================
export async function getFeaturedCampaigns(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'ACTIVE',
      isFeatured: true,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  const result = campaigns.map(campaign => ({
    ...campaign,
    targetAmount: campaign.targetAmount.toString(),
    currentAmount: campaign.currentAmount.toString(),
    progress: calculateProgress(campaign.currentAmount, campaign.targetAmount),
  }));

  res.json(successResponse(result));
}

// ==========================================
// GET RECENT CAMPAIGNS
// ==========================================
export async function getRecentCampaigns(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const result = campaigns.map(campaign => ({
    ...campaign,
    targetAmount: campaign.targetAmount.toString(),
    currentAmount: campaign.currentAmount.toString(),
    progress: calculateProgress(campaign.currentAmount, campaign.targetAmount),
  }));

  res.json(successResponse(result));
}

// ==========================================
// GET CAMPAIGN DONATIONS
// ==========================================
export async function getCampaignDonations(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  // Verify campaign exists
  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where: {
        campaignId: id,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      include: {
        donor: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.donation.count({
      where: {
        campaignId: id,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    }),
  ]);

  const result = donations.map(d => ({
    id: d.id,
    txHash: d.txHash,
    donorAddress: d.isAnonymous ? '0x...' : d.donorAddress,
    donorDisplayName: d.isAnonymous ? 'Anonymous' : d.donor?.displayName,
    amount: d.amount.toString(),
    message: d.message,
    isAnonymous: d.isAnonymous,
    status: d.status,
    createdAt: d.createdAt,
  }));

  res.json(paginatedResponse(result, page, limit, total));
}

// ==========================================
// GET CAMPAIGN STATS
// ==========================================
export async function getCampaignStats(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;

  // Verify campaign exists
  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  const stats = await prisma.donation.aggregate({
    where: {
      campaignId: id,
      status: 'CONFIRMED',
    },
    _sum: { amount: true },
    _avg: { amount: true },
    _max: { amount: true },
    _count: true,
  });

  const donorCount = await prisma.donation.findMany({
    where: {
      campaignId: id,
      status: 'CONFIRMED',
    },
    distinct: ['donorAddress'],
    select: { donorAddress: true },
  });

  res.json(successResponse({
    totalDonations: stats._sum.amount?.toString() ?? '0',
    donorCount: donorCount.length,
    averageDonation: stats._avg.amount?.toString() ?? '0',
    largestDonation: stats._max.amount?.toString() ?? '0',
  }));
}

// Helper function
function calculateProgress(current: Decimal, target: Decimal): number {
  const currentNum = Number(current);
  const targetNum = Number(target);
  if (targetNum === 0) return 0;
  return Math.min((currentNum / targetNum) * 100, 100);
}
