'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  Globe, 
  Heart, 
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CampaignCard, CampaignCardSkeleton } from '@/components/campaigns/campaign-card';
import { DonationFeed } from '@/components/donations/donation-feed';
import { Leaderboard } from '@/components/leaderboard/leaderboard';
import { getFeaturedCampaigns, getGlobalAnalytics } from '@/lib/api';
import { formatAmount, formatCompactNumber } from '@/lib/utils';
import { CATEGORIES } from '@/lib/config';
import type { Campaign, GlobalAnalytics } from '@/lib/types';

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaignsData, analyticsData] = await Promise.all([
          getFeaturedCampaigns(),
          getGlobalAnalytics(),
        ]);
        setCampaigns(campaignsData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to fetch homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      label: 'Total Raised',
      value: analytics ? formatAmount(analytics.totalDonationsWei) : '0',
      suffix: 'STT',
      icon: TrendingUp,
      color: 'text-primary-500',
    },
    {
      label: 'Total Donors',
      value: analytics ? formatCompactNumber(analytics.totalDonors) : '0',
      icon: Users,
      color: 'text-accent-500',
    },
    {
      label: 'Active Campaigns',
      value: analytics ? analytics.activeCampaigns.toString() : '0',
      icon: Heart,
      color: 'text-success-500',
    },
    {
      label: 'Avg. Confirmation',
      value: '<1',
      suffix: 'sec',
      icon: Clock,
      color: 'text-warning-500',
    },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Instant Updates',
      description: 'See donations appear in real-time with sub-second finality powered by Somnia blockchain.',
    },
    {
      icon: Shield,
      title: 'Fully Transparent',
      description: 'All funds are secured on-chain. Track every donation with verifiable proof.',
    },
    {
      icon: Globe,
      title: 'Global Scale',
      description: 'Support campaigns worldwide with high throughput and minimal fees.',
    },
  ];

  return (
    <>
      <Header />
      
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary-950/50 via-gray-950 to-gray-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-500/20 rounded-full blur-[128px]" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-[96px]" />
          
          <div className="container-custom relative">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                  </span>
                  Powered by Somnia Blockchain
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6"
              >
                <span className="text-white">Real-Time</span>{' '}
                <span className="gradient-text">Decentralized</span>{' '}
                <span className="text-white">Crowdfunding</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto"
              >
                Donate to global causes with instant feedback, full transparency, 
                and sub-second finality. Experience Web3 crowdfunding the way it should be.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/campaigns" className="btn-primary btn-xl flex items-center gap-2 w-full sm:w-auto">
                  Explore Campaigns
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/about" className="btn-outline btn-xl w-full sm:w-auto">
                  Learn More
                </Link>
              </motion.div>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 text-center"
                >
                  <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                  <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {stat.value}
                    {stat.suffix && <span className="text-lg text-gray-400 ml-1">{stat.suffix}</span>}
                  </p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-gray-900/50">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Browse by Category</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Find campaigns that match your passion and make a difference in the world.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  href={`/campaigns?category=${category.slug}`}
                  className="group p-6 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-primary-500/50 hover:bg-gray-800 transition-all duration-300 text-center"
                >
                  <span className="text-4xl mb-3 block">{category.icon}</span>
                  <p className="font-medium text-white group-hover:text-primary-400 transition-colors">
                    {category.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Campaigns */}
        <section className="py-16">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Featured Campaigns</h2>
                <p className="text-gray-400">Support verified campaigns making real impact</p>
              </div>
              <Link
                href="/campaigns"
                className="hidden sm:flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <CampaignCardSkeleton key={i} />
                ))
              ) : (
                campaigns.slice(0, 6).map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} featured />
                ))
              )}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link href="/campaigns" className="btn-outline btn-md">
                View All Campaigns
              </Link>
            </div>
          </div>
        </section>

        {/* Real-time Section */}
        <section className="py-16 bg-gray-900/50">
          <div className="container-custom">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Live Donations */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
                  </span>
                  <h3 className="text-2xl font-bold text-white">Live Donations</h3>
                </div>
                <div className="card p-6 max-h-[500px] overflow-y-auto scrollbar-hide">
                  <DonationFeed maxItems={8} />
                </div>
              </div>

              {/* Leaderboard */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Top Donors</h3>
                <div className="card p-6">
                  <Leaderboard limit={8} showTitle={false} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Why Luminex?</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Experience the future of crowdfunding with blockchain-powered transparency and speed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-primary-500/50 transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container-custom">
            <div className="relative overflow-hidden rounded-3xl gradient-bg p-12 text-center">
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to Make a Difference?
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                  Join thousands of donors supporting causes worldwide with instant, transparent donations.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/campaigns" className="btn bg-white text-gray-900 hover:bg-gray-100 btn-xl flex items-center gap-2">
                    Start Donating
                    <Heart className="w-5 h-5" />
                  </Link>
                  <Link href="/about" className="btn border-2 border-white text-white hover:bg-white/10 btn-xl">
                    Learn How It Works
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
