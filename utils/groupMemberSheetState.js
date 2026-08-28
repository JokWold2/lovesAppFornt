export function onlineMemberLabel(count) {
  return `${Math.max(0, Number(count) || 0)} 人在线`
}

export function visibleMemberDetails(member = {}) {
  const email = member.email || ''
  return {
    userId: Number(member.userId),
    name: member.name || email.split('@', 1)[0] || '成员',
    email,
    avatarUrl: member.avatarUrl || ''
  }
}
