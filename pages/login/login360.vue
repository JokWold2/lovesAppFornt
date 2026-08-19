<template>
  <view class="container">
    <view v-if="restoringSession" class="session-restoring-mask">
      <text>正在恢复登录…</text>
    </view>
    <!-- 顶部柔和暖黄渐变背景 -->
    <view class="bg-gradient"></view>

    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="handleBack">
        <text v-if="isLoginView" class="icon-close">✕</text>
        <text v-else class="icon-back">←</text>
      </view>
      <view class="nav-right">
        <text>中国</text>
        <text class="icon-arrow">›</text>
      </view>
    </view>

    <!-- 页面标题 -->
    <view class="header-section">
      <text class="page-title">{{ isLoginView ? '账号登录' : '邮箱注册' }}</text>
      <view class="help-icon">?</view>
    </view>

    <!-- 登入视图 -->
    <view v-if="isLoginView" class="auth-view">
      <view class="auth-content">
        <!-- 账号密码输入框 -->
        <input class="custom-input" type="text" placeholder="请输入邮箱" placeholder-class="ph-color"
          v-model="loginForm.email" />
        <input class="custom-input" type="password" placeholder="请输入密码" placeholder-class="ph-color"
          v-model="loginForm.password" />

        <!-- 登录按钮 -->
        <view class="main-btn" :class="{ 'btn-active': isLoginValid }" @click="handleLogin">
          登录
        </view>

        <!-- 忘记密码 -->
        <view class="forgot-password">
          <text @click="handleForgotPassword">忘记密码</text>
        </view>

        <!-- 隐私协议勾选区域 -->
        <view class="privacy-agree" @click="toggleAgree">
          <view class="radio-circle" :class="{ 'active': agreePrivacy }">
            <text v-if="agreePrivacy" class="tick">✓</text>
          </view>
          <text class="privacy-text">已阅读并同意 <text class="link-text">用户服务协议</text>、<text
              class="link-text">隐私政策</text></text>
        </view>

        <!-- 更多登录方式 -->
        <view class="more-login-section">
          <view class="divider">
            <view class="line"></view>
            <text class="divider-text">更多登录方式</text>
            <view class="line"></view>
          </view>

          <view class="methods-row">
            <view class="code-login-btn">验证码登录</view>
            <view class="social-icons">
              <view class="circle-icon wechat">
                <text class="icon-text">微</text>
              </view>
              <view class="circle-icon google" :class="{ 'social-loading': socialLoading }" @click="handleGoogleLogin">
                <text class="icon-text-g">G</text>
              </view>
              <view class="circle-icon facebook">
                <text class="icon-text">f</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 切换到注册 -->
        <view class="auth-footer">
          <text class="text-secondary">还没有账号？ </text>
          <text class="link-text-bold" @click="switchView(false)">注册</text>
        </view>
      </view>
    </view>

    <!-- 注册视图 -->
    <view v-else class="auth-view">
      <view class="auth-content">
        <!-- 注册表单 -->
        <input class="custom-input"  placeholder="请输入您的邮箱" placeholder-class="ph-color"
          v-model="registerForm.email" />

        <!-- 带发送验证码的输入框 -->
        <view class="custom-input input-with-action">
          <input type="number" class="flex-1" placeholder="请输入验证码" placeholder-class="ph-color"
            v-model="registerForm.code" />
          <text class="action-text">发送验证码</text>
        </view>

        <input class="custom-input" type="password" placeholder="请输入密码" placeholder-class="ph-color"
          v-model="registerForm.password" />
        <input class="custom-input" type="password" placeholder="请再次输入密码" placeholder-class="ph-color"
          v-model="registerForm.confirmPassword" />

        <!-- 密码规则提示 -->
        <view class="pwd-hint">
          <text class="hint-icon">i</text>
          <text class="hint-text">8-20位字符，由数字、大写字母、小写字母、符号，任意两种组成</text>
        </view>

        <!-- 注册按钮 -->
        <view class="main-btn" :class="{ 'btn-active': isRegisterValid }" @click="handleRegister">
          注册账号
        </view>

        <!-- 隐私协议勾选区域 -->
        <view class="privacy-agree register-privacy" @click="toggleAgree">
          <view class="radio-circle" :class="{ 'active': agreePrivacy }">
            <text v-if="agreePrivacy" class="tick">✓</text>
          </view>
          <text class="privacy-text">已阅读并同意 <text class="link-text">用户服务协议</text>、<text
              class="link-text">隐私政策</text></text>
        </view>

        <!-- 切换到登录 (底部辅助返回) -->
        <view class="auth-footer" style="margin-top: 40px;">
          <text class="text-secondary">已经有账号了？ </text>
          <text class="link-text-bold" @click="switchView(true)">返回登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { loginApi, registerApi, socialLoginApi } from '@/api/index.js';
import { setToken, setUserInfo, getUserInfo } from '@/utils/auth.js';
import { signInWithGoogle } from '@/utils/googleAuth.js';

// 视图状态：true 为登入视图，false 为注册视图
const isLoginView = ref(true);
const loading = ref(false);
const socialLoading = ref(false);
const restoringSession = ref(false);

// 隐私协议同意状态
const agreePrivacy = ref(false);

// 登入表单数据
const loginForm = reactive({
  email: '',
  password: ''
});

// 注册表单数据
const registerForm = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: ''
});

// 按钮高亮校验计算属性
const isLoginValid = computed(() => {
  return loginForm.email.length > 0 && loginForm.password.length > 0;
});
const isRegisterValid = computed(() => {
  return registerForm.email.length > 0 && registerForm.code.length > 0 && registerForm.password.length > 0 && registerForm.confirmPassword.length > 0;
});

// 切换勾选状态
const toggleAgree = () => {
  agreePrivacy.value = !agreePrivacy.value;
};

// 切换视图的方法
const switchView = (isLogin) => {
  isLoginView.value = isLogin;
  agreePrivacy.value = false; // 切换视图时重置协议状态
};

// 左上角返回/关闭按钮处理
const handleBack = () => {
  if (!isLoginView.value) {
    switchView(true);
  } else {
    // 根据你的业务逻辑关闭页面或返回
    uni.navigateBack();
  }
};

// 路由守卫跳转解析
function getRedirectUrl() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const opt = (current && current.options) || {};
  return opt.redirect ? decodeURIComponent(opt.redirect) : '';
}

function navigateAfterAuth() {
  const redirect = getRedirectUrl();
  if (redirect) {
    uni.reLaunch({ url: redirect });
  } else {
    uni.switchTab({ url: '/pages/index/index360' });
  }
}

// 处理登入
const handleLogin = async () => {
  if (!isLoginValid.value) return;

  if (!agreePrivacy.value) {
    uni.showToast({ title: '请先阅读并同意《隐私协议》', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const data = await loginApi(loginForm.email, loginForm.password);
    if (data && data.token) {
      setToken(data.token);
      // 仅邮箱密码登录保存密码；第三方授权凭证不写入本地存储。
      if (data.user) setUserInfo({ ...data.user, loginType: data.user.loginType || 'email', password: loginForm.password });
      uni.showToast({ title: '登入成功', icon: 'success' });
      navigateAfterAuth();
    } else {
      uni.showToast({ title: '登入失败', icon: 'none' });
    }
  } catch (e) {
    console.error('login error', e);
  } finally {
    loading.value = false;
  }
};

// App 端由原生 Google SDK 返回 ID Token；令牌仅提交给后端校验，不在前端解析或保存。
const handleGoogleLogin = async () => {
  if (!agreePrivacy.value) {
    uni.showToast({ title: '请先阅读并同意《隐私协议》', icon: 'none' });
    return;
  }
  if (socialLoading.value) return;

  // #ifndef APP-PLUS
  uni.showToast({ title: '请在 Android App 中使用 Google 登录', icon: 'none' });
  return;
  // #endif

  // #ifdef APP-PLUS
  socialLoading.value = true;
  try {
    const { idToken } = await signInWithGoogle();
    const data = await socialLoginApi('google', { idToken });
    if (!data?.token) throw new Error('Google 登录未返回登录凭证');

    setToken(data.token);
    setUserInfo({ ...data.user, loginType: 'google' });
    uni.showToast({ title: 'Google 登录成功', icon: 'success' });
    navigateAfterAuth();
  } catch (error) {
    console.error('google login error', error);
    // 原生 SDK 的失败对象通常使用 errMsg / errCode，不是标准 Error.message。
    const errorCode = error?.errCode || error?.code || '未知';
    const errorMessage = typeof error === 'string' ? error : error?.errMsg || error?.message || '未返回原生错误信息';
    // Toast 放不下 Google 原生错误（例如 login:fail 10），使用弹窗完整展示，便于排查配置问题。
    uni.showModal({
      title: `Google 授权失败（${errorCode}）`,
      content: errorMessage,
      showCancel: false
    });
  } finally {
    socialLoading.value = false;
  }
  // #endif
};

// 处理注册
const handleRegister = async () => {
  if (!isRegisterValid.value) return;

  if (registerForm.password !== registerForm.confirmPassword) {
    uni.showToast({ title: '两次密码输入不一致', icon: 'none' });
    return;
  }
  if (!agreePrivacy.value) {
    uni.showToast({ title: '请先阅读并同意《隐私协议》', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    await registerApi(registerForm.email, registerForm.password, registerForm.code);
    uni.showToast({ title: '注册成功，请登入', icon: 'success' });
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
  uni.showToast({ title: '跳转忘记密码流程', icon: 'none' });
};


function tryEmailAutoLogin() {
  console.log('onMounted');
  const savedAccount = getUserInfo();
  // 兼容旧缓存（没有 loginType 时按邮箱账号处理），第三方账号绝不使用密码重登。
  const isEmailLogin = !savedAccount?.loginType || savedAccount.loginType === 'email';
  if (isEmailLogin && savedAccount?.email && savedAccount?.password) {
    console.log('savedAccount', savedAccount);
    loginForm.email = savedAccount.email;
    loginForm.password = savedAccount.password;
    agreePrivacy.value = true;
    handleLogin();
  }
}

onMounted(() => {
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
</script>

<style scoped lang="scss">
/* 全局色彩定义 */
$bg-color: #ffffff;
$input-bg: #f7f8fc;
$text-main: #1a1a1a;
$text-gray: #a8a8a8;
$btn-disabled: #e6e6e6;
$btn-disabled-text: #c2c2c2;
$btn-active: #333333;
$btn-active-text: #ffffff;
$theme-color: #2b2b2b;
$border-color: #f0f0f0;

.container {
  min-height: 100vh;
  background-color: $bg-color;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.session-restoring-mask {
  position: fixed;
  z-index: 999;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #666666;
  font-size: 30rpx;
}

.social-loading {
  opacity: 0.5;
  pointer-events: none;
}

/* 顶部暖黄渐变背景模拟 */
.bg-gradient {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 400rpx;
  background: radial-gradient(circle at -10% -10%, #ffefcc 0%, rgba(255, 239, 204, 0) 70%);
  z-index: 0;
  opacity: 0.8;
}

/* 顶部导航条 */
.nav-bar {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 100rpx 40rpx 20rpx;
  /* 根据安全区调整 */

  .nav-left {
    font-size: 40rpx;
    color: $text-main;
    font-weight: 500;
    padding: 10rpx;
  }

  .nav-right {
    display: flex;
    align-items: center;
    font-size: 28rpx;
    color: #666;

    .icon-arrow {
      margin-left: 8rpx;
      font-size: 32rpx;
      margin-top: -4rpx;
    }
  }
}

/* 标题区 */
.header-section {
  position: relative;
  z-index: 10;
  padding: 40rpx 50rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .page-title {
    font-size: 48rpx;
    font-weight: 700;
    color: $text-main;
  }

  .help-icon {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.25);
    color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 26rpx;
    font-weight: bold;
  }
}

/* 表单内容区 */
.auth-view {
  position: relative;
  z-index: 10;
  flex: 1;
  animation: fadeSlideUp 0.3s ease-out;
}

.auth-content {
  padding: 20rpx 50rpx;
}

/* 输入框样式 */
.custom-input {
  width: 100%;
  height: 100rpx;
  background-color: $input-bg;
  border-radius: 50rpx;
  padding: 0 40rpx;
  font-size: 30rpx;
  color: $text-main;
  margin-bottom: 30rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

:deep(.ph-color) {
  color: #b5b5b5;
}

.input-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 40rpx;

  .flex-1 {
    flex: 1;
    height: 100%;
    font-size: 30rpx;
  }

  .action-text {
    font-size: 28rpx;
    color: #999;
    white-space: nowrap;
    margin-left: 20rpx;
  }
}

/* 密码规则提示 */
.pwd-hint {
  display: flex;
  align-items: flex-start;
  margin-top: -10rpx;
  margin-bottom: 30rpx;
  padding: 0 10rpx;

  .hint-icon {
    display: inline-block;
    width: 28rpx;
    height: 28rpx;
    border: 2rpx solid $text-gray;
    border-radius: 50%;
    text-align: center;
    line-height: 28rpx;
    font-size: 20rpx;
    color: $text-gray;
    margin-right: 12rpx;
    margin-top: 4rpx;
    flex-shrink: 0;
  }

  .hint-text {
    font-size: 24rpx;
    color: $text-gray;
    line-height: 1.4;
  }
}

/* 主按钮样式 (灰阶渐进) */
.main-btn {
  width: 100%;
  height: 100rpx;
  border-radius: 50rpx;
  background-color: $btn-disabled;
  color: $btn-disabled-text;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20rpx;
  transition: all 0.3s ease;

  &.btn-active {
    background-color: $btn-active;
    color: $btn-active-text;
  }

  &:active {
    opacity: 0.8;
  }
}

/* 忘记密码 */
.forgot-password {
  display: flex;
  justify-content: center;
  margin-top: 30rpx;

  text {
    font-size: 28rpx;
    color: #666;
  }
}

/* 隐私协议勾选 */
.privacy-agree {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40rpx;

  &.register-privacy {
    margin-top: 30rpx;
    justify-content: flex-start;
  }

  .radio-circle {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    border: 2rpx solid #dcdcdc;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 12rpx;
    box-sizing: border-box;

    &.active {
      background-color: $theme-color;
      border-color: $theme-color;
    }

    .tick {
      color: #fff;
      font-size: 24rpx;
    }
  }

  .privacy-text {
    font-size: 24rpx;
    color: $text-gray;

    .link-text {
      color: #333;
    }
  }
}

/* 更多登录方式 (高度还原样式) */
.more-login-section {
  margin-top: 80rpx;

  .divider {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;

    .line {
      width: 100rpx;
      height: 2rpx;
      background-color: $border-color;
    }

    .divider-text {
      font-size: 24rpx;
      color: #b0b0b0;
      margin: 0 30rpx;
    }
  }

  .methods-row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .code-login-btn {
      width: 240rpx;
      height: 80rpx;
      background-color: $input-bg;
      border-radius: 40rpx;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 26rpx;
      color: $text-main;
      font-weight: 500;
    }

    .social-icons {
      display: flex;
      gap: 30rpx;

      .circle-icon {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;

        .icon-text {
          color: #fff;
          font-size: 32rpx;
        }

        .icon-text-g {
          font-weight: bold;
          font-size: 36rpx;
          color: #4285F4;
        }
      }

      .wechat {
        background-color: #07C160;
      }

      .google {
        background-color: #ffffff;
        border: 2rpx solid #eeeeee;
        box-sizing: border-box;
      }

      .facebook {
        background-color: #1877F2;
      }
    }
  }
}

/* 底部切换连接 */
.auth-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 50rpx;
  font-size: 28rpx;

  .text-secondary {
    color: #666;
  }

  .link-text-bold {
    color: #1583ff;
    /* 这里使用了相近的亮蓝色引导点击 */
    font-weight: 500;
  }
}

/* 动画 */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(10rpx);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
