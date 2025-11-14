"use client";

import React from 'react';

// A tiny local preset helper; persists in localStorage only.
// Key shape: [{ name, status[], severity[], bbox?, since?, limit?, sort? }]

type Props = {
  status: string[];
  severity: string[];
  bbox?: string;
  since?: string;
  limit?: number;
  sort?: 'asc' | 'desc';
};

const LS_KEY = 'incident_filter_presets_v1';

export default function FilterPresets({ status, severity, bbox, since, limit, sort }: Props) {
  const [presets, setPresets] = React.useState<Array<any>>([]);
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setPresets(JSON.parse(raw));
    } catch {}
  }, []);

  const savePresets = (list: any[]) => {
    setPresets(list);
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
  };

  const current = { status, severity, bbox, since, limit, sort };

  const makeUrl = (p: any) => {
    const qp = new URLSearchParams();
    (p.status || []).forEach((s: string) => qp.append('status', s));
    (p.severity || []).forEach((s: string) => qp.append('severity', s));
    if (p.bbox) qp.set('bbox', p.bbox);
    if (p.since) qp.set('since', p.since);
    if (p.limit) qp.set('limit', String(p.limit));
    if (p.sort) qp.set('sort', p.sort);
    const qs = qp.toString();
    return `/dashboard/incidents${qs ? `?${qs}` : ''}`;
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Preset name"
        style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
      />
      <button
        type="button"
        onClick={() => {
          if (!name.trim()) return;
          const next = [{ name: name.trim(), ...current }, ...presets].slice(0, 12);
          savePresets(next);
          setName('');
        }}
        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#ffffff', fontSize: 12 }}
        title="Save current filters as preset"
      >
        Save preset
      </button>
      {presets.length > 0 && <span style={{ color: '#6b7280', fontSize: 12 }}>Presets:</span>}
      {presets.map((p) => (
        <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 6px', borderRadius: 9999, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
          <a href={makeUrl(p)} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12 }}>{p.name}</a>
          <button
            type="button"
            onClick={() => savePresets(presets.filter((x) => x.name !== p.name))}
            style={{ border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}
            title="Delete preset"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
