"use client";
import React, { useEffect, useMemo, useRef } from 'react';

export type IncidentItem = {
	id: string;
	type: string;
	severity: string;
	status: string;
	// coords is [lon, lat]
	coords: [number, number];
	createdAt: string;
};

type Props = {
	items: IncidentItem[];
	status: string[];
	severity: string[];
	since?: string;
};

export default function IncidentsMapClient({ items, status, severity, since }: Props) {
	const mapEl = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<any | null>(null);
	const layerRef = useRef<any | null>(null);

	const colors = useMemo(() => ({
		critical: '#ef4444',
		high: '#f59e0b',
		medium: '#fbbf24',
		low: '#10b981',
	} as const), []);

	// Initialize map once
	useEffect(() => {
		let disposed = false;
		(async () => {
			if (!mapEl.current || mapRef.current) return;
			const leaflet = await import('leaflet');
			const L: any = (leaflet as any).default ?? leaflet;

			// Ensure default icon assets work if any marker icons are used
			if ((L as any).Icon?.Default?.mergeOptions) {
				(L as any).Icon.Default.mergeOptions({
					iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
					iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
					shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
				});
			}

			// Center on India by default
			const centerIndia: [number, number] = [20.5937, 78.9629];
			const map = L.map(mapEl.current, {
				center: centerIndia,
				zoom: 4,
				worldCopyJump: true,
			});

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19,
			}).addTo(map);

			L.control.scale({ metric: true, imperial: false }).addTo(map);

			// Click to filter by bbox around clicked point (±5°)
			map.on('click', (e: any) => {
				const { lat, lng } = e.latlng || {};
				if (typeof lat !== 'number' || typeof lng !== 'number') return;
				const pad = 5;
				const bbox = `${(lng - pad).toFixed(2)},${(lat - pad).toFixed(2)},${(lng + pad).toFixed(2)},${(lat + pad).toFixed(2)}`;
				const q = new URLSearchParams();
				status.forEach((s) => q.append('status', s));
				severity.forEach((s) => q.append('severity', s));
				if (since) q.set('since', since);
				q.set('bbox', bbox);
				window.location.href = `/dashboard/incidents?${q.toString()}`;
			});

			mapRef.current = map;
			if (disposed) {
				try { map.remove(); } catch {}
			}
		})();

		return () => {
			disposed = true;
			if (mapRef.current) {
				try { mapRef.current.remove(); } catch {}
				mapRef.current = null;
			}
		};
	}, [since, status, severity]);

	// Update markers when items change
	useEffect(() => {
		(async () => {
			if (!mapRef.current) return;
			const leaflet = await import('leaflet');
			const L: any = (leaflet as any).default ?? leaflet;

			// Clear previous layer
			if (layerRef.current) {
				try { layerRef.current.remove(); } catch {}
				layerRef.current = null;
			}

			const layer = L.layerGroup();
			const boundsPoints: [number, number][] = [];
			items.forEach((i) => {
				const rawLon: any = Array.isArray(i?.coords) ? i.coords[0] : (i as any)?.lon;
				const rawLat: any = Array.isArray(i?.coords) ? i.coords[1] : (i as any)?.lat;
				const lon = typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon);
				const lat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
				if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
				if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

				const color = (colors as any)[i.severity] || '#0ea5a4';
				const m = L.circleMarker([lat, lon], {
					radius: 6,
					color: '#111827',
					weight: 1,
					fillColor: color,
					fillOpacity: 0.9,
				}).bindPopup(
					`<div style="font-size:12px;line-height:1.3">
						<div><strong>${i.type ?? 'incident'}</strong> • ${i.severity}</div>
						<div>${lat.toFixed(3)}, ${lon.toFixed(3)}</div>
						<div>${new Date(i.createdAt).toLocaleString?.() ?? ''}</div>
					</div>`
				);
				m.addTo(layer);
				boundsPoints.push([lat, lon]);
			});

			layer.addTo(mapRef.current);
			layerRef.current = layer;

			// Auto-fit to markers if present, with a sensible max zoom to avoid zooming too close
			if (boundsPoints.length > 0) {
				try {
					const b = L.latLngBounds(boundsPoints.map(([la, lo]) => L.latLng(la, lo)));
					mapRef.current.fitBounds(b, { padding: [20, 20] });
					const maxZ = 7;
					if (mapRef.current.getZoom && mapRef.current.setZoom) {
						const z = mapRef.current.getZoom();
						if (typeof z === 'number' && z > maxZ) mapRef.current.setZoom(maxZ);
					}
				} catch {}
			}
		})();
	}, [items, colors]);

	return (
		<div className="relative w-full" style={{ width: '100%' }}>
			<div ref={mapEl} style={{ width: '100%', height: '420px', borderRadius: 8, border: '1px solid var(--color-border)', overflow: 'hidden' }} />
			{items.length === 0 && (
				<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
					<div style={{ background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: 6, fontSize: 12, color: '#6b7280' }}>No data to display</div>
				</div>
			)}
		</div>
	);
}

