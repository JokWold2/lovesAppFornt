export function facebookLoginScopes() {
  return 'public_profile,email'
}

export function facebookPhotoImportScopes() {
  return 'public_profile,email,user_photos'
}

export function normalizeFacebookLoginResult(result) {
  const accessToken = result?.authResponse?.accessToken || result?.accessToken || result?.authResult?.access_token
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('未返回可验证的 Facebook 授权令牌')
  }
  return { accessToken: accessToken.trim() }
}
