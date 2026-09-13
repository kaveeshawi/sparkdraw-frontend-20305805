import PageHeader from './PageHeader'

/**
 * Team-style floating page header — title/subtitle left, optional actions right.
 * Pass as PageWrapper `pageActions`.
 */
export default function FloatPageHeader({ title, subtitle, children }) {
  return (
    <div className="sd-float-page-header__bar sd-page-toolbar sd-page-toolbar--team">
      <PageHeader title={title} subtitle={subtitle} />
      {children ? <div className="sd-page-actions">{children}</div> : null}
    </div>
  )
}
