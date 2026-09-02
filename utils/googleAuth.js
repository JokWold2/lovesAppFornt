// Google 原生 SDK 的返回格式只在此处处理，页面层只需要一个可提交给后端的 ID Token。
// #ifdef APP-PLUS
import * as googleSignin from '@/uni_modules/tt-google-signin';
// #endif

// OAuth 客户端 ID 是公开标识，可安全随 H5 发布；客户端密钥只留在服务端。
const GOOGLE_WEB_CLIENT_ID = '884526672226-fd1ner32ut4bf9phc614aead14muu1do.apps.googleusercontent.com';

let googleSdk;

function getGoogleSdk() {
  if (!googleSdk) {
    if (!googleSignin || typeof googleSignin.getTTGoogleSign !== 'function') {
      throw new Error('Google 登录插件未加载：请使用包含 tt-google-signin 的自定义调试基座或云打包 APK');
    }
    googleSdk = googleSignin.getTTGoogleSign();
  }
  return googleSdk;
}

/**
 * 拉起 Android/iOS 原生 Google 登录，并返回可由服务端验证的 JWT ID Token。
 * 不返回或记录用户资料与访问令牌，避免页面层误用未经服务端校验的数据。
 */
function loadGoogleIdentityServices() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.reject(new Error('当前平台不支持 Google 登录'));
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-identity-services')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google 登录组件加载失败')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'google-identity-services'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => window.google?.accounts?.id ? resolve(window.google) : reject(new Error('Google 登录组件加载失败'))
    script.onerror = () => reject(new Error('Google 登录组件加载失败'))
    document.head.appendChild(script)
  })
}

async function signInWithGoogleH5() {
  const google = await loadGoogleIdentityServices();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Google 授权未完成')), 60_000);
    google.accounts.id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      callback: credential => {
        clearTimeout(timeout);
        if (typeof credential?.credential !== 'string' || !credential.credential.trim()) return reject(new Error('Google 未返回可验证的登录令牌'));
        resolve({ idToken: credential.credential });
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });
    google.accounts.id.prompt(notification => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        clearTimeout(timeout);
        reject(new Error('Google 登录提示未显示，请检查浏览器设置或 OAuth 配置'));
      }
    });
  });
}

export function signInWithGoogle() {
  // #ifdef H5
  return signInWithGoogleH5();
  // #endif

  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    const sdk = getGoogleSdk();
    if (!sdk || typeof sdk.login !== 'function') {
      reject(new Error('Google 登录模块未正确安装'));
      return;
    }

    sdk.login({
      serverClientId: GOOGLE_WEB_CLIENT_ID,
      // 部分 Android 设备的 Credential Manager 会返回非 Google ID Token 凭据（错误 103）。
      // 旧版 Google Sign-In 仍会返回可供服务端校验的 ID Token；该选项仅影响 Android。
      useLegacyLogin: true,
      success(result) {
        const idToken = result && result.idToken;
        if (typeof idToken !== 'string' || !idToken.trim()) {
          reject(new Error('Google 未返回可验证的登录令牌'));
          return;
        }
        resolve({ idToken });
      },
      fail(error) {
        reject(error || new Error('Google 原生登录失败'));
      },
      complete: null
    });
  });
  // #endif
}
