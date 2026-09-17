/**
 * 社区话题广场 / 榜单的共用跳转与展示助手。
 * 页面只负责渲染，路由拼装与纯计算放在这里，便于用 node:test 直接覆盖。
 */
import { isLoggedIn } from './auth.js'

export const COMMUNITY_INDEX_ROUTE = '/pages/community/index'
export const COMMUNITY_TOPICS_ROUTE = '/pages/community/topics'
export const COMMUNITY_TOPIC_DETAIL_ROUTE = '/pages/community/topicDetail'
export const COMMUNITY_LEADERBOARD_ROUTE = '/pages/community/leaderboard'
export const COMMUNITY_LOGIN_ROUTE = '/pages/login/login360'
// 社区帖子详情页尚未落地，点击帖子时统一走这个地址并在失败时提示，详情页上线后无需改页面。
export const COMMUNITY_POST_DETAIL_ROUTE = '/pages/post/detail'
export const COMMUNITY_PROFILE_ROUTE = '/pages/searchPerson/personShow/personShow'

const DEFAULT_AVATAR_SEED = 'community'

export function communityTopicRoute(name) {
  return `${COMMUNITY_TOPIC_DETAIL_ROUTE}?name=${encodeURIComponent(String(name ?? ''))}`
}

export function communityPostRoute(postId) {
  return `${COMMUNITY_POST_DETAIL_ROUTE}?id=${encodeURIComponent(String(postId ?? ''))}`
}

// 候选人资料页需要 profiles.id，没有资料页的账号（只有 userId）无法跳转。
export function communityProfileRoute(profileId) {
  return `${COMMUNITY_PROFILE_ROUTE}?id=${encodeURIComponent(String(profileId ?? ''))}`
}

export function communityLoginRoute(redirect = '') {
  return redirect ? `${COMMUNITY_LOGIN_ROUTE}?redirect=${encodeURIComponent(redirect)}` : COMMUNITY_LOGIN_ROUTE
}

// tab 切换页面的 url 里可能带着已编码的参数，解码失败时退回原值，避免页面白屏。
export function decodeCommunityParam(value) {
  if (typeof value !== 'string' || !value) return ''
  try {
    return decodeURIComponent(value)
  } catch (_) {
    return value
  }
}

export function formatCommunityNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  if (number >= 10000) return `${(number / 10000).toFixed(1)}万`
  if (number >= 1000) return `${(number / 1000).toFixed(1)}k`
  return String(number)
}

export function communityAvatar(name) {
  const seed = typeof name === 'string' && name.trim() ? name.trim() : DEFAULT_AVATAR_SEED
  return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(seed)}`
}

export function communityAvatarOf(item, key = 'username') {
  const avatar = typeof item?.avatar === 'string' ? item.avatar.trim() : ''
  return avatar || communityAvatar(item?.[key])
}

// 前三名单独用金银铜样式，第 4 名往后走普通排名样式。
export function rankTier(rank) {
  const value = Number(rank)
  if (value === 1) return 'gold'
  if (value === 2) return 'silver'
  if (value === 3) return 'bronze'
  return 'plain'
}

// 顶部“数据每 X 分钟更新一次”的补充文案：只有拿到服务端时间才展示更新时刻。
export function formatCommunityTime(timestamp) {
	const value = Number(timestamp)
	if (!Number.isFinite(value) || value <= 0) return ''
	const date = new Date(value)
	const pad = number => String(number).padStart(2, '0')
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 关注 / 点赞这类需要登录的操作统一走这里：
 * 未登录时提示并跳转登录页，返回 false 让调用方直接结束。
 */
export function ensureCommunityLogin(t, redirect = '') {
  if (isLoggedIn()) return true
  uni.showToast({ title: t('community.loginRequired'), icon: 'none' })
  setTimeout(() => {
    uni.navigateTo({ url: communityLoginRoute(redirect), fail: () => {} })
  }, 600)
  return false
}
