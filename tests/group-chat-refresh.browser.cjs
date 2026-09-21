// Local H5 regression. All API calls are mocked; no live account is changed.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const { chromium } = require('playwright')
const base = process.env.H5_BASE_URL || 'http://127.0.0.1:5187/app/'
const out = process.env.QA_SCREENSHOT_DIR || 'F:/workspace/.lovesapp-runtime/group-chat-refresh/screenshots'
const avatar = id => new URL(`/__group_qa__/${id}.svg`, base).href
const members = [
  {userId:1,profileId:101,name:'林予安',role:'member',avatarUrl:avatar(1),email:'lin@example.invalid'},
  {userId:2,profileId:102,name:'陈以宁',role:'member',avatarUrl:avatar(2),email:'chen@example.invalid'},
  {userId:99,profileId:199,name:'我',role:'member',avatarUrl:avatar(99),email:'qa@example.invalid'},
  {userId:3,profileId:103,name:'沟通老师',role:'admin',avatarUrl:avatar(3),email:'admin@example.invalid'}
]
async function main() {
  assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));fs.mkdirSync(out,{recursive:true})
  const browser=await chromium.launch({channel:'chrome',headless:true})
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'})
  const page=await context.newPage();page.setDefaultTimeout(10000)
  const errors=[],writes=[],results=[];page.on('pageerror',e=>errors.push(e.message))
  let level=5,locale='zh-Hans',failDetail=false,candidateFailure=false,status='active'
  let groupMembers=[...members],inviteGate=null
  let messages=[
    {id:1,sender_user_id:1,sender_name:'林予安',sender_avatar_url:avatar(1),content:'很高兴认识大家 😊',message_type:'text',created_at:'2026-09-18T07:24:00Z',mentions:[]},
    {id:2,sender_user_id:2,sender_name:'陈以宁',sender_avatar_url:avatar(2),content:'我也是！周末一般喜欢做什么？',message_type:'text',created_at:'2026-09-18T07:25:00Z',mentions:[]},
    {id:3,sender_user_id:99,sender_name:'我',sender_avatar_url:avatar(99),content:'@陈以宁 我喜欢散步和拍照。',message_type:'text',created_at:'2026-09-18T07:26:00Z',mentions:[{userId:2,name:'陈以宁'}],reply:{sender_name:'陈以宁',content:'周末一般喜欢做什么？',message_type:'text'},readCount:2,readBy:members.slice(0,2),unreadBy:[members[3]]}
  ]
  const send=(route,data,code=200)=>route.fulfill({status:code,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'},body:JSON.stringify(data)})
  const group=()=>({id:71,name:'沟通群聊',avatar_url:'',status,role:'member',canManage:level===5||level===6,members:groupMembers,memberCount:groupMembers.length})
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),p=url.pathname,m=req.method()
    if(p.startsWith('/api/')){
      if(m==='OPTIONS')return send(route,{},204)
      if(p==='/api/auth/validate')return send(route,{valid:true,user:{id:99,accountLevel:level,email:'qa@example.invalid'}})
      if(p.startsWith('/api/locale/'))return send(route,{effectiveLocale:locale,localeMode:'manual',preferredLocale:locale})
      if(p.startsWith('/api/presence/'))return send(route,{stale:false})
      if(p==='/api/notifications/unread-count')return send(route,{totalUnread:0,chatUnread:0,interactionUnread:0})
      if(p==='/api/chat-groups')return send(route,{groups:[group()]})
      if(p==='/api/chat-groups/71/detail')return failDetail?send(route,{error:'Fixture offline'},503):send(route,{group:group()})
      if(p==='/api/chat-groups/71/members'&&m==='GET')return send(route,{members:groupMembers})
      if(p==='/api/chat-groups/71/online-members')return send(route,{members:members.slice(0,2)})
      if(p==='/api/chat-groups/71/messages'&&m==='GET')return send(route,{messages,hasMore:false})
      if(p==='/api/chat-requests'&&m==='GET')return send(route,{requests:[{id:31,status:'pending',applicant_user_id:1,target_user_id:2,applicant_name:'林予安',target_name:'陈以宁',created_at:'2026-09-18T07:24:00Z'}]})
      if(p==='/api/chat-requests/candidates'){
        if(candidateFailure)return send(route,{error:'Fixture search failure'},503)
        const keyword=url.searchParams.get('keyword')||''
        return send(route,{candidates:[{user_id:1,native_first_name:'Existing member'},...Array.from({length:9},(_,i)=>({user_id:i+10,native_first_name:`新成员${i+1}`,avatar_url:avatar(i+10),country:'中国'}))].filter(x=>!keyword||x.native_first_name.includes(keyword)),hasMore:false})
      }
      if(/^\/api\/search\/candidates\/\d+$/.test(p)){const id=Number(p.split('/').at(-1));return send(route,{profile:{id,user_id:id-100,native_first_name:'林予安',avatar_url:avatar(id-100),birth_year:2000,photos:[]}})}
      if(p==='/api/membership')return send(route,{accountLevel:level,tierLevel:3,canViewLikes:true,usage:{},plans:[]})
      if(m!=='GET'){
        const data=req.postDataJSON()||{};writes.push({p,m,data})
        if(p.endsWith('/messages')){messages.push({id:messages.length+1,sender_user_id:99,sender_name:'我',content:data.content,mentions:data.mentions,created_at:new Date().toISOString(),message_type:'text'});return send(route,{success:true})}
        if(p.endsWith('/members')){if(inviteGate)await inviteGate;groupMembers.push({userId:data.userId,profileId:data.userId+100,name:`新成员${data.userId-9}`,role:'member',avatarUrl:avatar(data.userId)});return send(route,{success:true})}
        if(m==='DELETE'&&p.includes('/members/')){groupMembers=groupMembers.filter(x=>x.userId!==Number(p.split('/').at(-1)));return send(route,{success:true})}
        if(p.endsWith('/dissolve')){status='dissolved';return send(route,{success:true})}
        if(p.endsWith('/approve'))return send(route,{groupId:71})
        return send(route,{success:true})
      }
      return send(route,{items:[],members:[],likes:[],total:0,isLiked:false,status:'none'})
    }
    if(p.startsWith('/__group_qa__/'))return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${Number(p.match(/\d+/)?.[0])%2?'#b5c4ae':'#c6b4a6'}"/><circle cx="60" cy="44" r="22" fill="#f3dfc8"/><ellipse cx="60" cy="115" rx="45" ry="43" fill="#738776"/></svg>`})
    if(url.origin!==new URL(base).origin)return route.abort()
    return route.continue()
  })
  await page.goto(base,{waitUntil:'networkidle'})
  async function visit(route, nextLevel=level,nextLocale=locale){
    level=nextLevel;locale=nextLocale
    await page.evaluate(({level,locale})=>{uni.setStorageSync('AUTH_TOKEN','mock-group');uni.setStorageSync('USER_INFO',{id:99,accountLevel:level});uni.setStorageSync('lovesapp.locale.preference',{mode:'manual',locale})},{level,locale})
    await page.goto('about:blank');await page.goto(base+'#/'+route,{waitUntil:'networkidle'})
  }
  const shot=name=>page.screenshot({path:path.join(out,name+'.png'),fullPage:true})
  async function check(name,fn){await fn();results.push(name);console.log('PASS',name)}
  try{
    await check('chat navigation, composer and receipts preserved',async()=>{
      await visit('pages/chat/chatRoom?id=71',2)
      await page.locator('.group-manage').waitFor();await page.locator('.bubble').first().waitFor()
      assert.equal(await page.locator('.uni-page-head').count(),0)
      const head=await page.locator('.chat-page-header').boundingBox(),composer=await page.locator('.composer-wrap').boundingBox()
      assert.ok(head.y>=0&&composer.y+composer.height<=846)
      await shot('chat')
      await page.locator('.read-summary').click();await page.locator('.chat-sheet-host').waitFor();assert.ok(await page.getByText('沟通老师',{exact:true}).count());await page.locator('.sheet-head .close').click();await page.locator('.chat-sheet-host').waitFor({state:'detached'})
      const draft=page.locator('.draft textarea');await draft.fill('@陈');await page.locator('.member-option').first().click();await page.locator('.emoji-tool').click();await page.locator('.emoji').first().click();await page.locator('.send-tool').click()
      await page.waitForFunction(()=>document.querySelector('.draft textarea')?.value==='')
      assert.ok(writes.some(x=>x.p.endsWith('/messages')&&x.data.content.includes('@')&&x.data.content.includes('😊')))
      await page.locator('.group-manage').click();await page.waitForURL('**/pages/chat/groupManage?id=71');assert.equal(await page.locator('.dissolve-button').count(),0)
    })
    if(process.env.QA_CHAT_ONLY)return
    await check('ordinary member sees profile access without management actions',async()=>{
      await visit('pages/chat/groupManage?id=71',2);await page.locator('.members-card').waitFor();await shot('ordinary-manage')
      assert.equal(await page.locator('.dissolve-button').count(),0)
      await page.locator('.section-link').click();await page.waitForURL('**/pages/chat/groupMembers?id=71');await page.locator('.member-row').first().waitFor();assert.equal(await page.locator('.invite-row').count(),0)
      await page.locator('.member-row').first().click();await page.locator('.profile-sheet-host').waitFor();await page.goBack();await page.locator('.profile-sheet-host').waitFor({state:'detached'})
      assert.ok(page.url().includes('groupMembers'))
    })
    await check('management design, invite selection white tick and back dismissal',async()=>{
      await visit('pages/chat/groupManage?id=71',5);await page.locator('.dissolve-button').waitFor();await shot('manage')
      await visit('pages/chat/groupMembers?id=71',5);await page.locator('.invite-row').waitFor();await shot('members');await page.locator('.invite-row').click();await page.locator('.member-check').first().waitFor()
      assert.equal(await page.getByText('Existing member',{exact:true}).count(),0)
      await page.locator('.member-sheet .member-row').first().click();const tick=await page.locator('.check-tick').evaluate(el=>getComputedStyle(el).borderBottomColor);assert.equal(tick,'rgb(255, 255, 255)');await shot('invite')
      await page.goBack();await page.locator('.chat-sheet-host').waitFor({state:'detached'});assert.ok(page.url().includes('groupMembers'))
      await page.locator('.invite-row').click();await page.locator('.member-sheet .member-row').first().click();await page.locator('.confirm-button').click();await page.locator('.chat-sheet-host').waitFor({state:'detached'});assert.equal(writes.filter(x=>x.p.endsWith('/members')).length,1)
    })
    await check('detail and candidate error recovery',async()=>{
      failDetail=true;await visit('pages/chat/groupManage?id=71',5);await page.getByText('重试',{exact:true}).click({trial:true});failDetail=false;await page.getByText('重试',{exact:true}).click();await page.locator('.members-card').waitFor()
      await visit('pages/chat/groupMembers?id=71',5);candidateFailure=true;await page.locator('.invite-row').click();await page.locator('.retry-button').waitFor();candidateFailure=false;await page.locator('.retry-button').click();await page.locator('.member-check').first().waitFor();await page.locator('.sheet-close').click();await page.locator('.chat-sheet-host').waitFor({state:'detached'})
    })
    await check('two backs during invitation keep pending sheet and prevent duplicate submit',async()=>{
      await visit('pages/chat/groupMembers?id=71',5);await page.locator('.invite-row').click();await page.locator('.member-sheet .member-row').first().click()
      let resolveInvite;inviteGate=new Promise(resolve=>resolveInvite=resolve)
      const before=writes.filter(x=>x.p.endsWith('/members')).length
      await page.locator('.confirm-button').click();await page.waitForTimeout(100)
      await page.goBack();await page.goBack();assert.ok(page.url().includes('groupMembers'));assert.ok(await page.locator('.chat-sheet-host').isVisible());assert.equal(writes.filter(x=>x.p.endsWith('/members')).length,before+1)
      resolveInvite();inviteGate=null;await page.locator('.chat-sheet-host').waitFor({state:'detached'})
    })
    await check('edit remove and dissolve confirmations preserve existing actions',async()=>{
      await visit('pages/chat/groupManage?id=71',5);await page.locator('.setting-row').first().click();await page.locator('.name-input input').fill('更新后的群名称');await page.locator('.primary-button').click();await page.locator('.chat-sheet-host').waitFor({state:'detached'})
      assert.ok(writes.some(x=>x.m==='PATCH'&&x.data.name==='更新后的群名称'))
      await visit('pages/chat/groupMembers?id=71&action=remove',5);await page.locator('.remove-button').first().click();const before=writes.length;await page.locator('.cancel-button').click();await page.locator('.chat-sheet-host').waitFor({state:'detached'});assert.equal(writes.length,before)
      await page.locator('.remove-button').first().click();await page.locator('.danger-button').click();await page.locator('.chat-sheet-host').waitFor({state:'detached'});assert.ok(writes.some(x=>x.m==='DELETE'&&x.p.endsWith('/members/1')))
      await visit('pages/chat/groupManage?id=71',5);await page.locator('.dissolve-button').click();await page.locator('.danger-button').click();await page.locator('.chat-sheet-host').waitFor({state:'detached'});assert.equal(await page.locator('.dissolve-button').count(),0)
      await visit('pages/chat/chatRoom?id=71',5);await page.locator('.dissolved-note').waitFor();assert.equal(await page.locator('.composer-wrap').count(),0);status='active'
    })
    await check('review picker retains close animation and navigates only after approval closes',async()=>{
      await visit('pages/notice/chatRequestReview',5);await page.locator('.approve').click();await page.locator('.member-sheet').waitFor();await page.locator('.sheet-close').click();assert.equal(await page.locator('.chat-sheet-host').count(),1);await page.locator('.chat-sheet-host').waitFor({state:'detached'})
      await page.locator('.approve').click();await page.locator('.confirm-button').click();await page.waitForURL('**/pages/chat/chatRoom?id=71');assert.ok(writes.some(x=>x.p.endsWith('/approve')&&x.data.name==='沟通群聊'))
    })
    await check('six locales fit narrow member and invite screens',async()=>{
      await page.setViewportSize({width:320,height:740})
      for(const language of ['zh-Hans','zh-Hant','en','ru','ja','ko']){
        await visit('pages/chat/groupManage?id=71',6,language);await page.locator('.settings-card').waitFor()
        const fits=await page.locator('.settings-card').evaluate(card=>{const c=card.getBoundingClientRect();return [...card.querySelectorAll('.setting-row,.status-on,.status-off')].every(el=>{const r=el.getBoundingClientRect();return r.left>=c.left-1&&r.right<=c.right+1})});assert.ok(fits,language+' settings must fit card')
        if(language==='ru')await shot('manage-ru')
        await visit('pages/chat/groupMembers?id=71',6,language);await page.locator('.invite-row').waitFor();await page.locator('.invite-row').click();await page.locator('.member-check').first().waitFor()
        const overflow=await page.locator('.member-sheet').evaluate(el=>el.scrollWidth>el.clientWidth+1);assert.equal(overflow,false,language)
        assert.doesNotMatch(await page.locator('.member-sheet').innerText(),/chatDesign\.|group\.|profile\./)
        await shot('invite-'+language);await page.locator('.sheet-close').click();await page.locator('.chat-sheet-host').waitFor({state:'detached'})
      }
    })
    assert.deepEqual(errors,[])
  } finally {
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors,writes},null,2));await browser.close()
  }
}
main().catch(e=>{console.error(e);process.exitCode=1})
