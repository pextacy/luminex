'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Users, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getLeaderboard, getGlobalAnalytics } from '@/lib/api';
import { shortenAddress, formatAmount, formatCompactNumber, cn } from '@/lib/utils';
import type { LeaderboardEntry, GlobalAnalytics } from '@/lib/types';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leaderboardData, analyticsData] = await Promise.all([
          getLeaderboard({ limit: 50 }),
          getGlobalAnalytics(),
        ]);
        setEntries(leaderboardData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 text-center text-gray-500 font-bold">{rank}</span>;
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/30';
      default:
        return 'bg-gray-800/30 border-gray-700/30';
    }
  };

  return (
    <>
      <Header />
      
      <main className="min-h-screen pt-24 pb-16">
        <div className="container-custom">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-bg mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Leaderboard
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Celebrating our most generous donors making a difference in the world.
            </p>
          </div>

          {/* Stats */}
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-primary-500" />
                <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {formatAmount(analytics.totalDonationsWei)} <span className="text-lg text-gray-400">STT</span>
                </p>
                <p className="text-sm text-gray-500">Total Raised</p>
              </div>
              <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-accent-500" />
                <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {formatCompactNumber(analytics.totalDonors)}
                </p>
                <p className="text-sm text-gray-500">Total Donors</p>
              </div>
              <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-3 text-yellow-500" />
                <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {analytics.completedCampaigns}
                </p>
                <p className="text-sm text-gray-500">Completed Campaigns</p>
              </div>
              <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-3 text-success-500" />
                <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {analytics.activeCampaigns}
                </p>
                <p className="text-sm text-gray-500">Active Campaigns</p>
              </div>
            </div>
          )}

          {/* Period Filter */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(['all', 'month', 'week'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-6 py-2 rounded-full font-medium transition-all capitalize",
                  period === p
                    ? "bg-primary-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
              >
                {p === 'all' ? 'All Time' : `This ${p}`}
              </button>
            ))}
          </div>

          {/* Leaderboard Table */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-6 rounded-xl bg-gray-800/30">
                  <div className="w-8 h-8 rounded-full bg-gray-700" />
                  <div className="flex-1">
                    <div className="h-5 w-40 bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-24 bg-gray-700 rounded" />
                  </div>
                  <div className="h-8 w-32 bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 mx-auto mb-6 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">No donations yet</h3>
              <p className="text-gray-400">Be the first to appear on the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "flex items-center gap-4 p-6 rounded-xl border transition-colors hover:border-primary-500/50",
                    getRankStyles(entry.rank)
                  )}
                >
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-lg truncate">
                      {entry.displayName || shortenAddress(entry.address)}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{entry.donationCount} donation{entry.donationCount !== 1 ? 's' : ''}</span>
                      {entry.lastDonationAt && (
                        <span>Last active: {new Date(entry.lastDonationAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-400">
                      {formatAmount(entry.totalDonated)}
                    </p>
                    <p className="text-sm text-gray-500">STT</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
