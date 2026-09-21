<template>
  <view class="profile-editor-workspace">
    <view class="editor-handle" aria-hidden="true" />
    <view class="profile-editor-toolbar">
      <button class="editor-circle profile-editor-close" :disabled="saving" :aria-label="t('profileEditor.common.close')" @click="back"><uni-icons type="closeempty" size="25" /></button>
      <text class="editor-toolbar-title">{{ t('profileEditor.common.title') }}</text>
      <button class="profile-editor-save" :disabled="saving || !dirty" @click="save">{{ saving ? t('profileEditor.common.saving') : t('profileEditor.common.save') }}</button>
    </view>
    <scroll-view class="profile-editor-scroll profile-editor-overview" scroll-y :scroll-into-view="overviewTarget">
      <view class="editor-overview-content">
        <view class="editor-completion"><view class="editor-completion-copy"><text>{{ t('profileEditor.common.completion', { percent: completion.percent }) }}</text><text class="editor-completion-hint">{{ t('profileEditor.common.completeProfile') }}</text></view><text class="editor-completion-number">{{ completion.percent }}%</text></view>
        <view class="editor-progress"><view :style="{ width: `${completion.percent}%` }" /></view>
        <view v-if="saveError" class="profile-editor-save-error" role="alert"><text>{{ saveError }}</text></view>
        <button v-for="group in groups" :key="group.key" :id="`editor-group-${group.key}`" class="profile-editor-group-entry" :data-group="group.key" :disabled="saving" @click="openGroup(group.key)">
          <view class="editor-group-icon"><text v-if="group.key === 'introduction'" class="editor-quote">“</text><uni-icons v-else :type="group.icon" size="22" color="#807b70" /></view>
          <view class="editor-group-copy"><view class="editor-group-title"><text>{{ group.title }}</text><view v-if="completion.missingGroups.includes(group.key)" class="editor-missing-dot" /></view><text class="editor-group-summary">{{ summary(group) }}</text></view>
          <uni-icons type="right" size="16" color="#aaa49a" />
        </button>
        <view class="editor-scroll-end" />
      </view>
    </scroll-view>

    <SlideUpPanel :open="groupOpen" full-height :top-inset="0" :label="activeGroup?.title" @dismiss="cancelGroup" @after-close="activeGroupKey = ''">
      <view v-if="activeGroup" class="profile-editor-fields">
        <view class="editor-handle" aria-hidden="true" />
        <view class="profile-editor-toolbar group-toolbar"><button class="editor-circle profile-editor-group-cancel" :aria-label="t('profileEditor.common.close')" @click="cancelGroup"><uni-icons type="closeempty" size="25" /></button><button class="editor-circle editor-circle-dark profile-editor-group-confirm" :aria-label="t('profileEditor.common.confirm')" @click="confirmGroup"><uni-icons type="checkmarkempty" size="29" color="#fff" /></button></view>
        <scroll-view class="profile-editor-scroll" scroll-y :scroll-into-view="fieldTarget" :scroll-with-animation="false">
          <view class="editor-fields-content">
            <text class="editor-group-heading">{{ activeGroup.title }}</text>
            <view v-for="field in activeGroup.fields" :key="field.key" :id="`editor-field-${field.key}`" :data-field="field.key" class="editor-field" :class="{ 'has-error': fieldError?.field === field.key }">
              <view class="editor-field-label-row"><text class="editor-field-label">{{ field.label }}</text><button v-if="!['select', 'catalog'].includes(field.type) && groupDraft[field.key]" class="editor-clear" :aria-label="t('profileEditor.common.clear')" @click="setValue(field.key, '')"><uni-icons type="closeempty" size="15" color="#969087" /></button></view>
              <button v-if="field.type === 'catalog'" class="editor-catalog-entry" :class="{ empty: !groupDraft[field.key] }" @click="openCatalog(field)"><ProfileCountryFlag v-if="field.catalog !== 'languages'" :index="findProfileCountry(groupDraft[field.key])?.flagIndex ?? -1" /><text>{{ groupDraft[field.key] || t('profileEditor.catalog.choose') }}</text><uni-icons type="right" size="17" color="#a39b8f" /></button>
              <template v-else-if="field.type === 'select'">
                <view v-if="groupDraft[field.key] && !field.options.includes(groupDraft[field.key])" class="editor-current-value"><text class="editor-current-label">{{ t('profileEditor.common.currentValue') }}</text><text>{{ groupDraft[field.key] }}</text></view>
                <view class="editor-choices"><button v-for="option in field.options" :key="option" class="profile-choice" :class="{ selected: groupDraft[field.key] === option }" :aria-pressed="groupDraft[field.key] === option" @click="setValue(field.key, groupDraft[field.key] === option ? '' : option)">{{ option }}</button></view>
              </template>
              <template v-else-if="field.type === 'date'">
                <picker mode="date" :value="groupDraft[field.key] || '2000-01-01'" :end="today" @change="setValue(field.key, $event.detail.value)"><view class="editor-date-input" :class="{ empty: !groupDraft[field.key] }"><text>{{ groupDraft[field.key] || t('profileEditor.common.fieldPlaceholder', { field: field.label }) }}</text><uni-icons type="calendar" size="21" color="#878176" /></view></picker>
              </template>
              <template v-else-if="field.type === 'textarea'">
                <textarea class="editor-textarea" :value="groupDraft[field.key]" :maxlength="field.maxLength || 2000" :auto-height="true" :adjust-position="true" :cursor-spacing="36" :show-confirm-bar="false" :placeholder="t('profileEditor.common.fieldPlaceholder', { field: field.label })" @input="setValue(field.key, $event.detail.value)" /><text class="editor-character-count">{{ Array.from(groupDraft[field.key] || '').length }} / {{ field.maxLength || 2000 }}</text>
              </template>
              <view v-else class="editor-input-wrap"><input class="editor-text-input" :value="groupDraft[field.key]" :type="field.type === 'number' ? 'number' : 'text'" :maxlength="field.maxLength || 255" :adjust-position="true" :cursor-spacing="36" :placeholder="t('profileEditor.common.fieldPlaceholder', { field: field.label })" @input="setValue(field.key, $event.detail.value)" /><text v-if="field.unit" class="editor-unit">{{ field.unit }}</text></view>
              <text v-if="fieldError?.field === field.key" class="editor-field-error" role="alert">{{ t(fieldError.key) }}</text>
            </view>
            <view class="editor-scroll-end" />
          </view>
        </scroll-view>
      </view>
    </SlideUpPanel>

    <ProfileCatalogPicker :open="catalogOpen" :field="catalogField" :value="catalogField ? groupDraft[catalogField.key] : ''" @cancel="catalogOpen = false" @confirm="confirmCatalog" />

    <SlideUpPanel :open="discardOpen" :z-index="30" :label="t('profileEditor.common.unsavedTitle')" @dismiss="discardOpen = false">
      <view class="profile-editor-discard-sheet"><view class="editor-handle" aria-hidden="true" /><text class="editor-discard-title">{{ t('profileEditor.common.unsavedTitle') }}</text><text class="editor-discard-message">{{ t('profileEditor.common.unsavedMessage') }}</text><button class="profile-editor-keep" @click="discardOpen = false">{{ t('profileEditor.common.keepEditing') }}</button><button class="profile-editor-discard" @click="discard">{{ t('profileEditor.common.discard') }}</button></view>
    </SlideUpPanel>
  </view>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import ProfileCatalogPicker from './ProfileCatalogPicker.vue'
import ProfileCountryFlag from './ProfileCountryFlag.vue'
import { findProfileCountry } from '@/utils/profileCatalog.js'
import { t } from '@/utils/localeRuntime.js'
import { submitMyProfileApi } from '@/api/index.js'
import { getProfileEditorGroups, hydrateProfileEditor, buildProfileEditorPatch, validateProfileEditor, getProfileCompletion } from '@/utils/profileEditorModel.js'

const props = defineProps({ profile: { type: Object, required: true }, initialGroup: { type: String, default: '' } })
const emit = defineEmits(['close', 'saved'])
const original = JSON.parse(JSON.stringify(props.profile || {}))
const draft = ref(hydrateProfileEditor(original)), groupDraft = ref({})
const saving = ref(false), saveError = ref(''), fieldError = ref(null)
const activeGroupKey = ref(''), groupOpen = ref(false), discardOpen = ref(false)
const catalogOpen = ref(false), catalogFieldKey = ref('')
const fieldTarget = ref(''), overviewTarget = ref('')
const groups = computed(() => getProfileEditorGroups(t))
const activeGroup = computed(() => groups.value.find(group => group.key === activeGroupKey.value))
const catalogField = computed(() => activeGroup.value?.fields.find(field => field.key === catalogFieldKey.value))
const baseline = hydrateProfileEditor(original)
const dirty = computed(() => Object.keys(draft.value).some(key => draft.value[key] !== baseline[key]))
const completion = computed(() => getProfileCompletion(previewProfile()))
const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

function previewProfile() {
  const profile = { ...original, ...draft.value }
  if (draft.value.birth_date) { const [year, month, day] = draft.value.birth_date.split('-').map(Number); Object.assign(profile, { birth_year: year, birth_month: month, birth_day: day }) }
  else if (hydrateProfileEditor(original).birth_date) Object.assign(profile, { birth_year: null, birth_month: null, birth_day: null })
  return profile
}
function summary(group) { return group.fields.map(field => draft.value[field.key]).filter(Boolean).slice(0, 3).join(' · ') || t('profileEditor.common.unfilled') }
function openGroup(key) {
  if (saving.value || groupOpen.value || !groups.value.some(group => group.key === key)) return
  groupDraft.value = { ...draft.value }; fieldError.value = null; fieldTarget.value = ''; activeGroupKey.value = key; groupOpen.value = true
}
function setValue(key, value) { groupDraft.value[key] = value; if (fieldError.value?.field === key) fieldError.value = null }
function openCatalog(field) { if (!catalogOpen.value) { catalogFieldKey.value = field.key; catalogOpen.value = true } }
function confirmCatalog(value) { if (catalogField.value) setValue(catalogField.value.key, value); catalogOpen.value = false }
function cancelGroup() { if (!saving.value) groupOpen.value = false }
async function confirmGroup() {
  if (!activeGroup.value) return
  const candidate = { ...draft.value }
  for (const field of activeGroup.value.fields) candidate[field.key] = groupDraft.value[field.key]
  const error = validateProfileEditor(candidate, original)
  if (error) { fieldError.value = error; fieldTarget.value = ''; await nextTick(); fieldTarget.value = `editor-field-${error.field}`; return }
  draft.value = candidate; groupOpen.value = false; saveError.value = ''
}
function back() {
  if (saving.value) return
  if (discardOpen.value) { discardOpen.value = false; return }
  if (catalogOpen.value) { catalogOpen.value = false; return }
  if (groupOpen.value) { cancelGroup(); return }
  if (dirty.value) discardOpen.value = true
  else emit('close')
}
function discard() { discardOpen.value = false; emit('close') }
async function save() {
  if (saving.value || !dirty.value || groupOpen.value) return
  const error = validateProfileEditor(draft.value, original)
  if (error) { const group = groups.value.find(item => item.fields.some(field => field.key === error.field)); openGroup(group.key); fieldError.value = error; await nextTick(); fieldTarget.value = `editor-field-${error.field}`; return }
  saving.value = true; saveError.value = ''
  const patch = buildProfileEditorPatch(original, draft.value)
  try {
    await submitMyProfileApi(patch, { silent: true })
    emit('saved', { patch, draft: { ...draft.value } })
    emit('close')
  } catch (_) { saveError.value = t('profileEditor.common.saveFailed') }
  finally { saving.value = false }
}
onMounted(() => { if (props.initialGroup) nextTick(() => openGroup(props.initialGroup)) })
defineExpose({ back })
</script>

<style scoped>
.editor-catalog-entry{display:flex;align-items:center;gap:10px;width:100%;min-height:54px;padding:12px 15px;border:1px solid #e7e3de;border-radius:17px;background:#fff;text-align:left;font-size:16px;}.editor-catalog-entry>text{flex:1;min-width:0;overflow-wrap:anywhere;}.editor-catalog-entry.empty{color:#a6a096;}
.profile-editor-workspace{position:relative;display:flex;flex-direction:column;width:100%;height:100%;min-height:0;overflow:hidden;background:#f5f4f1;border-radius:30px 30px 0 0;color:#24221f;}button{margin:0;box-sizing:border-box;background:none;color:inherit;line-height:1.45;border:0;white-space:normal;overflow-wrap:anywhere;transition:transform 140ms cubic-bezier(.23,1,.32,1);}button::after{border:0;}button:active{transform:scale(.97);}button[disabled]{opacity:.45;}button :deep(.uni-icons){pointer-events:none;}.editor-handle{width:36px;height:4px;margin:10px auto 5px;border-radius:4px;background:#d3d0ca;flex-shrink:0;}.profile-editor-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;min-height:70px;padding:8px 20px 14px;box-sizing:border-box;}.editor-circle{display:flex;align-items:center;justify-content:center;width:46px;height:46px;padding:0;border-radius:50%;background:#fff;flex-shrink:0;}.editor-circle-dark{background:#242321;}.editor-toolbar-title{flex:1;min-width:0;text-align:center;font-size:17px;line-height:1.5;font-weight:600;overflow-wrap:anywhere;}.profile-editor-save{min-height:44px;min-width:62px;max-width:36%;padding:11px 15px;background:#242321;color:#fff;border-radius:24px;font-size:13px;}.profile-editor-scroll{height:0;flex:1;min-height:0;width:100%;}.editor-overview-content{padding:12px 18px 0;}.editor-completion{display:flex;align-items:center;gap:14px;padding:10px 5px 12px;}.editor-completion-copy{flex:1;min-width:0;font-size:14px;font-weight:600;line-height:1.6;}.editor-completion-copy text{display:block;overflow-wrap:anywhere;}.editor-completion-hint{font-size:12px;color:#8c857b;font-weight:400;margin-top:4px;}.editor-completion-number{font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;}.editor-progress{height:4px;background:#e7e3db;border-radius:4px;overflow:hidden;margin:0 5px 24px;}.editor-progress view{height:100%;background:var(--bless-primary, #C2A052);border-radius:4px;transition:width 180ms ease-out;}.profile-editor-group-entry{width:100%;display:flex;gap:13px;align-items:center;text-align:left;min-height:92px;padding:19px 16px;margin-bottom:10px;border-radius:22px;background:#fff;}.editor-group-icon{flex-shrink:0;display:flex;width:27px;align-items:center;justify-content:center;}.editor-quote{font-family:Georgia,'Times New Roman',serif;font-size:37px;height:28px;line-height:1;color:#807b70;font-weight:700;}.editor-group-copy{min-width:0;flex:1;}.editor-group-title{display:flex;gap:9px;align-items:center;font-size:16px;font-weight:600;line-height:1.5;}.editor-group-title>text{min-width:0;overflow-wrap:anywhere;}.editor-missing-dot{width:6px;height:6px;background:#d29259;flex-shrink:0;border-radius:50%;}.editor-group-summary{display:block;font-size:12px;color:#8d887f;line-height:1.6;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.profile-editor-fields{height:100%;display:flex;flex-direction:column;min-height:0;}.group-toolbar{padding-bottom:6px;}.editor-fields-content{padding:20px 22px 0;}.editor-group-heading{display:block;font-size:30px;line-height:1.3;font-weight:650;margin:2px 0 30px;overflow-wrap:anywhere;}.editor-field{padding:0 0 25px;margin-bottom:24px;border-bottom:1px solid #e4e0d9;}.editor-field-label-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:36px;margin-bottom:11px;}.editor-field-label{font-size:16px;font-weight:550;line-height:1.55;overflow-wrap:anywhere;}.editor-clear{display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0;margin:-4px -8px -4px 0;flex-shrink:0;}.editor-choices{display:flex;flex-wrap:wrap;gap:9px;}.profile-choice{min-height:44px;padding:10px 16px;font-size:14px;max-width:100%;border-radius:25px;background:#eae7e2;border:1px solid transparent;text-align:center;}.profile-choice.selected{background:var(--bless-soft, #F1E4BD);border-color:var(--bless-primary, #C2A052);color:var(--bless-text, #775E25);}.editor-current-value{display:flex;flex-direction:column;gap:4px;line-height:1.6;font-size:14px;background:#fff;padding:12px 14px;border-radius:14px;margin-bottom:12px;overflow-wrap:anywhere;}.editor-current-label{font-size:11px;color:#918b82;}.editor-input-wrap,.editor-date-input{display:flex;align-items:center;min-height:52px;gap:8px;background:#fff;border:1px solid #e7e3de;border-radius:16px;padding:0 14px;box-sizing:border-box;}.editor-text-input{min-width:0;flex:1;width:100%;height:52px;font-size:16px;color:#302c26;}.editor-unit{flex-shrink:0;font-size:13px;color:#8d867c;}.editor-date-input{justify-content:space-between;font-size:16px;}.editor-date-input.empty{color:#a6a096;}.editor-textarea{display:block;width:100%;min-height:162px;background:#fff;border:1px solid #e7e3de;border-radius:18px;box-sizing:border-box;padding:15px;font-size:16px;line-height:1.7;color:#302c26;}.editor-character-count{display:block;text-align:right;font-size:11px;color:#a0998e;padding:9px 3px 0;font-variant-numeric:tabular-nums;}.editor-field-error{display:block;color:#b44839;font-size:12px;line-height:1.6;margin-top:9px;}.has-error .editor-input-wrap,.has-error .editor-textarea{border-color:#c46657;}.profile-editor-save-error{background:#fbede8;color:#a94e40;border-radius:16px;padding:14px;font-size:13px;line-height:1.7;margin-bottom:14px;}.editor-scroll-end{height:calc(28px + env(safe-area-inset-bottom));}.profile-editor-discard-sheet{padding:0 24px calc(24px + env(safe-area-inset-bottom));}.editor-discard-title{display:block;font-size:23px;font-weight:600;line-height:1.4;margin:25px 0 12px;overflow-wrap:anywhere;}.editor-discard-message{display:block;font-size:14px;line-height:1.7;color:#817a70;margin-bottom:22px;overflow-wrap:anywhere;}.profile-editor-keep,.profile-editor-discard{width:100%;min-height:48px;border-radius:25px;font-size:15px;padding:12px 16px;}.profile-editor-keep{background:#252321;color:#fff;}.profile-editor-discard{margin-top:9px;color:#82796e;}.editor-scroll-end{flex-shrink:0;}
@media(max-width:350px){.profile-editor-toolbar{padding-left:16px;padding-right:16px;}.editor-fields-content{padding-left:18px;padding-right:18px;}.editor-group-heading{font-size:27px;}.profile-choice{font-size:13px;padding:10px 13px;}.editor-toolbar-title{font-size:15px;}}
@media(prefers-reduced-motion:reduce){button,.editor-progress view{transition:none;}button:active{transform:none;}}
</style>
