import React from 'react';
import Link from 'next/link';
import CreateTestIncidentButton from '../../../components/CreateTestIncidentButton';
import DashboardExtrasClient from '../../../components/DashboardExtrasClient';
import SeedDemoIncidentsButton from '../../../components/SeedDemoIncidentsButton';
import ExportIncidentsCsvButton from '../../../components/ExportIncidentsCsvButton';
import CopyExportUrlButton from '../../../components/CopyExportUrlButton';
import AutoRefreshToggle from '../../../components/AutoRefreshToggle';
import RefreshNowButton from '../../../components/RefreshNowButton';
import ExportIncidentsJsonButton from '../../../components/ExportIncidentsJsonButton';
import ExportIncidentsGeoJsonButton from '../../../components/ExportIncidentsGeoJsonButton';
import StaticMapPreviewButton from '../../../components/StaticMapPreviewButton';
import IncidentsMapClient from '../../../components/IncidentsMapClient';
import CreatedAt from '../../../components/CreatedAt';
import CopyJsonUrlButton from '../../../components/CopyJsonUrlButton';
import CopyPageUrlButton from '../../../components/CopyPageUrlButton';
import UpdateIncidentStatus from '../../../components/UpdateIncidentStatus';
import IncidentsStatsBadge from '../../../components/IncidentsStatsBadge';
import CopyStatsUrlButton from '../../../components/CopyStatsUrlButton';
import OpenStatsLink from '../../../components/OpenStatsLink';
import IncidentsSeverityChip from '../../../components/IncidentsSeverityChip';
import FilterPresets from '../../../components/FilterPresets';
import SearchIncidentById from '../../../components/SearchIncidentById';
import CopyListCurlButton from '../../../components/CopyListCurlButton';
import CopyStatsCurlButton from '../../../components/CopyStatsCurlButton';
import CopyButton from '../../../components/CopyButton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type IncidentItem = {
  id: string;
  type: string;
  severity: string;
  status: string;
  coords: [number, number];
  createdAt?: string;
  created_at?: string;
  lat?: number;
  lon?: number;
};

async function getIncidents(opts?: { createdBefore?: string; createdAfter?: string; status?: string[]; severity?: string[]; bbox?: string; limit?: number }): Promise<{ base: string; items: IncidentItem[]; nextCursor: string | null; ok: boolean; demo: boolean }>{
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const qs = new URLSearchParams();
    qs.set('limit', String(opts?.limit ?? 20));
    if (opts?.createdBefore) qs.set('created_before', opts.createdBefore);
    if (opts?.createdAfter) qs.set('created_after', opts.createdAfter);
    (opts?.status ?? []).forEach((s) => qs.append('status', s));
    (opts?.severity ?? []).forEach((s) => qs.append('severity', s));
    if (opts?.bbox) qs.set('bbox', opts.bbox);
    const res = await fetch(`${base}/incidents?${qs.toString()}`, { cache: 'no-store' });
    const demoHeader = res.headers?.get?.('x-demo-mode');
    if (!res.ok) return { base, items: [], nextCursor: null, ok: false, demo: demoHeader === 'true' };
    const data = await res.json();
    return { base, items: (data.items ?? []) as IncidentItem[], nextCursor: data.nextCursor ?? null, ok: true, demo: demoHeader === 'true' };
  } catch {
    // Frontend-only demo fallback if API is unreachable (for resilient demos)
    const now = Date.now();
    const demoItems: IncidentItem[] = [
      { id: 'wf-001', type: 'theft', severity: 'medium', status: 'open', coords: [72.8777, 19.076], createdAt: new Date(now - 15 * 60 * 1000).toISOString() },
      { id: 'wf-002', type: 'sos', severity: 'high', status: 'open', coords: [-122.4194, 37.7749], createdAt: new Date(now - 40 * 60 * 1000).toISOString() },
      { id: 'wf-003', type: 'assault', severity: 'critical', status: 'triaged', coords: [-118.2437, 34.0522], createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
      { id: 'wf-004', type: 'fall', severity: 'low', status: 'closed', coords: [139.6503, 35.6762], createdAt: new Date(now - 3.5 * 60 * 60 * 1000).toISOString() },
    ];
    return { base, items: demoItems, nextCursor: null, ok: true, demo: true };
  }
}

export default async function IncidentsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const createdBefore = typeof searchParams?.created_before === 'string' ? searchParams!.created_before : undefined;
  const since = typeof searchParams?.since === 'string' ? searchParams!.since : undefined; // e.g., '1h','24h','7d'
  const statusQ = searchParams?.status;
  const severityQ = searchParams?.severity;
  const bboxQ = typeof searchParams?.bbox === 'string' ? searchParams!.bbox : undefined;
  const limitRaw = typeof searchParams?.limit === 'string' ? parseInt(searchParams!.limit, 10) : undefined;
  const allowed = [20, 50, 100] as const;
  const limit = allowed.includes(limitRaw as any) ? (limitRaw as 20|50|100) : 20;
  const sort = typeof searchParams?.sort === 'string' && (searchParams!.sort === 'asc' || searchParams!.sort === 'desc') ? searchParams!.sort : 'desc';
  const status = Array.isArray(statusQ) ? statusQ as string[] : (typeof statusQ === 'string' ? [statusQ] : []);
  const severity = Array.isArray(severityQ) ? severityQ as string[] : (typeof severityQ === 'string' ? [severityQ] : []);
  const computeCreatedAfter = (label?: string) => {
    if (!label) return undefined;
    const now = Date.now();
    const map: Record<string, number> = { '1h': 60*60*1000, '24h': 24*60*60*1000, '7d': 7*24*60*60*1000 };
    const ms = map[label];
    if (!ms) return undefined;
    const dt = new Date(now - ms);
    return dt.toISOString();
  };
  const createdAfter = computeCreatedAfter(since);
  const { base, items: rawItems, nextCursor, ok, demo } = await getIncidents({ createdBefore, createdAfter, status, severity, bbox: bboxQ, limit });
  const items = sort === 'asc' ? [...rawItems].reverse() : rawItems;
  const makeUrl = (params: Record<string, string | string[] | undefined>, dropCursor = true) => {
    const u = new URL('http://dummy');
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((vv) => qp.append(k, vv));
      else if (typeof v === 'string') qp.set(k, v);
    });
    qp.set('limit', String(limit));
    if (!dropCursor && createdBefore) qp.set('created_before', createdBefore);
    const qs = qp.toString();
    return `/dashboard/incidents${qs ? `?${qs}` : ''}`;
  };
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  const isActive = (list: string[], value: string) => list.includes(value);
  const activeChips = [
    ...status.map((s) => ({ label: `status:${s}`, key: `s:${s}`, onUrl: makeUrl({ status: status.filter((x) => x !== s), severity, bbox: bboxQ, since }, true) })),
    ...severity.map((s) => ({ label: `severity:${s}`, key: `v:${s}`, onUrl: makeUrl({ status, severity: severity.filter((x) => x !== s), bbox: bboxQ, since }, true) })),
    ...(bboxQ ? [{ label: `area:${bboxQ}`, key: `b:${bboxQ}`, onUrl: makeUrl({ status, severity, since }, true) }] : []),
    ...(since ? [{ label: `since:${since}`, key: `t:${since}`, onUrl: makeUrl({ status, severity, bbox: bboxQ }, true) }] : []),
  ];
  const severityCounts = items.reduce((acc: Record<string, number>, it) => { acc[it.severity] = (acc[it.severity]||0)+1; return acc; }, {} as Record<string, number>);
  const formatAge = (iso?: string) => {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };
  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      {/* Hero Header Section */}
      <section className="card" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-primary) 4%, var(--color-surface)) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', margin: 0, color: 'var(--color-on-surface)' }}>
              Live Incidents Dashboard
            </h1>
            <p className="text-muted" style={{ marginTop: 6, fontSize: 16 }}>
              Real-time monitoring and incident management
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <IncidentsStatsBadge apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} />
            <IncidentsSeverityChip apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} />
            {demo && (
              <span className="badge" style={{ padding: '6px 12px', background: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe', fontSize: 13, fontWeight: 600 }}>
                DEMO MODE
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions Toolbar */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-on-surface)' }}>Quick Actions</h3>
        </div>
        <div style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <CreateTestIncidentButton apiBase={API_BASE} />
          {demo && <SeedDemoIncidentsButton apiBase={API_BASE} count={10} />}
          <div style={{ width: '1px', height: 24, background: 'var(--color-border)', margin: '0 4px' }} />
          <FilterPresets status={status} severity={severity} bbox={bboxQ} since={since} limit={limit} sort={sort} />
          <SearchIncidentById />
          <div style={{ width: '1px', height: 24, background: 'var(--color-border)', margin: '0 4px' }} />
          <AutoRefreshToggle />
          <RefreshNowButton />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <ExportIncidentsCsvButton apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} />
            <ExportIncidentsJsonButton apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} limit={limit} />
            <ExportIncidentsGeoJsonButton apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} limit={limit} />
            <CopyExportUrlButton apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} />
            <CopyJsonUrlButton apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} limit={limit} />
            <CopyListCurlButton apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} limit={limit} />
            <CopyPageUrlButton />
            <CopyStatsUrlButton apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} />
            <OpenStatsLink apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} />
            <CopyStatsCurlButton apiBase={API_BASE} status={status} severity={severity} bbox={bboxQ} since={since} />
            <StaticMapPreviewButton items={items.map((it: any) => ({ id: it.id, coords: Array.isArray(it.coords) ? it.coords : [it.lon ?? 0, it.lat ?? 0], severity: it.severity }))} />
          </div>
        </div>
      </section>

      {/* Interactive Map Overview */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-on-surface)' }}>Geographic Overview</h3>
          <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 0 0' }}>Click on map to filter by area</p>
        </div>
        <div style={{ padding: 16 }}>
          <IncidentsMapClient
            items={items.map((it: any) => ({
              id: it.id,
              type: it.type,
              severity: it.severity,
              status: it.status,
              coords: Array.isArray(it.coords) ? it.coords : ([it.lon ?? 0, it.lat ?? 0] as [number, number]),
              createdAt: (it.createdAt ?? it.created_at ?? new Date().toISOString()) as string,
            }))}
            status={status}
            severity={severity}
            since={since}
          />
        </div>
      </section>

      {/* API error banner (non-blocking) */}
      {!ok && (
        <section className="card" style={{ background: '#fff7ed', borderColor: '#fdba74', color: '#7c2d12', padding: 16, marginBottom: 20, border: '1px solid #fdba74' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>⚠️</div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>API Connection Issue</div>
              <div style={{ fontSize: 14 }}>Could not reach API. Showing zero results. Try again or use demo seed if available.</div>
            </div>
          </div>
        </section>
      )}

      {/* Advanced Filters Panel */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-on-surface)' }}>Filters & Search</h3>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 16 }}>
          {/* Status Filter Row */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--color-on-surface)', fontSize: 14, fontWeight: 600, minWidth: 80 }}>Status</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {["open","triaged","closed"].map((s) => (
                <a
                  key={`st-${s}`}
                  href={makeUrl({ status: toggle(status, s), severity, bbox: bboxQ, since }, true)}
                  className={`chip ${isActive(status, s) ? 'chip--active' : ''}`}
                  style={{
                    padding: '8px 14px',
                    textDecoration: 'none',
                    textTransform: 'capitalize',
                    fontWeight: isActive(status, s) ? 600 : 400,
                    background: isActive(status, s) 
                      ? 'color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))' 
                      : 'var(--color-surface)',
                    color: isActive(status, s) ? 'var(--color-on-surface)' : 'var(--color-muted)',
                  }}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Severity Filter Row */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--color-on-surface)', fontSize: 14, fontWeight: 600, minWidth: 80 }}>Severity</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {["low","medium","high","critical"].map((v) => (
                <a
                  key={`sv-${v}`}
                  href={makeUrl({ status, severity: toggle(severity, v), bbox: bboxQ, since }, true)}
                  className="chip"
                  style={{
                    padding: '8px 14px',
                    textDecoration: 'none',
                    textTransform: 'capitalize',
                    fontWeight: isActive(severity, v) ? 600 : 400,
                    background: isActive(severity, v) 
                      ? 'color-mix(in srgb, var(--color-error) 18%, var(--color-surface))' 
                      : 'var(--color-surface)',
                    color: isActive(severity, v) ? 'var(--color-on-surface)' : 'var(--color-muted)',
                  }}
                >
                  {v}
                </a>
              ))}
            </div>
          </div>

          {/* Time Filter Row */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--color-on-surface)', fontSize: 14, fontWeight: 600, minWidth: 80 }}>Time</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {["1h","24h","7d"].map((t) => (
                <a
                  key={`tm-${t}`}
                  href={makeUrl({ status, severity, bbox: bboxQ, since: since === t ? undefined : t }, true)}
                  className="chip"
                  style={{
                    padding: '8px 14px',
                    textDecoration: 'none',
                    fontWeight: since === t ? 600 : 400,
                    background: since === t 
                      ? 'color-mix(in srgb, var(--color-success) 16%, var(--color-surface))' 
                      : 'var(--color-surface)',
                    color: since === t ? 'var(--color-on-surface)' : 'var(--color-muted)',
                  }}
                >
                  Last {t}
                </a>
              ))}
            </div>
          </div>

          {/* Display Options Row */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--color-on-surface)', fontSize: 14, fontWeight: 600, minWidth: 80 }}>Display</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{k:'desc',label:'Newest'},{k:'asc',label:'Oldest'}].map(({k,label}) => (
                  <a
                    key={`so-${k}`}
                    href={makeUrl({ status, severity, bbox: bboxQ, since, limit: String(limit), sort: k }, true)}
                    className="chip"
                    style={{
                      padding: '8px 14px',
                      textDecoration: 'none',
                      fontWeight: sort === k ? 600 : 400,
                      background: sort === k 
                        ? 'color-mix(in srgb, var(--color-accent) 18%, var(--color-surface))' 
                        : 'var(--color-surface)',
                      color: sort === k ? 'var(--color-on-surface)' : 'var(--color-muted)',
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
              <div style={{ width: '1px', height: 20, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                {[20,50,100].map((n) => (
                  <a
                    key={`lm-${n}`}
                    href={makeUrl({ status, severity, bbox: bboxQ, since, limit: String(n) }, true)}
                    className="chip"
                    style={{
                      padding: '6px 10px',
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: limit === n ? 600 : 400,
                      background: limit === n 
                        ? 'color-mix(in srgb, var(--color-secondary) 16%, var(--color-surface))' 
                        : 'var(--color-surface)',
                      color: limit === n ? 'var(--color-on-surface)' : 'var(--color-muted)',
                    }}
                  >
                    {n}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeChips.length > 0 && (
            <div style={{ padding: 12, background: 'color-mix(in srgb, var(--color-info) 6%, var(--color-surface))', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--color-info) 12%, var(--color-border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: 'var(--color-on-surface)', fontSize: 13, fontWeight: 600 }}>Active Filters</span>
                <a href={makeUrl({ }, true)} className="btn btn--ghost" style={{ padding: '4px 8px', fontSize: 11 }}>Clear All</a>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeChips.map((c) => (
                  <a key={c.key} href={c.onUrl} className="chip" style={{ fontSize: 11, textDecoration: 'none', padding: '4px 8px' }}>
                    {c.label} ✕
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Results Summary */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-on-surface)' }}>
                {items.length} {items.length === 1 ? 'Incident' : 'Incidents'}
              </div>
              <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
                {items.length === 0 ? 'No incidents found' : `Showing ${sort === 'desc' ? 'newest' : 'oldest'} first`}
              </div>
            </div>
            {Object.keys(severityCounts).length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {Object.entries(severityCounts).map(([sev, cnt]) => (
                  <div key={`sum-${sev}`} className="chip" style={{ 
                    fontSize: 12, 
                    background: sev === 'critical' ? 'color-mix(in srgb, var(--color-error) 10%, var(--color-surface))' :
                               sev === 'high' ? 'color-mix(in srgb, #f97316 10%, var(--color-surface))' :
                               sev === 'medium' ? 'color-mix(in srgb, var(--color-secondary) 10%, var(--color-surface))' :
                               'color-mix(in srgb, var(--color-success) 10%, var(--color-surface))'
                  }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{sev}</span>
                    <span style={{ fontWeight: 700 }}>{cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 8 }}>No incidents found</h3>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            {activeChips.length > 0 
              ? "No incidents match your current filters. Try adjusting your search criteria."
              : "No incidents have been reported yet."
            }
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            {activeChips.length > 0 && (
              <a href={makeUrl({}, true)} className="btn btn--primary">Clear All Filters</a>
            )}
            <a href={`${API_BASE}/incidents`} target="_blank" className="btn btn--secondary">View Raw JSON</a>
            {demo && <CreateTestIncidentButton apiBase={API_BASE} />}
          </div>
        </section>
      ) : (
        <section>
          <div style={{ display: 'grid', gap: 16 }}>
            {items.map((it: any) => (
              <article key={it.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                        <h4 style={{ 
                          fontSize: 16, 
                          fontWeight: 700, 
                          margin: 0,
                          textTransform: 'capitalize',
                          color: 'var(--color-on-surface)'
                        }}>
                          {it.type ?? 'incident'}
                        </h4>
                        <span className="chip" style={{ 
                          fontSize: 11, 
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          background: it.severity === 'critical' ? 'color-mix(in srgb, var(--color-error) 15%, var(--color-surface))' :
                                     it.severity === 'high' ? 'color-mix(in srgb, #f97316 15%, var(--color-surface))' :
                                     it.severity === 'medium' ? 'color-mix(in srgb, var(--color-secondary) 15%, var(--color-surface))' :
                                     'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))',
                          borderColor: it.severity === 'critical' ? 'color-mix(in srgb, var(--color-error) 25%, var(--color-border))' :
                                      it.severity === 'high' ? 'color-mix(in srgb, #f97316 25%, var(--color-border))' :
                                      it.severity === 'medium' ? 'color-mix(in srgb, var(--color-secondary) 25%, var(--color-border))' :
                                      'color-mix(in srgb, var(--color-success) 25%, var(--color-border))'
                        }}>
                          {it.severity ?? '-'}
                        </span>
                        <span className="chip" style={{ 
                          fontSize: 11,
                          textTransform: 'uppercase', 
                          fontWeight: 600,
                          background: it.status === 'open' ? 'color-mix(in srgb, var(--color-info) 12%, var(--color-surface))' :
                                     it.status === 'triaged' ? 'color-mix(in srgb, var(--color-secondary) 12%, var(--color-surface))' :
                                     'color-mix(in srgb, var(--color-success) 12%, var(--color-surface))'
                        }}>
                          {it.status ?? '-'}
                        </span>
                      </div>
                      
                      {/* ID */}
                      <div style={{ 
                        fontFamily: 'monospace', 
                        fontSize: 12, 
                        color: 'var(--color-muted)', 
                        background: 'color-mix(in srgb, var(--color-muted) 6%, var(--color-surface))',
                        padding: '4px 8px',
                        borderRadius: 6,
                        display: 'inline-block',
                        marginBottom: 12
                      }}>
                        ID: {it.id}
                      </div>
                      
                      {/* Metadata */}
                      {(() => {
                        const created = (it.createdAt ?? it.created_at) as string | undefined;
                        const lon = (it.lon ?? (Array.isArray(it.coords) ? it.coords[0] : undefined)) as number | undefined;
                        const lat = (it.lat ?? (Array.isArray(it.coords) ? it.coords[1] : undefined)) as number | undefined;
                        const parts: React.ReactNode[] = [];
                        
                        if (created) parts.push(
                          <div key="time" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>🕐</span>
                            <CreatedAt iso={created} />
                          </div>
                        );
                        
                        if (typeof lat === 'number' && typeof lon === 'number') {
                          const href = `https://maps.google.com/?q=${lat},${lon}`;
                          parts.push(
                            <div key="location" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 14 }}>📍</span>
                              <a href={href} target="_blank" className="btn btn--ghost" style={{ padding: '2px 6px', fontSize: 12 }}>
                                View on Map
                              </a>
                              <CopyButton value={`${lat},${lon}`} label="Copy" />
                            </div>
                          );
                        }
                        
                        return parts.length > 0 ? (
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
                            {parts}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <Link href={`/dashboard/incidents/${it.id}`} className="btn btn--primary">
                        View Details
                      </Link>
                      {it?.id && (
                        <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 10 }}>
                          <UpdateIncidentStatus apiBase={API_BASE} id={String(it.id)} current={it?.status} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Pagination & Actions */}
      {(nextCursor || items.length > 0) && (
        <section className="card" style={{ marginTop: 20 }}>
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {(() => {
                const qs = new URLSearchParams();
                status.forEach((s) => qs.append('status', s));
                severity.forEach((s) => qs.append('severity', s));
                if (bboxQ) qs.set('bbox', bboxQ);
                if (createdAfter) qs.set('created_after', createdAfter);
                if (limit) qs.set('limit', String(limit));
                const href = `${API_BASE}/incidents${qs.toString() ? `?${qs.toString()}` : ''}`;
                return (
                  <a href={href} className="btn btn--ghost" target="_blank" style={{ fontSize: 12 }}>
                    📄 Raw JSON Data
                  </a>
                );
              })()}
              <span className="text-muted" style={{ fontSize: 12 }}>
                •
              </span>
              <span className="text-muted" style={{ fontSize: 12 }}>
                Showing {items.length} of many results
              </span>
            </div>
            
            {nextCursor && (
              <div>
                {(() => {
                  const qp = new URLSearchParams();
                  status.forEach((s) => qp.append('status', s));
                  severity.forEach((s) => qp.append('severity', s));
                  if (bboxQ) qp.set('bbox', bboxQ);
                  if (since) qp.set('since', since);
                  qp.set('limit', String(limit));
                  qp.set('created_before', nextCursor);
                  const href = `/dashboard/incidents?${qp.toString()}`;
                  return (
                    <a href={href} className="btn btn--primary">
                      Load More Results →
                    </a>
                  );
                })()}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
