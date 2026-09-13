import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import FloatPageHeader from '../components/layout/FloatPageHeader'
import InsightsHero from '../components/ai-insights/InsightsHero'
import InsightsSectionNav from '../components/ai-insights/InsightsSectionNav'
import OverviewStrip from '../components/ai-insights/OverviewStrip'
import HealthSection from '../components/ai-insights/HealthSection'
import SentimentSection from '../components/ai-insights/SentimentSection'
import UpsellSection from '../components/ai-insights/UpsellSection'
import TranslatorSection from '../components/ai-insights/TranslatorSection'
import AlertsSection from '../components/ai-insights/AlertsSection'
import { normalizeSection, sortHealthList } from '../components/ai-insights/shared'
import useAuthStore from '../store/authStore'
import { isAgencyAdmin } from '../lib/roles'
import { apiErrorMessage } from '../lib/apiError'
import { healthScoresApi, upsellApi, alertsApi, clientsApi } from '../services/api'

export default function AIStudioPage() {
  const { user } = useAuthStore()
  const isAdmin = isAgencyAdmin(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const section = normalizeSection(searchParams.get('section'))

  const [agencyAvg, setAgencyAvg] = useState(null)
  const [healthList, setHealthList] = useState([])
  const [upsells, setUpsells] = useState([])
  const [sentiment, setSentiment] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [recomputingAll, setRecomputingAll] = useState(false)
  const [recomputingId, setRecomputingId] = useState(null)

  const setSection = useCallback((id) => {
    const next = normalizeSection(id)
    setSearchParams(next === 'overview' ? {} : { section: next }, { replace: true })
  }, [setSearchParams])

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      healthScoresApi.agencyAverage(),
      healthScoresApi.list(),
      upsellApi.index(),
      clientsApi.sentiment(),
      alertsApi.index(15),
    ]).then(([avgRes, listRes, upsellRes, sentRes, alertRes]) => {
      if (avgRes.status === 'fulfilled') setAgencyAvg(avgRes.value.data.data)
      if (listRes.status === 'fulfilled') {
        setHealthList(sortHealthList(listRes.value.data.data || []))
      }
      if (upsellRes.status === 'fulfilled') setUpsells(upsellRes.value.data.data || [])
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value.data.data || [])
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data.data || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  const pendingUpsells = useMemo(
    () => upsells.filter((u) => u.admin_status === 'pending'),
    [upsells],
  )
  const atRiskClients = useMemo(
    () => sentiment.filter((c) => c.at_risk),
    [sentiment],
  )
  const atRiskProjects = agencyAvg?.red_count ?? healthList.filter((h) => h.flag === 'red').length

  const handleRecomputeAll = async () => {
    setRecomputingAll(true)
    try {
      await healthScoresApi.computeAll()
      toast.success('Health scores recomputed')
      load()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not recompute health scores'))
    } finally {
      setRecomputingAll(false)
    }
  }

  const handleRecomputeOne = async (projectId) => {
    setRecomputingId(projectId)
    try {
      await healthScoresApi.compute(projectId)
      toast.success('Project health updated')
      load()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not recompute this project'))
    } finally {
      setRecomputingId(null)
    }
  }

  return (
    <PageWrapper
      pageActions={
        <FloatPageHeader
          title="AI Insights"
          subtitle="Predictive intelligence across health, sentiment, and revenue timing"
        />
      }
    >
      <div className="sd-page sd-page--team sd-ai-insights sd-animate-in">
        {(section === 'overview') ? (
          <InsightsHero
            isAdmin={isAdmin}
            recomputing={recomputingAll}
            atRiskCount={atRiskProjects}
            onRecompute={handleRecomputeAll}
            onOpenAtRisk={() => setSection('health')}
          />
        ) : null}

        <InsightsSectionNav active={section} onChange={setSection} />

        {section === 'overview' ? (
          <OverviewStrip
            loading={loading}
            agencyAvg={agencyAvg}
            pendingUpsells={pendingUpsells.length}
            atRiskClients={atRiskClients.length}
            alertCount={alerts.length}
            onNavigate={setSection}
          />
        ) : null}

        {section === 'health' ? (
          <HealthSection
            loading={loading}
            healthList={healthList}
            isAdmin={isAdmin}
            recomputingAll={recomputingAll}
            recomputingId={recomputingId}
            onRecomputeAll={handleRecomputeAll}
            onRecomputeOne={handleRecomputeOne}
          />
        ) : null}

        {section === 'sentiment' ? (
          <SentimentSection loading={loading} clients={sentiment} />
        ) : null}

        {section === 'upsell' ? (
          <UpsellSection
            loading={loading}
            suggestions={upsells}
            healthList={healthList}
            isAdmin={isAdmin}
            onRefresh={load}
          />
        ) : null}

        {section === 'translator' ? <TranslatorSection /> : null}

        {section === 'alerts' ? (
          <AlertsSection loading={loading} alerts={alerts} />
        ) : null}
      </div>
    </PageWrapper>
  )
}
