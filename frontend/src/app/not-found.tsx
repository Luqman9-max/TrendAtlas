export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-3xl font-bold gradient-text mb-3">404</h1>
        <p className="text-text-muted text-sm mb-6">
          This page doesn&apos;t exist on the atlas.
        </p>
        <a
          href="/"
          className="px-6 py-2.5 bg-accent/20 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/30 transition-all inline-block"
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
