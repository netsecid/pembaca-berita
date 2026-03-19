import React, { useState, useEffect, useCallback } from 'react';
import FeedCard from '../components/FeedCard';
import SkeletonCard from '../components/SkeletonCard';
import { useFeeds } from '../hooks/useFeeds';
import { useCategories } from '../hooks/useCategories';
import { useSettingsStore } from '../store/settingsStore';
import clsx from 'clsx';

const URGENCY_OPTIONS = ['critical', 'high', 'medium', 'low'] as const;
const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'informational'] as const;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function AllFeeds(): React.ReactElement {
  const { feedWindowHours } = useSettingsStore();
  const { categories } = useCategories();

  const [searchInput, setSearchInput] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const debouncedSearch = useDebounce(searchInput, 400);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedUrgency, selectedSeverity, selectedCategory]);

  const filters = {
    window: feedWindowHours,
    search: debouncedSearch || undefined,
    urgency: selectedUrgency || undefined,
    severity: selectedSeverity || undefined,
    category: selectedCategory || undefined,
    page,
    limit,
  };

  const { feeds, total, loading, error, refetch } = useFeeds(filters);

  const totalPages = Math.ceil(total / limit);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSelectedUrgency('');
    setSelectedSeverity('');
    setSelectedCategory('');
    setPage(1);
  }, []);

  const hasFilters = searchInput || selectedUrgency || selectedSeverity || selectedCategory;

  return (
    <div className="flex h-full">
      {/* Filter sidebar */}
      <div className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-border p-4 space-y-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-sans">Filters</h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-accent hover:text-accent/80 font-sans transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Urgency filter */}
        <div>
          <p className="text-xs font-semibold text-text-secondary mb-2 font-sans">Urgency</p>
          <div className="space-y-1">
            {URGENCY_OPTIONS.map((urgency) => (
              <label key={urgency} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="urgency"
                  value={urgency}
                  checked={selectedUrgency === urgency}
                  onChange={(e) => setSelectedUrgency(e.target.checked ? urgency : '')}
                  onClick={() => selectedUrgency === urgency && setSelectedUrgency('')}
                  className="accent-accent"
                />
                <span className={clsx(
                  'text-xs capitalize font-sans group-hover:text-text-primary transition-colors',
                  selectedUrgency === urgency ? 'text-text-primary font-medium' : 'text-text-secondary'
                )}>
                  {urgency}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Severity filter */}
        <div>
          <p className="text-xs font-semibold text-text-secondary mb-2 font-sans">Severity</p>
          <div className="space-y-1">
            {SEVERITY_OPTIONS.map((severity) => (
              <label key={severity} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="severity"
                  value={severity}
                  checked={selectedSeverity === severity}
                  onChange={(e) => setSelectedSeverity(e.target.checked ? severity : '')}
                  onClick={() => selectedSeverity === severity && setSelectedSeverity('')}
                  className="accent-accent"
                />
                <span className={clsx(
                  'text-xs capitalize font-sans group-hover:text-text-primary transition-colors',
                  selectedSeverity === severity ? 'text-text-primary font-medium' : 'text-text-secondary'
                )}>
                  {severity}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2 font-sans">Category</p>
            <div className="space-y-1">
              {categories.map((cat) => (
                <label key={cat.category} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    value={cat.category}
                    checked={selectedCategory === cat.category}
                    onChange={(e) => setSelectedCategory(e.target.checked ? cat.category : '')}
                    onClick={() => selectedCategory === cat.category && setSelectedCategory('')}
                    className="accent-accent"
                  />
                  <span className={clsx(
                    'text-xs font-sans group-hover:text-text-primary transition-colors flex-1 truncate',
                    selectedCategory === cat.category ? 'text-text-primary font-medium' : 'text-text-secondary'
                  )}>
                    {cat.category}
                  </span>
                  <span className="text-[10px] text-text-secondary">{cat.count}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search bar */}
        <div className="p-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search feeds..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-sans"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <span className="text-xs text-text-secondary font-sans whitespace-nowrap">
              {total} items
            </span>
          </div>
        </div>

        {/* Feed list */}
        <div className="flex-1 overflow-y-auto p-4">
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
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-text-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-text-secondary font-sans text-sm mb-2">No feeds found</p>
              {hasFilters ? (
                <button
                  onClick={clearFilters}
                  className="text-accent text-sm hover:underline font-sans"
                >
                  Clear filters
                </button>
              ) : (
                <p className="text-text-secondary font-sans text-xs opacity-60">
                  Use the Refresh button to fetch new items
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {feeds.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-text-secondary font-sans">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
