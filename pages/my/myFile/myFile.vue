<template>
	<view class="page">

		<!-- ========== 畫面 1／4 — 基本資料 ========== -->
		<template v-if="step === 1">
			<view class="topbar">
				<view class="topbar-row">
					<view class="back-btn" @tap="onExit">‹</view>
					<view>
						<view class="topbar-title">個人資料</view>
						<view class="topbar-sub">請完整填寫以下欄位</view>
					</view>
				</view>
				<view class="beads">
					<view class="bead on"></view>
					<view class="bead"></view>
					<view class="bead"></view>
					<view class="bead"></view>
				</view>
			</view>

			<scroll-view scroll-y class="scroll-area page-scroll" style="max-width: 750rpx;box-sizing: border-box;">
				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">基本資料</text><text class="req">必填</text>
					</view>
					<view class="field">
						<text class="field-label">ID<text class="star"></text></text>
						<input class="input" v-model="form.id" placeholder="your_id" />
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">主要部分</text><text class="req">必填</text>
					</view>
					<view class="field">
						<text class="field-label">世代</text>
						<picker mode="selector" :range="generationOptions"
							@change="e => form.generation = generationOptions[e.detail.value]">
							<view class="select-row">
								<text :class="{ placeholder: !form.generation }">{{ form.generation || '請選擇' }}</text>
								<text class="chev">▾</text>
							</view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">健康狀況</text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.health === '健康' }" @tap="form.health = '健康'">健康</view>
							<view class="pill" :class="{ on: form.health === '特殊需求' }" @tap="form.health = '特殊需求'">
								特殊需求<text class="info">?</text></view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">祝福</text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.blessingType === '第一次祝福' }"
								@tap="form.blessingType = '第一次祝福'">第一次祝福</view>
							<view class="pill" :class="{ on: form.blessingType === '重新祝福' }"
								@tap="form.blessingType = '重新祝福'">重新祝福</view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">性別</text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.gender === '男' }" @tap="form.gender = '男'">男</view>
							<view class="pill" :class="{ on: form.gender === '女' }" @tap="form.gender = '女'">女</view>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">部分（所屬教會）</text>
					</view>
					<view class="field">
						<text class="field-label">區域</text>
						<picker mode="selector" :range="regionOptions"
							@change="e => form.region = regionOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.region }">{{ form.region ||
									'請選擇' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">分地區</text>
						<picker mode="selector" :range="subRegionOptions"
							@change="e => form.subRegion = subRegionOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.subRegion }">{{ form.subRegion
								|| '請選擇' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">國家（教區）</text>
						<picker mode="selector" :range="countryOptions"
							@change="e => form.country = countryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.country }">{{ form.country ||
									'請選擇' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">教會</text>
						<input class="input" v-model="form.churchName" placeholder="Hong Kong Church" />
					</view>
				</view>
			</scroll-view>

			<view class="bottombar">
				<view class="btn ghost" @tap="onExit">取消</view>
				<view class="btn primary" @tap="goNext(1)">下一步</view>
			</view>
		</template>

		<!-- ========== 畫面 2／4 — 個人資料 ========== -->
		<template v-if="step === 2">
			<view class="topbar">
				<view class="topbar-row">
					<view class="back-btn" @tap="step = 1">‹</view>
					<view>
						<view class="topbar-title">個人資料</view>
						<view class="topbar-sub">姓名 · 出生 · 聯絡方式</view>
					</view>
				</view>
				<view class="beads">
					<view class="bead on"></view>
					<view class="bead on"></view>
					<view class="bead"></view>
					<view class="bead"></view>
				</view>
			</view>

			<scroll-view scroll-y class="scroll-area page-scroll" style="max-width: 750rpx;box-sizing: border-box;">
				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">姓名</text><text class="req">必填</text>
					</view>
					<view class="field">
						<text class="field-label">姓名（母語）</text>
						<view class="row2">
							<input class="input" v-model="form.nativeLastName" placeholder="姓" />
							<input class="input" v-model="form.nativeFirstName" placeholder="名" />
						</view>
					</view>
					<view class="field">
						<text class="field-label">姓名（英文）</text>
						<view class="row2">
							<input class="input" v-model="form.enLastName" placeholder="Last name" />
							<input class="input" v-model="form.enFirstName" placeholder="First name" />
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">出生 · 體格</text>
					</view>
					<view class="field">
						<text class="field-label">出生日期</text>
						<view class="pillgroup" style="margin-bottom: 8px;">
							<view class="pill" :class="{ on: form.calendarType === '陽曆' }"
								@tap="form.calendarType = '陽曆'">陽曆</view>
							<view class="pill" :class="{ on: form.calendarType === '陰曆' }"
								@tap="form.calendarType = '陰曆'">陰曆</view>
						</view>
						<view class="row3">
							<picker mode="selector" :range="yearOptions"
								@change="e => form.birthYear = yearOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.birthYear }">{{
									form.birthYear || '年' }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="monthOptions"
								@change="e => form.birthMonth = monthOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.birthMonth }">{{
									form.birthMonth || '月' }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="dayOptions"
								@change="e => form.birthDay = dayOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.birthDay }">{{ form.birthDay
										|| '日' }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
					</view>
					<view class="row2">
						<view class="field">
							<text class="field-label">身高（公分）</text>
							<input class="input" type="number" v-model="form.height" placeholder="170" />
						</view>
						<view class="field">
							<text class="field-label">體重（公斤）</text>
							<input class="input" type="number" v-model="form.weight" placeholder="67" />
						</view>
					</view>
					<view class="field">
						<text class="field-label">血型</text>
						<view class="row2">
							<picker mode="selector" :range="bloodTypeOptions"
								@change="e => form.bloodType = bloodTypeOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.bloodType }">{{
									form.bloodType || 'A型' }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="bloodRhOptions"
								@change="e => form.bloodRh = bloodRhOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.bloodRh }">{{ form.bloodRh
									|| 'RH+' }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">國籍 · 語言</text>
					</view>
					<view class="field">
						<text class="field-label">國籍</text>
						<picker mode="selector" :range="countryOptions"
							@change="e => form.nationality = countryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.nationality }">{{
								form.nationality || 'Hong Kong' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">外語能力 #1</text>
						<view class="row2">
							<picker mode="selector" :range="langOptions"
								@change="e => form.lang1Name = langOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.lang1Name }">{{
									form.lang1Name || '英文' }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="levelOptions"
								@change="e => form.lang1Level = levelOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.lang1Level }">{{
									form.lang1Level || '流利' }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
					</view>
					<view class="field">
						<text class="field-label">外語能力 #2</text>
						<view class="row2">
							<picker mode="selector" :range="langOptions"
								@change="e => form.lang2Name = langOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.lang2Name }">{{
									form.lang2Name || '日文' }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="levelOptions"
								@change="e => form.lang2Level = levelOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.lang2Level }">{{
									form.lang2Level || '一點點' }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">聯絡方式</text><text class="req">必填</text>
					</view>
					<view class="field">
						<text class="field-label">手機</text>
						<input class="input" type="number" v-model="form.mobile" placeholder="country code — number" />
					</view>
					<view class="field">
						<text class="field-label">電子郵件</text>
						<input class="input" v-model="form.email" placeholder="name@example.com" />
					</view>
					<view class="field">
						<text class="field-label">地址</text>
						<input class="input" style="margin-bottom: 8px;" v-model="form.addressStreet"
							placeholder="城市 / 街道" />
						<input class="input" v-model="form.addressCountry" placeholder="國家" />
					</view>
				</view>
			</scroll-view>

			<view class="bottombar">
				<view class="btn ghost" @tap="step = 1">上一步</view>
				<view class="btn primary" @tap="goNext(2)">下一步</view>
			</view>
		</template>

		<!-- ========== 畫面 3／4 — 學經歷與資格 ========== -->
		<template v-if="step === 3">
			<view class="topbar">
				<view class="topbar-row">
					<view class="back-btn" @tap="step = 2">‹</view>
					<view>
						<view class="topbar-title">學經歷與資格</view>
						<view class="topbar-sub">學歷 · 工作 · 特殊條件</view>
					</view>
				</view>
				<view class="beads">
					<view class="bead on"></view>
					<view class="bead on"></view>
					<view class="bead on"></view>
					<view class="bead"></view>
				</view>
			</view>

			<scroll-view scroll-y class="scroll-area page-scroll" style="max-width: 750rpx;box-sizing: border-box;">
				<view class="helperbox">神 TOP GUN 祝福候選人認定 — 如符合資格將顯示於此，無需另外填寫。</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">最高學歷</text>
					</view>
					<view class="field">
						<text class="field-label">學位</text>
						<view class="row2">
							<picker mode="selector" :range="degreeLevelOptions"
								@change="e => form.degreeLevel = degreeLevelOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.degreeLevel }">{{
									form.degreeLevel || '學院 / 大學' }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="degreeStatusOptions"
								@change="e => form.degreeStatus = degreeStatusOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.degreeStatus }">{{
									form.degreeStatus || '畢業' }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
					</view>
					<view class="field">
						<text class="field-label">學校名稱</text>
						<input class="input" v-model="form.schoolName" placeholder="City University of Hong Kong" />
					</view>
					<view class="field">
						<text class="field-label">主修</text>
						<input class="input" v-model="form.major" placeholder="Criminology" />
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">就業機會</text>
					</view>
					<view class="field">
						<text class="field-label">工作</text>
						<picker mode="selector" :range="occupationOptions"
							@change="e => form.occupation = occupationOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.occupation }">{{ form.occupation
								|| '自營商' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">公司名稱</text>
						<input class="input" v-model="form.companyName" placeholder="公司 / 品牌名稱" />
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">資格</text>
					</view>
					<view class="field">
						<text class="field-label">資格 #1</text>
						<input class="input" v-model="form.qualification1" placeholder="Scuba diving instructor" />
					</view>
					<view class="field">
						<text class="field-label">資格 #2</text>
						<input class="input" v-model="form.qualification2" placeholder="尚未填寫" />
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">首選國家</text><text class="req">必填</text>
					</view>
					<view class="field">
						<text class="field-label">第一個盼望特質</text>
						<picker mode="selector" :range="allCountryOptions"
							@change="e => form.preferredCountry1 = allCountryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.preferredCountry1 }">{{
								form.preferredCountry1 || '所有國家' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">第二個盼望特質</text>
						<picker mode="selector" :range="allCountryOptions"
							@change="e => form.preferredCountry2 = allCountryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.preferredCountry2 }">{{
								form.preferredCountry2 || '所有國家' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">特殊需求</text>
					</view>
					<view class="field">
						<text class="field-label">類別</text>
						<picker mode="selector" :range="specialCategoryOptions"
							@change="e => form.specialCategory = specialCategoryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.specialCategory }">{{
								form.specialCategory || '選擇' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">生活能力程度<text class="info">?</text></text>
						<picker mode="selector" :range="specialLevelOptions"
							@change="e => form.specialLevel = specialLevelOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.specialLevel }">{{
								form.specialLevel || '選擇' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">輸入欄位</text>
						<textarea class="input" v-model="form.specialNote" :maxlength="30" placeholder="最多 30 個字" />
						<view class="charcount">{{ form.specialNote.length }} / 30</view>
					</view>
				</view>

				<view class="card">
					<view class="addrow">
						<view class="card-head" style="margin-bottom: 0;">
							<view class="mark"></view><text class="card-title">事業</text>
						</view>
						<view style="display: flex;">
							<view class="mini-btn add" @tap="addCareer">＋ 新增</view>
							<view class="mini-btn" @tap="removeCareer">－ 刪除</view>
						</view>
					</view>

					<view v-for="(career, index) in form.careers" :key="index" class="career-block">
						<view class="field">
							<text class="field-label">期間</text>
							<view class="row2">
								<picker mode="selector" :range="yearOptions"
									@change="e => career.startYear = yearOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !career.startYear }">{{
										career.startYear || '開始年' }}</text><text class="chev">▾</text></view>
								</picker>
								<picker mode="selector" :range="monthOptions"
									@change="e => career.startMonth = monthOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !career.startMonth }">{{
										career.startMonth || '開始月' }}</text><text class="chev">▾</text></view>
								</picker>
							</view>
							<view class="row2" style="margin-top: 8px;">
								<picker mode="selector" :range="yearOptions"
									@change="e => career.endYear = yearOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !career.endYear }">{{
										career.endYear || '結束年' }}</text><text class="chev">▾</text></view>
								</picker>
								<picker mode="selector" :range="monthOptions"
									@change="e => career.endMonth = monthOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !career.endMonth }">{{
										career.endMonth || '結束月' }}</text><text class="chev">▾</text></view>
								</picker>
							</view>
						</view>
						<view class="field">
							<text class="field-label">類別</text>
							<picker mode="selector" :range="careerCategoryOptions"
								@change="e => career.category = careerCategoryOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !career.category }">{{
									career.category || '其他' }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
						<view class="field">
							<text class="field-label">公司名稱 / 說明</text>
							<textarea class="input" v-model="career.description"
								placeholder="Done program in Europe." />
						</view>
						<view class="field">
							<text class="field-label">職務</text>
							<input class="input" v-model="career.role" placeholder="Attendant" />
						</view>
					</view>
				</view>
			</scroll-view>

			<view class="bottombar">
				<view class="btn ghost" @tap="step = 2">上一步</view>
				<view class="btn primary" @tap="goNext(3)">下一步</view>
			</view>
		</template>

		<!-- ========== 畫面 4／4 — 生活能力與協助者 ========== -->
		<template v-if="step === 4">
			<view class="topbar">
				<view class="topbar-row">
					<view class="back-btn" @tap="step = 3">‹</view>
					<view>
						<view class="topbar-title">生活能力</view>
						<view class="topbar-sub">興趣 · 信仰生活 · 協助者</view>
					</view>
				</view>
				<view class="beads">
					<view class="bead on"></view>
					<view class="bead on"></view>
					<view class="bead on"></view>
					<view class="bead on"></view>
				</view>
			</view>

			<scroll-view scroll-y class="scroll-area page-scroll" style="max-width: 750rpx;box-sizing: border-box;">
				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">生活能力</text>
					</view>
					<view class="field">
						<text class="field-label">愛好 / 興趣 #1</text>
						<input class="input" v-model="form.hobby1" placeholder="Underwater photography" />
					</view>
					<view class="field">
						<text class="field-label">愛好 / 興趣 #2</text>
						<input class="input" v-model="form.hobby2" placeholder="Outdoor activities" />
					</view>
					<view class="field">
						<text class="field-label">我的信仰生活</text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.faithLife === '非常傳統' }"
								@tap="form.faithLife = '非常傳統'">非常傳統</view>
							<view class="pill" :class="{ on: form.faithLife === '有彈性' }" @tap="form.faithLife = '有彈性'">
								有彈性</view>
							<view class="pill" :class="{ on: form.faithLife === '妥協' }" @tap="form.faithLife = '妥協'">
								妥協<text class="info">?</text></view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">我希望我的配偶的信仰生活（可多選）</text>
						<view class="chipgroup">
							<view v-for="opt in ['非常傳統', '有彈性', '妥協']" :key="opt" class="chip"
								:class="{ on: form.spouseFaithLife.includes(opt) }" @tap="toggleSpouseFaith(opt)">{{ opt
								}}</view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">對對象的希望</text>
						<textarea class="input" v-model="form.partnerWish" :maxlength="30" placeholder="最多 30 個字" />
						<view class="charcount">{{ form.partnerWish.length }} / 30</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">個人狀態</text>
					</view>
					<view class="field">
						<text class="field-label">狀態</text>
						<view class="pillgroup">
							<view class="pill" v-for="opt in statusOptions" :key="opt"
								:class="{ on: form.status === opt }" @tap="form.status = opt">{{ opt }}</view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">希望參加2026年祝福式<text class="info">?</text></text>
						<view class="checkbox-row" @tap="form.wantBlessing2026 = !form.wantBlessing2026">
							<view class="box" :class="{ on: form.wantBlessing2026 }">
								<text v-if="form.wantBlessing2026" class="checkmark">✓</text>
							</view>
							<text>希望參加</text>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">分析工具</text>
					</view>
					<text class="hint" style="display:block; margin-bottom: 12px;">以下資料用於配對分析，可選填。</text>

					<view class="field">
						<text class="field-label">雙手交握<text class="info">?</text></text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.tools.hands === '右拇指' }"
								@tap="form.tools.hands = '右拇指'">右拇指</view>
							<view class="pill" :class="{ on: form.tools.hands === '左拇指' }"
								@tap="form.tools.hands = '左拇指'">左拇指</view>
						</view>
					</view>

					<view class="field">
						<text class="field-label">陰/陽<text class="info">?</text></text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.tools.yinyang === '陽' }"
								@tap="form.tools.yinyang = '陽'">陽</view>
							<view class="pill" :class="{ on: form.tools.yinyang === '陰' }"
								@tap="form.tools.yinyang = '陰'">陰</view>
						</view>
					</view>

					<view class="field">
						<text class="field-label">五要素<text class="info">?</text></text>
						<view class="pillgroup">
							<view class="pill" v-for="opt in fiveElementOptions" :key="opt"
								:class="{ on: form.tools.fiveElements === opt }" @tap="form.tools.fiveElements = opt">{{ opt }}</view>
						</view>
					</view>

					<view class="field">
						<text class="field-label">九型人格<text class="info">?</text></text>
						<view class="pillgroup">
							<view class="pill" v-for="opt in enneagramOptions" :key="opt"
								:class="{ on: form.tools.enneagram === opt }" @tap="form.tools.enneagram = opt">{{ opt }}</view>
						</view>
					</view>

					<view class="field">
						<text class="field-label">MBTI</text>
						<picker mode="selector" :range="mbtiOptions"
							@change="e => form.tools.mbti = mbtiOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.tools.mbti }">{{
								form.tools.mbti || '請選擇' }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
				</view>

				<view class="divider-note">協助者的資料</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">協助者聯絡方式</text>
					</view>
					<view class="field">
						<text class="field-label">姓名</text>
						<input class="input" v-model="form.helperName" placeholder="姓氏，名字" />
					</view>
					<view class="field">
						<text class="field-label">手機</text>
						<input class="input" type="number" v-model="form.helperMobile" placeholder="+852 — 手機號碼" />
					</view>
					<view class="field">
						<text class="field-label">電子郵件</text>
						<input class="input" v-model="form.helperEmail" placeholder="helper@example.com" />
					</view>
				</view>

				<view class="hint" style="text-align: center; margin-top: 4px;">
					<text style="color: var(--wine);"></text> 必填欄位
				</view>
			</scroll-view>

		<view class="bottombar">
			<view class="btn ghost" @tap="onExit">取消</view>
			<view class="btn primary" :class="{ disabled: submitting }" @tap="onSubmit">儲存</view>
		</view>
		</template>

	</view>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { getMyProfileApi, submitMyProfileApi } from '@/api/index.js'

// 當前步驟 1~4
const step = ref(1)
const submitting = ref(false)
const loadingProfile = ref(false)

// 全部表單字段（單文件內自足，不依賴外部 store）
const form = reactive({
	// 畫面1
	id: '',
	generation: '',
	health: '健康',
	blessingType: '第一次祝福',
	gender: '男',
	region: '',
	subRegion: '',
	country: '',
	churchName: '',
	// 畫面2
	nativeLastName: '',
	nativeFirstName: '',
	enLastName: '',
	enFirstName: '',
	calendarType: '陽曆',
	birthYear: '',
	birthMonth: '',
	birthDay: '',
	height: '',
	weight: '',
	bloodType: '',
	bloodRh: '',
	nationality: '',
	lang1Name: '',
	lang1Level: '',
	lang2Name: '',
	lang2Level: '',
	mobile: '',
	email: '',
	addressStreet: '',
	addressCountry: '',
	// 畫面3
	degreeLevel: '',
	degreeStatus: '',
	schoolName: '',
	major: '',
	occupation: '',
	companyName: '',
	qualification1: '',
	qualification2: '',
	preferredCountry1: '',
	preferredCountry2: '',
	specialCategory: '',
	specialLevel: '',
	specialNote: '',
	careers: [
		{ startYear: '', startMonth: '', endYear: '', endMonth: '', category: '', description: '', role: '' }
	],
	// 畫面4
	hobby1: '',
	hobby2: '',
	faithLife: '有彈性',
	spouseFaithLife: ['有彈性'],
	partnerWish: '',
	status: '健康',
	wantBlessing2026: false,
	tools: {
		hands: '',
		yinyang: '',
		fiveElements: '',
		enneagram: '',
		mbti: ''
	},
	helperName: '',
	helperMobile: '',
	helperEmail: ''
})

// ---- 選擇器可選項（示例數據，請替換為真實字典/接口數據）----
const generationOptions = ['祝福子女', '第一代', '第二代']
const regionOptions = ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania']
const subRegionOptions = ['Southeast Asia Region', 'East Asia Region', 'South Asia Region']
const countryOptions = ['Hong Kong', 'Taiwan', 'Japan', 'Korea', 'Singapore']
const allCountryOptions = ['所有國家', 'Hong Kong', 'Taiwan', 'Japan', 'Korea', 'Singapore']
const yearOptions = Array.from({ length: 80 }, (_, i) => `${2010 - i}`)
const monthOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}`)
const dayOptions = Array.from({ length: 31 }, (_, i) => `${i + 1}`)
const bloodTypeOptions = ['A型', 'B型', 'O型', 'AB型']
const bloodRhOptions = ['RH+', 'RH-']
const langOptions = ['英文', '日文', '韓文', '中文', '西班牙文']
const levelOptions = ['流利', '一般', '一點點']
const degreeLevelOptions = ['高中', '學院 / 大學', '碩士', '博士']
const degreeStatusOptions = ['畢業', '肄業', '就讀中']
const occupationOptions = ['受雇', '自營商', '學生', '待業']
const specialCategoryOptions = ['聽力', '視力', '行動能力', '其他']
const specialLevelOptions = ['輕度', '中度', '重度']
const careerCategoryOptions = ['全職', '兼職', '志工', '其他']
const statusOptions = ['健康', '單身', '重新祝福']
const fiveElementOptions = ['木', '火', '土', '金', '水']
const enneagramOptions = ['1: 改革型', '2: 助人型', '3: 成就型', '4: 藝術型', '5: 智慧型', '6: 忠誠型', '7: 遠見型', '8: 領導型', '9: 和平型']
const mbtiOptions = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']

// ---- 事件方法 ----
function toggleSpouseFaith(value) {
	const list = form.spouseFaithLife
	const idx = list.indexOf(value)
	if (idx > -1) {
		list.splice(idx, 1)
	} else {
		list.push(value)
	}
}

function addCareer() {
	form.careers.push({ startYear: '', startMonth: '', endYear: '', endMonth: '', category: '', description: '', role: '' })
}
function removeCareer() {
	if (form.careers.length > 1) form.careers.pop()
}

// 每一步的必填校驗，校驗通過才進入下一步
function goNext(fromStep) {
	if (fromStep === 1 && !form.id) {
		uni.showToast({ title: '請填寫 ID', icon: 'none' })
		return
	}
	if (fromStep === 2 && (!form.mobile || !form.email)) {
		uni.showToast({ title: '請填寫聯絡方式', icon: 'none' })
		return
	}
	step.value = fromStep + 1
}

function onExit() {
	uni.navigateBack()
}

// 后端字段 (snake_case) -> 前端字段 (camelCase) 的回填映射
// 注意：前端用 email，但后端存的是 contact_email；
//      前端 spouseFaithLife 多选数组，但后端存的是 JSON 字符串
const SNAKE_TO_CAMEL = {
	profile_display_id: 'id',
	generation: 'generation',
	health: 'health',
	blessing_type: 'blessingType',
	gender: 'gender',
	region: 'region',
	sub_region: 'subRegion',
	country: 'country',
	church_name: 'churchName',
	native_last_name: 'nativeLastName',
	native_first_name: 'nativeFirstName',
	en_last_name: 'enLastName',
	en_first_name: 'enFirstName',
	calendar_type: 'calendarType',
	birth_year: 'birthYear',
	birth_month: 'birthMonth',
	birth_day: 'birthDay',
	height: 'height',
	weight: 'weight',
	blood_type: 'bloodType',
	blood_rh: 'bloodRh',
	nationality: 'nationality',
	lang1_name: 'lang1Name',
	lang1_level: 'lang1Level',
	lang2_name: 'lang2Name',
	lang2_level: 'lang2Level',
	mobile: 'mobile',
	contact_email: 'email',
	address_street: 'addressStreet',
	address_country: 'addressCountry',
	degree_level: 'degreeLevel',
	degree_status: 'degreeStatus',
	school_name: 'schoolName',
	major: 'major',
	occupation: 'occupation',
	company_name: 'companyName',
	qualification1: 'qualification1',
	qualification2: 'qualification2',
	preferred_country1: 'preferredCountry1',
	preferred_country2: 'preferredCountry2',
	special_category: 'specialCategory',
	special_level: 'specialLevel',
	special_note: 'specialNote',
	hobby1: 'hobby1',
	hobby2: 'hobby2',
	faith_life: 'faithLife',
	spouse_faith_life: 'spouseFaithLife',
	partner_wish: 'partnerWish',
	helper_name: 'helperName',
	helper_mobile: 'helperMobile',
	helper_email: 'helperEmail'
}

// 回填工具：把数据库的一行 profile + careers 数组塞进 form
function fillFormWithProfile(profile, careers) {
	if (profile && typeof profile === 'object') {
		for (const [snake, value] of Object.entries(profile)) {
			const camel = SNAKE_TO_CAMEL[snake]
			if (!camel || camel === 'user_id' || camel === 'id' && snake === 'id') continue
			if (camel === 'spouseFaithLife') {
				// 后端存的是 JSON 字符串
				try { form.spouseFaithLife = value ? JSON.parse(value) : [] }
				catch (e) { form.spouseFaithLife = [] }
			} else {
				form[camel] = (value === null || value === undefined) ? '' : value
			}
		}
		// 注意上面把数据库主键 id 误填到了 form.id，这里改用 profile_display_id 映射过来的值
		form.id = profile.profile_display_id || ''
	}
	if (Array.isArray(careers)) {
		form.careers = careers.map(c => ({
			startYear: c.start_year ?? '',
			startMonth: c.start_month ?? '',
			endYear: c.end_year ?? '',
			endMonth: c.end_month ?? '',
			category: c.category ?? '',
			description: c.description ?? '',
			role: c.role ?? ''
		}))
		if (form.careers.length === 0) {
			form.careers = [
				{ startYear: '', startMonth: '', endYear: '', endMonth: '', category: '', description: '', role: '' }
			]
		}
	}
}

// 进入页面时拉取已有资料（如果有就回填，没有就保持初始空表单）
onMounted(async () => {
	loadingProfile.value = true
	try {
		const data = await getMyProfileApi()
		if (data) fillFormWithProfile(data.profile, data.careers)
	} catch (e) {
		// request 已自动 toast，这里仅兜底
		console.error('load profile error', e)
	} finally {
		loadingProfile.value = false
	}
})

// 提交前的清洗：把「沒填」的欄位統一轉成 null，而不是空字串 ''。
// 這點很重要 —— 後端有些欄位（例如出生年/月/日、身高、體重）在資料庫裡是數字類型，
// 如果直接送 '' 過去，MySQL 在嚴格模式下會直接報錯（Incorrect integer value: '' for column ...），
// 常見情境就是「只選了出生年，沒選月/日」或「身高體重沒填」。
// null 對數字/文字欄位都是合法的「空值」，可以避免這類報錯。
function sanitizeForSubmit(raw) {
	const clone = JSON.parse(JSON.stringify(raw))

	// 頂層欄位：空字串 -> null（陣列、物件、boolean 不處理）
	for (const key of Object.keys(clone)) {
		if (clone[key] === '') clone[key] = null
	}

	// tools 是巢狀物件，裡面每個欄位也是「選了才有值，沒選是空字串」，同樣處理
	if (clone.tools && typeof clone.tools === 'object') {
		for (const key of Object.keys(clone.tools)) {
			if (clone.tools[key] === '') clone.tools[key] = null
		}
	}

	// careers：每一筆的空字串欄位轉 null；如果整筆完全沒填（使用者根本沒碰過的預設空白行），
	// 就直接濾掉，不要送一筆全是 null 的事業經歷到後端
	if (Array.isArray(clone.careers)) {
		clone.careers = clone.careers
			.map(c => {
				const cleaned = {}
				for (const key of Object.keys(c)) {
					cleaned[key] = c[key] === '' ? null : c[key]
				}
				return cleaned
			})
			.filter(c => Object.values(c).some(v => v !== null))
	}

	return clone
}

// 提交保存
async function onSubmit() {
	if (submitting.value) return
	submitting.value = true
	uni.showLoading({ title: '儲存中...' })
	try {
		// 把整个 form（含 careers 数组）交给后端，后端会做 camelCase -> snake_case 映射
		// 送出之前先清洗一遍，避免未填欄位以空字串形式打到後端造成寫入報錯
		const data = await submitMyProfileApi(sanitizeForSubmit(form))
		if (data && data.profileId) {
			uni.showToast({ title: '已儲存', icon: 'success' })
			setTimeout(() => uni.navigateBack(), 600)
		} else {
			uni.showToast({ title: '已儲存', icon: 'success' })
		}
	} catch (e) {
		console.error('submit profile error', e)
	} finally {
		submitting.value = false
		uni.hideLoading()
	}
}
</script>

<style scoped>
/* ====== 顏色 / 圓角變量（對應原設計稿 :root） ====== */
.page {
	--bg: #fff6df;
	--paper: #FFFFFF;
	--ink: #2B241F;
	--ink-soft: #7A6F64;
	--ink-faint: #B4A99C;
	--wine: #fff6df;
	--wine-dark: #e6dcc4;
	--wine-soft: #fff6df;
	--gold: #e6dcc4;
	--gold-soft: #fff6df;
	--line: #E9E1D3;
	--radius: 20px;
	--radius-sm: 12px;

	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: linear-gradient(180deg, #fff6df 0%, #fff6df 100%);
	background-color: var(--bg);
	color: var(--ink);
	font-size: 14px;
}

.page-scroll {
	flex: 1;
}

/* ====== 頂部導航 ====== */
.topbar {
	padding: 10px 20px 14px;
	background: var(--bg);
}

.topbar-row {
	display: flex;
	align-items: center;
}

.back-btn {
	width: 30px;
	height: 30px;
	border-radius: 50%;
	background: var(--paper);
	border: 1px solid var(--line);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	color: var(--ink);
	margin-right: 10px;
	flex-shrink: 0;
}

.topbar-title {
	font-size: 18px;
	font-weight: 600;
	color: var(--ink);
}

.topbar-sub {
	font-size: 11px;
	color: var(--ink-faint);
	margin-top: 2px;
}

.beads {
	display: flex;
	margin-top: 12px;
	padding-left: 2px;
}

.bead {
	width: 26px;
	height: 5px;
	border-radius: 3px;
	background: var(--line);
	margin-right: 6px;
}

.bead.on {
	background: linear-gradient(90deg, var(--gold), var(--wine));
}

/* ====== 卡片 / 表單項 ====== */
.scroll-area {
	padding: 6px 18px 28px;
}

.card {
	background: var(--paper);
	border-radius: var(--radius);
	padding: 18px 16px 20px;
	margin-bottom: 14px;
	border: 1px solid var(--line);
}

.card-head {
	display: flex;
	align-items: center;
	margin-bottom: 14px;
}

.card-head .mark {
	width: 7px;
	height: 7px;
	transform: rotate(45deg);
	background: var(--gold);
	margin-right: 8px;
	flex-shrink: 0;
}

.card-head .card-title {
	font-size: 15px;
	font-weight: 600;
	color: var(--ink);
	letter-spacing: 0.02em;
}

.card-head .req {
	font-size: 10px;
	color: var(--wine);
	margin-left: auto;
	background: var(--wine-soft);
	padding: 3px 8px;
	border-radius: 8px;
	font-weight: 600;
}

.field {
	margin-bottom: 14px;
}

.field:last-child {
	margin-bottom: 0;
}

.field-label {
	display: block;
	font-size: 12px;
	color: var(--ink-soft);
	margin-bottom: 6px;
	font-weight: 500;
}

.field-label .star {
	color: var(--wine);
	margin-left: 2px;
}

.input,
.select-row {
	width: 100%;
	height: 80rpx;
	box-sizing: border-box;
	border: 1px solid var(--line);
	background: #FDFCFA;
	border-radius: var(--radius-sm);
	padding: 11px 12px;
	font-size: 14px;
	color: var(--ink);
}

.select-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.select-row .placeholder {
	color: var(--ink-faint);
}

.select-row .chev {
	color: var(--ink-faint);
	font-size: 11px;
	margin-left: 6px;
}

.row2 {
	display: flex;
	gap: 10px;
}

/* .row2 > * { flex: 1; min-width: 0; } */
.row3 {
	display: flex;
	gap: 8px;
}

/* .row3 > * { flex: 1; min-width: 0; } */

textarea.input {
	height: 64px;
	line-height: 1.5;
	width: 100%;
}

.charcount {
	text-align: right;
	font-size: 10px;
	color: var(--ink-faint);
	margin-top: 4px;
}

/* ====== 藥丸單選 / 標籤多選 ====== */
.pillgroup {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.pill {
	padding: 9px 16px;
	border-radius: 999px;
	border: 1px solid var(--line);
	font-size: 13px;
	color: var(--ink-soft);
	background: #FDFCFA;
}

.pill.on {
	background: var(--wine);
	border-color: var(--wine);
	color: #fff;
	font-weight: 600;
}

.info {
	display: inline-flex;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: var(--gold-soft);
	color: var(--gold);
	align-items: center;
	justify-content: center;
	font-size: 9px;
	margin-left: 5px;
}

.checkbox-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.box {
	width: 20px;
	height: 20px;
	border-radius: 6px;
	border: 1.5px solid var(--line);
	background: #FDFCFA;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.box.on {
	background: var(--wine);
	border-color: var(--wine);
}

.checkmark {
	color: #fff;
	font-size: 12px;
	line-height: 1;
}

.chipgroup {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.chip {
	padding: 8px 13px;
	border-radius: var(--radius-sm);
	border: 1px solid var(--line);
	font-size: 12px;
	color: var(--ink-soft);
	background: #FDFCFA;
}

.chip.on {
	background: var(--gold-soft);
	border-color: var(--gold);
	color: var(--wine-dark);
	font-weight: 600;
}

/* ====== 其它區塊 ====== */
.helperbox {
	background: var(--wine-soft);
	border-radius: var(--radius-sm);
	padding: 12px 13px;
	font-size: 12px;
	color: var(--wine-dark);
	line-height: 1.6;
	margin-bottom: 14px;
}

.divider-note {
	font-size: 13px;
	color: var(--gold);
	text-align: center;
	margin: 6px 0 16px;
	display: flex;
	align-items: center;
}

.divider-note::before,
.divider-note::after {
	content: '';
	flex: 1;
	height: 1px;
	background: var(--line);
}

.divider-note::before {
	margin-right: 10px;
}

.divider-note::after {
	margin-left: 10px;
}

.addrow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 14px;
}

.mini-btn {
	font-size: 11px;
	padding: 6px 11px;
	border-radius: 999px;
	border: 1px solid var(--line);
	color: var(--ink-soft);
	background: #FDFCFA;
	font-weight: 600;
	margin-left: 6px;
	display: inline-block;
}

.mini-btn.add {
	color: #fff6df;
	border-color: #fff6df;
	background: #fff6df;
}

.career-block {
	padding-top: 6px;
}

.hint {
	font-size: 11px;
	color: var(--ink-faint);
	margin-top: 5px;
}

/* ====== 底部操作欄 ====== */
.bottombar {
	padding: 12px 18px calc(env(safe-area-inset-bottom) + 12px);
	background: var(--bg);
	border-top: 1px solid var(--line);
	display: flex;
	gap: 10px;
	align-items: center;
}

.btn {
	flex: 1;
	text-align: center;
	padding: 13px 0;
	border-radius: 999px;
	font-size: 14px;
	font-weight: 700;
}

.btn.primary {
	background: linear-gradient(135deg, #fff6df, #e6dcc4);
	color: #333333;
}

.btn.primary.disabled {
	opacity: 0.6;
}

.btn.ghost {
	background: transparent;
	color: var(--ink-soft);
	border: 1px solid var(--line);
}
</style>