import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import type { FeedItem } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { applyKeywordMatch } from '../utils/keywordMatcher';

interface FeedCardProps {
  item: FeedItem;
}

const URGENCY_BORDER: Record<string, string> = {
  critical: 'border-l-urgency-critical',
  high: 'border-l-urgency-high',
  medium: 'border-l-urgency-medium',
  low: 'border-l-urgency-low',
};

const URGENCY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/25',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  low: 'bg-green-500/15 text-green-400 border-green-500/25',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-300 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-300 border-green-500/20',
  informational: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
};

function getDomainFromUrl(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

function FaviconImage({ url }: { url: string }): React.ReactElement {
  const domain = getDomainFromUrl(url);
  const [imgError, setImgError] = useState(false);
  if (!domain || imgError) {
    return (
      <div className="w-3.5 h-3.5 rounded-sm bg-border flex items-center justify-center flex-shrink-0">
        <svg className="w-2 h-2 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
      alt="" width={14} height={14}
      className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
      onError={() => setImgError(true)}
    />
  );
}

function Chip({ label, className }: { label: string; className?: string }): React.ReactElement {
  return (
    <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border leading-none', className)}>
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
  const borderColor = displayUrgency ? URGENCY_BORDER[displayUrgency] ?? 'border-l-border' : 'border-l-border';
  const publishedAt = formatDistanceToNow(new Date(item.published_at), { addSuffix: true });
  const previewText = item.summary ?? item.description ?? '';

  return (
    <article
      className={clsx(
        'bg-surface border border-border rounded-lg border-l-4 cursor-pointer',
        'transition-all duration-150 hover:border-border/80 hover:shadow-sm',
        borderColor,
        isKeywordMatch && 'ring-1 ring-yellow-500/20'
      )}
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Card body */}
      <div className="px-4 pt-3 pb-3">
        {/* Source row */}
        <div className="flex items-center gap-1.5 mb-2">
          <FaviconImage url={item.link} />
          <span className="text-[11px] text-text-secondary font-sans font-medium truncate">{item.source_name}</span>
          <span className="text-text-secondary/40 text-[11px]">·</span>
          <span className="text-[11px] text-text-secondary/70 font-sans whitespace-nowrap">{publishedAt}</span>
          {isKeywordMatch && (
            <div className="ml-auto flex items-center gap-1">
              <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {matchedKeywords.slice(0, 2).map((kw) => (
                <span key={kw} className="text-[10px] text-yellow-300 bg-yellow-500/10 px-1 py-0.5 rounded font-mono border border-yellow-500/20 leading-none">
                  {kw}
                </span>
              ))}
              {matchedKeywords.length > 2 && (
                <span className="text-[10px] text-yellow-400">+{matchedKeywords.length - 2}</span>
              )}
            </div>
          )}
          {!isKeywordMatch && (
            <svg
              className={clsx('w-3 h-3 text-text-secondary/40 ml-auto transition-transform duration-200 flex-shrink-0', expanded && 'rotate-180')}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
          {isKeywordMatch && (
            <svg
              className={clsx('w-3 h-3 text-text-secondary/40 transition-transform duration-200 flex-shrink-0', expanded && 'rotate-180')}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>

        {/* Title */}
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-semibold text-text-primary hover:text-accent transition-colors leading-snug mb-2 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {item.title}
        </a>

        {/* Preview text */}
        {!expanded && previewText && (
          <p className="text-xs text-text-secondary font-sans leading-relaxed line-clamp-2 mb-2.5">
            {previewText.substring(0, 180)}{previewText.length > 180 && '…'}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1">
          {displayUrgency && (
            <Chip label={displayUrgency.toUpperCase()} className={clsx('font-bold', URGENCY_BADGE[displayUrgency])} />
          )}
          {displaySeverity && displaySeverity !== displayUrgency && (
            <Chip label={displaySeverity} className={SEVERITY_BADGE[displaySeverity] ?? ''} />
          )}
          {item.category && (
            <Chip label={item.category} className="bg-accent/10 text-accent border-accent/20" />
          )}
          {isKeywordMatch && item.urgency && item.urgency !== displayUrgency && (
            <span className="text-[10px] text-yellow-400/70 font-sans">↑ boosted</span>
          )}
        </div>
      </div>

      {/* Expanded: full AI analysis */}
      {expanded && (
        <div className="border-t border-border px-4 pt-3 pb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          {item.ai_analyzed && item.summary ? (
            <>
              {/* Summary */}
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Summary</p>
                <p className="text-sm text-text-primary font-sans leading-relaxed">{item.summary}</p>
              </div>

              {/* Intelligence grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.threat_actor && item.threat_actor.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Threat Actors</p>
                    <div className="flex flex-wrap gap-1">
                      {item.threat_actor.map((a) => (
                        <Chip key={a} label={a} className="bg-red-500/10 text-red-300 border-red-500/20" />
                      ))}
                    </div>
                  </div>
                )}

                {item.malware_families && item.malware_families.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Malware</p>
                    <div className="flex flex-wrap gap-1">
                      {item.malware_families.map((m) => (
                        <Chip key={m} label={m} className="bg-red-500/10 text-red-300 border-red-500/20 font-mono" />
                      ))}
                    </div>
                  </div>
                )}

                {item.target_country && item.target_country.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Targeted Nations</p>
                    <div className="flex flex-wrap gap-1">
                      {item.target_country.map((c) => (
                        <Chip key={c} label={c} className="bg-blue-500/10 text-blue-300 border-blue-500/20" />
                      ))}
                    </div>
                  </div>
                )}

                {item.target_industry && item.target_industry.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Target Sectors</p>
                    <div className="flex flex-wrap gap-1">
                      {item.target_industry.map((i) => (
                        <Chip key={i} label={i} className="bg-purple-500/10 text-purple-300 border-purple-500/20" />
                      ))}
                    </div>
                  </div>
                )}

                {item.cve_ids && item.cve_ids.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">CVE IDs</p>
                    <div className="flex flex-wrap gap-1">
                      {item.cve_ids.map((cve) => (
                        <span key={cve} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-300 border border-red-500/20 leading-none">
                          {cve}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.affected_products && item.affected_products.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Affected Products</p>
                    <div className="flex flex-wrap gap-1">
                      {item.affected_products.map((p) => (
                        <Chip key={p} label={p} className="bg-orange-500/10 text-orange-300 border-orange-500/20" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {item.ttps && item.ttps.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">TTPs (MITRE ATT&CK)</p>
                  <div className="flex flex-wrap gap-1">
                    {item.ttps.map((ttp) => (
                      <span key={ttp} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-border text-text-secondary border border-border/60 leading-none">
                        {ttp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                  {item.tags.map((tag) => (
                    <Chip key={tag} label={`#${tag}`} className="bg-surface text-text-secondary border-border/60 text-[10px]" />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {item.description && (
                <p className="text-sm text-text-primary font-sans leading-relaxed">{item.description}</p>
              )}
              {!item.ai_analyzed && (
                <p className="text-xs text-text-secondary/60 font-sans flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  No AI analysis — configure an AI provider in Settings
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
