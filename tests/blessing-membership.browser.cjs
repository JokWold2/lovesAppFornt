// Real page/component execution with local fixtures only. Blocks every network request.
// NODE_PATH may point to the Codex bundled browser dependencies.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { build } = require('esbuild')
const { parse, compileScript, compileStyleAsync } = require('@vue/compiler-sfc')

const root = path.resolve(__dirname, '..')
const files = {
  home: 'pages/index/index360.vue',
  detail: 'pages/searchPerson/personShow/personShow.vue',
  search: 'pages/searchPerson/searchPerson.vue',
  navigation: 'components/navigation/LiquidGlassTabBar.vue'
}
const expose = {
  home: 'profiles,deckProfiles,featuredItems,visibleFeaturedItems,membership,loadFeed,loadFeaturedFeed,toggleLike,toggleFeaturedLike,submitComment,submitFeaturedComment,rewindBlessingCard,setBlessingViewMode,hasMore,featuredHasMore,currentEntryIndex',
  detail: 'profile,isLiked,likeCount,chatState,requestChat,toggleProfileLike,refreshLikeState,refreshChatState',
  search: 'canSearch,doSearch,results',
  navigation: 'selectionStyle,selectedIndex'
}
async function bundlePage(kind) {
  const target = path.resolve(root, files[kind])
  const styles = []
  const result = await build({
    stdin: { contents: `import {createApp,nextTick,h} from 'vue'; import Subject from './${files[kind]}'; import {tabBarState} from './utils/tabBarState.js'; window.tabs=tabBarState; const app=createApp(Subject,${kind==='navigation'?"{activeRoute:'pages/likes/likes'}":'{}'}); app.component('uni-icons',{props:['type','size','color'],render(){return h('span',{class:'uni-icons uniui-'+this.type,style:{fontSize:this.size+'px',color:this.color}})}}); window.subject=app.mount('#app'); for(const cb of window.hooks.load) cb({id:1}); for(const cb of window.hooks.show) cb();`, resolveDir: root },
    bundle: true, write: false, platform: 'browser', format: 'iife',
    define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'fixture', setup(b) {
      b.onResolve({filter: /^@dcloudio\/uni-app$|^@\/utils\/(localeRuntime|config|guard)\.js$|^@\/api\//}, args => ({path:args.path,namespace:'fixture'}))
      b.onLoad({filter: /.*/,namespace:'fixture'}, args => {
        if (args.path.includes('/api/')) return {contents: ['getExploreFeedApi','getFeaturedFeedApi','getCommentsApi','toggleLikeMomentApi','addCommentApi','toggleProfileLikeApi','getCandidateProfileApi','getProfileLikesApi','getProfileCommentsApi','addProfileCommentApi','getMembershipApi','decideBlessingApi','rewindBlessingApi','getChatRequestStatusApi','createChatRequestApi','searchCandidatesApi'].map(name=>`export const ${name}=(...args)=>window.fixture.api.${name}(...args);`).join('\n')}
        if (args.path.includes('localeRuntime')) return {contents:`import {ref} from 'vue'; import {translate} from ${JSON.stringify(path.join(root,'utils/locale.js'))}; export const currentLocale=ref('zh-Hans'); window.setFixtureLocale=value=>currentLocale.value=value; export const t=(key,args)=>translate(currentLocale.value,key,args); export const updateTabBarLocale=()=>{};`,resolveDir:root}
        if (args.path.includes('config')) return {contents:'export const config={baseURL:""};'}
        if (args.path.includes('guard')) return {contents:'export const ensureTokenValid=async()=>true;'}
        return {contents:`export const onLoad=cb=>window.hooks.load.push(cb); export const onShow=cb=>window.hooks.show.push(cb); export const onHide=()=>{}; export const onResize=()=>{}; export const onPullDownRefresh=cb=>window.hooks.pullDown.push(cb); export const onReachBottom=()=>{}; export const onPageScroll=()=>{};`}
      })
      b.onResolve({filter: /^@\//}, args=>({path:path.join(root,args.path.slice(2))}))
      b.onLoad({filter:/\.vue$/}, async args=> {
        if (path.resolve(args.path)!==target && !['BlessingCardDeck.vue','FeedContentState.vue','LiquidGlassTabBar.vue'].some(name=>args.path.endsWith(name))) return {contents:`import {h} from 'vue'; export default {emits:['toggle-like'], render(){return h('button',{class:'like-button',onClick:()=>this.$emit('toggle-like')},'Like')}};`}
        let source = fs.readFileSync(args.path,'utf8')
        if(path.resolve(args.path)===target) source=source.replace('</script>',`defineExpose({${expose[kind]}})\n</script>`)
        const {descriptor,errors}=parse(source,{filename:args.path})
        assert.deepEqual(errors,[])
        const script=compileScript(descriptor,{id:'fixture',inlineTemplate:true})
        for(const style of descriptor.styles) {
          const result=await compileStyleAsync({source:style.content,filename:args.path,id:'fixture',preprocessLang:style.lang})
          assert.deepEqual(result.errors,[])
          styles.push(result.code)
        }
        return {contents:script.content,resolveDir:path.dirname(args.path)}
      })
    }}]
  })
  return {code:result.outputFiles[0].text,css:styles.join('\n')}
}

function installFixture() {
  const events = new Map()
  const profiles=[1,2,3].map(id=>({profileId:id,userId:id+10,displayName:`Profile ${id}`,isLiked:false,likeCount:0,birthYear:1998,photos:[]}))
  const state={profiles,decisions:new Map(),history:[],likes:20,rewinds:20,canSearch:false,quota:false,commentQuota:false,delay:false,writes:[],modals:[],routes:[],scrolls:[],searchCalls:0,chatWrites:0,chat:{status:'none',isLiked:false,mutual:false,groupId:null}}
  const membership=()=>({canSearch:state.canSearch,usage:{like:{remaining:state.likes},rewind:{remaining:state.rewinds}},rewind:{available:state.history.length>0,actionId:state.history.at(-1)?.actionId}})
  window.hooks={load:[],show:[],pullDown:[]}
  window.uni={
    $on:(name,fn)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(fn)},
    $off:(name,fn)=>events.get(name)?.delete(fn),$emit:(name,data)=>events.get(name)?.forEach(fn=>fn(data)),
    getStorageSync:key=>key==='USER_INFO'?{id:99}:'1',setStorageSync:()=>{},getSystemInfo:({success})=>success({statusBarHeight:0}),getSystemInfoSync:()=>({windowWidth:390}),
    setNavigationBarTitle:()=>{},stopPullDownRefresh:()=>{},pageScrollTo:opts=>state.scrolls.push(opts),
    createSelectorQuery:()=>({in(){return this},select(){return this},boundingClientRect(fn){fn({height:170});return this},exec(){}}),
    showToast:()=>{},navigateTo:opts=>state.routes.push(opts.url),switchTab:opts=>state.routes.push(opts.url),
    showModal:opts=>{state.modals.push({title:opts.title,content:opts.content,confirmText:opts.confirmText});opts.success({confirm:true,content:''})}
  }
  window.getCurrentPages=()=>[{route:'pages/index/index360'}]
  const api={
    getMembershipApi:async()=>membership(),
    getExploreFeedApi:async({excludeIds=[]})=>({profiles:state.profiles.filter(p=>!state.decisions.has(p.profileId)&&!excludeIds.map(String).includes(String(p.profileId))),hasMore:false}),
    getFeaturedFeedApi:async()=>({items:[{type:'moment',id:1,feedKey:'moment:1',summary:'Moment'},...state.profiles.filter(p=>!state.decisions.has(p.profileId)).map(p=>({...p,id:p.profileId,feedKey:`blessing:${p.profileId}`,type:'blessing'}))],seed:'fixture',nextCursor:'',hasMore:false}),
    decideBlessingApi:async(profileId,decision,source,requestId)=>{
      if(state.quota&&decision==='like')throw {code:'BLESSING_QUOTA_EXCEEDED',action:'like'}
      if(state.delay)await new Promise(resolve=>{state.resolveDecision=resolve})
      const result={profileId,isLiked:decision==='like',likeCount:decision==='like'?1:0,mutual:false,actionId:state.writes.length+1}
      state.decisions.set(profileId,decision);state.writes.push({profileId,decision,source,requestId})
      if(decision==='like')state.likes--
      if(source==='card')state.history.push({...result,decision})
      state.chat.isLiked=result.isLiked
      return result
    },
    rewindBlessingApi:async actionId=>{const last=state.history.pop();if(last.actionId!==actionId)throw Error('wrong action');state.decisions.delete(last.profileId);if(last.decision==='like')state.likes++;state.rewinds--;return {profileId:last.profileId,isLiked:false,likeCount:0,mutual:false}},
    getCandidateProfileApi:async id=>({profile:{id,user_id:Number(id)+10,photos:[],native_first_name:`Profile ${id}`}}),
    getProfileLikesApi:async()=>({isLiked:state.chat.isLiked,total:Number(state.chat.isLiked)}),
    getChatRequestStatusApi:async()=>({...state.chat}),
    createChatRequestApi:async()=>{state.chatWrites++;return {status:'pending'}},
    toggleProfileLikeApi:async(id,liked)=>({profileId:id,isLiked:liked,likeCount:Number(liked)}),
    searchCandidatesApi:async()=>{state.searchCalls++;return {results:[{id:1}],total:1}},
    addProfileCommentApi:async()=>{if(state.commentQuota)throw{code:'BLESSING_QUOTA_EXCEEDED',action:'comment'};return {comment:{content:'test'}}},
    getProfileCommentsApi:async()=>({comments:[]}),getCommentsApi:async()=>({comments:[]}),
    toggleLikeMomentApi:async()=>({isLiked:true,likeCount:1}),addCommentApi:async()=>({comment:{content:'test'}})
  }
  window.fixture={state,api,membership}
}

async function main() {
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true})
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true})
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.route('**/*',route=>route.abort())
    async function mount(kind, beforeMount) {
      const output=await bundlePage(kind)
      await page.goto('about:blank')
      await page.setContent('<style>view{display:block}body{margin:0}button{cursor:pointer}uni-icons{display:inline-block}</style><div id="app"></div>')
      await page.evaluate(installFixture)
      if (beforeMount) await page.evaluate(beforeMount)
      await page.addStyleTag({content:output.css})
      await page.addScriptTag({content:output.code})
    }
    await mount('home')
    await page.waitForSelector('.deck-name')
    assert.equal(await page.locator('.deck-name').textContent(),'Profile 1')
    assert.equal(await page.locator('.deck-photo-controls').count(),0)
    const rewindBox=await page.locator('.deck-rewind').boundingBox(),stageBox=await page.locator('.deck-stage').boundingBox()
    assert.ok(rewindBox.x>stageBox.x+stageBox.width/2&&rewindBox.y>=stageBox.y&&rewindBox.y<stageBox.y+90)
    await page.evaluate(()=>{fixture.state.delay=true})
    await page.locator('.deck-action-like').click()
    await page.waitForFunction(()=>!!fixture.state.resolveDecision)
    assert.equal(await page.locator('.deck-name').textContent(),'Profile 1')
    await page.evaluate(()=>{fixture.state.delay=false;fixture.state.resolveDecision()})
    await page.waitForFunction(()=>document.querySelector('.deck-moving')?.classList.contains('is-leaving'))
    assert.equal(await page.locator('.deck-name').textContent(),'Profile 1')
    await page.waitForFunction(()=>document.querySelector('.deck-name')?.textContent==='Profile 2')
    assert.equal(await page.evaluate(()=>subject.membership.usage.like.remaining),19)
    await page.locator('.deck-rewind').click()
    await page.waitForFunction(()=>document.querySelector('.deck-name')?.textContent==='Profile 1')
    assert.deepEqual(await page.evaluate(()=>[subject.membership.usage.like.remaining,subject.membership.usage.rewind.remaining]),[20,19])
    await page.evaluate(()=>{fixture.state.quota=true})
    await page.locator('.deck-action-like').click()
    await page.waitForFunction(()=>fixture.state.routes.some(url=>url.includes('reason=like')))
    assert.equal(await page.locator('.deck-name').textContent(),'Profile 1')
    await page.evaluate(()=>{fixture.state.quota=false})
    for(const next of ['Profile 2','Profile 3']) {await page.locator('.deck-action-pass').click();await page.waitForFunction(name=>document.querySelector('.deck-name')?.textContent===name,next)}
    await page.locator('.deck-action-pass').click()
    await page.waitForSelector('.deck-empty-rewind')
    await page.locator('.deck-empty-rewind').click()
    await page.waitForFunction(()=>document.querySelector('.deck-name')?.textContent==='Profile 3')
    assert.equal(await page.evaluate(()=>subject.membership.usage.rewind.remaining),18)
    console.log('PASS real Home/Deck: persisted pass, deferred dismissal, quota retention, refunded rewind, last-card rewind, upper-right placement')
    await page.evaluate(async()=>{await subject.loadFeaturedFeed({isRefresh:true});await subject.toggleFeaturedLike(subject.visibleFeaturedItems.find(item=>item.type==='blessing'))})
    assert.deepEqual(await page.evaluate(()=>subject.visibleFeaturedItems.map(item=>item.type)),['moment'])
    await page.evaluate(async()=>{await subject.loadFeed({isRefresh:true})})
    assert.deepEqual(await page.evaluate(()=>subject.visibleFeaturedItems.map(item=>item.type)),['moment'])
    console.log('PASS real Home: featured blessing-only exclusion survives list refresh while moments remain')
    await page.evaluate(async()=>{
      subject.setBlessingViewMode('list');fixture.state.emptyPages=0
      fixture.api.getExploreFeedApi=async()=> ++fixture.state.emptyPages===1 ? {profiles:[],hasMore:true} : {profiles:[{profileId:5,userId:15,displayName:'Profile 5'}],hasMore:false}
      await subject.loadFeed({isRefresh:true})
    })
    await page.waitForFunction(()=>subject.deckProfiles.some(item=>item.profileId===5),undefined,{timeout:1500})
    console.log('PASS real Home list: an empty filtered page loads the next eligible page')
    await page.evaluate(async()=>{fixture.state.commentQuota=true;const item=subject.profiles.find(item=>item.profileId===5);item.commentDraft='Keep this comment';await subject.submitComment(item)})
    assert.equal(await page.evaluate(()=>fixture.state.routes.at(-1)),'/pages/membership/upgrade?reason=comment')
    assert.equal(await page.evaluate(()=>subject.profiles.find(item=>item.profileId===5).commentDraft),'Keep this comment')
    const routesBeforeMoment=await page.evaluate(()=>fixture.state.routes.length)
    await page.evaluate(async()=>{fixture.state.quota=true;await subject.toggleFeaturedLike(subject.visibleFeaturedItems.find(item=>item.type==='moment'))})
    assert.equal(await page.evaluate(()=>fixture.state.routes.length),routesBeforeMoment)
    console.log('PASS real Home: comment quota preserves draft and moment likes stay independent')
    await page.evaluate(async()=>{
      subject.currentEntryIndex=0;subject.featuredItems=[];fixture.state.emptyFeaturedPages=0
      fixture.api.getFeaturedFeedApi=async()=> ++fixture.state.emptyFeaturedPages===1 ? {items:[],hasMore:true,seed:'fixture',nextCursor:'next'} : {items:[{id:9,feedKey:'moment:9',type:'moment'}],hasMore:false,seed:'fixture',nextCursor:''}
      await subject.loadFeaturedFeed({isRefresh:true})
    })
    await page.waitForFunction(()=>subject.visibleFeaturedItems.some(item=>item.id===9),undefined,{timeout:1500})
    console.log('PASS real Home featured: empty filtered page keeps its cursor and continues')
    await mount('detail')
    await page.waitForFunction(()=>!!subject.profile)
    await page.evaluate(()=>subject.requestChat())
    assert.equal(await page.evaluate(()=>fixture.state.modals.at(-1).title),'请先点赞')
    assert.equal(await page.evaluate(()=>fixture.state.writes.length),0)
    assert.equal(await page.evaluate(()=>fixture.state.chatWrites),0)
    assert.equal(await page.evaluate(()=>fixture.state.scrolls.at(-1).selector),'.like-button')
    await page.evaluate(async()=>{fixture.state.chat={status:'none',isLiked:true,mutual:false};await subject.requestChat()})
    assert.equal(await page.evaluate(()=>fixture.state.modals.at(-1).title),'还差一颗心')
    await page.evaluate(async()=>{fixture.state.chat={status:'none',isLiked:true,mutual:true};await subject.requestChat()})
    assert.equal(await page.evaluate(()=>fixture.state.chatWrites),1)
    await page.evaluate(async()=>{fixture.state.chat={status:'approved',groupId:44,isLiked:false,mutual:false};await subject.requestChat()})
    assert.equal(await page.evaluate(()=>fixture.state.routes.at(-1)),'/pages/chat/chatRoom?id=44')
    console.log('PASS real detail: own-like gate never auto-likes, single/mutual states and approved-group continuation')
    await page.evaluate(async()=>{
      const readChat=fixture.api.getChatRequestStatusApi;let firstChat=true
      fixture.api.getProfileLikesApi=()=>new Promise(resolve=>fixture.resolveOldLikes=resolve)
      fixture.api.getChatRequestStatusApi=()=>firstChat?(firstChat=false,new Promise(resolve=>fixture.resolveOldChat=resolve)):readChat()
      fixture.oldLikes=subject.refreshLikeState();fixture.oldChat=subject.refreshChatState()
      await subject.toggleProfileLike()
      fixture.resolveOldLikes({isLiked:false,total:0})
      fixture.resolveOldChat({status:'none',groupId:null,isLiked:false,mutual:false})
      await Promise.all([fixture.oldLikes,fixture.oldChat])
    })
    assert.deepEqual(await page.evaluate(()=>[subject.isLiked,subject.likeCount,subject.chatState.groupId]),[true,1,44])
    console.log('PASS real detail: old like/chat reads cannot overwrite a newly committed like and group state')
    await mount('search')
    await page.waitForSelector('.search-membership-gate button')
    await page.evaluate(()=>subject.doSearch(1))
    assert.equal(await page.evaluate(()=>fixture.state.searchCalls),0)
    assert.equal(await page.locator('.bottom-bar').count(),0)
    await page.evaluate(async()=>{fixture.state.canSearch=true;await subject.doSearch(1)})
    assert.equal(await page.evaluate(()=>fixture.state.searchCalls),1)
    assert.equal(await page.evaluate(()=>subject.results.length),1)
    console.log('PASS real search: lower tiers do not call search; fresh Gold entitlement allows results')
    await mount('navigation')
    await page.evaluate(()=>tabs.setUnreadCount(7))
    await page.waitForSelector('.liquid-tabbar-badge')
    assert.equal(await page.locator('.liquid-tabbar-item').count(),4)
    assert.equal(await page.locator('.liquid-tabbar-item').nth(1).getAttribute('aria-current'),'page')
    assert.equal(await page.locator('.liquid-tabbar-item').nth(1).locator('.liquid-tabbar-badge').count(),0)
    assert.equal(await page.locator('.liquid-tabbar-item').nth(2).locator('.liquid-tabbar-badge').textContent(),'7')
    assert.equal(await page.evaluate(()=>subject.selectionStyle.width),'25%')
    console.log('PASS real navigation: four tabs, Likes selection, 25% selector, message badge on Messages')
    await mount('home',()=>{
      fixture.state.canSearch=true;fixture.membershipRequests=0
      fixture.api.getMembershipApi=async()=>{if(++fixture.membershipRequests===1)throw Error('first response lost');return fixture.membership()}
    })
    await page.waitForSelector('.deck-name')
    assert.equal(await page.evaluate(()=>subject.membership),null)
    await page.evaluate(()=>{for(const cb of hooks.pullDown)cb()})
    await page.waitForFunction(()=>subject.membership?.canSearch===true,undefined,{timeout:1500})
    assert.equal(await page.evaluate(()=>fixture.membershipRequests),2)
    await page.evaluate(async()=>{const read=fixture.api.getMembershipApi;fixture.api.getMembershipApi=async()=>{throw Error('response lost again')};for(const cb of hooks.show)cb();await new Promise(resolve=>setTimeout(resolve,0));fixture.api.getMembershipApi=read})
    assert.equal(await page.evaluate(()=>subject.membership),null)
    await page.locator('.blessing-quota').click()
    await page.waitForFunction(()=>subject.membership?.canSearch===true,undefined,{timeout:1500})
    assert.equal(await page.evaluate(()=>fixture.state.routes.length),0)
    console.log('PASS real Home: failed membership fetch recovers through pull refresh or the quota retry control')

    await mount('home',()=>{
      fixture.api.getExploreFeedApi=async()=>{throw Error('fixture unavailable')}
      fixture.api.getFeaturedFeedApi=async()=>{throw Error('fixture unavailable')}
      fixture.api.getMembershipApi=async()=>{throw Error('fixture unavailable')}
    })
    await page.waitForSelector('.deck-empty.is-error')
    await page.evaluate(()=>subject.setBlessingViewMode('list'))
    assert.equal(await page.locator('.blessing-list .feed-state-title').textContent(),'暂时没能加载')
    assert.equal(await page.locator('.fab-button').count(),0)
    await page.evaluate(()=>{subject.currentEntryIndex=0})
    await page.waitForSelector('.feed-state.is-error:visible')
    assert.equal(await page.locator('.feed-state-title:visible').textContent(),'暂时没能加载')
    await page.evaluate(()=>{
      fixture.feedRetries=0;fixture.membershipRetries=0
      fixture.api.getMembershipApi=async()=>{fixture.membershipRetries++;return fixture.membership()}
      fixture.api.getFeaturedFeedApi=()=>{fixture.feedRetries++;return new Promise(resolve=>fixture.resolveFeed=resolve)}
      const button=document.querySelector('.feed-state-action');button.click();button.click()
    })
    await page.waitForSelector('.feed-state.is-loading:visible')
    assert.equal(await page.locator('.feed-state-action:visible').count(),0)
    assert.deepEqual(await page.evaluate(()=>[fixture.feedRetries,fixture.membershipRetries]),[1,1])
    await page.evaluate(()=>fixture.resolveFeed({items:[],hasMore:false,seed:'exhausted',nextCursor:''}))
    await page.waitForSelector('.feed-state.is-empty:visible')
    assert.equal(await page.locator('.feed-state-title:visible').textContent(),'暂时没有精选内容')
    await page.evaluate(async()=>{
      fixture.api.getFeaturedFeedApi=async()=>{throw Error('refresh after exhausted feed')}
      await subject.loadFeaturedFeed({isRefresh:true})
      fixture.api.getFeaturedFeedApi=async()=>{fixture.feedRetries++;return {items:[{id:9,feedKey:'moment:9',type:'moment'}],hasMore:false,seed:'recovered',nextCursor:''}}
    })
    await page.locator('.feed-state-action:visible').click()
    await page.waitForSelector('.featured-card')
    assert.equal(await page.evaluate(()=>fixture.feedRetries),2)
    console.log('PASS real empty/error/loading states: truthful titles, hidden empty-page top control, guarded retry, quota recovery, exhausted-feed refresh recovery')
    assert.deepEqual(errors,[])
  } finally {await browser.close()}
}
if (require.main === module) main().catch(error=>{console.error(error);process.exitCode=1})
module.exports = { bundlePage, installFixture }
