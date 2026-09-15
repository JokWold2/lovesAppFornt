import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import uniConsoleCompat from './build/uni-console-compat.cjs'

// HBuilderX supplies its own compiler. Keep the plugin and runtime on that
// same installation instead of mixing it with the project's CLI packages.
const compilerRequire = createRequire(resolve(process.env.UNI_CLI_CONTEXT || process.cwd(), 'package.json'))
const uni = compilerRequire('@dcloudio/vite-plugin-uni').default

export default {
  plugins: [uniConsoleCompat(), uni()]
}
