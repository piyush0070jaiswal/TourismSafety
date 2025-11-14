"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value?: { lat: number; lon: number } | null;
  onChange: (v: { lat: number; lon: number } | null) => void;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LocationPicker({ value, onChange }: Props) {
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(value ?? null);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [reports, setReports] = useState<Array<{ id: string; lat: number; lon: number; severity?: string; type?: string; createdAt?: string }>>([]);

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const dotsLayerRef = useRef<any | null>(null);
  const pinLayerRef = useRef<any | null>(null);

  const colors = useMemo(() => ({
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#fbbf24',
    low: '#10b981',
  } as const), []);

  // keep local state in sync with prop
  useEffect(() => { setLoc(value ?? null); }, [value]);

  // Initialize Leaflet map once
  useEffect(() => {
    let disposed = false;
    (async () => {
      if (!mapEl.current || mapRef.current) return;
      const leaflet = await import('leaflet');
      const L: any = (leaflet as any).default ?? leaflet;

      if ((L as any).Icon?.Default?.mergeOptions) {
        (L as any).Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      }

      const centerIndia: [number, number] = [20.5937, 78.9629];
      const map = L.map(mapEl.current, { center: centerIndia, zoom: 4, worldCopyJump: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      L.control.scale({ metric: true, imperial: false }).addTo(map);

      // click to choose location
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng || {};
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        const next = { lat, lon: lng };
        setLoc(next);
        onChange(next);
      });

      mapRef.current = map;
      if (disposed) {
        try { map.remove(); } catch {}
      }
    })();
    return () => {
      disposed = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, [onChange]);

  // Fetch incidents/reports to plot as dots
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams();
        qs.set('limit', '200');
        const res = await fetch(`${API_BASE}/incidents?${qs.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const parsed = items.map((it: any) => {
          const lat = typeof it?.lat === 'number' ? it.lat : (Array.isArray(it?.coords) ? it.coords[1] : undefined);
          const lon = typeof it?.lon === 'number' ? it.lon : (Array.isArray(it?.coords) ? it.coords[0] : undefined);
          return (typeof lat === 'number' && typeof lon === 'number') ? ({ id: String(it.id ?? `${lat},${lon}`), lat, lon, severity: it.severity, type: it.type, createdAt: it.createdAt ?? it.created_at }) : null;
        }).filter(Boolean) as any[];
        if (!cancelled) setReports(parsed);
      } catch {
        if (!cancelled) setReports([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Draw reports layer (dots)
  useEffect(() => {
    (async () => {
      if (!mapRef.current) return;
      const leaflet = await import('leaflet');
      const L: any = (leaflet as any).default ?? leaflet;
      if (dotsLayerRef.current) { try { dotsLayerRef.current.remove(); } catch {} dotsLayerRef.current = null; }
      const layer = L.layerGroup();
      reports.forEach((r) => {
        if (r.lat < -90 || r.lat > 90 || r.lon < -180 || r.lon > 180) return;
        const color = (colors as any)[r.severity ?? ''] || '#0ea5a4';
        L.circleMarker([r.lat, r.lon], { radius: 4, color: '#111827', weight: 1, fillColor: color, fillOpacity: 0.9 })
          .bindPopup(`<div style="font-size:12px"><strong>${r.type ?? 'report'}</strong> • ${r.severity ?? '-'}<br/>${r.lat.toFixed(3)}, ${r.lon.toFixed(3)}</div>`)
          .addTo(layer);
      });
      layer.addTo(mapRef.current);
      dotsLayerRef.current = layer;
    })();
  }, [reports, colors]);

  // Draw selected location pin
  useEffect(() => {
    (async () => {
      if (!mapRef.current) return;
      const leaflet = await import('leaflet');
      const L: any = (leaflet as any).default ?? leaflet;
      if (pinLayerRef.current) { try { pinLayerRef.current.remove(); } catch {} pinLayerRef.current = null; }
      const layer = L.layerGroup();
      if (loc) {
        L.circleMarker([loc.lat, loc.lon], { radius: 6, color: '#111827', weight: 1, fillColor: '#ef4444', fillOpacity: 0.95 })
          .bindPopup(`<div style="font-size:12px">Selected<br/>${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)}</div>`)
          .addTo(layer);
        // pan to selection for user feedback
        try { mapRef.current.setView([loc.lat, loc.lon], Math.max(mapRef.current.getZoom?.() ?? 4, 5), { animate: true }); } catch {}
      }
      layer.addTo(mapRef.current);
      pinLayerRef.current = layer;
    })();
  }, [loc]);

  const useMyLocation = () => {
    if (locating) return;
    setStatus(null);
    setLocating(true);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const next = { lat: 19.076, lon: 72.8777 };
      setLoc(next); onChange(next);
      setStatus('Geolocation not available. Using fallback.'); setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLoc(next); onChange(next);
        setStatus('Location set from device'); setLocating(false);
      },
      () => {
        const next = { lat: 19.076, lon: 72.8777 };
        setLoc(next); onChange(next);
        setStatus('Permission denied or unavailable. Using fallback.'); setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    );
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={useMyLocation} disabled={locating} style={{ padding: '6px 10px', background: locating ? '#6b7280' : '#111827', color: 'white', borderRadius: 6, border: 'none', cursor: locating ? 'not-allowed' : 'pointer', opacity: locating ? 0.8 : 1 }}>
          {locating ? 'Locating…' : 'Use my location'}
        </button>
        {loc && (
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>lat: {loc.lat.toFixed(5)}, lon: {loc.lon.toFixed(5)}</span>
        )}
        {!loc && <span style={{ fontSize: 12, color: '#6b7280' }}>No location selected</span>}
      </div>
      <div ref={mapEl} style={{ width: '100%', height: 300, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }} />
      <div style={{ fontSize: 12, color: '#6b7280' }}>Tip: Click the map to set location, or use the button to auto-detect.</div>
      {status && <div style={{ fontSize: 12, color: '#6b7280' }}>{status}</div>}
    </div>
  );
}
