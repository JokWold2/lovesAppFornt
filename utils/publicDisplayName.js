function namePart(value) {
  return typeof value === 'string' ? value.trim() : ''
}

// Public names follow the same priority as the owner's profile header.
// Email addresses remain login identifiers and are never used as names.
export function publicDisplayName(profile = {}, user = {}, fallback = '') {
  const englishFirstName = namePart(profile.en_first_name) || namePart(profile.enFirstName)
    || namePart(user.en_first_name) || namePart(user.enFirstName)
  if (englishFirstName) return englishFirstName

  const nativeNameOf = value => [value.native_last_name || value.nativeLastName,
    value.native_first_name || value.nativeFirstName].map(namePart).filter(Boolean).join('')
  const nativeName = nativeNameOf(profile) || nativeNameOf(user)
  if (nativeName) return nativeName

  const englishLastName = namePart(profile.en_last_name) || namePart(profile.enLastName)
    || namePart(user.en_last_name) || namePart(user.enLastName)
  if (englishLastName) return englishLastName

  for (const value of [profile.displayName, profile.display_name, profile.name, profile.nickname,
    user.displayName, user.display_name, user.name, user.nickname, user.username]) {
    const name = namePart(value)
    if (name) return name
  }
  return fallback
}
