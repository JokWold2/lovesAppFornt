<template>
	<view class="page app-h5-min-screen">

		<!-- ========== 畫面 1／4 — 基本資料 ========== -->
		<template v-if="step === 1">
			<view class="topbar">
				<view class="topbar-row">
					<view class="back-btn" @tap="onExit">‹</view>
					<view>
						<view class="topbar-title">{{ t('profile.personalInfo') }}</view>
						<view class="topbar-sub">{{ t('profile.completeRequired') }}</view>
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
						<view class="mark"></view><text class="card-title">{{ t('profile.basicInfo') }}</text><text class="req">{{ t('profile.required') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.idLabel') }}<text class="star"></text></text>
						<input class="input" v-model="form.id" :placeholder="t('profile.myFile.idPlaceholder')" />
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.mainSection') }}</text><text class="req">{{ t('profile.required') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.generation') }}</text>
						<picker mode="selector" :range="optionList('generation', generationOptions)"
							@change="e => form.generation = generationOptions[e.detail.value]">
							<view class="select-row">
								<text :class="{ placeholder: !form.generation }">{{ form.generation || t('profile.myFile.select') }}</text>
								<text class="chev">▾</text>
							</view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.health') }}</text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.health === '健康' }" @tap="form.health = '健康'">{{ optionLabel('health', '健康') }}</view>
							<view class="pill" :class="{ on: form.health === '特殊需求' }" @tap="form.health = '特殊需求'">
								{{ optionLabel('health', '特殊需求') }}<text class="info">?</text></view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.blessing') }}</text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.blessingType === '第一次祝福' }"
								@tap="form.blessingType = '第一次祝福'">{{ optionLabel('blessingType', '第一次祝福') }}</view>
							<view class="pill" :class="{ on: form.blessingType === '重新祝福' }"
								@tap="form.blessingType = '重新祝福'">{{ optionLabel('blessingType', '重新祝福') }}</view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.gender') }}</text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.gender === '男' }" @tap="form.gender = '男'">{{ optionLabel('gender', '男') }}</view>
							<view class="pill" :class="{ on: form.gender === '女' }" @tap="form.gender = '女'">{{ optionLabel('gender', '女') }}</view>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.churchSection') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.region') }}</text>
						<picker mode="selector" :range="optionList('region', regionOptions)"
							@change="e => form.region = regionOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.region }">{{ form.region ? optionLabel('region', form.region) :
									t('profile.myFile.select') }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.subRegionLabel') }}</text>
						<picker mode="selector" :range="optionList('subRegion', subRegionOptions)"
							@change="e => form.subRegion = subRegionOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.subRegion }">{{ form.subRegion
									? optionLabel('subRegion', form.subRegion) : t('profile.myFile.select') }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.country') }}</text>
						<picker mode="selector" :range="optionList('country', countryOptions)"
							@change="e => form.country = countryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.country }">{{ form.country ? optionLabel('country', form.country) :
									t('profile.myFile.select') }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.churchLabel') }}</text>
						<input class="input" v-model="form.churchName" :placeholder="t('profile.myFile.churchPlaceholder')" />
					</view>
				</view>
			</scroll-view>

			<view class="bottombar">
				<view class="btn ghost" @tap="onExit">{{ t('messages.common.cancel') }}</view>
				<view class="btn primary" @tap="goNext(1)">{{ t('profile.myFile.nextStep') }}</view>
			</view>
		</template>

		<!-- ========== 畫面 2／4 — 個人資料 ========== -->
		<template v-if="step === 2">
			<view class="topbar">
				<view class="topbar-row">
					<view class="back-btn" @tap="step = 1">‹</view>
					<view>
						<view class="topbar-title">{{ t('profile.personalInfo') }}</view>
						<view class="topbar-sub">{{ t('profile.myFile.step2Sub') }}</view>
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
						<view class="mark"></view><text class="card-title">{{ t('profile.name') }}</text><text class="req">{{ t('profile.required') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.nativeName') }}</text>
						<view class="row2">
							<input class="input" v-model="form.nativeLastName" :placeholder="t('profile.myFile.nativeLastNamePlaceholder')" />
							<input class="input" v-model="form.nativeFirstName" :placeholder="t('profile.myFile.nativeFirstNamePlaceholder')" />
						</view>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.englishName') }}</text>
						<view class="row2">
							<input class="input" v-model="form.enLastName" :placeholder="t('profile.myFile.enLastNamePlaceholder')" />
							<input class="input" v-model="form.enFirstName" :placeholder="t('profile.myFile.enFirstNamePlaceholder')" />
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.birthBodyTitle') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.birthDate') }}</text>
						<view class="pillgroup" style="margin-bottom: 8px;">
							<view class="pill" :class="{ on: form.calendarType === '陽曆' }"
								@tap="form.calendarType = '陽曆'">{{ optionLabel('calendarType', '陽曆') }}</view>
							<view class="pill" :class="{ on: form.calendarType === '陰曆' }"
								@tap="form.calendarType = '陰曆'">{{ optionLabel('calendarType', '陰曆') }}</view>
						</view>
						<view class="row3">
							<picker mode="selector" :range="yearOptions"
								@change="e => form.birthYear = yearOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.birthYear }">{{
									form.birthYear || t('profile.myFile.yearPlaceholder') }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="monthOptions"
								@change="e => form.birthMonth = monthOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.birthMonth }">{{
									form.birthMonth || t('profile.myFile.monthPlaceholder') }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="dayOptions"
								@change="e => form.birthDay = dayOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.birthDay }">{{ form.birthDay
											|| t('profile.myFile.dayPlaceholder') }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
					</view>
					<view class="row2">
						<view class="field">
							<text class="field-label">{{ t('profile.height') }}</text>
							<input class="input" type="number" v-model="form.height" placeholder="170" />
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.weight') }}</text>
							<input class="input" type="number" v-model="form.weight" placeholder="67" />
						</view>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.bloodType') }}</text>
						<view class="row2">
							<picker mode="selector" :range="optionList('bloodType', bloodTypeOptions)"
								@change="e => form.bloodType = bloodTypeOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.bloodType }">{{
									pickerDisplay('bloodType', form.bloodType) }}</text><text class="chev">▾</text></view>
							</picker>
							<picker mode="selector" :range="bloodRhOptions"
								@change="e => form.bloodRh = bloodRhOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.bloodRh }">{{ pickerDisplay('bloodRh', form.bloodRh) }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
					</view>
				</view>

					<view class="card">
						<view class="card-head">
							<view class="mark"></view><text class="card-title">{{ t('profile.myFile.nationalityLanguageTitle') }}</text>
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.nationality') }}</text>
							<picker mode="selector" :range="optionList('country', countryOptions)"
								@change="e => form.nationality = countryOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.nationality }">{{
									form.nationality ? optionLabel('country', form.nationality) : t('profile.myFile.defaultCountry') }}</text><text class="chev">▾</text></view>
							</picker>
						</view>
							<view class="field">
								<text class="field-label">{{ t('profile.language1') }}</text>
								<view class="row2">
									<picker mode="selector" :range="optionList('lang', langOptions)"
										@change="e => form.lang1Name = langOptions[e.detail.value]">
										<view class="select-row"><text :class="{ placeholder: !form.lang1Name }">{{ pickerDisplay('lang', form.lang1Name) }}</text><text class="chev">▾</text></view>
								</picker>
								<picker mode="selector" :range="optionList('level', levelOptions)"
									@change="e => form.lang1Level = levelOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !form.lang1Level }">{{ pickerDisplay('level', form.lang1Level) }}</text><text class="chev">▾</text></view>
								</picker>
							</view>
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.language2') }}</text>
						<view class="row2">
								<picker mode="selector" :range="optionList('lang', langOptions)"
									@change="e => form.lang2Name = langOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !form.lang2Name }">{{ pickerDisplay('lang', form.lang2Name) }}</text><text class="chev">▾</text></view>
								</picker>
								<picker mode="selector" :range="optionList('level', levelOptions)"
									@change="e => form.lang2Level = levelOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !form.lang2Level }">{{ pickerDisplay('level', form.lang2Level) }}</text><text class="chev">▾</text></view>
								</picker>
							</view>
						</view>
					</view>

					<view class="card">
						<view class="card-head">
							<view class="mark"></view><text class="card-title">{{ t('profile.myFile.contactTitle') }}</text><text class="req">{{ t('profile.required') }}</text>
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.phone') }}</text>
							<input class="input" type="number" v-model="form.mobile" :placeholder="t('profile.myFile.mobilePlaceholder')" />
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.email') }}</text>
							<input class="input" v-model="form.email" :placeholder="t('profile.myFile.emailPlaceholder')" />
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.myFile.addressLabel') }}</text>
							<input class="input" style="margin-bottom: 8px;" v-model="form.addressStreet"
								:placeholder="t('profile.myFile.addressStreetPlaceholder')" />
							<input class="input" v-model="form.addressCountry" :placeholder="t('profile.myFile.addressCountryPlaceholder')" />
						</view>
					</view>
				</scroll-view>

				<view class="bottombar">
					<view class="btn ghost" @tap="step = 1">{{ t('messages.common.cancel') }}</view>
					<view class="btn primary" @tap="goNext(2)">{{ t('profile.myFile.nextStep') }}</view>
				</view>
			</template>

		<!-- ========== 畫面 3／4 — 學經歷與資格 ========== -->
		<template v-if="step === 3">
			<view class="topbar">
				<view class="topbar-row">
					<view class="back-btn" @tap="step = 2">‹</view>
					<view>
						<view class="topbar-title">{{ t('profile.myFile.step3Title') }}</view>
						<view class="topbar-sub">{{ t('profile.myFile.step3Sub') }}</view>
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
				<view class="helperbox">{{ t('profile.myFile.helperNote') }}</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.education') }}</text>
					</view>
						<view class="field">
							<text class="field-label">{{ t('profile.degree') }}</text>
							<view class="row2">
						<picker mode="selector" :range="optionList('degreeLevel', degreeLevelOptions)"
							@change="e => form.degreeLevel = degreeLevelOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.degreeLevel }">{{
								pickerDisplay('degreeLevel', form.degreeLevel) }}</text><text class="chev">▾</text></view>
							</picker>
						<picker mode="selector" :range="optionList('degreeStatus', degreeStatusOptions)"
							@change="e => form.degreeStatus = degreeStatusOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !form.degreeStatus }">{{
										pickerDisplay('degreeStatus', form.degreeStatus) }}</text><text class="chev">▾</text></view>
								</picker>
							</view>
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.school') }}</text>
							<input class="input" v-model="form.schoolName" :placeholder="t('profile.myFile.schoolPlaceholder')" />
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.major') }}</text>
							<input class="input" v-model="form.major" :placeholder="t('profile.myFile.majorPlaceholder')" />
						</view>
					</view>

							<view class="card">
						<view class="card-head">
								<view class="mark"></view><text class="card-title">{{ t('profile.myFile.employmentOpportunityTitle') }}</text>
							</view>
						<view class="field">
							<text class="field-label">{{ t('profile.occupation') }}</text>
						<picker mode="selector" :range="optionList('occupation', occupationOptions)"
							@change="e => form.occupation = occupationOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.occupation }">{{ pickerDisplay('occupation', form.occupation) }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.company') }}</text>
						<input class="input" v-model="form.companyName" :placeholder="t('profile.myFile.companyPlaceholder')" />
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.qualificationTitle') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.qualification1Label') }}</text>
						<input class="input" v-model="form.qualification1" :placeholder="t('profile.myFile.qualification1Placeholder')" />
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.qualification2Label') }}</text>
						<input class="input" v-model="form.qualification2" :placeholder="t('profile.myFile.notFilledPlaceholder')" />
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.preferredCountryTitle') }}</text><text class="req">{{ t('profile.required') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.preferredCountryFirstLabel') }}</text>
					<picker mode="selector" :range="optionList('allCountry', allCountryOptions)"
						@change="e => form.preferredCountry1 = allCountryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.preferredCountry1 }">{{
								form.preferredCountry1 ? optionLabel('allCountry', form.preferredCountry1) : t('profile.myFile.allCountriesLabel') }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.preferredCountrySecondLabel') }}</text>
						<picker mode="selector" :range="optionList('allCountry', allCountryOptions)"
							@change="e => form.preferredCountry2 = allCountryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.preferredCountry2 }">{{
								form.preferredCountry2 ? optionLabel('allCountry', form.preferredCountry2) : t('profile.myFile.allCountriesLabel') }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.specialNeedTitle') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.special') }}</text>
						<picker mode="selector" :range="optionList('specialCategory', specialCategoryOptions)"
							@change="e => form.specialCategory = specialCategoryOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.specialCategory }">{{
								pickerDisplay('specialCategory', form.specialCategory) }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.specialAbility') }}<text class="info">?</text></text>
						<picker mode="selector" :range="optionList('specialLevel', specialLevelOptions)"
							@change="e => form.specialLevel = specialLevelOptions[e.detail.value]">
							<view class="select-row"><text :class="{ placeholder: !form.specialLevel }">{{
								pickerDisplay('specialLevel', form.specialLevel) }}</text><text class="chev">▾</text></view>
						</picker>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.notesLabel') }}</text>
						<textarea class="input" v-model="form.specialNote" :maxlength="30" :placeholder="t('profile.myFile.notesPlaceholder')" />
						<view class="charcount">{{ form.specialNote.length }} / 30</view>
					</view>
				</view>

				<view class="card">
					<view class="addrow">
						<view class="card-head" style="margin-bottom: 0;">
							<view class="mark"></view><text class="card-title">{{ t('profile.myFile.careerTitle') }}</text>
						</view>
						<view style="display: flex;">
							<view class="mini-btn add" @tap="addCareer">{{ t('messages.common.add') }}</view>
							<view class="mini-btn" @tap="removeCareer">{{ t('messages.common.remove') }}</view>
						</view>
					</view>

						<view v-for="(career, index) in form.careers" :key="index" class="career-block">
							<view class="field">
								<text class="field-label">{{ t('profile.myFile.periodLabel') }}</text>
								<view class="row2">
									<picker mode="selector" :range="yearOptions"
										@change="e => career.startYear = yearOptions[e.detail.value]">
										<view class="select-row"><text :class="{ placeholder: !career.startYear }">{{
											career.startYear || t('profile.myFile.startYearPlaceholder') }}</text><text class="chev">▾</text></view>
									</picker>
									<picker mode="selector" :range="monthOptions"
										@change="e => career.startMonth = monthOptions[e.detail.value]">
										<view class="select-row"><text :class="{ placeholder: !career.startMonth }">{{
											career.startMonth || t('profile.myFile.startMonthPlaceholder') }}</text><text class="chev">▾</text></view>
									</picker>
								</view>
								<view class="row2" style="margin-top: 8px;">
									<picker mode="selector" :range="yearOptions"
										@change="e => career.endYear = yearOptions[e.detail.value]">
										<view class="select-row"><text :class="{ placeholder: !career.endYear }">{{
											career.endYear || t('profile.myFile.endYearPlaceholder') }}</text><text class="chev">▾</text></view>
									</picker>
									<picker mode="selector" :range="monthOptions"
										@change="e => career.endMonth = monthOptions[e.detail.value]">
										<view class="select-row"><text :class="{ placeholder: !career.endMonth }">{{
											career.endMonth || t('profile.myFile.endMonthPlaceholder') }}</text><text class="chev">▾</text></view>
									</picker>
								</view>
						</view>
						<view class="field">
							<text class="field-label">{{ t('profile.myFile.categoryLabel') }}</text>
								<picker mode="selector" :range="optionList('careerCategory', careerCategoryOptions)"
									@change="e => career.category = careerCategoryOptions[e.detail.value]">
									<view class="select-row"><text :class="{ placeholder: !career.category }">{{
										career.category ? pickerDisplay('careerCategory', career.category) : t('profile.myFile.otherLabel') }}</text><text class="chev">▾</text></view>
								</picker>
							</view>
							<view class="field">
								<text class="field-label">{{ t('profile.myFile.companyDescriptionLabel') }}</text>
								<textarea class="input" v-model="career.description"
									:placeholder="t('profile.myFile.companyDescriptionPlaceholder')" />
							</view>
							<view class="field">
								<text class="field-label">{{ t('profile.myFile.roleLabel') }}</text>
								<input class="input" v-model="career.role" :placeholder="t('profile.myFile.rolePlaceholder')" />
							</view>
						</view>
					</view>
				</scroll-view>

				<view class="bottombar">
					<view class="btn ghost" @tap="step = 2">{{ t('profile.myFile.previousStep') }}</view>
					<view class="btn primary" @tap="goNext(3)">{{ t('profile.myFile.nextStep') }}</view>
				</view>
			</template>

		<!-- ========== 畫面 4／4 — 生活能力與協助者 ========== -->
		<template v-if="step === 4">
			<view class="topbar">
				<view class="topbar-row">
					<view class="back-btn" @tap="step = 3">‹</view>
					<view>
						<view class="topbar-title">{{ t('profile.myFile.step4Title') }}</view>
						<view class="topbar-sub">{{ t('profile.myFile.step4Sub') }}</view>
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
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.lifeAbilityTitle') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.hobby1Label') }}</text>
						<input class="input" v-model="form.hobby1" :placeholder="t('profile.myFile.hobby1Placeholder')" />
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.hobby2Label') }}</text>
						<input class="input" v-model="form.hobby2" :placeholder="t('profile.myFile.hobby2Placeholder')" />
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.myFaithLifeLabel') }}</text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.faithLife === '非常傳統' }"
								@tap="form.faithLife = '非常傳統'">{{ optionLabel('faithLife', '非常傳統') }}</view>
							<view class="pill" :class="{ on: form.faithLife === '有彈性' }" @tap="form.faithLife = '有彈性'">
								{{ optionLabel('faithLife', '有彈性') }}</view>
							<view class="pill" :class="{ on: form.faithLife === '妥協' }" @tap="form.faithLife = '妥協'">
								{{ optionLabel('faithLife', '妥協') }}<text class="info">?</text></view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.spouseFaithLifeLabel') }}</text>
						<view class="chipgroup">
							<view v-for="opt in spouseFaithOptions" :key="opt" class="chip"
								:class="{ on: form.spouseFaithLife.includes(opt) }" @tap="toggleSpouseFaith(opt)">{{
									optionLabel('faithLife', opt) }}</view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.partnerExpectationLabel') }}</text>
						<textarea class="input" v-model="form.partnerWish" :maxlength="30"
							:placeholder="t('profile.myFile.partnerExpectationPlaceholder')" />
						<view class="charcount">{{ form.partnerWish.length }} / 30</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.personalStatusTitle') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.statusLabel') }}</text>
						<view class="pillgroup">
							<view class="pill" v-for="opt in statusOptions" :key="opt"
									:class="{ on: form.status === opt }" @tap="form.status = opt">{{ optionLabel('status', opt) }}</view>
						</view>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.wishBlessing2026Label') }}<text class="info">?</text></text>
						<view class="checkbox-row" @tap="form.wantBlessing2026 = !form.wantBlessing2026">
							<view class="box" :class="{ on: form.wantBlessing2026 }">
								<text v-if="form.wantBlessing2026" class="checkmark">✓</text>
							</view>
							<text>{{ t('profile.myFile.wishParticipateLabel') }}</text>
						</view>
					</view>
				</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.analysisToolsTitle') }}</text>
					</view>
					<text class="hint" style="display:block; margin-bottom: 12px;">{{ t('profile.myFile.analysisToolsHint') }}</text>

					<view class="field">
						<text class="field-label">{{ t('profile.myFile.handsLabel') }}<text class="info">?</text></text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.tools.hands === '右拇指' }"
								@tap="form.tools.hands = '右拇指'">{{ optionLabel('hands', '右拇指') }}</view>
							<view class="pill" :class="{ on: form.tools.hands === '左拇指' }"
								@tap="form.tools.hands = '左拇指'">{{ optionLabel('hands', '左拇指') }}</view>
						</view>
					</view>

					<view class="field">
						<text class="field-label">{{ t('profile.myFile.yinYangLabel') }}<text class="info">?</text></text>
						<view class="pillgroup">
							<view class="pill" :class="{ on: form.tools.yinyang === '陽' }"
								@tap="form.tools.yinyang = '陽'">{{ optionLabel('yinyang', '陽') }}</view>
							<view class="pill" :class="{ on: form.tools.yinyang === '陰' }"
								@tap="form.tools.yinyang = '陰'">{{ optionLabel('yinyang', '陰') }}</view>
						</view>
					</view>

					<view class="field">
						<text class="field-label">{{ t('profile.myFile.fiveElementsLabel') }}<text class="info">?</text></text>
						<view class="pillgroup">
							<view class="pill" v-for="opt in fiveElementOptions" :key="opt"
								:class="{ on: form.tools.fiveElements === opt }"
								@tap="form.tools.fiveElements = opt">{{ optionLabel('fiveElements', opt) }}</view>
						</view>
					</view>

					<view class="field">
						<text class="field-label">{{ t('profile.myFile.enneagramLabel') }}<text class="info">?</text></text>
						<view class="pillgroup">
							<view class="pill" v-for="opt in enneagramOptions" :key="opt"
								:class="{ on: form.tools.enneagram === opt }"
								@tap="form.tools.enneagram = opt">{{ optionLabel('enneagram', opt) }}</view>
						</view>
					</view>

					<view class="field">
						<text class="field-label">MBTI</text>
						<picker mode="selector" :range="mbtiOptions"
							@change="e => form.tools.mbti = mbtiOptions[e.detail.value]">
								<view class="select-row"><text :class="{ placeholder: !form.tools.mbti }">{{
									form.tools.mbti || t('profile.myFile.select') }}</text><text class="chev">▾</text></view>
								</picker>
							</view>
						</view>

				<view class="divider-note">{{ t('profile.myFile.helperInfoTitle') }}</view>

				<view class="card">
					<view class="card-head">
						<view class="mark"></view><text class="card-title">{{ t('profile.myFile.helperContactTitle') }}</text>
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.helperNameLabel') }}</text>
						<input class="input" v-model="form.helperName" :placeholder="t('profile.myFile.helperNamePlaceholder')" />
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.helperMobileLabel') }}</text>
						<input class="input" type="number" v-model="form.helperMobile"
							:placeholder="t('profile.myFile.helperMobilePlaceholder')" />
					</view>
					<view class="field">
						<text class="field-label">{{ t('profile.myFile.helperEmailLabel') }}</text>
						<input class="input" v-model="form.helperEmail" :placeholder="t('profile.myFile.helperEmailPlaceholder')" />
					</view>
				</view>

				<view class="hint" style="text-align: center; margin-top: 4px;">
						<text style="color: var(--wine);"></text> {{ t('profile.required') }}
				</view>
			</scroll-view>

		<view class="bottombar">
			<view class="btn ghost" @tap="onExit">{{ t('messages.common.cancel') }}</view>
			<view class="btn primary" :class="{ disabled: submitting }" @tap="onSubmit">{{ t('messages.common.save') }}</view>
		</view>
		</template>

	</view>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { getMyProfileApi, submitMyProfileApi } from '@/api/index.js'
import { t } from '@/utils/localeRuntime.js'

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
const spouseFaithOptions = ['非常傳統', '有彈性', '妥協']
const optionLabelMap = computed(() => ({
	generation: {
		'祝福子女': t('profile.options.generation.blessing'),
		第一代: t('profile.options.generation.firstGen'),
		第二代: t('profile.options.generation.secondGen')
	},
	health: {
		健康: t('profile.options.health.healthy'),
		特殊需求: t('profile.options.health.specialNeed')
	},
	blessingType: {
		第一次祝福: t('profile.options.blessingType.first'),
		重新祝福: t('profile.options.blessingType.again')
	},
	gender: {
		男: t('profile.options.gender.male'),
		女: t('profile.options.gender.female')
	},
	calendarType: {
		陽曆: t('profile.options.calendarType.solar'),
		陰曆: t('profile.options.calendarType.lunar')
	},
	lang: {
		英文: t('profile.options.language.english'),
		日文: t('profile.options.language.japanese'),
		韓文: t('profile.options.language.korean'),
		中文: t('profile.options.language.chinese'),
		西班牙文: t('profile.options.language.spanish')
	},
	level: {
		流利: t('profile.options.level.fluent'),
		一般: t('profile.options.level.fair'),
		一點點: t('profile.options.level.basic')
	},
	degreeLevel: {
		高中: t('profile.options.degreeLevel.highSchool'),
		'學院 / 大學': t('profile.options.degreeLevel.college'),
		碩士: t('profile.options.degreeLevel.master'),
		博士: t('profile.options.degreeLevel.doctor')
	},
	degreeStatus: {
		畢業: t('profile.options.degreeStatus.graduated'),
		肄業: t('profile.options.degreeStatus.interrupted'),
		就讀中: t('profile.options.degreeStatus.inSchool')
	},
	occupation: {
		受雇: t('profile.options.occupation.employee'),
		自營商: t('profile.options.occupation.selfEmployed'),
		學生: t('profile.options.occupation.student'),
		待業: t('profile.options.occupation.unemployed')
	},
	specialCategory: {
		聽力: t('profile.options.specialCategory.hearing'),
		視力: t('profile.options.specialCategory.vision'),
		行動能力: t('profile.options.specialCategory.mobility'),
		其他: t('profile.options.specialCategory.other')
	},
	specialLevel: {
		輕度: t('profile.options.specialLevel.mild'),
		中度: t('profile.options.specialLevel.moderate'),
		重度: t('profile.options.specialLevel.severe')
	},
	careerCategory: {
		全職: t('profile.options.careerCategory.fullTime'),
		兼職: t('profile.options.careerCategory.partTime'),
		志工: t('profile.options.careerCategory.volunteer'),
		其他: t('profile.options.careerCategory.other')
	},
	status: {
			健康: t('profile.options.status.healthy'),
			單身: t('profile.options.status.single'),
			重新祝福: t('profile.options.blessingType.again')
	},
	allCountry: {
		所有國家: t('profile.myFile.allCountriesLabel'),
		'Hong Kong': t('profile.options.country.hongKong'),
		Taiwan: t('profile.options.country.taiwan'),
		Japan: t('profile.options.country.japan'),
		Korea: t('profile.options.country.korea'),
		Singapore: t('profile.options.country.singapore')
	},
	region: {
		Asia: t('profile.options.region.asia'),
		Europe: t('profile.options.region.europe'),
		Americas: t('profile.options.region.americas'),
		Africa: t('profile.options.region.africa'),
		Oceania: t('profile.options.region.oceania')
	},
	subRegion: {
		'Southeast Asia Region': t('profile.options.subRegion.southeastAsia'),
		'East Asia Region': t('profile.options.subRegion.eastAsia'),
		'South Asia Region': t('profile.options.subRegion.southAsia')
	},
	country: {
		'Hong Kong': t('profile.options.country.hongKong'),
		Taiwan: t('profile.options.country.taiwan'),
		Japan: t('profile.options.country.japan'),
		Korea: t('profile.options.country.korea'),
		Singapore: t('profile.options.country.singapore')
	},
	bloodType: {
		A型: t('profile.options.bloodType.a'),
		B型: t('profile.options.bloodType.b'),
		O型: t('profile.options.bloodType.o'),
		AB型: t('profile.options.bloodType.ab')
	},
	faithLife: {
			非常傳統: t('profile.options.faithLife.veryTraditional'),
			有彈性: t('profile.options.faithLife.flexible'),
			妥協: t('profile.options.faithLife.compromise')
	},
	hands: {
		右拇指: t('profile.options.hands.rightThumb'),
		左拇指: t('profile.options.hands.leftThumb')
	},
	yinyang: {
		陽: t('profile.options.yinYang.yang'),
		陰: t('profile.options.yinYang.yin')
	},
	fiveElements: {
		木: t('profile.options.fiveElements.wood'),
		火: t('profile.options.fiveElements.fire'),
		土: t('profile.options.fiveElements.earth'),
		金: t('profile.options.fiveElements.metal'),
		水: t('profile.options.fiveElements.water')
	},
	enneagram: {
		'1: 改革型': t('profile.options.enneagram.1'),
		'2: 助人型': t('profile.options.enneagram.2'),
		'3: 成就型': t('profile.options.enneagram.3'),
		'4: 藝術型': t('profile.options.enneagram.4'),
		'5: 智慧型': t('profile.options.enneagram.5'),
		'6: 忠誠型': t('profile.options.enneagram.6'),
		'7: 遠見型': t('profile.options.enneagram.7'),
		'8: 領導型': t('profile.options.enneagram.8'),
		'9: 和平型': t('profile.options.enneagram.9')
	}
}))

function optionLabel(category, rawValue) {
	if (!rawValue) return rawValue
	const map = optionLabelMap.value[category]
	return map?.[rawValue] || rawValue
}

function optionList(category, rawOptions = []) {
	return rawOptions.map((value) => optionLabel(category, value))
}

function pickerDisplay(category, rawValue) {
	return rawValue ? optionLabel(category, rawValue) : t('profile.myFile.select')
}

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
		uni.showToast({ title: t('profile.myFile.fillIdError'), icon: 'none' })
		return
	}
	if (fromStep === 2 && (!form.mobile || !form.email)) {
		uni.showToast({ title: t('profile.myFile.fillContactError'), icon: 'none' })
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
	uni.showLoading({ title: t('messages.common.saving') })
	try {
		// 把整个 form（含 careers 数组）交给后端，后端会做 camelCase -> snake_case 映射
		// 送出之前先清洗一遍，避免未填欄位以空字串形式打到後端造成寫入報錯
		const data = await submitMyProfileApi(sanitizeForSubmit(form))
		if (data && data.profileId) {
			uni.showToast({ title: t('messages.common.saved'), icon: 'success' })
			setTimeout(() => uni.navigateBack(), 600)
		} else {
			uni.showToast({ title: t('messages.common.saved'), icon: 'success' })
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
