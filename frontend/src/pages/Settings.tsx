import React, { useState, useRef } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { useSettingsStore } from '../store/settingsStore';
import { useToast } from '../components/Toast';
import type { AISettings } from '../types';

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o'],
  anthropic: ['claude-haiku-4-5', 'claude-sonnet-4-5'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  custom: [],
};

const WINDOW_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
  { label: '72 hours', value: 72 },
  { label: '7 days', value: 168 },
];

const REFRESH_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '60 minutes', value: 60 },
];

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-text-primary font-sans">{title}</h2>
        {description && (
          <p className="text-xs text-text-secondary mt-1 font-sans">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-text-secondary mb-1.5 font-sans">{label}</label>
      {children}
      {hint && <p className="text-xs text-text-secondary mt-1.5 font-sans opacity-70">{hint}</p>}
    </div>
  );
}

export default function Settings(): React.ReactElement {
  const {
    ai,
    feedWindowHours,
    refreshIntervalMinutes,
    theme,
    customKeywords,
    updateAISettings,
    updateFeedWindow,
    updateRefreshInterval,
    updateTheme,
    setCustomKeywords,
  } = useSettingsStore();

  const { addToast } = useToast();
  const [testingConnection, setTestingConnection] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const [customModelInput, setCustomModelInput] = useState(
    ai.provider === 'custom' ? ai.model : ''
  );

  const handleProviderChange = (provider: AISettings['provider']) => {
    const defaultModels = PROVIDER_MODELS[provider];
    const defaultModel = defaultModels.length > 0 ? defaultModels[0] : customModelInput;
    updateAISettings({ provider, model: defaultModel });
  };

  const handleModelChange = (model: string) => {
    updateAISettings({ model });
    if (ai.provider === 'custom') {
      setCustomModelInput(model);
    }
  };

  const handleTestConnection = async () => {
    if (!ai.apiKey) {
      addToast('error', 'Please enter an API key');
      return;
    }

    setTestingConnection(true);

    try {
      // Send a minimal test request via the refresh endpoint but with a fake item
      // We do a simple API call to validate the key works
      const testPrompt = 'Reply with exactly: {"status":"ok"}';

      let testPassed = false;

      if (ai.provider === 'openai' || ai.provider === 'custom') {
        const url = ai.provider === 'custom' && ai.baseUrl
          ? `${ai.baseUrl}/chat/completions`
          : 'https://api.openai.com/v1/chat/completions';
        const response = await axios.post(
          url,
          { model: ai.model, messages: [{ role: 'user', content: testPrompt }], max_tokens: 20 },
          { headers: { Authorization: `Bearer ${ai.apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 }
        );
        testPassed = !!response.data;
      } else if (ai.provider === 'anthropic') {
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          { model: ai.model, max_tokens: 20, messages: [{ role: 'user', content: testPrompt }] },
          {
            headers: {
              'x-api-key': ai.apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        testPassed = !!response.data;
      } else if (ai.provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${ai.model}:generateContent?key=${ai.apiKey}`;
        const response = await axios.post(
          url,
          { contents: [{ parts: [{ text: testPrompt }] }], generationConfig: { maxOutputTokens: 20 } },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );
        testPassed = !!response.data;
      }

      if (testPassed) {
        addToast('success', 'Connection successful! AI provider is working.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      // Check for auth errors
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        addToast('error', 'Invalid API key. Please check your credentials.');
      } else {
        addToast('error', `Connection failed: ${message}`);
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-sans';
  const selectClass = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-sans cursor-pointer';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1 font-sans">
          Configure FeedWatch to match your workflow
        </p>
      </div>

      {/* AI Provider */}
      <Section
        title="AI Provider"
        description="Configure an AI provider to enable intelligent feed analysis, categorization, and threat intelligence enrichment."
      >
        <Field label="Provider">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['openai', 'anthropic', 'gemini', 'custom'] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={clsx(
                  'px-3 py-2 rounded-lg text-xs font-semibold capitalize border transition-all duration-150 font-sans',
                  ai.provider === provider
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-background text-text-secondary border-border hover:text-text-primary hover:border-border/80'
                )}
              >
                {provider === 'openai' ? 'OpenAI' :
                 provider === 'anthropic' ? 'Anthropic' :
                 provider === 'gemini' ? 'Gemini' : 'Custom'}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="API Key"
          hint="Your API key is stored only in your browser's localStorage and never sent to any server other than the AI provider."
        >
          <input
            type="password"
            placeholder={
              ai.provider === 'openai' ? 'sk-...' :
              ai.provider === 'anthropic' ? 'sk-ant-...' :
              ai.provider === 'gemini' ? 'AIza...' :
              'Your API key'
            }
            value={ai.apiKey}
            onChange={(e) => updateAISettings({ apiKey: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Model">
          {ai.provider === 'custom' ? (
            <input
              type="text"
              placeholder="e.g. llama3, mistral, phi-3"
              value={customModelInput}
              onChange={(e) => {
                setCustomModelInput(e.target.value);
                handleModelChange(e.target.value);
              }}
              className={inputClass}
            />
          ) : (
            <select
              value={ai.model}
              onChange={(e) => handleModelChange(e.target.value)}
              className={selectClass}
            >
              {PROVIDER_MODELS[ai.provider]?.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          )}
        </Field>

        {ai.provider === 'custom' && (
          <Field
            label="Base URL"
            hint="OpenAI-compatible endpoint. Example: http://localhost:11434/v1"
          >
            <input
              type="url"
              placeholder="http://localhost:11434/v1"
              value={ai.baseUrl ?? ''}
              onChange={(e) => updateAISettings({ baseUrl: e.target.value })}
              className={inputClass}
            />
          </Field>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => void handleTestConnection()}
            disabled={testingConnection || !ai.apiKey}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-border/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans"
          >
            {testingConnection ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Testing...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Connection
              </>
            )}
          </button>
          {ai.apiKey && (
            <button
              onClick={() => updateAISettings({ apiKey: '' })}
              className="text-xs text-red-400 hover:text-red-300 font-sans transition-colors"
            >
              Clear API Key
            </button>
          )}
        </div>
      </Section>

      {/* Feed Settings */}
      <Section
        title="Feed Settings"
        description="Control how feeds are fetched and displayed."
      >
        <Field
          label="Time Window"
          hint="Only show and store feed items published within this window."
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WINDOW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateFeedWindow(opt.value)}
                className={clsx(
                  'px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 font-sans',
                  feedWindowHours === opt.value
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-background text-text-secondary border-border hover:text-text-primary hover:border-border/80'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Auto-Refresh Interval"
          hint="How often to automatically fetch new feed items. Requires server restart to take effect."
        >
          <div className="grid grid-cols-3 gap-2">
            {REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateRefreshInterval(opt.value)}
                className={clsx(
                  'px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 font-sans',
                  refreshIntervalMinutes === opt.value
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-background text-text-secondary border-border hover:text-text-primary hover:border-border/80'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Custom Keywords */}
      <Section
        title="Custom Keywords"
        description="Define keywords relevant to your environment (e.g. infrastructure stack, company names, countries). Feed items containing these keywords will be highlighted and their urgency/severity automatically boosted by one level."
      >
        <Field label="Add Keyword">
          <div className="flex gap-2">
            <input
              ref={keywordInputRef}
              type="text"
              placeholder="e.g. Indonesia, AWS, CompanyName, Log4j"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newKeyword.trim()) {
                  const kw = newKeyword.trim();
                  if (!customKeywords.includes(kw)) {
                    setCustomKeywords([...customKeywords, kw]);
                  }
                  setNewKeyword('');
                }
              }}
              className={inputClass}
            />
            <button
              onClick={() => {
                const kw = newKeyword.trim();
                if (kw && !customKeywords.includes(kw)) {
                  setCustomKeywords([...customKeywords, kw]);
                }
                setNewKeyword('');
                keywordInputRef.current?.focus();
              }}
              disabled={!newKeyword.trim()}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans flex-shrink-0"
            >
              Add
            </button>
          </div>
        </Field>

        {customKeywords.length > 0 ? (
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2 font-sans">Active Keywords ({customKeywords.length})</label>
            <div className="flex flex-wrap gap-2">
              {customKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 font-sans"
                >
                  {kw}
                  <button
                    onClick={() => setCustomKeywords(customKeywords.filter((k) => k !== kw))}
                    className="w-3.5 h-3.5 rounded-full hover:bg-yellow-500/20 flex items-center justify-center transition-colors"
                    title={`Remove "${kw}"`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={() => setCustomKeywords([])}
              className="mt-3 text-xs text-red-400 hover:text-red-300 font-sans transition-colors"
            >
              Clear all keywords
            </button>
          </div>
        ) : (
          <p className="text-xs text-text-secondary font-sans opacity-60">No keywords configured. Add keywords above to start matching.</p>
        )}
      </Section>

      {/* Appearance */}
      <Section
        title="Appearance"
        description="Customize the visual theme of FeedWatch."
      >
        <Field label="Color Theme">
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateTheme('dark')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 font-sans',
                theme === 'dark'
                  ? 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-background text-text-secondary border-border hover:text-text-primary'
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Dark
            </button>
            <button
              onClick={() => updateTheme('light')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 font-sans',
                theme === 'light'
                  ? 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-background text-text-secondary border-border hover:text-text-primary'
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Light
            </button>
          </div>
        </Field>
      </Section>

      {/* About */}
      <div className="text-center py-4">
        <p className="text-xs text-text-secondary font-sans opacity-50">
          FeedWatch v1.0.0 · RSS Intelligence Platform
        </p>
      </div>
    </div>
  );
}
