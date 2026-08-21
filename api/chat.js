import { get, post } from '@/utils/request.js'

export const createChatRequestApi = (payload) => post('/api/chat-requests', payload)
export const getChatRequestsApi = () => get('/api/chat-requests')
export const getChatRequestStatusApi = (targetUserId) => get(`/api/chat-requests/status/${targetUserId}`)
export const approveChatRequestApi = (id, payload) => post(`/api/chat-requests/${id}/approve`, payload)
export const rejectChatRequestApi = (id, payload) => post(`/api/chat-requests/${id}/reject`, payload)
export const getChatGroupsApi = () => get('/api/chat-groups')
export const getChatMessagesApi = (id) => get(`/api/chat-groups/${id}/messages`)
export const sendChatMessageApi = (id, content) => post(`/api/chat-groups/${id}/messages`, { content })
export const addChatMemberApi = (id, userId) => post(`/api/chat-groups/${id}/members`, { userId })
