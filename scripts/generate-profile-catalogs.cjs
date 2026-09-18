/* Build-time only. Node >= 18; requires sharp and jszip (never imported by the app).
 * Pinned upstream releases and attributions: docs/profile-catalog-sources.md.
 * Optional PROFILE_CATALOG_CACHE keeps source downloads outside app assets.
 */
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const sharp = require('sharp')
const JSZip = require('jszip')

const root = path.resolve(__dirname, '..')
const cache = process.env.PROFILE_CATALOG_CACHE || path.join(os.tmpdir(), 'bless-profile-catalog-sources-v1')
const cldrBase = 'https://raw.githubusercontent.com/unicode-org/cldr-json/48.2.0/'
const sources = {
  iso639: 'https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3_Code_Tables_20260715.zip',
  regions: 'https://raw.githubusercontent.com/unicode-org/cldr/release-48-2/common/validity/region.xml',
  flags: 'https://codeload.github.com/lipis/flag-icons/zip/refs/tags/v7.5.0',
  unicodeLicense: `${cldrBase}LICENSE`
}
const localePairs = [['zh-Hans', 'zh'], ['zh-Hant', 'zh-Hant'], ['en', 'en'], ['ru', 'ru'], ['ja', 'ja'], ['ko', 'ko']]
const hashes = {}

async function download(url) {
  await fs.mkdir(cache, { recursive: true })
  const file = path.join(cache, crypto.createHash('sha256').update(url).digest('hex'))
  let data
  try { data = await fs.readFile(file) } catch {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${response.status}: ${url}`)
    data = Buffer.from(await response.arrayBuffer())
    await fs.writeFile(file, data)
  }
  hashes[url] = crypto.createHash('sha256').update(data).digest('hex')
  return data
}

function expandRegions(xml) {
  const value = xml.match(/idStatus='regular'>[\s\S]*?\n([\s\S]*?)<\/id>/)?.[1]
  if (!value) throw new Error('CLDR regular region list is missing')
  // CLDR also supports these 8 non-ISO-3166-1 region codes.
  const extra = new Set(['AC', 'CP', 'CQ', 'DG', 'EA', 'IC', 'TA', 'XK'])
  return value.trim().split(/\s+/).flatMap(part => {
    if (!part.includes('~')) return [part]
    const [start, last] = part.split('~')
    const from = start.charCodeAt(start.length - 1)
    return Array.from({ length: last.charCodeAt(0) - from + 1 }, (_, index) => start.slice(0, -1) + String.fromCharCode(from + index))
  }).filter(code => !extra.has(code)).sort()
}

async function main() {
  const [isoBuffer, regionsBuffer, flagsBuffer, unicodeLicense] = await Promise.all(Object.values(sources).map(download))
  const isoZip = await JSZip.loadAsync(isoBuffer)
  const isoEntry = Object.values(isoZip.files).find(file => /(?:^|\/)iso-639-3[^/]*\.tab$/.test(file.name) && !/Name|Retire|macro/.test(file.name))
  if (!isoEntry) throw new Error('Pinned SIL archive is missing the main language table')
  const rows = (await isoEntry.async('string')).trim().split(/\r?\n/).slice(1).map(line => line.split('\t'))
  // S means special codes (undetermined/multiple/no linguistic content), not languages.
  const languages = rows.filter(row => ['I', 'M'].includes(row[4])).map(row => row[3] ? [row[0], row[6], row[3]] : [row[0], row[6]])
  const countryCodes = expandRegions(regionsBuffer.toString('utf8'))
  if (countryCodes.length !== 249 || languages.length !== 7923) throw new Error(`Unexpected pinned source counts: ${countryCodes.length} countries, ${languages.length} languages`)

  const localized = await Promise.all(localePairs.map(async ([appLocale, cldrLocale]) => {
    const [territories, languageNames] = await Promise.all(['territories', 'languages'].map(async kind => {
      const url = `${cldrBase}cldr-json/cldr-localenames-full/main/${cldrLocale}/${kind}.json`
      const parsed = JSON.parse((await download(url)).toString('utf8'))
      return parsed.main[cldrLocale].localeDisplayNames[kind]
    }))
    return { appLocale, territories, languageNames }
  }))
  const countries = countryCodes.map(code => [code, localized.map(locale => {
    const name = locale.territories[code]
    if (!name || name.length > 100) throw new Error(`Invalid country name: ${locale.appLocale}/${code}`)
    return name
  })])
  const languageNames = Object.fromEntries(localized.map(locale => {
    const names = {}
    for (const [code, official, alpha2] of languages) {
      const label = locale.languageNames[alpha2 || code] || locale.languageNames[code]
      if (label && label !== official) names[code] = label
    }
    // CLDR's English macro-language aliases would otherwise collide with individual
    // language names; official SIL reference names distinguish these two entries.
    if (locale.appLocale === 'en') { delete names.lah; delete names.ori }
    for (const [code, official] of languages) {
      if ((names[code] || official).length > 50) throw new Error(`Language name exceeds existing field size: ${locale.appLocale}/${code}`)
    }
    return [locale.appLocale, names]
  }))

  const flagsZip = await JSZip.loadAsync(flagsBuffer)
  const flagRoot = Object.keys(flagsZip.files).find(name => /\/flags\/4x3\/$/.test(name))
  if (!flagRoot) throw new Error('Flag archive directory is missing')
  const tileWidth = 32, tileHeight = 24, columns = 16, density = 2
  const width = columns * tileWidth, height = Math.ceil(countries.length / columns) * tileHeight
  const composites = []
  // Bound native rasterizer concurrency and keep memory use low on developer machines.
  for (let index = 0; index < countryCodes.length; index++) {
    const code = countryCodes[index]
    const entry = flagsZip.file(`${flagRoot}${code.toLowerCase()}.svg`)
    if (!entry) throw new Error(`Missing flag: ${code}`)
    const input = await sharp(await entry.async('nodebuffer')).resize(tileWidth * density, tileHeight * density, { fit: 'fill' }).png().toBuffer()
    composites.push({ input, left: (index % columns) * tileWidth * density, top: Math.floor(index / columns) * tileHeight * density })
  }
  await fs.mkdir(path.join(root, 'static'), { recursive: true })
  await sharp({ create: { width: width * density, height: height * density, channels: 4, background: '#00000000' } }).composite(composites).png({ palette: true, colours: 256, compressionLevel: 9 }).toFile(path.join(root, 'static/profile-flags.png'))
  const flagSprite = { path: '/static/profile-flags.png', columns, tileWidth, tileHeight, width, height, density }
  const metadata = { iso639Release: '2026-07-15', cldrRelease: '48.2.0', flagIconsRelease: '7.5.0', countryCount: countries.length, languageCount: languages.length, individualCount: rows.filter(row => row[4] === 'I').length, macrolanguageCount: rows.filter(row => row[4] === 'M').length }
  const exports = { catalogLocales: localePairs.map(([locale]) => locale), catalogCountries: countries, catalogLanguages: languages, catalogLanguageNames: languageNames, catalogFlagSprite: flagSprite, catalogMetadata: metadata }
  const code = '// Generated by scripts/generate-profile-catalogs.cjs. Do not edit by hand.\n// SIL ISO 639-3 + Unicode CLDR; flags: flag-icons (MIT). See docs/profile-catalog-sources.md.\n' + Object.entries(exports).map(([name, value]) => `export const ${name}=${JSON.stringify(value)}\n`).join('')
  await fs.writeFile(path.join(root, 'utils/profileCatalogData.js'), code)

  const licensesDir = path.join(root, 'docs/licenses')
  await fs.mkdir(licensesDir, { recursive: true })
  await fs.writeFile(path.join(licensesDir, 'profile-catalog-unicode.txt'), unicodeLicense)
  const flagLicense = Object.values(flagsZip.files).find(file => /\/LICENSE$/.test(file.name))
  await fs.writeFile(path.join(licensesDir, 'profile-flags-mit.txt'), await flagLicense.async('string'))
  await fs.writeFile(path.join(root, 'docs/profile-catalog-source-checksums.json'), JSON.stringify(hashes, null, 2) + '\n')
  const pngSize = (await fs.stat(path.join(root, 'static/profile-flags.png'))).size
  console.log(JSON.stringify({ ...metadata, jsBytes: Buffer.byteLength(code), flagBytes: pngSize, totalBytes: Buffer.byteLength(code) + pngSize, localizedNameOverrides: Object.fromEntries(Object.entries(languageNames).map(([locale, names]) => [locale, Object.keys(names).length])) }, null, 2))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
