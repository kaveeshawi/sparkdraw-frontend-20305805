import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconReceipt } from '@tabler/icons-react'
import Modal from '../legacy-ui/Modal'
import Badge from '../legacy-ui/Badge'
import Button from '../legacy-ui/Button'
import useAuthStore from '../../store/authStore'
import { invoicesApi } from '../../services/api'

const STATUS_VARIANTS = {
  draft: 'violet', sent: 'info', paid: 'success', overdue: 'danger',
}

export default function InvoiceDetailModal({ open, onClose, invoiceId, onUpdated }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [invoice, setInvoice]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [sending, setSending]     = useState(false)

  const isAdminOrPm = ['admin', 'pm'].includes(user?.role)
  const isClient    = user?.role === 'client'

  useEffect(() => {
    if (!open || !invoiceId) return
    setLoading(true)
    invoicesApi.show(invoiceId)
      .then((res) => setInvoice(res.data.data))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  const handleSend = async () => {
    setSending(true)
    try {
      await invoicesApi.send(invoiceId)
      const res = await invoicesApi.show(invoiceId)
      setInvoice(res.data.data)
      onUpdated?.()
    } finally {
      setSending(false)
    }
  }

  const handlePay = () => {
    onClose?.()
    navigate(`/invoices/${invoiceId}/pay`)
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      icon={IconReceipt}
      title={invoice?.invoice_number || 'Invoice'}
      subtitle={invoice ? `Created ${new Date(invoice.created_at).toLocaleDateString('en-GB')}` : ''}
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="cancel" onClick={onClose}>Close</Button>
          {isAdminOrPm && invoice?.status === 'draft' && (
            <Button onClick={handleSend} loading={sending}>Send to client</Button>
          )}
          {(isClient || isAdminOrPm) && ['sent', 'overdue'].includes(invoice?.status) && (
            <Button onClick={handlePay}>
              Pay now
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <div style={{ fontSize: '12px', color: 'var(--text-hint)' }}>Loading…</div>
      ) : !invoice ? (
        <div style={{ fontSize: '12px', color: 'var(--text-hint)' }}>Invoice not found.</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Badge variant={STATUS_VARIANTS[invoice.status] || 'muted'}>{invoice.status}</Badge>
            {invoice.due_date && (
              <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>Due {invoice.due_date}</span>
            )}
          </div>

          <div style={{ background: 'var(--card-bg-soft)', borderRadius: '9px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
              {invoice.client_name || invoice.client?.company_name}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-hint)', marginTop: '2px' }}>
              {invoice.project_name || invoice.project?.name}
              {invoice.client?.contact_email && ` · ${invoice.client.contact_email}`}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['Description', 'Qty', 'Rate', 'Amount'].map((h) => (
                  <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(invoice.line_items || []).map((item, i) => (
                <tr key={i} style={{ borderBottom: '0.5px solid var(--border-inner)' }}>
                  <td style={{ padding: '8px 6px', fontSize: '11px' }}>{item.description}</td>
                  <td style={{ padding: '8px 6px', fontSize: '11px' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 6px', fontSize: '11px' }}>${Number(item.rate).toFixed(2)}</td>
                  <td style={{ padding: '8px 6px', fontSize: '11px', fontWeight: 500 }}>${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)' }}>Subtotal: ${Number(invoice.subtotal ?? invoice.total).toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)' }}>Tax (0%): $0.00</div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Total: ${Number(invoice.total ?? invoice.amount).toFixed(2)}
            </div>
          </div>

          {invoice.notes && (
            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 500 }}>Notes: </span>{invoice.notes}
            </div>
          )}

          {(isClient || isAdminOrPm) && ['sent', 'overdue'].includes(invoice.status) && (
            <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--warning-text)', background: 'var(--warning-fill)', padding: '8px 10px', borderRadius: '8px' }}>
              Sandbox test mode — card payment only, no real charges.
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
