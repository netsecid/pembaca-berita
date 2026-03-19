import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import FeedCard from '../components/FeedCard';
import SkeletonCard from '../components/SkeletonCard';
import { useSettingsStore } from '../store/settingsStore';
import type { FeedStats, FeedItem } from '../types';

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const URGENCY_ICONS: Record<string, React.ReactElement> = {
  critical: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  high: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  medium: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  low: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function Dashboard(): React.ReactElement {
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [topItems, setTopItems] = useState<FeedItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const { feedWindowHours } = useSettingsStore();

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const response = await axios.get<FeedStats>('/api/feeds/stats');
        setStats(response.data);
        setLastFetched(new Date());
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchTopItems = async () => {
      setLoadingItems(true);
      try {
        const response = await axios.get<{ items: FeedItem[] }>('/api/feeds', {
          params: {
            window: feedWindowHours,
            urgency: 'critical',
            limit: 10,
            page: 1,
          },
        });

        let items = response.data.items;

        // If fewer than 5 critical, supplement with high
        if (items.length < 5) {
          const highResponse = await axios.get<{ items: FeedItem[] }>('/api/feeds', {
            params: {
              window: feedWindowHours,
              urgency: 'high',
              limit: 10 - items.length,
              page: 1,
            },
          });
          items = [...items, ...highResponse.data.items];
        }

        setTopItems(items.slice(0, 10));
      } catch (err) {
        console.error('Failed to fetch top items:', err);
      } finally {
        setLoadingItems(false);
      }
    };

    void fetchStats();
    void fetchTopItems();
  }, [feedWindowHours]);

  const urgencyKeys = ['critical', 'high', 'medium', 'low'] as const;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Intelligence Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1 font-sans">
            Last {feedWindowHours} hours of cybersecurity intelligence
            {lastFetched && (
              <span className="ml-2 opacity-60">
                · Updated {formatDistanceToNow(lastFetched, { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div className="bg-surface border border-border rounded-lg p-4 col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-accent/10 rounded-lg">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-.586-1.414l-4.5-4.5A2 2 0 0014.5 3H7" />
              </svg>
            </div>
          </div>
          {loadingStats ? (
            <div className="h-8 bg-border rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-text-primary font-display">{stats?.total ?? 0}</p>
          )}
          <p className="text-xs text-text-secondary mt-1 font-sans">Total Items</p>
        </div>

        {/* Urgency breakdown */}
        {urgencyKeys.map((urgency) => (
          <div
            key={urgency}
            className={`bg-surface border rounded-lg p-4 col-span-1 border-l-4 ${
              urgency === 'critical' ? 'border-l-urgency-critical border-border' :
              urgency === 'high' ? 'border-l-urgency-high border-border' :
              urgency === 'medium' ? 'border-l-urgency-medium border-border' :
              'border-l-urgency-low border-border'
            }`}
          >
            <div className={`inline-flex p-1.5 rounded-lg mb-2 ${URGENCY_COLORS[urgency]}`}>
              {URGENCY_ICONS[urgency]}
            </div>
            {loadingStats ? (
              <div className="h-8 bg-border rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-text-primary font-display">
                {stats?.byUrgency[urgency] ?? 0}
              </p>
            )}
            <p className="text-xs text-text-secondary mt-1 capitalize font-sans">{urgency}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {stats && Object.keys(stats.byCategory).length > 0 && (
        <div>
          <h2 className="text-lg font-display font-bold text-text-primary mb-3">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <Link
                  key={category}
                  to={`/category/${encodeURIComponent(category)}`}
                  className="bg-surface border border-border rounded-lg p-3 hover:border-accent/40 hover:bg-accent/5 transition-all duration-150 group"
                >
                  <p className="text-lg font-bold text-text-primary font-display group-hover:text-accent transition-colors">
                    {count}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5 truncate font-sans">{category}</p>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Top critical/high items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-bold text-text-primary">Top Threats</h2>
          <Link
            to="/feeds"
            className="text-xs text-accent hover:text-accent/80 font-sans flex items-center gap-1 transition-colors"
          >
            View all
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loadingItems ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : topItems.length === 0 ? (
          <div className="text-center py-12 bg-surface border border-border rounded-lg">
            <svg className="w-10 h-10 text-text-secondary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-text-secondary font-sans text-sm">No critical or high urgency items found</p>
            <p className="text-text-secondary font-sans text-xs mt-1 opacity-60">
              Configure an AI provider in Settings to enable intelligence enrichment
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topItems.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
