// HBuilderX 5.07's dev console uses reserved close code 1006 on timeout.
// Patch only that dependency and only WeChat development builds.
module.exports = function uniConsoleCompat({ platform = process.env.UNI_PLATFORM, development = process.env.NODE_ENV !== 'production' } = {}) {
  return {
    name: 'lovesapp:wechat-console-close-code',
    enforce: 'pre',
    transform(code, id) {
      if (!development || platform !== 'mp-weixin') return null
      const path = id.replace(/\\/g, '/').split('?')[0]
      if (!path.endsWith('/@dcloudio/uni-console/dist/mp.esm.js')) return null
      const fixed = code.replace(
        /(\bsocket\.close\(\{\s*code:\s*)1006(\s*,\s*reason:\s*['"]connect timeout['"])/g,
        (_, before, after) => `${before}1000${after}`
      )
      return fixed === code ? null : { code: fixed, map: null }
    }
  }
}
