import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
const source=(await readFile(new URL('../components/chat/ChatSheet.vue',import.meta.url),'utf8')).match(/<script setup>([\s\S]*?)<\/script>/)[1]
function forPlatform(platform) {
  const stack=[true]
  return source.split('\n').filter(line=>{
    const begin=line.match(/\/\/ #(ifdef|ifndef) (\S+)/)
    if(begin){stack.push(stack.at(-1)&&(begin[1]==='ifdef'?platform===begin[2]:platform!==begin[2]));return false}
    if(line.includes('// #endif')){stack.pop();return false}
    return stack.at(-1)&&!/^import /.test(line)
  }).join('\n')
}
function harness(platform) {
  const props={open:true,busy:false},events=[],watches=[],hooks={},listeners=new Set()
  const entries=[{}];let index=0
  const history={get state(){return entries[index]},pushState(value){entries.splice(++index);entries.push(value)},back(){if(index){index--;for(const listener of [...listeners])listener({stopImmediatePropagation(){}})}}}
  const context={ref:value=>({value}),defineProps:()=>props,defineEmits:()=>name=>events.push(name),watch:(get,fn,options)=>{watches.push(fn);if(options?.immediate)fn(get())},onBeforeUnmount:fn=>hooks.unmount=fn,onBackPress:fn=>hooks.back=fn,window:{history,location:{href:'http://localhost/app/#/members'},addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)},module:{exports:{}}}
  runInNewContext(forPlatform(platform)+'\nmodule.exports={retained,nativeOpen,nativeLeaving,nativeLeft,dismiss,finish}',context)
  return {...context.module.exports,props,events,watches,hooks,history}
}
test('App page hook stops intercepting after a conditional caller unmounts',()=>{
  const h=harness('APP-PLUS');assert.equal(h.hooks.back(),true);h.hooks.unmount();assert.equal(h.hooks.back(),false);assert.equal(h.retained.value,false)
})
test('busy H5 sheet keeps same-page back boundary across repeated backs',()=>{
  const h=harness('H5');h.props.busy=true
  h.history.back();assert.ok(h.history.state.chatOverlay);h.history.back();assert.ok(h.history.state.chatOverlay);assert.deepEqual(h.events,[])
  h.props.busy=false;h.history.back();assert.deepEqual(h.events,['dismiss'])
})
test('content remains mounted until animation completes',()=>{
  const h=harness('APP-PLUS');h.props.open=false;h.watches[0](false);assert.equal(h.retained.value,true);h.finish();assert.equal(h.retained.value,false);assert.deepEqual(h.events,['after-close'])
})
test('WeChat native close during pending write restores the visible container',()=>{
  const h=harness('MP-WEIXIN');h.props.busy=true;h.nativeLeaving();assert.equal(h.nativeOpen.value,false);h.nativeLeft();assert.equal(h.nativeOpen.value,true);assert.deepEqual(h.events,[])
  h.props.busy=false;h.nativeLeaving();h.props.open=false;h.watches[0](false);h.nativeLeft();assert.equal(h.retained.value,false)
})
