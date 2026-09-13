import { useEffect, useState } from 'react'
import { IconArrowDown, IconSparkles } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import TeamSelect from '../team/TeamSelect'
import { apiErrorMessage } from '@/lib/apiError'
import { aiApi, projectsApi } from '../../services/api'

const EXAMPLES = [
  'Make the homepage feel more premium and modern.',
  'The checkout flow is confusing — can we simplify it?',
  "There's a bug where the login button doesn't respond on mobile.",
]

export default function TranslatorSection() {
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    projectsApi
      .index()
      .then((res) => {
        const raw = res.data.data
        const list = Array.isArray(raw) ? raw : (raw?.projects ?? [])
        setProjects(list)
        if (list.length > 0) setProjectId(String(list[0].id))
      })
      .catch(() => {})
  }, [])

  const projectOptions = projects.map((p) => ({
    value: String(p.id),
    label: p.name,
  }))

  const selectedProject = projects.find((p) => String(p.id) === projectId)

  const handleTranslate = async () => {
    if (!feedbackText.trim() || feedbackText.trim().length < 10) {
      setError('Feedback must be at least 10 characters.')
      return
    }
    if (!projectId) {
      setError('Select a project first.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await aiApi.analyzeFeedback({
        feedback_text: feedbackText,
        project_type: selectedProject?.type || 'general',
        project_id: Number(projectId),
      })
      setResult(res.data.data)
    } catch (err) {
      const msg = apiErrorMessage(err, 'AI service unavailable — try again shortly.')
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="sd-ai-panel">
      <div className="sd-ai-panel__head">
        <div>
          <h2 className="sd-ai-panel__title">Feedback translator</h2>
          <p className="sd-ai-panel__desc">
            Paste vague client feedback — NLP turns it into a structured ticket with priority and subtasks.
          </p>
        </div>
      </div>

      <div className="sd-ai-translator">
        <div className="sd-ai-translator__col">
          <p className="sd-ai-translator__label">Client feedback</p>
          <div className="sd-ai-filters">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="sd-ai-chip"
                onClick={() => setFeedbackText(ex)}
              >
                {ex.length > 36 ? `${ex.slice(0, 36)}…` : ex}
              </button>
            ))}
          </div>

          <TeamSelect
            id="ai-translator-project"
            value={projectId}
            onValueChange={setProjectId}
            options={projectOptions}
            placeholder="Select project"
          />

          <Textarea
            rows={6}
            className="sd-team-field sd-team-field--textarea"
            placeholder="Describe what the client said…"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />

          {error ? <p className="sd-team-form__error">{error}</p> : null}

          <Button
            type="button"
            className="sd-btn-gradient self-start border-0"
            disabled={loading}
            onClick={handleTranslate}
          >
            <IconSparkles size={15} stroke={1.75} />
            {loading ? 'Translating…' : 'Translate to ticket'}
          </Button>
        </div>

        <div className="sd-ai-translator__col">
          <p className="sd-ai-translator__label">AI-generated ticket</p>
          {!result ? (
            <div className="sd-ai-empty sd-ai-empty--flush">
              <IconArrowDown size={20} stroke={1.5} />
              <p className="sd-ai-empty__desc">Translate some feedback to see the structured ticket here.</p>
            </div>
          ) : (
            <div className="sd-ai-ticket">
              <div className="sd-ai-ticket__head">
                <p className="sd-ai-ticket__title">{result.title}</p>
                {result.category ? (
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                    {result.category}
                  </Badge>
                ) : null}
                {result.priority ? (
                  <Badge
                    variant={
                      result.priority === 'high'
                        ? 'destructive'
                        : result.priority === 'medium'
                          ? 'warning'
                          : 'success'
                    }
                    className="capitalize"
                  >
                    {result.priority} priority
                  </Badge>
                ) : null}
              </div>
              <div className="sd-ai-ticket__meta">
                {result.assigned_role ? (
                  <span>
                    Role: <b>{result.assigned_role}</b>
                  </span>
                ) : null}
                {result.estimated_hours != null ? (
                  <span>
                    Estimate: <b>{result.estimated_hours}h</b>
                  </span>
                ) : null}
              </div>
              {Array.isArray(result.subtasks) && result.subtasks.length > 0 ? (
                <ul className="sd-ai-ticket__subtasks">
                  {result.subtasks.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
