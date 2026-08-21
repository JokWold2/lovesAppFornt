import { get, post } from '@/utils/request.js'

export const getMarketPostsApi = (params) => get('/api/market/posts', params)
export const getMarketPostApi = (id) => get(`/api/market/posts/${id}`)
export const toggleMarketLikeApi = (id) => post(`/api/market/posts/${id}/like`)
export const getMarketCommentsApi = (id, params) => get(`/api/market/posts/${id}/comments`, params)
export const getMarketCommentRepliesApi = (postId, rootCommentId, params) => get(`/api/market/posts/${postId}/comments/${rootCommentId}/replies`, params)
export const addMarketCommentApi = (id, payload) => post(`/api/market/posts/${id}/comments`, payload)
