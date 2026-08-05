<script>
	import { setupRouteGuard } from '@/utils/guard.js'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 安装路由守卫（拦截所有页面跳转，未登录则强制跳到登录页）
			// setupRouteGuard()
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
