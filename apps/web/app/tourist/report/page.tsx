"use client";

import RecentReports from '../../../components/RecentReports';

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LocationPicker from "../../../components/LocationPicker";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [type, setType] = React.useState("general");
  const [severity, setSeverity] = React.useState("low");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [chosenLoc, setChosenLoc] = React.useState<{ lat: number; lon: number } | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [fileHash, setFileHash] = React.useState<string | null>(null);
  const [latText, setLatText] = React.useState<string>("");
  const [lonText, setLonText] = React.useState<string>("");

  async function sha256Hex(data: ArrayBuffer) {
    const hash = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);

    try {
      const coords = chosenLoc ?? await new Promise<{ lat: number; lon: number }>((resolve) => {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve({ lat: 19.076, lon: 72.8777 }) // fallback (Mumbai)
          );
        } else {
          resolve({ lat: 19.076, lon: 72.8777 });
        }
      });

      const body = {
        type,
        severity,
        description,
        location: coords,
        // Optional attachment metadata (API may ignore; harmless and useful in the future)
        attachmentFileName: file?.name,
        attachmentSize: file?.size,
        attachmentHash: fileHash || undefined,
      };

      let res = await fetch(`${API_BASE}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // One safe retry against localhost in case NEXT_PUBLIC_API_URL is misconfigured during demo
      if (!res.ok) {
        const alt = "http://localhost:4000";
        if ((API_BASE || "").replace(/\/$/, "") !== alt) {
          try {
            res = await fetch(`${alt}/incidents`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
          } catch {
            // ignore and fall through to error handling
          }
        }
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`Submit failed (${res.status}) ${t}`);
        }
      }

      setMsg("Report submitted");
      // Store in localStorage for RecentReports
      try {
        const prev = JSON.parse(localStorage.getItem("recent_reports") || "[]");
        const entry = {
          type,
          severity,
          description,
          location: coords,
          createdAt: new Date().toISOString(),
          attachmentFileName: file?.name,
          attachmentSize: file?.size,
          attachmentHash: fileHash || undefined,
        };
        const next = [entry, ...prev].slice(0, 10);
        localStorage.setItem("recent_reports", JSON.stringify(next));
      } catch {}
      router.push("/dashboard/incidents");
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to submit");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  // Keep inputs in sync with picker/geolocation
  React.useEffect(() => {
    if (chosenLoc) {
      setLatText(String(chosenLoc.lat));
      setLonText(String(chosenLoc.lon));
    }
  }, [chosenLoc]);

  // Optional: initialize with current position on first load for convenience
  React.useEffect(() => {
    if (chosenLoc) return;
    // Prefill from URL if provided: ?type=&severity=&description=&lat=&lon=
    try {
      const t = searchParams?.get('type');
      const sev = searchParams?.get('severity');
      const desc = searchParams?.get('description');
      const latQ = searchParams?.get('lat');
      const lonQ = searchParams?.get('lon');
      if (t) setType(t);
      if (sev) setSeverity(sev);
      if (desc) setDescription(desc);
      const latNum = latQ != null ? Number(latQ) : NaN;
      const lonNum = lonQ != null ? Number(lonQ) : NaN;
      if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
        const clampedLat = Math.max(-90, Math.min(90, latNum));
        const clampedLon = Math.max(-180, Math.min(180, lonNum));
        const next = { lat: clampedLat, lon: clampedLon };
        setChosenLoc(next);
        setLatText(String(next.lat));
        setLonText(String(next.lon));
        return; // if URL provided coords, skip geolocation
      }
    } catch {}
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setChosenLoc(next);
          setLatText(String(next.lat));
          setLonText(String(next.lon));
        },
        () => {
          // keep empty if user denies; they can still use the button or manual inputs
        }
      );
    }
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>Report an Incident</h1>
      <form className="card" onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 640, padding: 16 }}>
        <label>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Type</div>
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Type"
            style={{ border: "1px solid var(--color-border)", padding: 10, borderRadius: 8, width: "100%" }}
            required
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Severity</div>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            style={{ border: "1px solid var(--color-border)", padding: 10, borderRadius: 8, width: "100%" }}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the incident"
            rows={4}
            style={{ border: "1px solid var(--color-border)", padding: 10, borderRadius: 8, width: "100%", resize: 'vertical' }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Location</div>
          <LocationPicker value={chosenLoc} onChange={setChosenLoc} />
          {chosenLoc && (
            <div style={{ marginTop: 6 }}>
              <a href={`https://maps.google.com/?q=${chosenLoc.lat},${chosenLoc.lon}`} target="_blank" style={{ color: 'var(--color-info)', textDecoration: 'none', fontSize: 12, marginRight: 8 }}>Open in Google Maps</a>
              <button type="button" onClick={() => { setChosenLoc(null); setLatText(''); setLonText(''); }} className="btn btn--secondary" style={{ padding: '6px 10px' }}>Reset location</button>
            </div>
          )}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Latitude</div>
            <input
              inputMode="decimal"
              placeholder="e.g., 19.076"
              value={latText}
              onChange={(e) => {
                const v = e.target.value;
                setLatText(v);
                const num = Number(v);
                if (Number.isFinite(num)) {
                  const clamped = Math.max(-90, Math.min(90, num));
                  setChosenLoc((prev) => ({ lat: clamped, lon: prev?.lon ?? 72.8777 }));
                }
              }}
              style={{ border: '1px solid var(--color-border)', padding: 10, borderRadius: 8, width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Range: -90 to 90</div>
          </label>
          <label>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Longitude</div>
            <input
              inputMode="decimal"
              placeholder="e.g., 72.8777"
              value={lonText}
              onChange={(e) => {
                const v = e.target.value;
                setLonText(v);
                const num = Number(v);
                if (Number.isFinite(num)) {
                  const clamped = Math.max(-180, Math.min(180, num));
                  setChosenLoc((prev) => ({ lon: clamped, lat: prev?.lat ?? 19.076 } as any));
                }
              }}
              style={{ border: '1px solid var(--color-border)', padding: 10, borderRadius: 8, width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Range: -180 to 180</div>
          </label>
        </div>
        <label>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Attach photo (optional)</div>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={async (e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              setFileHash(null);
              if (f) {
                try {
                  const buf = await f.arrayBuffer();
                  const h = await sha256Hex(buf);
                  setFileHash(h);
                } catch { setFileHash(null); }
              }
            }}
          />
          {file && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              {file.name} ({file.size} bytes){fileHash ? <> • hash: <span style={{ fontFamily: 'monospace' }}>{fileHash.slice(0,16)}…</span></> : ' • hashing…'}
            </div>
          )}
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={busy}
            className="btn btn--primary"
            style={{ opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={async () => {
            const coords = chosenLoc ?? { lat: 19.076, lon: 72.8777 };
            const preview = {
              type,
              severity,
              description,
              location: coords,
              attachmentFileName: file?.name,
              attachmentSize: file?.size,
              attachmentHash: fileHash || undefined,
            };
            try { await navigator.clipboard.writeText(JSON.stringify(preview, null, 2)); setMsg('Copied report JSON'); } catch { setMsg('Could not copy'); }
          }}
          >
            Copy report JSON
          </button>
        </div>
        {msg && <div style={{ fontSize: 12, color: "#6b7280" }}>{msg}</div>}
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Demo note: uses your location if permitted; otherwise a safe fallback.
        </div>
      </form>
      <RecentReports />
    </main>
  );
}
