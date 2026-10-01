import { del, request } from '@/utils/request.js'

function preferenceUrl(kind, id) {
  if (!['group', 'trade'].includes(kind) || id === null || id === undefined || id === '') throw new Error('Invalid conversation')
  return '/api/conversation-preferences/' + kind + '/' + encodeURIComponent(String(id))
}

export const setConversationPinnedApi = (kind, id, pinned) => request({
  url: preferenceUrl(kind, id),
  method: 'PATCH',
  data: { pinned: !!pinned },
  silent: true
})

export const deleteConversationApi = (kind, id) => del(preferenceUrl(kind, id), {}, { silent: true })
