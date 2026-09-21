<template>
    <view class="page-container">
      <scroll-view class="scroll-content" scroll-y>
        
        <!-- 1. 顶部月饼活动 Banner 区域 -->
        <view class="banner-section">
          <view class="banner-title-box">
            <text class="title-main">下单月饼抽免单</text>
            <text class="title-sub">限时活动·最高免100元</text>
          </view>
          
          <!-- 优惠标签 -->
          <view class="tags-row">
            <view class="tag-item">
              <text class="tag-t1">2盒立省30</text>
              <text class="tag-t2">（盒装月饼）</text>
            </view>
            <view class="tag-item">
              <text class="tag-t1">第二件半价</text>
              <text class="tag-t2">（散装月饼）</text>
            </view>
            <view class="tag-item">
              <text class="tag-t1">充200送20</text>
              <text class="tag-t2">（储值优惠）</text>
            </view>
          </view>
          
          <!-- 产品展示占位 (请替换为实际图片) -->
          <view class="product-showcase">
            <image class="mooncake-img" mode="aspectFit" src="/static/mooncake-box.png"></image>
          </view>
          
          <view class="action-btn">一键包邮寄出</view>
          <view class="action-tips">*图片仅供参考，产品请以实物为准</view>
        </view>
  
        <!-- 2. 核心服务入口 (预订蛋糕 / 面包茶饮) -->
        <view class="main-services">
          <view class="service-item">
            <text class="s-title">预订蛋糕</text>
            <text class="s-desc">生日/纪念</text>
          </view>
          <view class="divider"></view>
          <view class="service-item">
            <text class="s-title">面包茶饮</text>
            <text class="s-desc">外卖/自提</text>
          </view>
        </view>
  
        <!-- 新增：点单与月饼到家快捷入口 -->
        <view class="extra-services">
          <view class="es-card">
            <view class="es-item">
              <view class="es-info">
                <text class="es-title">☕️ 极速点单</text>
                <text class="es-desc">门店自取 / 外卖</text>
              </view>
              <view class="es-action">去点单</view>
            </view>
            <view class="es-divider"></view>
            <view class="es-item">
              <view class="es-info">
                <text class="es-title">🥮 月饼到家</text>
                <text class="es-desc">包邮直送到家</text>
              </view>
              <view class="es-action highlight">去购买</view>
            </view>
          </view>
        </view>
  
        <!-- 3. 滚动通知栏 -->
        <view class="notice-bar">
          <text class="notice-text">蛋糕上新啦，双重口味可选购，5家门店限定热销中：楼岗 松岗 大仟里 公明 嘉域</text>
        </view>
  
        <!-- 4. 用户信息与资产 -->
        <view class="user-assets-card">
          <view class="asset-item">
            <text class="a-label">余额</text>
            <text class="a-val">***元</text>
          </view>
          <view class="asset-item">
            <text class="a-label">优惠券</text>
            <text class="a-val">***张</text>
          </view>
          <view class="asset-item code-box">
            <text class="a-label">会员码</text>
            <view class="qr-icon-placeholder"></view>
          </view>
        </view>
  
        <!-- 5. 快捷功能区 (金刚区) -->
        <view class="quick-links">
          <view class="link-item" v-for="(item, index) in quickLinks" :key="index">
            <view class="icon-placeholder"></view>
            <text class="l-title">{{item.title}}</text>
            <text class="l-tag">{{item.tag}}</text>
          </view>
        </view>
  
        <!-- 6. 上滑提示 -->
        <view class="scroll-hint">
          <text class="hint-text">^ 上滑了解更多 ^</text>
        </view>
  
        <!-- 7. 会员活动横幅 -->
        <view class="member-activities">
          <view class="ma-left">
            <text class="ma-eng">MEMBER ACTIVITIES</text>
            <text class="ma-title">会员权益升级</text>
            <text class="ma-title">会员专享特价</text>
            <view class="ma-btn">立即查看特价</view>
          </view>
          <view class="ma-right">
            <!-- 替换为星星图片 -->
            <view class="star-placeholder"></view>
          </view>
        </view>
  
        <!-- 8. 等级活动指南 -->
        <view class="section-title">—— 等级活动指南 ——</view>
        <view class="level-grid">
          <view class="level-card" v-for="(lvl, index) in levels" :key="index" :style="{ backgroundColor: lvl.bgColor, color: lvl.color }">
            <view class="lvl-info">
              <text class="lvl-name">{{lvl.name}}</text>
              <text class="lvl-eng">{{lvl.eng}}</text>
            </view>
            <view class="lvl-badge">V{{index + 1}}</view>
          </view>
        </view>
  
        <!-- 9. 更多快乐服务 -->
        <view class="section-title">—— 更多快乐服务 ——</view>
        <view class="more-services">
          <view class="ms-item">
            <text class="ms-title">完善资料</text>
            <text class="ms-action">生日领惊喜券 >></text>
          </view>
        </view>
        
        <!-- 页面底部安全区留白 -->
        <view class="safe-area-bottom"></view>
      </scroll-view>
    </view>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const quickLinks = ref([
    { title: '充值有礼', tag: '充值赠余额' },
    { title: '社群福利', tag: '0元领燕麦饼' },
    { title: '积分商城', tag: '0元兑换茶饮' },
    { title: '会员特权', tag: '0元领生日蛋糕' }
  ])
  
  const levels = ref([
    { name: '初遇', eng: 'First Meet', bgColor: '#F4E5D3', color: '#6B4A2E' },
    { name: '陪伴', eng: 'Company', bgColor: '#DCC390', color: '#5A4315' },
    { name: '常伴', eng: 'Companion', bgColor: '#E6A28C', color: '#6A2A1A' },
    { name: '臻享', eng: 'Enjoyment', bgColor: '#BA6E5B', color: '#FEEADD' },
    { name: '归属', eng: 'Belonging', bgColor: '#6F4B41', color: '#F1D8CF' },
    { name: '专属', eng: 'Exclusive', bgColor: '#4A2F28', color: '#E8D1C7' }
  ])
  </script>
  
  <style lang="scss" scoped>
  .page-container {
    width: 100vw;
    height: 100vh;
    background-color: #F8F8F8;
    display: flex;
    flex-direction: column;
  }
  
  .scroll-content {
    flex: 1;
    height: 100%;
  }
  
  /* 1. 顶部 Banner */
  .banner-section {
    background: linear-gradient(to bottom, #D2B79A, #E4D1B9, #F1E4CE);
    padding: 100rpx 30rpx 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .banner-title-box {
    text-align: center;
    margin-bottom: 30rpx;
    .title-main {
      font-size: 64rpx;
      font-weight: bold;
      color: #FDF9F1;
      text-shadow: 0 4rpx 8rpx rgba(0,0,0,0.1);
      display: block;
      font-family: serif;
    }
    .title-sub {
      font-size: 24rpx;
      color: #FDF9F1;
      margin-top: 10rpx;
      display: block;
    }
  }
  
  .tags-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 40rpx;
  }
  .tag-item {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid #DDB892;
    border-radius: 12rpx;
    padding: 10rpx 16rpx;
    text-align: center;
    width: 30%;
    box-sizing: border-box;
    .tag-t1 {
      display: block;
      font-size: 26rpx;
      color: #5C3D22;
      font-weight: bold;
    }
    .tag-t2 {
      display: block;
      font-size: 18rpx;
      color: #5C3D22;
    }
  }
  
  .product-showcase {
    width: 100%;
    height: 300rpx;
    background: rgba(255,255,255,0.2);
    border-radius: 20rpx;
    margin-bottom: 40rpx;
  }
  
  .action-btn {
    background-color: #8C6A4F;
    color: #FFF;
    font-size: 30rpx;
    padding: 16rpx 60rpx;
    border-radius: 50rpx;
    font-weight: bold;
  }
  .action-tips {
    font-size: 20rpx;
    color: #999;
    margin-top: 16rpx;
  }
  
  /* 2. 核心服务入口 */
  .main-services {
    background: #FFF;
    display: flex;
    padding: 40rpx 0 20rpx;
    border-radius: 20rpx 20rpx 0 0;
    margin-top: -20rpx;
    position: relative;
    z-index: 2;
  }
  .service-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    .s-title {
      font-size: 36rpx;
      font-weight: bold;
      color: #000;
    }
    .s-desc {
      font-size: 24rpx;
      color: #888;
      margin-top: 8rpx;
    }
  }
  .divider {
    width: 2rpx;
    height: 60rpx;
    background-color: #EEE;
    align-self: center;
  }
  
  /* 新增：点单与月饼到家卡片 */
  .extra-services {
    background: #FFF;
    padding: 0 30rpx 30rpx;
  }
  .es-card {
    background: #FDF9F1;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    padding: 24rpx 0;
    border: 1px solid #F2E3CD;
  }
  .es-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24rpx;
  }
  .es-info {
    display: flex;
    flex-direction: column;
  }
  .es-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
  }
  .es-desc {
    font-size: 20rpx;
    color: #888;
    margin-top: 6rpx;
  }
  .es-action {
    font-size: 22rpx;
    background: #FFF;
    color: #6B4A2E;
    border: 1px solid #6B4A2E;
    padding: 6rpx 16rpx;
    border-radius: 24rpx;
    &.highlight {
      background: #6B4A2E;
      color: #FFF;
    }
  }
  .es-divider {
    width: 2rpx;
    height: 50rpx;
    background-color: #EAD4B8;
  }
  
  /* 3. 通知栏 */
  .notice-bar {
    background: #FDF7E7;
    padding: 16rpx 30rpx;
    overflow: hidden;
    white-space: nowrap;
  }
  .notice-text {
    font-size: 24rpx;
    color: #333;
  }
  
  /* 4. 用户信息 */
  .user-assets-card {
    background: #FFF;
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 30rpx 0;
    border-bottom: 1rpx solid #F0F0F0;
  }
  .asset-item {
    display: flex;
    align-items: baseline;
    .a-label {
      font-size: 26rpx;
      color: #666;
      margin-right: 10rpx;
    }
    .a-val {
      font-size: 32rpx;
      font-weight: bold;
      color: #000;
    }
  }
  .code-box {
    display: flex;
    align-items: center;
  }
  .qr-icon-placeholder {
    width: 40rpx;
    height: 40rpx;
    background: #CCC;
    margin-left: 10rpx;
  }
  
  /* 5. 快捷功能区 */
  .quick-links {
    background: #FFF;
    display: flex;
    padding: 40rpx 20rpx;
    justify-content: space-between;
  }
  .link-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 25%;
    .icon-placeholder {
      width: 80rpx;
      height: 80rpx;
      background: #EEE;
      border-radius: 50%;
      margin-bottom: 16rpx;
    }
    .l-title {
      font-size: 26rpx;
      color: #333;
      font-weight: bold;
    }
    .l-tag {
      font-size: 20rpx;
      color: #C73B25;
      margin-top: 6rpx;
    }
  }
  
  /* 6. 上滑提示 */
  .scroll-hint {
    text-align: center;
    padding: 30rpx 0;
    background: #FFF;
    .hint-text {
      font-size: 22rpx;
      color: #AAA;
    }
  }
  
  /* 7. 会员活动横幅 */
  .member-activities {
    margin: 0 30rpx 40rpx;
    background: linear-gradient(to right, #FFF7F0, #FDF0E2);
    border-radius: 20rpx;
    padding: 40rpx 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
  }
  .ma-left {
    display: flex;
    flex-direction: column;
    .ma-eng {
      font-size: 20rpx;
      color: #555;
      font-weight: bold;
      margin-bottom: 10rpx;
    }
    .ma-title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      line-height: 1.4;
    }
    .ma-btn {
      margin-top: 20rpx;
      background: #E8B983;
      color: #FFF;
      font-size: 24rpx;
      padding: 8rpx 24rpx;
      border-radius: 30rpx;
      align-self: flex-start;
    }
  }
  .star-placeholder {
    width: 140rpx;
    height: 140rpx;
    background: #F4C46A;
    border-radius: 20rpx;
    transform: rotate(45deg);
  }
  
  /* 8. 等级活动指南 */
  .section-title {
    text-align: center;
    font-size: 28rpx;
    color: #666;
    margin: 20rpx 0 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .level-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 0 30rpx;
    justify-content: space-between;
  }
  .level-card {
    width: 48%;
    height: 140rpx;
    border-radius: 16rpx;
    margin-bottom: 24rpx;
    padding: 24rpx;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
  }
  .lvl-info {
    display: flex;
    flex-direction: column;
    .lvl-name {
      font-size: 32rpx;
      font-weight: bold;
    }
    .lvl-eng {
      font-size: 20rpx;
      margin-top: 8rpx;
      opacity: 0.8;
    }
  }
  .lvl-badge {
    font-size: 32rpx;
    font-weight: bold;
    font-style: italic;
    border: 2rpx solid currentColor;
    padding: 4rpx 10rpx;
    border-radius: 8rpx;
  }
  
  /* 9. 更多服务 */
  .more-services {
    padding: 0 30rpx;
  }
  .ms-item {
    background: #FFF;
    border-radius: 16rpx;
    padding: 40rpx 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    .ms-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    .ms-action {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  /* 页面底部留白，适配没有底部导航栏的情况下的系统小白条 */
  .safe-area-bottom {
    height: 60rpx;
    padding-bottom: env(safe-area-inset-bottom);
  }
  </style>