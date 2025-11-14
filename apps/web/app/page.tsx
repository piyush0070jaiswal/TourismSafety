import dynamic from 'next/dynamic';
const HomeStatusClient = dynamic(() => import('../components/HomeStatusClient'), { ssr: false });

export default function HomePage() {
  return (
    <main style={{ padding: '24px 0' }}>
      {/* Hero */}
      <section className="card" style={{ 
        padding: 32, 
        borderRadius: 'var(--radius-xl)', 
        background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-primary) 3%, var(--color-surface)) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 8%, transparent) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'center', position: 'relative' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 9999, background: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, var(--color-border))', marginBottom: 16, boxShadow: 'var(--shadow-small)' }}>
              <span style={{ 
                width: 10, 
                height: 10, 
                borderRadius: 9999, 
                background: 'var(--color-primary)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface)' }}>Live Safety Platform</span>
            </div>
            <h1 style={{ 
              margin: 0, 
              fontSize: 40, 
              lineHeight: 1.1, 
              letterSpacing: '-0.03em',
              fontWeight: 900,
              background: 'linear-gradient(135deg, var(--color-on-surface) 0%, color-mix(in srgb, var(--color-primary) 60%, var(--color-on-surface)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Tourism Safety, reimagined
            </h1>
            <p style={{ color: 'var(--color-muted)', marginTop: 12, fontSize: 17, lineHeight: 1.6 }}>
              Real‑time incident dashboards, citizen reporting, IoT telemetry, and verifiable digital IDs — designed for rapid response and visitor trust.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <a className="btn btn--primary" href="/dashboard/incidents" style={{ padding: '12px 20px', fontSize: 15 }}>
                🚨 Open Dashboard
              </a>
              <a className="btn btn--secondary" href="/tourist/report" style={{ padding: '12px 20px', fontSize: 15 }}>
                📱 Report Incident
              </a>
              <a className="btn btn--ghost" href="/tourist/id-demo" style={{ padding: '12px 20px', fontSize: 15 }}>
                🆔 Digital ID Demo
              </a>
            </div>
            <div style={{ marginTop: 16 }}>
              <HomeStatusClient />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="card" style={{ padding: 18, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-info) 4%, var(--color-surface)) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🗺️</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Live Map & Filters</div>
              </div>
              <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.4 }}>
                Filter incidents by status, severity, time window, and area with an intuitive interface.
              </div>
            </div>
            <div className="card" style={{ padding: 18, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-accent) 4%, var(--color-surface)) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>📊</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Export & Integrate</div>
              </div>
              <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.4 }}>
                CSV/JSON/GeoJSON exports for analysis and seamless workflow integration.
              </div>
            </div>
            <div className="card" style={{ padding: 18, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-secondary) 4%, var(--color-surface)) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🛡️</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Digital Identity</div>
              </div>
              <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.4 }}>
                Verifiable tourist ID with blockchain simulation — safe to explore locally.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Cards */}
      <section className="quick-links" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <a className="card" href="/dashboard/incidents" style={{ 
          padding: 20, 
          textDecoration: 'none',
          background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-error) 3%, var(--color-surface)) 100%)',
          border: '1px solid color-mix(in srgb, var(--color-error) 12%, var(--color-border))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 12, 
              background: 'color-mix(in srgb, var(--color-error) 12%, var(--color-surface))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>
              🚨
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-on-surface)' }}>Live Incidents</div>
          </div>
          <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
            Monitor real-time incident reports, manage responses, and track resolution status across all locations.
          </div>
        </a>
        
        <a className="card" href="/tourist/report" style={{ 
          padding: 20, 
          textDecoration: 'none',
          background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-info) 3%, var(--color-surface)) 100%)',
          border: '1px solid color-mix(in srgb, var(--color-info) 12%, var(--color-border))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 12, 
              background: 'color-mix(in srgb, var(--color-info) 12%, var(--color-surface))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>
              📱
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-on-surface)' }}>Report Issue</div>
          </div>
          <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
            Quick incident reporting with automatic location detection, photo uploads, and emergency contact options.
          </div>
        </a>
        
        <a className="card" href="/tourist/id-demo" style={{ 
          padding: 20, 
          textDecoration: 'none',
          background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-secondary) 3%, var(--color-surface)) 100%)',
          border: '1px solid color-mix(in srgb, var(--color-secondary) 12%, var(--color-border))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 12, 
              background: 'color-mix(in srgb, var(--color-secondary) 12%, var(--color-surface))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>
              🆔
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-on-surface)' }}>Digital Tourist ID</div>
          </div>
          <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
            Secure digital identity verification with blockchain anchoring, QR codes, and printable ID cards.
          </div>
        </a>
      </section>
    </main>
  );
}
