import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import * as listState from '../utils/chatMessageListState.js'
import * as composerState from '../utils/chatComposerState.js'
const source=(await readFile(new URL('../pages/chat/chatRoom.vue',import.meta.url),'utf8')).match(/<script setup>([\s\S]*?)<\/script>/)[1]
function nativeScript(){const stack=[true];return source.replace(/^import[\s\S]*?from\s*['"][^'"]+['"];?/gm,'').split('\n').filter(line=>{const m=line.match(/\/\/ #(ifdef|ifndef) (\S+)/);if(m){stack.push(stack.at(-1)&&(m[1]==='ifdef'?m[2]==='APP-PLUS':m[2]!=='APP-PLUS'));return false}if(line.includes('// #endif')){stack.pop();return false}return stack.at(-1)}).join('\n')}
const tick=()=>new Promise(resolve=>setImmediate(resolve))
const rows=(start,end)=>Array.from({length:end-start+1},(_,i)=>({id:start+i,content:`row ${start+i}`,created_at:'2026-09-18T10:00:00Z'}))
function harness(){
  let api,top=0,viewport=400;const writes=[],hooks={},reply={latest:rows(16,30),older:rows(1,15)}
  const query=()=>{const jobs=[];let selector='';const q={in(){return q},select(s){selector=s;return q},boundingClientRect(fn){const s=selector;jobs.push(()=>fn({height:s==='.messages-content'?api.messages.value.length*100:viewport,top:0,bottom:viewport}));return q},scrollOffset(fn){jobs.push(()=>fn({scrollTop:top,scrollHeight:api.messages.value.length*100}));return q},exec(fn){jobs.forEach(job=>job());fn?.([])}};return q}
  const context={...listState,...composerState,ref:value=>({value}),computed:get=>({get value(){return get()}}),nextTick:fn=>Promise.resolve().then(fn),getCurrentInstance:()=>({proxy:{}}),watch:()=>{},onReady:()=>{},onResize:()=>{},onLoad:fn=>hooks.load=fn,onShow:fn=>hooks.show=fn,onHide:fn=>hooks.hide=fn,onUnload:fn=>hooks.unload=fn,
    getChatMessagesApi:(_,params)=>reply.get?reply.get(params):Promise.resolve({messages:params.beforeId?reply.older:reply.latest,hasMore:!params.beforeId}),sendChatMessageApi:async()=>reply.send?.(),getChatGroupsApi:async()=>({groups:[{id:71,status:'active',name:'Test'}]}),getChatGroupMembersApi:async()=>({members:[]}),getChatGroupOnlineMembersApi:async()=>({members:[]}),refreshUnreadBadge:async()=>{},presentGroupName:x=>x,currentLocale:{},t:x=>x,console,
    setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{},uni:{getStorageSync:()=>({id:99}),getSystemInfoSync:()=>({windowHeight:550}),createSelectorQuery:query,showToast:()=>{},setNavigationBarTitle:()=>{}},module:{exports:{}}}
  runInNewContext(nativeScript()+`\nmodule.exports={messages,scrollTop,scrollWithAnimation,latestButtonVisible,scrollIntoView:typeof scrollIntoView==='undefined'?null:scrollIntoView,load,loadOlderMessages,onMessageScroll,returnToLatest,scrollToLast,measureMessageViewport,sendMessage,onScrollTouchStart:typeof onScrollTouchStart==='undefined'?()=>{}:onScrollTouchStart,onScrollTouchEnd:typeof onScrollTouchEnd==='undefined'?()=>{}:onScrollTouchEnd}`,context)
  api=context.module.exports;hooks.load({id:71})
  for(const key of ['scrollTop','scrollIntoView']){const state=api[key];if(!state)continue;let value=state.value;Object.defineProperty(state,'value',{get(){return value},set(next){if(next!==value){writes.push({key,value:next});if(key==='scrollTop')top=next;if(key==='scrollIntoView'&&next)top=Math.max(0,api.messages.value.length*100-400)}value=next}})}
  return {...api,reply,writes,hooks,async setViewport(height){viewport=height;api.measureMessageViewport();await tick()},async settle(){await tick();await tick()},scroll(value){top=value;api.onMessageScroll({detail:{scrollTop:value,scrollHeight:api.messages.value.length*100}})},get top(){return top},dispose(){hooks.unload?.()}}
}
test('dragging after return-to-latest never echoes observed position back as a scroll command',async t=>{
  const h=harness();t.after(h.dispose);await h.load();await h.settle();await h.returnToLatest();await h.settle();const before=h.writes.length
  h.onScrollTouchStart();h.scroll(1050);h.scroll(970);h.onScrollTouchEnd();assert.equal(h.writes.length,before);assert.ok(!h.scrollIntoView?.value);assert.equal(h.scrollWithAnimation.value,false)
})
test('unchanged background poll does not issue another bottom scroll',async t=>{
  const h=harness();t.after(h.dispose);await h.load();await h.settle();const before=h.writes.length;await h.load({silent:true});await h.settle();assert.equal(h.writes.length,before)
})
test('native history prepend keeps the same visible content offset',async t=>{
  const h=harness();t.after(h.dispose);await h.load();await h.settle();h.onScrollTouchStart();h.scroll(40);h.onScrollTouchEnd();await h.loadOlderMessages();await h.settle();assert.equal(h.messages.value.length,30);assert.equal(h.top,1540)
})
test('a gesture during pending polling cancels follow even inside the bottom threshold',async t=>{
  const h=harness();t.after(h.dispose);await h.load();await h.settle();let resolve;h.reply.get=()=>new Promise(done=>resolve=done);const pending=h.load({silent:true});h.onScrollTouchStart();h.scroll(1060);h.onScrollTouchEnd();const before=h.writes.length;resolve({messages:rows(17,31),hasMore:true});await pending;await h.settle();assert.equal(h.writes.length,before);assert.equal(h.top,1060);assert.equal(h.latestButtonVisible.value,true,'new messages beyond the viewport expose the latest control')
})

test('keyboard closing clamps the position without cancelling latest following',async t=>{
  const h=harness();t.after(h.dispose);await h.load();await h.setViewport(700);h.scroll(800);h.reply.latest=rows(17,31);await h.load({silent:true});await h.settle();assert.equal(h.top,900)
})

test('initial response while hidden defers latest positioning until shown',async t=>{
  const h=harness();t.after(h.dispose);let resolve;h.reply.get=()=>new Promise(done=>resolve=done);const pending=h.load();h.hooks.hide();resolve({messages:rows(16,30),hasMore:true});await pending;assert.equal(h.writes.length,0);delete h.reply.get;h.hooks.show();await h.settle();assert.equal(h.top,1100)
})

test('returning to latest during a poll follows the new messages in its response',async t=>{
  const h=harness();t.after(h.dispose);await h.load();h.onScrollTouchStart();h.scroll(500);h.onScrollTouchEnd();let resolve;h.reply.get=()=>new Promise(done=>resolve=done);const pending=h.load({silent:true});await h.returnToLatest();resolve({messages:rows(17,31),hasMore:true});await pending;await h.settle();assert.equal(h.top,1200)
})

test('sending during an older poll queues a fresh response instead of losing the sent message refresh',async t=>{
  const h=harness();t.after(h.dispose);await h.load();let resolve;h.reply.get=()=>new Promise(done=>resolve=done);const pending=h.load({silent:true});h.reply.send=()=>{h.reply.latest=rows(17,31)};await h.sendMessage({content:'new message',mentions:[]});delete h.reply.get;resolve({messages:rows(16,30),hasMore:true});await pending;await h.settle();assert.equal(h.messages.value.at(-1).id,31);assert.equal(h.top,1200)
})
