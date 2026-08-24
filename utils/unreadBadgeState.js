const TAB_BAR_ROUTES = new Set([
  'pages/index/index360',
  'pages/notice/notice',
  'pages/my/myLifeShow/myLifeShow'
])

export function formatUnreadBadge(total) {
  const count = Number(total || 0)
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}

export function shouldUpdateTabBarBadge(route) {
  return TAB_BAR_ROUTES.has(String(route || '').replace(/^\/+/, ''))
}
