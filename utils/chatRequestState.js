export function getChatRequestButtonState(status, labels = {}) {
  const text = {
    requestChat: labels.requestChat || '申请私聊',
    requestPending: labels.requestPending || '申请审核中',
    requestApproved: labels.requestApproved || '申请已通过'
  }
  if (status === 'pending' || status === 'processing') {
    return { text: text.requestPending, disabled: true, tone: 'muted' }
  }
  if (status === 'approved') {
    return { text: text.requestApproved, disabled: true, tone: 'approved' }
  }
  return { text: text.requestChat, disabled: false, tone: 'default' }
}
