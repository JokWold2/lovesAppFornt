<template>
  <view class="container">
    <view
      style=" position: fixed;top: 30rpx; left: -150rpx; transform: scale(0.3);display: flex;justify-content: flex-start; ">
      <loading5 text="FAMILY-LOVE" />
    </view>
    <view
      v-if="false"
      style=" position: fixed;top: 300rpx; right: -65rpx; transform: scale(0.3);display: flex;justify-content: flex-start; ">
      <loading6 text="极速加载中">
      </loading6>
    </view>
    <!-- 登入視圖 -->
    <view v-if="isLoginView" class="auth-view">
      <view class="auth-header">
        <view class="auth-logo-circle">
          <text class="logo-icon">♥</text>
        </view>
        <text class="title">歡迎回來</text>
        <text class="subtitle">幸福相遇・啟航美好人生</text>
      </view>
      <view class="auth-content">
        <view class="input-group">
          <text class="input-label">電子郵件</text>
          <input type="text" class="form-input" placeholder="請輸入您的 Email" v-model="loginForm.email" />
        </view>
        <view class="input-group">
          <text class="input-label">密碼</text>
          <input type="password" class="form-input" placeholder="請輸入密碼" v-model="loginForm.password" />
        </view>
        <view class="forgot-password">
          <text class="link-text" @click="handleForgotPassword">忘記密碼？</text>
        </view>
        <!-- <button class="btn-primary" :disabled="loading" @click="handleLogin">登入</button> -->
        <view @click="handleLogin">
          <button2 :haslight="false">
            <view style="width: 568rpx;margin: 0 auto;">
              登入
            </view>
          </button2>
        </view>
        <!-- 隱私協議勾選區域 -->
        <view class="privacy-agree" @click="toggleAgree">
          <view class="checkbox-box" style="transform: scale(0.5);">
            <loading1 :checked="agreePrivacy" />
          </view>
          <text class="privacy-text">我已閱讀並同意<span class="privacy-link">《隱私協議》</span></text>
        </view>

        <view class="auth-footer">
          <text class="text-secondary">還沒有帳號？ </text>
          <text class="link-text-bold" @click="switchView(false)">立即註冊</text>
        </view>
      </view>
    </view>
    <!-- 註冊視圖 -->
    <view v-else class="auth-view">
      <view class="auth-header auth-header-register">
        <view class="auth-logo-circle logo-small">
          <text class="logo-icon">📝</text>
        </view>
        <text class="title">建立新帳號</text>
        <text class="subtitle">加入我們，尋找您的完美緣分</text>
      </view>
      <view class="auth-content">
        <view class="input-group">
          <text class="input-label">電子郵件</text>
          <input type="text" class="form-input" placeholder="請輸入有效的 Email" v-model="registerForm.email" />
        </view>
        <view class="input-group">
          <text class="input-label">設定密碼</text>
          <input type="password" class="form-input" placeholder="最少 8 個字元" v-model="registerForm.password" />
        </view>
        <view class="input-group">
          <text class="input-label">確認密碼</text>
          <input type="password" class="form-input" placeholder="請再次輸入密碼" v-model="registerForm.confirmPassword" />
        </view>
        <!-- <button class="btn-primary btn-register" :disabled="loading" @click="handleRegister">註冊</button> -->
        <view @click="handleRegister">
          <button2 :haslight="false">
            <view style="width: 568rpx;margin: 0 auto;">
              註冊
            </view>
          </button2>
        </view>
        <view class="auth-footer">
          <text class="text-secondary">已經有帳號了？ </text>
          <text class="link-text-bold" @click="switchView(true)">返回登入</text>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, reactive } from 'vue';
import { loginApi, registerApi } from '@/api/index.js';
import { setToken, setUserInfo } from '@/utils/auth.js';
import loading1 from '@/static/loading/loading1.vue';
import loading5 from '@/static/loading/loading5.vue';
import loading6 from '@/static/loading/loading6.vue';
import button2 from '@/static/botton/botton2.vue';

// 視圖狀態：true 為登入視圖，false 為註冊視圖
const isLoginView = ref(true);
const loading = ref(false);
// 隱私協議同意狀態
const agreePrivacy = ref(false);
// 登入表單資料
const loginForm = reactive({
  email: '',
  password: ''
});
// 註冊表單資料
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: ''
});
// 切換勾選狀態
const toggleAgree = () => {
  agreePrivacy.value = !agreePrivacy.value;
};
// 切換視圖的方法
const switchView = (isLogin) => {
  isLoginView.value = isLogin;
};
// 解析路由守卫带过来的 redirect 参数
function getRedirectUrl() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const opt = (current && current.options) || {};
  return opt.redirect ? decodeURIComponent(opt.redirect) : '';
}
// 登入成功后跳转：有 redirect 回 redirect，否则回首页
function navigateAfterAuth() {
  const redirect = getRedirectUrl();
  if (redirect) {
    uni.reLaunch({ url: redirect });
  } else {
    uni.switchTab({ url: '/pages/index/index' });
  }
}
// 處理登入
const handleLogin = async () => {
  if (!loginForm.email || !loginForm.password) {
    uni.showToast({ title: '請填寫完整資訊', icon: 'none' });
    return;
  }
  // 校驗是否同意隱私協議
  if (!agreePrivacy.value) {
    uni.showToast({ title: '請同意《隱私協議》', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const data = await loginApi(loginForm.email, loginForm.password);
    // 后端返回 { message, token, user }
    if (data && data.token) {
      setToken(data.token);
      if (data.user) setUserInfo(data.user);
      uni.showToast({ title: '登入成功', icon: 'success' });
      navigateAfterAuth();
    } else {
      uni.showToast({ title: '登入失敗', icon: 'none' });
    }
  } catch (e) {
    // request 已自动 toast，这里仅做兜底
    console.error('login error', e);
  } finally {
    loading.value = false;
  }
};
// 處理註冊
const handleRegister = async () => {
  if (!registerForm.email || !registerForm.password) {
    uni.showToast({ title: '請填寫完整資訊', icon: 'none' });
    return;
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    uni.showToast({ title: '兩次密碼不一致', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await registerApi(registerForm.email, registerForm.password);
    uni.showToast({ title: '註冊成功，請登入', icon: 'success' });
    switchView(true);
    // 把账号回填到登录表单
    loginForm.email = registerForm.email;
    loginForm.password = '';
  } catch (e) {
    console.error('register error', e);
  } finally {
    loading.value = false;
  }
};
// 忘記密碼跳轉
const handleForgotPassword = () => {
  uni.showToast({ title: '跳轉忘記密碼流程', icon: 'none' });
};
</script>
<style scoped lang="scss">
/* 定义主题变量 */
$primary-color: #fff6df;
$primary-light: #fff6df;
$bg-color: #fff6df;
$card-bg: #ffffff;
$text-main: #333333;
$text-secondary: #888888;
$border-color: #eeeeee;
$focus-color: rgba(255, 246, 223, 0.25); // #fff6df40

.container {
  min-height: 100vh;
  background-color: $card-bg;
  display: flex;
  flex-direction: column;
}

/* 視圖動畫與佈局 */
.auth-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  animation: fadeSlideUp 0.4s ease;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(15px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 頂部裝飾區塊 */
.auth-header {
  background: linear-gradient(135deg, $primary-light 0%, #ffffff 100%);
  padding: 60px 30px 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  margin-bottom: 30px;

  &.auth-header-register {
    padding-top: 50px;
  }
}

.auth-logo-circle {
  width: 80px;
  height: 80px;
  background-color: $primary-light;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
  box-shadow: 0 4px 10px rgba(255, 246, 223, 0.1);

  .logo-icon {
    color: $primary-color;
    font-size: 32px;
  }

  &.logo-small {
    width: 60px;
    height: 60px;

    .logo-icon {
      font-size: 24px;
    }
  }
}

.title {
  font-size: 24px;
  color: $text-main;
  font-weight: bold;
  margin-bottom: 5px;
}

.subtitle {
  font-size: 14px;
  color: $text-secondary;
}

/* 表單內容區塊 */
.auth-content {
  padding: 0 30px;
  flex: 1;
  padding-bottom: 40px;
}

.input-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.input-label {
  font-size: 13px;
  color: $text-main;
  margin-bottom: 8px;
  font-weight: 600;
  letter-spacing: 0.8px;
  line-height: 1.4;
  position: relative;
  display: inline-block;
  /* 核心炫酷特效1：文字外发光 */
  text-shadow: 0 0 4px rgba(255, 246, 223, 0.6), 0 0 8px rgba(255, 255, 255, 0.4);
  /* 渐变文字底色（双主题色） */
  background: linear-gradient(90deg, #fff6df, #fff6df);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

/* 流光扫光特效遮罩 */
.input-label::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  animation: labelShine 3s infinite linear;
}

/* hover增强发光+放大突出 */
.input-label:hover {
  transform: scale(1.05);
  text-shadow: 0 0 6px #fff6df, 0 0 12px #fff6df, 0 0 18px rgba(255, 255, 255, 0.5);
}

/* 可选：必填红星高亮特效 */
.input-label.required::before {
  content: "*";
  color: #fff6df;
  margin-right: 4px;
  text-shadow: 0 0 6px #fff6df;
}

/* 流光动画 */
@keyframes labelShine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid $border-color;
  border-radius: 12px;
  font-size: 15px;
  color: $text-main;
  background-color: #fafafa;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    border-color: $primary-color;
    background-color: #fff;
    /* uniapp 中 box-shadow 需要在某些設備上注意相容性，這裡保留原有視覺 */
    box-shadow: 0 0 0 3px $focus-color;
  }
}

.forgot-password {
  display: flex;
  justify-content: flex-end;
  margin-top: -10px;
  margin-bottom: 25px;

  .link-text {
    font-size: 13px;
    color: $primary-color;
  }
}

.btn-primary {
  width: 100%;
  height: 50px;
  line-height: 50px;
  border-radius: 25px;
  background-color: $primary-color;
  color: #333;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  border: none;
  box-shadow: 0 4px 12px rgba(255, 246, 223, 0.3);

  &::after {
    border: none;
    /* 去除小程式原生的按鈕邊框 */
  }

  &:active {
    background-color: #e6dcc4;
  }

  &.btn-register {
    margin-top: 10px;
  }
}

/* 隱私協議勾選樣式 */
.privacy-agree {
  display: flex;
  align-items: center;
  margin-top: 16px;
  gap: 10rpx;

  .checkbox-box {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }

  .privacy-text {
    font-size: 13px;
    color: $text-secondary;

    .privacy-link {
      color: $primary-color;
    }
  }
}

/* 底部切換連結 */
.auth-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
  font-size: 14px;

  .text-secondary {
    color: $text-secondary;
  }

  .link-text-bold {
    color: $primary-color;
    font-weight: bold;
    margin-left: 5px;
  }
}
</style>