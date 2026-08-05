import { useEffect, useState } from 'react'
import {
  IconBrandGoogle,
  IconBrandStripe,
  IconBrandTeams,
  IconMail,
  IconPlugConnected,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import Badge from '../components/legacy-ui/Badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { integrationsApi } from '../services/api'

const PROVIDERS = [
  {
    id: 'mail_smtp',
    title: 'Mail (SMTP)',
    description: 'Send transactional emails from your agency domain.',
    icon: IconMail,
  },
  {
    id: 'google_meet',
    title: 'Google Meet',
    description: 'Schedule video calls with clients. OAuth coming in a future release.',
    icon: IconBrandGoogle,
    stub: true,
  },
  {
    id: 'microsoft_teams',
    title: 'Microsoft Teams',
    description: 'Connect Teams for client meetings. OAuth coming in a future release.',
    icon: IconBrandTeams,
    stub: true,
  },
  {
    id: 'stripe',
    title: 'Stripe',
    description: 'Store Stripe API keys for card payments. PayPal flows are unchanged.',
    icon: IconBrandStripe,
  },
]

const INITIAL_FORMS = {
  mail_smtp: {
    host: '',
    port: '587',
    username: '',
    password: '',
    encryption: 'tls',
    from_address: '',
    from_name: '',
  },
  stripe: {
    publishable_key: '',
    secret_key: '',
  },
}

function formatConnectedAt(value) {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

function IntegrationCard({
  config,
  integration,
  form,
  onFormChange,
  onConnect,
  onDisconnect,
  busy,
}) {
  const Icon = config.icon
  const connected = integration?.status === 'connected'
  const connectedAt = formatConnectedAt(integration?.connected_at)

  const renderMailForm = () => (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${config.id}-host`}>SMTP host</Label>
        <Input
          id={`${config.id}-host`}
          placeholder="smtp.example.com"
          value={form.host}
          onChange={(e) => onFormChange('host', e.target.value)}
          disabled={connected || busy}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.id}-port`}>Port</Label>
        <Input
          id={`${config.id}-port`}
          type="number"
          min={1}
          max={65535}
          value={form.port}
          onChange={(e) => onFormChange('port', e.target.value)}
          disabled={connected || busy}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.id}-encryption`}>Encryption</Label>
        <select
          id={`${config.id}-encryption`}
          value={form.encryption}
          onChange={(e) => onFormChange('encryption', e.target.value)}
          disabled={connected || busy}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">None</option>
          <option value="tls">TLS</option>
          <option value="ssl">SSL</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${config.id}-username`}>Username</Label>
        <Input
          id={`${config.id}-username`}
          autoComplete="off"
          value={form.username}
          onChange={(e) => onFormChange('username', e.target.value)}
          disabled={connected || busy}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${config.id}-password`}>Password</Label>
        <Input
          id={`${config.id}-password`}
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => onFormChange('password', e.target.value)}
          disabled={connected || busy}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.id}-from-address`}>From address (optional)</Label>
        <Input
          id={`${config.id}-from-address`}
          type="email"
          placeholder="hello@agency.com"
          value={form.from_address}
          onChange={(e) => onFormChange('from_address', e.target.value)}
          disabled={connected || busy}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.id}-from-name`}>From name (optional)</Label>
        <Input
          id={`${config.id}-from-name`}
          placeholder="Your Agency"
          value={form.from_name}
          onChange={(e) => onFormChange('from_name', e.target.value)}
          disabled={connected || busy}
        />
      </div>
    </div>
  )

  const renderStripeForm = () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.id}-publishable`}>Publishable key</Label>
        <Input
          id={`${config.id}-publishable`}
          placeholder="pk_live_..."
          value={form.publishable_key}
          onChange={(e) => onFormChange('publishable_key', e.target.value)}
          disabled={connected || busy}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.id}-secret`}>Secret key</Label>
        <Input
          id={`${config.id}-secret`}
          type="password"
          autoComplete="new-password"
          placeholder="sk_live_..."
          value={form.secret_key}
          onChange={(e) => onFormChange('secret_key', e.target.value)}
          disabled={connected || busy}
        />
      </div>
    </div>
  )

  return (
    <div className="sd-card flex flex-col">
      <div className="sd-card-header">
        <div className="flex items-start gap-3">
          <div className="sd-stat-icon shrink-0">
            <Icon size={20} stroke={1.5} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="sd-card-title">{config.title}</p>
              <Badge variant={connected ? 'success' : 'muted'}>
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <p className="sd-card-desc">{config.description}</p>
            {connected && connectedAt && (
              <p className="mt-1 text-xs text-muted-foreground">Connected {connectedAt}</p>
            )}
          </div>
        </div>
      </div>

      <div className="sd-card-body flex flex-1 flex-col gap-4 pt-0">
        {config.id === 'mail_smtp' && renderMailForm()}
        {config.id === 'stripe' && renderStripeForm()}
        {config.stub && !connected && (
          <p className="text-sm text-muted-foreground">
            One-click connect stores a placeholder until OAuth is available.
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {connected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={busy} onClick={onConnect}>
              <IconPlugConnected size={15} />
              Connect
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState(INITIAL_FORMS)
  const [busyProvider, setBusyProvider] = useState(null)

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

  useEffect(() => { load() }, [])

  const getIntegration = (provider) =>
    integrations.find((row) => row.provider === provider)

  const setFormField = (provider, field, value) => {
    setForms((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value },
    }))
  }

  const buildCredentials = (provider) => {
    if (provider === 'google_meet' || provider === 'microsoft_teams') {
      return {}
    }

    if (provider === 'mail_smtp') {
      const f = forms.mail_smtp
      const credentials = {
        host: f.host.trim(),
        port: parseInt(f.port, 10),
        username: f.username.trim(),
        password: f.password,
      }
      if (f.encryption) credentials.encryption = f.encryption
      if (f.from_address.trim()) credentials.from_address = f.from_address.trim()
      if (f.from_name.trim()) credentials.from_name = f.from_name.trim()
      return credentials
    }

    if (provider === 'stripe') {
      const f = forms.stripe
      return {
        publishable_key: f.publishable_key.trim(),
        secret_key: f.secret_key,
      }
    }

    return {}
  }

  const clearSecrets = (provider) => {
    if (provider === 'mail_smtp') {
      setForms((prev) => ({
        ...prev,
        mail_smtp: { ...prev.mail_smtp, password: '' },
      }))
    }
    if (provider === 'stripe') {
      setForms((prev) => ({
        ...prev,
        stripe: { publishable_key: '', secret_key: '' },
      }))
    }
  }

  const handleConnect = async (provider) => {
    setBusyProvider(provider)
    try {
      await integrationsApi.connect(provider, buildCredentials(provider))
      toast.success('Integration connected')
      clearSecrets(provider)
      load()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to connect integration'
      toast.error(message)
    } finally {
      setBusyProvider(null)
    }
  }

  const handleDisconnect = async (provider) => {
    setBusyProvider(provider)
    try {
      await integrationsApi.disconnect(provider)
      toast.success('Integration disconnected')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect integration')
    } finally {
      setBusyProvider(null)
    }
  }

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader
          title="Integrations"
          subtitle="Connect mail, meetings, and payment providers for your agency."
        />

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 w-full rounded-[1.25rem]" />
            <Skeleton className="h-72 w-full rounded-[1.25rem]" />
            <Skeleton className="h-72 w-full rounded-[1.25rem]" />
            <Skeleton className="h-72 w-full rounded-[1.25rem]" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {PROVIDERS.map((config) => (
              <IntegrationCard
                key={config.id}
                config={config}
                integration={getIntegration(config.id)}
                form={forms[config.id] || {}}
                onFormChange={(field, value) => setFormField(config.id, field, value)}
                onConnect={() => handleConnect(config.id)}
                onDisconnect={() => handleDisconnect(config.id)}
                busy={busyProvider === config.id}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
