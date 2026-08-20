import { registerPushDeviceApi, unregisterPushDeviceApi } from '@/api/pushDevices.js'
import { getToken } from '@/utils/auth.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'

let currentCid = ''
let listenersInstalled = false

export function readPushRoute(payload = {}) {
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload) } catch (_) { payload = {} }
  }
  return typeof payload.route === 'string' && payload.route.startsWith('/pages/') ? payload.route : '/pages/notice/notice'
}

function pushApi() { return typeof plus !== 'undefined' && plus.push ? plus.push : null }
function platform() { return uni.getSystemInfoSync?.().platform === 'ios' ? 'ios' : 'android' }

export function registerCurrentDevice() {
  const api = pushApi()
  if (!api || !getToken()) return Promise.resolve('')
  return new Promise(resolve => api.getClientInfoAsync(async info => {
    const cid = info?.clientid || info?.cid || ''
    if (!cid) return resolve('')
    currentCid = cid
    try { await registerPushDeviceApi({ cid, platform: platform(), appId: '__UNI__86D4CFE' }) } catch (_) {}
    resolve(cid)
  }))
}

export async function unregisterCurrentDevice() {
  if (!currentCid) return
  try { await unregisterPushDeviceApi(currentCid) } catch (_) {}
  currentCid = ''
}

export function installPushListeners() {
  const api = pushApi()
  if (!api || listenersInstalled) return
  listenersInstalled = true
  api.addEventListener('receive', () => { uni.showToast({ title: '你收到一条新消息', icon: 'none' }); refreshUnreadBadge() }, false)
  api.addEventListener('click', message => { uni.navigateTo({ url: readPushRoute(message?.payload || {}) }); refreshUnreadBadge() }, false)
}
