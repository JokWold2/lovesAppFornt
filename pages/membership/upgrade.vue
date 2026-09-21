<template>
  <view class="membership-page app-h5-min-screen">
    <view class="membership-chrome" :style="headerStyle">
      <view class="membership-header">
        <button class="close-button" :aria-label="t('membership.close')" @click="close"><uni-icons type="closeempty" size="27" color="#171717" /></button>
        <view class="brand"><text class="brand-name">BLESS</text><text class="brand-badge">{{ t('membership.badge') }}</text></view>
        <view class="header-balance" aria-hidden="true"></view>
      </view>
    </view>
    <view class="header-spacer" :style="spacerStyle" aria-hidden="true"></view>
    <view v-if="loading" class="page-state">{{ t('membership.loadingMembership') }}</view>
    <view v-else-if="loadError" class="page-state"><text>{{ loadError }}</text><button @click="load">{{ t('membership.reload') }}</button></view>
    <template v-else-if="membership">
      <view class="intro">
        <text class="eyebrow">{{ t('membership.lifetime') }}</text><text class="headline">{{ headline }}</text>
        <text class="intro-text">{{ subtitle }}</text><text class="current-tier">{{ t('membership.currentTier', { tier: planName(membership.tierLevel) }) }}</text>
      </view>
      <view v-if="pending" class="request-status"><text class="request-title">{{ t('membership.pendingTitle') }}</text><text>{{ t('membership.pendingUpgrade', { tier: planName(pending.targetLevel) }) }}</text><text>{{ t('membership.amountDue', { price: price(pending.amountCents) }) }}</text></view>
      <view v-else-if="lastRequest" class="request-status"><text class="request-title">{{ lastRequest.status === 'approved' ? t('membership.approvedTitle') : t('membership.rejectedTitle') }}</text><text>{{ lastRequest.status === 'approved' ? t('membership.approved') : (lastRequest.reviewMessage || t('membership.rejected')) }}</text></view>
      <text class="section-heading">{{ t('membership.chooseTier') }}</text>
      <scroll-view class="plan-scroll" scroll-x :show-scrollbar="false" :scroll-into-view="`membership-plan-${selectedLevel}`">
        <view class="plan-row">
          <button v-for="plan in membership.plans" :id="`membership-plan-${plan.level}`" :key="plan.level" class="plan-card" :class="{ selected: selectedLevel === plan.level }" @click="selectedLevel = plan.level">
            <view class="plan-top"><text class="plan-label">{{ plan.level === membership.tierLevel ? t('membership.current') : (plan.level === 4 ? t('membership.fullBenefits') : t('membership.permanentMember')) }}</text><text v-if="selectedLevel === plan.level" class="plan-check">✓</text></view>
            <text class="plan-name">{{ planName(plan.level) }}</text><text class="plan-price">{{ price(plan.priceCents) }}</text><text class="plan-term">{{ plan.priceCents ? t('membership.onePayment') : t('membership.freeForever') }}</text><text class="plan-difference">{{ priceHint(plan) }}</text>
          </button>
        </view>
      </scroll-view>
      <view v-if="selectedPlan" class="benefits">
        <text class="benefits-legend">{{ t('membership.benefits', { tier: planName(selectedPlan.level) }) }}</text>
        <view v-for="benefit in benefits" :key="benefit.title" class="benefit" :class="{ unavailable: !benefit.enabled }"><text class="check">{{ benefit.enabled ? '✓' : '—' }}</text><view><text class="benefit-title">{{ benefit.title }}</text><text class="benefit-caption">{{ benefit.caption }}</text></view></view>
      </view>
      <view class="membership-notes"><text>{{ t('membership.dailyNote') }}</text><text>{{ t('membership.upgradeNote') }}</text></view>
    </template>
    <view v-if="membership && !loading && !loadError" class="purchase-dock">
      <view class="purchase-summary"><text class="purchase-name">{{ pending ? t('membership.waitingAdmin') : (canPurchase ? t('membership.upgradeTo', { tier: planName(selectedPlan.level) }) : t('membership.currentBenefits')) }}</text><text class="purchase-amount">{{ canPurchase && !pending ? t('membership.difference', { price: price(quote) }) : (pending ? t('membership.noDuplicate') : t('membership.noPurchase')) }}</text></view>
      <button class="purchase-button" :disabled="submitting || !canPurchase || !!pending" @click="submit">{{ submitting ? t('membership.submitting') : (pending ? t('membership.pending') : (canPurchase ? t('membership.submitMembership') : t('membership.owned'))) }}</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMembershipApi, getMembershipRequestsApi, submitMembershipRequestApi } from '@/api/membership.js'
import { createMembershipRequestId, formatMembershipPrice, formatMembershipQuota, getUpgradeQuote, getMembershipTierName, getMembershipDisplayPlan, getMembershipErrorMessage, notifyBlessingChanged } from '@/utils/membership.js'
import { t } from '@/utils/localeRuntime.js'
import { useFixedPageHeader } from '@/utils/useFixedPageHeader.js'
const { headerStyle, spacerStyle } = useFixedPageHeader('.membership-chrome', 72, computed(() => t('membership.badge')))
const price = cents => formatMembershipPrice(cents, t)
const quota = (limit, unit) => formatMembershipQuota(limit, unit, t)
const membership = ref(null), loading = ref(true), loadError = ref(''), selectedLevel = ref(0), submitting = ref(false), reason = ref(''), requests = ref([])
let loadGeneration = 0, submissionId = '', submissionLevel = 0
const selectedPlan = computed(() => getMembershipDisplayPlan(membership.value?.plans?.find(plan => plan.level === selectedLevel.value), membership.value?.accountLevel))
const pending = computed(() => membership.value?.pendingRequest || requests.value.find(item => ['pending', 'processing'].includes(item.status)) || null)
const lastRequest = computed(() => requests.value.find(item => ['approved', 'rejected'].includes(item.status)))
const quote = computed(() => getUpgradeQuote(membership.value?.plans, membership.value?.accountLevel, selectedLevel.value))
const canPurchase = computed(() => quote.value !== null)
const headline = computed(() => ({ like: t('membership.likeExhausted'), comment: t('membership.commentExhausted'), rewind: t('membership.rewindExhausted'), likes: t('membership.discoverLikes'), search: t('membership.discoverSearch') }[reason.value] || t('membership.headline')))
const subtitle = computed(() => membership.value?.accountLevel >= 4 && ['like', 'comment', 'rewind'].includes(reason.value) ? t('membership.resetHint') : reason.value === 'likes' ? t('membership.unlockHint') : t('membership.chooseHint'))
const benefits = computed(() => {
  const plan = selectedPlan.value
  if (!plan) return []
  return [
    { title: t('membership.likeBenefit', { quota: quota(plan.likeLimit, 'people') }), caption: t('membership.likeCaption'), enabled: true },
    { title: t('membership.commentBenefit', { quota: quota(plan.commentLimit, 'comments') }), caption: t('membership.commentCaption'), enabled: true },
    { title: t('membership.rewindBenefit', { quota: quota(plan.rewindLimit) }), caption: t('membership.rewindCaption'), enabled: true },
    { title: t('membership.unlockLikes'), caption: plan.level >= 3 ? t('membership.clearLikes') : t('membership.silverUnlock'), enabled: plan.level >= 3 },
    { title: t('membership.search'), caption: plan.level >= 4 ? t('membership.searchCaption') : t('membership.goldOnly'), enabled: plan.level >= 4 },
    { title: t('membership.mutualChat'), caption: t('membership.mutualChatCaption'), enabled: true }
  ]
})
function planName(level) { return getMembershipTierName(level, t) }
function priceHint(plan) {
  if (membership.value.accountLevel >= 5) return t('membership.highest')
  const difference = getUpgradeQuote(membership.value.plans, membership.value.accountLevel, plan.level)
  return difference === null ? t('membership.ownedTier') : t('membership.upgradePrice', { price: price(difference) })
}
function close() { uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index360' }) }) }
async function load() {
  const generation = ++loadGeneration
  loading.value = true; loadError.value = ''
  try {
    const [data, history] = await Promise.all([getMembershipApi(), getMembershipRequestsApi()])
    if (generation !== loadGeneration) return
    if (!Array.isArray(data?.plans) || !data.plans.length) throw Error(t('membership.configUnavailable'))
    membership.value = data
    requests.value = Array.isArray(history?.items) ? history.items : (Array.isArray(history?.requests) ? history.requests : [])
    if (!selectedLevel.value) selectedLevel.value = Math.min(4, Math.max(Number(data.tierLevel) + 1, reason.value === 'likes' ? 3 : reason.value === 'search' ? 4 : 2))
    notifyBlessingChanged({ source: 'membership' })
  } catch (error) { if (generation === loadGeneration) loadError.value = getMembershipErrorMessage(error, t, 'membershipFailed') }
  finally { if (generation === loadGeneration) loading.value = false }
}
async function submit() {
  if (!canPurchase.value || pending.value || submitting.value) return
  submitting.value = true
  const target = selectedLevel.value
  if (!submissionId || submissionLevel !== target) { submissionId = createMembershipRequestId(); submissionLevel = target }
  try {
    await submitMembershipRequestApi(target, submissionId)
    submissionId = ''
    uni.showToast({ title: t('membership.submittedMembership'), icon: 'none' })
    await load()
  } catch (error) { uni.showToast({ title: getMembershipErrorMessage(error, t, 'submitFailed'), icon: 'none' }) }
  finally { submitting.value = false }
}
onLoad(options => { reason.value = options?.reason || '' })
onShow(load)
</script>

<style scoped lang="scss">
.membership-page { min-height:100vh;box-sizing:border-box;background:#f8f7f4;color:#171717;padding:0 0 calc(130px + env(safe-area-inset-bottom)); }
.membership-chrome { position:fixed;z-index:40;top:0;left:0;right:0;box-sizing:border-box;background:#f8f7f4; }
.header-spacer { width:100%;flex-shrink:0;pointer-events:none; }
.membership-header { display:flex;align-items:center;gap:8px;min-height:72px;box-sizing:border-box;padding:10px 20px; }.close-button { flex:0 0 44px;width:44px;height:44px;padding:0;margin:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff; }button::after { border:0; }.brand { flex:1;min-width:0;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 8px;font-size:28px;font-weight:900;letter-spacing:-1px;line-height:1.2; }.brand-name { flex-shrink:0; }.header-balance { flex:0 0 44px;width:44px; }.brand-badge { max-width:100%;box-sizing:border-box;font-size:12px;line-height:1.4;padding:6px 12px;border-radius:20px;background:var(--bless-primary, #C2A052);font-weight:600;letter-spacing:0;overflow-wrap:break-word;text-align:center; }
.intro { padding:34px 24px 22px; }.eyebrow { display:block;font-size:11px;color:var(--bless-text, #775E25);letter-spacing:2px;margin-bottom:16px; }.headline { display:block;font-size:31px;font-weight:650;line-height:1.4;letter-spacing:-.8px; }.intro-text { display:block;font-size:15px;line-height:1.75;color:#67645d;margin-top:16px; }.current-tier { display:block;margin-top:18px;font-size:12px;color:#888075; }.section-heading { display:block;padding:16px 24px;font-size:17px; }
.plan-scroll { width:100%;white-space:nowrap; }.plan-row { display:inline-flex;gap:12px;padding:0 24px 22px; }.plan-card { width:230px;flex:0 0 230px;box-sizing:border-box;white-space:normal;border:1px solid #dedbd3;border-radius:28px;padding:20px;background:transparent;text-align:left;line-height:1.4;margin:0;color:#171717; }.plan-card.selected { border:2px solid var(--bless-primary, #C2A052);padding:19px;background:#fffdf6; }.plan-top { display:flex;justify-content:space-between;align-items:center;height:24px; }.plan-label { font-size:12px;color:var(--bless-text, #775E25); }.plan-check { font-size:24px;color:var(--bless-text, #775E25); }.plan-name { display:block;font-size:34px;margin-top:12px; }.plan-price { display:block;margin-top:36px;font-size:26px;font-weight:600; }.plan-term { display:block;font-size:11px;color:#777268;margin-top:3px; }.plan-difference { display:block;margin-top:18px;font-size:12px;color:var(--bless-text, #775E25); }
.benefits { margin:22px 24px 0;padding:24px 22px 8px;border:1px solid #e1ded7;border-radius:26px;position:relative; }.benefits-legend { position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#f8f7f4;padding:0 12px;font-size:13px;color:#766f62;white-space:nowrap; }.benefit { display:flex;gap:16px;margin:12px 0 23px; }.benefit>view { flex:1;min-width:0; }.check { font-size:23px;font-weight:700;line-height:1.1; }.benefit-title { display:block;font-size:16px;line-height:1.5; }.benefit-caption { display:block;font-size:12px;line-height:1.7;color:#888073;margin-top:4px; }.unavailable { color:#99948a; }
.membership-notes { padding:22px 27px;font-size:11px;line-height:1.8;color:#8c877f; }.membership-notes text,.request-status text { display:block; }.request-status { margin:0 24px 12px;padding:18px;background:var(--bless-soft, #F1E4BD);border-radius:18px;font-size:12px;line-height:1.8; }.request-title { font-weight:650;font-size:15px;margin-bottom:5px; }
.purchase-dock { position:fixed;z-index:30;bottom:0;left:0;right:0;display:flex;align-items:center;gap:12px;padding:18px 24px calc(18px + env(safe-area-inset-bottom));border-top:1px solid #e5e2dc;background:#f8f7f4; }.purchase-summary { flex:1;min-width:0; }.purchase-name,.purchase-amount { display:block; }.purchase-name { font-size:14px;font-weight:600; }.purchase-amount { font-size:11px;margin-top:5px;color:#70695e; }.purchase-button { margin:0;flex:0 0 auto;border-radius:30px;padding:0 20px;min-height:48px;line-height:48px;font-size:13px;background:#171614;color:white; }.purchase-button[disabled] { background:#e3dfd5;color:#918b7e; }.page-state { display:flex;flex-direction:column;align-items:center;padding:120px 24px;gap:20px;color:#777;font-size:14px; }
.close-button { transition:transform 140ms cubic-bezier(.23,1,.32,1); }
.close-button:active { transform:scale(.97); }
@media (prefers-reduced-motion:reduce) { .close-button { transition:none; } }
@media (min-width:600px) { .membership-page,.membership-chrome { max-width:620px;margin:0 auto; }.purchase-dock { max-width:572px;margin:0 auto; }.headline { font-size:38px; } }
</style>
