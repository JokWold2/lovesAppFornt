<script>
	import { setupRouteGuard } from '@/utils/guard.js'
	import { validateTokenApi, heartbeatPresenceApi, offlinePresenceApi } from '@/api/index.js'
	import { getToken, getUserInfo, removeToken, removeUserInfo, setUserInfo } from '@/utils/auth.js'
	import { refreshUnreadBadge, startUnreadBadgePolling, stopUnreadBadgePolling } from '@/utils/unreadBadge.js'
	import { installPushListeners, registerCurrentDevice } from '@/utils/pushNotifications.js'
	import { configurePresenceApiMethods, pausePresence, resumePresence, startPresence, stopPresence } from '@/utils/presence.js'

	configurePresenceApiMethods({ heartbeatPresenceApi, offlinePresenceApi })

	export default {
		globalData: {
			restoringSession: false
		},
		onLaunch: async function() {
			console.log('App Launch')
			// 安装路由守卫（拦截所有页面跳转，未登录则强制跳到登录页）
			// setupRouteGuard()
			installPushListeners()
			const token = getToken()
			if (!token) return
			this.globalData.restoringSession = true

			try {
				const data = await validateTokenApi()
				if (!data?.valid || !data.user) throw new Error('登录状态已失效')
				// 保留邮箱账号原有的本地密码缓存，只用服务端资料刷新公开字段。
				setUserInfo({ ...getUserInfo(), ...data.user })
				uni.$emit('auth-session-ready', { restored: true })
				registerCurrentDevice()
				refreshUnreadBadge()
				await startPresence()
				uni.switchTab({ url: '/pages/index/index360' })
			} catch (error) {
				// 不记录 Token，只记录服务端状态，方便定位重启后会话失效的原因。
				console.warn('启动登录状态校验失败', {
					code: error?.code || error?.statusCode || null,
					message: error?.message || error?.error || 'unknown',
					loginType: getUserInfo()?.loginType || null
				})
				const cachedUser = getUserInfo()
				stopPresence({ clearSession: true })
				removeToken()
				// 邮箱账号保留原有密码缓存，让登录页继续自动登录；第三方账号没有密码缓存。
				if (cachedUser?.loginType && cachedUser.loginType !== 'email') removeUserInfo()
				uni.reLaunch({ url: '/pages/login/login360' })
			} finally {
				this.globalData.restoringSession = false
			}
		},
		onShow: function() {
			console.log('App Show')
			resumePresence()
			if (getToken()) {
				refreshUnreadBadge()
				startUnreadBadgePolling()
				registerCurrentDevice()
				if (!this.globalData.restoringSession) void startPresence()
			}
		},
		onHide: function() {
			console.log('App Hide')
			stopUnreadBadgePolling()
			pausePresence()
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
