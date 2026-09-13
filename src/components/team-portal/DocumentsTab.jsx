import { useState } from 'react'
import { IconFileText, IconEye, IconDownload, IconDotsVertical, IconUpload } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Panel, DataTable, FilterPills } from './shared'

const CATEGORIES = [
  { id: 'All', label: 'All' },
  { id: 'Employment', label: 'Employment' },
  { id: 'Identity', label: 'Identity' },
  { id: 'Payroll', label: 'Payroll' },
  { id: 'Certificates', label: 'Certificates' },
  { id: 'Other', label: 'Other' },
]

export default function DocumentsTab({ data }) {
  const [filter, setFilter] = useState('All')
  const docs = filter === 'All' ? data.documents : data.documents.filter((d) => d.category === filter)

  return (
    <div className="sd-dash-v2" style={{ gap: '1rem' }}>
      <Panel
        title="Documents"
        desc="Contracts, payslips, certificates and more"
        filters={<FilterPills options={CATEGORIES} value={filter} onChange={setFilter} />}
        action={
          <button type="button" className="sd-btn-gradient rounded-full px-4 py-2 text-[12px] font-medium text-white border-0">
            <IconUpload size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />Upload Document
          </button>
        }
      >
        <DataTable columns={['Document Name', 'Type', 'Uploaded', 'Updated', 'Actions']}>
          {docs.map((d, i) => (
            <tr key={i}>
              <td>
                <span className="sd-dash-v2__project-link">
                  <IconFileText size={16} style={{ color: 'var(--muted-foreground)' }} />
                  <strong>{d.name}</strong>
                </span>
              </td>
              <td><Badge variant="outline">{d.category}</Badge></td>
              <td>{d.uploaded}</td>
              <td>{d.updated}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button type="button" className="sd-dash-v2__row-menu" title="View"><IconEye size={14} /></button>
                  <button type="button" className="sd-dash-v2__row-menu" title="Download"><IconDownload size={14} /></button>
                  <button type="button" className="sd-dash-v2__row-menu" title="More"><IconDotsVertical size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  )
}
