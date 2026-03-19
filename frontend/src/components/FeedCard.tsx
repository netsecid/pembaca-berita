import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import type { FeedItem } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { applyKeywordMatch } from '../utils/keywordMatcher';

interface FeedCardProps {
  item: FeedItem;
}

const URGENCY_COLORS: Record<string, string> = {
  critical: 'border-l-urgency-critical',
  high: 'border-l-urgency-high',
  medium: 'border-l-urgency-medium',
  low: 'border-l-urgency-low',
};

const URGENCY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-300 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-300 border-green-500/20',
  informational: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
};

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function FaviconImage({ url }: { url: string }): React.ReactElement {
  const domain = getDomainFromUrl(url);
  const [imgError, setImgError] = useState(false);

  if (!domain || imgError) {
    return (
      <div className="w-4 h-4 rounded bg-border flex items-center justify-center">
        <svg className="w-2.5 h-2.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-.586-1.414l-4.5-4.5A2 2 0 0014.5 3H7" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
      alt=""
      width={16}
      height={16}
      className="w-4 h-4 rounded"
      onError={() => setImgError(true)}
    />
  );
}

function Chip({ label, className }: { label: string; className?: string }): React.ReactElement {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', className)}>
      {label}
    </span>
  );
}

export default function FeedCard({ item }: FeedCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const { customKeywords } = useSettingsStore();

  const { isKeywordMatch, matchedKeywords, boostedUrgency, boostedSeverity } = applyKeywordMatch(item, customKeywords);

  const displayUrgency = boostedUrgency ?? item.urgency;
  const displaySeverity = boostedSeverity ?? item.severity;

  const borderColor = displayUrgency ? URGENCY_COLORS[displayUrgency] ?? 'border-l-border' : 'border-l-border';

  const publishedAt = formatDistanceToNow(new Date(item.published_at), { addSuffix: true });

  const previewText = item.summary
    ? item.summary.substring(0, 150)
    : item.description?.substring(0, 150) ?? '';

  return (
    <article
      className={clsx(
        'bg-surface border border-border rounded-lg pl-4 pr-4 pt-4 pb-4 border-l-4 cursor-pointer transition-all duration-200 hover:border-border hover:bg-surface/80',
        borderColor
      )}
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <FaviconImage url={item.link} />
        <span className="text-xs text-text-secondary font-sans font-medium">{item.source_name}</span>
        <span className="text-xs text-text-secondary ml-auto font-sans">{publishedAt}</span>
        <svg
          className={clsx('w-3 h-3 text-text-secondary transition-transform duration-200 flex-shrink-0', expanded && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Title */}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm font-semibold text-text-primary hover:text-accent transition-colors mb-2 leading-snug font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {item.title}
      </a>

      {/* Keyword match banner */}
      {isKeywordMatch && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
          <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-[10px] text-yellow-400 font-semibold">Keyword match:</span>
          <div className="flex flex-wrap gap-1">
            {matchedKeywords.map((kw) => (
              <span key={kw} className="text-[10px] text-yellow-300 bg-yellow-500/10 px-1.5 py-0.5 rounded font-mono border border-yellow-500/20">
                {kw}
              </span>
            ))}
          </div>
          {item.urgency && item.urgency !== displayUrgency && (
            <span className="ml-auto text-[10px] text-yellow-400 opacity-70 flex-shrink-0">↑ urgency boosted</span>
          )}
        </div>
      )}

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {displayUrgency && (
          <Chip
            label={displayUrgency.toUpperCase()}
            className={clsx('text-[10px] font-bold', URGENCY_BADGE[displayUrgency])}
          />
        )}
        {displaySeverity && (
          <Chip
            label={displaySeverity}
            className={clsx('text-[10px]', SEVERITY_BADGE[displaySeverity])}
          />
        )}
        {item.category && (
          <Chip
            label={item.category}
            className="text-[10px] bg-accent/10 text-accent border-accent/20"
          />
        )}
      </div>

      {/* Collapsed: preview text */}
      {!expanded && (
        <p className="text-xs text-text-secondary font-sans leading-relaxed line-clamp-2">
          {previewText}
          {previewText.length >= 150 && '...'}
        </p>
      )}

      {/* Expanded: full AI analysis */}
      {expanded && (
        <div className="space-y-3 mt-2" onClick={(e) => e.stopPropagation()}>
          {item.ai_analyzed && item.summary ? (
            <>
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm text-text-primary font-sans leading-relaxed">{item.summary}</p>
              </div>

              {item.threat_actor && item.threat_actor.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Threat Actors</p>
                  <div className="flex flex-wrap gap-1">
                    {item.threat_actor.map((actor) => (
                      <Chip
                        key={actor}
                        label={actor}
                        className="text-[10px] bg-red-500/10 text-red-300 border-red-500/20"
                      />
                    ))}
                  </div>
                </div>
              )}

              {item.target_industry && item.target_industry.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Target Industries</p>
                  <div className="flex flex-wrap gap-1">
                    {item.target_industry.map((industry) => (
                      <Chip
                        key={industry}
                        label={industry}
                        className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20"
                      />
                    ))}
                  </div>
                </div>
              )}

              {item.target_country && item.target_country.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Target Countries</p>
                  <div className="flex flex-wrap gap-1">
                    {item.target_country.map((country) => (
                      <Chip
                        key={country}
                        label={country}
                        className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/20"
                      />
                    ))}
                  </div>
                </div>
              )}

              {item.ttps && item.ttps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">TTPs (MITRE ATT&CK)</p>
                  <div className="flex flex-wrap gap-1">
                    {item.ttps.map((ttp) => (
                      <span
                        key={ttp}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-border text-text-secondary border border-border/60"
                      >
                        {ttp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.cve_ids && item.cve_ids.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">CVE IDs</p>
                  <div className="flex flex-wrap gap-1">
                    {item.cve_ids.map((cve) => (
                      <span
                        key={cve}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-300 border border-red-500/20"
                      >
                        {cve}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.affected_products && item.affected_products.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Affected Products</p>
                  <div className="flex flex-wrap gap-1">
                    {item.affected_products.map((product) => (
                      <Chip
                        key={product}
                        label={product}
                        className="text-[10px] bg-orange-500/10 text-orange-300 border-orange-500/20"
                      />
                    ))}
                  </div>
                </div>
              )}

              {item.malware_families && item.malware_families.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Malware Families</p>
                  <div className="flex flex-wrap gap-1">
                    {item.malware_families.map((malware) => (
                      <Chip
                        key={malware}
                        label={malware}
                        className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30 font-mono"
                      />
                    ))}
                  </div>
                </div>
              )}

              {item.tags && item.tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={`#${tag}`}
                        className="text-[10px] bg-surface text-text-secondary border-border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              {item.description && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-text-primary font-sans leading-relaxed">{item.description}</p>
                </div>
              )}
              {!item.ai_analyzed && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>No AI analysis — configure an AI provider in Settings to enable intelligence enrichment</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
