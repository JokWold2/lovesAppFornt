<template>
 <view class="activity" :style="{paddingTop:navHeight+'px'}">
  <view class="nav" :style="navStyle">
   <view class="nav-base" :style="{opacity:1-fadeProgress}"/>
   <view class="nav-frost" :style="{opacity:fadeProgress}"/>
   <view class="nav-fade" :style="{opacity:fadeProgress}"/>
   <view class="nav-row" :style="{minHeight:geometry.rowHeight+'px'}"><GlassCircleButton :label="c.back" @tap="back"><view class="chevron"/></GlassCircleButton><text>{{ c.title }}</text></view>
  </view>
  <view v-if="loading" class="state">{{ c.loading }}</view>
  <view v-else-if="failed" class="state"><text>{{ c.error }}</text><button @click="load">{{ c.retry }}</button></view>
  <view v-else-if="item" class="body">
   <image class="cover" :src="item.cover" mode="widthFix"/>
   <view class="panel"><text class="status">{{ c[item.phase] }}</text><text class="title">{{ item.title }}</text><text class="date">{{ eventDates(item) }}</text><view v-if="item.stats" class="activity-stats"><view class="stat-heat" :aria-label="c.heat+' '+item.stats.heat"><uni-icons type="fire-filled" size="14" color="#a1844b"/><text>{{ item.stats.heat }}</text></view><text>· {{ item.stats.participants }} {{ c.participants }} · {{ item.stats.posts }} {{ c.postCount }}</text></view><text v-if="item.fallback" class="date">{{ c.fallback }}{{ contentLanguageNames[item.locale] }}</text></view>
   <view class="panel"><text class="heading">{{ c.about }}</text><text class="prose" selectable>{{ item.body }}</text></view>
   <view class="panel"><text class="heading">{{ c.rules }}</text><text class="prose" selectable>{{ item.rules }}</text></view>
   <view class="work-tabs"><button :class="{selected:!mine}" @click="choose(false)">{{ c.works }}</button><button :class="{selected:mine}" @click="choose(true)">{{ c.mine }}</button></view>
   <view v-if="workLoading && !works.length" class="state">{{ c.loading }}</view>
   <view v-else-if="!workFailed && !works.length" class="state">{{ c.noWorks }}</view>
   <button v-for="work in works" :key="work.id" class="panel work" @click="openWork(work.id)"><image v-if="work.images && work.images.length" :src="fullUrl(work.images[0])" mode="aspectFit"/><text class="prose">{{ work.content }}</text></button>
   <button v-if="workFailed || works.length < total" class="more" :disabled="workLoading" @click="loadWorks">{{ workLoading ? c.loading : workFailed ? c.retry : c.more }}</button>
  </view>
  <view v-if="item && !failed" class="footer"><text>{{ c.publicHint }}</text><button :disabled="item.phase!=='active'" @click="join">{{ item.phase==='active'?c.join:c[item.phase] }}</button></view>
 </view>
</template>
<script setup>
import {ref,computed,watch,onBeforeUnmount} from 'vue'
import {onLoad,onPageScroll,onResize,onPullDownRefresh,onShow} from '@dcloudio/uni-app'
import GlassCircleButton from '@/components/chat/GlassCircleButton.vue'
import {readChatHeaderGeometry,getChatHeaderGlassProgress} from '@/utils/chatHeaderLayout.js'
import {currentLocale} from '@/utils/localeRuntime.js'
import {config} from '@/utils/config.js'
import {getActivity,getActivityMoments,editorialMessages,eventDates,contentLanguageNames} from '@/utils/editorial.js'
let platform=''
// #ifdef MP-WEIXIN
platform='mp-weixin'
// #endif
const geometry=ref(readChatHeaderGeometry(uni,{clearCapsule:false},platform)),scroll=ref(0)
const navHeight=computed(()=>geometry.value.contentTop+geometry.value.rowHeight+12)
const fadeProgress=computed(()=>getChatHeaderGlassProgress(scroll.value))
const navStyle=computed(()=>({paddingTop:geometry.value.contentTop+'px',paddingLeft:geometry.value.contentLeft+'px',paddingRight:geometry.value.contentRight+'px'}))
onResize(()=>geometry.value=readChatHeaderGeometry(uni,{clearCapsule:false},platform));onPageScroll(e=>scroll.value=Math.max(0,e.scrollTop))
const c=computed(()=>editorialMessages[currentLocale.value]||editorialMessages.en)
const id=ref(''),item=ref(null),loading=ref(true),failed=ref(false),mine=ref(false),works=ref([]),total=ref(0),workLoading=ref(false),workFailed=ref(false)
let revision=0,workRevision=0,page=1
async function load(){if(!id.value)return;const version=++revision;loading.value=true;failed.value=false;try{const data=await getActivity(id.value,currentLocale.value);if(version!==revision)return;item.value=data;resetWorks();await loadWorks()}catch(_){if(version===revision)failed.value=true}finally{if(version===revision)loading.value=false}}
function resetWorks(){workRevision++;works.value=[];page=1;total.value=0;workLoading.value=false;workFailed.value=false}
async function loadWorks(){if(workLoading.value)return;const version=workRevision;workLoading.value=true;workFailed.value=false;try{const data=await getActivityMoments(id.value,page,mine.value);if(version!==workRevision)return;works.value=[...works.value,...data.items];total.value=data.total;page++}catch(_){if(version===workRevision)workFailed.value=true}finally{if(version===workRevision)workLoading.value=false}}
function choose(value){if(mine.value===value)return;mine.value=value;resetWorks();loadWorks()}
function fullUrl(url){return /^https?:\/\//i.test(url)?url:config.baseURL+url}
function openWork(value){uni.navigateTo({url:'/pages/moments/momentDetail?id='+value})}
function back(){uni.navigateBack({fail:()=>uni.switchTab({url:'/pages/index/index360'})})}
let returningFromComposer=false
function join(){if(item.value?.phase!=='active')return;uni.navigateTo({url:'/pages/my/myLifeShowEdit/myLifeShowEdit?activitySlug='+encodeURIComponent(id.value),success:()=>returningFromComposer=true})}
onShow(()=>{if(returningFromComposer){returningFromComposer=false;load()}})
onLoad(query=>{id.value=String(query.id||'');mine.value=query.mine==='1';load()});watch(currentLocale,load)
onPullDownRefresh(async()=>{try{await load()}finally{uni.stopPullDownRefresh()}})
onBeforeUnmount(()=>{revision++;workRevision++})
</script>
<style scoped>
.activity{min-height:100vh;background:#f7f6f2;color:#302e29;box-sizing:border-box;padding-bottom:calc(125px + env(safe-area-inset-bottom))}.nav{position:fixed;top:0;left:0;right:0;z-index:20;padding-bottom:12px;box-sizing:border-box}.nav-base,.nav-frost{position:absolute;inset:0;pointer-events:none}.nav-base{background:#f7f6f2}.nav-frost{background:rgba(247,246,242,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.nav-fade{position:absolute;top:100%;left:0;right:0;height:32px;pointer-events:none;background:linear-gradient(to bottom,rgba(247,246,242,.94),rgba(247,246,242,0));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);mask-image:linear-gradient(to bottom,#000,transparent);-webkit-mask-image:linear-gradient(to bottom,#000,transparent)}.nav-row{position:relative;z-index:1;display:flex;align-items:center;gap:12px}.nav-row>text{font-size:18px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chevron{width:12px;height:12px;border-left:2px solid #292825;border-bottom:2px solid #292825;transform:translateX(3px) rotate(45deg)}.body{max-width:540px;padding:14px 16px;margin:auto}.cover{width:100%;border-radius:24px;display:block;margin-bottom:16px}.panel{background:#fff;border-radius:24px;padding:22px;margin:0 0 16px;box-sizing:border-box}.title{display:block;font-size:25px;font-weight:700;line-height:1.4;margin:10px 0;overflow-wrap:break-word}.status{color:#997831;font-size:12px}.date{display:block;color:#938d82;font-size:12px;line-height:1.8;margin-top:8px}.heading{display:block;font-size:18px;font-weight:650;margin-bottom:14px}.prose{display:block;font-size:15px;line-height:1.8;white-space:pre-wrap;overflow-wrap:break-word}.work-tabs{display:flex;gap:8px;margin:22px 0 16px}.work-tabs button{flex:1;margin:0;border-radius:22px;background:#fff;font-size:14px;padding:10px;line-height:1.6}.work-tabs .selected{background:#f1e4bd;color:#775e25}.work{width:100%;text-align:left}.work image{display:block;width:100%;height:220px;border-radius:14px;background:#f5f4f0;margin-bottom:14px}.footer{position:fixed;bottom:0;left:0;right:0;padding:10px 20px calc(14px + env(safe-area-inset-bottom));background:#f7f6f2;z-index:20}.footer text{display:block;text-align:center;font-size:12px;color:#948d81;margin-bottom:8px}.footer button{max-width:540px;margin:auto;background:#c2a052;border-radius:20px;font-size:16px;padding:12px 16px;line-height:1.6}.footer button[disabled]{background:#e8e3d8;color:#999}.state{padding:46px 16px;text-align:center;color:#938b7d}.state button,.more{font-size:14px;background:#f1e4bd;border-radius:22px;margin-top:16px}button::after{border:0}
.activity-stats{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:12px;color:#a1844b;font-size:12px;line-height:1.7}.stat-heat{display:flex;align-items:center;gap:4px;flex-shrink:0}
</style>
