'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Heart,
  Share2,
  ExternalLink,
  CheckCircle,
  Users,
  Calendar,
  Target,
  ArrowLeft,
  Copy,
  Twitter,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { DonationModal } from '@/components/donations/donation-modal';
import { DonationFeed } from '@/components/donations/donation-feed';
import { Leaderboard } from '@/components/leaderboard/leaderboard';
import { getCampaign, getCampaignStats } from '@/lib/api';
import { useWebSocket } from '@/lib/websocket/provider';
import {
  formatAmount,
  formatDate,
  calculateProgress,
  getCategoryIcon,
  shortenAddress,
  copyToClipboard,
  cn,
} from '@/lib/utils';
import type { Campaign } from '@/lib/types';
import toast from 'react-hot-toast';

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params.id as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<{
    totalDonations: string;
    donorCount: number;
    averageDonation: string;
    largestDonation: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'donations' | 'leaderboard'>('about');

  const { subscribeToCampaign, onCampaignUpdate } = useWebSocket();

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const [campaignData, statsData] = await Promise.all([
          getCampaign(campaignId),
          getCampaignStats(campaignId),
        ]);
        setCampaign(campaignData);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch campaign:', error);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchCampaign();
      subscribeToCampaign(campaignId);
    }
  }, [campaignId, subscribeToCampaign]);

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribe = onCampaignUpdate((event) => {
      if (event.data.campaignId === campaignId) {
        setCampaign(prev => prev ? {
          ...prev,
          currentAmount: event.data.currentAmount,
          donorCount: event.data.donorCount,
          progress: event.data.progress,
        } : null);
      }
    });

    return unsubscribe;
  }, [campaignId, onCampaignUpdate]);

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign?.title,
          text: `Support this campaign on Luminex: ${campaign?.title}`,
          url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await copyToClipboard(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleDonationSuccess = (txHash: string) => {
    // Refresh campaign data after successful donation
    getCampaign(campaignId).then(setCampaign).catch(console.error);
    getCampaignStats(campaignId).then(setStats).catch(console.error);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-16">
          <div className="container-custom">
            <div className="animate-pulse">
              <div className="h-8 w-32 bg-gray-800 rounded mb-8" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="h-64 sm:h-96 bg-gray-800 rounded-2xl mb-6" />
                  <div className="h-8 w-3/4 bg-gray-800 rounded mb-4" />
                  <div className="h-4 w-full bg-gray-800 rounded mb-2" />
                  <div className="h-4 w-2/3 bg-gray-800 rounded" />
                </div>
                <div className="space-y-6">
                  <div className="h-64 bg-gray-800 rounded-2xl" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Campaign Not Found</h1>
            <p className="text-gray-400 mb-8">The campaign you're looking for doesn't exist or has been removed.</p>
            <Link href="/campaigns" className="btn-primary btn-lg">
              Browse Campaigns
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const progress = calculateProgress(campaign.currentAmount, campaign.targetAmount);

  return (
    <>
      <Header />
      
      <main className="min-h-screen pt-24 pb-16">
        <div className="container-custom">
          {/* Back Link */}
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Hero Image */}
              <div className="relative h-64 sm:h-96 rounded-2xl overflow-hidden mb-6">
                {campaign.bannerUrl || campaign.imageUrl ? (
                  <Image
                    src={campaign.bannerUrl || campaign.imageUrl || ''}
                    alt={campaign.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-bg flex items-center justify-center">
                    <span className="text-8xl">{getCategoryIcon(campaign.category.id)}</span>
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span
                    className="badge text-white"
                    style={{ backgroundColor: campaign.category.color || '#6b7280' }}
                  >
                    {getCategoryIcon(campaign.category.id)} {campaign.category.name}
                  </span>
                  {campaign.isFeatured && (
                    <span className="badge bg-accent-500 text-white">⭐ Featured</span>
                  )}
                </div>

                {campaign.isVerified && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-success-500/90 text-white text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </div>
                )}
              </div>

              {/* Organization */}
              <div className="flex items-center gap-3 mb-4">
                {campaign.organization.logoUrl ? (
                  <Image
                    src={campaign.organization.logoUrl}
                    alt={campaign.organization.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <span>{campaign.organization.name[0]}</span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-white flex items-center gap-1">
                    {campaign.organization.name}
                    {campaign.organization.isVerified && (
                      <CheckCircle className="w-4 h-4 text-primary-500" />
                    )}
                  </p>
                  <p className="text-sm text-gray-400">Campaign Organizer</p>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {campaign.title}
              </h1>

              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-gray-800 mb-6">
                {(['about', 'donations', 'leaderboard'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'pb-4 px-2 font-medium transition-colors capitalize',
                      activeTab === tab
                        ? 'text-primary-500 border-b-2 border-primary-500'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'about' && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {campaign.description}
                  </p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 not-prose">
                    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                      <Users className="w-5 h-5 text-primary-500 mb-2" />
                      <p className="text-2xl font-bold text-white">{campaign.donorCount}</p>
                      <p className="text-sm text-gray-400">Donors</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                      <Target className="w-5 h-5 text-accent-500 mb-2" />
                      <p className="text-2xl font-bold text-white">{formatAmount(campaign.targetAmount)}</p>
                      <p className="text-sm text-gray-400">Goal (STT)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                      <Heart className="w-5 h-5 text-success-500 mb-2" />
                      <p className="text-2xl font-bold text-white">{stats?.averageDonation ? formatAmount(stats.averageDonation) : '0'}</p>
                      <p className="text-sm text-gray-400">Avg Donation</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                      <Calendar className="w-5 h-5 text-warning-500 mb-2" />
                      <p className="text-2xl font-bold text-white">{formatDate(campaign.startDate)}</p>
                      <p className="text-sm text-gray-400">Started</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'donations' && (
                <DonationFeed campaignId={campaignId} maxItems={20} />
              )}

              {activeTab === 'leaderboard' && (
                <Leaderboard campaignId={campaignId} limit={20} showTitle={false} />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Donation Card */}
              <div className="card p-6 sticky top-24">
                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-3xl font-bold text-white">
                      {formatAmount(campaign.currentAmount)}
                    </span>
                    <span className="text-gray-400">
                      of {formatAmount(campaign.targetAmount)} STT
                    </span>
                  </div>
                  
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="progress-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{campaign.donorCount} donors</span>
                    <span className="text-primary-400 font-medium">{progress.toFixed(1)}%</span>
                  </div>
                </div>

                <button
                  onClick={() => setDonationModalOpen(true)}
                  className="btn-primary btn-lg w-full flex items-center justify-center gap-2 mb-4"
                >
                  <Heart className="w-5 h-5" />
                  Donate Now
                </button>

                <button
                  onClick={handleShare}
                  className="btn-secondary btn-lg w-full flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share Campaign
                </button>

                {/* Quick Share */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-sm text-gray-400 mb-3">Quick share</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await copyToClipboard(window.location.href);
                        toast.success('Link copied!');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Support ${campaign.title} on @Luminex`)}&url=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                      Tweet
                    </a>
                  </div>
                </div>

                {/* Contract Info */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">On-Chain Campaign ID</p>
                  <a
                    href={`https://somnia-devnet.socialscan.io/address/${campaign.onChainId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-400 font-mono transition-colors"
                  >
                    {shortenAddress(campaign.onChainId, 8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Donation Modal */}
      <DonationModal
        campaign={campaign}
        isOpen={donationModalOpen}
        onClose={() => setDonationModalOpen(false)}
        onSuccess={handleDonationSuccess}
      />
    </>
  );
}
