import { Request } from 'express';
import type { AdminRole } from '@prisma/client';
import type WebSocket from 'ws';

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

// ==========================================
// AUTHENTICATED REQUEST
// ==========================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AdminRole;
  organizationId?: string | null;
}

// Extend Request with all standard properties
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  // Redeclare these to ensure they're always available
  body: Record<string, unknown>;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
}

// ==========================================
// CAMPAIGN TYPES
// ==========================================

export interface CampaignWithStats {
  id: string;
  onChainId: string;
  title: string;
  description: string;
  category: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    isVerified: boolean;
    logoUrl?: string | null;
  };
  targetAmount: string;
  currentAmount: string;
  donorCount: number;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  sdsStreamId: string;
  status: string;
  isVerified: boolean;
  isFeatured: boolean;
  startDate: Date;
  endDate?: Date | null;
  createdAt: Date;
  progress: number; // Percentage of target reached
}

// ==========================================
// DONATION TYPES
// ==========================================

export interface DonationWithDetails {
  id: string;
  txHash: string;
  campaignId: string;
  campaign?: {
    id: string;
    title: string;
    sdsStreamId: string;
  };
  donorAddress: string;
  donorDisplayName?: string | null;
  amount: string;
  amountUsd?: string | null;
  message?: string | null;
  isAnonymous: boolean;
  status: string;
  blockNumber?: string | null;
  confirmedAt?: Date | null;
  createdAt: Date;
}

// ==========================================
// LEADERBOARD TYPES
// ==========================================

export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName?: string | null;
  totalDonated: string;
  donationCount: number;
  lastDonationAt?: Date | null;
}

export interface CampaignLeaderboard {
  campaignId?: string;
  period: string;
  entries: LeaderboardEntry[];
  updatedAt: Date;
}

// ==========================================
// ANALYTICS TYPES
// ==========================================

export interface GlobalAnalytics {
  totalDonationsWei: string;
  totalDonationsUsd: string;
  totalDonors: number;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  totalDonationsWei: string;
  totalDonors: number;
  averageDonation: string;
  largestDonation: string;
  donationsPerDay: Array<{
    date: string;
    count: number;
    amount: string;
  }>;
}

// ==========================================
// REAL-TIME EVENT TYPES
// ==========================================

export interface RealtimeDonationEvent {
  type: 'donation';
  data: {
    id: string;
    txHash: string;
    campaignId: string;
    campaignTitle: string;
    donorAddress: string;
    donorDisplayName?: string;
    amount: string;
    message?: string;
    isAnonymous: boolean;
    status: string;
    timestamp: number;
  };
}

export interface RealtimeCampaignUpdateEvent {
  type: 'campaign_update';
  data: {
    campaignId: string;
    currentAmount: string;
    donorCount: number;
    progress: number;
  };
}

export type RealtimeEvent = RealtimeDonationEvent | RealtimeCampaignUpdateEvent;

// ==========================================
// SERVICE RESULT TYPES
// ==========================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==========================================
// WEBSOCKET TYPES
// ==========================================

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  subscribedCampaigns: Set<string>;
  subscribedChannels: Set<string>;
  connectedAt: Date;
}

// ==========================================
// SDS TYPES
// ==========================================

export interface SdsConnectionState {
  connected: boolean;
  reconnectAttempts: number;
  lastConnectedAt?: Date;
  lastError?: string;
  subscribedStreams: string[];
}
