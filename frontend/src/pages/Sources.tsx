import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../components/Toast';
import type { Source } from '../types';

interface TestResult {
  success: boolean;
  title?: string;
  itemCount?: number;
  error?: string;
}

export default function Sources(): React.ReactElement {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get<Source[]>('/api/sources');
      setSources(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sources';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchSources();
  }, [fetchSources]);

  const handleTest = async () => {
    if (!newUrl.trim()) {
      addToast('error', 'Please enter a URL to test');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await axios.post<TestResult>('/api/sources/test', { url: newUrl.trim() });
      setTestResult(response.data);
      if (response.data.success) {
        addToast('success', `Feed valid: "${response.data.title}" (${response.data.itemCount ?? 0} items)`);
        if (!newName.trim() && response.data.title) {
          setNewName(response.data.title);
        }
      } else {
        addToast('error', `Feed test failed: ${response.data.error ?? 'Unknown error'}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
      addToast('error', message);
      setTestResult({ success: false, error: message });
    } finally {
      setTesting(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) {
      addToast('error', 'Name and URL are required');
      return;
    }

    setAdding(true);
    try {
      const response = await axios.post<Source>('/api/sources', {
        name: newName.trim(),
        url: newUrl.trim(),
      });
      setSources((prev) => [response.data, ...prev]);
      setNewName('');
      setNewUrl('');
      setTestResult(null);
      addToast('success', `Source "${response.data.name}" added successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add source';
      addToast('error', message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      await axios.delete(`/api/sources/${id}`);
      setSources((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirm(null);
      addToast('success', 'Source removed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove source';
      addToast('error', message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">RSS Sources</h1>
        <p className="text-sm text-text-secondary mt-1 font-sans">
          Manage your RSS feed sources
        </p>
      </div>

      {/* Add new source */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-base font-semibold text-text-primary mb-4 font-sans">Add New Source</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 font-sans">
              Feed Name
            </label>
            <input
              type="text"
              placeholder="e.g. The Hacker News"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-sans"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 font-sans">
              Feed URL
            </label>
            <input
              type="url"
              placeholder="https://example.com/feed.xml"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setTestResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleTest();
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-sans"
            />
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`text-xs px-3 py-2 rounded-lg mb-3 font-sans ${
            testResult.success
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {testResult.success
              ? `Valid feed: "${testResult.title}" · ${testResult.itemCount ?? 0} items found`
              : `Invalid feed: ${testResult.error ?? 'Unknown error'}`}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleTest()}
            disabled={testing || !newUrl.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-border/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans"
          >
            {testing ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Testing...
              </span>
            ) : 'Test Feed'}
          </button>
          <button
            onClick={() => void handleAdd()}
            disabled={adding || !newName.trim() || !newUrl.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans"
          >
            {adding ? 'Adding...' : 'Add Source'}
          </button>
        </div>
      </div>

      {/* Sources table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary font-sans">
            Active Sources ({sources.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-text-secondary font-sans text-sm">
            No sources configured. Add your first RSS feed above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider font-sans">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider font-sans hidden sm:table-cell">URL</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider font-sans">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider font-sans hidden md:table-cell">Last Fetched</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((source) => (
                  <tr key={source.id} className="hover:bg-background/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-text-primary font-sans">{source.name}</span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-secondary hover:text-accent font-mono truncate max-w-xs block transition-colors"
                        title={source.url}
                      >
                        {source.url.length > 50 ? `${source.url.substring(0, 50)}...` : source.url}
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border font-sans ${
                        source.enabled
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-border/50 text-text-secondary border-border'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${source.enabled ? 'bg-green-400' : 'bg-text-secondary'}`} />
                        {source.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-xs text-text-secondary font-sans">
                        {source.last_fetched
                          ? formatDistanceToNow(new Date(source.last_fetched), { addSuffix: true })
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {deleteConfirm === source.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-text-secondary font-sans">Confirm?</span>
                          <button
                            onClick={() => void handleDelete(source.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium font-sans transition-colors"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-text-secondary hover:text-text-primary font-sans transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => void handleDelete(source.id)}
                          className="text-xs text-text-secondary hover:text-red-400 font-sans transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
