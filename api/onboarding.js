import { get, post } from '@/utils/request.js'
export const getOnboardingApi = () => get('/api/profile/onboarding')
export const saveOnboardingApi = data => post('/api/profile/onboarding', data, { silent: true })
