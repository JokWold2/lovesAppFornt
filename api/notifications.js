import { get, post } from '@/utils/request.js'

export const getNotificationsApi = (params = {}) => get('/api/notifications', params)
export const markNotificationsReadApi = (ids) => post('/api/notifications/read', { ids })
export const getUnreadCountApi = () => get('/api/notifications/unread-count')
