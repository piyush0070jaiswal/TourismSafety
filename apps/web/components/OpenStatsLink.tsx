"use client";

import React from 'react';

type Props = {
  apiBase: string;
  status?: string[];
  severity?: string[];
  bbox?: string;
  since?: string;
};

function computeCreatedAfter(label?: string): string | undefined {
  if (!label) return undefined;
  const map: Record<string, number> = { '1h': 3600e3, '24h': 86400e3, '7d': 604800e3 };
  const ms = map[label];
  if (!ms) return undefined;
  return new Date(Date.now() - ms).toISOString();
}

export default function OpenStatsLink({ apiBase, status = [], severity = [], bbox, since }: Props) {
  const href = React.useMemo(() => {
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
    <a href={href} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12 }} title="Open stats JSON in new tab">
      Open Stats
    </a>
  );
}
