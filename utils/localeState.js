import { SUPPORTED_LOCALES, resolveLocale, translate } from './locale.js'

export const LOCALE_STORAGE_KEY = 'lovesapp.locale.preference'
export function createLocaleState(adapter, createRef = value => ({ value })) {
  const locale = createRef('en'); const mode = createRef('auto')
  function restore() { const value = adapter.get(LOCALE_STORAGE_KEY); if (value?.mode) { mode.value = value.mode; locale.value = value.locale || 'en' } }
  function persist() { adapter.set(LOCALE_STORAGE_KEY, { mode: mode.value, locale: locale.value }) }
  function applySystemLocale(systemLocale) { restore(); if (mode.value !== 'manual') { mode.value = 'auto'; locale.value = resolveLocale({ systemLocale }); persist() } }
  async function setManualLocale(value) { if (!SUPPORTED_LOCALES.includes(value)) return; const previous = { mode: mode.value, locale: locale.value }; mode.value = 'manual'; locale.value = value; persist(); try { await adapter.save({ localeMode: 'manual', preferredLocale: value }) } catch (error) { mode.value = previous.mode; locale.value = previous.locale; persist(); throw error } }
  async function setAutoLocale(systemLocale) { const previous = { mode: mode.value, locale: locale.value }; mode.value = 'auto'; try { const data = await adapter.save({ localeMode: 'auto' }) || {}; locale.value = resolveLocale({ mode: 'auto', systemLocale, countryCode: data.countryCode }); persist() } catch (error) { mode.value = previous.mode; locale.value = previous.locale; persist(); throw error } }
  async function bootstrap(systemLocale) { restore(); const data = await adapter.bootstrap(systemLocale); if (mode.value === 'manual') return; mode.value = data?.localeMode || 'auto'; locale.value = resolveLocale({ mode: mode.value, preferredLocale: data?.preferredLocale, systemLocale, countryCode: data?.location?.countryCode }); persist() }
  return { locale, mode, restore, applySystemLocale, bootstrap, setManualLocale, setAutoLocale, t: (key, params) => translate(locale.value, key, params) }
}
