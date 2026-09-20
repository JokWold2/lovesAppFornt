// Shared by list cards and the detail page; callers pass server-adjusted time.
export function auctionStateAt(auction, now) {
  if (!auction) return ''
  return now < Date.parse(auction.startsAt) ? 'scheduled' : now >= Date.parse(auction.endsAt) ? 'ended' : 'live'
}
export function auctionCountdown(auction, now, t) {
  const state = auctionStateAt(auction, now)
  if (!state) return ''
  if (state === 'ended') return t('marketDetail.ended')
  const end = Date.parse(state === 'scheduled' ? auction.startsAt : auction.endsAt)
  if (!Number.isFinite(end)) return ''
  const total = Math.max(0, Math.floor((end - now) / 1000))
  const days = Math.floor(total / 86400)
  const pad = value => String(value).padStart(2, '0')
  const time = `${pad(Math.floor(total % 86400 / 3600))}:${pad(Math.floor(total % 3600 / 60))}:${pad(total % 60)}`
  return days ? t('marketDetail.dayCountdown', { days, time }) : time
}
