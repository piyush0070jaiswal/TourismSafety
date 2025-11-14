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

export default function IncidentsSeverityChip({ apiBase, status = [], severity = [], bbox, since }: Props) {
  const [counts, setCounts] = React.useState<{ low: number; medium: number; high: number; critical: number } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams();
        status.forEach((s) => qs.append('status', s));
        severity.forEach((s) => qs.append('severity', s));
        if (bbox) qs.set('bbox', bbox);
        const ca = computeCreatedAfter(since);
        if (ca) qs.set('created_after', ca);
        const url = `${apiBase.replace(/\/$/, '')}/incidents/stats${qs.toString() ? `?${qs.toString()}` : ''}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        const bySeverity = json?.bySeverity || {};
        const c = {
          low: Number(bySeverity.low || 0),
          medium: Number(bySeverity.medium || 0),
          high: Number(bySeverity.high || 0),
          critical: Number(bySeverity.critical || 0),
        };
        if (!cancelled) setCounts(c);
      } catch {
        if (!cancelled) setCounts({ low: 0, medium: 0, high: 0, critical: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, status.join(','), severity.join(','), bbox, since]);

  const content = loading || !counts
    ? 'L:– M:– H:– C:–'
    : `L:${counts.low} M:${counts.medium} H:${counts.high} C:${counts.critical}`;

  return (
    <span
      title="Severity summary (current filters)"
      style={{
        padding: '4px 8px',
        borderRadius: 9999,
        border: '1px solid var(--color-border, #e5e7eb)',
        background: 'var(--color-surface, #ffffff)',
        color: 'var(--color-on-surface, #111827)',
        fontSize: 12,
      }}
    >
      {content}
    </span>
  );
}
