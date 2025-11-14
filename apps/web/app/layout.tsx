import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
const ThemePaletteToggle = dynamic(() => import('../components/ThemePaletteToggle'), { ssr: false });

export const metadata = { title: 'Safety Platform' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  let apiOk = false;
  let apiDemo = false;
  try {
    // Add a short timeout so the whole layout doesn't hang if API is slow
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${base}/healthz`, { cache: 'no-store', signal: controller.signal });
    clearTimeout(t);
    if (res.ok) {
      apiOk = true;
      const j = (await res.json()) as any;
      apiDemo = Boolean(j?.demo);
    }
  } catch {}
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          /* Base (existing tokens remain for backward compatibility) */
          :root { --bg:#ffffff; --fg:#111827; --muted:#6b7280; --border:#e5e7eb; --chip-bg:#f3f4f6; }
          .dark { --bg:#0b1020; --fg:#e5e7eb; --muted:#9ca3af; --border:#1f2937; --chip-bg:#111827; }

          /* Semantic theme tokens (new) */
          :root {
            --color-bg: #F8FAFC;
            --color-surface: #FFFFFF;
            --color-primary: #0ea5a4;
            --color-accent: #06b6d4;
            --color-secondary: #ffb020;
            --color-on-primary: #ffffff;
            --color-on-surface: #0f172a;
            --color-muted: #6b7280;
            --color-border: rgba(15,23,42,0.06);
            --color-success: #16a34a;
            --color-error: #ef4444;
            --color-info: #2563eb;
            --color-warn: #f59e0b;
            --shadow-small: 0 1px 6px rgba(2,6,23,0.06);
            --shadow-medium: 0 10px 30px rgba(2,6,23,0.10);
            --transition-fast: 160ms;
            --transition-medium: 240ms;
            --radius-md: 10px;
            --radius-lg: 14px;
            --radius-xl: 18px;
            --container: 1200px;
            --grid-gap: 12px;
          }

          /* Palettes via html.theme-* classes */
          html.theme-teal { --color-primary:#0ea5a4; --color-accent:#06b6d4; --color-secondary:#ffb020; --color-bg:#F8FBFC; --color-surface:#FFFFFF; --color-on-primary:#ffffff; --color-muted:#6b7280; --color-border:rgba(2,8,23,0.06); --color-success:#16a34a; --color-error:#ef4444; }
          html.theme-sunset { --color-primary:#ff6b6b; --color-accent:#ff9f43; --color-secondary:#7c3aed; --color-bg:#fff9f8; --color-surface:#ffffff; --color-on-primary:#ffffff; --color-muted:#6b7280; --color-border:rgba(15,23,42,0.06); }
          html.theme-indigo { --color-primary:#5b21b6; --color-accent:#06b6d4; --color-secondary:#7c3aed; --color-bg:#f7f7ff; --color-surface:#ffffff; --color-on-primary:#ffffff; --color-muted:#4b5563; }
          html.theme-mint { --color-primary:#16a34a; --color-accent:#34d399; --color-secondary:#0891b2; --color-bg:#f6fffa; --color-surface:#ffffff; --color-on-primary:#ffffff; --color-muted:#374151; }

          /* Utilities (additive) */
          .btn{ display:inline-flex; align-items:center; justify-content:center; gap:.5rem; padding:.56rem 1rem; border-radius:var(--radius-md); font-weight:600; transition: transform var(--transition-fast) ease, box-shadow var(--transition-fast) ease, background-color var(--transition-fast) ease; cursor:pointer; border: none; white-space: nowrap; }
          .btn--primary{ background:var(--color-primary); color:var(--color-on-primary); box-shadow:var(--shadow-small); }
          .btn--primary:hover{ transform:translateY(-3px); box-shadow:var(--shadow-medium); background:linear-gradient(90deg,var(--color-primary),var(--color-accent)); }
          .btn--secondary{ background:transparent; color:var(--color-primary); border:1px solid var(--color-border); }
          .btn--ghost{ background:transparent; color:var(--color-muted); }
          .text-muted{ color: var(--color-muted); }
          .card{ background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); box-shadow:var(--shadow-small); transition:transform .18s ease, box-shadow .18s ease; overflow: hidden; }
          .card:hover{ transform:translateY(-6px); box-shadow:var(--shadow-medium); }
          .badge,.chip{ display:inline-flex; align-items:center; gap:.4rem; padding:.25rem .5rem; border-radius:9999px; background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface)); color: var(--color-on-surface); border:1px solid var(--color-border); white-space: nowrap; }
          .icon{ color: var(--color-muted); }
          input, textarea, select { box-sizing: border-box; max-width: 100%; }
          .container { box-sizing: border-box; }
          * { box-sizing: border-box; }
          :focus-visible{ outline: 3px solid color-mix(in srgb, var(--color-primary) 40%, transparent); outline-offset: 2px; border-radius: 6px; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @media (prefers-reduced-motion: reduce){ * { transition:none !important; animation:none !important; } }
          @media (max-width: 768px) {
            .container { padding: 0 12px; }
            .card { border-radius: 8px; }
            .btn { padding: 8px 12px; font-size: 14px; }
            .hero-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
            .quick-links { grid-template-columns: 1fr !important; }
          }

          /* Apply backgrounds/foregrounds */
          body {
            background:
              radial-gradient(1200px 600px at 10% -10%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent),
              radial-gradient(900px 500px at 110% 10%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent),
              var(--color-bg);
            color: var(--color-on-surface);
            min-height: 100dvh;
          }
          .container { max-width: var(--container); margin: 0 auto; padding: 0 16px; }
          header.site-header {
            position: sticky; top: 0; z-index: 40;
            border-bottom: 1px solid var(--color-border);
            backdrop-filter: saturate(140%) blur(8px);
            background: color-mix(in srgb, var(--color-surface) 82%, transparent);
          }
          .nav {
            display:flex; gap:12px; align-items:center; padding: 10px 16px; justify-content: space-between;
          }
          .nav a { color: var(--color-on-surface); text-decoration: none; }
          .nav .nav-links a {
            padding: 6px 10px; border-radius: 9999px; color: var(--color-primary);
          }
          .nav .nav-links a:hover { background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface)); }
          footer.site-footer { background: color-mix(in srgb, var(--color-surface) 92%, transparent); }
        `}} />
        <header className="site-header">
          <nav className="nav container">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <a href="/" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Safety</a>
              <div className="nav-links" style={{ display: 'flex', gap: 6 }}>
                <a href="/dashboard/incidents">Dashboard</a>
                <a href="/tourist/report">Report</a>
                <a href="/tourist/id-demo">Tourist ID (Demo)</a>
              </div>
            </div>
            <div title={apiOk ? `API online at ${base}` : `API offline at ${base}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge" style={{ padding: '3px 10px', fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: apiOk ? 'var(--color-success)' : 'var(--color-error)' }} />
                API
              </span>
              {apiDemo && (
                <span title="Demo mode" className="badge" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}>DEMO</span>
              )}
              <ThemePaletteToggle />
            </div>
          </nav>
        </header>
        <div className="container" style={{ padding: '16px' }}>
          {children}
        </div>
        <footer className="site-footer" style={{ borderTop: '1px solid var(--color-border)', marginTop: 24 }}>
          <div className="container" style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>
            Prototype for demo — no real data.
          </div>
        </footer>
      </body>
    </html>
  );
}
