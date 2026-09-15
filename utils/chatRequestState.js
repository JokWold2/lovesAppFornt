export function getChatRequestButtonState(status, labels = {}) {
  const state = typeof status === 'object' && status ? status : { status }
  status = state.status
  const text = {
    requestChat: labels.requestChat || '申请私聊',
    requestPending: labels.requestPending || '申请审核中',
    requestApproved: labels.requestApproved || '申请已通过',
    enterGroup: labels.enterGroup || '进入沟通群'
  }
  if (state.groupId) return { text: text.enterGroup, disabled: false, tone: 'approved' }
  if (status === 'pending' || status === 'processing') {
    return { text: text.requestPending, disabled: true, tone: 'muted' }
  }
  if (status === 'approved') {
    return { text: text.requestApproved, disabled: true, tone: 'approved' }
  }
  return { text: text.requestChat, disabled: false, tone: 'default' }
}

export function getChatRequestEntryState(state = {}) {
  if (state.groupId) return 'group'
  if (state.status === 'pending' || state.status === 'processing') return 'pending'
  if (!state.isLiked) return 'like'
  if (!state.mutual) return 'wait'
  return 'request'
}
