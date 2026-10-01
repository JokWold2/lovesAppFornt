<template>
  <view class="auth-page" :class="{ 'auth-register': !isLoginView, 'auth-login': isLoginView, 'auth-phone': isPhoneView }">
    <view v-if="restoringSession" class="session-restoring-mask"><text>{{ t('auth.restoring') }}</text></view>
    <view class="auth-nav" :style="navStyle">
      <view class="nav-row" :style="{ paddingTop: geometry.contentTop + 'px', paddingRight: geometry.contentRight + 'px' }">
        <button v-if="!isLoginView || isPhoneView" class="back-button" hover-class="control-pressed" @click="handleBack" :aria-label="t('blessAuth.back')"><uni-icons type="left" size="24" color="#615c54" /></button>
        <text class="region-label">{{ isPhoneView ? selectedCountryName : t('auth.country') }}</text>
      </view>
    </view>
    <view class="auth-shell">
      <view class="brand-hero" :style="{ paddingTop: navHeight + 'px' }">
        <image class="brand-art" src="/static/auth/bless-heart.jpg" mode="aspectFill" />
        <view class="brand-copy">
          <text class="brand-name">BLESS</text>
          <text class="brand-tagline" :class="{ 'tagline-long': ['en', 'ru'].includes(currentLocale) }">{{ t('blessAuth.tagline') }}</text>
        </view>
      </view>
      <view class="auth-sheet">
        <view class="sheet-heading">
          <text class="page-title">{{ isPhoneView ? t('phoneAuth.title') : (isLoginView ? t('auth.loginTitle') : t('auth.registerTitle')) }}</text>
          <button v-if="isLoginView && !isPhoneView" class="text-button register-link" @click="switchView(false)">{{ t('auth.registerLink') }}</button>
        </view>
        <view v-if="isPhoneView" class="form-content phone-form">
          <text class="phone-subtitle">{{ t('phoneAuth.subtitle') }}</text>
          <view class="input-row phone-number-row">
            <button class="country-code-button" hover-class="control-pressed" :aria-label="t('phoneAuth.selectCountry')" @click="openCountryPicker"><text>{{ selectedCountry?.dialCode || '+86' }}</text><uni-icons type="bottom" size="15" color="#302e29" /></button>
            <view class="phone-divider" />
            <input class="field" type="number" :value="phoneForm.phoneNumber" maxlength="15" :placeholder="t('phoneAuth.phonePlaceholder')" placeholder-class="field-placeholder" :adjust-position="true" :cursor-spacing="24" :aria-label="t('phoneAuth.phonePlaceholder')" @input="onPhoneNumberInput" />
          </view>
          <text class="phone-code-label">{{ t('phoneAuth.codeLabel') }}</text>
          <view class="phone-code-entry">
            <view v-for="index in 6" :key="index" class="phone-code-cell" :class="{ filled: phoneForm.code.length >= index }"><text>{{ phoneForm.code[index - 1] || '' }}</text></view>
            <input class="phone-code-input" type="number" :value="phoneForm.code" maxlength="6" :aria-label="t('phoneAuth.codeLabel')" @input="onPhoneCodeInput" @confirm="handlePhoneLogin" />
          </view>
          <button class="main-btn phone-submit" hover-class="main-btn-pressed" :disabled="loading || socialLoading || restoringSession" @click="handlePhoneLogin">{{ loading ? t('blessAuth.processing') : t('phoneAuth.submit') }}</button>
          <view class="privacy-agree phone-privacy">
            <button class="agreement-button" @click="toggleAgree" :aria-label="t('auth.agreedPrefix')" :aria-pressed="agreePrivacy"><view class="radio-circle" :class="{ active: agreePrivacy }"><text v-if="agreePrivacy">✓</text></view></button>
            <view class="privacy-text"><text @click="toggleAgree">{{ t('auth.agreedPrefix') }} </text><text class="legal-link" @click="openLegalDocument('service')">{{ t('common.serviceAgreement') }}</text><text> · </text><text class="legal-link" @click="openLegalDocument('privacy')">{{ t('common.privacyPolicy') }}</text></view>
          </view>
          <button class="text-button email-login-link" @click="showEmailLogin">{{ t('phoneAuth.emailLogin') }}</button>
        </view>
        <view v-else-if="isLoginView" class="form-content">
          <view class="input-row">
            <uni-icons type="email" size="22" color="#75726c" />
            <input class="field" type="text" :placeholder="t('auth.email')" placeholder-class="field-placeholder" v-model="loginForm.email" :adjust-position="true" :cursor-spacing="24" :aria-label="t('auth.email')" />
          </view>
          <view class="input-row">
            <uni-icons type="locked" size="22" color="#75726c" />
            <input class="field" :password="!showPassword" type="text" :placeholder="t('auth.password')" placeholder-class="field-placeholder" v-model="loginForm.password" :adjust-position="true" :cursor-spacing="24" confirm-type="done" @confirm="handleLogin" :aria-label="t('auth.password')" />
            <button class="eye-button" @click="showPassword = !showPassword" :aria-label="t(showPassword ? 'blessAuth.hidePassword' : 'blessAuth.showPassword')"><uni-icons :type="showPassword ? 'eye-slash' : 'eye'" size="22" color="#75726c" /></button>
          </view>
          <view class="forgot-row"><button class="text-button" @click="handleForgotPassword">{{ t('auth.forgotPassword') }}</button></view>
          <button class="main-btn" hover-class="main-btn-pressed" :disabled="loading || socialLoading || restoringSession" @click="handleLogin">{{ loading ? t('blessAuth.processing') : t('auth.login') }}</button>
          <button v-if="phoneLoginEnabled" class="text-button code-login" @click="showPhoneLogin">{{ t('phoneAuth.switchToPhone') }}</button>
          <view class="divider"><view class="divider-line" /><text>{{ t('auth.moreMethods') }}</text><view class="divider-line" /></view>
          <view class="social-row">
            <button class="social-button" hover-class="control-pressed" :disabled="socialLoading || loading || restoringSession" @click="handleGoogleLogin"><image class="google-icon" src="/static/auth/google.png" mode="aspectFit" /><text>Google</text></button>
            <button class="social-button" hover-class="control-pressed" :disabled="socialLoading || loading || restoringSession" @click="handleFacebookLogin"><text class="facebook-mark">f</text><text>Facebook</text></button>
          </view>
        </view>
        <view v-else class="form-content">
          <view class="input-row"><uni-icons type="email" size="22" color="#75726c" /><input class="field" :placeholder="t('auth.emailForRegister')" placeholder-class="field-placeholder" v-model="registerForm.email" :cursor-spacing="24" :aria-label="t('auth.emailForRegister')" /></view>
          <view class="input-row code-row"><input class="field" type="number" :placeholder="t('auth.verificationCode')" placeholder-class="field-placeholder" v-model="registerForm.code" :cursor-spacing="24" :aria-label="t('auth.verificationCode')" /><button class="text-button send-code" @click="showCodeUnavailable">{{ t('auth.sendCode') }}</button></view>
          <view class="input-row"><uni-icons type="locked" size="22" color="#75726c" /><input class="field" type="text" :password="!showPassword" :placeholder="t('auth.password')" placeholder-class="field-placeholder" v-model="registerForm.password" :cursor-spacing="24" :aria-label="t('auth.password')" /><button class="eye-button" @click="showPassword = !showPassword" :aria-label="t(showPassword ? 'blessAuth.hidePassword' : 'blessAuth.showPassword')"><uni-icons :type="showPassword ? 'eye-slash' : 'eye'" size="22" color="#75726c" /></button></view>
          <view class="input-row"><uni-icons type="locked" size="22" color="#75726c" /><input class="field" type="text" :password="!showConfirmPassword" :placeholder="t('auth.confirmPassword')" placeholder-class="field-placeholder" v-model="registerForm.confirmPassword" :cursor-spacing="24" :aria-label="t('auth.confirmPassword')" /><button class="eye-button" @click="showConfirmPassword = !showConfirmPassword" :aria-label="t(showConfirmPassword ? 'blessAuth.hidePassword' : 'blessAuth.showPassword')"><uni-icons :type="showConfirmPassword ? 'eye-slash' : 'eye'" size="22" color="#75726c" /></button></view>
          <text class="password-hint">{{ t('auth.passwordHint') }}</text>
          <button class="main-btn" hover-class="main-btn-pressed" :disabled="loading || socialLoading || restoringSession" @click="handleRegister">{{ loading ? t('blessAuth.processing') : t('auth.register') }}</button>
        </view>
        <view v-if="!isPhoneView" class="privacy-agree">
          <button class="agreement-button" @click="toggleAgree" :aria-label="t('auth.agreedPrefix')" :aria-pressed="agreePrivacy"><view class="radio-circle" :class="{ active: agreePrivacy }"><text v-if="agreePrivacy">✓</text></view></button>
          <view class="privacy-text"><text @click="toggleAgree">{{ t('auth.agreedPrefix') }} </text><text class="legal-link" @click="openLegalDocument('service')">{{ t('common.serviceAgreement') }}</text><text> · </text><text class="legal-link" @click="openLegalDocument('privacy')">{{ t('common.privacyPolicy') }}</text></view>
        </view>
        <view v-if="!isLoginView" class="auth-footer"><text>{{ t('auth.hasAccount') }}</text><button class="text-button" @click="switchView(true)">{{ t('auth.backToLogin') }}</button></view>
      </view>
    </view>
    <PhoneCountryPicker :open="countryPickerOpen" :selected-iso2="phoneForm.countryIso2" :locale="currentLocale" @close="dismissCountryPicker" @select="selectPhoneCountry" @after-close="countryPickerClosing = false" />
    <BlessDialog ref="blessDialog" />
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { onBackPress, onPageScroll, onResize, onShow } from '@dcloudio/uni-app';
import { readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js';
import { getPhoneLoginCapabilityApi, loginApi, phoneLoginApi, registerApi, socialLoginApi } from '@/api/index.js';
import { setToken, setUserInfo, getUserInfo } from '@/utils/auth.js';
import { registerCurrentDevice } from '@/utils/pushNotifications.js';
import { signInWithGoogle } from '@/utils/googleAuth.js';
import { signInWithFacebook } from '@/utils/facebookAuth.js';
import { getOrCreatePresenceSessionId, startPresence } from '@/utils/presence.js';
import { bootstrapLocale, currentLocale, t } from '@/utils/localeRuntime.js';
import { PHONE_COUNTRIES, getPhoneCountryName } from '@/utils/phoneCountries.js';
import BlessDialog from '@/components/common/BlessDialog.vue';
import PhoneCountryPicker from '@/components/login/PhoneCountryPicker.vue';

// Native status/capsule geometry is kept separate from the scrolling form.
let platform = '';
// #ifdef MP-WEIXIN
platform = 'mp-weixin';
// #endif
const geometry = ref(readChatHeaderGeometry(uni, { clearCapsule: false }, platform));
const navHeight = computed(() => geometry.value.contentTop + 52);
const scrollTop = ref(0);
const navStyle = computed(() => {
  const progress = Math.min(1, scrollTop.value / 48);
  return { backgroundColor: `rgba(247,245,239,${progress * .94})`, backdropFilter: `blur(${progress * 12}px)`, WebkitBackdropFilter: `blur(${progress * 12}px)` };
});
const showPassword = ref(false);
const showConfirmPassword = ref(false);
onPageScroll(e => { scrollTop.value = Math.max(0, e.scrollTop || 0); });
const updateGeometry = () => { geometry.value = readChatHeaderGeometry(uni, { clearCapsule: false }, platform); };
onResize(updateGeometry);
onShow(() => { updateGeometry(); void loadPhoneLoginCapability(); });
function showCodeUnavailable() { uni.showToast({ title: t('blessAuth.codeUnavailable'), icon: 'none' }); }

// 视图状态：true 为登入视图，false 为注册视图
const isLoginView = ref(true);
const isPhoneView = ref(false);
const phoneLoginEnabled = ref(false);
const countryPickerOpen = ref(false);
const countryPickerClosing = ref(false);
const loading = ref(false);
const socialLoading = ref(false);
const restoringSession = ref(false);
const blessDialog = ref(null);

// 隐私协议同意状态
const agreePrivacy = ref(false);

// 登入表单数据
const loginForm = reactive({
  email: '',
  password: ''
});

function readPhoneCountryIso2() {
  try {
    const saved = uni.getStorageSync('PHONE_LOGIN_COUNTRY_ISO2');
    return PHONE_COUNTRIES.some(country => country.iso2 === saved) ? saved : 'CN';
  } catch (_) {
    return 'CN';
  }
}
const phoneForm = reactive({ countryIso2: readPhoneCountryIso2(), phoneNumber: '', code: '' });
const selectedCountry = computed(() => PHONE_COUNTRIES.find(country => country.iso2 === phoneForm.countryIso2));
const selectedCountryName = computed(() => selectedCountry.value ? getPhoneCountryName(selectedCountry.value, currentLocale.value) : t('auth.country'));

async function loadPhoneLoginCapability() {
  try {
    const capability = await getPhoneLoginCapabilityApi();
    phoneLoginEnabled.value = capability?.enabled === true;
    if (!phoneLoginEnabled.value && isPhoneView.value) showEmailLogin();
  } catch (_) {
    // 返回本页时的短暂网络失败不清空正在填写的手机号表单。
    if (!isPhoneView.value) phoneLoginEnabled.value = false;
  }
}

function showPhoneLogin() {
  if (!phoneLoginEnabled.value || loading.value || socialLoading.value) return;
  isPhoneView.value = true;
  agreePrivacy.value = false;
  showPassword.value = false;
}

function showEmailLogin() {
  if (loading.value || socialLoading.value) return;
  if (countryPickerOpen.value) dismissCountryPicker();
  isPhoneView.value = false;
  isLoginView.value = true;
  agreePrivacy.value = false;
}

function openCountryPicker() {
  countryPickerClosing.value = false;
  countryPickerOpen.value = true;
}

function dismissCountryPicker() {
  if (countryPickerOpen.value) countryPickerClosing.value = true;
  countryPickerOpen.value = false;
}

function selectPhoneCountry(country) {
  phoneForm.countryIso2 = country.iso2;
  phoneForm.phoneNumber = '';
  dismissCountryPicker();
  try { uni.setStorageSync('PHONE_LOGIN_COUNTRY_ISO2', country.iso2); } catch (_) { /* 本次选择仍然有效 */ }
}

function onPhoneNumberInput(event) {
  const value = String(event?.detail?.value || '').replace(/\D/g, '').slice(0, 15);
  phoneForm.phoneNumber = value;
  return value;
}

function onPhoneCodeInput(event) {
  const value = String(event?.detail?.value || '').replace(/\D/g, '').slice(0, 6);
  phoneForm.code = value;
  return value;
}

// 注册表单数据
const registerForm = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: ''
});

// Validate on submission so empty forms still explain what needs attention.
function invalidForm(key) {
  uni.showToast({ title: t(key), icon: 'none', duration: 3000 });
  return false;
}
function validateForm(form, registration = false) {
  form.email = form.email.trim();
  if (!form.email) return invalidForm('auth.email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return invalidForm('blessAuth.invalidEmail');
  if (registration) {
    form.code = form.code.trim();
    if (!form.code) return invalidForm('auth.verificationCode');
    if (!/^\d{6}$/.test(form.code)) return invalidForm('blessAuth.invalidCode');
  }
  if (!form.password) return invalidForm('auth.password');
  if (registration) {
    const categories = [/[0-9]/, /[A-Z]/, /[a-z]/, /[^A-Za-z0-9\s]/].filter(pattern => pattern.test(form.password)).length;
    if (form.password.length < 8 || form.password.length > 20 || categories < 2) return invalidForm('auth.passwordHint');
    if (!form.confirmPassword) return invalidForm('auth.confirmPassword');
    if (form.password !== form.confirmPassword) return invalidForm('auth.passwordMismatch');
  }
  if (!agreePrivacy.value) return invalidForm('auth.needAgreement');
  return true;
}

// 切换勾选状态
const toggleAgree = () => {
  agreePrivacy.value = !agreePrivacy.value;
};

function openLegalDocument(type) {
  const url = type === 'service' ? '/pages/legal/userAgreement' : '/pages/legal/privacyPolicy';
  uni.navigateTo({ url });
}

// 切换视图的方法
const switchView = (isLogin) => {
  if (loading.value || socialLoading.value) return;
  isPhoneView.value = false;
  isLoginView.value = isLogin;
  showPassword.value = false;
  showConfirmPassword.value = false;
  agreePrivacy.value = false; // 切换视图时重置协议状态
};

// 左上角返回/关闭按钮处理
const handleBack = () => {
  if (countryPickerOpen.value) {
    dismissCountryPicker();
  } else if (isPhoneView.value) {
    showEmailLogin();
  } else if (!isLoginView.value) {
    switchView(true);
  } else {
    // 根据你的业务逻辑关闭页面或返回
    if (getCurrentPages().length > 1) uni.navigateBack();
    else uni.switchTab({ url: '/pages/index/index360' });
  }
};

onBackPress(() => {
  if (countryPickerClosing.value) return true;
  if (countryPickerOpen.value || isPhoneView.value || !isLoginView.value) {
    handleBack();
    return true;
  }
  return false;
});

// 路由守卫跳转解析
function getRedirectUrl() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const opt = (current && current.options) || {};
  return opt.redirect ? decodeURIComponent(opt.redirect) : '';
}

function navigateAfterAuth() {
  if (getUserInfo()?.needsOnboarding) { uni.reLaunch({ url: '/pages/login/onboarding' }); return; }
  const redirect = getRedirectUrl();
  if (redirect) {
    uni.reLaunch({ url: redirect });
  } else {
    uni.switchTab({ url: '/pages/index/index360' });
  }
}

// 处理登入
const handleLogin = async () => {
  if (loading.value || socialLoading.value || restoringSession.value) return;
  if (!validateForm(loginForm)) return;

  if (!agreePrivacy.value) {
    uni.showToast({ title: t('auth.needAgreement'), icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const clientSessionId = getOrCreatePresenceSessionId();
    const data = await loginApi(loginForm.email, loginForm.password, { clientSessionId });
    if (data && data.token) {
      setToken(data.token);
	  await bootstrapLocale();
      void startPresence();
      // 登录密码只用于本次请求，不写入 USER_INFO。
      if (data.user) setUserInfo({ ...data.user, loginType: data.user.loginType || 'email' });
      registerCurrentDevice();
      uni.showToast({ title: t('auth.loginSuccess'), icon: 'success' });
      navigateAfterAuth();
    } else {
      uni.showToast({ title: t('auth.loginFailed'), icon: 'none' });
    }
  } catch (e) {
    console.error('login error', e);
  } finally {
    loading.value = false;
  }
};

async function handlePhoneLogin() {
  if (loading.value || socialLoading.value || restoringSession.value) return;
  if (!phoneLoginEnabled.value) return invalidForm('phoneAuth.unavailable');
  if (!selectedCountry.value || phoneForm.phoneNumber.length < 4 || phoneForm.phoneNumber.length > 15) return invalidForm('phoneAuth.invalidPhone');
  if (!/^\d{6}$/.test(phoneForm.code)) return invalidForm('phoneAuth.invalidCode');
  if (!agreePrivacy.value) return invalidForm('auth.needAgreement');

  loading.value = true;
  try {
    const data = await phoneLoginApi({
      countryIso2: phoneForm.countryIso2,
      dialCode: selectedCountry.value.dialCode,
      phoneNumber: phoneForm.phoneNumber,
      code: phoneForm.code
    }, { clientSessionId: getOrCreatePresenceSessionId(), silent: true });
    if (!data?.token) throw new Error('missing_token');
    setToken(data.token);
    await bootstrapLocale();
    void startPresence();
    if (data.user) setUserInfo({ ...data.user, loginType: 'phone' });
    registerCurrentDevice();
    uni.showToast({ title: t('auth.loginSuccess'), icon: 'success' });
    navigateAfterAuth();
  } catch (error) {
    const key = error?.code === 1001 || error?.statusCode === 401
      ? 'phoneAuth.wrongCode'
      : error?.statusCode === 400 ? 'phoneAuth.invalidPhone'
        : error?.statusCode === 403 ? 'phoneAuth.unavailable' : 'phoneAuth.loginFailed';
    uni.showToast({ title: t(key), icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function completeSocialLogin(provider, authResult) {
  const clientSessionId = getOrCreatePresenceSessionId();
  const data = await socialLoginApi(provider, authResult, { clientSessionId });
  if (!data?.token) throw new Error(t('auth.loginFailed'));

  setToken(data.token);
  await bootstrapLocale();
  void startPresence();
  setUserInfo({ ...data.user, loginType: provider });
  registerCurrentDevice();
  uni.showToast({ title: t('auth.loginSuccess'), icon: 'success' });
  navigateAfterAuth();
}

async function handleSocialLogin(provider, signIn) {
  if (!agreePrivacy.value) {
    uni.showToast({ title: t('auth.needAgreement'), icon: 'none' });
    return;
  }
  if (socialLoading.value || loading.value) return;
  socialLoading.value = true;
  try {
    await completeSocialLogin(provider, await signIn());
  } catch (error) {
    console.error(`${provider} login error`, error);
    // 原生 SDK 的失败对象通常使用 errMsg / errCode，不是标准 Error.message。
    const errorCode = error?.errCode || error?.code || t('auth.unknownError');
    const errorMessage = typeof error === 'string' ? error : error?.errMsg || error?.message || t('auth.nativeErrorMissing');
    await blessDialog.value?.open({
      title: t('blessAuth.authorizationFailed', { provider: provider === 'facebook' ? 'Facebook' : 'Google', code: errorCode }),
      content: errorMessage,
      showCancel: false,
      confirmText: t('common.confirm'),
      tone: 'error'
    });
  } finally {
    socialLoading.value = false;
  }
}

// H5 GIS 或 Android 原生 SDK 返回 ID Token；令牌只提交后端校验，不在前端保存。
const handleGoogleLogin = () => handleSocialLogin('google', signInWithGoogle);

// H5 Meta SDK 或 Android 原生 OAuth 返回短期 Access Token；后端会二次验证 app_id 与用户 subject。
const handleFacebookLogin = () => handleSocialLogin('facebook', signInWithFacebook);

// 处理注册
const handleRegister = async () => {
  if (loading.value || socialLoading.value || restoringSession.value) return;
  if (!validateForm(registerForm, true)) return;

  if (registerForm.password !== registerForm.confirmPassword) {
    uni.showToast({ title: t('auth.passwordMismatch'), icon: 'none' });
    return;
  }
  if (!agreePrivacy.value) {
    uni.showToast({ title: t('auth.needAgreement'), icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    await registerApi(registerForm.email, registerForm.password, registerForm.code);
    uni.showToast({ title: t('auth.registerSuccess'), icon: 'success' });
    loading.value = false;
    switchView(true);
    loginForm.email = registerForm.email;
    loginForm.password = '';
  } catch (e) {
    console.error('register error', e);
  } finally {
    loading.value = false;
  }
};

// 忘记密码跳转
const handleForgotPassword = () => {
  uni.showToast({ title: t('auth.forgotPasswordTodo'), icon: 'none' });
};


function tryEmailAutoLogin() {

  const savedAccount = getUserInfo();
  // 兼容旧缓存（没有 loginType 时按邮箱账号处理），第三方账号绝不使用密码重登。
  const isEmailLogin = !savedAccount?.loginType || savedAccount.loginType === 'email';
  if (isEmailLogin && savedAccount?.email && savedAccount?.password) {

    loginForm.email = savedAccount.email;
    loginForm.password = savedAccount.password;
    agreePrivacy.value = true;
    handleLogin();
  }
}

onMounted(() => {
	uni.setNavigationBarTitle({ title: t('navigation.login') });
  const app = getApp();
  restoringSession.value = !!app?.globalData?.restoringSession;

  if (restoringSession.value) {
    uni.$once('auth-session-ready', () => {
      restoringSession.value = false;
    });
    return;
  }

  tryEmailAutoLogin();
});

watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('navigation.login') }));
</script>

<style scoped>
.auth-page{min-height:100vh;background:#f7f5ef;color:#302e29;box-sizing:border-box}
.auth-page button{box-sizing:border-box;margin:0;font-family:inherit;line-height:1.4;border:0}
.auth-page button::after{border:0}
.auth-nav{position:fixed;top:0;left:0;right:0;z-index:20;transition:background-color 160ms ease,backdrop-filter 160ms ease}
.auth-nav::after{content:"";position:absolute;top:100%;left:0;right:0;height:10px;background:linear-gradient(to bottom,rgba(247,245,239,.2),transparent);pointer-events:none}
.nav-row{height:52px;box-sizing:content-box;display:flex;align-items:center;justify-content:space-between;padding-left:20px;gap:16px;max-width:520px;margin:0 auto}
.back-button{width:44px;height:44px;flex-shrink:0;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;padding:0}
.region-label{margin-left:auto;font-size:13px;color:#615c54;padding:8px 12px;background:rgba(255,255,255,.7);border-radius:24px;max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.auth-shell{max-width:520px;margin:0 auto;overflow:hidden}
.brand-hero{box-sizing:content-box;position:relative;height:280px;height:clamp(230px,70vw,350px);overflow:hidden}
.brand-art{position:absolute;width:100%;height:100%;left:0;top:0}
.brand-copy{position:absolute;top:47%;left:25%;width:50%;transform:translateY(-50%);text-align:center;display:flex;flex-direction:column;align-items:center}
.brand-name{font-size:44px;font-size:clamp(34px,11vw,56px);font-weight:800;letter-spacing:1px;line-height:1.1;color:#a47723;font-family:Arial,sans-serif}
.brand-tagline{display:block;width:100%;margin-top:8px;font-size:13px;line-height:1.45;color:#906f31;white-space:pre-line;overflow-wrap:break-word;word-break:normal;max-width:220px}
.tagline-long{font-size:12px;max-width:180px}
.auth-sheet{position:relative;z-index:1;margin-top:-14px;background:#fff;border-radius:28px 28px 0 0;padding:24px 24px calc(24px + env(safe-area-inset-bottom));min-height:440px;box-sizing:border-box}
.sheet-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:22px}
.page-title{font-size:25px;line-height:1.25;font-weight:700;min-width:0;overflow-wrap:break-word}
.text-button{background:transparent;color:#615c54;font-size:14px;padding:8px 0;font-weight:500;white-space:normal}
.register-link{flex-shrink:0;max-width:35%;overflow-wrap:break-word}
.input-row{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 16px;background:#f4f3f1;border-radius:17px;margin-bottom:12px;box-sizing:border-box}
.field{flex:1;width:0;min-width:0;height:52px;font-size:15px;color:#37342f}
.field-placeholder{color:#8b8882;font-size:14px}
.eye-button{width:40px;min-height:44px;display:flex;align-items:center;justify-content:center;background:transparent;padding:0;flex-shrink:0;margin-right:-10px!important}
.forgot-row{display:flex;justify-content:flex-end;margin-top:-8px;margin-bottom:12px}
.main-btn{display:block;width:100%;min-height:50px;padding:12px 18px!important;border-radius:14px;background:#f2e5cf!important;color:#39352f!important;font-size:18px;font-weight:700;text-shadow:0 1px 0 #fff7e9;box-shadow:inset 0 1px 0 #fff9ef,0 1px 0 #e9dcc7,0 2px 0 #e4d6bf,0 4px 0 #ddd0bb,0 5px 0 #d5c7b2,0 6px 8px #ded8ce;transition:transform 150ms ease,box-shadow 150ms ease;white-space:normal}
.main-btn-pressed,.main-btn:active{transform:translateY(3px);box-shadow:inset 0 1px 0 #fff9ef,0 1px 0 #e9dcc7,0 2px 0 #ddd0bb,0 3px 0 #d5c7b2,0 3px 5px #ded8ce}
.main-btn[disabled]{opacity:.58;transform:none;cursor:default}
.code-login{margin:14px auto 10px!important;max-width:100%;padding:8px 12px}
.divider{display:flex;align-items:center;justify-content:center;gap:14px;color:#89857e;font-size:12px;margin:10px 0 16px;text-align:center}
.divider-line{width:34px;height:1px;background:#e6e3df;flex-shrink:0}
.social-row{display:flex;gap:12px}
.social-button{min-width:0;flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid #dedbd5!important;border-radius:24px;background:#fff;font-size:15px;color:#36332e;padding:8px}
.social-button[disabled]{opacity:.5}
.google-icon{width:24px;height:24px;flex-shrink:0}
.google-mark{font-size:24px;font-weight:800;color:#4285f4;font-family:Arial,sans-serif;line-height:1}
.facebook-mark{width:24px;height:24px;line-height:29px;background:#1877f2;border-radius:50%;color:white;font-size:26px;font-family:Arial,sans-serif;font-weight:700;text-align:center;overflow:hidden}
.control-pressed{opacity:.72}
.privacy-agree{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:22px;color:#858078}
.agreement-button{width:36px;min-height:36px;flex-shrink:0;display:flex;justify-content:center;align-items:center;background:transparent;padding:0}
.radio-circle{width:18px;height:18px;border:1px solid #99938a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:#39352f}
.radio-circle.active{background:#f2e5cf;border-color:#b9aa93}
.privacy-text{font-size:12px;line-height:1.5;padding-top:0;flex:0 1 auto;min-width:0;text-align:center;overflow-wrap:break-word}
.legal-link{color:#615c54;text-decoration:underline;text-underline-offset:3px}
.code-row{gap:6px}
.send-code{max-width:45%;font-size:12px;flex-shrink:0;padding-left:8px!important}
.password-hint{display:block;font-size:12px;color:#858078;line-height:1.6;margin:4px 0 20px}
.auth-footer{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;font-size:13px;color:#858078;margin-top:20px}
/* Reserve room for translated agreements by reducing gaps, keeping the hero and fields intact.
   Keep natural page scrolling available for small screens, large text and the keyboard. */
.auth-login .auth-sheet{padding-top:20px;padding-bottom:calc(16px + env(safe-area-inset-bottom));min-height:0}
.auth-login .sheet-heading{margin-bottom:16px}
.auth-login .forgot-row{margin-bottom:6px}
.auth-login .code-login{margin:10px auto 2px!important;min-height:44px;display:flex;align-items:center;justify-content:center}
.auth-login .divider{margin:4px 0 10px}
.auth-login .privacy-agree{margin-top:14px}
.auth-register .brand-hero{height:220px}
.auth-register .brand-name{font-size:38px}
.auth-register .brand-copy{width:50%;left:25%}
.auth-register .brand-tagline{font-size:11px}
.auth-phone .sheet-heading{margin-bottom:6px}
.phone-subtitle{display:block;font-size:14px;line-height:1.5;color:#89857e;overflow-wrap:break-word;margin-bottom:24px}
.phone-number-row{min-height:58px;margin-bottom:24px;padding-left:10px}
.phone-number-row .field{height:58px}
.country-code-button{min-width:75px;min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;background:transparent;padding:0 6px;color:#302e29;font-size:18px;font-weight:600;flex-shrink:0}
.phone-divider{width:1px;height:28px;background:#b8b3ac;flex-shrink:0}
.phone-code-label{display:block;font-size:15px;font-weight:600;margin-bottom:10px}
.phone-code-entry{position:relative;display:flex;align-items:center;gap:8px;min-height:54px;margin-bottom:34px}
.phone-code-cell{flex:1;min-width:0;height:54px;border:1px solid transparent;background:#f4f3f1;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:600;box-sizing:border-box;color:#302e29}
.phone-code-cell.filled{border-color:#d7bd83;background:#faf6eb}
.phone-code-input{position:absolute;top:0;left:0;width:100%;height:100%;opacity:.01;z-index:2;font-size:16px}
.phone-submit{margin-top:0}
.phone-privacy{margin-top:25px!important}
.email-login-link{display:block;text-decoration:underline;text-underline-offset:3px;margin:28px auto 0!important;min-height:44px}
.session-restoring-mask{position:fixed;inset:0;background:rgba(247,245,239,.96);z-index:100;display:flex;align-items:center;justify-content:center;color:#615c54}
@media(max-width:350px){.auth-sheet{padding-left:18px;padding-right:18px}.page-title{font-size:22px}.social-row{gap:8px}.social-button{font-size:13px}.brand-tagline{font-size:11px}.tagline-long{font-size:10px}.phone-code-entry{gap:5px}.phone-code-cell{height:48px}}
@media(prefers-reduced-motion:reduce){.main-btn,.auth-nav{transition:none}}
</style>
