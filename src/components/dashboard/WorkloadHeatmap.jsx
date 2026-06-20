import { useEffect, useState } from 'react'
import { projectsApi } from '../../services/api'
import { cn } from '@/lib/utils'

const MOCK_CAPACITIES = [18, 45, 82, 88, 34, 0, 0, 70, 75, 91, 48, 22, 0, 0, 95, 88, 72, 58, 42, 0, 0]
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const WEEKS = ['W1', 'W2', 'W3']

function getCellClass(pct) {
  if (pct === 0) return 'bg-muted'
  if (pct <= 25) return 'bg-primary/20'
  if (pct <= 50) return 'bg-primary/40'
  if (pct <= 80) return 'bg-primary/70'
  return 'bg-primary'
}

export default function WorkloadHeatmap() {
  const [capacities, setCapacities] = useState(null)

  useEffect(() => {
    projectsApi
      .timeSummary()
      .then((res) => {
        const data = res.data.data
        setCapacities(Array.isArray(data) ? data : (data?.heatmap ?? null))
      })
      .catch((err) => {
        if (err.response?.status === 404) setCapacities(MOCK_CAPACITIES)
      })
  }, [])

  const cells = capacities ?? MOCK_CAPACITIES

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {WEEKS.map((_, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {DAYS.map((_, di) => {
              const idx = wi * 7 + di
              const pct = cells[idx] ?? 0
              return (
                <div
                  key={di}
                  title={`${pct}%`}
                  className={cn('h-5 rounded-md transition-colors', getCellClass(pct))}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">0%</span>
        {[0, 25, 50, 80, 100].map((pct) => (
          <div key={pct} className={cn('h-2 w-4 rounded-sm', getCellClass(pct))} />
        ))}
        <span className="text-[10px] text-muted-foreground">100%</span>
      </div>
    </div>
  )
}
