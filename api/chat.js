import { get, post } from '@/utils/request.js'
import { config } from '@/utils/config.js'

export const createChatRequestApi = (payload) => post('/api/chat-requests', payload)
export const getChatRequestsApi = () => get('/api/chat-requests')
export const getChatRequestCandidatesApi = (params) => get('/api/chat-requests/candidates', params)
export const getChatRequestStatusApi = (targetUserId) => get(`/api/chat-requests/status/${targetUserId}`)
export const approveChatRequestApi = (id, payload) => post(`/api/chat-requests/${id}/approve`, payload)
export const rejectChatRequestApi = (id, payload) => post(`/api/chat-requests/${id}/reject`, payload)
export const getChatGroupsApi = () => get('/api/chat-groups')
export const getChatMessagesApi = (id, params = {}) => get(`/api/chat-groups/${id}/messages`, params)
export const sendChatMessageApi = (id, payload) => post(`/api/chat-groups/${id}/messages`, typeof payload === 'string' ? { content: payload } : payload)
export const getChatGroupMembersApi = (id) => get(`/api/chat-groups/${id}/members`)
export function uploadChatImageApi(id, filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: config.baseURL + `/api/chat-groups/${id}/media`,
      filePath,
      name: 'image',
      header: { Authorization: `Bearer ${uni.getStorageSync('AUTH_TOKEN')}` },
      success: result => {
        let body = {}
        try { body = JSON.parse(result.data || '{}') } catch (_) {}
        if (result.statusCode >= 200 && result.statusCode < 300) return resolve(body)
        reject(body || { error: '图片上传失败' })
      },
      fail: reject
    })
  })
}
export const addChatMemberApi = (id, userId) => post(`/api/chat-groups/${id}/members`, { userId })
