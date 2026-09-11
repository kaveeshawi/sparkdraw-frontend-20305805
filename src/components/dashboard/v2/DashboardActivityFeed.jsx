export default function DashboardActivityFeed() {
  return (
    <section className="sd-dash-v2__panel sd-dash-v2__panel--feed">
      <header className="sd-dash-v2__panel-head">
        <div>
          <h2 className="sd-dash-v2__panel-title">Activity Feed</h2>
          <p className="sd-dash-v2__panel-desc">Latest events across projects</p>
        </div>
      </header>
      <p className="py-8 text-center text-sm text-muted-foreground">
        Insufficient events — live project_events feed coming next. Demo activity removed from the prod path.
      </p>
    </section>
  )
}
