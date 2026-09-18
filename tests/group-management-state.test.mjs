import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const membersScript = (await readFile(new URL('../pages/chat/groupMembers.vue', import.meta.url), 'utf8')).match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .+$/gm, '')
const manageScript = (await readFile(new URL('../pages/chat/groupManage.vue', import.meta.url), 'utf8')).match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .+$/gm, '')
const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred() { let resolve; const promise = new Promise(accept => { resolve = accept }); return { promise, resolve } }
function harness(page = 'members', overrides = {}) {
  const calls = { added: [], removed: [], profiles: [], toasts: [], saved: [] }
  const context = {
    module: { exports: {} }, ref: value => ({ value }), computed: get => ({ get value() { return get() } }),
    onLoad: callback => callback({ id: '17' }), onShow: () => {}, t: key => key,
    useProfileDetailSheet: () => ({ profileId: { value: null }, pageVisible: { value: true }, open: id => calls.profiles.push(id), close: () => {} }),
    presentGroupName: name => name,
    uni: { getStorageSync: key => key === 'USER_INFO' ? { id: 1 } : null, showToast: payload => calls.toasts.push(payload.title), navigateTo: () => {} },
    getChatGroupDetailApi: async () => ({ group: { id: 17, name: 'Group', canManage: true, status: 'active', members: [{ userId: 1, role: 'admin' }, { userId: 2, role: 'member', profileId: 102 }] } }),
    addChatMemberApi: async (_, id) => { calls.added.push(id) },
    removeChatGroupMemberApi: async (_, id) => { calls.removed.push(id) },
    updateChatGroupApi: async (_, payload) => { calls.saved.push(payload); return { group: payload } },
    uploadChatGroupAvatar: async () => ({ url: 'avatar.jpg' }), dissolveChatGroupApi: async () => {},
    ...overrides
  }
  const names = page === 'members'
    ? 'load, group, isActiveAdmin, canRemove, memberIds, viewMember, addMembers, inviting, invitedIds, pickerVisible, removeMember, confirmRemove, removeTarget, removeOpen, closeRemove, clearRemoveTarget, loadError'
    : 'load, group, isActiveAdmin, openEditor, editing, draftName, saveProfile, saving, viewMember, dissolve, dissolveOpen'
  runInNewContext((page === 'members' ? membersScript : manageScript) + '\nmodule.exports = {' + names + '}', context)
  return { ...context.module.exports, calls, context }
}

test('only an authoritative active management grant enables controls, even with a legacy admin role', async () => {
  const h = harness(); await h.load()
  h.group.value = { role: 'admin', status: 'active' }
  assert.equal(h.isActiveAdmin.value, false)
  await h.addMembers([8]); assert.equal(h.calls.added.length, 0)
  h.group.value.canManage = true
  assert.equal(h.isActiveAdmin.value, true)
  h.group.value.status = 'dissolved'
  assert.equal(h.isActiveAdmin.value, false)
})

test('ordinary members open profile IDs and missing profiles never substitute user IDs', async () => {
  const h = harness(); await h.load(); h.group.value.canManage = false
  h.viewMember({ userId: 2, profileId: 102 })
  h.viewMember({ userId: 3, profileId: null })
  assert.deepEqual(h.calls.profiles, [102]); assert.equal(h.calls.toasts.at(-1), 'chatDesign.noProfile')
})

test('remove protects self/admin members and retains confirm content until the sheet finishes closing', async () => {
  const h = harness(); await h.load()
  assert.equal(h.canRemove({ userId: 1, role: 'member' }), false)
  assert.equal(h.canRemove({ userId: 3, role: 'admin' }), false)
  h.confirmRemove(h.group.value.members[1]); await h.removeMember()
  assert.deepEqual(h.calls.removed, [2]); assert.equal(h.removeOpen.value, false)
  assert.equal(h.removeTarget.value.userId, 2)
  h.clearRemoveTarget(); assert.equal(h.removeTarget.value, null)
})

test('partial invitations keep successes excluded so retry only submits failures', async () => {
  let fail = true; const submitted = []
  const h = harness('members', { addChatMemberApi: async (_, id) => { submitted.push(id); if (id === 9 && fail) throw { error: 'temporary' } } })
  await h.load(); h.pickerVisible.value = true
  await h.addMembers([8, 9]); assert.equal(h.pickerVisible.value, true)
  assert.equal(h.memberIds.value.includes(8), true)
  assert.equal(h.calls.toasts.at(-1), 'chatDesign.partialInvite')
  fail = false; await h.addMembers([8, 9])
  assert.deepEqual(submitted, [8, 9, 9]); assert.equal(h.pickerVisible.value, false)
})

test('failed post-invite refresh keeps successful IDs excluded and blocks further mutation until retry', async () => {
  const h = harness(); await h.load()
  h.context.getChatGroupDetailApi = async () => { throw { error: 'offline' } }
  await h.addMembers([8]); assert.equal(h.isActiveAdmin.value, false)
  assert.equal(h.memberIds.value.includes(8), true); assert.equal(h.loadError.value, 'offline')
  await h.addMembers([9]); assert.deepEqual(h.calls.added, [8])
})

test('confirmed invitations stop being optimistic exclusions so externally removed members can be invited again', async () => {
  const members = [{ userId: 1, role: 'admin' }]
  const submitted = []
  const h = harness('members', {
    getChatGroupDetailApi: async () => ({ group: { id: 17, name: 'Group', canManage: true, status: 'active', members: [...members] } }),
    addChatMemberApi: async (_, id) => { submitted.push(id); members.push({ userId: id, role: 'member' }) }
  })
  await h.load(); await h.addMembers([8])
  assert.equal(h.memberIds.value.includes(8), true)
  assert.equal(h.invitedIds.value.includes(8), false)
  members.pop(); await h.load()
  assert.equal(h.memberIds.value.includes(8), false)
  await h.addMembers([8]); assert.deepEqual(submitted, [8, 8])
})

test('invite submission and profile save cannot be duplicated while pending', async () => {
  const invite = deferred(); const h = harness('members', { addChatMemberApi: async (_, id) => { h.calls.added.push(id); await invite.promise } })
  await h.load(); const first = h.addMembers([8]); await tick(); await h.addMembers([8]); assert.deepEqual(h.calls.added, [8]); invite.resolve(); await first
  const save = deferred(); let saveCalls = 0
  const m = harness('manage', { updateChatGroupApi: async () => { saveCalls++; await save.promise; return {} } })
  await m.load(); m.openEditor(); m.draftName.value = 'New name'
  const pending = m.saveProfile(); await tick(); await m.saveProfile(); assert.equal(saveCalls, 1)
  save.resolve(); await pending; assert.equal(m.editing.value, false); assert.equal(m.group.value.name, 'New name')
})
