import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { teamApi } from '@/services/api'
import { fetchDepartments } from '@/components/team/departmentStorage'
import useAuthStore from '@/store/authStore'
import { getAgencyId } from '@/lib/media'

const DEPT_COLORS = ['#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#f97316', '#06b6d4', '#ec4899']

export function buildDeptBreakdown(members) {
  const counts = new Map()
  for (const m of members) {
    const key = (m.department || '').trim() || 'Unassigned'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count], i) => ({
      name,
      count,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
}

export function DeptDonut({ segments, total }) {
  if (!total) {
    return (
      <div className="sd-team-donut sd-team-donut--empty" aria-hidden>
        <span>0</span>
      </div>
    )
  }

  let cursor = 0
  const stops = segments
    .map((s) => {
      const start = cursor
      const end = cursor + (s.count / total) * 100
      cursor = end
      return `${s.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div
      className="sd-team-donut"
      style={{ background: `conic-gradient(${stops})` }}
      aria-hidden
    >
      <div className="sd-team-donut__hole">
        <strong>{total}</strong>
        <span>Total</span>
      </div>
    </div>
  )
}

/**
 * Soft department breakdown card — used on Overview (Dashboard).
 */
export default function DepartmentOverviewCard({ className = '' }) {
  const { user } = useAuthStore()
  const agencyId = getAgencyId(user)
  const [members, setMembers] = useState([])
  const [deptCount, setDeptCount] = useState(0)

  useEffect(() => {
    teamApi
      .index()
      .then((res) => setMembers(res.data.data || []))
      .catch(() => setMembers([]))
    if (agencyId) {
      fetchDepartments(agencyId).then((rows) => setDeptCount(rows.length))
    }
  }, [agencyId])

  const segments = useMemo(() => buildDeptBreakdown(members), [members])

  return (
    <div className={`sd-stat-tile sd-team-kpi__card sd-dept-overview-card ${className}`.trim()}>
      <div className="sd-dept-overview-card__head">
        <div>
          <p className="sd-stat-tile__label">Department Overview</p>
          <p className="sd-team-kpi__hint">
            {deptCount} department{deptCount !== 1 ? 's' : ''} · {members.length} member
            {members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/team" className="sd-dept-overview-card__link">
          View team
        </Link>
      </div>
      <div className="sd-team-kpi__overview">
        <DeptDonut segments={segments} total={members.length} />
        <ul className="sd-team-kpi__legend">
          {segments.slice(0, 4).map((s) => (
            <li key={s.name}>
              <span style={{ background: s.color }} />
              <em>{s.name}</em>
              <strong>{s.count}</strong>
            </li>
          ))}
          {segments.length === 0 && (
            <li className="is-empty">No department data yet</li>
          )}
        </ul>
      </div>
    </div>
  )
}
