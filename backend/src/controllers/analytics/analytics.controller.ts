import { Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { redis, CacheKeys, CacheTTL } from '../../db/redis.js';
import { AuthenticatedRequest, GlobalAnalytics, CampaignAnalytics } from '../../types/index.js';
import { successResponse } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

// ==========================================
// GET GLOBAL ANALYTICS
// ==========================================
export async function getGlobalAnalytics(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Try cache first
  const cached = await redis.get<GlobalAnalytics>(CacheKeys.analytics.global());
  if (cached) {
    res.json(successResponse(cached));
    return;
  }

  // Calculate from database
  const [
    donationStats,
    donorCount,
    campaignStats,
  ] = await Promise.all([
    prisma.donation.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { amount: true, amountUsd: true },
      _count: true,
    }),
    prisma.donor.count(),
    prisma.campaign.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  const campaignCounts = campaignStats.reduce((acc, stat) => {
    acc[stat.status] = stat._count;
    return acc;
  }, {} as Record<string, number>);

  const analytics: GlobalAnalytics = {
    totalDonationsWei: donationStats._sum.amount?.toString() ?? '0',
    totalDonationsUsd: donationStats._sum.amountUsd?.toString() ?? '0',
    totalDonors: donorCount,
    totalCampaigns: Object.values(campaignCounts).reduce((a, b) => a + b, 0),
    activeCampaigns: campaignCounts['ACTIVE'] ?? 0,
    completedCampaigns: campaignCounts['COMPLETED'] ?? 0,
  };

  // Cache the result
  await redis.set(CacheKeys.analytics.global(), analytics, CacheTTL.analytics);

  res.json(successResponse(analytics));
}

// ==========================================
// GET CAMPAIGN ANALYTICS
// ==========================================
export async function getCampaignAnalytics(
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

  // Try cache first
  const cached = await redis.get<CampaignAnalytics>(CacheKeys.analytics.campaign(id));
  if (cached) {
    res.json(successResponse(cached));
    return;
  }

  // Get donation stats
  const [
    overallStats,
    donorCount,
    largestDonation,
    dailyDonations,
  ] = await Promise.all([
    prisma.donation.aggregate({
      where: { 
        campaignId: id,
        status: 'CONFIRMED',
      },
      _sum: { amount: true },
      _avg: { amount: true },
      _count: true,
    }),
    prisma.donation.findMany({
      where: {
        campaignId: id,
        status: 'CONFIRMED',
      },
      distinct: ['donorAddress'],
      select: { donorAddress: true },
    }),
    prisma.donation.findFirst({
      where: {
        campaignId: id,
        status: 'CONFIRMED',
      },
      orderBy: { amount: 'desc' },
      select: { amount: true },
    }),
    // Get last 30 days of donations grouped by day
    prisma.$queryRaw<Array<{ date: Date; count: bigint; amount: string }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        CAST(SUM(amount) AS TEXT) as amount
      FROM donations
      WHERE campaign_id = ${id}
        AND status = 'CONFIRMED'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `,
  ]);

  const analytics: CampaignAnalytics = {
    campaignId: id,
    totalDonationsWei: overallStats._sum.amount?.toString() ?? '0',
    totalDonors: donorCount.length,
    averageDonation: overallStats._avg.amount?.toString() ?? '0',
    largestDonation: largestDonation?.amount.toString() ?? '0',
    donationsPerDay: dailyDonations.map(d => ({
      date: d.date.toISOString().split('T')[0],
      count: Number(d.count),
      amount: d.amount,
    })),
  };

  // Cache the result
  await redis.set(CacheKeys.analytics.campaign(id), analytics, CacheTTL.analytics);

  res.json(successResponse(analytics));
}

// ==========================================
// GET REAL-TIME STATS
// ==========================================
export async function getRealtimeStats(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Get stats for the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [recentDonations, pendingCount, confirmedCount] = await Promise.all([
    prisma.donation.aggregate({
      where: {
        createdAt: { gte: oneHourAgo },
        status: 'CONFIRMED',
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.donation.count({
      where: { status: 'PENDING' },
    }),
    prisma.donation.count({
      where: {
        createdAt: { gte: oneHourAgo },
        status: 'CONFIRMED',
      },
    }),
  ]);

  // Get SDS metrics from Redis counters
  const sdsEventsProcessed = await redis.getCounter('metrics:sds:events:hour');

  res.json(successResponse({
    period: 'last_hour',
    donations: {
      count: recentDonations._count,
      totalWei: recentDonations._sum.amount?.toString() ?? '0',
    },
    pending: pendingCount,
    confirmed: confirmedCount,
    sdsEventsProcessed,
    timestamp: new Date(),
  }));
}

// ==========================================
// GET STATS BY DATE RANGE
// ==========================================
export async function getStatsByDateRange(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const stats = await prisma.$queryRaw<Array<{
    date: Date;
    donations: bigint;
    donors: bigint;
    amount: string;
  }>>`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as donations,
      COUNT(DISTINCT donor_address) as donors,
      CAST(SUM(amount) AS TEXT) as amount
    FROM donations
    WHERE status = 'CONFIRMED'
      AND created_at >= ${start}
      AND created_at <= ${end}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  res.json(successResponse({
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    data: stats.map(s => ({
      date: s.date.toISOString().split('T')[0],
      donations: Number(s.donations),
      donors: Number(s.donors),
      amount: s.amount,
    })),
  }));
}

// ==========================================
// GET LIVE ACTIVITY
// ==========================================
export async function getLiveActivity(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [recentDonations, trendingCampaigns, activeUsersCount] = await Promise.all([
    prisma.donation.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
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
      take: 20,
    }),
    prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        donations: {
          some: {
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          },
        },
      },
      include: {
        category: true,
        organization: true,
        _count: {
          select: { donations: true },
        },
      },
      orderBy: {
        donations: {
          _count: 'desc',
        },
      },
      take: 5,
    }),
    prisma.donation.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
      },
      distinct: ['donorAddress'],
    }),
  ]);

  // Calculate donations per minute
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const donationsPerMinute = recentDonations.filter(
    d => new Date(d.createdAt) >= oneMinuteAgo
  ).length;

  res.json(successResponse({
    recentDonations: recentDonations.map(d => ({
      id: d.id,
      txHash: d.txHash,
      campaignId: d.campaignId,
      campaign: d.campaign,
      donorAddress: d.isAnonymous ? '0x...' : d.donorAddress,
      donorDisplayName: d.isAnonymous ? 'Anonymous' : d.donor?.displayName,
      amount: d.amount.toString(),
      message: d.message,
      isAnonymous: d.isAnonymous,
      status: d.status,
      createdAt: d.createdAt,
    })),
    donationsPerMinute,
    activeUsers: activeUsersCount.length,
    trendingCampaigns: trendingCampaigns.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      organization: c.organization,
      targetAmount: c.targetAmount.toString(),
      currentAmount: c.currentAmount.toString(),
      donorCount: c.donorCount,
      recentDonationCount: c._count.donations,
    })),
  }));
}

// ==========================================
// GET DONATION TRENDS
// ==========================================
export async function getDonationTrends(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const period = (req.query.period as string) || 'week';
  
  let days: number;
  switch (period) {
    case 'day':
      days = 1;
      break;
    case 'week':
      days = 7;
      break;
    case 'month':
      days = 30;
      break;
    default:
      days = 7;
  }

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const trends = await prisma.$queryRaw<Array<{
    date: Date;
    count: bigint;
    amount: string;
  }>>`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      CAST(COALESCE(SUM(amount), 0) AS TEXT) as amount
    FROM donations
    WHERE status = 'CONFIRMED'
      AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  const labels = trends.map(t => t.date.toISOString().split('T')[0]);
  const donations = trends.map(t => Number(t.count));
  const amounts = trends.map(t => t.amount);

  res.json(successResponse({
    labels,
    donations,
    amounts,
  }));
}

// ==========================================
// GET CATEGORY BREAKDOWN
// ==========================================
export async function getCategoryBreakdown(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const categoryStats = await prisma.$queryRaw<Array<{
    category_id: string;
    category_name: string;
    total_amount: string;
  }>>`
    SELECT 
      c.id as category_id,
      c.name as category_name,
      CAST(COALESCE(SUM(d.amount), 0) AS TEXT) as total_amount
    FROM categories c
    LEFT JOIN campaigns camp ON camp.category_id = c.id
    LEFT JOIN donations d ON d.campaign_id = camp.id AND d.status = 'CONFIRMED'
    GROUP BY c.id, c.name
    ORDER BY total_amount DESC
  `;

  // Calculate total for percentages
  const total = categoryStats.reduce(
    (sum, stat) => sum + BigInt(stat.total_amount || '0'),
    BigInt(0)
  );

  const result = categoryStats.map(stat => ({
    categoryId: stat.category_id,
    categoryName: stat.category_name,
    totalAmount: stat.total_amount,
    percentage: total > 0 
      ? Number((BigInt(stat.total_amount || '0') * BigInt(10000) / total)) / 100
      : 0,
  }));

  res.json(successResponse(result));
}
