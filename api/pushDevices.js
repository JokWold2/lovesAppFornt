import { del, post } from '@/utils/request.js'

export const registerPushDeviceApi = payload => post('/api/push-devices', payload, { silent: true })
export const unregisterPushDeviceApi = cid => del(`/api/push-devices/${encodeURIComponent(cid)}`, {}, { silent: true })
