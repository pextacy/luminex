'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ExternalLink } from 'lucide-react';
import { useWebSocket } from '@/lib/websocket/provider';
import { shortenAddress, formatAmount, formatRelativeTime, cn } from '@/lib/utils';
import type { WsDonationEvent } from '@/lib/types';

interface DonationFeedProps {
  campaignId?: string;
  maxItems?: number;
}

export function DonationFeed({ campaignId, maxItems = 10 }: DonationFeedProps) {
  const { subscribeToDonations, subscribeToCampaign, onDonation } = useWebSocket();
  const [donations, setDonations] = useState<WsDonationEvent['data'][]>([]);

  useEffect(() => {
    // Subscribe to donations
    if (campaignId) {
      subscribeToCampaign(campaignId);
    } else {
      subscribeToDonations();
    }

    // Listen for new donations
    const unsubscribe = onDonation((event) => {
      if (!campaignId || event.data.campaignId === campaignId) {
        setDonations(prev => [event.data, ...prev].slice(0, maxItems));
      }
    });

    return unsubscribe;
  }, [campaignId, maxItems, subscribeToDonations, subscribeToCampaign, onDonation]);

  if (donations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Waiting for donations...</p>
        <p className="text-sm mt-1">Be the first to donate!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {donations.map((donation) => (
          <motion.div
            key={donation.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            layout
            className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-200">
                    {donation.isAnonymous ? 'Anonymous' : shortenAddress(donation.donorAddress)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(new Date(donation.timestamp).toISOString())}
                  </span>
                </div>
                
                {donation.message && (
                  <p className="text-sm text-gray-400 truncate">
                    "{donation.message}"
                  </p>
                )}
                
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {donation.campaignTitle}
                </p>
              </div>
              
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold text-primary-400">
                  {formatAmount(donation.amount)}
                </span>
                <span className="text-sm text-gray-500 ml-1">STT</span>
              </div>
            </div>

            <a
              href={`https://somnia-devnet.socialscan.io/tx/${donation.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-primary-400 transition-colors"
            >
              View on Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Donation toast notification component
export function DonationToast({ donation }: { donation: WsDonationEvent['data'] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
        <Heart className="w-5 h-5 text-primary-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">
          New Donation! 🎉
        </p>
        <p className="text-xs text-gray-400">
          {donation.isAnonymous ? 'Anonymous' : shortenAddress(donation.donorAddress)} donated{' '}
          <span className="text-primary-400">{formatAmount(donation.amount)} STT</span>
        </p>
      </div>
    </div>
  );
}
