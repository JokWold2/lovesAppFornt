
// import { computed, ref } from 'vue'
// import { onLoad, onShow } from '@dcloudio/uni-app'
// import {
	getMyDemandHallPostsApi,
	getDemandHallPostsApi,
	getDemandHallApplicationsApi,
	handleDemandHallApplicationApi,
	createDemandHallOrderApi,
	getDemandHallOrdersApi,
	closeDemandHallPostApi,
	toggleDemandHallCollectApi
} from '@/api/demandHall.js'
// import { createChatRequestApi, getChatRequestStatusApi } from '@/api/chat.js'
// import { t } from '@/utils/localeRuntime.js'
// import {
	formatPriceLabel,
	formatRelativeTime,
	buildCardBadges,
	applicationStatusMeta
} from '@/utils/demandHallPresentation.js'import {
	WORKSPACE_ROLE_BY_TAB,
	WORKSPACE_TABS,
	buildMyPostGroups,
	buildReputationSummary,
	formatAmount,
	myPostActions,
	myPostStatusMeta,
	resolveMyPostStatus,
	workspaceEmptyState
} from '@/utils/demandHallWorkspace.js'

const PAGE_SIZE = 10

const tabs = computed(() => WORKSPACE_TABS.map(tab => ({ ...tab, label: tabLabel(tab.key) })))
const postKinds = computed(() => [
	{ key: 'demand', label: t('workspace.kindDemand') },
	{ key: 'service', label: t('workspace.kindService') }
])

function tabLabel(key) {
	if (key === 'posts') return t('workspace.tabPosts')
	if (key === 'applies') return t('workspace.tabApplies')
	return t('workspace.tabCollections')
}

const activeTab = ref('posts')
const postKind = ref('demand')

/* ============ 列表状态 ============ */
const posts = ref([])
const applications = ref([])
const collections = ref([])
const orders = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const loadError = ref(false)
const loadMoreError = ref(false)
// 收藏列表同时供统计看板使用，它失败时不能静默当成「没有收藏」，否则看板数字会不对。
const collectionError = ref(false)
const hasMore = ref(true)
const currentPage = ref(0)

const currentUserId = computed(() => Number(uni.getStorageSync('USER_INFO')?.id) || 0)

/** 我发布的：按子分类过滤后套上状态角标与管理按钮。 */
const myPostItems = computed(() => {
	const groups = buildMyPostGroups(posts.value, orders.value)
	return groups
		.filter(group => group.post.type === postKind.value)
		.map(group => ({
			...group,
			statusMeta: myPostStatusMeta(group.post, { hasActiveOrder: group.orders.some(order => ['created', 'funded', 'delivered'].includes(order.status)) }),
			actions: myPostActions(group.post, { orderCount: group.post.applyCount })
		}))
})

const applyItems = computed(() => applications.value.map(item => ({
	...item,
	statusMeta: applicationStatusMeta(item.status) || { text: item.status, tone: 'muted' }
})))

/**
 * 当前 Tab 的列表数据。
 * 统一成数组让模板只写一份分支判断，避免三个 Tab 各写一遍空状态与加载态。
 */
const currentList = computed(() => {
	if (activeTab.value === 'posts') return myPostItems.value
	if (activeTab.value === 'applies') return applyItems.value
	return collections.value
})

const tabCounts = computed(() => ({
	posts: posts.value.length,
	applies: applications.value.length,
	collections: collections.value.length
}))

const reputation = computed(() => buildReputationSummary({
	posts: posts.value,
	orders: orders.value,
	accountLevel: Number(uni.getStorageSync('USER_INFO')?.accountLevel || uni.getStorageSync('USER_INFO')?.account_level || 0),
	userId: currentUserId.value
}))

const emptyState = computed(() => {
	const base = workspaceEmptyState({ tab: activeTab.value, kind: postKind.value })
	// 空状态文案走语言系统，逻辑层只负责判断「哪种空」，文案键在这里映射。
	const keyMap = {
		posts: postKind.value === 'service' ? 'workspace.emptyPostsService' : 'workspace.emptyPostsDemand',
		applies: 'workspace.emptyApplies',
		collections: 'workspace.emptyCollections'
	}
	const hintMap = {
		posts: postKind.value === 'service' ? 'workspace.emptyPostsServiceHint' : 'workspace.emptyPostsDemandHint',
		applies: 'workspace.emptyAppliesHint',
		collections: 'workspace.emptyCollectionsHint'
	}
	return { title: t(keyMap[activeTab.value]), hint: t(hintMap[activeTab.value]), fallbackTitle: base.title }
})

function avatarOf(user) {
	if (user?.avatar) return user.avatar
	return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(user?.name || 'user')}`
}

/* ============ 数据加载 ============ */
async function fetchTab(tabKey, page) {
	const role = WORKSPACE_ROLE_BY_TAB[tabKey]
	const data = await getMyDemandHallPostsApi({ role, page, pageSize: PAGE_SIZE })
	if (tabKey === 'posts' || tabKey === 'collections') {
		return { list: Array.isArray(data?.posts) ? data.posts : [], hasMore: !!data?.hasMore }
	}
	return { list: Array.isArray(data?.applications) ? data.applications : [], hasMore: !!data?.hasMore }
}

async function loadList({ reset = false } = {}) {
	const page = reset ? 1 : currentPage.value + 1
	if (!reset && !hasMore.value) return
	if (!reset) loadingMore.value = true
	loadMoreError.value = false
	try {
		// 收藏列表与订单都要用来渲染统计看板，切换 Tab 时一起刷新，避免数字对不上。
		const [target, orderData, collectionData] = await Promise.all([
			fetchTab(activeTab.value, page),
			getDemandHallOrdersApi().catch(() => ({ orders: [] })),
			activeTab.value === 'collections'
				? Promise.resolve(null)
				: fetchTab('collections', 1).catch(() => null)
		])
		orders.value = Array.isArray(orderData?.orders) ? orderData.orders : []
		if (collectionData) {
			collections.value = collectionData.list
			collectionError.value = false
		} else if (activeTab.value !== 'collections') {
			collectionError.value = true
		}

		const { list, hasMore: more } = target
		if (activeTab.value === 'posts') posts.value = reset ? list : [...posts.value, ...list]
		else if (activeTab.value === 'applies') applications.value = reset ? list : [...applications.value, ...list]
		else collections.value = reset ? list : [...collections.value, ...list]
		hasMore.value = more
		currentPage.value = page
		loadError.value = false
	} catch (error) {
		if (reset) {
			loadError.value = true
			hasMore.value = false
		} else {
			loadMoreError.value = true
		}
	} finally {
		loading.value = false
		loadingMore.value = false
		refreshing.value = false
	}
}

function reload() {
	currentPage.value = 0
	hasMore.value = true
	loadError.value = false
	return loadList({ reset: true })
}

function onRefresh() {
	refreshing.value = true
	void reload()
}

function onLoadMore() {
	void loadList()
}

function switchTab(key) {
	if (activeTab.value === key) return
	activeTab.value = key
	// 切 Tab 后列表内容完全不同，先回到骨架屏再拉数据，避免展示上一个 Tab 的卡片。
	loading.value = true
	reload()
	uni.vibrateShort?.({ fail: () => {} })
}

function switchPostKind(key) {
	if (postKind.value === key) return
	postKind.value = key
}

/* ============ 我发布的管理动作 ============ */
function onPostAction(item, action) {
	if (action.action === 'applications') {
		openApplicants(item.post)
		return
	}
	if (action.action === 'edit') {
		uni.showToast({ title: t('workspace.editHint'), icon: 'none' })
		return
	}
	if (action.action === 'close') {
		void updatePostStatus(item.post, true)
		return
	}
	if (action.action === 'reopen') {
		void updatePostStatus(item.post, false)
	}
}

async function updatePostStatus(post, shouldClose) {
	const confirmed = await confirmDialog({
		title: shouldClose ? t('workspace.closeConfirmTitle') : t('workspace.reopenConfirmTitle'),
		content: shouldClose ? t('workspace.closeConfirmContent') : t('workspace.reopenConfirmContent')
	})
	if (!confirmed) return
	if (!shouldClose) {
		// 后端只提供结单接口：重新上架需要重新发布，这里如实告知而不是假装成功。
		uni.showToast({ title: t('workspace.editHint'), icon: 'none' })
		return
	}
	try {
		await closeDemandHallPostApi(post.id)
		post.status = 'closed'
		uni.showToast({ title: t('workspace.closeDone'), icon: 'success' })
	} catch (error) { /* 请求层已提示 */ }
}

/* ============ 报名者管理面板 ============ */
const applicantTarget = ref(null)
const applicants = ref([])
const applicantsLoading = ref(false)
const applicantBusy = ref(0)
const orderSubmitting = ref(false)

const applicantsCountText = computed(() => t('workspace.applicationsCount', { count: applicants.value.length }))

function applicantTone(status) {
	return status === 'accepted' ? 'done' : status === 'pending' ? 'pending' : 'muted'
}

function applicantStatusText(status) {
	const key = { pending: 'workspace.applicantPending', accepted: 'workspace.applicantAccepted', rejected: 'workspace.applicantRejected', cancelled: 'workspace.applicantCancelled' }[status]
	return key ? t(key) : status
}

/** 该报名者对应的托管订单：已发起过就直接进入订单页，不重复创建。 */
function orderOfItem(item) {
	const postId = applicantTarget.value?.post?.id
	if (postId == null) return null
	return orders.value.find(order =>
		Number(order.postId) === Number(postId) &&
		[order.buyerUserId, order.sellerUserId].includes(Number(item.applicantUserId))
	) || null
}

async function openApplicants(post) {
	applicantTarget.value = { post }
	applicants.value = []
	applicantsLoading.value = true
	await loadApplicants()
}

async function loadApplicants() {
	const postId = applicantTarget.value?.post?.id
	if (!postId) return
	try {
		const data = await getDemandHallApplicationsApi(postId)
		applicants.value = Array.isArray(data?.applications) ? data.applications : []
	} catch (error) {
		applicants.value = []
	} finally {
		applicantsLoading.value = false
	}
}

function closeApplicants() {
	applicantTarget.value = null
	applicants.value = []
	applicantBusy.value = 0
}

async function selectApplicant(item, action) {
	if (applicantBusy.value) return
	applicantBusy.value = item.id
	try {
		await handleDemandHallApplicationApi(item.id, { action })
		uni.showToast({ title: action === 'accept' ? t('workspace.applicantSelected') : t('common.confirm'), icon: 'success' })
		// 选定需求后帖子会被结单，这里同步刷新面板与列表状态角标。
		await Promise.all([loadApplicants(), reload()])
	} catch (error) { /* 请求层已提示 */ } finally {
		applicantBusy.value = 0
	}
}

/* ============ 发起担保交易 ============ */
const orderTarget = ref(null)
const orderAmount = ref('')
const orderRemark = ref('')

function openOrderSheet(item) {
	orderTarget.value = item
	orderAmount.value = item.quoteAmount != null ? String(item.quoteAmount) : (applicantTarget.value?.post?.price != null ? String(applicantTarget.value.post.price) : '')
	orderRemark.value = ''
}

function closeOrderSheet() {
	orderTarget.value = null
	orderSubmitting.value = false
}

async function submitOrder() {
	if (orderSubmitting.value || !orderTarget.value) return
	const amount = Number(orderAmount.value)
	if (!Number.isFinite(amount) || amount <= 0) {
		uni.showToast({ title: t('workspace.orderAmountInvalid'), icon: 'none' })
		return
	}
	orderSubmitting.value = true
	try {
		const result = await createDemandHallOrderApi({
			postId: applicantTarget.value.post.id,
			counterpartyUserId: orderTarget.value.applicantUserId,
			amount,
			remark: orderRemark.value.trim()
		})
		const orderId = result?.orderId
		closeOrderSheet()
		uni.showToast({ title: t('workspace.orderCreated'), icon: 'success' })
		await reload()
		if (orderId) uni.navigateTo({ url: `/pages/demandhall/orderDetail?id=${orderId}` })
	} catch (error) {
		orderSubmitting.value = false
	}
}

/* ============ 收藏 / 沟通 / 跳转 ============ */
async function toggleCollect(post) {
	const previous = post.isCollected
	post.isCollected = !previous
	// 收藏列表里取消收藏后直接把卡片移除，避免留在列表里却显示「取消收藏」。
	collections.value = collections.value.filter(item => item.id !== post.id)
	try {
		await toggleDemandHallCollectApi(post.id)
	} catch (error) {
		post.isCollected = previous
		reload()
	}
}

function buildContactMessage(post) {
	return `你好，我在需求市场看到「${post.title}」，想和你沟通一下。\n信息卡：pages/demandhall/detail?id=${post.id}`
}

async function contactOwner(post) {
	if (!post) return
	try {
		const status = await getChatRequestStatusApi(post.userId)
		if (status?.status === 'approved' && status.groupId) {
			uni.navigateTo({ url: `/pages/chat/chatRoom?id=${status.groupId}` })
			return
		}
		if (status?.status === 'pending' || status?.status === 'processing') {
			uni.showToast({ title: t('workspace.contactPending'), icon: 'none' })
			return
		}
		uni.showModal({
			title: t('workspace.contactTitle'),
			editable: true,
			placeholderText: t('workspace.contactPlaceholder'),
			content: buildContactMessage(post),
			confirmText: t('workspace.contactSend'),
			success: async ({ confirm, content }) => {
				if (!confirm) return
				try {
					await createChatRequestApi({ targetUserId: post.userId, message: (content || buildContactMessage(post)).slice(0, 500) })
					uni.showToast({ title: t('workspace.contactSent'), icon: 'success' })
				} catch (error) { /* 请求层已提示 */ }
			}
		})
	} catch (error) { /* 请求层已提示 */ }
}

function goPostDetail(id) {
	if (!id) return
	uni.navigateTo({ url: `/pages/demandhall/detail?id=${id}` })
}

function goOrder(id) {
	uni.navigateTo({ url: `/pages/demandhall/orderDetail?id=${id}` })
}

function goDiscover() {
	const url = `/pages/demandhall/index?tab=${postKind.value}`
	// 从入口页进来时直接返回，避免在导航栈里堆叠同一个列表页。
	const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : []
	const previous = stack[stack.length - 2]
	if (previous?.route === 'pages/demandhall/index') {
		uni.navigateBack()
		return
	}
	uni.navigateTo({ url })
}

function goPublish() {
	uni.navigateTo({ url: '/pages/demandhall/index?compose=1' })
}

function confirmDialog({ title, content }) {
	return new Promise(resolve => {
		uni.showModal({
			title,
			content,
			success: ({ confirm }) => resolve(confirm),
			fail: () => resolve(false)
		})
	})
}

onLoad(options => {
	if (options?.tab && WORKSPACE_TABS.some(tab => tab.key === options.tab)) activeTab.value = options.tab
	void reload()
})

onShow(() => {
	// 从订单页 / 详情页返回时同步订单状态与状态角标。
	if (currentPage.value > 0) void reload()
})
