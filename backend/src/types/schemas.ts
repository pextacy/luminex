import { z } from 'zod';

// ==========================================
// DONATION EVENT SCHEMAS
// ==========================================

export const DonationEventSchema = z.object({
  version: z.literal('v1'),
  eventId: z.string().uuid(),
  donor: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amount: z.string(), // Wei amount as string for precision
  message: z.string().max(500).optional(),
  category: z.string(),
  campaignId: z.string(),
  campaignOnChainId: z.string(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  timestamp: z.number(),
  blockNumber: z.number().optional(),
});

export type DonationEvent = z.infer<typeof DonationEventSchema>;

// ==========================================
// CAMPAIGN SCHEMAS
// ==========================================

export const CreateCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  categoryId: z.string(),
  organizationId: z.string(),
  targetAmount: z.string(), // Wei as string
  imageUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  isFeatured: z.boolean().optional(),
});

export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;

// ==========================================
// CATEGORY SCHEMAS
// ==========================================

export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// ==========================================
// ORGANIZATION SCHEMAS
// ==========================================

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  country: z.string().max(100).optional(),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

// ==========================================
// WITHDRAWAL SCHEMAS
// ==========================================

export const CreateWithdrawalSchema = z.object({
  campaignId: z.string(),
  amount: z.string(), // Wei as string
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  notes: z.string().max(1000).optional(),
});

export type CreateWithdrawalInput = z.infer<typeof CreateWithdrawalSchema>;

// ==========================================
// ADMIN USER SCHEMAS
// ==========================================

export const CreateAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_MANAGER', 'VIEWER']),
  organizationId: z.string().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export type CreateAdminUserInput = z.infer<typeof CreateAdminUserSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ==========================================
// QUERY SCHEMAS
// ==========================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

export const CampaignQuerySchema = PaginationSchema.extend({
  category: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  organizationId: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'currentAmount', 'donorCount', 'endDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CampaignQueryInput = z.infer<typeof CampaignQuerySchema>;

export const DonationQuerySchema = PaginationSchema.extend({
  campaignId: z.string().optional(),
  donorAddress: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'FAILED', 'ORPHANED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DonationQueryInput = z.infer<typeof DonationQuerySchema>;

export const LeaderboardQuerySchema = z.object({
  campaignId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  period: z.enum(['day', 'week', 'month', 'all']).default('all'),
});

export type LeaderboardQueryInput = z.infer<typeof LeaderboardQuerySchema>;
