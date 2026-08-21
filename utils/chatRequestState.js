export function getChatRequestButtonState(status) {
  if (status === 'pending' || status === 'processing') {
    return { text: '申请审核中', disabled: true, tone: 'muted' }
  }
  if (status === 'approved') {
    return { text: '申请已通过', disabled: true, tone: 'approved' }
  }
  return { text: '申请私聊', disabled: false, tone: 'default' }
}
