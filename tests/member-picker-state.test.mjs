import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
const source = await readFile(new URL('../components/chat/MemberPickerSheet.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
const tick = () => new Promise(resolve => setImmediate(resolve))
function pending() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a;reject=b }); return { promise,resolve,reject } }
function harness(api) {
  const props={visible:true,excludedUserIds:[],busy:false,showReviewFields:false}, emitted=[], watches=[]
  const context={ref:value=>({value}),watch:(get,fn)=>watches.push({get,fn}),defineProps:()=>props,defineEmits:()=> (...args)=>emitted.push(args),getChatRequestCandidatesApi:api,t:key=>key,module:{exports:{}}}
  runInNewContext(script+'\nmodule.exports={searchMembers,loadNextPage,loadCandidates,toggleMember,confirm,keyword,candidates,selectedIds,loading,failed,page,hasMore,groupName,reviewMessage}',context)
  return {...context.module.exports,props,emitted,watches}
}
const candidate = id => ({user_id:id,native_first_name:`Person ${id}`})
test('latest search wins even while a previous request is pending',async()=>{
  const a=pending(),b=pending();let calls=0
  const h=harness(()=>++calls===1?a.promise:b.promise)
  h.keyword.value='old';h.searchMembers();h.keyword.value='new';h.searchMembers()
  b.resolve({candidates:[candidate(2)]});await tick();a.resolve({candidates:[candidate(1)]});await tick()
  assert.deepEqual(Array.from(h.candidates.value,m=>m.userId),[2]);assert.equal(h.loading.value,false)
})
test('failed next page preserves rows and retries that same page',async()=>{
  const requests=[];let fail=true
  const h=harness(async({page})=>{requests.push(page);if(page===2&&fail)throw Error('offline');return {candidates:[candidate(page)],hasMore:true}})
  h.searchMembers();await tick();await h.loadNextPage()
  assert.equal(h.failed.value,true);assert.deepEqual(Array.from(h.candidates.value,m=>m.userId),[1]);assert.equal(h.page.value,1)
  fail=false;await h.loadNextPage();assert.deepEqual(requests,[1,2,2]);assert.deepEqual(Array.from(h.candidates.value,m=>m.userId),[1,2])
})
test('closing invalidates pending results and reopening starts a new search',async()=>{
  const old=pending();let calls=0;const h=harness(()=>++calls===1?old.promise:Promise.resolve({candidates:[candidate(3)]}))
  h.searchMembers();h.props.visible=false;h.watches[1].fn(false)
  old.resolve({candidates:[candidate(1)]});await tick();assert.equal(h.candidates.value.length,0)
  h.props.visible=true;h.watches[1].fn(true);await tick();assert.equal(h.candidates.value[0].userId,3)
})
test('successful invitations are removed from retry selection; busy blocks duplicate confirm',async()=>{
  const h=harness(async()=>({candidates:[candidate(1),candidate(2)]}));h.searchMembers();await tick()
  h.toggleMember(1);h.toggleMember(2);h.props.excludedUserIds=[1];h.watches[0].fn([1]);h.confirm()
  assert.deepEqual(Array.from(h.emitted[0][1]),[2]);h.props.busy=true;h.confirm();h.toggleMember(2);assert.equal(h.emitted.length,1);assert.equal(h.selectedIds.value.length,1)
})
test('review caller retains its name and reply payload contract',()=>{
  const h=harness(async()=>({}));h.props.showReviewFields=true;h.groupName.value=' Review group ';h.reviewMessage.value=' Approved ';h.toggleMember(9);h.confirm()
  assert.equal(h.emitted[0][1].name,'Review group');assert.equal(h.emitted[0][1].reviewMessage,'Approved');assert.deepEqual(Array.from(h.emitted[0][1].memberIds),[9])
})
