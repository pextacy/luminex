'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Users, TrendingUp, CheckCircle } from 'lucide-react';
import type { Campaign } from '@/lib/types';
import { formatAmount, calculateProgress, formatRelativeTime, getCategoryIcon, cn } from '@/lib/utils';

interface CampaignCardProps {
  campaign: Campaign;
  featured?: boolean;
}

export function CampaignCard({ campaign, featured = false }: CampaignCardProps) {
  const progress = calculateProgress(campaign.currentAmount, campaign.targetAmount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/campaigns/${campaign.id}`} className="block group">
        <div className={cn(
          "card-hover overflow-hidden",
          featured && "ring-2 ring-primary-500/50"
        )}>
          {/* Image */}
          <div className="relative h-48 sm:h-56 overflow-hidden">
            {campaign.imageUrl ? (
              <Image
                src={campaign.imageUrl}
                alt={campaign.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full gradient-bg flex items-center justify-center">
                <span className="text-6xl">{getCategoryIcon(campaign.category.id)}</span>
              </div>
            )}
            
            {/* Category Badge */}
            <div className="absolute top-3 left-3">
              <span 
                className="badge text-white text-xs"
                style={{ backgroundColor: campaign.category.color || '#6b7280' }}
              >
                {getCategoryIcon(campaign.category.id)} {campaign.category.name}
              </span>
            </div>

            {/* Featured Badge */}
            {campaign.isFeatured && (
              <div className="absolute top-3 right-3">
                <span className="badge bg-accent-500 text-white text-xs">
                  ⭐ Featured
                </span>
              </div>
            )}

            {/* Verified Badge */}
            {campaign.isVerified && (
              <div className="absolute bottom-3 right-3">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success-500/90 text-white text-xs">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Organization */}
            <div className="flex items-center gap-2 mb-2">
              {campaign.organization.logoUrl ? (
                <Image
                  src={campaign.organization.logoUrl}
                  alt={campaign.organization.name}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-xs">{campaign.organization.name[0]}</span>
                </div>
              )}
              <span className="text-sm text-gray-400 truncate">
                {campaign.organization.name}
              </span>
              {campaign.organization.isVerified && (
                <CheckCircle className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors line-clamp-2 mb-3">
              {campaign.title}
            </h3>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="progress-bar"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-gray-400">
                  <span className="text-white font-semibold">{formatAmount(campaign.currentAmount)}</span> STT raised
                </span>
                <span className="text-primary-400 font-medium">{progress.toFixed(0)}%</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{campaign.donorCount} donors</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>{formatAmount(campaign.targetAmount)} goal</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Skeleton loader for campaign card
export function CampaignCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-48 sm:h-56 bg-gray-800" />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-gray-700" />
          <div className="h-4 w-24 bg-gray-700 rounded" />
        </div>
        <div className="h-6 bg-gray-700 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-700 rounded mb-4" />
        <div className="h-2 bg-gray-700 rounded mb-2" />
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-gray-700 rounded" />
          <div className="h-4 w-12 bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}
