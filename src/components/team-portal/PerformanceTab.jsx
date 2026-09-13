import { IconGauge, IconTarget, IconCircleCheck, IconMoodSmile, IconEye } from '@tabler/icons-react'
import { KpiCard, Panel, DataTable, StatusBadge, ProgressCell } from './shared'

export default function PerformanceTab({ data }) {
  const { performance } = data

  return (
    <div className="sd-dash-v2" style={{ gap: '1rem' }}>
      <div className="sd-dash-v2__kpi-grid">
        <KpiCard icon={IconGauge} label="Overall Performance" value={`${performance.overall}%`} tone="green" />
        <KpiCard icon={IconTarget} label="Goals Completed" value={`${performance.goalsCompletedOf} / ${performance.goalsTotal}`} tone="blue" />
        <KpiCard icon={IconCircleCheck} label="Projects Completed" value={performance.projectsCompleted} tone="violet" />
        <KpiCard icon={IconMoodSmile} label="Client Satisfaction" value={`${performance.clientSatisfaction}%`} tone="orange" />
      </div>

      <Panel title="Performance Overview" desc="Rated across four categories">
        <div className="sd-team-portal__metrics-grid">
          <div><span>Quality</span><ProgressCell value={performance.quality} /></div>
          <div><span>Productivity</span><ProgressCell value={performance.productivity} /></div>
          <div><span>Communication</span><ProgressCell value={performance.communication} /></div>
          <div><span>Timeliness</span><ProgressCell value={performance.timeliness} /></div>
        </div>
      </Panel>

      <Panel title="Goals" desc="Active and completed goals">
        <DataTable columns={['Goal', 'Progress', 'Due Date', 'Status']}>
          {performance.goals.map((g, i) => (
            <tr key={i}>
              <td><strong>{g.title}</strong></td>
              <td><ProgressCell value={g.progress} /></td>
              <td>{g.due}</td>
              <td><StatusBadge status={g.status} /></td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <Panel title="Reviews" desc="Past performance review cycles">
        <DataTable columns={['Review Period', 'Score', 'Reviewer', 'Date', '']}>
          {performance.reviews.map((r, i) => (
            <tr key={i}>
              <td><strong>{r.period}</strong></td>
              <td>{r.score}%</td>
              <td>{r.reviewer}</td>
              <td>{r.date}</td>
              <td>
                <button type="button" className="sd-dash-v2__panel-link">
                  <IconEye size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} /> View Review
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  )
}
