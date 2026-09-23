import { del, get, post, put } from '@/utils/request.js'

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

// 修改自己发布的需求 / 服务（字段约束与发布一致，改完会重新上架）
export const updateDemandHallPostApi = (id, payload) => put(`/api/demand-hall/posts/${id}`, payload)

// 结单（发布者标记已完成）
export const closeDemandHallPostApi = (id) => post(`/api/demand-hall/posts/${id}/close`)

// 重新上架已下架的信息
export const reopenDemandHallPostApi = (id) => post(`/api/demand-hall/posts/${id}/reopen`)

// 软删除自己的帖子
export const deleteDemandHallPostApi = (id) => del(`/api/demand-hall/posts/${id}`)

// 收藏 / 取消收藏
export const toggleDemandHallCollectApi = (id) => post(`/api/demand-hall/posts/${id}/collect`)

// 热门标签与一级分类白名单
export const getDemandHallHotTagsApi = (params = {}) => get('/api/demand-hall/tags/hot', params)

// 板块统计：需求数 / 服务数 / 报名数 / 各分类数量
export const getDemandHallStatsApi = () => get('/api/demand-hall/stats')

// 我的发布 / 我的报名 / 我的收藏（role: published | applied | collected）
export const getMyDemandHallPostsApi = (params = {}) => get('/api/demand-hall/mine', params)

// 某个帖子的报名列表（发布者可见全部，其他人只能看到自己那条）
export const getDemandHallApplicationsApi = (id) => get(`/api/demand-hall/posts/${id}/applications`)

// 报名 / 接单
export const createDemandHallApplicationApi = (id, payload) => post(`/api/demand-hall/posts/${id}/applications`, payload)

// 处理报名：{ action: 'accept' | 'reject' | 'cancel' }
export const handleDemandHallApplicationApi = (id, payload) => post(`/api/demand-hall/applications/${id}/handle`, payload)

/* ============ 担保交易（资金托管） ============ */

export const getDemandHallOrdersApi = (params = {}) => get('/api/demand-hall/orders', params)
// 工作台看板：累计赚取 / 支出 / 进行中单量由服务端按全量订单聚合
export const getDemandHallOrderSummaryApi = () => get('/api/demand-hall/orders/summary')
// 订单详情：附带原信息快照、交易对象与「需要认证服务者」的校验结果
export const getDemandHallOrderApi = (id) => get(`/api/demand-hall/orders/${id}`)

// 发布者选定接单方后发起托管：{ postId, counterpartyUserId, amount?, remark? }
export const createDemandHallOrderApi = (payload) => post('/api/demand-hall/orders', payload)

// 托管流转：{ action: 'fund' | 'deliver' | 'confirm' | 'cancel' | 'refund' | 'remind', note? }
export const updateDemandHallOrderStatusApi = (id, payload) => post(`/api/demand-hall/orders/${id}/status`, payload)

// 卖家提交交付说明与凭证：{ note?, evidence?: [{ url, name? }] }
export const submitDemandHallOrderDeliveryApi = (id, payload) => post(`/api/demand-hall/orders/${id}/delivery`, payload)

/**
 * 交付凭证上传：复用社区图片上传通道（multipart/form-data，字段名 images）。
 * 后端统一收口到同一个存储，需求市场不再单独维护一套上传配置。
 */
export const DEMAND_HALL_UPLOAD_URL = '/api/community/upload'
