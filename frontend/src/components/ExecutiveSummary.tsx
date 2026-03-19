import React, { useState } from 'react';
import axios from 'axios';
import { useSettingsStore } from '../store/settingsStore';
import type { FeedItem } from '../types';

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}
interface AnthropicResponse {
  content: Array<{ text: string }>;
}
interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
}

async function callAI(prompt: string, provider: string, apiKey: string, model: string, baseUrl?: string): Promise<string> {
  if (provider === 'openai' || provider === 'custom') {
    const url = provider === 'custom' && baseUrl ? `${baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    const res = await axios.post<OpenAIResponse>(
      url,
      { model, messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 1200 },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 45000 }
    );
    return res.data.choices[0]?.message?.content ?? '';
  }
  if (provider === 'anthropic') {
    const res = await axios.post<AnthropicResponse>(
      'https://api.anthropic.com/v1/messages',
      { model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, timeout: 45000 }
    );
    return res.data.content[0]?.text ?? '';
  }
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await axios.post<GeminiResponse>(
      url,
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1200 } },
      { headers: { 'Content-Type': 'application/json' }, timeout: 45000 }
    );
    return res.data.candidates[0]?.content?.parts[0]?.text ?? '';
  }
  return '';
}

function buildPrompt(items: FeedItem[], windowHours: number, customInstructions?: string): string {
  const analyzed = items.filter((i) => i.ai_analyzed && i.summary);
  const lines = analyzed.slice(0, 30).map((item, idx) => {
    const parts = [`${idx + 1}. [${item.urgency?.toUpperCase() ?? 'UNKNOWN'}] ${item.title}`];
    if (item.summary) parts.push(`   ${item.summary}`);
    if (item.threat_actor?.length) parts.push(`   Threat Actors: ${item.threat_actor.join(', ')}`);
    if (item.target_country?.length) parts.push(`   Targeted Nations: ${item.target_country.join(', ')}`);
    if (item.target_industry?.length) parts.push(`   Sectors at Risk: ${item.target_industry.join(', ')}`);
    return parts.join('\n');
  });

  const rawLines = items.filter((i) => !i.ai_analyzed).slice(0, 10).map((item) => `- ${item.title}`);

  const defaultInstructions = `You are a senior threat intelligence analyst preparing a concise executive briefing for C-suite leadership.

Based on the following ${analyzed.length} AI-analyzed cybersecurity intelligence items from the last ${windowHours} hours${rawLines.length ? ` (plus ${rawLines.length} additional unanalyzed items)` : ''}, write a 3–4 paragraph executive brief.

Structure your response as:
1. **Threat Landscape Overview** – Overall posture and volume of threats observed
2. **Critical & High-Priority Threats** – The most urgent items requiring immediate executive attention
3. **Sectors & Nations at Risk** – Key verticals and geographies under pressure
4. **Strategic Posture & Recommendations** – Concise, actionable guidance for leadership

Tone: Authoritative, direct, and jargon-free. Suitable for a CISO briefing a board of directors.`;

  const systemInstructions = customInstructions?.trim() || defaultInstructions;

  return `${systemInstructions}

---
INTELLIGENCE ITEMS:
${lines.join('\n\n')}
${rawLines.length ? `\nADDITIONAL HEADLINES (not yet AI-analyzed):\n${rawLines.join('\n')}` : ''}
---

Write the executive brief now:`;
}

export default function ExecutiveSummary({ items, windowHours }: { items: FeedItem[]; windowHours: number }): React.ReactElement {
  const { ai, customPromptSummary } = useSettingsStore();
  const [brief, setBrief] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const hasAI = !!(ai.apiKey && ai.provider && ai.model);

  const handleGenerate = async () => {
    if (!hasAI || loading) return;
    setLoading(true);
    setError('');
    try {
      const prompt = buildPrompt(items, windowHours, customPromptSummary || undefined);
      const result = await callAI(prompt, ai.provider, ai.apiKey, ai.model, ai.baseUrl);
      setBrief(result);
      setGeneratedAt(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate brief';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Format markdown-like bold and paragraphs for display
  function renderBrief(text: string): React.ReactElement[] {
    return text.split('\n\n').map((para, i) => {
      // Replace **text** with bold spans
      const parts = para.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-sm text-text-primary font-sans leading-relaxed mb-3 last:mb-0">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-accent/10 rounded-lg">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-text-primary">Executive Brief</h2>
            <p className="text-[11px] text-text-secondary font-sans">
              AI-generated intelligence summary for leadership
              {generatedAt && (
                <span className="ml-2 opacity-60">
                  · Generated at {generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleGenerate()}
          disabled={loading || !hasAI}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed font-sans"
          title={!hasAI ? 'Configure an AI provider in Settings first' : undefined}
        >
          {loading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Generating…</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{brief ? 'Regenerate' : 'Generate Brief'}</span>
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        {loading && (
          <div className="space-y-2">
            {[100, 90, 95, 80].map((w, i) => (
              <div key={i} className={`h-3.5 bg-border rounded animate-pulse`} style={{ width: `${w}%` }} />
            ))}
            <div className="h-3.5 bg-border rounded animate-pulse w-2/3 mt-4" />
            {[85, 92, 78].map((w, i) => (
              <div key={i} className={`h-3.5 bg-border rounded animate-pulse`} style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {!loading && brief && renderBrief(brief)}
        {!loading && !brief && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {hasAI ? (
              <>
                <svg className="w-10 h-10 text-text-secondary mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-text-secondary font-sans">Click <strong>Generate Brief</strong> to produce an AI executive summary of the current threat landscape.</p>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 text-text-secondary mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm text-text-secondary font-sans">Configure an <strong>AI provider</strong> in Settings to enable the executive brief.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
