export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">FieldMind</h1>
        <p className="text-xl text-muted-foreground mb-8">
          AI-Powered Photo Management & Maintenance Monitoring
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go to Dashboard
          </a>
          <a
            href="/login"
            className="px-6 py-3 border border-border rounded-lg hover:bg-accent"
          >
            Login
          </a>
        </div>
      </div>
    </div>
  );
}
