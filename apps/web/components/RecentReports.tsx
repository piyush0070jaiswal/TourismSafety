"use client";
import { useEffect, useState } from "react";

type Report = {
  type: string;
  severity: string;
  description: string;
  location: { lat: number; lon: number };
  createdAt: string;
  [k: string]: any;
};

export default function RecentReports() {
  const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recent_reports");
      if (raw) setReports(JSON.parse(raw));
    } catch {}
  }, []);
  if (!reports.length) return null;
  return (
    <section style={{ marginTop: 32, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Recent Reports (local)</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Last {Math.min(3, reports.length)} shown</div>
        <button
          type="button"
          onClick={() => { try { localStorage.removeItem('recent_reports'); } catch {}; setReports([]); }}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12 }}
          aria-label="Clear recent reports"
        >Clear all</button>
      </div>
      <ul style={{ display: "grid", gap: 8, padding: 0, listStyle: "none" }}>
        {reports.slice(0, 3).map((r, i) => (
          <li key={r.createdAt + i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, background: "#f9fafb" }}>
            <div style={{ fontSize: 13, marginBottom: 2 }}><b>{r.type}</b> • {r.severity}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{r.description}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Lat: {r.location.lat}, Lon: {r.location.lon}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(r.createdAt).toLocaleString()}</div>
            <button
              type="button"
              style={{ marginTop: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}
              onClick={async () => {
                try { await navigator.clipboard.writeText(JSON.stringify(r, null, 2)); } catch {}
              }}
            >Copy JSON</button>
            <a
              href={`https://maps.google.com/?q=${r.location.lat},${r.location.lon}`}
              target="_blank"
              style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, textDecoration: 'none', color: '#111827' }}
            >Open map</a>
            <a
              href={`/tourist/report?type=${encodeURIComponent(r.type)}&severity=${encodeURIComponent(r.severity)}&description=${encodeURIComponent(r.description)}&lat=${r.location.lat}&lon=${r.location.lon}`}
              style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, textDecoration: 'none', color: '#111827' }}
            >Use on form</a>
          </li>
        ))}
      </ul>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>Stored only in your browser</div>
    </section>
  );
}