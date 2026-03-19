import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { FeedItem, FeedsResponse } from '../types';

interface FeedFilters {
  window?: number;
  category?: string;
  urgency?: string;
  severity?: string;
  search?: string;
  page?: number;
  limit?: number;
  nonce?: number; // increment to force re-fetch without changing other filters
}

interface UseFeedsResult {
  feeds: FeedItem[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFeeds(filters: FeedFilters = {}): UseFeedsResult {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeeds = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.window) params.set('window', String(filters.window));
      if (filters.category) params.set('category', filters.category);
      if (filters.urgency) params.set('urgency', filters.urgency);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const response = await axios.get<FeedsResponse>(`/api/feeds?${params.toString()}`);
      setFeeds(response.data.items);
      setTotal(response.data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch feeds';
      setError(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.window,
    filters.category,
    filters.urgency,
    filters.severity,
    filters.search,
    filters.page,
    filters.limit,
    filters.nonce,
  ]);

  useEffect(() => {
    void fetchFeeds();
  }, [fetchFeeds]);

  return { feeds, total, loading, error, refetch: fetchFeeds };
}
