<script>
	import { setupRouteGuard } from '@/utils/guard.js'
	import { validateTokenApi, heartbeatPresenceApi, offlinePresenceApi } from '@/api/index.js'
	import { getToken, getUserInfo, removeToken, removeUserInfo, setUserInfo } from '@/utils/auth.js'
	import { refreshUnreadBadge, startUnreadBadgePolling, stopUnreadBadgePolling } from '@/utils/unreadBadge.js'
	import { installPushListeners, registerCurrentDevice } from '@/utils/pushNotifications.js'
	import { configurePresenceApiMethods, pausePresence, resumePresence, startPresence, stopPresence } from '@/utils/presence.js'
	import { bootstrapLocale } from '@/utils/localeRuntime.js'

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
				await bootstrapLocale()
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
	/* #ifdef H5 */
	.app-h5-screen {
		position: fixed;
		top: calc(var(--app-viewport-offset-top, 0px) + var(--window-top, 44px));
		right: 0;
		left: 0;
		height: calc(100vh - var(--window-top, 44px));
		height: calc(100dvh - var(--window-top, 44px));
		height: calc(var(--app-viewport-height, 100dvh) - var(--window-top, 44px));
		min-height: 0;
		overflow: hidden;
	}

	.app-h5-min-screen {
		min-height: calc(100vh - var(--window-top, 44px));
		min-height: calc(100dvh - var(--window-top, 44px));
		min-height: calc(var(--app-layout-viewport-height, 100dvh) - var(--window-top, 44px));
		padding-bottom: env(safe-area-inset-bottom);
		box-sizing: border-box;
	}

	.app-h5-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
		touch-action: pan-y;
	}

	.app-h5-fixed-bottom {
		--app-fixed-bottom-base: 0px;
		bottom: calc(var(--app-fixed-bottom-base) + var(--app-viewport-bottom-offset, 0px));
		padding-bottom: env(safe-area-inset-bottom);
		box-sizing: border-box;
	}

	.app-h5-sheet-mask {
		bottom: var(--app-viewport-bottom-offset, 0px);
		overscroll-behavior: contain;
	}

	.app-h5-sheet {
		max-height: calc(var(--app-viewport-height, 100dvh) - var(--window-top, 0px) - 24px);
		padding-bottom: env(safe-area-inset-bottom);
		box-sizing: border-box;
	}
	/* #endif */
</style>
