<template>
	<view class="profile-container" v-if="profile">

		<!-- 顶部状态栏 -->
		<view class="status-header">
			<view class="status-item" v-for="(item, index) in statusList" :key="index">
				<text class="label">{{ item.label }}</text>
				<text class="value">{{ item.value || '—' }}</text>
			</view>
		</view>

		<!-- 照片展示 -->
		<view class="section">
			<view class="section-title">照片展示</view>
			<view class="photo-gallery" v-if="photoList.length">
				<image
					v-for="(src, idx) in photoList"
					:key="idx"
					class="photo"
					:src="src"
					mode="aspectFill"
					@error="onPhotoError(idx)"
				></image>
			</view>
			<view v-else class="empty-text">暫無照片</view>
		</view>

		<!-- 自我介绍 -->
		<view class="section">
			<view class="section-title">自我介绍</view>
			<view class="intro-box">
				<text class="intro-text">{{ profile.Selfintroduction || profile.bio || '暫無自我介绍' }}</text>
			</view>
		</view>

		<!-- 个人资料 -->
		<view class="section">
			<view class="section-title">个人资料</view>
			<view class="table">
				<view class="tr" v-for="(item, index) in personalInfo" :key="index">
					<view class="th">{{ item.label }}</view>
					<view class="td">{{ item.value || '—' }}</view>
				</view>
			</view>
		</view>

		<!-- 最高学历 -->
		<view class="section">
			<view class="section-title">最高学历</view>
			<view class="table">
				<view class="tr" v-for="(item, index) in educationInfo" :key="index">
					<view class="th">{{ item.label }}</view>
					<view class="td">{{ item.value || '—' }}</view>
				</view>
			</view>
		</view>

		<!-- 就业 -->
		<view class="section">
			<view class="section-title">就業</view>
			<view class="table">
				<view class="tr" v-for="(item, index) in jobInfo" :key="index">
					<view class="th">{{ item.label }}</view>
					<view class="td">{{ item.value || '—' }}</view>
				</view>
			</view>
		</view>

		<!-- 协助者的资料 -->
		<view class="section">
			<view class="section-title">協助者的資料</view>
			<view class="table">
				<view class="tr" v-for="(item, index) in assistantInfo" :key="index">
					<view class="th">{{ item.label }}</view>
					<view class="td">{{ item.value || '—' }}</view>
				</view>
			</view>
		</view>

		<!-- 生活與信仰 -->
		<view class="section">
			<view class="section-title">生活與信仰</view>
			<view class="table">
				<view class="tr">
					<view class="th flex-1">愛好/興趣</view>
					<view class="th flex-1">我的信仰生活</view>
					<view class="th flex-1">我希望配偶的信仰生活</view>
				</view>
				<view class="tr">
					<view class="td flex-1 center">{{ hobbyText }}</view>
					<view class="td flex-1 center">{{ profile.faith_life || '—' }}</view>
					<view class="td flex-1 center">{{ spouseFaithText }}</view>
				</view>
			</view>
		</view>

		<!-- 對對象的希望 (分析工具) -->
		<view class="section">
			<view class="section-title">對對象的希望</view>
			<view class="table">
				<view class="tr">
					<view class="th flex-1">分析工具</view>
					<view class="th flex-1">我的類型</view>
					<view class="th flex-1">推薦類型</view>
				</view>
				<view class="tr" v-for="(item, index) in analysisInfo" :key="index">
					<view class="td flex-1 center">{{ item.tool }}</view>
					<view class="td flex-1 center">{{ item.myType }}</view>
					<view class="td flex-1 center">{{ item.recommend }}</view>
				</view>
			</view>
		</view>

		<!-- 父母资料（占位：当前 profiles 表无该字段） -->
		<view class="section">
			<view class="section-title">父母資料</view>
			<view class="empty-text">暫無父母資料</view>
		</view>

	</view>

	<!-- 加载/异常态 -->
	<view v-else-if="loading" class="state-box">
		<text>載入中...</text>
	</view>
	<view v-else class="state-box">
		<text>候選人不存在或已被移除</text>
		<view class="btn-back" @tap="goBack">返回</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCandidateProfileApi } from '@/api/index.js'

const profile = ref(null)
const loading = ref(true)
const failedPhotos = ref(new Set())

// ===== 路由参数 =====
const profileId = ref(null)

onLoad((options) => {
	// 来自 searchPerson.vue 的 url: /pages/searchPerson/personShow/personShow?id=xxx
	const id = options && options.id ? Number(options.id) : null
	profileId.value = id
	if (!id) {
		loading.value = false
		return
	}
	fetchProfile()
})

async function fetchProfile () {
	loading.value = true
	try {
		const data = await getCandidateProfileApi(profileId.value)
		profile.value = (data && data.profile) || null
	} catch (e) {
		console.error('getCandidateProfile error', e)
		profile.value = null
		uni.showToast({ title: '載入失敗', icon: 'none' })
	} finally {
		loading.value = false
	}
}

function goBack () {
	const pages = getCurrentPages()
	if (pages.length > 1) {
		uni.navigateBack()
	} else {
		uni.reLaunch({ url: '/pages/searchPerson/searchPerson' })
	}
}

// ===== 计算属性 =====

// 顶部状态：健康 / 世代 / 祝福类型 / 性别 / 区域 / 国家
const statusList = computed(() => {
	const p = profile.value || {}
	return [
		{ label: '健康', value: p.health },
		{ label: '世代', value: p.generation },
		{ label: '祝福', value: p.blessing_type },
		{ label: '性別', value: p.gender },
		{ label: '區域', value: p.region },
		{ label: '國家', value: p.country }
	]
})

// 照片列表（avatar + photos + cover）
const photoList = computed(() => {
	const p = profile.value || {}
	const list = []
	if (Array.isArray(p.photos)) list.push(...p.photos)
	return list.filter((src) => src && !failedPhotos.value.has(src))
})

function onPhotoError (idx) {
	const list = photoList.value
	const broken = list[idx]
	if (broken) failedPhotos.value.add(broken)
}

// 出生日期格式化：1999年 11月2日 (26)
const birthDateText = computed(() => {
	const p = profile.value || {}
	if (!p.birth_year) return ''
	const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
	const month = p.birth_month ? months[p.birth_month - 1] : '?'
	const day = p.birth_day || '?'
	const age = new Date().getFullYear() - Number(p.birth_year)
	return `${p.birth_year}年 ${month}月${day}日 (${age})`
})

// 血型展示：B型 RH+
const bloodText = computed(() => {
	const p = profile.value || {}
	const t = p.blood_type
	const rh = p.blood_rh
	if (!t && !rh) return ''
	return `${t || ''}${rh ? ' ' + rh : ''}`.trim()
})

// 个人资料
const personalInfo = computed(() => {
	const p = profile.value || {}
	const nativeName = [p.native_last_name, p.native_first_name].filter(Boolean).join(' ')
	const enName = [p.en_last_name, p.en_first_name].filter(Boolean).join(' ')
	return [
		{ label: '姓名（母語）', value: nativeName },
		{ label: '姓名（英文）', value: enName },
		{ label: '出生日期', value: birthDateText.value },
		{ label: '身高(cm)', value: p.height ? `${p.height}cm` : '' },
		{ label: '體重', value: p.weight ? `${p.weight}kg` : '' },
		{ label: '血型', value: bloodText.value },
		{ label: '國籍', value: p.nationality },
		{ label: '資格', value: [p.qualification1, p.qualification2].filter(Boolean).join(' / ') },
		{ label: '首選國家', value: [p.preferred_country1, p.preferred_country2].filter(Boolean).join(' / ') },
		{
			label: '外語能力 #1',
			value: [p.lang1_name, p.lang1_level].filter(Boolean).join('/')
		},
		{
			label: '外語能力 #2',
			value: [p.lang2_name, p.lang2_level].filter(Boolean).join('/')
		}
	]
})

// 最高学历
const educationInfo = computed(() => {
	const p = profile.value || {}
	return [
		{ label: '學位', value: [p.degree_level, p.degree_status].filter(Boolean).join(' / ') },
		{ label: '學校名稱', value: p.school_name },
		{ label: '主要', value: p.major }
	]
})

// 就业
const jobInfo = computed(() => {
	const p = profile.value || {}
	return [
		{ label: '工作', value: p.occupation },
		{ label: '公司名稱', value: p.company_name }
	]
})

// 协助者资料（邮箱脱敏）
const assistantInfo = computed(() => {
	const p = profile.value || {}
	const maskedEmail = p.helper_email
		? p.helper_email.replace(/^([^@]{1,3})([^@]*)@/, (_, head, tail) => `${head}${'*'.repeat(Math.max(tail.length, 1))}@`)
		: ''
	return [
		{ label: '姓名', value: p.helper_name },
		{ label: '手機', value: p.helper_mobile },
		{ label: '電子郵件', value: maskedEmail }
	]
})

// 爱好合并：hobby1 + hobby2
const hobbyText = computed(() => {
	const p = profile.value || {}
	return [p.hobby1, p.hobby2].filter(Boolean).join(' / ') || '—'
})

// spouse_faith_life 可能是 JSON 数组
const spouseFaithText = computed(() => {
	const p = profile.value || {}
	const sfl = p.spouse_faith_life
	if (Array.isArray(sfl) && sfl.length) return sfl.join(' / ')
	if (typeof sfl === 'string' && sfl) return sfl
	return '—'
})

// 分析工具：列出 5 种工具，我的类型取 profile 里存的值；推荐类型暂用占位（profiles 表没存推荐）
const analysisInfo = computed(() => {
	const p = profile.value || {}
	return [
		{ tool: '雙手交握', myType: p.tool_hands, recommend: '—' },
		{ tool: '陰/陽', myType: p.tool_yinyang, recommend: '—' },
		{ tool: '五要素', myType: p.tool_five_elements, recommend: '—' },
		{ tool: '九型人格', myType: p.tool_enneagram, recommend: '—' },
		{ tool: 'MBTI', myType: p.tool_mbti, recommend: '—' }
	]
})
</script>

<style scoped lang="scss">
/* 主色调定义 */
$primary-color: #fff6df;
$bg-color: #fff6df;
$border-color: #e0e0e0;

.profile-container {
	padding: 20rpx;
	background-color: #fff6df;
	min-height: 100vh;
}

/* 顶部状态栏 */
.status-header {
	display: flex;
	flex-wrap: wrap;
	background-color: #fff;
	border-radius: 12rpx;
	padding: 20rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
	border-top: 6rpx solid $primary-color;
}

.status-item {
	width: 33.33%;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 16rpx;
}

.status-item .label {
	font-size: 24rpx;
	color: #666;
	margin-bottom: 8rpx;
}

.status-item .value {
	font-size: 26rpx;
	color: #333;
	font-weight: bold;
}

/* 区块通用样式 */
.section {
	background-color: #fff;
	border-radius: 12rpx;
	padding: 24rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 24rpx;
	padding-left: 16rpx;
	border-left: 8rpx solid $primary-color;
}

/* 照片展示区 */
.photo-gallery {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.photo {
	width: 48%;
	height: 400rpx;
	border-radius: 8rpx;
	background-color: #eee;
}

/* 自我介绍区 */
.intro-box {
	background-color: #fff6df;
	padding: 20rpx;
	border-radius: 8rpx;
	border: 1px solid rgba(255, 246, 223, 0.2);
}

.intro-text {
	font-size: 28rpx;
	color: #333;
	line-height: 1.6;
	white-space: pre-wrap;
	word-break: break-word;
}

/* 表格样式 */
.table {
	width: 100%;
	border-top: 1px solid $border-color;
	border-left: 1px solid $border-color;
	border-radius: 4rpx;
	overflow: hidden;
}

.tr {
	display: flex;
	width: 100%;
}

.th, .td {
	padding: 16rpx 20rpx;
	font-size: 28rpx;
	border-right: 1px solid $border-color;
	border-bottom: 1px solid $border-color;
	word-break: break-all;
}

.th {
	background-color: rgba(255, 246, 223, 0.1);
	color: #333;
	font-weight: bold;
	width: 35%;
	flex-shrink: 0;
}

.td {
	color: #333;
	width: 65%;
	background-color: #fff;
}

/* 均分多列的情况 (如分析工具) */
.flex-1 {
	flex: 1;
	width: auto;
}

.center {
	text-align: center;
	justify-content: center;
}

/* 加载/空态 */
.state-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	color: #666;
	font-size: 28rpx;
}

.empty-text {
	color: #999;
	font-size: 26rpx;
	padding: 20rpx 0;
	text-align: center;
}

.btn-back {
	margin-top: 30rpx;
	padding: 16rpx 60rpx;
	background-color: $primary-color;
	color: #fff;
	border-radius: 8rpx;
	font-size: 28rpx;
}
</style>