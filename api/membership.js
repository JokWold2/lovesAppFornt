import { request } from '@/utils/request.js'
import { createMembershipRequestId } from '@/utils/membership.js'

const call = (url, method = 'GET', data = {}) => request({ url, method, data, silent: true })
export const getMembershipApi = () => call('/api/membership')
export const getMembershipRequestsApi = () => call('/api/membership/requests')
export const submitMembershipRequestApi = (targetLevel, requestId = createMembershipRequestId()) => call('/api/membership/requests', 'POST', { targetLevel, requestId })
export const getBlessingLikesApi = params => call('/api/blessings/likes', 'GET', params)
export const decideBlessingApi = (profileId, decision, source = 'card', requestId = createMembershipRequestId()) => call('/api/blessings/decisions', 'POST', { profileId, decision, source, requestId })
export const rewindBlessingApi = (actionId, requestId = createMembershipRequestId()) => call('/api/blessings/rewind', 'POST', { actionId, requestId })
