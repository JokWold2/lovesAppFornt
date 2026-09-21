// 蛋糕 / 月饼商城接口。契约见 my-backend/docs/cake-shop-api.md。
// 全部使用 silent，由页面按当前语言展示加载/失败状态，避免 request.js 弹出未翻译的中文提示。
import { get, post, put, del } from '../utils/request.js'

const SILENT = { silent: true }

// ===== 分类 / 横幅 / 商品（公开） =====

export function getCakeCategoriesApi() {
  return get('/api/cake/categories', {}, SILENT)
}

export function getCakeBannersApi() {
  return get('/api/cake/banners', {}, SILENT)
}

export function getCakeProductsApi(params = {}) {
  const query = {}
  if (params.categoryId) query.categoryId = params.categoryId
  if (params.categoryCode) query.categoryCode = params.categoryCode
  if (params.keyword) query.keyword = params.keyword
  if (params.kind) query.kind = params.kind
  if (params.sort) query.sort = params.sort
  if (params.page) query.page = params.page
  if (params.pageSize) query.pageSize = params.pageSize
  return get('/api/cake/products', query, SILENT)
}

export function getCakeProductDetailApi(id) {
  return get(`/api/cake/products/${id}`, {}, SILENT)
}

// ===== 门店（公开；带 token 时返回收藏状态） =====

export function getCakeCitiesApi() {
  return get('/api/cake/stores/cities', {}, SILENT)
}

export function getCakeStoresApi(params = {}) {
  const query = {}
  if (params.cityCode) query.cityCode = params.cityCode
  if (params.keyword) query.keyword = params.keyword
  if (Number.isFinite(params.latitude) && Number.isFinite(params.longitude)) {
    query.latitude = params.latitude
    query.longitude = params.longitude
  }
  if (params.favoriteOnly) query.favoriteOnly = 1
  if (params.page) query.page = params.page
  if (params.pageSize) query.pageSize = params.pageSize
  return get('/api/cake/stores', query, SILENT)
}

export function getCakeStoreDetailApi(id) {
  return get(`/api/cake/stores/${id}`, {}, SILENT)
}

export function getCakeFavoritesApi() {
  return get('/api/cake/favorites', {}, SILENT)
}

export function setCakeStoreFavoriteApi(id, favorite) {
  return put(`/api/cake/stores/${id}/favorite`, { favorite: !!favorite }, SILENT)
}

// ===== 购物车 =====

export function getCakeCartApi(params = {}) {
  const query = params.deliveryType ? { deliveryType: params.deliveryType } : {}
  return get('/api/cake/cart', query, SILENT)
}

export function addCakeCartItemApi(productId, skuId, quantity) {
  return post('/api/cake/cart', { productId, skuId: skuId || 0, quantity }, SILENT)
}

export function updateCakeCartItemApi(id, quantity) {
  return put(`/api/cake/cart/${id}`, { quantity }, SILENT)
}

export function removeCakeCartItemApi(id) {
  return del(`/api/cake/cart/${id}`, {}, SILENT)
}

export function clearCakeCartApi() {
  return del('/api/cake/cart', {}, SILENT)
}

// ===== 订单 =====

export function createCakeOrderApi(payload) {
  return post('/api/cake/orders', payload, SILENT)
}

export function getCakeOrdersApi(params = {}) {
  const query = {}
  if (params.status) query.status = params.status
  if (params.page) query.page = params.page
  if (params.pageSize) query.pageSize = params.pageSize
  return get('/api/cake/orders', query, SILENT)
}

export function getCakeOrderDetailApi(id) {
  return get(`/api/cake/orders/${id}`, {}, SILENT)
}

export function cancelCakeOrderApi(id, reason) {
  return post(`/api/cake/orders/${id}/cancel`, reason ? { reason } : {}, SILENT)
}

export function payCakeOrderApi(id, requestId) {
  return post(`/api/cake/orders/${id}/pay`, { requestId }, SILENT)
}

export function confirmCakeOrderApi(id) {
  return post(`/api/cake/orders/${id}/confirm`, {}, SILENT)
}

export default {
  getCakeCategoriesApi,
  getCakeBannersApi,
  getCakeProductsApi,
  getCakeProductDetailApi,
  getCakeCitiesApi,
  getCakeStoresApi,
  getCakeStoreDetailApi,
  getCakeFavoritesApi,
  setCakeStoreFavoriteApi,
  getCakeCartApi,
  addCakeCartItemApi,
  updateCakeCartItemApi,
  removeCakeCartItemApi,
  clearCakeCartApi,
  createCakeOrderApi,
  getCakeOrdersApi,
  getCakeOrderDetailApi,
  cancelCakeOrderApi,
  payCakeOrderApi,
  confirmCakeOrderApi
}
