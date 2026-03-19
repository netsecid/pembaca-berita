import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import { useToast } from './Toast';
import { useSettingsStore } from '../store/settingsStore';

export default function Layout(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { addToast } = useToast();
  const { theme, updateTheme, ai, customPromptAnalysis } = useSettingsStore();

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      const body: Record<string, string | undefined> = {};
      if (ai.apiKey && ai.provider && ai.model) {
        body.apiKey = ai.apiKey;
        body.provider = ai.provider;
        body.model = ai.model;
        if (ai.baseUrl) body.baseUrl = ai.baseUrl;
        if (customPromptAnalysis.trim()) body.customPrompt = customPromptAnalysis.trim();
      }

      const response = await axios.post<{ success: boolean; message: string; newItems: number }>(
        '/api/refresh',
        body
      );

      setLastRefresh(new Date());
      addToast('success', response.data.message || `Fetched ${response.data.newItems} new items`);
      // Signal all pages to re-fetch their data
      window.dispatchEvent(new CustomEvent('feedwatch-refreshed'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      addToast('error', message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, ai, customPromptAnalysis, addToast]);

  const toggleTheme = () => {
    updateTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const formatLastRefresh = () => {
    if (!lastRefresh) return null;
    return lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const providerLabel = ai.apiKey
    ? `${ai.provider === 'openai' ? 'OpenAI' : ai.provider === 'anthropic' ? 'Anthropic' : ai.provider === 'gemini' ? 'Gemini' : 'Custom'} · ${ai.model.split('/').pop()?.split('-').slice(0, 3).join('-') ?? ai.model}`
    : null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <div
        className={`hidden lg:flex lg:flex-col flex-shrink-0 h-full transition-all duration-300 ${
          sidebarCollapsed ? 'w-14' : 'w-64'
        }`}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((c) => !c)} />
      </div>

      {/* Sidebar - mobile */}
      <div
        className={`fixed inset-y-0 left-0 w-72 z-30 transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-background flex-shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Title - mobile only */}
          <span className="lg:hidden font-display font-bold text-text-primary text-base">Mata-CTI</span>

          <div className="flex-1" />

          {/* Active AI provider badge */}
          {providerLabel && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-[11px] text-text-secondary font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              {providerLabel}
            </div>
          )}

          {/* Last refresh */}
          {lastRefresh && (
            <span className="hidden md:block text-xs text-text-secondary font-sans opacity-60">
              {formatLastRefresh()}
            </span>
          )}

          {/* Refresh button */}
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
