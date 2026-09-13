import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  IconAdjustmentsHorizontal,
  IconExternalLink,
  IconLock,
  IconPlugConnected,
  IconSearch,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import FloatPageHeader from '../components/layout/FloatPageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IntegrationLogo } from '../components/integrations/IntegrationLogos'
import { integrationsApi } from '../services/api'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'all', label: 'All integrations' },
  { id: 'mail', label: 'Mail' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'payments', label: 'Payments' },
  { id: 'notifications', label: 'Alerts' },
  { id: 'storage', label: 'Storage' },
]

const PROVIDERS = [
  {
    id: 'mail_smtp',
    category: 'mail',
    title: 'Mail (SMTP)',
    description: 'Send invites, digests, and invoice emails from your agency domain.',
    docsUrl: 'https://www.rfc-editor.org/rfc/rfc5321',
    fields: [
      { key: 'host', label: 'SMTP host', placeholder: 'smtp.example.com', span: 2 },
      { key: 'port', label: 'Port', type: 'number', placeholder: '587' },
      {
        key: 'encryption',
        label: 'Encryption',
        type: 'select',
        options: [
          { value: '', label: 'None' },
          { value: 'tls', label: 'TLS' },
          { value: 'ssl', label: 'SSL' },
        ],
      },
      { key: 'username', label: 'Username', span: 2 },
      { key: 'password', label: 'Password', type: 'password', span: 2 },
      { key: 'from_address', label: 'From address (optional)', type: 'email', placeholder: 'hello@agency.com' },
      { key: 'from_name', label: 'From name (optional)', placeholder: 'Your Agency' },
    ],
  },
  {
    id: 'google_meet',
    category: 'meetings',
    title: 'Google Meet',
    description: 'Authorize your Google account to create Meet links for client calls.',
    oauthLabel: 'Authorize with Google',
    docsUrl: 'https://meet.google.com',
    fields: [
      { key: 'workspace_email', label: 'Workspace email', type: 'email', placeholder: 'you@agency.com', span: 2 },
      { key: 'api_key', label: 'API key (optional)', type: 'password', span: 2 },
      { key: 'calendar_id', label: 'Calendar ID (optional)', placeholder: 'primary', span: 2 },
    ],
  },
  {
    id: 'microsoft_teams',
    category: 'meetings',
    title: 'Microsoft Teams',
    description: 'Authorize your Microsoft account for Teams meeting links.',
    oauthLabel: 'Authorize with Microsoft',
    docsUrl: 'https://teams.microsoft.com',
    fields: [
      { key: 'tenant_id', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', span: 2 },
      {
        key: 'webhook_or_meeting_url',
        label: 'Meeting / webhook URL',
        placeholder: 'https://teams.microsoft.com/l/meetup-join/...',
        span: 2,
      },
    ],
  },
  {
    id: 'zoom',
    category: 'meetings',
    title: 'Zoom',
    description: 'Authorize your Zoom account for client video reviews.',
    oauthLabel: 'Authorize with Zoom',
    docsUrl: 'https://zoom.us',
    fields: [
      { key: 'account_id', label: 'Account ID', span: 2 },
      { key: 'client_id', label: 'Client ID', span: 2 },
      { key: 'client_secret', label: 'Client secret', type: 'password', span: 2 },
    ],
  },
  {
    id: 'paypal',
    category: 'payments',
    title: 'PayPal',
    description: 'Authorize PayPal so clients can pay invoices securely.',
    oauthLabel: 'Authorize with PayPal',
    docsUrl: 'https://www.paypal.com',
    fields: [
      { key: 'client_id', label: 'Client ID', span: 2 },
      { key: 'client_secret', label: 'Client secret', type: 'password', span: 2 },
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'sandbox', label: 'Sandbox' },
          { value: 'live', label: 'Live' },
        ],
      },
    ],
  },
  {
    id: 'stripe',
    category: 'payments',
    title: 'Stripe',
    description: 'Authorize Stripe for card payments on your invoices.',
    oauthLabel: 'Authorize with Stripe',
    docsUrl: 'https://stripe.com',
    fields: [
      { key: 'publishable_key', label: 'Publishable key', placeholder: 'pk_test_...', span: 2 },
      { key: 'secret_key', label: 'Secret key', type: 'password', placeholder: 'sk_test_...', span: 2 },
    ],
  },
  {
    id: 'wise',
    category: 'payments',
    title: 'Wise',
    description: 'Connect Wise for bank-transfer style invoice payments.',
    docsUrl: 'https://wise.com',
    fields: [
      { key: 'api_token', label: 'API token', type: 'password', span: 2 },
      { key: 'profile_id', label: 'Profile ID', span: 2 },
    ],
  },
  {
    id: 'slack',
    category: 'notifications',
    title: 'Slack',
    description: 'Authorize Slack to push health-score and risk alerts to your team.',
    oauthLabel: 'Authorize with Slack',
    docsUrl: 'https://slack.com',
    fields: [
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        placeholder: 'https://hooks.slack.com/services/...',
        span: 2,
      },
      { key: 'channel', label: 'Channel (optional)', placeholder: '#sparkdraw-alerts' },
    ],
  },
  {
    id: 'google_drive',
    category: 'storage',
    title: 'Google Drive',
    description: 'Authorize your Google account for asset library sync.',
    oauthLabel: 'Authorize with Google',
    docsUrl: 'https://drive.google.com',
    fields: [
      { key: 'folder_id', label: 'Folder ID', span: 2 },
      { key: 'api_key', label: 'API key', type: 'password', span: 2 },
    ],
  },
]

const INITIAL_FORMS = Object.fromEntries(
  PROVIDERS.map((p) => [
    p.id,
    Object.fromEntries(
      p.fields.map((f) => [
        f.key,
        f.key === 'port' ? '587' : f.key === 'encryption' ? 'tls' : f.key === 'mode' ? 'sandbox' : '',
      ]),
    ),
  ]),
)

const SECRET_KEYS = new Set([
  'password',
  'secret_key',
  'client_secret',
  'api_token',
  'api_key',
])

function buildCredentials(providerId, form) {
  const config = PROVIDERS.find((p) => p.id === providerId)
  if (!config) return {}

  const credentials = {}
  for (const field of config.fields) {
    let value = form[field.key]
    if (typeof value === 'string') value = value.trim()

    if (field.key === 'port') {
      credentials.port = parseInt(value, 10)
      continue
    }
    if (field.key === 'encryption') {
      if (value) credentials.encryption = value
      continue
    }
    if (
      field.key === 'from_address' ||
      field.key === 'from_name' ||
      field.key === 'channel' ||
      field.key === 'api_key' ||
      field.key === 'calendar_id'
    ) {
      if (value) credentials[field.key] = value
      continue
    }
    credentials[field.key] = value
  }
  return credentials
}

function IntegrationCatalogCard({
  config,
  integration,
  busy,
  onConfigure,
  onToggle,
}) {
  const connected = integration?.status === 'connected'

  return (
    <article className="sd-int-card">
      <div className="sd-int-card__top">
        <IntegrationLogo provider={config.id} />
        {config.docsUrl && (
          <a
            href={config.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="sd-int-card__ext"
            aria-label={`Open ${config.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <IconExternalLink size={16} stroke={1.5} />
          </a>
        )}
      </div>

      <h3 className="sd-int-card__title">{config.title}</h3>
      <p className="sd-int-card__desc">{config.description}</p>

      <div className="sd-int-card__footer">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="sd-int-card__configure"
          disabled={busy}
          onClick={onConfigure}
        >
          <IconAdjustmentsHorizontal size={15} stroke={1.75} />
          Configure
        </Button>
        <Switch
          checked={connected}
          disabled={busy}
          onCheckedChange={(checked) => onToggle(checked)}
          className="data-[state=checked]:bg-[var(--primary,#802AEE)] data-[state=checked]:focus-visible:ring-[var(--primary,#802AEE)]/30"
          aria-label={`${connected ? 'Disconnect' : 'Connect'} ${config.title}`}
        />
      </div>
    </article>
  )
}

function ConfigureDialog({
  open,
  onOpenChange,
  config,
  integration,
  form,
  onFormChange,
  busy,
  onOauth,
  onSaveManual,
  onDisconnect,
}) {
  if (!config) return null

  const connected = integration?.status === 'connected'
  const oauthReady = Boolean(integration?.oauth_ready)
  const setupHint = integration?.setup_hint

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <IntegrationLogo provider={config.id} />
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {connected ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              Connected
              {integration?.connection_method === 'oauth' ? ' via your account authorize.' : ' with saved credentials.'}
            </div>
          ) : (
            <>
              {config.oauthLabel && (
                <div className="flex flex-col gap-2">
                  {oauthReady ? (
                    <>
                      <Button type="button" disabled={busy} onClick={onOauth}>
                        <IconLock size={15} />
                        {config.oauthLabel}
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        Opens the real provider login. Sparkdraw stores tokens for your agency only after you approve.
                      </p>
                    </>
                  ) : (
                    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[11px] text-muted-foreground">
                      <p className="font-medium text-foreground">Account authorize needs platform OAuth keys</p>
                      <p className="mt-1">
                        Your agency does not paste Client IDs — you only sign in with your account.
                        An admin must set Sparkdraw’s OAuth app keys in the backend <code>.env</code> once.
                      </p>
                      {setupHint && <p className="mt-2 break-all text-[10px] opacity-90">{setupHint}</p>}
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {config.fields.map((field) => {
                  const id = `${config.id}-${field.key}`
                  const spanClass = field.span === 2 ? 'sm:col-span-2' : ''

                  if (field.type === 'select') {
                    return (
                      <div key={field.key} className={`flex flex-col gap-1.5 ${spanClass}`}>
                        <Label htmlFor={id}>{field.label}</Label>
                        <select
                          id={id}
                          value={form[field.key] ?? ''}
                          onChange={(e) => onFormChange(field.key, e.target.value)}
                          disabled={busy}
                          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                        >
                          {field.options.map((opt) => (
                            <option key={opt.value || 'none'} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  }

                  return (
                    <div key={field.key} className={`flex flex-col gap-1.5 ${spanClass}`}>
                      <Label htmlFor={id}>{field.label}</Label>
                      <Input
                        id={id}
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                        value={form[field.key] ?? ''}
                        onChange={(e) => onFormChange(field.key, e.target.value)}
                        disabled={busy}
                        min={field.type === 'number' ? 1 : undefined}
                        max={field.type === 'number' ? 65535 : undefined}
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {connected ? (
            <Button type="button" variant="outline" disabled={busy} onClick={onDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled={busy} onClick={onSaveManual}>
              <IconPlugConnected size={15} />
              Save credentials
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState(INITIAL_FORMS)
  const [busyProvider, setBusyProvider] = useState(null)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [configureId, setConfigureId] = useState(null)

  const load = () => {
    setLoading(true)
    integrationsApi
      .index()
      .then((res) => setIntegrations(res.data.data || []))
      .catch(() => {
        setIntegrations([])
        toast.error('Failed to load integrations')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const provider = searchParams.get('provider')
    if (!oauth) return

    if (oauth === 'connected') {
      toast.success(`${provider || 'Account'} authorized successfully`)
      load()
    } else if (oauth === 'denied') {
      toast.error('Authorization was denied')
    } else if (oauth === 'error') {
      toast.error('Authorization failed')
    }

    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const getIntegration = (provider) => integrations.find((row) => row.provider === provider)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PROVIDERS.filter((p) => {
      if (tab !== 'all' && p.category !== tab) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.id.includes(q)
      )
    })
  }, [tab, query])

  const setFormField = (provider, field, value) => {
    setForms((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value },
    }))
  }

  const clearSecrets = (providerId) => {
    const config = PROVIDERS.find((p) => p.id === providerId)
    if (!config) return
    setForms((prev) => {
      const next = { ...prev[providerId] }
      for (const field of config.fields) {
        if (SECRET_KEYS.has(field.key) || field.type === 'password') {
          next[field.key] = ''
        }
      }
      return { ...prev, [providerId]: next }
    })
  }

  const handleOauthConnect = async (provider) => {
    setBusyProvider(provider)
    try {
      const res = await integrationsApi.oauthStart(provider)
      const data = res.data.data
      if (data.mode === 'oauth' && data.authorize_url) {
        window.location.href = data.authorize_url
        return
      }
      toast.error(data.error || 'Account authorize is not ready for this provider')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start authorization')
    } finally {
      setBusyProvider(null)
    }
  }

  const handleConnect = async (provider) => {
    setBusyProvider(provider)
    try {
      await integrationsApi.connect(provider, buildCredentials(provider, forms[provider] || {}))
      toast.success('Integration connected')
      clearSecrets(provider)
      setConfigureId(null)
      load()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to connect integration'
      const firstError = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : null
      toast.error(firstError || message)
    } finally {
      setBusyProvider(null)
    }
  }

  const handleDisconnect = async (provider) => {
    setBusyProvider(provider)
    try {
      await integrationsApi.disconnect(provider)
      toast.success('Integration disconnected')
      setConfigureId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect integration')
    } finally {
      setBusyProvider(null)
    }
  }

  const handleToggle = async (provider, checked) => {
    const row = getIntegration(provider)
    const config = PROVIDERS.find((p) => p.id === provider)

    if (!checked) {
      if (row?.status === 'connected') {
        await handleDisconnect(provider)
      }
      return
    }

    if (row?.oauth_ready && config?.oauthLabel) {
      await handleOauthConnect(provider)
      return
    }

    setConfigureId(provider)
  }

  const configureConfig = PROVIDERS.find((p) => p.id === configureId) || null

  return (
    <PageWrapper
      pageActions={
        <FloatPageHeader
          title="Integrations"
          subtitle="Authorize your accounts and connect the tools your agency already uses."
        />
      }
    >
      <div className="sd-page sd-page--team sd-integrations">
        <div className="sd-int-toolbar">
          <div className="sd-int-tabs" role="tablist" aria-label="Integration categories">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={cn('sd-int-tab', tab === t.id && 'is-active')}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="sd-team-toolbar__search sd-int-search">
            <IconSearch size={16} stroke={1.75} className="sd-team-toolbar__search-icon" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="sd-team-toolbar__input"
              aria-label="Search integrations"
            />
            {query ? (
              <button
                type="button"
                className="sd-team-toolbar__clear"
                aria-label="Clear search"
                onClick={() => setQuery('')}
              >
                <IconX size={14} stroke={2} />
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="sd-int-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-[220px] w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="sd-int-empty">No integrations match your search.</div>
        ) : (
          <div className="sd-int-grid">
            {filtered.map((config) => (
              <IntegrationCatalogCard
                key={config.id}
                config={config}
                integration={getIntegration(config.id)}
                busy={busyProvider === config.id}
                onConfigure={() => setConfigureId(config.id)}
                onToggle={(checked) => handleToggle(config.id, checked)}
              />
            ))}
          </div>
        )}

        <ConfigureDialog
          open={Boolean(configureId)}
          onOpenChange={(open) => {
            if (!open) setConfigureId(null)
          }}
          config={configureConfig}
          integration={configureId ? getIntegration(configureId) : null}
          form={configureId ? forms[configureId] || {} : {}}
          onFormChange={(field, value) => setFormField(configureId, field, value)}
          busy={busyProvider === configureId}
          onOauth={() => handleOauthConnect(configureId)}
          onSaveManual={() => handleConnect(configureId)}
          onDisconnect={() => handleDisconnect(configureId)}
        />
      </div>
    </PageWrapper>
  )
}
