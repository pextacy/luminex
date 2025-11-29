// Campaign types
export interface Campaign {
  id: string;
  onChainId: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: Category;
  organization: Organization;
  targetAmount: string;
  goalAmount: string; // Alias for targetAmount
  currentAmount: string;
  donorCount: number;
  imageUrl?: string;
  bannerUrl?: string;
  sdsStreamId: string;
  status: CampaignStatus;
  isVerified: boolean;
  isFeatured: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  progress: number;
}

// Status can be lowercase from API or uppercase from database
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 
                              'draft' | 'active' | 'paused' | 'completed' | 'cancelled' |
                              'pending';

// Category types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  campaignCount?: number;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  isVerified: boolean;
  verifiedAt?: string;
}

// Donation types
export interface Donation {
  id: string;
  txHash: string;
  campaignId: string;
  campaign?: {
    id: string;
    title: string;
    sdsStreamId: string;
  };
  donorAddress: string;
  donorDisplayName?: string;
  amount: string;
  amountUsd?: string;
  message?: string;
  isAnonymous: boolean;
  status: DonationStatus;
  blockNumber?: string;
  confirmedAt?: string;
  createdAt: string;
}

export type DonationStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName?: string;
  totalDonated: string;
  donationCount: number;
  lastDonationAt?: string;
}

// Analytics types
export interface GlobalAnalytics {
  totalDonationsWei: string;
  totalDonationsUsd: string;
  totalDonors: number;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
}

export interface LiveActivity {
  recentDonations: Donation[];
  donationsPerMinute: number;
  activeUsers: number;
  trendingCampaigns: Campaign[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// WebSocket event types
export interface WsDonationEvent {
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

export interface WsCampaignUpdateEvent {
  type: 'campaign_update';
  data: {
    campaignId: string;
    currentAmount: string;
    donorCount: number;
    progress: number;
  };
}

export interface WsStatsEvent {
  type: 'stats';
  data: {
    totalDonations: string;
    totalDonors: number;
    donationsPerMinute: number;
  };
}

export type WsEvent = WsDonationEvent | WsCampaignUpdateEvent | WsStatsEvent;

// Wallet types
export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  error: string | null;
}
