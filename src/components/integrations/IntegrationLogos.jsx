import googleLogo from '../../assets/integrations/google.svg'
import googleDriveLogo from '../../assets/integrations/google-drive.svg'
import microsoftLogo from '../../assets/integrations/microsoft.svg'
import zoomLogo from '../../assets/integrations/zoom.svg'
import stripeLogo from '../../assets/integrations/stripe.svg'
import paypalLogo from '../../assets/integrations/paypal.svg'
import slackLogo from '../../assets/integrations/slack.svg'
import wiseLogo from '../../assets/integrations/wise.svg'
import gmailLogo from '../../assets/integrations/gmail.svg'

/**
 * Official multi-color brand SVGs (downloaded from gilbarbara/logos / simple-icons).
 * Google Meet + Teams cards use the parent brand marks (G / Microsoft squares)
 * to match the Integrations catalog mock.
 */
const LOGO = {
  mail_smtp: { src: gmailLogo },
  google_meet: { src: googleLogo },
  microsoft_teams: { src: microsoftLogo },
  zoom: { src: zoomLogo },
  stripe: { src: stripeLogo },
  paypal: { src: paypalLogo },
  slack: { src: slackLogo },
  google_drive: { src: googleDriveLogo },
  // Wise mark is lime in the SVG — tile it on brand green with dark glyph
  wise: { src: wiseLogo, tile: '#9FE870', glyph: '#163300' },
}

export function IntegrationLogo({ provider }) {
  const entry = LOGO[provider] || LOGO.mail_smtp

  return (
    <div
      className={`sd-int-logo sd-int-logo--bordered${entry.tile ? ' sd-int-logo--filled' : ''}`}
      style={entry.tile ? { background: entry.tile, borderColor: 'transparent' } : undefined}
      aria-hidden
    >
      {entry.glyph ? (
        <span
          className="sd-int-logo__glyph"
          style={{
            backgroundColor: entry.glyph,
            WebkitMaskImage: `url(${entry.src})`,
            maskImage: `url(${entry.src})`,
          }}
        />
      ) : (
        <img src={entry.src} alt="" width={28} height={28} draggable={false} />
      )}
    </div>
  )
}
