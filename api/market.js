import { get, post } from '@/utils/request.js'

export const getMarketPostsApi = (params) => get('/api/market/posts', params, { silent: true })
export const getMarketPostApi = (id) => get(`/api/market/posts/${id}`, {}, { silent: true })
export const toggleMarketLikeApi = (id) => post(`/api/market/posts/${id}/like`, {}, { silent: true })
export const getMarketCommentsApi = (id, params) => get(`/api/market/posts/${id}/comments`, params, { silent: true })
export const getMarketCommentRepliesApi = (postId, rootCommentId, params) => get(`/api/market/posts/${postId}/comments/${rootCommentId}/replies`, params, { silent: true })
export const addMarketCommentApi = (id, payload) => post(`/api/market/posts/${id}/comments`, payload, { silent: true })
export const getMarketBidsApi = (id, params) => get(`/api/market/posts/${id}/bids`, params, { silent: true })
export const placeMarketBidApi = (id, amount) => post(`/api/market/posts/${id}/bids`, { amount }, { silent: true })
