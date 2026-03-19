import React from 'react';
import { useParams, Link } from 'react-router-dom';
import FeedCard from '../components/FeedCard';
import SkeletonCard from '../components/SkeletonCard';
import { useFeeds } from '../hooks/useFeeds';
import { useSettingsStore } from '../store/settingsStore';

export default function CategoryPage(): React.ReactElement {
  const { name } = useParams<{ name: string }>();
  const { feedWindowHours } = useSettingsStore();

  const category = name ? decodeURIComponent(name) : '';

  const { feeds, total, loading, error, refetch } = useFeeds({
    window: feedWindowHours,
    category: category || undefined,
    limit: 50,
    page: 1,
  });

  if (!category) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary font-sans">Category not found</p>
        <Link to="/" className="text-accent hover:underline text-sm font-sans mt-2 inline-block">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-text-secondary mb-3 font-sans">
          <Link to="/" className="hover:text-text-primary transition-colors">Dashboard</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Category</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-text-primary">{category}</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold text-text-primary">{category}</h1>
          {!loading && (
            <span className="bg-accent/10 text-accent border border-accent/20 text-xs font-bold px-2 py-1 rounded-full font-sans">
              {total} items
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary mt-1 font-sans">
          All {category} intelligence from the last {feedWindowHours} hours
        </p>
      </div>

      {/* Content */}
      {error ? (
        <div className="text-center py-12">
          <p className="text-red-400 font-sans text-sm">{error}</p>
          <button
            onClick={refetch}
            className="mt-3 text-accent text-sm hover:underline font-sans"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <svg className="w-12 h-12 text-text-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-secondary font-sans text-sm">No items in this category</p>
          <p className="text-text-secondary font-sans text-xs mt-1 opacity-60">
            Items appear here after AI analysis. Configure an AI provider in Settings.
          </p>
          <Link
            to="/settings"
            className="mt-4 inline-flex items-center gap-1.5 text-accent text-sm hover:underline font-sans"
          >
            Configure AI Settings
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {feeds.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
