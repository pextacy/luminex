'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { shortenAddress, formatAmount, cn } from '@/lib/utils';
import { getLeaderboard } from '@/lib/api';
import type { LeaderboardEntry } from '@/lib/types';

interface LeaderboardProps {
  campaignId?: string;
  limit?: number;
  showTitle?: boolean;
}

export function Leaderboard({ campaignId, limit = 10, showTitle = true }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard({ campaignId, limit });
        setEntries(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [campaignId, limit]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-gray-500 font-medium">{rank}</span>;
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gray-500/10 border-gray-500/30';
      case 3:
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-gray-800/30 border-gray-700/30';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-white">Top Donors</h3>
          </div>
        )}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl bg-gray-800/30">
            <div className="w-8 h-8 rounded-full bg-gray-700" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-700 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-700 rounded" />
            </div>
            <div className="h-6 w-24 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No donations yet</p>
        <p className="text-sm mt-1">Be the first to appear on the leaderboard!</p>
      </div>
    );
  }

  return (
    <div>
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-white">Top Donors</h3>
        </div>
      )}
      
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.address}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border transition-colors",
              getRankStyles(entry.rank)
            )}
          >
            <div className="flex items-center justify-center w-8">
              {getRankIcon(entry.rank)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">
                {entry.displayName || shortenAddress(entry.address)}
              </p>
              <p className="text-xs text-gray-500">
                {entry.donationCount} donation{entry.donationCount !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="text-right">
              <p className="font-bold text-primary-400">
                {formatAmount(entry.totalDonated)}
              </p>
              <p className="text-xs text-gray-500">STT</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
