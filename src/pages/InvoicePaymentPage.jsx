import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  IconBrandPaypal,
  IconBuildingBank,
  IconCreditCard,
  IconLock,
} from '@tabler/icons-react'
import Card from '../components/legacy-ui/Card'
import { Input } from '../components/legacy-ui/Input'
import Button from '../components/legacy-ui/Button'
import Badge from '../components/legacy-ui/Badge'
import { invoicesApi } from '../services/api'
import useAuthStore from '../store/authStore'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const METHOD_META = {
  stripe: {
    id: 'stripe',
    label: 'Card (Stripe)',
    description: 'Pay with debit or credit card',
    icon: IconCreditCard,
  },
  paypal: {
    id: 'paypal',
    label: 'PayPal',
    description: 'Continue to PayPal checkout',
    icon: IconBrandPaypal,
  },
  wise: {
    id: 'wise',
    label: 'Wise',
    description: 'Bank transfer via Wise',
    icon: IconBuildingBank,
  },
}

export default function InvoicePaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const money = useFormatMoney()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [errors, setErrors] = useState({})
  const [method, setMethod] = useState(null)
  const [form, setForm] = useState({
    card_name: '',
    card_number: '',
    expiry: '',
    cvv: '',
  })

  const backTo = user?.role === 'client' ? '/portal' : '/invoices'

  useEffect(() => {
    invoicesApi.show(id)
      .then((res) => {
        const data = res.data.data
        setInvoice(data)
        const methods = data?.available_payment_methods || []
        const preferred = ['stripe', 'paypal', 'wise'].find((m) => methods.includes(m)) || methods[0] || null
        setMethod(preferred)
      })
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false))
  }, [id])

  const availableMethods = useMemo(() => {
    const list = invoice?.available_payment_methods || []
    return list.map((id) => METHOD_META[id]).filter(Boolean)
  }, [invoice])

  const set = (field) => (e) => {
    let value = e.target.value
    if (field === 'card_number') value = formatCardNumber(value)
    if (field === 'expiry') value = formatExpiry(value)
    if (field === 'cvv') value = value.replace(/\D/g, '').slice(0, 4)
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((err) => ({ ...err, [field]: undefined }))
  }

  const handlePay = async () => {
    setPaying(true)
    setErrors({})
    try {
      if (method === 'stripe') {
        const res = await invoicesApi.payCard(id, {
          card_name: form.card_name.trim(),
          card_number: form.card_number.replace(/\s/g, ''),
          expiry: form.expiry,
          cvv: form.cvv,
        })
        navigate(`/invoices/${id}/success`, { state: { result: res.data.data } })
        return
      }

      if (method === 'paypal') {
        const res = await invoicesApi.pay(id)
        const url = res.data?.data?.approval_url
        if (url) {
          window.location.href = url
          return
        }
        setErrors({ form: 'PayPal approval URL missing' })
        return
      }

      if (method === 'wise') {
        const res = await invoicesApi.payWise(id)
        navigate(`/invoices/${id}/success`, { state: { result: res.data.data } })
        return
      }

      setErrors({ form: 'No payment method selected' })
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
      if (!err.response?.data?.errors) {
        setErrors({ form: err.response?.data?.message || 'Payment failed' })
      }
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-[13px] text-muted-foreground">Loading invoice…</div>
      </div>
    )
  }

  if (!invoice || !['sent', 'overdue'].includes(invoice.status)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-5">
        <Card style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div className="mb-3 text-sm text-muted-foreground">
            This invoice is not available for payment.
          </div>
          <Link to={backTo} className="text-xs text-primary">← Back</Link>
        </Card>
      </div>
    )
  }

  const total = Number(invoice.total ?? invoice.amount)
  const active = METHOD_META[method]

  return (
    <div className="payment-page min-h-screen bg-background p-8 px-5">
      <div className="mx-auto max-w-[880px]">
        <Link to={backTo} className="mb-5 inline-block text-xs text-muted-foreground no-underline transition-colors hover:text-primary">
          ← Back to invoices
        </Link>

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[1fr_1.1fr]">
          <Card className="sd-animate-in">
            <div className="mb-1 text-[11px] text-muted-foreground">Invoice</div>
            <div className="mb-3 text-lg font-medium text-foreground">
              {invoice.invoice_number}
            </div>

            <div className="mb-4 rounded-xl bg-muted/60 p-3">
              <div className="text-xs font-medium">{invoice.client_name || invoice.client?.company_name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {invoice.project_name || invoice.project?.name}
              </div>
            </div>

            {(invoice.line_items || []).map((item, i) => (
              <div key={i} className="flex justify-between border-b border-border py-1.5 text-[11px]">
                <span>{item.description} × {item.quantity}</span>
                <span>{money(item.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[13px] font-medium">Total due</span>
              <span className="sd-gradient-text text-xl font-medium">
                {money(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {invoice.due_date && (
              <div className="mt-2 text-[10px] text-muted-foreground">Due {invoice.due_date}</div>
            )}
          </Card>

          <Card className="sd-animate-in sd-animate-in--delay-1">
            {availableMethods.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No payment providers are connected for this agency. Ask an admin to connect PayPal, Stripe, or Wise under Integrations.
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  {availableMethods.map((m) => {
                    const Icon = m.icon
                    const selected = method === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMethod(m.id)
                          setErrors({})
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                          selected
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon size={14} />
                        {m.label}
                      </button>
                    )
                  })}
                </div>

                {active && (
                  <div className="mb-4 flex items-center gap-2">
                    <div className="sd-icon-chip size-8">
                      <active.icon size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{active.label}</div>
                      <div className="text-[10px] text-muted-foreground">{active.description}</div>
                    </div>
                    <Badge variant="info" style={{ marginLeft: 'auto' }}>Sandbox</Badge>
                  </div>
                )}

                {method === 'stripe' && (
                  <div className="flex flex-col gap-2.5">
                    <Input
                      label="Name on card"
                      required
                      placeholder="John Smith"
                      value={form.card_name}
                      onChange={set('card_name')}
                      error={errors.card_name?.[0]}
                    />
                    <Input
                      label="Card number"
                      required
                      placeholder="4111 1111 1111 1111"
                      value={form.card_number}
                      onChange={set('card_number')}
                      error={errors.card_number?.[0]}
                      hint="Test card: 4111 1111 1111 1111"
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        label="Expiry"
                        required
                        placeholder="MM/YY"
                        value={form.expiry}
                        onChange={set('expiry')}
                        error={errors.expiry?.[0]}
                      />
                      <Input
                        label="CVV"
                        required
                        placeholder="123"
                        value={form.cvv}
                        onChange={set('cvv')}
                        error={errors.cvv?.[0]}
                      />
                    </div>
                    <div className="mt-1 rounded-lg bg-amber-50 px-3 py-2.5 text-[10px] text-amber-700">
                      Requires a connected Stripe integration. Test keys (sk_test_) use sandbox charging.
                    </div>
                  </div>
                )}

                {method === 'paypal' && (
                  <div className="rounded-lg bg-muted/60 px-3 py-3 text-[11px] text-muted-foreground">
                    You will be redirected to PayPal to approve this payment. Sandbox accounts work when PayPal is connected under Integrations (or via server env fallback).
                  </div>
                )}

                {method === 'wise' && (
                  <div className="rounded-lg bg-muted/60 px-3 py-3 text-[11px] text-muted-foreground">
                    Confirms payment via the agency Wise profile. Academic demo records a Wise transfer reference without a live payout.
                  </div>
                )}

                {errors.form && (
                  <div className="mt-2.5 text-[11px] text-destructive">{errors.form}</div>
                )}

                <Button onClick={handlePay} loading={paying} size="lg" className="mt-4 w-full" disabled={!method}>
                  {method === 'paypal' ? 'Continue to PayPal' : `Pay ${money(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </Button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <IconLock size={12} />
                  Encrypted sandbox payment — for demo purposes only
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
