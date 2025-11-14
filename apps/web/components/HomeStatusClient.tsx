'use client';

import { useEffect, useState } from 'react';

type Stat = 'checking' | 'up' | 'down';

const dotStyle = (status: Stat) => {
  const color = status === 'up' ? 'var(--color-success)' : status === 'down' ? 'var(--color-error)' : 'var(--color-secondary)';
  return { width: 8, height: 8, borderRadius: 9999, background: color } as const;
};

const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '2px 8px',
  borderRadius: 9999,
  background: 'var(--chip-bg)',
  color: 'var(--color-on-surface)',
  fontSize: 12,
} as const;

export default function HomeStatusClient() {
  const [web, setWeb] = useState<Stat>('checking');
  const [api, setApi] = useState<Stat>('checking');
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let cancelled = false;

    const withTimeout = (url: string, ms = 1500) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), ms);
      return fetch(url, { cache: 'no-store', signal: controller.signal })
        .finally(() => clearTimeout(t));
    };

    withTimeout('/healthz').then(r => {
      if (!cancelled) setWeb(r.ok ? 'up' : 'down');
    }).catch(() => !cancelled && setWeb('down'));

    withTimeout(`${base}/healthz`).then(r => {
      if (!cancelled) setApi(r.ok ? 'up' : 'down');
    }).catch(() => !cancelled && setApi('down'));

    return () => { cancelled = true; };
  }, [base]);

  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={pillStyle}><span style={dotStyle(web)} /> WEB</span>
      <span style={pillStyle}><span style={dotStyle(api)} /> API</span>
      <span style={{ color: '#6b7280', fontSize: 12 }}>
        Live status · auto-check on load
      </span>
    </div>
  );
}
