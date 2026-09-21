import { catalogCountries, catalogLanguages, catalogLanguageNames, catalogLocales, catalogFlagSprite } from './profileCatalogData.js'
import { profileEditorMessages } from './profileEditorMessages.js'

// Codes, search aliases and flags are UI metadata. Only `label` is written to a profile.
const languageAliases = { eng: 'english', jpn: 'japanese', kor: 'korean', zho: 'chinese', spa: 'spanish' }
const countryAliases = { HK: 'hongKong', TW: 'taiwan', JP: 'japan', KR: 'korea', SG: 'singapore' }
const popularLanguages = ['eng','zho','cmn','yue','jpn','kor','rus','spa','fra','deu','ara','por','hin','ben','ind','vie','tha','tur','ita']
let cachedLocale = '', countries = [], languages = []
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’`]/g, '').replace(/[-\s]+/g, ' ').trim()
const legacyNames = (kind, key) => key ? catalogLocales.map(locale => profileEditorMessages[locale]?.options[kind]?.[key]).filter(Boolean) : []
const compare = (a, b) => a.label.localeCompare(b.label)

function prepare(locale) {
  const effective = catalogLocales.includes(locale) ? locale : 'en'
  if (cachedLocale === effective) return effective
  const index = catalogLocales.indexOf(effective)
  countries = catalogCountries.map(([code, names], flagIndex) => ({
    code, label: names[index], flagIndex,
    search: normalize([code, ...names, ...legacyNames('country', countryAliases[code])].join(' '))
  })).sort(compare)
  languages = catalogLanguages.map(([code, english, alpha2]) => ({
    code, label: catalogLanguageNames[effective]?.[code] || english, alpha2: alpha2 || '', flagIndex: -1,
    search: normalize([code, alpha2, english, ...catalogLocales.map(key => catalogLanguageNames[key]?.[code] || ''), ...legacyNames('language', languageAliases[code])].join(' '))
  })).sort((a, b) => {
    const ai = popularLanguages.indexOf(a.code), bi = popularLanguages.indexOf(b.code)
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || compare(a, b)
  })
  cachedLocale = effective
  return effective
}

export function getProfileCatalog(kind, locale = 'en') {
  const effective = prepare(locale)
  if (kind === 'languages') return languages
  if (kind === 'preferredCountries') {
    const label = profileEditorMessages[effective].options.preferredCountry.all
    return [{ code: 'ALL', label, flagIndex: -1, search: normalize(catalogLocales.map(key => profileEditorMessages[key].options.preferredCountry.all).join(' ')) }, ...countries]
  }
  return countries
}

export function searchProfileCatalog(kind, locale, query = '') {
  const rows = getProfileCatalog(kind, locale), term = normalize(query)
  if (!term) return rows
  const words = term.split(' ')
  const score = row => row.code.toLowerCase() === term || row.alpha2 === term ? 0 : normalize(row.label) === term ? 1 : normalize(row.label).startsWith(term) ? 2 : 3
  return rows.filter(row => words.every(word => row.search.includes(word))).sort((a, b) => score(a) - score(b))
}

export function findProfileCountry(value) {
  if (!value) return null
  const flagIndex = catalogCountries.findIndex(([code, names]) => names.includes(value) || legacyNames('country', countryAliases[code]).includes(value))
  return flagIndex < 0 ? null : { code: catalogCountries[flagIndex][0], flagIndex }
}

export function profileFlagStyle(index) {
  const { columns, tileWidth, tileHeight, width, height } = catalogFlagSprite
  return { width: `${tileWidth}px`, height: `${tileHeight}px`, backgroundSize: `${width}px ${height}px`, backgroundPosition: `${-(index % columns) * tileWidth}px ${-Math.floor(index / columns) * tileHeight}px` }
}
