<template>
 <view class="composer" :style="{paddingTop: navHeight + 'px'}">
  <view class="nav" :style="navStyle"><button class="back" :aria-label="t('common.cancel')" @click="cancel"><uni-icons type="left" size="23" color="#35322e"/></button><text class="nav-title">{{ c('title') }}</text></view>
  <view class="body">
   <view v-if="activitySlug" class="card activity-link"><text>{{ ec.linked }}</text><text class="topic">#{{ activityTitle }}#</text><text class="hint">{{ ec.publicHint }}</text><text v-if="activityError" class="hint">{{ ec.unavailable }}</text><button v-if="activityError" @click="loadActivity">{{ ec.retry }}</button></view>
   <view class="card editor">
    <view class="author"><image v-if="avatar" :src="avatar" mode="aspectFill"/><view v-else class="avatar"><uni-icons type="person-filled" size="26" color="#b9b1a1"/></view><view><text class="name">{{ authorName }}</text><text class="hint">{{ c('hint') }}</text></view></view>
    <textarea v-model="content" :disabled="publishing" :placeholder="t('publish.thought')" :maxlength="contentLimit" auto-height :adjust-position="true" :cursor-spacing="100" class="writing"/>
    <text class="counter">{{ content.length }} / {{ contentLimit }}</text>
    <view class="photo-heading"><text>{{ c('photos') }}</text><text>{{ images.length }} / 9</text></view>
    <view class="photos"><view v-for="(photo,index) in images" :key="photo.url" class="photo"><image :src="fullUrl(photo.url)" mode="aspectFill" @click="preview(index)"/><button v-if="!busy" class="remove" :aria-label="t('publish.deleteImage')" @click="deleteIndex = index; sheet = 'delete'">×</button><view v-if="photo.uploading" class="upload-mask">{{ t('publish.uploading') }}</view></view><button v-if="images.length < 9" class="add photo" :disabled="busy" @click="addPhotos"><uni-icons type="plusempty" size="27" color="#9e8b62"/><text>{{ c('add') }}</text></button></view>
    <text class="photo-hint">{{ c('photoHint') }}</text>
   </view>
   <view class="card settings">
    <button :disabled="busy" @click="openActivities"><text class="at">#</text><text>{{ ec.selectActivity }}</text><text class="value">{{ activityTitle || ec.noActivity }}</text><uni-icons type="right" size="16" color="#aaa"/></button>
    <button :disabled="busy" @click="selectLocation"><uni-icons type="location" size="23"/><text>{{ t('publish.location') }}</text><text class="value">{{ location.name || t('publish.notSelected') }}</text><uni-icons type="right" size="16" color="#aaa"/></button>
    <button :disabled="busy || visibility === 'private'" @click="openReminders"><text class="at">@</text><text>{{ t('publish.remind') }}</text><text class="value">{{ visibility === 'private' ? t('publish.private') : selected.length ? c('selected', {count:selected.length}) : t('publish.notSelected') }}</text><uni-icons type="right" size="16" color="#aaa"/></button>
    <button :disabled="busy || !!activitySlug" @click="draftVisibility = visibility; sheet = 'visibility'"><uni-icons :type="visibility === 'private' ? 'locked' : 'eye'" size="23"/><text>{{ t('publish.visibility') }}</text><text class="value">{{ t('publish.' + visibility) }}</text><uni-icons type="right" size="16" color="#aaa"/></button>
   </view>
  </view>
  <view class="footer"><button class="primary" :disabled="busy" @click="publish">{{ publishing ? t('publish.publishing') : uploading ? t('publish.uploading') : c('title') }}</button></view>
  <SlideUpPanel fixed :open="!!sheet" :z-index="300" :label="sheetTitle" @dismiss="sheet = ''" @after-close="afterClose">
   <view class="sheet"><view class="handle"/><view class="sheet-heading"><text>{{ sheetTitle }}</text><button :aria-label="t('common.cancel')" @click="sheet = ''"><uni-icons type="closeempty" size="24"/></button></view>
    <template v-if="renderedSheet === 'visibility'"><button v-for="option in ['public','private']" :key="option" class="visibility-row" @click="draftVisibility = option"><uni-icons :type="option === 'public' ? 'eye' : 'locked'" size="25"/><view><text>{{ t('publish.'+option) }}</text><text class="hint">{{ c(option === 'public' ? 'publicHint' : 'onlyMe') }}</text></view><uni-icons :type="draftVisibility === option ? 'checkbox-filled' : 'circle'" size="24" :color="draftVisibility === option ? '#C2A052' : '#bbb'"/></button><button class="primary" @click="applyVisibility">{{ t('common.confirm') }}</button></template>
    <template v-else-if="renderedSheet === 'remind'">
     <scroll-view scroll-y class="people"><button v-for="person in candidates" :key="person.id" class="person" @click="togglePerson(person)"><image v-if="person.avatar_url" :src="fullUrl(person.avatar_url)" mode="aspectFill"/><view v-else class="avatar"><uni-icons type="person-filled" size="24" color="#aaa"/></view><text>{{ person.name }}</text><uni-icons :type="selectedIds.includes(person.id) ? 'checkbox-filled' : 'circle'" size="23" :color="selectedIds.includes(person.id) ? '#C2A052' : '#bbb'"/></button><view v-if="peopleLoading" class="state">{{ t('home.loading') }}</view><button v-else-if="peopleError" class="state" @click="loadPeople">{{ c('failed') }}</button><view v-else-if="!candidates.length" class="state">{{ c('empty') }}</view><button v-else-if="hasMore" class="state" @click="loadPeople">{{ c('more') }}</button></scroll-view>
     <button class="primary" :disabled="peopleLoading || peopleError" @click="selected = [...draftSelected]; sheet = ''">{{ t('common.confirm') }} · {{ draftSelected.length }}</button>
    </template>
    <template v-else-if="renderedSheet === 'activity'">
     <text class="hint">{{ ec.publicHint }}</text>
     <scroll-view scroll-y class="people">
      <button class="person" @click="selectActivity(null)">{{ ec.noActivity }}</button>
      <view v-if="eventsLoading" class="state">{{ ec.loading }}</view>
      <button v-else-if="eventsError" class="state" @click="loadActivities">{{ ec.error }} · {{ ec.retry }}</button>
      <view v-else-if="!availableActivities.length" class="state">{{ ec.noActive }}</view>
      <view v-else><button v-for="event in availableActivities" :key="event.id" class="person" @click="selectActivity(event)"><text>#{{ event.title }}#</text><uni-icons :type="activitySlug === event.id ? 'checkbox-filled' : 'circle'" size="23" color="#C2A052"/></button></view>
     </scroll-view>
    </template>
    <template v-else><text class="confirm-copy">{{ t(renderedSheet === 'delete' ? 'publish.deleteImage' : 'publish.discard') }}</text><view class="confirm-actions"><button @click="sheet = ''">{{ t('common.cancel') }}</button><button class="primary" @click="confirmAction">{{ t('common.confirm') }}</button></view></template>
   </view>
  </SlideUpPanel>
 </view>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { onPageScroll, onResize, onBackPress, onUnload, onLoad } from '@dcloudio/uni-app'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import { uploadMomentImagesApi, createMomentApi, getMomentReminderCandidatesApi } from '@/api/index.js'
import { getActivity, getActivities, editorialMessages } from '@/utils/editorial.js'
import { config } from '@/utils/config.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { momentComposerMessages } from '@/utils/momentComposerMessages.js'
import { readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js'
const c = (key, params={}) => Object.entries(params).reduce((text,[k,v]) => text.replace('{'+k+'}',String(v)), (momentComposerMessages[currentLocale.value] || momentComposerMessages.en)[key])
let platform = ''
// #ifdef MP-WEIXIN
platform = 'mp-weixin'
// #endif
const geometry = ref(readChatHeaderGeometry(uni,{clearCapsule:false},platform)), scroll = ref(0)
const navHeight = computed(() => geometry.value.contentTop + 56)
const navStyle = computed(() => ({paddingTop:geometry.value.contentTop+'px',paddingRight:geometry.value.contentRight+'px',backgroundColor:'rgba(243,242,239,'+(.94+Math.min(scroll.value/80,1)*.04)+')',backdropFilter:'blur('+Math.min(scroll.value/4,12)+'px)',WebkitBackdropFilter:'blur('+Math.min(scroll.value/4,12)+'px)'}))
onPageScroll(e => {scroll.value=Math.max(0,e.scrollTop)})
onResize(() => {geometry.value=readChatHeaderGeometry(uni,{clearCapsule:false},platform)})
let user={}; try {const stored=uni.getStorageSync('USER_INFO');user=typeof stored==='string'?JSON.parse(stored):stored||{}} catch (_) {}
const avatar = user.avatar_url || user.avatarUrl || ''
const authorName = user.displayName || user.en_first_name || user.native_first_name || t('moment.user')
const activitySlug=ref(''), activityTitle=ref(''), activityError=ref(false), activityLoading=ref(false)
const availableActivities=ref([]), eventsLoading=ref(false), eventsError=ref(false)
const contentLimit=computed(()=>Math.max(0,2000-(activitySlug.value ? activityTitle.value.replace(/[#\r\n]/g,'').trim().length+3 : 0)))
const ec=computed(()=>editorialMessages[currentLocale.value]||editorialMessages.en)
async function openActivities(){if(busy.value)return;sheet.value='activity';await loadActivities()}
async function loadActivities(){if(eventsLoading.value)return;eventsLoading.value=true;eventsError.value=false;try{const data=await getActivities(currentLocale.value);if(alive)availableActivities.value=(data.items||[]).filter(item=>item.phase==='active')}catch(_){if(alive)eventsError.value=true}finally{eventsLoading.value=false}}
function selectActivity(item){activitySlug.value=item?.id||'';activityTitle.value=item?.title||'';activityError.value=false;if(item)visibility.value='public';sheet.value=''}
async function loadActivity(){if(!activitySlug.value||activityLoading.value)return;activityLoading.value=true;activityError.value=false;try{const item=await getActivity(activitySlug.value,currentLocale.value);if(!alive)return;activityTitle.value=item.title;activityError.value=item.phase!=='active'}catch(_){if(alive)activityError.value=true}finally{activityLoading.value=false}}
onLoad(query=>{if(!query.activitySlug)return;activitySlug.value=String(query.activitySlug);loadActivity()})
watch(currentLocale,loadActivity)
const content=ref(''), images=ref([]), uploading=ref(false), publishing=ref(false), visibility=ref('public'), draftVisibility=ref('public')
const location=ref({name:'',latitude:null,longitude:null}), selected=ref([]), draftSelected=ref([])
const sheet=ref(''), deleteIndex=ref(-1), candidates=ref([]), peopleLoading=ref(false), peopleError=ref(false), hasMore=ref(true), cursor=ref(0)
const selectedIds=computed(()=>draftSelected.value.map(p=>p.id))
const renderedSheet=ref('')
watch(sheet,value=>{if(value)renderedSheet.value=value},{flush:'sync'})
const busy=computed(()=>uploading.value||publishing.value||activityLoading.value)
const sheetTitle=computed(()=>renderedSheet.value==='activity'?ec.value.selectActivity:renderedSheet.value==='visibility'?t('publish.visibility'):renderedSheet.value==='remind'?c('mutual'):t('publish.notice'))
let leaveAfterClose=false, leaving=false, alive=true, peopleRevision=0
function fullUrl(url){return /^(https?:|wxfile:|blob:|file:|data:|_doc|_www)/i.test(url)?url:config.baseURL+url}
function back(){leaving=true;uni.navigateBack()}
function cancel(){if(busy.value)return;if(content.value.trim()||images.value.length||activitySlug.value)sheet.value='discard';else back()}
onBackPress(e=>{if(leaving||e.from==='navigateBack')return false;if(sheet.value){sheet.value='';return true}cancel();return true})
onUnload(()=>{alive=false;peopleRevision++})
function afterClose(){if(leaveAfterClose){leaveAfterClose=false;back()}}
function confirmAction(){if(sheet.value==='delete')images.value.splice(deleteIndex.value,1);else leaveAfterClose=true;sheet.value=''}
function applyVisibility(){visibility.value=activitySlug.value?'public':draftVisibility.value;if(visibility.value==='private')selected.value=[];sheet.value=''}
async function openReminders(){if(busy.value||visibility.value==='private')return;draftSelected.value=[...selected.value];candidates.value=[];cursor.value=0;hasMore.value=true;peopleRevision++;peopleLoading.value=false;sheet.value='remind';await loadPeople()}
async function loadPeople(){if(peopleLoading.value||!hasMore.value)return;const revision=peopleRevision;peopleLoading.value=true;peopleError.value=false;try{const data=await getMomentReminderCandidatesApi({after:cursor.value});if(!alive||revision!==peopleRevision)return;candidates.value=[...candidates.value,...data.items];cursor.value=data.nextCursor;hasMore.value=data.hasMore;if(!hasMore.value){const ids=new Set(candidates.value.map(p=>p.id));draftSelected.value=draftSelected.value.filter(p=>ids.has(p.id))}}catch(_){if(revision===peopleRevision)peopleError.value=true}finally{if(revision===peopleRevision)peopleLoading.value=false}}
function togglePerson(person){const index=draftSelected.value.findIndex(p=>p.id===person.id);if(index>=0)draftSelected.value.splice(index,1);else if(draftSelected.value.length<100)draftSelected.value.push(person);else uni.showToast({title:c('limit'),icon:'none'})}
function selectLocation(){uni.chooseLocation({success:res=>{location.value={name:res.name||res.address,latitude:res.latitude,longitude:res.longitude}},fail:err=>{if(!String(err.errMsg).includes('cancel'))uni.showToast({title:t('publish.locationPermission'),icon:'none'})}})}
function preview(index){uni.previewImage({urls:images.value.map(p=>fullUrl(p.url)),current:index})}
function addPhotos(){if(busy.value)return;uploading.value=true;uni.chooseImage({count:9-images.value.length,sizeType:['compressed'],sourceType:['album','camera'],success:async res=>{const batch=res.tempFilePaths.map(url=>({url,uploading:true}));images.value.push(...batch);try{const urls=await uploadMomentImagesApi(res.tempFilePaths);if(!alive)return;if(!Array.isArray(urls)||urls.length!==batch.length)throw new Error('Incomplete upload');const start=images.value.length-batch.length;images.value.splice(start,batch.length,...urls.map(url=>({url,uploading:false})))}catch(_){if(alive){images.value=images.value.filter(p=>!p.uploading);uni.showToast({title:t('publish.uploadFailed'),icon:'none'})}}finally{if(alive)uploading.value=false}},fail:()=>{uploading.value=false}})}
async function publish(){if(busy.value)return;if(activitySlug.value&&activityError.value){uni.showToast({title:ec.value.unavailable,icon:'none'});return}if(content.value.length>contentLimit.value){uni.showToast({title:ec.value.tooLong,icon:'none'});return}if(!content.value.trim()&&!images.value.length){uni.showToast({title:t('publish.contentRequired'),icon:'none'});return}publishing.value=true;try{const payload={...(activitySlug.value?{activitySlug:activitySlug.value,activityLocale:currentLocale.value}:{}),content:content.value.trim(),images:images.value.map(p=>p.url),visibility:visibility.value,remindUserIds:visibility.value==='public'?selected.value.map(p=>p.id):[]};if(location.value.latitude!==null&&location.value.longitude!==null)Object.assign(payload,{locationName:location.value.name,locationLat:location.value.latitude,locationLng:location.value.longitude});await createMomentApi(payload, {silent:true});if(!alive)return;uni.showToast({title:t('publish.publishSuccess'),icon:'success'});const pages=getCurrentPages(),prev=pages[pages.length-2];prev?.onRefresh?.();back()}catch(error){if(alive){uni.showToast({title:error?.code === 'ACTIVITY_UNAVAILABLE' ? ec.value.unavailable : error?.code === 'ACTIVITY_CONTENT_TOO_LONG' ? ec.value.tooLong : t('publish.publishFailed'),icon:'none'});publishing.value=false}}}
</script>
<style scoped>
.composer{min-height:100vh;box-sizing:border-box;background:#f3f2ef;color:#35322e;padding-bottom:calc(112px + env(safe-area-inset-bottom))}.nav{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;gap:16px;padding-left:20px;padding-bottom:12px;min-height:44px}.nav::after{content:"";position:absolute;top:100%;left:0;right:0;height:8px;background:linear-gradient(rgba(243,242,239,.5),transparent);pointer-events:none}.back{width:44px;height:44px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;margin:0;padding:0;flex-shrink:0}.nav-title{font-size:19px;font-weight:650;overflow-wrap:anywhere}.body{max-width:560px;margin:auto;padding:14px 16px}.card{background:#fff;border-radius:24px;padding:20px;margin-bottom:16px}.author{display:flex;align-items:center;gap:12px}.author image,.avatar{width:44px;height:44px;border-radius:50%;background:#f3f1ec;flex-shrink:0}.avatar{display:flex;align-items:center;justify-content:center}.name{display:block;font-size:16px;font-weight:600}.hint{display:block;color:#99948c;font-size:12px;margin-top:5px;line-height:1.5}.writing{width:100%;min-height:124px;margin-top:22px;font-size:16px;line-height:1.8;box-sizing:border-box}.counter{display:block;text-align:right;font-size:12px;color:#aaa39a;margin:10px 0 24px}.photo-heading{display:flex;justify-content:space-between;font-size:14px;margin-bottom:12px}.photo-heading text+text{color:#999}.photos{display:flex;flex-wrap:wrap;gap:10px}.photo{position:relative;width:calc((100% - 20px)/3);aspect-ratio:1;border-radius:14px;overflow:hidden;background:#f5f4f1}.photo image{width:100%;height:100%;display:block}.remove{position:absolute;right:0;top:0;width:36px;height:36px;padding:0;margin:0;border-radius:0 0 0 14px;background:rgba(30,29,25,.6);color:#fff;line-height:36px;font-size:24px}.add{margin:0;padding:12px 3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;line-height:1.5;font-size:12px;color:#8c8475}.upload-mask{position:absolute;inset:0;background:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;font-size:11px}.photo-hint{display:block;font-size:11px;color:#a09a91;line-height:1.6;margin-top:12px}.settings{padding:5px 18px}.settings button{display:flex;align-items:center;gap:10px;width:100%;padding:17px 0;margin:0;background:transparent;color:#35322e;font-size:14px;text-align:left;line-height:1.5;border-radius:0}.settings button+button{border-top:1px solid #f4f2ee}.settings button[disabled]{opacity:.5}.settings .value{margin-left:auto;max-width:42%;color:#99938a;text-align:right;overflow-wrap:anywhere;font-size:12px}.at{width:23px;font-size:24px;text-align:center}.footer{position:fixed;bottom:0;left:0;right:0;z-index:25;background:#f3f2ef;padding:12px 20px calc(16px + env(safe-area-inset-bottom))}.primary{background:var(--bless-primary,#C2A052);color:#302719;border-radius:22px;padding:15px 14px;font-size:16px;line-height:1.5;margin:0;min-height:52px}.footer .primary{max-width:560px;margin:auto}.primary[disabled]{opacity:.5}button::after{border:0}button:active{opacity:.8}.sheet{padding:10px 20px calc(22px + env(safe-area-inset-bottom));background:#fff;max-height:82vh;overflow-y:auto;box-sizing:border-box}.handle{width:36px;height:4px;margin:0 auto 12px;border-radius:3px;background:#ddd}.sheet-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:19px;font-weight:600;margin-bottom:12px}.sheet-heading button{width:44px;height:44px;flex-shrink:0;background:transparent;padding:0;margin:0;display:flex;align-items:center;justify-content:center}.visibility-row{display:flex;align-items:center;gap:15px;background:transparent;margin:0;padding:18px 0;line-height:1.5;text-align:left;font-size:16px}.visibility-row>view{flex:1}.sheet>.primary{margin-top:20px}.people{height:42vh}.person{display:flex;align-items:center;gap:12px;background:transparent;text-align:left;padding:12px 0;margin:0;font-size:15px;line-height:1.5}.person image{width:42px;height:42px;border-radius:50%;flex-shrink:0}.person>text{flex:1;overflow-wrap:anywhere}.state{display:block;padding:25px 10px;text-align:center;font-size:14px;color:#999;background:transparent;line-height:1.6}.confirm-copy{display:block;padding:16px 0 24px;color:#777;line-height:1.7}.confirm-actions{display:flex;gap:12px}.confirm-actions button{flex:1;margin:0;border-radius:22px;font-size:15px;line-height:1.5;padding:15px 10px}
.activity-link>text{display:block;line-height:1.6}.activity-link>text:first-child{color:#a58544;font-size:12px;margin-bottom:6px}
.topic{color:#a58544;font-weight:600;overflow-wrap:anywhere}
</style>
