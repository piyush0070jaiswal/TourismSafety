"use client";
import React, { useMemo, useState } from "react";

function labelStyle() {
  return { display: "block", fontSize: 12, color: "var(--color-muted)", marginBottom: 4 } as const;
}
function inputStyle() {
  return { width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-on-surface)", borderRadius: 10 } as const;
}
function rowStyle() {
  return { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as const;
}

async function sha256Hex(data: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashText(s: string) {
  const enc = new TextEncoder();
  const bytes = enc.encode(s);
  return sha256Hex(bytes.buffer);
}

export default function DigitalIdDemoPage() {
  const [mode, setMode] = useState<'generate'|'verify'>('generate');
  const [name, setName] = useState("");
  const [idType, setIdType] = useState("Passport");
  const [idNumber, setIdNumber] = useState("");
  const [itinerary, setItinerary] = useState("");
  const [emName, setEmName] = useState("");
  const [emPhone, setEmPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    did: string;
    txId: string;
    anchoredAt: string;
    payloadHash: string;
    fileHash?: string;
    payload: any;
  }>(null);
  const [revokedSet, setRevokedSet] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('tourist_id_demo_revoked') || '[]';
      return new Set(JSON.parse(raw));
    } catch { return new Set(); }
  });
  const isRevoked = result ? revokedSet.has(result.did) : false;
  const [showQr, setShowQr] = useState(false);

  const isValid = useMemo(() => {
    return name.trim() && idNumber.trim() && emPhone.trim();
  }, [name, idNumber, emPhone]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setResult(null);

    try {
      // Build a minimal VC-like payload (demo only)
      const payload = {
        subject: {
          name: name.trim(),
          idType,
          idNumber: idNumber.trim(),
          itinerary: itinerary.trim(),
          emergencyContact: { name: emName.trim(), phone: emPhone.trim() },
        },
        issuer: {
          name: "SIH Safety Platform (Demo)",
          did: "did:demo:issuer",
        },
        issuanceDate: new Date().toISOString(),
        type: ["VerifiableCredential", "TouristIDDemo"],
      };

      let fileHash: string | undefined;
      if (file) {
        const buf = await file.arrayBuffer();
        fileHash = await sha256Hex(buf);
      }

      // Hash the payload + optional file hash as a simple stand-in for on-chain anchoring
      const baseString = JSON.stringify(payload) + (fileHash || "");
      const payloadHash = await hashText(baseString);

      // Simulate a blockchain transaction id
      const ts = Date.now().toString(16);
      const txId = `0x${payloadHash.slice(0, 16)}${ts.slice(-8)}`;
      const did = `did:demo:${payloadHash.slice(0, 22)}`;

      // Simulate network/anchoring delay
      await new Promise((r) => setTimeout(r, 800));

      setResult({
        did,
        txId,
        anchoredAt: new Date().toISOString(),
        payloadHash,
        fileHash,
        payload,
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function onDownload() {
    if (!result) return;
    const blob = new Blob([
      JSON.stringify(
        {
          did: result.did,
          txId: result.txId,
          anchoredAt: result.anchoredAt,
          payloadHash: result.payloadHash,
          fileHash: result.fileHash,
          credential: result.payload,
        },
        null,
        2,
      ),
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tourist-digital-id.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function onSaveLocal() {
    if (!result) return;
    try {
      const data = {
        did: result.did,
        txId: result.txId,
        anchoredAt: result.anchoredAt,
        payloadHash: result.payloadHash,
        fileHash: result.fileHash,
        credential: result.payload,
      };
      localStorage.setItem('tourist_id_demo_last', JSON.stringify(data));
      alert('Saved to device');
    } catch {}
  }

  function onLoadLocal() {
    try {
      const raw = localStorage.getItem('tourist_id_demo_last');
      if (!raw) return alert('No saved ID found');
      const data = JSON.parse(raw);
      setResult({
        did: data.did,
        txId: data.txId,
        anchoredAt: data.anchoredAt,
        payloadHash: data.payloadHash,
        fileHash: data.fileHash,
        payload: data.credential,
      });
      setMode('generate');
    } catch { alert('Failed to load'); }
  }

  function onPrintCard() {
    if (!result) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `<!doctype html>
    <html><head><meta charset="utf-8"/>
    <title>Tourist ID Card</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;padding:24px;background:#f3f4f6}
      .card{width:340px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;overflow:hidden}
      .hdr{background:#111827;color:#fff;padding:10px 12px;font-weight:600}
      .row{display:flex;gap:8px;padding:12px}
      .lbl{color:#6b7280;min-width:100px}
      .mono{font-family:monospace}
      .ft{padding:8px 12px;border-top:1px solid #f3f4f6;color:#6b7280;font-size:12px}
    </style>
    </head><body>
      <div class="card">
        <div class="hdr">Digital Tourist ID — Demo</div>
        <div class="row"><div class="lbl">Name</div><div>${result.payload.subject.name || ''}</div></div>
        <div class="row"><div class="lbl">ID Proof</div><div>${result.payload.subject.idType} ${result.payload.subject.idNumber}</div></div>
        <div class="row"><div class="lbl">Emergency</div><div>${result.payload.subject.emergencyContact?.name || ''} (${result.payload.subject.emergencyContact?.phone || ''})</div></div>
        <div class="row"><div class="lbl">DID</div><div class="mono">${result.did}</div></div>
        <div class="row"><div class="lbl">Tx</div><div class="mono">${result.txId}</div></div>
        <div class="ft">Anchored at ${new Date(result.anchoredAt).toLocaleString()}</div>
      </div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;
    w.document.write(html);
    w.document.close();
  }

  function didToQrData(did: string) {
    // Embed a small URL-like payload for scanners; purely demo
    return `did:${did}`;
  }
  function renderQrSvg(data: string, size = 120) {
    // Tiny inlined QR-like placeholder (not a full QR spec); sufficient for demo visuals offline.
    // We draw a simple grid hash; scanners may not read it—use external link for real QR.
    const cells = 21; // small grid
    const cell = Math.floor(size / cells);
    const blocks: string[] = [];
    // Hash-based pseudo pattern
    let h = 0;
    for (let i = 0; i < data.length; i++) h = ((h << 5) - h) + data.charCodeAt(i);
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const on = ((x * 31 + y * 17 + h) & 7) < 3; // ~3/8 fill
        if (on) blocks.push(`<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="#111827"/>`);
      }
    }
    return { __html: `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${cells*cell} ${cells*cell}'><rect width='100%' height='100%' fill='#fff'/>${blocks.join('')}</svg>` };
  }

  async function onShare() {
    if (!result) return;
    const data = {
      did: result.did,
      txId: result.txId,
      anchoredAt: result.anchoredAt,
      payloadHash: result.payloadHash,
      fileHash: result.fileHash,
      credential: result.payload,
    };
    const text = JSON.stringify(data, null, 2);
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: 'Tourist Digital ID (Demo)', text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copied JSON to clipboard');
    }
  }

  function toggleRevokeCurrent() {
    if (!result) return;
    const next = new Set(revokedSet);
    if (next.has(result.did)) next.delete(result.did); else next.add(result.did);
    setRevokedSet(next);
    try { localStorage.setItem('tourist_id_demo_revoked', JSON.stringify(Array.from(next))); } catch {}
  }

  // Verifier mode state
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyReport, setVerifyReport] = useState<{ ok: boolean; messages: string[]; revoked?: boolean } | null>(null);

  async function verifyCredential() {
    setVerifyReport(null);
    try {
      const parsed = JSON.parse(verifyInput);
      const cred = parsed.credential;
      const fh = parsed.fileHash || '';
      const baseString = JSON.stringify(cred) + fh;
      const h = await hashText(baseString);
      const msgs: string[] = [];
      let ok = true;
      if (h !== parsed.payloadHash) { ok = false; msgs.push('payloadHash mismatch (content may be tampered)'); }
      const expectedDid = 'did:demo:' + h.slice(0,22);
      if (parsed.did !== expectedDid) { ok = false; msgs.push('DID does not match derived DID'); }
      const expectedTxPrefix = '0x' + h.slice(0,16);
      if (!String(parsed.txId || '').startsWith(expectedTxPrefix)) { ok = false; msgs.push('Tx ID does not have expected prefix'); }
      const revoked = (() => { try { const raw = localStorage.getItem('tourist_id_demo_revoked') || '[]'; const set = new Set(JSON.parse(raw)); return set.has(parsed.did); } catch { return false; } })();
      if (revoked) msgs.push('Revoked (demo)');
      if (ok && !revoked) msgs.push('Verified ✓');
      setVerifyReport({ ok, messages: msgs, revoked });
    } catch (e: any) {
      setVerifyReport({ ok: false, messages: ['Invalid JSON: ' + (e?.message || 'parse error')] });
    }
  }

  function resetAll() {
    setName("");
    setIdType("Passport");
    setIdNumber("");
    setItinerary("");
    setEmName("");
    setEmPhone("");
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <main style={{ padding: 16 }}>
      <a href="/" className="btn btn--secondary" style={{ padding: '6px 10px', borderRadius: 9999, marginBottom: 8 }}>&larr; Home</a>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Digital Tourist ID — Demo</h1>
      <p className="text-muted" style={{ marginTop: 4 }}>Simulated issuance and verification with local hashing and a revocation list demo. No data leaves your browser.</p>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ padding: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setMode('generate')} className={`btn ${mode==='generate' ? 'btn--primary' : 'btn--secondary'}`}>Generate</button>
          <button onClick={() => setMode('verify')} className={`btn ${mode==='verify' ? 'btn--primary' : 'btn--secondary'}`}>Verify</button>
          <div style={{ flex: 1 }} />
          <button onClick={onLoadLocal} className="btn btn--ghost">Load last</button>
        </div>
      </div>

      {mode === 'generate' && (
      <section className="card" style={{ marginTop: 12 }}>
      <form onSubmit={onSubmit} style={{ padding: 12, display: "grid", gap: 12 }}>
        <div>
          <label style={labelStyle()}>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Alex Sharma" style={inputStyle()} required />
        </div>

        <div style={rowStyle()}>
          <div>
            <label style={labelStyle()}>ID proof type</label>
            <select value={idType} onChange={(e) => setIdType(e.target.value)} style={inputStyle()}>
              <option>Passport</option>
              <option>Driver License</option>
              <option>National ID</option>
            </select>
          </div>
          <div>
            <label style={labelStyle()}>ID number</label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g., P1234567" style={inputStyle()} required />
          </div>
        </div>

        <div>
          <label style={labelStyle()}>Trip itinerary</label>
          <textarea value={itinerary} onChange={(e) => setItinerary(e.target.value)} placeholder="e.g., Mumbai → Goa (12-15 Sep), Pune (16-18 Sep)" rows={3} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>

        <div style={rowStyle()}>
          <div>
            <label style={labelStyle()}>Emergency contact name</label>
            <input value={emName} onChange={(e) => setEmName(e.target.value)} placeholder="e.g., Priya Sharma" style={inputStyle()} />
          </div>
          <div>
            <label style={labelStyle()}>Emergency contact phone</label>
            <input value={emPhone} onChange={(e) => setEmPhone(e.target.value)} placeholder="e.g., +91 98765 43210" style={inputStyle()} required />
          </div>
        </div>

        <div>
          <label style={labelStyle()}>Attach ID proof (optional)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>File stays in your browser; a hash is computed locally.</div>
        </div>

        {error && (
          <div className="card" style={{ padding: 10, borderColor: '#fee2e2', background: '#fef2f2', color: '#7f1d1d' }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button disabled={!isValid || submitting} type="submit" className="btn btn--primary" style={{ opacity: (!isValid || submitting) ? 0.6 : 1 }}>
            {submitting ? "Anchoring…" : "Generate Digital ID"}
          </button>
          <button type="button" onClick={resetAll} className="btn btn--secondary">
            Reset
          </button>
        </div>
      </form>
      </section>
      )}

      {mode === 'verify' && (
        <section className="card" style={{ marginTop: 12, padding: 12 }}>
          <label style={labelStyle()}>Paste the Digital ID JSON</label>
          <textarea value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)} rows={10} style={{ ...inputStyle(), fontFamily: 'monospace', resize: 'vertical' }} placeholder='{"did":"...","txId":"...","payloadHash":"...","credential":{...}}' />
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={verifyCredential} className="btn btn--primary">Verify</button>
            <button onClick={() => { setVerifyInput(''); setVerifyReport(null); }} className="btn btn--secondary">Clear</button>
            <button onClick={async ()=>{ try { const t = await navigator.clipboard.readText(); setVerifyInput(t); } catch {} }} className="btn btn--ghost">Paste from clipboard</button>
          </div>
          {verifyReport && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 8, border: verifyReport.ok && !verifyReport.revoked ? '1px solid #bbf7d0' : '1px solid #fecaca', background: verifyReport.ok && !verifyReport.revoked ? '#ecfdf5' : '#fef2f2', color: verifyReport.ok && !verifyReport.revoked ? '#064e3b' : '#7f1d1d' }}>
              {verifyReport.messages.map((m, i) => (<div key={i}>• {m}</div>))}
            </div>
          )}
        </section>
      )}

      {result && (
        <section className="card" style={{ marginTop: 16 }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Blockchain simulation</strong>
            <span className="chip" style={{ fontSize: 12, background: isRevoked ? '#fef2f2' : 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface))', borderColor: isRevoked ? '#fecaca' : 'var(--color-border)', color: isRevoked ? '#991b1b' : '#065f46' }}>{isRevoked ? 'Revoked (demo)' : 'Success'}</span>
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ padding: 12, background: "#ecfdf5", border: "1px solid #d1fae5", color: "#065f46", borderRadius: 8, marginBottom: 10 }}>
              <strong>Your ID is now stored securely on blockchain.</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><span style={{ color: "#6b7280" }}>DID:</span> <span style={{ fontFamily: "monospace" }}>{result.did}</span></div>
              <div><span style={{ color: "#6b7280" }}>Tx ID:</span> <span style={{ fontFamily: "monospace" }}>{result.txId}</span></div>
              <div><span style={{ color: "#6b7280" }}>Anchored at:</span> {new Date(result.anchoredAt).toLocaleString()}</div>
              <div><span style={{ color: "#6b7280" }}>Payload hash:</span> <span style={{ fontFamily: "monospace" }}>{result.payloadHash.slice(0, 18)}…</span></div>
              {result.fileHash && (
                <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#6b7280" }}>ID file hash:</span> <span style={{ fontFamily: "monospace" }}>{result.fileHash}</span></div>
              )}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: 'wrap' }}>
              <button onClick={onDownload} className="btn btn--primary">Download JSON</button>
              <a href="#" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(result.did); }} className="btn btn--secondary">Copy DID</a>
              <button onClick={onSaveLocal} className="btn btn--secondary">Save to device</button>
              <button onClick={onShare} className="btn btn--secondary">Share</button>
              <button onClick={onPrintCard} className="btn btn--secondary">Print ID Card</button>
              <label className="chip" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={isRevoked} onChange={toggleRevokeCurrent} /> Revoke (demo)
              </label>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(didToQrData(result.did))}`}
                target="_blank"
                className="btn btn--secondary"
              >
                Open DID QR
              </a>
              <button onClick={() => setShowQr((s)=>!s)} className="btn btn--ghost">Show inline QR</button>
            </div>
            {showQr && (
              <div style={{ marginTop: 10 }}>
                <div dangerouslySetInnerHTML={renderQrSvg(didToQrData(result.did), 160)} />
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Offline preview. Use external link for scannable QR.</div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
