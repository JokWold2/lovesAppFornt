import { publicDisplayName } from './publicDisplayName.js'

export function getAccountName(profile = {}, user = {}, fallback = '') {
  return publicDisplayName(profile, user, fallback)
}

export function getAccountEmail(profile = {}, user = {}) {
  return user.email || profile.email || profile.contact_email || ''
}

export function getAccountAvatar(profile = {}, user = {}) {
  return profile.avatar_url || profile.avatarUrl || user.avatar_url || user.avatarUrl || ''
}
