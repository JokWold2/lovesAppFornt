<template>
    <view class="page-container">
        <!-- 顶部自定义导航栏 -->
        <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
            <view class="nav-content">
                <!-- 左侧首页图标 -->
                <view class="nav-left">
                    <view class="icon-home"></view>
                </view>

                <!-- 中间 Tab 切换 -->
                <view class="nav-tabs">
                    <view class="tab-item" :class="{ active: currentTab === 0 }" @click="switchTab(0)">附近</view>
                    <view class="tab-item" :class="{ active: currentTab === 1 }" @click="switchTab(1)">收藏</view>
                </view>

                <!-- 右侧定位控制 -->
                <view class="nav-right">
                    <view class="icon-navigation"></view>
                    <view class="icon-target"></view>
                </view>
            </view>
        </view>

        <!-- 搜索与城市选择栏 -->
        <view class="search-header">
            <view class="search-bar">
                <view class="city-selector">
                    <text class="city-name">成都市</text>
                    <text class="arrow-down"></text>
                </view>
                <view class="divider"></view>
                <input class="search-input" type="text" placeholder="请输入门店名称或地址关键字"
                    placeholder-class="placeholder-style" />
            </view>
            <!-- 地图与列表切换按钮 -->
            <view class="map-toggle-btn" @click="toggleMapView">
                <view :class="isMapView ? 'icon-list' : 'icon-map'"></view>
            </view>
        </view>

        <!-- ================= 页面主体内容 ================= -->
        <view class="main-content">

            <!-- 1. 列表模式 -->
            <block v-if="!isMapView">

                <!-- 1.1 附近 (还原图中的空状态) -->
                <view class="empty-state" v-if="currentTab === 0">
                    <view class="empty-image-placeholder">
                        <!-- 这里替换为实际的店铺插画图片 -->
                        <view class="shop-icon-mock"></view>
                    </view>
                    <text class="empty-text">当前城市没有门店</text>
                    <view class="action-btn">选择其他城市</view>
                </view>

                <!-- 1.2 收藏 (补充设计的收藏门店列表) -->
                <scroll-view scroll-y class="store-list" v-if="currentTab === 1">
                    <view class="store-card" v-for="(store, index) in favoriteStores" :key="index">
                        <view class="store-header">
                            <text class="store-name">{{ store.name }}</text>
                            <text class="store-distance">{{ store.distance }}</text>
                        </view>
                        <view class="store-tags">
                            <text class="tag" v-if="store.isOpen">营业中</text>
                            <text class="time">{{ store.time }}</text>
                        </view>
                        <view class="store-address">{{ store.address }}</text>
                            <view class="store-actions">
                                <view class="icon-heart-active"></view>
                                <view class="order-btn">去点单</view>
                            </view>
                        </view>
                        <view class="no-more">没有更多了~</view>
                </scroll-view>
            </block>

            <!-- 2. 地图模式 (补充设计的地图选店) -->
            <block v-if="isMapView">
                <view class="map-container">
                    <!-- 注意：在小程序/APP中使用真实map组件。H5下需配置对应地图SDK -->
                    <map class="full-map" :latitude="latitude" :longitude="longitude" :markers="markers"
                        scale="14"></map>

                    <!-- 底部悬浮的选中门店信息 -->
                    <view class="map-bottom-panel">
                        <view class="panel-store-card">
                            <view class="store-info-left">
                                <text class="store-name">成都春熙路旗舰店</text>
                                <text class="store-address">锦江区春熙路步步高广场一楼</text>
                                <text class="store-time">营业时间: 08:00 - 22:30</text>
                            </view>
                            <view class="store-info-right">
                                <text class="distance">距您 1.2km</text>
                                <view class="nav-btn">导航</view>
                                <view class="order-btn">去点单</view>
                            </view>
                        </view>
                    </view>
                </view>
            </block>

        </view>
    </view>
</template>

<script setup>
import { ref } from 'vue'

// 状态栏高度适配 (刘海屏)
const statusBarHeight = ref(44) // 默认值，实际开发中可通过 uni.getSystemInfoSync().statusBarHeight 获取

const currentTab = ref(0) // 0: 附近, 1: 收藏
const isMapView = ref(false) // 是否开启地图模式

// 切换附近/收藏
const switchTab = (index) => {
    currentTab.value = index
    isMapView.value = false // 切换tab时默认关闭地图
}

// 切换列表/地图模式
const toggleMapView = () => {
    isMapView.value = !isMapView.value
}

// 补充设计的收藏数据
const favoriteStores = ref([
    {
        name: '高新大源店',
        distance: '3.5km',
        isOpen: true,
        time: '08:00 - 22:00',
        address: '成都市武侯区剑南大道中段世豪广场1楼'
    },
    {
        name: '天府三街店',
        distance: '5.2km',
        isOpen: true,
        time: '07:30 - 21:00',
        address: '成都市武侯区天府三街腾讯大厦A座底商'
    }
])

// 地图模式数据
const latitude = ref(30.5728)
const longitude = ref(104.0668)
const markers = ref([
    {
        id: 1,
        latitude: 30.5728,
        longitude: 104.0668,
        title: '成都春熙路旗舰店',
        iconPath: '/static/marker.png', // 需替换为真实图片路径
        width: 30,
        height: 30,
        callout: {
            content: '春熙路旗舰店',
            color: '#ffffff',
            fontSize: 12,
            borderRadius: 4,
            bgColor: '#E65C2B',
            padding: 6,
            display: 'ALWAYS'
        }
    }
])
</script>

<style lang="scss" scoped>
.page-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #FFFFFF;
}

/* ================= 自定义导航栏 ================= */
.custom-nav-bar {
    background-color: #FFFFFF;
    z-index: 99;
}

.nav-content {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30rpx;
}

.nav-left,
.nav-right {
    display: flex;
    align-items: center;
    width: 120rpx; // 占位保持居中对齐
}

.nav-right {
    justify-content: flex-end;
    gap: 20rpx;
}

/* 图标占位 (使用CSS模拟，开发时请替换为图片或字体图标) */
.icon-home {
    width: 36rpx;
    height: 36rpx;
    border: 3rpx solid #333;
    border-radius: 8rpx 8rpx 0 0;
    position: relative;
}

.icon-home::before {
    content: '';
    position: absolute;
    top: -10rpx;
    left: -6rpx;
    border: 18rpx solid transparent;
    border-bottom-color: #333;
}

.icon-navigation {
    width: 0;
    height: 0;
    border: 16rpx solid transparent;
    border-bottom-color: #333;
    transform: rotate(45deg);
}

.icon-target {
    width: 36rpx;
    height: 36rpx;
    border: 4rpx solid #333;
    border-radius: 50%;
    position: relative;
}

.icon-target::after {
    content: '';
    position: absolute;
    top: 12rpx;
    left: 12rpx;
    width: 12rpx;
    height: 12rpx;
    background: #333;
    border-radius: 50%;
}

.nav-tabs {
    display: flex;
    gap: 40rpx;
}

.tab-item {
    font-size: 32rpx;
    color: #666;
    font-weight: 500;
    position: relative;
    padding-bottom: 8rpx;

    &.active {
        color: #333;
        font-weight: bold;

        &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 40rpx;
            height: 6rpx;
            background-color: #DC6E43; // 橘色下划线
            border-radius: 4rpx;
        }
    }
}

/* ================= 搜索栏 ================= */
.search-header {
    display: flex;
    align-items: center;
    padding: 10rpx 30rpx 20rpx;
    background-color: #FFFFFF;
    box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.02);
    z-index: 98;
}

.search-bar {
    flex: 1;
    height: 72rpx;
    background-color: #F6F6F6;
    border-radius: 36rpx;
    display: flex;
    align-items: center;
    padding: 0 30rpx;
}

.city-selector {
    display: flex;
    align-items: center;

    .city-name {
        font-size: 28rpx;
        color: #333;
        font-weight: bold;
    }

    .arrow-down {
        margin-left: 8rpx;
        border: 8rpx solid transparent;
        border-top-color: #666;
        margin-top: 8rpx;
    }
}

.divider {
    width: 2rpx;
    height: 24rpx;
    background-color: #DDD;
    margin: 0 20rpx;
}

.search-input {
    flex: 1;
    font-size: 26rpx;
    color: #333;
}

.placeholder-style {
    color: #999;
}

.map-toggle-btn {
    width: 72rpx;
    height: 72rpx;
    background: #F6F6F6;
    border-radius: 50%;
    margin-left: 20rpx;
    display: flex;
    justify-content: center;
    align-items: center;
}

.icon-map {
    width: 36rpx;
    height: 36rpx;
    background: url('data:image/svg+xml;utf8,<svg fill="%23333" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>') no-repeat center/contain;
}

.icon-list {
    width: 36rpx;
    height: 36rpx;
    background: url('data:image/svg+xml;utf8,<svg fill="%23333" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>') no-repeat center/contain;
}


/* ================= 页面主体内容 ================= */
.main-content {
    flex: 1;
    background-color: #FFFFFF;
    position: relative;
    overflow: hidden;
}

/* 1.1 空状态 (附近) */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding-bottom: 200rpx;
}

.empty-image-placeholder {
    width: 300rpx;
    height: 300rpx;
    margin-bottom: 40rpx;
    display: flex;
    justify-content: center;
    align-items: center;
}

.shop-icon-mock {
    width: 240rpx;
    height: 200rpx;
    background: #F0F0F0;
    border-radius: 20rpx;
    border-top: 40rpx solid #E4E4E4;
    position: relative;

    &::after {
        content: '';
        position: absolute;
        width: 60rpx;
        height: 80rpx;
        background: #E4E4E4;
        bottom: 0;
        right: 40rpx;
    }
}

.empty-text {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 60rpx;
}

.action-btn {
    background-color: #DC6E43;
    color: #FFF;
    font-size: 32rpx;
    padding: 24rpx 80rpx;
    border-radius: 50rpx;
    font-weight: bold;
}

/* 1.2 收藏列表 */
.store-list {
    height: 100%;
    background: #F8F8F8;
    padding: 20rpx 30rpx;
    box-sizing: border-box;
}

.store-card {
    background: #FFF;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
}

.store-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
}

.store-name {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
}

.store-distance {
    font-size: 24rpx;
    color: #999;
}

.store-tags {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 16rpx;
}

.tag {
    background: #E8F5E9;
    color: #4CAF50;
    font-size: 20rpx;
    padding: 4rpx 10rpx;
    border-radius: 4rpx;
}

.time {
    font-size: 22rpx;
    color: #666;
}

.store-address {
    font-size: 24rpx;
    color: #666;
    margin-bottom: 30rpx;
}

.store-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 30rpx;
}

.icon-heart-active {
    width: 40rpx;
    height: 40rpx;
    background: url('data:image/svg+xml;utf8,<svg fill="%23DC6E43" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>') no-repeat center/contain;
}

.order-btn {
    background: #DC6E43;
    color: #FFF;
    font-size: 24rpx;
    padding: 12rpx 36rpx;
    border-radius: 30rpx;
}

.no-more {
    text-align: center;
    font-size: 24rpx;
    color: #CCC;
    padding: 20rpx 0;
}

/* 2. 地图视图 */
.map-container {
    position: relative;
    width: 100%;
    height: 100%;
}

.full-map {
    width: 100%;
    height: 100%;
}

.map-bottom-panel {
    position: absolute;
    bottom: 40rpx;
    left: 30rpx;
    right: 30rpx;
}

.panel-store-card {
    background: #FFF;
    border-radius: 20rpx;
    padding: 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
}

.store-info-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.store-info-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 16rpx;
}

.nav-btn {
    background: #F6F6F6;
    color: #333;
    font-size: 22rpx;
    padding: 8rpx 20rpx;
    border-radius: 24rpx;
}
</style>