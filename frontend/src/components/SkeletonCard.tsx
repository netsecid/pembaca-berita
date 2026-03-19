import React from 'react';

export default function SkeletonCard(): React.ReactElement {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 bg-border rounded" />
        <div className="h-3 bg-border rounded w-24" />
        <div className="h-3 bg-border rounded w-16 ml-auto" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-border rounded w-full" />
        <div className="h-4 bg-border rounded w-3/4" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-border rounded w-full" />
        <div className="h-3 bg-border rounded w-5/6" />
        <div className="h-3 bg-border rounded w-4/6" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-border rounded-full w-16" />
        <div className="h-5 bg-border rounded-full w-20" />
        <div className="h-5 bg-border rounded-full w-14" />
      </div>
    </div>
  );
}
