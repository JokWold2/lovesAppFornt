import { get, post, del } from '@/utils/request.js'
import { config } from '@/utils/config.js'

/**
 * 社区接口
 * 后端: routes/community.js
 */

// 热度最高的话题标签，无数据时后端返回默认标签
export const getCommunityHotTagsApi = (params = {}) => get('/api/community/tags/hot', params)

// 社区统计：帖子数 / 浏览数 / 在线人数 / 各分类帖子数
export const getCommunityStatsApi = () => get('/api/community/stats')

/**
 * 帖子列表
 * @param {Object} params { page, pageSize, category, tag, keyword, sort }
 *   sort: latest(最新) | hot(热门) | essence(精华)
 */
export const getCommunityPostsApi = (params = {}) => get('/api/community/posts', params)

// 帖子详情（后端会累加浏览量）
export const getCommunityPostApi = (id) => get(`/api/community/posts/${id}`)

// 发布帖子
export const createCommunityPostApi = (payload) => post('/api/community/posts', payload)

// 删除自己的帖子（软删除）
export const deleteCommunityPostApi = (id) => del(`/api/community/posts/${id}`)

// 点赞 / 取消点赞帖子
export const toggleCommunityLikeApi = (id) => post(`/api/community/posts/${id}/like`)

// 收藏 / 取消收藏帖子
export const toggleCommunityCollectApi = (id) => post(`/api/community/posts/${id}/collect`)

/**
 * 评论列表（两级：一级评论 + 前 3 条回复预览）
 * @param {Object} params { page, pageSize, targetCommentId }
 */
export const getCommunityCommentsApi = (id, params = {}) => get(`/api/community/posts/${id}/comments`, params)

/**
 * 发表评论
 * @param {Object} payload { content, replyToCommentId } replyToCommentId 为空表示评论帖子本身
 */
export const addCommunityCommentApi = (id, payload) => post(`/api/community/posts/${id}/comments`, payload)

// 某个一级评论下的完整回复（分页）
export const getCommunityCommentRepliesApi = (id, rootCommentId, params = {}) =>
  get(`/api/community/posts/${id}/comments/${rootCommentId}/replies`, params)

// 点赞 / 取消点赞评论
export const toggleCommunityCommentLikeApi = (commentId) => post(`/api/community/comments/${commentId}/like`)

/**
 * 批量上传帖子图片，返回 OSS 图片 URL 数组
 * 后端: POST /api/community/upload (multipart/form-data，字段名 images)
 * @param {string[]} tempFilePaths uni.chooseImage 返回的临时路径
 */
export function uploadCommunityImagesApi(tempFilePaths) {
  const token = uni.getStorageSync('AUTH_TOKEN')
  const uploadTasks = tempFilePaths.map((filePath) => new Promise((resolve, reject) => {
    uni.uploadFile({
      url: config.baseURL + '/api/community/upload',
      filePath,
      name: 'images',
      header: { Authorization: `Bearer ${token}` },
      success: (uploadRes) => {
        if (uploadRes.statusCode !== 200) {
          let message = '上传失败'
          try {
            const parsed = JSON.parse(uploadRes.data)
            if (parsed?.error) message = parsed.error
          } catch (_) { /* 响应不是 JSON 时保留默认提示 */ }
          return reject(new Error(message))
        }
        try {
          const data = JSON.parse(uploadRes.data)
          if (Array.isArray(data?.urls) && data.urls.length > 0) resolve(data.urls)
          else reject(new Error(data?.error || '上传失败'))
        } catch (_) {
          reject(new Error('解析上传响应失败'))
        }
      },
      fail: reject
    })
  }))

  return Promise.all(uploadTasks).then(results => results.flat())
}
