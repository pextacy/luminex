import { API_URL } from '@/lib/config';
import type { ApiResponse, Campaign, Donation, Category, LeaderboardEntry, GlobalAnalytics, LiveActivity } from '@/lib/types';

// Generic fetch wrapper
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json() as ApiResponse<T>;
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Request failed');
  }

  return data.data as T;
}

// ==========================================
// CAMPAIGNS
// ==========================================

export async function getCampaigns(params?: {
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ campaigns: Campaign[]; meta: { total: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  
  return fetchApi(`/campaigns?${searchParams.toString()}`);
}

export async function getCampaign(id: string): Promise<Campaign> {
  return fetchApi(`/campaigns/${id}`);
}

export async function getFeaturedCampaigns(): Promise<Campaign[]> {
  return fetchApi('/campaigns/featured');
}

export async function getRecentCampaigns(limit: number = 6): Promise<Campaign[]> {
  return fetchApi(`/campaigns/recent?limit=${limit}`);
}

export async function getCampaignDonations(campaignId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<{ donations: Donation[]; meta: { total: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  
  return fetchApi(`/campaigns/${campaignId}/donations?${searchParams.toString()}`);
}

export async function getCampaignStats(campaignId: string): Promise<{
  totalDonations: string;
  donorCount: number;
  averageDonation: string;
  largestDonation: string;
}> {
  return fetchApi(`/campaigns/${campaignId}/stats`);
}

// ==========================================
// DONATIONS
// ==========================================

export async function getDonations(params?: {
  campaignId?: string;
  page?: number;
  limit?: number;
}): Promise<{ donations: Donation[]; meta: { total: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.campaignId) searchParams.set('campaignId', params.campaignId);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  
  return fetchApi(`/donations?${searchParams.toString()}`);
}

export async function getRecentDonations(limit: number = 10): Promise<Donation[]> {
  return fetchApi(`/donations/recent?limit=${limit}`);
}

export async function getLeaderboard(params?: {
  campaignId?: string;
  limit?: number;
}): Promise<LeaderboardEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.campaignId) searchParams.set('campaignId', params.campaignId);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  
  return fetchApi(`/donations/leaderboard?${searchParams.toString()}`);
}

export async function getDonorHistory(address: string): Promise<Donation[]> {
  return fetchApi(`/donations/donor/${address}`);
}

// ==========================================
// CATEGORIES
// ==========================================

export async function getCategories(): Promise<Category[]> {
  return fetchApi('/categories');
}

export async function getCategory(id: string): Promise<Category> {
  return fetchApi(`/categories/${id}`);
}

// ==========================================
// ANALYTICS
// ==========================================

export async function getGlobalAnalytics(): Promise<GlobalAnalytics> {
  return fetchApi('/analytics/overview');
}

export async function getLiveActivity(): Promise<LiveActivity> {
  return fetchApi('/analytics/live');
}

export async function getDonationTrends(period: 'day' | 'week' | 'month' = 'week'): Promise<{
  labels: string[];
  donations: number[];
  amounts: string[];
}> {
  return fetchApi(`/analytics/trends?period=${period}`);
}

export async function getCategoryBreakdown(): Promise<{
  categoryId: string;
  categoryName: string;
  totalAmount: string;
  percentage: number;
}[]> {
  return fetchApi('/analytics/categories');
}

// ==========================================
// HEALTH
// ==========================================

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_URL.replace('/api', '')}/health`);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}

// ==========================================
// API OBJECT (alternative interface)
// ==========================================

export const api = {
  getCampaigns,
  getCampaign,
  getFeaturedCampaigns,
  getRecentCampaigns,
  getCampaignDonations,
  getCampaignStats,
  getDonations,
  getRecentDonations,
  getLeaderboard,
  getDonorHistory,
  getCategories,
  getCategory,
  getGlobalAnalytics,
  getLiveActivity,
  getDonationTrends,
  getCategoryBreakdown,
  checkHealth,
};
