const TAB_BAR_ROUTES = new Set([
  'pages/index/index360',
  'pages/notice/notice',
  'pages/my/myLifeShow/myLifeShow'
])

export function isTabBarRoute(route) {
  return TAB_BAR_ROUTES.has(String(route || '').replace(/^\/+/, ''))
}
