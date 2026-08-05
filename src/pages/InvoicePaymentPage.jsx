import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { IconCreditCard, IconLock } from '@tabler/icons-react'
import Card from '../components/legacy-ui/Card'
import { Input } from '../components/legacy-ui/Input'
import Button from '../components/legacy-ui/Button'
import Badge from '../components/legacy-ui/Badge'
import { invoicesApi } from '../services/api'
import useAuthStore from '../store/authStore'

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export default function InvoicePaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [invoice, setInvoice]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [paying, setPaying]     = useState(false)
  const [errors, setErrors]     = useState({})
  const [form, setForm] = useState({
    card_name: '',
    card_number: '',
    expiry: '',
    cvv: '',
  })

  const backTo = user?.role === 'client' ? '/portal' : '/invoices'

  useEffect(() => {
    invoicesApi.show(id)
      .then((res) => setInvoice(res.data.data))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false))
  }, [id])

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
      const res = await invoicesApi.payCard(id, {
        card_name:   form.card_name.trim(),
        card_number: form.card_number.replace(/\s/g, ''),
        expiry:      form.expiry,
        cvv:         form.cvv,
      })
      navigate(`/invoices/${id}/success`, { state: { result: res.data.data } })
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

  return (
    <div className="payment-page min-h-screen bg-background p-8 px-5">
      <div className="mx-auto max-w-[880px]">
        <Link to={backTo} className="mb-5 inline-block text-xs text-muted-foreground no-underline transition-colors hover:text-primary">
          ← Back to invoices
        </Link>

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[1fr_1.1fr]">
          {/* Order summary */}
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
                <span>${Number(item.amount).toFixed(2)}</span>
              </div>
            ))}

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[13px] font-medium">Total due</span>
              <span className="sd-gradient-text text-xl font-medium">${total.toFixed(2)}</span>
            </div>

            {invoice.due_date && (
              <div className="mt-2 text-[10px] text-muted-foreground">Due {invoice.due_date}</div>
            )}
          </Card>

          {/* Card form */}
          <Card className="sd-animate-in sd-animate-in--delay-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="sd-icon-chip size-8">
                <IconCreditCard size={16} />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Pay with card</div>
                <div className="text-[10px] text-muted-foreground">Secure checkout — sandbox test mode</div>
              </div>
              <Badge variant="info" style={{ marginLeft: 'auto' }}>Sandbox</Badge>
            </div>

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
            </div>

            {errors.form && (
              <div className="mt-2.5 text-[11px] text-destructive">{errors.form}</div>
            )}

            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-[10px] text-amber-700">
              Sandbox mode — no real charges. Use any test card details above.
            </div>

            <Button onClick={handlePay} loading={paying} size="lg" className="mt-4 w-full">
              Pay ${total.toFixed(2)}
            </Button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <IconLock size={12} />
              Encrypted sandbox payment — for demo purposes only
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
