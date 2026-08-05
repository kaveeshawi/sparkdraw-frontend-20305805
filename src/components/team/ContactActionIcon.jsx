const BRAND_LOGOS = {
  whatsapp: '/whatsapp.svg',
  teams: '/microsoft-teams.svg',
}

export default function ContactActionIcon({ actionId, icon: Icon, size = 18, stroke = 1.65 }) {
  const logoSrc = BRAND_LOGOS[actionId]

  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt=""
        width={size}
        height={size}
        className="sd-team-action-btn__brand-logo"
        draggable={false}
      />
    )
  }

  if (!Icon) return null

  return <Icon size={size} stroke={stroke} />
}
