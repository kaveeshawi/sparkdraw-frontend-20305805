import { useEffect, useState } from 'react'
import { Sparkles, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { aiApi, projectsApi } from '../services/api'

const EXAMPLES = [
  'Make the homepage feel more premium and modern.',
  'The checkout flow is confusing — can we simplify it?',
  "There's a bug where the login button doesn't respond on mobile.",
]

export default function FeedbackTranslatorPage() {
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
        const list = res.data.data?.projects || res.data.data || []
        setProjects(list)
        if (list.length > 0) setProjectId(String(list[0].id))
      })
      .catch(() => {})
  }, [])

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
      const msg = err.response?.data?.message || 'AI service unavailable — try again shortly.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader
          title="Feedback Translator"
          subtitle="Paste any client feedback and see how the C1 AI engine turns it into a structured developer ticket."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="sd-card">
            <div className="sd-card-header">
              <div>
                <p className="sd-card-title">Client feedback</p>
                <p className="sd-card-desc">Try one of the examples, or paste your own.</p>
              </div>
            </div>
            <div className="sd-card-body flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setFeedbackText(ex)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
                  >
                    {ex.length > 32 ? `${ex.slice(0, 32)}…` : ex}
                  </button>
                ))}
              </div>

              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">— Select project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <Textarea
                rows={5}
                placeholder="Describe what the client said…"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button onClick={handleTranslate} disabled={loading} className="self-start">
                <Sparkles size={15} />
                {loading ? 'Translating…' : 'Translate to ticket'}
              </Button>
            </div>
          </div>

          <div className="sd-card">
            <div className="sd-card-header">
              <div>
                <p className="sd-card-title">AI-generated ticket</p>
                <p className="sd-card-desc">Structured output from the FastAPI NLP engine.</p>
              </div>
            </div>
            <div className="sd-card-body">
              {!result ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ArrowDown size={20} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Translate some feedback to see the result here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold">{result.title}</p>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                      {result.category}
                    </Badge>
                    <Badge
                      variant={result.priority === 'high' ? 'destructive' : result.priority === 'medium' ? 'warning' : 'success'}
                      className="capitalize"
                    >
                      {result.priority} priority
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Assigned to: <b className="text-foreground">{result.assigned_role}</b></span>
                    <span>Estimate: <b className="text-foreground">{result.estimated_hours}h</b></span>
                  </div>
                  {Array.isArray(result.subtasks) && result.subtasks.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Subtasks</p>
                      <ul className="flex flex-col gap-1.5">
                        {result.subtasks.map((s, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
