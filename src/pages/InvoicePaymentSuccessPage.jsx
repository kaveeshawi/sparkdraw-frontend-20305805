import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useLocation, Link } from 'react-router-dom'
import { invoicesApi } from '../services/api'
import Card from '../components/legacy-ui/Card'
import Badge from '../components/legacy-ui/Badge'
import useAuthStore from '../store/authStore'

export default function InvoicePaymentSuccessPage() {
  const { id } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [result, setResult] = useState(location.state?.result ?? null)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(!location.state?.result)
  const { user } = useAuthStore()
  const backTo = user?.role === 'client' ? '/portal' : '/invoices'

  useEffect(() => {
    if (location.state?.result) return

    const token = searchParams.get('token')
    invoicesApi
      .paymentSuccess(id, token)
      .then((res) => setResult(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Payment verification failed'))
      .finally(() => setLoading(false))
  }, [id, searchParams, location.state])

  return (
    <div className="payment-page flex min-h-screen items-center justify-center bg-background p-5">
      <Card className="w-full max-w-[420px] text-center sd-animate-in" style={{ textAlign: 'center' }}>
        {loading ? (
          <div className="text-[13px] text-muted-foreground">Verifying payment…</div>
        ) : error ? (
          <>
            <div className="mb-2 text-base font-medium text-destructive">Payment failed</div>
            <div className="text-xs text-muted-foreground">{error}</div>
          </>
        ) : (
          <>
            <Badge variant="success" style={{ marginBottom: '12px' }}>Paid</Badge>
            <div className="mb-1.5 text-lg font-medium text-foreground">
              Payment successful
            </div>
            <div className="mb-4 text-xs text-muted-foreground">
              {result?.invoice_number} has been paid successfully.
            </div>
            {result?.transaction_id && (
              <div className="text-[10px] text-muted-foreground">
                Transaction: {result.transaction_id}
              </div>
            )}
          </>
        )}
        <Link to={backTo} className="mt-5 inline-block text-xs text-primary">
          Back to invoices
        </Link>
      </Card>
    </div>
  )
}
