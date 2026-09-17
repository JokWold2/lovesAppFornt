import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SUPPORTED_LOCALES, translate } from '../utils/locale.js'
import {
	COMMUNITY_INDEX_ROUTE,
	COMMUNITY_LEADERBOARD_ROUTE,
	COMMUNITY_TOPICS_ROUTE,
	COMMUNITY_TOPIC_DETAIL_ROUTE,
	communityAvatarOf,
	communityLoginRoute,
	communityPostRoute,
	communityProfileRoute,
	communityTopicRoute,
	decodeCommunityParam,
	formatCommunityNumber,
	formatCommunityTime,
	rankTier
} from '../utils/communityHub.js'

const read = relativePath => readFile(new URL(relativePath, import.meta.url), 'utf8')

// 轻量标签配对检查：uni-app 模板里的标签都必须成对或自闭合。
function assertBalancedTags(source, label) {
	const template = source.match(/<template>([\s\S]*)<\/template>/)[1]
	const stack = []
	const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
	let match
	while ((match = tagPattern.exec(template)) !== null) {
		const [, closing, name, , selfClosing] = match
		if (selfClosing) continue
		if (closing) {
			const opened = stack.pop()
			assert.equal(opened, name, `${label}: 标签 </${name}> 与 <${opened}> 不匹配`)
		} else {
			stack.push(name)
		}
	}
	assert.deepEqual(stack, [], `${label}: 存在未闭合的标签`)
}

test('社区入口指向话题广场与排行榜两个独立页面', () => {
	assert.equal(COMMUNITY_TOPICS_ROUTE, '/pages/community/topics')
	assert.equal(COMMUNITY_LEADERBOARD_ROUTE, '/pages/community/leaderboard')
	assert.equal(COMMUNITY_INDEX_ROUTE, '/pages/community/index')
})

test('话题详情路由对中文与特殊字符话题名做编码', () => {
	assert.equal(communityTopicRoute('技术分享'), '/pages/community/topicDetail?name=%E6%8A%80%E6%9C%AF%E5%88%86%E4%BA%AB')
	assert.equal(communityTopicRoute('C++ / Rust'), '/pages/community/topicDetail?name=C%2B%2B%20%2F%20Rust')
	assert.equal(communityTopicRoute(undefined), '/pages/community/topicDetail?name=')
})

test('decodeCommunityParam 兼容已解码与编码失败的参数', () => {
	assert.equal(decodeCommunityParam(encodeURIComponent('技术分享')), '技术分享')
	assert.equal(decodeCommunityParam('技术分享'), '技术分享')
	assert.equal(decodeCommunityParam('%E6%8A'), '%E6%8A')
	assert.equal(decodeCommunityParam(undefined), '')
	assert.equal(decodeCommunityParam(null), '')
})

test('帖子与用户主页路由带上各自的 id', () => {
	assert.equal(communityPostRoute(12), '/pages/post/detail?id=12')
	assert.equal(communityProfileRoute(34), '/pages/searchPerson/personShow/personShow?id=34')
})

test('登录路由保留原始页面的 redirect', () => {
	assert.equal(communityLoginRoute(), '/pages/login/login360')
	assert.equal(communityLoginRoute('/pages/community/topics'), '/pages/login/login360?redirect=%2Fpages%2Fcommunity%2Ftopics')
})

test('formatCommunityNumber 用万和 k 压缩大数', () => {
	assert.equal(formatCommunityNumber(0), '0')
	assert.equal(formatCommunityNumber(999), '999')
	assert.equal(formatCommunityNumber(1286), '1.3k')
	assert.equal(formatCommunityNumber(8942), '8.9k')
	assert.equal(formatCommunityNumber(23800), '2.4万')
	assert.equal(formatCommunityNumber(undefined), '0')
})

test('communityAvatarOf 优先用真实头像，缺失时按昵称稳定生成', () => {
	assert.equal(communityAvatarOf({ avatar: 'https://img/a.png', username: '张三' }), 'https://img/a.png')
	const generated = communityAvatarOf({ avatar: '', username: '张三' })
	assert.match(generated, /^https:\/\/api\.dicebear\.com\/7\.x\/miniavs\/svg\?seed=/)
	assert.equal(communityAvatarOf({ username: '张三' }), generated)
	assert.notEqual(communityAvatarOf({ username: '李四' }), generated)
})

test('rankTier 只给前三名金银铜样式', () => {
	assert.equal(rankTier(1), 'gold')
	assert.equal(rankTier(2), 'silver')
	assert.equal(rankTier(3), 'bronze')
	assert.equal(rankTier(4), 'plain')
	assert.equal(rankTier(undefined), 'plain')
})

test('formatCommunityTime 输出两位时分，非法时间返回空串', () => {
	assert.equal(formatCommunityTime(new Date('2026-09-17T08:05:00').getTime()), '08:05')
	assert.equal(formatCommunityTime(0), '')
	assert.equal(formatCommunityTime(undefined), '')
})

/* ============ 页面接线与多语言覆盖 ============ */

test('pages.json 注册话题广场、话题详情与排行榜三个页面', async () => {
	const pages = JSON.parse((await read('../pages.json')).replace(/^\s*\/\/.*$/gm, ''))
	const paths = pages.pages.map(page => page.path)
	for (const path of ['pages/community/topics', 'pages/community/topicDetail', 'pages/community/leaderboard']) {
		assert.ok(paths.includes(path), `缺少页面 ${path}`)
	}
	assert.equal(pages.pages.find(page => page.path === 'pages/community/topics').style.navigationBarTitleText, '话题广场')
	assert.equal(pages.pages.find(page => page.path === 'pages/community/leaderboard').style.navigationBarTitleText, '排行榜')
})

test('社区首页出现话题广场与排行榜两个入口', async () => {
	const source = await read('../pages/community/index.vue')
	assertBalancedTags(source, 'community/index.vue')
	for (const keyword of ['class="community-entries"', 'communityEntries', 'openCommunityEntry', 'COMMUNITY_TOPICS_ROUTE', 'COMMUNITY_LEADERBOARD_ROUTE']) {
		assert.ok(source.includes(keyword), `社区首页缺少 ${keyword}`)
	}
	assert.match(source, /from ['"]@\/utils\/communityHub\.js['"]/, '社区首页需要复用话题/榜单路由常量')
	assert.ok(source.includes("t('community.entryTopics')") || source.includes('t("community.entryTopics")'), '入口文案需要接入语言系统')
	assert.ok(source.includes("t('community.entryLeaderboard')") || source.includes('t("community.entryLeaderboard")'), '入口文案需要接入语言系统')
})

test('话题广场覆盖搜索、排序、热门横滑、关注与创建话题', async () => {
	const source = await read('../pages/community/topics.vue')
	assertBalancedTags(source, 'topics.vue')
	for (const keyword of [
		'class="search-box"', 'class="sort-bar"', 'class="hot-scroll"', 'class="topic-card"',
		'class="follow-btn"', 'class="create-entry"', 'class="create-modal"',
		'refresher-enabled', '@scrolltolower', 'searchEmpty', 'followingEmpty', 'gotoHotTopics', 'createEntry'
	]) {
		assert.ok(source.includes(keyword), `话题广场缺少 ${keyword}`)
	}
	for (const handler of ['function loadTopics', 'function loadHotTopics', 'function toggleFollow', 'function submitCreateTopic', 'function switchSort', 'function onRefresh', 'function onLoadMore']) {
		assert.ok(source.includes(handler), `话题广场缺少 ${handler}`)
	}
	assert.ok(source.includes('getCommunityTopicsApi') && source.includes('getCommunityHotTopicsApi'), '话题广场需要话题列表与热门话题接口')
	assert.ok(source.includes('toggleCommunityTopicFollowApi') && source.includes('createCommunityTopicApi'))
	// 关注按钮先本地反馈再以服务端计数覆盖，并且请求期间禁止重复点击
	assert.ok(source.includes('if (topic.following) return'), '关注需要防重复点击')
	assert.ok(source.includes('topic.followerCount = previous.followerCount'), '关注失败需要回滚')
})

test('话题详情页展示话题信息条、帖子流与带话题发帖', async () => {
	const source = await read('../pages/community/topicDetail.vue')
	assertBalancedTags(source, 'topicDetail.vue')
	for (const keyword of [
		'class="topic-bar"', 'class="post-list"', 'class="publish-btn"', 'class="publish-modal"',
		'refresher-enabled', '@scrolltolower', 'topicNoPosts', 'publishWithTopic'
	]) {
		assert.ok(source.includes(keyword), `话题详情页缺少 ${keyword}`)
	}
	for (const handler of ['function loadTopic', 'function loadPosts', 'function toggleFollow', 'function submitPost']) {
		assert.ok(source.includes(handler), `话题详情页缺少 ${handler}`)
	}
	// 详情页发帖固定带当前话题，避免帖子落到其他话题下
	assert.ok(source.includes('tags: [topicName.value]'), '发帖需要固定携带当前话题')
	assert.ok(source.includes('uploadCommunityImagesApi'), '发帖需要复用图片上传')
})

test('排行榜覆盖双 Tab、时间范围、前三名样式、我的排名与榜单兜底文案', async () => {
	const source = await read('../pages/community/leaderboard.vue')
	assertBalancedTags(source, 'leaderboard.vue')
	for (const keyword of [
		'class="type-tabs"', 'class="range-bar"', 'class="rank-number"', 'class="post-thumb"',
		'class="my-rank-bar"', 'scroll-into-view', 'refreshNote', 'myRankText', 'rankUnlisted',
		'leaderboardEmpty', 'loadMoreFailed'
	]) {
		assert.ok(source.includes(keyword), `排行榜缺少 ${keyword}`)
	}
	for (const handler of ['function loadBoard', 'function switchType', 'function switchRange', 'function locateMine', 'function openPost', 'function openProfile', 'function onLoadMore']) {
		assert.ok(source.includes(handler), `排行榜缺少 ${handler}`)
	}
	for (const tier of ["'tier-' + rankTier(entry.rank)", 'tier-gold', 'tier-silver', 'tier-bronze']) {
		assert.ok(source.includes(tier), `排行榜缺少前三名样式 ${tier}`)
	}
	assert.ok(source.includes('getCommunityLeaderboardApi'), '排行榜需要榜单接口')
})

test('接口封装覆盖话题与榜单的全部后端路由', async () => {
	const source = await read('../api/community.js')
	for (const path of [
		'/api/community/topics', '/api/community/topics/hot', '/api/community/topics/detail',
		'/api/community/topics/follow', '/api/community/leaderboard'
	]) {
		assert.ok(source.includes(path), `缺少接口 ${path}`)
	}
})

test('六个语言都补齐话题广场与排行榜文案且占位符一致', () => {
	const keys = [
		'entryTopics', 'entryLeaderboard', 'topicsTitle', 'searchPlaceholder', 'searchEmpty', 'searchEmptyHint',
		'sortHot', 'sortLatest', 'sortFollowing', 'hotSectionTitle', 'trendRising', 'postCountText', 'followerCountText',
		'follow', 'followed', 'followFailed', 'loginRequired', 'topicsEmpty', 'topicsEmptyHint', 'followingEmpty',
		'followingEmptyHint', 'gotoHotTopics', 'createEntry', 'createTitle', 'createNamePlaceholder', 'createDescPlaceholder',
		'createSubmit', 'creating', 'createSuccess', 'createNameRequired', 'topicDetailTitle', 'topicPostsTitle',
		'publishWithTopic', 'publishPlaceholder', 'publish', 'publishing', 'publishSuccess', 'publishFailed',
		'contentRequired', 'expand', 'collapse', 'topicTagLabel', 'categoryLabel', 'imageLabel', 'topicNoPosts',
		'topicNoPostsHint', 'leaderboardTitle', 'tabPosts', 'tabUsers', 'rangeToday', 'rangeWeek', 'myRankText',
		'rankJumpHint', 'rankUnlisted', 'refreshNote', 'updatedAt', 'leaderboardEmpty', 'leaderboardEmptyPosts',
		'leaderboardEmptyUsers', 'leaderboardCta', 'statView', 'statLike', 'statComment', 'statPost', 'statLikeReceived',
		'loading', 'loadingMore', 'noMore', 'loadFailed', 'openFailed', 'retry'
	]
	const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
	for (const locale of SUPPORTED_LOCALES) {
		for (const key of keys) {
			const value = translate(locale, `community.${key}`)
			assert.notEqual(value, `community.${key}`, `${locale} 缺少 community.${key}`)
			assert.ok(value.length, `${locale}.community.${key}`)
			assert.deepEqual(placeholders(value), placeholders(translate('zh-Hans', `community.${key}`)), `${locale}.community.${key}`)
			if (['en', 'ru'].includes(locale)) assert.doesNotMatch(value, /[\u3400-\u9fff]/, `${locale}.community.${key}`)
		}
	}
})

test('话题与榜单文案不会漏掉翻译键名', () => {
	for (const locale of SUPPORTED_LOCALES) {
		assert.match(translate(locale, 'community.publishWithTopic', { name: 'X' }), /X/)
		assert.match(translate(locale, 'community.myRankText', { rank: 3 }), /3/)
		assert.match(translate(locale, 'community.refreshNote', { minutes: 10 }), /10/)
		assert.match(translate(locale, 'community.trendRising', { percent: 50 }), /50/)
	}
})
