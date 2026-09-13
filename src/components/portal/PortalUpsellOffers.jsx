import { useEffect, useState } from 'react'
import { IconCheck, IconSparkles, IconX } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import { portalApi } from '../../services/api'

function formatServiceType(value) {
  return String(value || 'service')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function OfferCard({ offer, busyId, onRespond }) {
  const status = offer.client_status
  const settled = status === 'accepted' || status === 'declined'
  const conf = Math.round(Number(offer.confidence || 0) * 100)

  return (
    <article className="sd-portal-offer">
      <div className="sd-portal-offer__top">
        <div className="min-w-0">
          <p className="sd-portal-offer__eyebrow">Recommended for you</p>
          <h3 className="sd-portal-offer__title">{formatServiceType(offer.service_type)}</h3>
          <p className="sd-portal-offer__desc">
            Your agency thinks this add-on fits your project right now.
            {conf > 0 ? ` Match confidence ${conf}%.` : ''}
          </p>
        </div>
        <Badge
          variant={
            status === 'accepted' ? 'success' : status === 'declined' ? 'outline' : 'default'
          }
          className="capitalize shrink-0"
        >
          {status === 'shown' ? 'New' : status}
        </Badge>
      </div>

      {!settled ? (
        <div className="sd-portal-offer__actions">
          <Button
            type="button"
            size="sm"
            disabled={busyId === offer.id}
            onClick={() => onRespond(offer.id, 'accept')}
          >
            <IconCheck size={14} stroke={1.5} />
            I&apos;m interested
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busyId === offer.id}
            onClick={() => onRespond(offer.id, 'decline')}
          >
            <IconX size={14} stroke={1.5} />
            Not now
          </Button>
        </div>
      ) : (
        <p className="sd-portal-offer__note">
          {status === 'accepted'
            ? 'Thanks — your agency will follow up on this offer.'
            : 'Noted. You can ask your agency about other options anytime.'}
        </p>
      )}
    </article>
  )
}

export default function PortalUpsellOffers({ slug, projectId }) {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const fetchOffers = () => {
    if (!slug || !projectId) {
      setOffers([])
      setLoading(false)
      return
    }
    setLoading(true)
    portalApi
      .listUpsells(slug, projectId)
      .then((res) => setOffers(res.data.data || []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOffers()
  }, [slug, projectId])

  const respond = async (id, action) => {
    setBusyId(id)
    try {
      if (action === 'accept') {
        await portalApi.acceptUpsell(slug, projectId, id)
        toast.success('Interest sent to your agency')
      } else {
        await portalApi.declineUpsell(slug, projectId, id)
        toast.success('Offer declined')
      }
      fetchOffers()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update offer'))
    } finally {
      setBusyId(null)
    }
  }

  if (!projectId) return null

  if (loading) {
    return (
      <div className="mb-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    )
  }

  if (!offers.length) return null

  const openCount = offers.filter((o) => o.client_status === 'shown').length

  return (
    <section className={cn('sd-portal-offers mb-4')} aria-label="Service offers">
      <div className="sd-portal-offers__head">
        <span className="sd-portal-offers__icon" aria-hidden>
          <IconSparkles size={18} stroke={1.5} />
        </span>
        <div>
          <h2 className="sd-portal-offers__title">Offers for you</h2>
          <p className="sd-portal-offers__sub">
            {openCount > 0
              ? `${openCount} new recommendation${openCount === 1 ? '' : 's'} from your agency`
              : 'Your responses on agency recommendations'}
          </p>
        </div>
      </div>
      <div className="sd-portal-offers__list">
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            busyId={busyId}
            onRespond={respond}
          />
        ))}
      </div>
    </section>
  )
}
