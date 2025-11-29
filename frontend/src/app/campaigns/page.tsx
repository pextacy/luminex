'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Filter, Grid, List, X } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CampaignCard, CampaignCardSkeleton } from '@/components/campaigns/campaign-card';
import { getCampaigns, getCategories } from '@/lib/api';
import { CATEGORIES } from '@/lib/config';
import { cn } from '@/lib/utils';
import type { Campaign, Category } from '@/lib/types';

export default function CampaignsPage() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const data = await getCampaigns({
          category: selectedCategory || undefined,
          page,
          limit: 12,
        });
        setCampaigns(data.campaigns);
        setTotalPages(data.meta.totalPages);
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [selectedCategory, page]);

  const handleCategoryChange = (categorySlug: string | null) => {
    setSelectedCategory(categorySlug);
    setPage(1);
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    searchQuery
      ? campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <>
      <Header />
      
      <main className="min-h-screen pt-24 pb-16">
        <div className="container-custom">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Explore Campaigns
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Discover verified campaigns making real impact around the world.
              Your donation creates lasting change.
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8">
            {/* Search and View Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search campaigns..."
                  className="input pl-12"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-3 rounded-lg transition-colors",
                    viewMode === 'grid'
                      ? "bg-primary-500/20 text-primary-400"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  )}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-3 rounded-lg transition-colors",
                    viewMode === 'list'
                      ? "bg-primary-500/20 text-primary-400"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  )}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange(null)}
                className={cn(
                  "px-4 py-2 rounded-full font-medium transition-all",
                  !selectedCategory
                    ? "bg-primary-500 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                )}
              >
                All Categories
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.slug)}
                  className={cn(
                    "px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2",
                    selectedCategory === category.slug
                      ? "text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  )}
                  style={{
                    backgroundColor: selectedCategory === category.slug ? category.color : undefined,
                  }}
                >
                  <span>{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid'
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1"
            )}>
              {Array.from({ length: 6 }).map((_, i) => (
                <CampaignCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                <Search className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No campaigns found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : 'There are no campaigns in this category yet.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                className="btn-primary btn-md"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className={cn(
                "grid gap-6",
                viewMode === 'grid'
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              )}>
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary btn-md"
                  >
                    Previous
                  </button>
                  <span className="text-gray-400 px-4">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary btn-md"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
