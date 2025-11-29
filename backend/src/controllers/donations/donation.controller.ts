import { Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { redis, CacheKeys, CacheTTL } from '../../db/redis.js';
import { AuthenticatedRequest, DonationWithDetails, LeaderboardEntry } from '../../types/index.js';
import { DonationQuerySchema, LeaderboardQuerySchema } from '../../types/schemas.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

// ==========================================
// GET DONATIONS
// ==========================================
export async function getDonations(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const query = DonationQuerySchema.parse(req.query);

  const where: any = {};

  if (query.campaignId) {
    where.campaignId = query.campaignId;
  }

  if (query.donorAddress) {
    where.donorAddress = query.donorAddress.toLowerCase();
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      where.createdAt.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      where.createdAt.lte = new Date(query.endDate);
    }
  }

  const total = await prisma.donation.count({ where });

  const donations = await prisma.donation.findMany({
    where,
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          sdsStreamId: true,
        },
      },
      donor: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  const result: DonationWithDetails[] = donations.map(d => ({
    id: d.id,
    txHash: d.txHash,
    campaignId: d.campaignId,
    campaign: d.campaign,
    donorAddress: d.donorAddress,
    donorDisplayName: d.donor?.displayName,
    amount: d.amount.toString(),
    amountUsd: d.amountUsd?.toString(),
    message: d.message,
    isAnonymous: d.isAnonymous,
    status: d.status,
    blockNumber: d.blockNumber?.toString(),
    confirmedAt: d.confirmedAt,
    createdAt: d.createdAt,
  }));

  res.json(paginatedResponse(result, query.page, query.limit, total));
}

// ==========================================
// GET RECENT DONATIONS (Real-time feed)
// ==========================================
export async function getRecentDonations(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { campaignId } = req.query;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  const cacheKey = campaignId 
    ? CacheKeys.recentDonations.campaign(campaignId as string)
    : CacheKeys.recentDonations.global();

  // Try to get from cache first
  const cached = await redis.getRecentFeed<DonationWithDetails>(cacheKey, limit);
  
  if (cached && cached.length > 0) {
    res.json(successResponse(cached));
    return;
  }

  // Fallback to database
  const where: any = {
    status: { in: ['CONFIRMED', 'PENDING'] },
  };

  if (campaignId) {
    where.campaignId = campaignId as string;
  }

  const donations = await prisma.donation.findMany({
    where,
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          sdsStreamId: true,
        },
      },
      donor: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const result: DonationWithDetails[] = donations.map(d => ({
    id: d.id,
    txHash: d.txHash,
    campaignId: d.campaignId,
    campaign: d.campaign,
    donorAddress: d.isAnonymous ? '0x...' : d.donorAddress,
    donorDisplayName: d.isAnonymous ? 'Anonymous' : d.donor?.displayName,
    amount: d.amount.toString(),
    amountUsd: d.amountUsd?.toString(),
    message: d.message,
    isAnonymous: d.isAnonymous,
    status: d.status,
    blockNumber: d.blockNumber?.toString(),
    confirmedAt: d.confirmedAt,
    createdAt: d.createdAt,
  }));

  res.json(successResponse(result));
}

// ==========================================
// GET DONATION BY TX HASH
// ==========================================
export async function getDonationByTxHash(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { txHash } = req.params;

  const donation = await prisma.donation.findUnique({
    where: { txHash },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          sdsStreamId: true,
        },
      },
      donor: {
        select: {
          displayName: true,
        },
      },
    },
  });

  if (!donation) {
    throw new NotFoundError('Donation');
  }

  const result: DonationWithDetails = {
    id: donation.id,
    txHash: donation.txHash,
    campaignId: donation.campaignId,
    campaign: donation.campaign,
    donorAddress: donation.isAnonymous ? '0x...' : donation.donorAddress,
    donorDisplayName: donation.isAnonymous ? 'Anonymous' : donation.donor?.displayName,
    amount: donation.amount.toString(),
    amountUsd: donation.amountUsd?.toString(),
    message: donation.message,
    isAnonymous: donation.isAnonymous,
    status: donation.status,
    blockNumber: donation.blockNumber?.toString(),
    confirmedAt: donation.confirmedAt,
    createdAt: donation.createdAt,
  };

  res.json(successResponse(result));
}

// ==========================================
// GET LEADERBOARD
// ==========================================
export async function getLeaderboard(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const query = LeaderboardQuerySchema.parse(req.query);

  const cacheKey = query.campaignId 
    ? CacheKeys.leaderboard.campaign(query.campaignId)
    : CacheKeys.leaderboard.global();

  // Try Redis leaderboard first
  const cachedLeaderboard = await redis.getLeaderboard(cacheKey, 0, query.limit - 1);
  
  if (cachedLeaderboard.length > 0) {
    // Enrich with donor info
    const addresses = cachedLeaderboard.map(e => e.member);
    const donors = await prisma.donor.findMany({
      where: { address: { in: addresses } },
      select: {
        address: true,
        displayName: true,
        donationCount: true,
        lastDonationAt: true,
      },
    });

    const donorMap = new Map(donors.map(d => [d.address, d]));

    const entries: LeaderboardEntry[] = cachedLeaderboard.map((entry, index) => {
      const donor = donorMap.get(entry.member);
      return {
        rank: index + 1,
        address: entry.member,
        displayName: donor?.displayName,
        totalDonated: entry.score.toString(),
        donationCount: donor?.donationCount ?? 0,
        lastDonationAt: donor?.lastDonationAt,
      };
    });

    res.json(successResponse({
      campaignId: query.campaignId,
      period: query.period,
      entries,
      updatedAt: new Date(),
    }));
    return;
  }

  // Fallback to database aggregation
  const where: any = {
    status: 'CONFIRMED',
  };

  if (query.campaignId) {
    where.campaignId = query.campaignId;
  }

  // Calculate period filter
  if (query.period !== 'all') {
    const now = new Date();
    let startDate: Date;
    
    switch (query.period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    where.confirmedAt = { gte: startDate };
  }

  // Aggregate donations by donor
  const aggregated = await prisma.donation.groupBy({
    by: ['donorAddress'],
    where,
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
    take: query.limit,
  });

  // Get donor details
  const addresses = aggregated.map(a => a.donorAddress);
  const donors = await prisma.donor.findMany({
    where: { address: { in: addresses } },
    select: {
      address: true,
      displayName: true,
      lastDonationAt: true,
    },
  });

  const donorMap = new Map(donors.map(d => [d.address, d]));

  const entries: LeaderboardEntry[] = aggregated.map((agg, index) => {
    const donor = donorMap.get(agg.donorAddress);
    return {
      rank: index + 1,
      address: agg.donorAddress,
      displayName: donor?.displayName,
      totalDonated: agg._sum.amount?.toString() ?? '0',
      donationCount: agg._count,
      lastDonationAt: donor?.lastDonationAt,
    };
  });

  res.json(successResponse({
    campaignId: query.campaignId,
    period: query.period,
    entries,
    updatedAt: new Date(),
  }));
}

// ==========================================
// GET DONOR STATS
// ==========================================
export async function getDonorStats(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { address } = req.params;

  const donor = await prisma.donor.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (!donor) {
    throw new NotFoundError('Donor');
  }

  // Get recent donations
  const recentDonations = await prisma.donation.findMany({
    where: { 
      donorAddress: address.toLowerCase(),
      status: 'CONFIRMED',
    },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Get campaigns contributed to
  const campaignContributions = await prisma.donation.groupBy({
    by: ['campaignId'],
    where: { 
      donorAddress: address.toLowerCase(),
      status: 'CONFIRMED',
    },
    _sum: { amount: true },
    _count: true,
  });

  res.json(successResponse({
    address: donor.address,
    displayName: donor.displayName,
    totalDonated: donor.totalDonated.toString(),
    donationCount: donor.donationCount,
    campaignCount: campaignContributions.length,
    firstDonationAt: donor.firstDonationAt,
    lastDonationAt: donor.lastDonationAt,
    recentDonations: recentDonations.map(d => ({
      id: d.id,
      txHash: d.txHash,
      campaignId: d.campaignId,
      campaignTitle: d.campaign.title,
      amount: d.amount.toString(),
      createdAt: d.createdAt,
    })),
  }));
}
