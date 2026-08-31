import App from './App'
import { initializeLocale, t } from './utils/localeRuntime.js'

// #ifdef H5
import { installH5Viewport } from './utils/h5Viewport.js'

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
	installH5Viewport(window, document)
}
// #endif

initializeLocale()

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.prototype.$t = t
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
export function createApp() {
	const app = createSSRApp(App)
	app.config.globalProperties.$t = t
	return {
		app
	}
}
// #endif
