import { get, post } from '@/utils/request.js'

export const getNotificationsApi = (params = {}) => get('/api/notifications', params, badgeRequestOptions)
export const markNotificationsReadApi = (ids) => post('/api/notifications/read', { ids })
// A late response from a previous account must never log out the new session.
const badgeRequestOptions = { silent: true, skipAuthRedirect: true }
export const getUnreadCountApi = () => get('/api/notifications/unread-count', {}, badgeRequestOptions)
export const markProfileLikeViewedApi = (profileId, likeId) => post('/api/notifications/profile-likes/view', { profileId, likeId }, badgeRequestOptions)
export const markInteractionsReadApi = throughId => post('/api/notifications/interactions/read', { throughId }, badgeRequestOptions)
