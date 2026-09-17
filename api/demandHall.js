import { del, get, post } from '@/utils/request.js'

/**
 * 需求市场接口
 * 后端: routes/demandHall.js（挂载于 /api/demand-hall）
 *
 * 板块包含两种角色：
 *  - demand  求助 / 找帮手：我需要什么（带赏金）
 *  - service 提供 / 找活儿：我能干什么（带标价）
 */

/**
 * 帖子列表
 * @param {Object} params { type, category, tag, keyword, locationType, sort, latitude, longitude, page, pageSize }
 *   type: demand | service（不传为全部）
 *   sort: latest(最新发布) | budget(预算最高) | distance(距离最近，需带经纬度)
 */
export const getDemandHallPostsApi = (params = {}) => get('/api/demand-hall/posts', params)

// 帖子详情（后端会累加浏览量，返回 isOwner / hasApplied / myApplicationStatus）
export const getDemandHallPostApi = (id) => get(`/api/demand-hall/posts/${id}`)

// 发布需求或服务
export const createDemandHallPostApi = (payload) => post('/api/demand-hall/posts', payload)

// 结单（发布者标记已完成）
export const closeDemandHallPostApi = (id) => post(`/api/demand-hall/posts/${id}/close`)

// 软删除自己的帖子
export const deleteDemandHallPostApi = (id) => del(`/api/demand-hall/posts/${id}`)

// 收藏 / 取消收藏
export const toggleDemandHallCollectApi = (id) => post(`/api/demand-hall/posts/${id}/collect`)

// 热门标签与一级分类白名单
export const getDemandHallHotTagsApi = (params = {}) => get('/api/demand-hall/tags/hot', params)

// 板块统计：需求数 / 服务数 / 报名数 / 各分类数量
export const getDemandHallStatsApi = () => get('/api/demand-hall/stats')

// 我的发布 / 我的报名（role: published | applied）
export const getMyDemandHallPostsApi = (params = {}) => get('/api/demand-hall/mine', params)

// 某个帖子的报名列表（发布者可见全部，其他人只能看到自己那条）
export const getDemandHallApplicationsApi = (id) => get(`/api/demand-hall/posts/${id}/applications`)

// 报名 / 接单
export const createDemandHallApplicationApi = (id, payload) => post(`/api/demand-hall/posts/${id}/applications`, payload)

// 处理报名：{ action: 'accept' | 'reject' | 'cancel' }
export const handleDemandHallApplicationApi = (id, payload) => post(`/api/demand-hall/applications/${id}/handle`, payload)

/* ============ 担保交易（资金托管） ============ */

export const getDemandHallOrdersApi = () => get('/api/demand-hall/orders')
export const getDemandHallOrderApi = (id) => get(`/api/demand-hall/orders/${id}`)

// 发布者选定接单方后发起托管：{ postId, counterpartyUserId, amount?, remark? }
export const createDemandHallOrderApi = (payload) => post('/api/demand-hall/orders', payload)

// 托管流转：{ action: 'fund' | 'deliver' | 'confirm' | 'cancel' | 'refund', note? }
export const updateDemandHallOrderStatusApi = (id, payload) => post(`/api/demand-hall/orders/${id}/status`, payload)
