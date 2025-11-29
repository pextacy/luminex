'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  text,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className={`${sizeClasses[size]} text-primary-500`} />
      </motion.div>
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950 z-50">
        {content}
      </div>
    );
  }

  return content;
}

// Skeleton loading components
export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800 overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-800" />
      <div className="p-6">
        <div className="h-6 bg-gray-800 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-800 rounded w-full mb-2" />
        <div className="h-4 bg-gray-800 rounded w-2/3 mb-4" />
        <div className="h-2 bg-gray-800 rounded w-full mb-4" />
        <div className="flex justify-between">
          <div className="h-4 bg-gray-800 rounded w-1/4" />
          <div className="h-4 bg-gray-800 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonText({ width = '100%' }: { width?: string }) {
  return (
    <div 
      className="h-4 bg-gray-800 rounded animate-pulse" 
      style={{ width }}
    />
  );
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return (
    <div 
      className="rounded-full bg-gray-800 animate-pulse" 
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <SkeletonCircle />
          <div className="flex-1">
            <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
