<template>
    <view class="page-container">
      <!-- 顶部固定区域 -->
      <view class="header-fixed">
        <!-- 1. 自定义导航栏 -->
        <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
          <view class="nav-content">
            <view class="nav-left">
              <view class="icon-home"></view>
              <view class="icon-search"></view>
            </view>
            <text class="nav-title">商城</text>
            <view class="nav-right">
              <!-- 胶囊占位 -->
            </view>
          </view>
        </view>
  
        <!-- 2. 分类滚动栏 -->
        <scroll-view scroll-x class="category-scroll" :show-scrollbar="false">
          <view class="category-list">
            <view 
              class="category-item" 
              :class="{ active: currentCategory === index }"
              v-for="(cat, index) in categories" 
              :key="index"
              @click="currentCategory = index"
            >
              {{ cat }}
            </view>
          </view>
        </scroll-view>
  
        <!-- 3. 筛选排序栏 -->
        <view class="filter-bar">
          <view class="sort-options">
            <view class="sort-item active">
              <text>综合</text>
              <view class="underline"></view>
            </view>
            <view class="sort-item"><text>销量</text></view>
            <view class="sort-item"><text>新品</text></view>
            <view class="sort-item price-sort">
              <text>价格</text>
              <view class="sort-arrows">
                <view class="arrow-up"></view>
                <view class="arrow-down"></view>
              </view>
            </view>
          </view>
          <view class="layout-toggle">
            <view class="icon-grid"></view>
          </view>
        </view>
      </view>
  
      <!-- 4. 商品列表瀑布流/网格区 -->
      <scroll-view scroll-y class="product-scroll-area">
        <view class="product-grid">
          <view class="product-card" v-for="(item, index) in productList" :key="index">
            
            <!-- 商品主图 (拍下须知特殊处理) -->
            <view class="image-box" :class="{ 'special-bg': item.isNotice }">
              <image v-if="!item.isNotice" class="product-img" :src="item.image" mode="aspectFill"></image>
              <view v-else class="notice-text">
                <text class="nt-main">拍下</text>
                <text class="nt-sub">须知</text>
              </view>
            </view>
  
            <!-- 商品信息 -->
            <view class="product-info">
              <text class="product-title">{{ item.title }}</text>
              <text class="product-desc">{{ item.desc }}</text>
              
              <!-- 满减标签 -->
              <view class="tags-row" v-if="item.tags && item.tags.length > 0">
                <text class="tag-item" v-for="(tag, tIdx) in item.tags" :key="tIdx">{{ tag }}</text>
              </view>
  
              <!-- 底部价格与购物车 -->
              <view class="price-row" v-if="item.price">
                <view class="price-box">
                  <text class="symbol">¥</text>
                  <text class="price">{{ item.price }}</text>
                </view>
                <view class="add-cart-btn">
                  <view class="icon-plus"></view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <!-- 底部安全距离占位 -->
        <view class="safe-bottom-spacer"></view>
      </scroll-view>
  
      <!-- 5. 底部 TabBar (完全还原图示) -->
      <view class="custom-tabbar">
        <view class="tab-item">
          <view class="tab-icon icon-tab-home"></view>
          <text>首页</text>
        </view>
        <view class="tab-item">
          <view class="tab-icon icon-tab-order"></view>
          <text>点单</text>
        </view>
        <view class="tab-item">
          <view class="tab-icon icon-tab-cake"></view>
          <text>蛋糕</text>
        </view>
        <view class="tab-item active">
          <view class="tab-icon icon-tab-truck"></view>
          <text>月饼到家</text>
        </view>
        <view class="tab-item">
          <view class="tab-icon icon-tab-mine"></view>
          <text>我的</text>
        </view>
      </view>
    </view>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const statusBarHeight = ref(44) // 状态栏高度
  
  const categories = ref(['全部', '月饼礼盒', '揽月尝鲜', '活动套餐', '饼干礼盒'])
  const currentCategory = ref(0)
  
  // 模拟商品数据[cite: 4]
  const productList = ref([
    {
      image: '/static/mooncake-red-1.png',
      title: '广式双黄莲蓉月饼（电商盒装）',
      desc: '广式双黄莲蓉月饼4个，克重72...',
      tags: [],
      price: '115',
      isNotice: false
    },
    {
      image: '/static/mooncake-red-2.png',
      title: '五仁月饼（电商盒装）',
      desc: '广式五仁月饼4个，克重720g, ...',
      tags: ['满2件减30元', '满4件减60元', '满6件减90元'],
      price: '135',
      isNotice: false
    },
    {
      image: '/static/mooncake-yellow.png',
      title: '广式双黄纯白莲蓉月饼（电商盒装）',
      desc: '广式双黄纯白莲蓉月饼4个, 克...',
      tags: ['满2件减30元', '满4件减60元', '满6件减90元'],
      price: '145',
      isNotice: false
    },
    {
      image: '',
      title: '需要退订单！修改地址等！请拍这个链接！并备注是需要退订还是改地址',
      desc: '工作日48小时发货, 周五14:00...',
      tags: [],
      price: '0.01',
      isNotice: true // 特殊的拍下须知卡片
    }
  ])
  </script>
  
  <style lang="scss" scoped>
  .page-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #F7F7F7; // 整体灰色背景[cite: 4]
  }
  
  /* ================= 固定头部 ================= */
  .header-fixed {
    background-color: #FFFFFF;
    z-index: 100;
  }
  
  .custom-nav-bar {
    width: 100%;
  }
  .nav-content {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30rpx;
  }
  .nav-left {
    display: flex;
    align-items: center;
    gap: 30rpx;
    width: 160rpx;
  }
  /* CSS简易图标占位 */
  .icon-home { width: 36rpx; height: 36rpx; border: 3rpx solid #333; border-radius: 6rpx 6rpx 0 0; position: relative; }
  .icon-home::before { content:''; position:absolute; top:-12rpx; left:-6rpx; border: 18rpx solid transparent; border-bottom-color: #333; }
  .icon-search { width: 32rpx; height: 32rpx; border: 3rpx solid #333; border-radius: 50%; position: relative; }
  .icon-search::after { content:''; position:absolute; width: 14rpx; height: 3rpx; background: #333; bottom: -4rpx; right: -8rpx; transform: rotate(45deg); }
  .nav-title { font-size: 34rpx; font-weight: bold; color: #333; }
  .nav-right { width: 160rpx; } // 留白平衡
  
  /* 分类栏 */
  .category-scroll {
    width: 100%;
    white-space: nowrap;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #F0F0F0;
  }
  .category-list {
    display: inline-flex;
    padding: 0 20rpx;
  }
  .category-item {
    font-size: 28rpx;
    color: #666;
    padding: 10rpx 30rpx;
    margin: 0 10rpx;
    border-radius: 30rpx;
    &.active {
      background-color: #EA6328;
      color: #FFFFFF;
      font-weight: bold;
    }
  }
  
  /* 筛选栏 */
  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 30rpx;
  }
  .sort-options {
    display: flex;
    gap: 50rpx;
  }
  .sort-item {
    font-size: 28rpx;
    color: #666;
    position: relative;
    display: flex;
    align-items: center;
    padding-bottom: 10rpx;
    &.active {
      color: #333;
      font-weight: bold;
      .underline {
        position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
        width: 40rpx; height: 6rpx; background-color: #EA6328; border-radius: 4rpx;
      }
    }
  }
  .price-sort {
    gap: 4rpx;
  }
  .sort-arrows {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .arrow-up { border: 8rpx solid transparent; border-bottom-color: #CCC; }
    .arrow-down { border: 8rpx solid transparent; border-top-color: #CCC; }
  }
  .icon-grid {
    width: 32rpx; height: 32rpx;
    background: url('data:image/svg+xml;utf8,<svg fill="%23999" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/></svg>') no-repeat center/contain;
  }
  
  /* ================= 瀑布流商品列表 ================= */
  .product-scroll-area {
    flex: 1;
    height: 0;
    padding: 20rpx;
  }
  .product-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  .product-card {
    width: 48.5%; // 两列布局
    background-color: #FFFFFF;
    border-radius: 16rpx;
    margin-bottom: 24rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
  }
  
  /* 商品图片与特殊卡片 */
  .image-box {
    width: 100%;
    height: 340rpx;
    background-color: #F8F8F8;
    display: flex;
    justify-content: center;
    align-items: center;
    &.special-bg {
      background-color: #F8E7CD; // 拍下须知的淡黄色背景[cite: 4]
    }
  }
  .product-img {
    width: 100%;
    height: 100%;
  }
  .notice-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #D3A261;
    font-weight: bold;
    .nt-main { font-size: 70rpx; line-height: 1.1; }
    .nt-sub { font-size: 70rpx; line-height: 1.1; }
  }
  
  /* 商品信息区 */
  .product-info {
    padding: 20rpx;
  }
  .product-title {
    font-size: 28rpx;
    color: #333;
    font-weight: bold;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2; // 最多显示两行
    overflow: hidden;
    margin-bottom: 8rpx;
  }
  .product-desc {
    font-size: 22rpx;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    margin-bottom: 16rpx;
  }
  
  /* 标签行 */
  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
    margin-bottom: 20rpx;
  }
  .tag-item {
    font-size: 18rpx;
    color: #D08967;
    border: 1rpx solid #E1BBA8;
    padding: 2rpx 8rpx;
    border-radius: 4rpx;
  }
  
  /* 价格与购物车行 */
  .price-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .price-box {
    color: #E75928;
    font-weight: bold;
    .symbol { font-size: 22rpx; margin-right: 4rpx; }
    .price { font-size: 36rpx; }
  }
  .add-cart-btn {
    width: 44rpx; height: 44rpx;
    background-color: #EA6328;
    border-radius: 50%;
    display: flex; justify-content: center; align-items: center;
  }
  .icon-plus {
    width: 20rpx; height: 4rpx; background: #FFF; position: relative;
    &::after { content: ''; position: absolute; width: 4rpx; height: 20rpx; background: #FFF; top: -8rpx; left: 8rpx; }
  }
  
  .safe-bottom-spacer { height: 140rpx; }
  
  /* ================= 底部 TabBar ================= */
  .custom-tabbar {
    position: fixed;
    bottom: 0; left: 0; width: 100%; height: 110rpx;
    background: #FFF; border-top: 1rpx solid #EEE;
    display: flex; justify-content: space-around; align-items: center;
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 101;
  }
  .tab-item {
    display: flex; flex-direction: column; align-items: center;
    font-size: 20rpx; color: #666;
    &.active { color: #EA6328; }
  }
  .tab-icon { width: 48rpx; height: 48rpx; margin-bottom: 6rpx; }
  // 简易图标占位
  .icon-tab-home { border: 3rpx solid #333; border-radius: 8rpx 8rpx 0 0; }
  .icon-tab-order { border: 3rpx solid #333; border-radius: 6rpx; }
  .icon-tab-cake { border: 3rpx solid #333; border-radius: 50% 50% 10rpx 10rpx; }
  .icon-tab-truck { background: #EA6328; border-radius: 8rpx; } // 高亮的橘色小车占位
  .icon-tab-mine { border: 3rpx solid #333; border-radius: 50%; }
  </style>