'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useWallet } from '@/lib/wallet/provider';
import { api } from '@/lib/api';
import { Campaign, Donation, Organization } from '@/lib/types';
import { formatAmount, formatDate, shortenAddress, getProgressPercentage } from '@/lib/utils';
import {
  Plus,
  Settings,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn,
} from 'lucide-react';

interface DashboardStats {
  totalRaised: string;
  totalDonors: number;
  activeCampaigns: number;
  totalCampaigns: number;
}

export default function DashboardPage() {
  const { isConnected, address, connect } = useWallet();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalRaised: '0',
    totalDonors: 0,
    activeCampaigns: 0,
    totalCampaigns: 0,
  });

  useEffect(() => {
    if (isConnected && address) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real app, these would be filtered by the connected wallet
      const [campaignsRes, donationsRes] = await Promise.all([
        api.getCampaigns({ limit: 10 }),
        api.getDonations({ limit: 10 }),
      ]);

      setCampaigns(campaignsRes.campaigns);
      setRecentDonations(donationsRes.donations);

      // Calculate stats
      const totalRaised = campaignsRes.campaigns.reduce(
        (sum: bigint, c: Campaign) => sum + BigInt(c.currentAmount),
        BigInt(0)
      );
      const activeCampaigns = campaignsRes.campaigns.filter(
        (c: Campaign) => c.status === 'active'
      ).length;

      setStats({
        totalRaised: totalRaised.toString(),
        totalDonors: donationsRes.donations.length,
        activeCampaigns,
        totalCampaigns: campaignsRes.campaigns.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Not connected view
  if (!isConnected) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-16">
          <div className="container-custom">
            <div className="max-w-md mx-auto text-center py-20">
              <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
              <p className="text-gray-400 mb-8">
                Connect your wallet to access your dashboard and manage your campaigns.
              </p>
              <button onClick={connect} className="btn-primary btn-lg">
                Connect Wallet
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Loading view
  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-16">
          <div className="container-custom">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      
      <main className="min-h-screen pt-24 pb-16">
        <div className="container-custom">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">
                Welcome back, {shortenAddress(address || '')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/settings"
                className="btn-outline btn-md"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
              <Link
                href="/dashboard/campaigns/new"
                className="btn-primary btn-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Raised</p>
                  <p className="text-2xl font-bold text-white">
                    {formatAmount(stats.totalRaised)}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Donors</p>
                  <p className="text-2xl font-bold text-white">{stats.totalDonors}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Active Campaigns</p>
                  <p className="text-2xl font-bold text-white">{stats.activeCampaigns}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Campaigns</p>
                  <p className="text-2xl font-bold text-white">{stats.totalCampaigns}</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Campaigns List */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-gray-900/50 border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Your Campaigns</h2>
                  <Link
                    href="/dashboard/campaigns"
                    className="text-primary-500 hover:text-primary-400 flex items-center gap-1 text-sm"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {campaigns.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No campaigns yet</h3>
                    <p className="text-gray-400 mb-4">Create your first campaign to start raising funds.</p>
                    <Link href="/dashboard/campaigns/new" className="btn-primary btn-md">
                      Create Campaign
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <img
                            src={campaign.imageUrl || '/placeholder.jpg'}
                            alt={campaign.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-white truncate">
                                {campaign.title}
                              </h3>
                              <CampaignStatusBadge status={campaign.status} />
                            </div>
                            <div className="mt-2">
                              <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full gradient-bg"
                                  style={{
                                    width: `${Math.min(getProgressPercentage(campaign.currentAmount, campaign.goalAmount), 100)}%`,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1 text-sm">
                                <span className="text-gray-400">
                                  {formatAmount(campaign.currentAmount)} raised
                                </span>
                                <span className="text-gray-500">
                                  {getProgressPercentage(campaign.currentAmount, campaign.goalAmount).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/campaigns/${campaign.id}`}
                              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/dashboard/campaigns/${campaign.id}/edit`}
                              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Donations */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-gray-900/50 border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                  <h2 className="text-xl font-semibold text-white">Recent Donations</h2>
                </div>

                {recentDonations.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No donations yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
                    {recentDonations.map((donation) => (
                      <div key={donation.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white">
                            {formatAmount(donation.amount)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(donation.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          From {shortenAddress(donation.donorAddress)}
                        </p>
                        {donation.message && (
                          <p className="text-sm text-gray-500 mt-1 truncate italic">
                            "{donation.message}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
    active: {
      icon: CheckCircle,
      className: 'bg-success-500/10 text-success-500',
      label: 'Active',
    },
    pending: {
      icon: Clock,
      className: 'bg-yellow-500/10 text-yellow-500',
      label: 'Pending',
    },
    completed: {
      icon: CheckCircle,
      className: 'bg-primary-500/10 text-primary-500',
      label: 'Completed',
    },
    cancelled: {
      icon: XCircle,
      className: 'bg-red-500/10 text-red-500',
      label: 'Cancelled',
    },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
