<template>
 <view class="onboarding" :style="{paddingTop:navHeight+'px'}">
  <view class="navigation" :style="{paddingTop:geometry.contentTop+'px',paddingRight:geometry.contentRight+'px',backgroundColor:'rgba(245,244,241,'+(0.7+progress*0.26)+')',backdropFilter:'blur('+(progress*12)+'px)'}">
   <button v-if="step>0" class="circle" :disabled="busy" @click="back" :aria-label="t('onboarding.back')"><uni-icons type="left" size="24" color="#514c44" /></button>
   <button v-else class="text-button" :disabled="busy" @click="logout">{{ t('onboarding.exit') }}</button>
   <text class="nav-title">{{ t('onboarding.title') }}</text>
  </view>
  <view v-if="loading || failed" class="state"><text>{{ t(loading?'onboarding.saving':'onboarding.failed') }}</text><button v-if="failed" class="primary" @click="load">{{ t('onboarding.retry') }}</button></view>
  <view v-else class="content">
   <view class="steps"><view v-for="n in 5" :key="n" class="step-dot" :class="{active:n===step+1,done:n<step+1}" /></view>
   <text class="step-caption">{{ t('onboarding.progress',{current:step+1,total:5}) }}</text>
   <text class="heading">{{ t('onboarding.'+stepKeys[step]) }}</text>
   <text class="hint">{{ t('onboarding.'+stepKeys[step]+'Hint') }}</text>
   <view :key="step" class="step-body">
    <view v-if="step===0" class="card"><input v-model="form.name" class="name-input" :maxlength="100" :placeholder="t('onboarding.name')" :cursor-spacing="100" confirm-type="next" @confirm="next" /><text class="counter">{{ form.name.length }}/100</text></view>
    <view v-if="step===1" class="gender-list"><button v-for="g in genders" :key="g.value" class="gender-card" :class="{selected:form.gender===g.value}" @click="form.gender=g.value"><text class="gender-symbol">{{ g.symbol }}</text><text>{{ t('onboarding.'+g.key) }}</text><view class="selection-dot"><text v-if="form.gender===g.value">✓</text></view></button></view>
    <view v-if="step===2" class="avatar-card card"><image v-if="form.avatar" :src="form.avatar" mode="aspectFill" class="avatar" @click="preview(form.avatar)" /><view v-else class="avatar-placeholder"><uni-icons type="person" size="64" color="#b2a48b" /></view><button class="secondary" :disabled="busy" @click="upload(true)"><uni-icons type="camera" size="20" color="#615c54" /> {{ t(form.avatar?'onboarding.replace':'onboarding.upload') }}</button></view>
    <view v-if="step===3" class="card"><textarea v-model="form.bio" class="bio-input" :maxlength="255" :placeholder="t('onboarding.bioHint')" :cursor-spacing="100" /><text class="counter">{{ form.bio.length }}/255</text></view>
    <view v-if="step===4" class="photo-grid"><view v-for="photo in form.photos" :key="photo" class="photo-cell"><image :src="photo" mode="aspectFill" @click="preview(photo)" /><button class="remove" :disabled="busy" @click="removePhoto(photo)" :aria-label="t('onboarding.remove')">×</button></view><button v-if="form.photos.length<9" class="photo-add" :disabled="busy" @click="upload(false)"><uni-icons type="plusempty" size="30" color="#a8997d" /><text>{{ t('onboarding.upload') }}</text><text>{{ form.photos.length }}/9</text></button></view>
   </view>
   <view class="actions"><button class="primary" :disabled="busy" hover-class="pressed" @click="next">{{ t(busy?'onboarding.saving':step===4?'onboarding.finish':'onboarding.next') }}</button><button v-if="step===4" class="text-button skip" :disabled="busy" @click="next">{{ t('onboarding.skip') }}</button></view>
  </view>
 </view>
</template>
<script setup>
import {ref,reactive,computed} from 'vue'
import {onLoad,onPageScroll,onResize,onBackPress} from '@dcloudio/uni-app'
import {getOnboardingApi,saveOnboardingApi} from '@/api/onboarding.js'
import {uploadAvatarApi,uploadProfilePhotosApi,deleteProfilePhotoApi} from '@/api/index.js'
import {getUserInfo,setUserInfo,clearAuth,getToken} from '@/utils/auth.js'
import {stopPresence} from '@/utils/presence.js'
import {t} from '@/utils/localeRuntime.js'
import {readChatHeaderGeometry} from '@/utils/chatHeaderLayout.js'
let platform=''
// #ifdef MP-WEIXIN
platform='mp-weixin'
// #endif
const geometry=ref(readChatHeaderGeometry(uni,{clearCapsule:false},platform))
const navHeight=computed(()=>geometry.value.contentTop+60),progress=ref(0)
const step=ref(0),loading=ref(true),failed=ref(false),busy=ref(false)
const stepKeys=['name','gender','avatar','bio','photos']
const genders=[{value:'男',key:'male',symbol:'♂'},{value:'女',key:'female',symbol:'♀'}]
const form=reactive({name:'',gender:'',avatar:'',bio:'',photos:[]})
function toast(key='failed'){uni.showToast({title:t('onboarding.'+key),icon:'none'})}
function complete(){setUserInfo({...getUserInfo(),name:form.name,avatar_url:form.avatar,needsOnboarding:false,onboardingStep:5});uni.reLaunch({url:'/pages/index/index360'})}
async function load(){if(!getToken()){uni.reLaunch({url:'/pages/login/login360'});return}loading.value=true;failed.value=false;try{const data=await getOnboardingApi();const p=data.profile||{};Object.assign(form,{name:p.en_first_name||'',gender:p.gender||'',avatar:p.avatar_url||'',bio:p.bio||'',photos:p.photos||[]});if(data.step>=5){complete();return}step.value=data.step;setUserInfo({...getUserInfo(),needsOnboarding:true,onboardingStep:data.step})}catch(_){failed.value=true}finally{loading.value=false}}
function back(){if(busy.value)return;if(step.value>0){step.value--;uni.pageScrollTo({scrollTop:0,duration:0})}}
function logout(){if(busy.value)return;stopPresence({clearSession:true});clearAuth();uni.reLaunch({url:'/pages/login/login360'})}
async function next(){if(busy.value||loading.value)return;const valid=[!!form.name.trim(),['男','女'].includes(form.gender),!!form.avatar,!!form.bio.trim(),true][step.value];if(!valid){toast('required');return}busy.value=true;try{const data=await saveOnboardingApi({step:step.value,name:form.name,gender:form.gender,bio:form.bio});setUserInfo({...getUserInfo(),name:form.name.trim(),avatar_url:form.avatar,onboardingStep:data.step,needsOnboarding:data.needsOnboarding});if(step.value===4){complete();return}step.value++;uni.hideKeyboard();uni.pageScrollTo({scrollTop:0,duration:0})}catch(_){toast()}finally{busy.value=false}}
function preview(url){uni.previewImage({urls:step.value===4?form.photos:[url],current:url})}
async function upload(avatar){if(busy.value)return;busy.value=true;let selected;try{selected=await new Promise((resolve,reject)=>uni.chooseImage({count:avatar?1:9-form.photos.length,sizeType:['compressed'],sourceType:['album','camera'],success:resolve,fail:reject}))}catch(_){busy.value=false;return}try{if(avatar){const result=await uploadAvatarApi(selected.tempFilePaths[0]);if(!result?.url)throw new Error('UPLOAD_FAILED');form.avatar=result.url}else{await uploadProfilePhotosApi(selected.tempFilePaths,{onUploaded:result=>{form.photos=result.photos||form.photos}})}}catch(_){toast()}finally{busy.value=false}}
async function removePhoto(url){if(busy.value)return;busy.value=true;try{const result=await deleteProfilePhotoApi(url);form.photos=result.photos}catch(_){toast()}finally{busy.value=false}}
onLoad(load)
onPageScroll(e=>{progress.value=Math.min(1,Math.max(0,e.scrollTop/48))})
onResize(()=>{geometry.value=readChatHeaderGeometry(uni,{clearCapsule:false},platform)})
onBackPress(()=>{back();return true})
</script>
<style scoped>
.onboarding{min-height:100vh;background:#f5f4f1;color:#302e29;box-sizing:border-box;padding-bottom:env(safe-area-inset-bottom)}
button{font-family:inherit;line-height:1.5;border:0}button::after{border:0}button[disabled]{opacity:.5}
.navigation{position:fixed;top:0;left:0;right:0;z-index:10;display:flex;align-items:center;gap:18px;padding-left:20px;padding-bottom:8px;min-height:44px}
.navigation::after{content:"";position:absolute;top:100%;left:0;right:0;height:10px;background:linear-gradient(rgba(245,244,241,.5),transparent);pointer-events:none}
.circle{width:44px;height:44px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;margin:0;padding:0}
.nav-title{font-size:16px;font-weight:600}.text-button{background:transparent;color:#71695c;font-size:13px;margin:0;padding:10px 0}
.content{max-width:480px;padding:28px 24px 24px;margin:auto;box-sizing:border-box;min-height:75vh;display:flex;flex-direction:column}
.steps{display:flex;gap:8px;margin-bottom:12px}.step-dot{width:7px;height:7px;border-radius:5px;background:#dfdcd5}.step-dot.done{background:#d4bd91}.step-dot.active{width:28px;background:#ba9552}
.step-caption{font-size:12px;color:#958b7a;margin-bottom:20px}.heading{font-size:30px;font-weight:700;line-height:1.3}.hint{font-size:14px;line-height:1.7;color:#8d806b;margin-top:12px;display:block}
.step-body{margin-top:32px;flex:1}.card{background:white;border-radius:24px;padding:22px;box-sizing:border-box}.name-input{height:48px;font-size:20px;width:100%}.counter{display:block;font-size:12px;text-align:right;color:#aaa49a;margin-top:14px}
.gender-list{display:flex;flex-direction:column;gap:18px}.gender-card{display:flex;align-items:center;gap:24px;width:100%;min-height:112px;padding:24px;background:white;border:2px solid transparent;border-radius:24px;text-align:left;font-size:20px;color:#454038}.gender-card.selected{border-color:#d3bc90;background:#fbf5e9}.gender-symbol{font-size:40px;color:#aa8a51}.selection-dot{margin-left:auto;width:24px;height:24px;border:1px solid #d7cdbd;border-radius:50%;font-size:16px;text-align:center;line-height:24px}
.avatar-card{text-align:center}.avatar,.avatar-placeholder{width:190px;height:190px;max-width:100%;border-radius:50%;margin:12px auto 24px}.avatar-placeholder{display:flex;align-items:center;justify-content:center;background:#f6f1e8;border:1px dashed #d4c5a9}
.secondary{background:#f6f1e8;color:#615c54;border-radius:16px;padding:12px;font-size:15px;display:flex;gap:8px;align-items:center;justify-content:center;white-space:normal}
.bio-input{width:100%;height:220px;font-size:17px;line-height:1.7}.photo-grid{display:flex;flex-wrap:wrap;gap:10px}.photo-cell,.photo-add{position:relative;width:calc((100% - 20px)/3);height:132px;border-radius:18px;overflow:hidden}.photo-cell image{width:100%;height:100%}.remove{position:absolute;right:4px;top:4px;border-radius:50%;width:28px;height:28px;padding:0;background:rgba(255,255,255,.95);font-size:23px;line-height:26px;color:#514b41}
.photo-add{margin:0;border:1px dashed #d0c2a9;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:8px;font-size:11px;color:#958871;white-space:normal}
.actions{margin-top:44px;padding-bottom:16px}.primary{width:100%;background:#f2e5cf;color:#39352f;font-size:17px;font-weight:600;border-radius:16px;padding:14px 18px;min-height:52px;white-space:normal;box-shadow:0 4px 0 #d5c7b2,0 5px 7px #e2ddd4;transition:transform 150ms ease,box-shadow 150ms ease}.pressed{transform:translateY(3px);box-shadow:0 1px 0 #d5c7b2}.skip{margin:14px auto 0;text-align:center}.state{padding:60px 24px;text-align:center}.state .primary{margin-top:20px}
@media(prefers-reduced-motion:reduce){.primary{transition:none}}
</style>
