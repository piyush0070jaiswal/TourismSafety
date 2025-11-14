"use client";

import React from 'react';

type Props = {
  apiBase: string;
  status?: string[];
  severity?: string[];
  bbox?: string;
  since?: string; // 1h|24h|7d
};

function computeCreatedAfter(label?: string): string | undefined {
  if (!label) return undefined;
  const map: Record<string, number> = { '1h': 3600e3, '24h': 86400e3, '7d': 604800e3 };
  const ms = map[label];
  if (!ms) return undefined;
  return new Date(Date.now() - ms).toISOString();
}

export default function IncidentsStatsBadge({ apiBase, status = [], severity = [], bbox, since }: Props) {
  const [data, setData] = React.useState<{ total: number; byStatus: Record<string, number>; bySeverity: Record<string, number> } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
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
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, status.join(','), severity.join(','), bbox, since]);

  const content = (() => {
    if (loading) return <span>…</span>;
    if (error || !data) return <span style={{ color: '#b91c1c' }}>stats</span>;
    const open = data.byStatus?.open || 0;
    const triaged = data.byStatus?.triaged || 0;
    const closed = data.byStatus?.closed || 0;
    return <span>{data.total} • O:{open} T:{triaged} C:{closed}</span>;
  })();

  const title = (() => {
    if (!data) return 'Incidents stats (current filters)';
    const sev = data.bySeverity || {};
    const l = sev.low || 0, m = sev.medium || 0, h = sev.high || 0, c = sev.critical || 0;
    return `Incidents stats (current filters)\nSeverity: L:${l} M:${m} H:${h} C:${c}`;
  })();

  return (
    <span
      title={title}
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
