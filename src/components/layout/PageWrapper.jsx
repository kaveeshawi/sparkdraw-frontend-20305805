import AgencyShell from './AgencyShell'

export default function PageWrapper({
  children,
  breadcrumb = [],
  pageTitle,
  pageSubtitle,
  topbarAction,
  pageActions,
  onNewProject,
}) {
  return (
    <AgencyShell
      breadcrumb={breadcrumb}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      topbarAction={topbarAction}
      pageActions={pageActions}
      onNewProject={onNewProject}
    >
      {children}
    </AgencyShell>
  )
}
