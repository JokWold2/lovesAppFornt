export function getAccountName(profile = {}, user = {}) {
  const nativeName = `${profile.native_last_name || ''}${profile.native_first_name || ''}`.trim()
  if (nativeName) return nativeName

  const englishName = [profile.en_first_name, profile.en_last_name].filter(Boolean).join(' ').trim()
  if (englishName) return englishName

  return user.displayName || user.name || user.nickname || '用户'
}

export function getAccountEmail(profile = {}, user = {}) {
  return user.email || profile.email || profile.contact_email || ''
}

export function getAccountAvatar(profile = {}, user = {}) {
  return profile.avatar_url || profile.avatarUrl || user.avatar_url || user.avatarUrl || ''
}
