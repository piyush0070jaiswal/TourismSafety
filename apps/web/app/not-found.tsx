export default function NotFound() {
  return (
    <main style={{ padding: 24 }}>
      <section className="card" style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em' }}>404</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>Page not found</h1>
        <p className="text-muted" style={{ marginTop: 8 }}>The page you’re looking for doesn’t exist or was moved.</p>
        <div style={{ marginTop: 12 }}>
          <a href="/" className="btn btn--primary">Go to Home</a>
        </div>
      </section>
    </main>
  );
}
