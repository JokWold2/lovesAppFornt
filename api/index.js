import { post, get, put, del } from '../utils/request.js'
import { config } from '../utils/config.js'

/**
 * API 接口统一管理
 * 每个方法返回一个 Promise，resolve 的是后端返回的数据（request 已做了解包）
 */

// ===== 认证相关 =====

/**
 * 登录
 * @param {string} email    邮箱
 * @param {string} password 密码
 * @param {Object} [opts]
 * @param {boolean} [opts.silent] true 则不自动 toast 错误（用于自动登录静默尝试）
 */
export function loginApi(email, password, opts = {}) {
  return post('/api/auth/login', { email, password }, { noAuth: true, ...opts })
}

/**
 * App 原生 Google 授权完成后，将授权结果交给后端校验并换取项目 JWT。
 */
export function socialLoginApi(provider, authResult) {
  return post('/api/auth/social-login', { provider, authResult }, { noAuth: true })
}

/**
 * 注册
 * @param {string} email    邮箱
 * @param {string} password 密码
 * @param {string} code     邮箱验证码
 */
export function registerApi(email, password, code) {
  return post('/api/auth/register', { email, password, code }, { noAuth: true })
}

/**
 * 校验当前 token 是否还有效
 *  - 200 → 有效，resolve({ valid: true, user })
 *  - 401 → 无效/过期，reject
 *  - 网络错误 → reject（前端会按未登录处理）
 */
export function validateTokenApi() {
  // 启动阶段由 App.vue 决定如何恢复或清理会话，不能让请求层抢先跳转。
  return get('/api/auth/validate', {}, { silent: true, skipAuthRedirect: true })
}

// ===== 用户相关（示例，按需扩展） =====

export function getUserInfoApi() {
  return get('/api/user/info')
}

export function getUserListApi(params) {
  return get('/api/user/list', params)
}

// ===== 拍卖相关 =====
// 后端接口上线后，页面数据源可直接改用这些方法。
export function getAuctionListApi(params) {
  return get('/api/auctions', params)
}

export function getAuctionDetailApi(id) {
  return get(`/api/auctions/${id}`)
}

export function placeAuctionBidApi(id, payload) {
  return post(`/api/auctions/${id}/bids`, payload)
}

// ===== 个人资料 =====

/**
 * 获取当前登录用户的个人资料 + 事业经历
 * 后端: GET /api/profile (需要登录)
 * 返回: { profile: {...} | null, careers: [] }
 */
export function getMyProfileApi() {
  return get('/api/profile')
}

/**
 * 提交/更新个人资料（upsert）
 * 后端: POST /api/profile (需要登录)
 * @param {Object} payload 前端字段全部 camelCase，后端会自己映射成 snake_case
 *   必含 careers 数组，其它字段可选
 */
export function submitMyProfileApi(payload) {
  return post('/api/profile', payload)
}

// ===== 搜索候选 =====

/**
 * 搜索候选人
 * 后端: POST /api/search (需要登录)
 * 入参直接对应 searchController.searchCandidates 需要的字段：
 *   name, gender, generation, status, preferredCountries,
 *   ageMin, ageMax, heightMin, heightMax,
 *   topGun, jobs, faithLife, wantBlessing2026,
 *   tools: { hands, yinyang, fiveElements, enneagram, mbti },
 *   page, pageSize
 * 返回: { total, page, pageSize, results: [...] }
 */
export function searchCandidatesApi(payload) {
  return post('/api/search', payload)
}

/**
 * 获取单个候选人的公开资料（详情页用）
 * 后端: GET /api/search/candidates/:id (需要登录)
 * @param {number|string} id 候选人 profiles.id（来自搜索结果列表中的 item.id）
 * 返回: { profile: {...} }
 */
export function getCandidateProfileApi(id) {
  return get(`/api/search/candidates/${id}`)
}

// ===== 朋友圈相关 =====

/**
 * 上传图片（可批量），返回图片 URL 数组
 * 后端: POST /api/moments/upload (需要登录，multipart/form-data)
 * @param {string[]} tempFilePaths 临时文件路径数组
 */
export function uploadMomentImagesApi(tempFilePaths) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('AUTH_TOKEN')
    const uploadTasks = tempFilePaths.map((filePath) => {
      return new Promise((res, rej) => {
        uni.uploadFile({
          url: config.baseURL + '/api/moments/upload',
          filePath,
          name: 'images',
          header: {
            Authorization: `Bearer ${token}`
          },
          success: (uploadRes) => {
            try {
              const data = JSON.parse(uploadRes.data)
              if (data.urls) {
                res(data.urls)
              } else {
                rej(new Error(data.error || '上传失败'))
              }
            } catch (e) {
              rej(new Error('解析响应失败'))
            }
          },
          fail: (err) => rej(err)
        })
      })
    })

    Promise.all(uploadTasks)
      .then((results) => {
        const allUrls = results.flat()
        resolve(allUrls)
      })
      .catch(reject)
  })
}

/**
 * 发布动态
 * 后端: POST /api/moments (需要登录)
 * @param {Object} payload
 */
export function createMomentApi(payload) {
  return post('/api/moments', payload)
}

/**
 * 获取动态列表
 * 后端: GET /api/moments (需要登录)
 * @param {number} [userId] 可选，查看指定用户的动态
 */
export function getMomentsApi(userId) {
  const params = userId ? { userId } : {}
  return get('/api/moments', params)
}

/**
 * 编辑动态
 * 后端: PUT /api/moments/:id (需要登录)
 * @param {number} id 动态 ID
 * @param {Object} payload 更新内容
 */
export function updateMomentApi(id, payload) {
  return put(`/api/moments/${id}`, payload)
}

/**
 * 删除动态
 * 后端: DELETE /api/moments/:id (需要登录)
 * @param {number} id 动态 ID
 */
export function deleteMomentApi(id) {
  return del(`/api/moments/${id}`)
}

/**
 * 置顶/取消置顶动态
 * 后端: PATCH /api/moments/:id/pin (需要登录)
 * @param {number} id 动态 ID
 */
export function togglePinMomentApi(id) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: config.baseURL + `/api/moments/${id}/pin`,
      method: 'PATCH',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${uni.getStorageSync('AUTH_TOKEN')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(res.data)
        }
      },
      fail: reject
    })
  })
}


// 点赞/取消点赞
export function toggleLikeMomentApi(id) {
  return post(`/api/moments/${id}/like`)
}

export function uploadAvatarApi(filePath) {
  return uni.uploadFile({
    url: config.baseURL + '/api/profile/avatar',
    filePath,
    name: 'avatar',
    header: { Authorization: `Bearer ${uni.getStorageSync('AUTH_TOKEN')}` }
  }).then(res => JSON.parse(res.data))
}

// 上传封面
export function uploadCoverApi(filePath) {
  return uni.uploadFile({
    url: config.baseURL + '/api/profile/cover',
    filePath,
    name: 'cover',
    header: { Authorization: `Bearer ${uni.getStorageSync('AUTH_TOKEN')}` }
  }).then(res => JSON.parse(res.data))
}

// 资料照片会追加保存到 profiles.photos。必须串行上传，避免多个请求并发覆盖同一数组。
export function uploadProfilePhotosApi(filePaths) {
  const token = uni.getStorageSync('AUTH_TOKEN')
  let latestResult = null

  return filePaths.reduce((chain, filePath) => chain.then(() => new Promise((resolve, reject) => {
    uni.uploadFile({
      url: config.baseURL + '/api/profile/photos',
      filePath,
      name: 'photos',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode !== 200) return reject(new Error(res.data || '上传失败'))
        try {
          latestResult = JSON.parse(res.data)
          resolve()
        } catch (_) {
          reject(new Error('解析上传响应失败'))
        }
      },
      fail: reject
    })
  })), Promise.resolve()).then(() => latestResult)
}

// 从当前用户的资料照片列表移除一张照片；OSS 原文件暂保留，避免影响历史引用。
export function deleteProfilePhotoApi(photoUrl) {
  return del('/api/profile/photos', { photoUrl })
}

export function getProfileApi() {
  return get('/api/profile')
}

export function getCommentsApi(id) {
  return get(`/api/moments/${id}/comments`)
}

// 获取点赞人列表
export function getLikesApi(id) {
  return get(`/api/moments/${id}/likes`)
}

// replyToUserId 可选：不传就是普通评论，传了就是回复某个人的评论
export function addCommentApi(id, content, replyToUserId) {
  return post(`/api/moments/${id}/comments`, { content, replyToUserId })
}

export function updateBioApi(bio) {
  return post('/api/profile/bio', { bio })
}

// 首页瀑布流：随机资料卡片
/**
 * @param {Object} options
 * @param {number} [options.limit=15]
 * @param {number[]} [options.excludeIds=[]]
 */
export function getExploreFeedApi({ limit = 15, excludeIds = [] } = {}) {
  const params = { limit }
  if (excludeIds && excludeIds.length > 0) {
    params.excludeIds = excludeIds.join(',')
  }
  return get('/api/explore/feed', params)
}

// 资料点赞/取消点赞
export function toggleProfileLikeApi(profileId) {
  return post(`/api/explore/profiles/${profileId}/like`)
}

// 资料点赞人列表
export function getProfileLikesApi(profileId) {
  return get(`/api/explore/profiles/${profileId}/likes`)
}

// 资料评论列表
export function getProfileCommentsApi(profileId) {
  return get(`/api/explore/profiles/${profileId}/comments`)
}

// 发表资料评论（支持回复）
export function addProfileCommentApi(profileId, content, replyToUserId) {
  return post(`/api/explore/profiles/${profileId}/comments`, { content, replyToUserId })
}
export default {
  loginApi,
  registerApi,
  validateTokenApi,
  getUserInfoApi,
  getUserListApi,
  getMyProfileApi,
  submitMyProfileApi,
  searchCandidatesApi,
  getCandidateProfileApi,
  uploadMomentImagesApi,
  createMomentApi,
  getMomentsApi,
  updateMomentApi,
  deleteMomentApi,
  togglePinMomentApi,
  toggleLikeMomentApi,
  uploadAvatarApi,
  uploadCoverApi,
  uploadProfilePhotosApi,
  deleteProfilePhotoApi,
  getExploreFeedApi,
  toggleProfileLikeApi,
  getProfileLikesApi,
  getProfileCommentsApi,
  addProfileCommentApi
}
