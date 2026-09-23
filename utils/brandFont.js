import { config } from './config.js'
let loading = false, loaded = false
export function loadBlessHandwriting() {
 // Mini-program and native font loaders require a hosted font URL. H5 uses CSS.
 // #ifndef H5
 if (loaded || loading || typeof uni.loadFontFace !== 'function') return
 loading = true
 uni.loadFontFace({
  global: true, family: 'BlessHandwriting',
  source: `url("${config.baseURL}/static/fonts/bless-handwriting.ttf")`,
  success: () => { loaded = true },
  complete: () => { loading = false }
 })
 // #endif
}
