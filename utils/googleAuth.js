// Google 原生 SDK 的返回格式只在此处处理，页面层只需要一个可提交给后端的 ID Token。
// #ifdef APP-PLUS
import * as googleSignin from '@/uni_modules/tt-google-signin';
// #endif

const GOOGLE_WEB_CLIENT_ID = '884526672226-fd1ner32ut4bf9phc614aead14muu1do.apps.googleusercontent.com';

let googleSdk;

function getGoogleSdk() {
  if (!googleSdk) {
    googleSdk = googleSignin.getTTGoogleSign();
  }
  return googleSdk;
}

/**
 * 拉起 Android/iOS 原生 Google 登录，并返回可由服务端验证的 JWT ID Token。
 * 不返回或记录用户资料与访问令牌，避免页面层误用未经服务端校验的数据。
 */
export function signInWithGoogle() {
  // #ifndef APP-PLUS
  return Promise.reject(new Error('请在 Android 或 iOS App 中使用 Google 登录'));
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
