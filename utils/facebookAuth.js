import { facebookLoginScopes, facebookPhotoImportScopes, normalizeFacebookLoginResult } from '@/utils/socialAuth.js'

let facebookSdkPromise
// Facebook App ID 是公开标识；App Secret 仅存在后端环境变量中。
const FACEBOOK_APP_ID = '2610824026054986'

function loadFacebookSdk() {
  if (facebookSdkPromise) return facebookSdkPromise
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('当前平台不支持 Facebook 登录'))
  }
  facebookSdkPromise = new Promise((resolve, reject) => {
    const complete = () => {
      if (!window.FB) return reject(new Error('Facebook 登录组件加载失败'))
      window.FB.init({ appId: FACEBOOK_APP_ID, cookie: false, xfbml: false, version: 'v22.0' })
      resolve(window.FB)
    }
    if (window.FB) return complete()
    const existing = document.getElementById('facebook-jssdk')
    if (existing) {
      existing.addEventListener('load', complete, { once: true })
      existing.addEventListener('error', () => reject(new Error('Facebook 登录组件加载失败')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.defer = true
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.onload = complete
    script.onerror = () => reject(new Error('Facebook 登录组件加载失败'))
    document.head.appendChild(script)
  })
  return facebookSdkPromise
}

// #ifdef H5
async function signInWithFacebookH5() {
  const FB = await loadFacebookSdk()
  return new Promise((resolve, reject) => {
    FB.login(result => {
      try { resolve(normalizeFacebookLoginResult(result)) } catch (error) { reject(error) }
    }, { scope: facebookLoginScopes(), return_scopes: true })
  })
}

async function requestFacebookPhotoAccessH5() {
  const FB = await loadFacebookSdk()
  const credential = await new Promise((resolve, reject) => {
    FB.login(result => {
      try { resolve(normalizeFacebookLoginResult(result)) } catch (error) { reject(error) }
    }, { scope: facebookPhotoImportScopes(), auth_type: 'rerequest', return_scopes: true })
  })
  const photos = await new Promise((resolve, reject) => {
    FB.api('/me/photos', { fields: 'id,picture', limit: 9 }, response => {
      if (!response || response.error) return reject(new Error('读取 Facebook 相册失败'))
      resolve(Array.isArray(response.data) ? response.data.map(item => ({ id: String(item.id), picture: item.picture || '' })) : [])
    })
  })
  return { ...credential, photos }
}
// #endif

export function signInWithFacebook() {
  // #ifdef H5
  return signInWithFacebookH5()
  // #endif
  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'facebook',
      success: result => {
        try { resolve(normalizeFacebookLoginResult(result)) } catch (error) { reject(error) }
      },
      fail: error => reject(error || new Error('Facebook 原生登录失败'))
    })
  })
  // #endif
  return Promise.reject(new Error('当前平台不支持 Facebook 登录'))
}

export function requestFacebookPhotoAccess() {
  // #ifdef H5
  return requestFacebookPhotoAccessH5()
  // #endif
  return Promise.reject(new Error('请在 H5 页面导入 Facebook 相册照片'))
}
