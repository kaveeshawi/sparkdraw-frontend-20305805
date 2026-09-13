import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  IconFileText, IconFiles,
  IconReceipt2, IconMail, IconFileDescription, IconCertificate,
  IconFileInvoice, IconPlus, IconCheck, IconPencil, IconRecycle, IconUpload,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { assetsApi, agencyApi } from '../services/api'
import useAuthStore from '../store/authStore'
import { getAgencyId, agencyLogoSrc } from '../lib/media'
import { cn } from '@/lib/utils'
import TemplateGalleryThumb from '../components/assets/TemplateGalleryThumb'
import TemplateEditorModal from '../components/assets/TemplateEditorModal'
import ProjectFilesPanel from '../components/assets/ProjectFilesPanel'
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_EVENT,
  createBlankTemplate,
  getSelectedTemplateId,
  getTemplatesForCategory,
  loadTemplateSelections,
  setSelectedTemplate,
} from '../lib/documentTemplates'

const FILE_TAB = { id: 'files', label: 'Project files', icon: IconFiles }

const CATEGORY_ICONS = {
  payslip: IconReceipt2,
  letterhead: IconMail,
  contract: IconFileDescription,
  invoice: IconFileInvoice,
  certificate: IconCertificate,
  offer_letter: IconFileText,
}

export default function AssetsPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const agencyId = getAgencyId(user)
  const [searchParams] = useSearchParams()

  const tabs = useMemo(
    () => [
      FILE_TAB,
      ...TEMPLATE_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        icon: CATEGORY_ICONS[cat.id] || IconFileText,
      })),
    ],
    [],
  )

  const initialTab = useMemo(() => {
    const tab = searchParams.get('tab')
    if (tab === 'invoice' || TEMPLATE_CATEGORIES.some((c) => c.id === tab) || tab === 'files') {
      return tab
    }
    return 'files'
  }, [searchParams])

  const [activeTab, setActiveTab] = useState(initialTab)
  const [selections, setSelections] = useState(() => loadTemplateSelections(agencyId))
  const [tick, setTick] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [latexMode, setLatexMode] = useState(false)
  const [createFolderSignal, setCreateFolderSignal] = useState(0)
  const [recycleSignal, setRecycleSignal] = useState(0)
  const [addFilesSignal, setAddFilesSignal] = useState(0)
  const [filesNavResetSignal, setFilesNavResetSignal] = useState(0)

  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [company, setCompany] = useState({ name: 'Your Agency', logo: null, accent: '#1a4d4e' })
  const [selectionsAgencyId, setSelectionsAgencyId] = useState(agencyId)

  if (selectionsAgencyId !== agencyId) {
    setSelectionsAgencyId(agencyId)
    setSelections(loadTemplateSelections(agencyId))
  }

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (!tab) return
    if (tab === 'files' || TEMPLATE_CATEGORIES.some((c) => c.id === tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    const refresh = () => {
      setSelections(loadTemplateSelections(agencyId))
      setTick((n) => n + 1)
    }
    window.addEventListener(TEMPLATE_EVENT, refresh)
    return () => window.removeEventListener(TEMPLATE_EVENT, refresh)
  }, [agencyId])

  /** Browser back/forward stays inside Assets: folder → root, other tab → Project files */
  useEffect(() => {
    const seed = { sdAssets: true, tab: 'files', folderId: null, recycle: false }
    if (!window.history.state?.sdAssets) {
      window.history.replaceState({ ...window.history.state, ...seed }, '')
    }

    const onPop = (event) => {
      const state = event.state
      if (!state?.sdAssets) return
      const nextTab = state.tab || 'files'
      setActiveTab(nextTab)
      if (nextTab !== 'files') {
        setFilesNavResetSignal((n) => n + 1)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const goToTab = (tabId) => {
    if (tabId === activeTab) return
    window.history.pushState(
      { sdAssets: true, tab: tabId, folderId: null, recycle: false },
      '',
    )
    setActiveTab(tabId)
    setFilesNavResetSignal((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    assetsApi
      .all()
      .then((res) => {
        if (!cancelled) {
          setAssets(res.data.data || [])
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    agencyApi
      .show()
      .then((res) => {
        if (cancelled) return
        const a = res.data?.data || res.data || {}
        setCompany({
          name: a.company_name || a.name || 'Your Agency',
          address: a.address || '',
          email: a.email || '',
          phone: a.phone || '',
          website: a.website || '',
          logo: agencyLogoSrc(a) || null,
          accent: a.brand_colors?.primary || '#1a4d4e',
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const category = TEMPLATE_CATEGORIES.find((c) => c.id === activeTab)
  const templates = useMemo(
    () => {
      void tick
      return category ? getTemplatesForCategory(agencyId, category.id) : []
    },
    [agencyId, category, tick],
  )
  const selectedId = category ? (selections[category.id] || getSelectedTemplateId(agencyId, category.id)) : null

  const openEditor = (template, { latex = false } = {}) => {
    setEditingTemplate(template)
    setLatexMode(Boolean(latex || template.latexMode))
    setEditorOpen(true)
  }

  const handleSelect = (templateId) => {
    if (!category) return
    if (!isAdmin) {
      toast.message('Only admins can change the active template')
      return
    }
    setSelections(setSelectedTemplate(agencyId, category.id, templateId))
    toast.success('Template selected')
  }

  const handleCreateManual = () => {
    if (!isAdmin || !category) return
    const blank = createBlankTemplate(category.id)
    openEditor(blank, { latex: true })
  }

  return (
    <PageWrapper
      pageActions={
        <div className="sd-float-page-header__bar sd-page-toolbar sd-page-toolbar--team">
          <PageHeader
            title="Assets"
            subtitle="Project files and document templates"
          />
          {activeTab === 'files' && (isAdmin || user?.role === 'pm') ? (
            <div className="sd-page-actions">
              <Button
                type="button"
                variant="outline"
                className="sd-assets-recycle-btn rounded-full"
                onClick={() => setRecycleSignal((n) => n + 1)}
              >
                <IconRecycle size={16} />
                Recycle bin
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setCreateFolderSignal((n) => n + 1)}
              >
                <IconPlus size={16} />
                New folder
              </Button>
              <Button
                variant="default"
                className="sd-header-new-project sd-btn-gradient inline-flex shrink-0 border-0 shadow-none"
                onClick={() => setAddFilesSignal((n) => n + 1)}
              >
                <IconUpload size={16} />
                Add files
              </Button>
            </div>
          ) : null}
          {isAdmin && category ? (
            <div className="sd-page-actions">
              <Button
                variant="default"
                className="sd-header-new-project sd-btn-gradient inline-flex shrink-0 border-0 shadow-none"
                onClick={handleCreateManual}
              >
                <IconPlus size={16} />
                Create manually
              </Button>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="sd-page sd-page--team sd-assets-page sd-animate-in">
        <div className="sd-team-portal__tabs-wrap" role="tablist" aria-label="Assets sections">
          <div className="sd-header-tabs sd-team-portal__tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => goToTab(tab.id)}
                  className={cn('sd-header-tab sd-team-portal__tab', active && 'sd-header-tab--active')}
                >
                  <Icon size={14} stroke={1.75} aria-hidden />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="sd-team-portal__content">
          {activeTab === 'files' ? (
            <ProjectFilesPanel
              agencyId={agencyId}
              user={user}
              canManage={isAdmin || user?.role === 'pm'}
              assets={assets}
              loading={loading}
              error={error}
              createSignal={createFolderSignal}
              recycleSignal={recycleSignal}
              addFilesSignal={addFilesSignal}
              navResetSignal={filesNavResetSignal}
            />
          ) : category ? (
            <div className="sd-assets-gallery">
              <div className="sd-assets-gallery__head">
                <div>
                  <h2>{category.label}</h2>
                  <p>{category.desc}</p>
                </div>
                {!isAdmin ? (
                  <p className="text-xs text-muted-foreground">View only — admins choose the active template.</p>
                ) : null}
              </div>

              <div className="sd-assets-gallery__grid">
                {templates.map((tpl) => {
                  const active = selectedId === tpl.id
                  return (
                    <article
                      key={tpl.id}
                      className={cn('sd-tpl-gallery-card sd-card', active && 'is-selected')}
                    >
                      <button
                        type="button"
                        className="sd-tpl-gallery-card__preview"
                        onClick={() => openEditor({ ...tpl, categoryId: category.id }, { latex: Boolean(tpl.latexMode) })}
                        aria-label={`Edit ${tpl.name}`}
                      >
                        <TemplateGalleryThumb
                          template={tpl}
                          accent={category.accent}
                          company={company}
                          agencyId={agencyId}
                        />
                      </button>

                      <div className="sd-tpl-gallery-card__meta">
                        <div className="sd-tpl-gallery-card__title-row">
                          <h3>{tpl.name}</h3>
                          {(tpl.topPick || active) && (
                            <span className={cn('sd-tpl-gallery-card__pill', active && 'is-active')}>
                              {active ? (
                                <>
                                  <IconCheck size={11} stroke={2.4} />
                                  Selected
                                </>
                              ) : (
                                'Top pick'
                              )}
                            </span>
                          )}
                        </div>
                        <p>{tpl.desc}</p>
                        <div className="sd-tpl-gallery-card__actions">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => openEditor({ ...tpl, categoryId: category.id }, { latex: Boolean(tpl.latexMode) })}
                          >
                            <IconPencil size={13} stroke={1.75} />
                            Edit
                          </Button>
                          {isAdmin ? (
                            <Button
                              type="button"
                              size="sm"
                              className={cn('rounded-full', active ? 'sd-btn-gradient' : '')}
                              variant={active ? 'default' : 'secondary'}
                              disabled={active}
                              onClick={() => handleSelect(tpl.id)}
                            >
                              {active ? 'In use' : 'Use template'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}

                {isAdmin ? (
                  <button
                    type="button"
                    className="sd-tpl-gallery-card sd-tpl-gallery-card--create sd-card"
                    onClick={handleCreateManual}
                  >
                    <span className="sd-tpl-gallery-card__create-icon">
                      <IconPlus size={22} stroke={1.6} />
                    </span>
                    <strong>Create manually</strong>
                    <p>Start from a LaTeX letterhead — edit source on the left, preview on the right.</p>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <TemplateEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agencyId={agencyId}
        categoryId={category?.id || activeTab}
        template={editingTemplate}
        canManage={isAdmin}
        latexMode={latexMode}
        onSaved={() => setTick((n) => n + 1)}
      />
    </PageWrapper>
  )
}
