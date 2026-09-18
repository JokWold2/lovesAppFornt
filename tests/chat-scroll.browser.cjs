// Exercises real H5 scrolling with isolated fixtures. No live account/network writes.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const { chromium } = require('playwright')
const base = process.env.H5_BASE_URL || 'http://127.0.0.1:5187/app/'
const out = process.env.QA_SCREENSHOT_DIR || 'F:/workspace/.lovesapp-runtime/group-chat-fixes-20260918/screenshots'
const makeMessage = id => ({ id, sender_user_id: id % 2 ? 1 : 99, sender_name: id % 2 ? '林予安' : '我', content: `第 ${id} 条消息：周末一起散步，分享最近的生活。`, created_at: new Date(Date.UTC(2026,8,18,7,id)).toISOString(), message_type: 'text', mentions: [] })
async function main() {
  assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname)); fs.mkdirSync(out,{recursive:true})
  const browser = await chromium.launch({channel:'chrome',headless:true})
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'})
  const page = await context.newPage(); page.setDefaultTimeout(12000)
  const errors=[],results=[],requests=[],writes=[]
  page.on('pageerror', error => errors.push(error.message))
  const members=[{userId:1,profileId:101,name:'林予安',role:'member'},{userId:99,profileId:199,name:'我',role:'member'}]
  const group={id:71,name:'沟通群聊',status:'active',role:'member',canManage:false,members,memberCount:2}
  const messages=Array.from({length:95},(_,i)=>makeMessage(i+1))
  const send=(route,data)=>route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'},body:JSON.stringify(data)})
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),p=url.pathname
    if(p.startsWith('/api/')) {
      if(req.method()==='OPTIONS')return send(route,{})
      requests.push({p,method:req.method(),beforeId:url.searchParams.get('beforeId')})
      if(p==='/api/auth/validate')return send(route,{valid:true,user:{id:99,accountLevel:2}})
      if(p.startsWith('/api/locale/'))return send(route,{effectiveLocale:'zh-Hans',localeMode:'manual',preferredLocale:'zh-Hans'})
      if(p.startsWith('/api/presence/'))return send(route,{stale:false})
      if(p==='/api/notifications/unread-count')return send(route,{totalUnread:0,chatUnread:0,interactionUnread:0})
      if(p==='/api/chat-groups')return send(route,{groups:[group]})
      if(p==='/api/chat-groups/71/detail')return send(route,{group})
      if(p==='/api/chat-groups/71/members')return send(route,{members})
      if(p==='/api/chat-groups/71/online-members')return send(route,{members:members.slice(0,1)})
      if(p==='/api/chat-groups/71/messages'&&req.method()==='GET') {
        const before=Number(url.searchParams.get('beforeId'))||Infinity
        const eligible=messages.filter(x=>x.id<before),batch=eligible.slice(-15)
        return send(route,{messages:batch,hasMore:eligible.length>15})
      }
      if(p==='/api/chat-groups/71/messages'&&req.method()==='POST') {
        writes.push(req.postDataJSON());messages.push({...makeMessage(messages.length+1),sender_user_id:99,content:req.postDataJSON().content});return send(route,{success:true})
      }
      if(p==='/api/search/candidates/101')return send(route,{profile:{id:101,user_id:1,native_first_name:'林予安',photos:[]}})
      if(req.method()!=='GET')writes.push({p,method:req.method()})
      return send(route,{items:[],likes:[],members:[],total:0,isLiked:false,status:'none'})
    }
    if(url.origin!==new URL(base).origin)return route.abort()
    return route.continue()
  })
  const shot=name=>page.screenshot({path:path.join(out,name+'.png'),fullPage:true})
  const scroll = () => page.evaluate(()=>{const e=[...document.querySelectorAll('.messages .uni-scroll-view')].find(el=>['auto','scroll'].includes(getComputedStyle(el).overflowY));return {top:e.scrollTop,height:e.scrollHeight,viewport:e.clientHeight}})
  async function wheel(delta){const box=await page.locator('.messages').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,delta);await page.waitForTimeout(450)}
  async function check(name,fn){await fn();results.push(name);console.log('PASS',name)}
  try {
    await page.goto(base,{waitUntil:'networkidle'})
    await page.evaluate(()=>{uni.setStorageSync('AUTH_TOKEN','isolated-scroll-qa');uni.setStorageSync('USER_INFO',{id:99,accountLevel:2});uni.setStorageSync('lovesapp.locale.preference',{mode:'manual',locale:'zh-Hans'})})
    await page.goto(base+'#/pages/chat/chatRoom?id=71',{waitUntil:'networkidle'})
    await page.locator('#message-95').waitFor();await page.waitForTimeout(300)
    await check('header controls align with avatar; press expands glass to white',async()=>{
      const avatar=await page.locator('.group-copy .group-avatar').boundingBox()
      for(const selector of ['.back-button','.group-manage']){
        const b=await page.locator(selector).boundingBox();assert.ok(Math.abs(b.y+b.height/2-avatar.y-avatar.height/2)<2)
      }
      const button=page.locator('.group-manage'),b=await button.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(150)
      const pressed=await button.evaluate(el=>({width:el.getBoundingClientRect().width,background:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow}))
      assert.ok(pressed.width>47);assert.equal(pressed.background,'rgb(255, 255, 255)');assert.notEqual(pressed.shadow,'none');await shot('chat-glass-pressed')
      await page.mouse.move(0,0);await page.mouse.up()
    })
    await check('repeated latest → wheel up stays movable across a five-second poll',async()=>{
      for(let pass=0;pass<3;pass++){
        await wheel(-320);await page.locator('.back-to-latest').waitFor();await page.locator('.back-to-latest').click();await page.waitForTimeout(150)
        let s=await scroll();assert.ok(s.height-s.viewport-s.top<3)
        await wheel(-260);s=await scroll();assert.ok(s.height-s.viewport-s.top>200,JSON.stringify({pass,...s}))
        const expected=s.top;await page.waitForTimeout(pass===1?5500:250);assert.ok(Math.abs((await scroll()).top-expected)<2)
      }
      const button=await page.locator('.back-to-latest').boundingBox(),composer=await page.locator('.composer-wrap').boundingBox()
      assert.ok(button.x>300&&button.y+button.height<composer.y);await shot('chat-reading-history')
    })
    await check('prepending history preserves the last visible message position',async()=>{
      await wheel(-100000)
      await page.waitForFunction(()=>document.querySelectorAll('.bubble').length>=30)
      const before=await page.locator('#message-81').boundingBox(),s=await scroll();assert.ok(s.top>500)
      // Newly prepended content sits above the same oldest previously loaded row.
      const frame=await page.locator('.messages').boundingBox();assert.ok(Math.abs(before.y-frame.y)<150)
      await page.waitForTimeout(700);const stable=await page.locator('#message-81').boundingBox();assert.ok(Math.abs(before.y-stable.y)<2)
      assert.ok(requests.some(x=>x.beforeId==='81'));await shot('chat-history-loaded')
    })
    await check('send control is inside the input, has a small white arrow, and sends once',async()=>{
      await page.locator('.draft textarea').fill('测试发送按钮')
      const pill=await page.locator('.input-pill').boundingBox(),sendBox=await page.locator('.send-tool').boundingBox(),disc=await page.locator('.send-disc').boundingBox()
      assert.ok(sendBox.x>=pill.x&&sendBox.x+sendBox.width<=pill.x+pill.width)
      assert.ok(disc.width<=32);assert.equal(await page.locator('.send-arrow').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');await shot('chat-composer')
      await page.locator('.send-tool').click();await page.locator('#message-96').waitFor();await page.waitForTimeout(250)
      assert.equal(writes.filter(x=>x.content==='测试发送按钮').length,1);const s=await scroll();assert.ok(s.height-s.viewport-s.top<3)
    })
    await check('group profile has no relationship actions or relationship reads',async()=>{
      await page.locator('.group-manage').click();const start=requests.length;await page.locator('.preview-item').first().click()
      await page.locator('.profile-sheet-host').waitFor()
      await page.waitForFunction(()=>document.querySelector('.profile-sheet-host .profile-name')?.textContent==='林予安')
      assert.ok(requests.slice(start).some(x=>x.p==='/api/search/candidates/101'))
      assert.equal(await page.locator('.profile-sheet-host .profile-actions').count(),0)
      assert.equal(await page.getByText('申请私聊',{exact:true}).count(),0)
      assert.ok(!requests.slice(start).some(x=>/likes|chat-requests/.test(x.p)));await shot('group-profile-readonly')
      await page.locator('.profile-sheet-host .profile-back').click();await page.locator('.profile-sheet-host').waitFor({state:'detached'});assert.ok(page.url().includes('groupManage'))
    })
    assert.deepEqual(errors,[])
  } catch(error) {await shot('chat-failure');throw error}
  finally {fs.writeFileSync(path.join(out,'scroll-results.json'),JSON.stringify({results,errors,requests,writes},null,2));await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
