import test from 'node:test'
import assert from 'node:assert/strict'
import { blessingDeckMessages } from '../utils/blessingDeckMessages.js'
import { SUPPORTED_LOCALES, translate } from '../utils/locale.js'

const interactions = await import('../utils/blessingInteractions.js').catch(() => ({}))
const chat = await import('../utils/chatRequestState.js')
const tabs = await import('../utils/tabBarState.js')
const featured = await import('../utils/featuredFeed.js')
const notifications = await import('../utils/interactionNavigation.js')

test('list and deck share liked/passed exclusion while a saving card stays until dismissal', () => {
  assert.equal(typeof interactions.filterBlessingCandidates, 'function')
  const items = [{profileId: 1, userId: 1}, {profileId: 2, isLiked: true}, {profileId: 3}, {profileId: 4}]
  assert.deepEqual(interactions.filterBlessingCandidates(items, ['3'], 1).map(p => p.profileId), [4])
  assert.deepEqual(interactions.filterBlessingCandidates(items, ['3'], 1, 2).map(p => p.profileId), [2, 4])
  assert.equal(items.length, 4)
})

test('featured exclusion affects blessing rows only and preserves mixed order', () => {
  assert.equal(typeof interactions.filterFeaturedBlessings, 'function')
  const items = [{type:'moment', id:2, isLiked:true}, {type:'blessing', id:2}, {type:'antique', id:3}, {type:'blessing', id:4, isLiked:true}, {type:'blessing', id:5}]
  assert.deepEqual(interactions.filterFeaturedBlessings(items, [2]), [items[0],items[2],items[4]])
})

test('server refresh restores cross-device rewinds but keeps absent and newly consumed profiles excluded', () => {
  assert.equal(typeof interactions.reconcileBlessingExclusions, 'function')
  assert.deepEqual(interactions.reconcileBlessingExclusions(['2','3','4'], [{profileId:2},{profileId:4}], ['4']), ['3','4'])
})

test('card pass and like use explicit persisted decisions without mutating the visible card', async () => {
  assert.equal(typeof interactions.createBlessingOperations, 'function')
  const saved = []
  const operations = interactions.createBlessingOperations({decide:async (...args) => {saved.push(args); return {profileId:args[0], isLiked:args[1]==='like'}}, createRequestId:()=> 'request-1'})
  const profile = {profileId:8,isLiked:false}
  await operations.decide(profile, 'like', 'card')
  await operations.decide(profile, 'pass', 'card')
  assert.deepEqual(saved.map(args => args.slice(0,3)), [[8,'like','card'],[8,'pass','card']])
  assert.equal(profile.isLiked, false)
})

test('ambiguous decision retries reuse request ID; successful later decision gets a new ID', async () => {
  assert.equal(typeof interactions.createBlessingOperations, 'function')
  let n = 0, attempts = 0
  const ids = []
  const operations = interactions.createBlessingOperations({createRequestId:()=> `request-${++n}`, decide:async (...args)=>{ids.push(args[3]); if(++attempts===1) throw new Error('offline'); return {isLiked:true}}})
  await assert.rejects(operations.decide({profileId:8},'like','card'), /offline/)
  await operations.decide({profileId:8},'like','card')
  await operations.decide({profileId:8},'like','card')
  assert.deepEqual(ids,['request-1','request-1','request-2'])
})

test('rewind reads refunded likes and consumed rewind quota from the server after success', async () => {
  assert.equal(typeof interactions.createBlessingOperations, 'function')
  const order = []
  const membership = {usage:{like:{remaining:20},rewind:{remaining:19}},rewind:{available:false}}
  const operations = interactions.createBlessingOperations({createRequestId:()=> 'rewind-1', rewind:async (id)=>{order.push(`rewind:${id}`);return {profileId:8,isLiked:false}}, refreshMembership:async()=>{order.push('membership');return membership}})
  const result = await operations.rewind(42)
  assert.deepEqual(order,['rewind:42','membership'])
  assert.equal(result.membership, membership)
  assert.equal(result.result.isLiked,false)
})

test('rewind write success survives a failed quota refresh without issuing a second write', async () => {
  assert.equal(typeof interactions.createBlessingOperations, 'function')
  let writes = 0
  const operations = interactions.createBlessingOperations({createRequestId:()=> 'rewind-1', rewind:async()=>{writes++;return {profileId:8,isLiked:false}}, refreshMembership:async()=>{throw Error('offline')}})
  const result = await operations.rewind(42)
  assert.equal(result.result.profileId,8)
  assert.equal(result.membership,null)
  assert.equal(writes,1)
})

test('chat prefers an existing group, preserves review state, then checks own and mutual likes', () => {
  assert.equal(typeof chat.getChatRequestEntryState, 'function')
  assert.equal(chat.getChatRequestEntryState({groupId:3,status:'approved',isLiked:false,mutual:false}), 'group')
  assert.equal(chat.getChatRequestEntryState({status:'pending',isLiked:false}), 'pending')
  assert.equal(chat.getChatRequestEntryState({isLiked:false,mutual:true}), 'like')
  assert.equal(chat.getChatRequestEntryState({isLiked:true,mutual:false}), 'wait')
  assert.equal(chat.getChatRequestEntryState({isLiked:true,mutual:true}), 'request')
  assert.equal(chat.getChatRequestButtonState({groupId:3,status:'approved'}).disabled,false)
})

test('four tab destinations keep Likes second and messages badge attached to its route', () => {
  assert.deepEqual(tabs.TAB_BAR_ITEMS.map(item=> item.route),['pages/index/index360','pages/likes/likes','pages/notice/notice','pages/my/myLifeShow/myLifeShow'])
  assert.equal(tabs.getTabSwitchTarget('pages/index/index360','pages/likes/likes'), '/pages/likes/likes')
  assert.equal(typeof tabs.isMessageTab, 'function')
  assert.equal(tabs.isMessageTab('pages/likes/likes'), false)
  assert.equal(tabs.isMessageTab('/pages/notice/notice'), true)
})

test('blessing featured profiles open details without a search entitlement', () => {
  assert.equal(featured.featuredItemRoute({type:'blessing',id:18}), '/pages/searchPerson/personShow/personShow?id=18')
  assert.equal(featured.featuredItemRoute({type:'blessing'}), '')
  assert.equal(featured.featuredItemRoute({type:'moment',id:18}), '/pages/moments/momentDetail?id=18')
})

test('locked blessing notifications expose generic translated copy and route to Likes', () => {
  const item = {type:'profile_like',locked:true,content:'server Chinese text',actor_name:'must not render',target_id:7}
  assert.equal(notifications.interactionRoute(item), '/pages/likes/likes')
  assert.equal(typeof notifications.interactionSummary, 'function')
  assert.equal(notifications.interactionSummary(item,key=>`translated:${key}`),'translated:membership.secretAdmirer')
  assert.equal(notifications.interactionSummary({type:'moment_like',actor_name:'Alice'},key=>key),'Alice inbox.liked')
})

test('new card controls and Likes navigation resolve explicitly in all six supported languages', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of ['rewind','quota','quotaLoading','quotaRetry','rewindFailed','searchLocked','viewMembership','enterGroup','stampLike','stampPass']) {
      assert.equal(typeof blessingDeckMessages[locale][key], 'string', `${locale}: ${key}`)
      assert.notEqual(translate(locale, `deck.${key}`), `deck.${key}`)
    }
    assert.notEqual(translate(locale, 'navigation.likes'), 'navigation.likes')
    assert.notEqual(translate(locale, 'membership.secretAdmirer'), 'membership.secretAdmirer')
  }
})
