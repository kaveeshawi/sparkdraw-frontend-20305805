import { useEffect, useState } from 'react'
import { IconReceipt } from '@tabler/icons-react'
import Modal from '../legacy-ui/Modal'
import { Input, Select, Textarea } from '../legacy-ui/Input'
import Button from '../legacy-ui/Button'
import { clientsApi, projectsApi, invoicesApi } from '../../services/api'

const EMPTY_LINE = { description: '', quantity: '1', rate: '' }

export default function NewInvoiceModal({ open, onClose, onCreated }) {
  const [clients, setClients]       = useState([])
  const [projects, setProjects]   = useState([])
  const [clientId, setClientId]   = useState('')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate]     = useState('')
  const [notes, setNotes]         = useState('')
  const [lineItems, setLineItems] = useState([{ ...EMPTY_LINE }])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]       = useState({})

  useEffect(() => {
    if (!open) return
    setClientId('')
    setProjectId('')
    setDueDate('')
    setNotes('')
    setLineItems([{ ...EMPTY_LINE }])
    setErrors({})
    clientsApi.index().then((res) => setClients(res.data.data || [])).catch(() => {})
    projectsApi.index().then((res) => {
      const raw = res.data.data
      setProjects(Array.isArray(raw) ? raw : (raw?.projects ?? []))
    }).catch(() => {})
  }, [open])

  const filteredProjects = projects.filter(
    (p) => !clientId || String(p.client_id ?? p.client?.id) === String(clientId)
  )

  const updateLine = (index, field, value) => {
    setLineItems((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const addLine = () => setLineItems((rows) => [...rows, { ...EMPTY_LINE }])
  const removeLine = (index) => setLineItems((rows) => rows.filter((_, i) => i !== index))

  const subtotal = lineItems.reduce((sum, row) => {
    const qty  = parseFloat(row.quantity) || 0
    const rate = parseFloat(row.rate) || 0
    return sum + qty * rate
  }, 0)

  const handleSubmit = async () => {
    const e = {}
    if (!clientId) e.client_id = 'Client is required'
    if (!projectId) e.project_id = 'Project is required'
    if (lineItems.every((r) => !r.description.trim())) e.line_items = 'At least one line item required'
    if (Object.keys(e).length) { setErrors(e); return }

    setSubmitting(true)
    try {
      await invoicesApi.store({
        client_id:  Number(clientId),
        project_id: Number(projectId),
        due_date:   dueDate || null,
        notes:      notes || null,
        line_items: lineItems
          .filter((r) => r.description.trim())
          .map((r) => ({
            description: r.description,
            quantity:    parseFloat(r.quantity) || 1,
            rate:        parseFloat(r.rate) || 0,
          })),
      })
      onCreated?.()
      onClose?.()
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      icon={IconReceipt}
      title="New invoice"
      subtitle="Create an invoice with line items"
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={submitting}>Create invoice</Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <Select label="Client" required value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId('') }} error={errors.client_id}>
          <option value="">— Select client —</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </Select>
        <Select label="Project" required value={projectId} onChange={(e) => setProjectId(e.target.value)} error={errors.project_id}>
          <option value="">— Select project —</option>
          {filteredProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: '56px' }} />

      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Line items</div>

      {lineItems.map((row, i) => {
        const amount = (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0)
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
            <Input placeholder="Description" value={row.description} onChange={(e) => updateLine(i, 'description', e.target.value)} />
            <Input type="number" min="0" placeholder="Qty" value={row.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
            <Input type="number" min="0" placeholder="Rate" value={row.rate} onChange={(e) => updateLine(i, 'rate', e.target.value)} />
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', padding: '8px 0' }}>
              ${amount.toFixed(2)}
            </div>
            {lineItems.length > 1 && (
              <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: 'var(--danger-text)', cursor: 'pointer', fontSize: '11px' }}>✕</button>
            )}
          </div>
        )
      })}

      <button onClick={addLine} style={{ fontSize: '10px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px' }}>
        + Add line item
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '8px', borderTop: '0.5px solid var(--border-inner)' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>Subtotal</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>${subtotal.toFixed(2)}</span>
      </div>
    </Modal>
  )
}
