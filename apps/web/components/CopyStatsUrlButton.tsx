"use client";

import React from 'react';

type Props = {
  apiBase: string;
  status?: string[];
  severity?: string[];
  bbox?: string;
  since?: string; // quick range
};

function computeCreatedAfter(label?: string): string | undefined {
  if (!label) return undefined;
  const map: Record<string, number> = { '1h': 3600e3, '24h': 86400e3, '7d': 604800e3 };
  const ms = map[label];
  if (!ms) return undefined;
  return new Date(Date.now() - ms).toISOString();
}

export default function CopyStatsUrlButton({ apiBase, status = [], severity = [], bbox, since }: Props) {
  const [copied, setCopied] = React.useState(false);
  const url = React.useMemo(() => {
    const qs = new URLSearchParams();
    status.forEach((s) => qs.append('status', s));
    severity.forEach((s) => qs.append('severity', s));
    if (bbox) qs.set('bbox', bbox);
    const ca = computeCreatedAfter(since);
    if (ca) qs.set('created_after', ca);
    const q = qs.toString();
    return `${apiBase.replace(/\/$/, '')}/incidents/stats${q ? `?${q}` : ''}`;
  }, [apiBase, status.join(','), severity.join(','), bbox, since]);

  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
      }}
      title="Copy stats URL"
      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: copied ? '#dcfce7' : '#ffffff', color: '#111827', fontSize: 12 }}
    >
      {copied ? 'Copied Stats' : 'Copy Stats URL'}
    </button>
  );
}
