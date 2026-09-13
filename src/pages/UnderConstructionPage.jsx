import { Link } from 'react-router-dom'
import { IconTools, IconArrowLeft } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import FloatPageHeader from '../components/layout/FloatPageHeader'
import { Button } from '@/components/ui/button'

export default function UnderConstructionPage({ title, description }) {
  return (
    <PageWrapper
      pageActions={
        <FloatPageHeader title={title} subtitle={description} />
      }
    >
      <div className="sd-page sd-page--team">
        <div className="sd-card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconTools size={26} stroke={1.5} />
          </div>
          <div className="max-w-sm">
            <p className="text-sm font-semibold">This page is under construction</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {title} is planned for a future session. Check back soon — or head back to your dashboard for now.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link to="/">
              <IconArrowLeft size={15} />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </PageWrapper>
  )
}
