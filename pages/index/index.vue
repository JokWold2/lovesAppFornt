<template>
  <view class="container">
    <!-- 自定义导航栏（可选，此处为了还原效果，使用 view 模拟） -->
    <!-- 状态栏占位，根据平台动态设置高度 -->
    <!-- <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view> -->

    <!-- 顶部轮播图 -->
    <swiper class="swiper-container" indicator-dots="true" indicator-color="#ddd" indicator-active-color="#fff6df" autoplay="true" circular="true" @change="onSwiperChange">
      <swiper-item v-for="(item, index) in swiperItems" :key="index">
        <view class="swiper-item-content">
          <image :src="item.image" class="swiper-image" mode="aspectFill" />
          <view class="swiper-mask">
            <text class="swiper-text">{{ item.text }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 九宫格功能菜单 -->
    <view class="grid-menu">
      <view class="grid-item" v-for="(item, index) in gridItems" :key="index" @click="goPage(item.page)">
        <view class="icon-wrapper">
          <uni-icons :type="item.icon" size="30" color="#FFFFFF" class="grid-icon"></uni-icons>
          <!-- 复杂的组合图标建议用图片或自定义 SVG -->
        </view>
        <text class="grid-text">{{ item.name }}</text>
      </view>
    </view>

    <!-- 列表卡片 -->
    <view class="list-card">
      <uni-list>
        <view v-for="(item, index) in listItems" :key="index" @click="goPage(item.page)">
          <uni-list-item  show-arrow="true"  :border="index !== listItems.length - 1">
            <template v-slot:header v-if="false" >
              <view class="list-icon-wrapper">
                <uni-icons :type="item.icon" size="24" color="#fff6df" class="list-icon"></uni-icons>
                <!-- 特殊：第一个项的徽章 -->
                <view v-if="index === 0" class="badge-icon">初用者</view>
              </view>
            </template>
            <template v-slot:body>
              <text class="list-text">{{ item.name }}</text>
            </template>
          </uni-list-item>
       
        </view>
      </uni-list>
    </view>
    <view style="height: 90rpx;">
      
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 假设的状态栏高度
const statusBarHeight = ref(44);

// 获取状态栏高度（实际项目需要）
// onMounted(() => {
//   uni.getSystemInfo({
//     success: (res) => {
//       statusBarHeight.value = res.statusBarHeight;
//     }
//   });
// });

// 轮播图数据
const swiperItems = ref([
  { image: 'https://via.placeholder.com/750x400/CCCCCC/FFFFFF?text=Family+Scene+1', text: '幸福相遇・啟航美好人生' },
  { image: 'https://via.placeholder.com/750x400/BBBBBB/FFFFFF?text=Family+Scene+2', text: '幸福相遇・啟航美好人生' },
  { image: 'https://via.placeholder.com/750x400/AAAAAA/FFFFFF?text=Family+Scene+3', text: '幸福相遇・啟航美好人生' },
]);
const currentSwiperIndex = ref(0);
const onSwiperChange = (e) => {
  currentSwiperIndex.value = e.detail.current;
};

// 九宫格数据
// 提示：uni-icons 的图标可能不完全匹配，复杂图标建议使用 <image>
const gridItems = ref([
  { name: '祝福', icon: 'gift', page: '/pages/wishes/index' }, // 类似灯笼，这里用礼物代替
  { name: '分析工具', icon: 'map', page: '/pages/analysis/index' }, // 类似饼图，用chart代替
  { name: '通知', icon: 'mail-open', page: '/pages/notification/index' },
  { name: '搜尋候選人', icon: 'search', page: '/pages/searchPerson/searchPerson' }, // 类似人像+放大镜，这里用search代替
  { name: '關心管理', icon: 'heart-filled', page: '/pages/care/index' },
  { name: '家庭交流管理', icon: 'home', page: '/pages/family/index' }, // 类似房子+对话泡，用home代替
]);

// 列表数据
const listItems = ref([
  { name: '初用者', icon: 'person-filled', page: '/pages/my/myFile/myFile' }, // 这个项的图标是自定义徽章
  { name: '祝福子女政策', icon: 'file-text', page: '/pages/policy/index' },
  { name: '註冊', icon: 'personadd-filled', page: '/pages/auth/register' },
  { name: '協助者手冊', icon: 'book-filled', page: '/pages/manual/helper' },
  { name: '會員手冊', icon: 'vip', page: '/pages/manual/member' }, // 类似卡片，这里用vip代替
  { name: '連絡', icon: 'phone-filled', page: '/pages/contact/index' },
]);

// 跳转页面
const goPage = (url) => {
  console.log(url);
  
  uni.navigateTo({
    url: url
  });
};
</script>
<style scoped lang="scss">
// 定义主题色
$primary-color: #fff6df;
$background-color: #fff6df;
$text-color-black: #333;
$text-color-grey: #666;

.container {
  padding-bottom: 0;
  background-color: $background-color;
  min-height: 100vh;
}

// 轮播图样式
.swiper-container {
  height: 250px;
  position: relative;

  .swiper-item-content {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .swiper-image {
    width: 100%;
    height: 100%;
  }

  .swiper-mask {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.6) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 20px;
  }

  .swiper-text {
    color: #333333;
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 1px;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
  }

  // 修改为 Vue3 标准的深度选择器
  :deep(.uni-swiper-dot) {
    width: 8px;
    height: 8px;
    margin: 0 4px;
    opacity: 0.8;
  }

  :deep(.uni-swiper-dot-active) {
    width: 10px;
    height: 10px;
    background-color: $primary-color;
  }
}

// 九宫格菜单样式
.grid-menu {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  padding: 20px 15px;
  background-color: #FFFFFF;
  margin-bottom: 15px;

  .grid-item {
    width: 30%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 15px;

    .icon-wrapper {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #fff6df;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 8px;
    }

    .grid-icon {
      :deep(.uni-icons) {
        color: $primary-color !important;
      }
    }

    .grid-text {
      font-size: 14px;
      color: $text-color-black;
      text-align: center;
    }
  }
}

// 列表卡片样式
.list-card {
  margin: 0 15px;
  background-color: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

  .uni-list {
    margin: 0;
  }

  .uni-list-item {
    height: 55px;

    // 修改为 Vue3 标准的深度选择器
    :deep(.uni-list-item__container) {
      padding: 0 15px;
      display: flex;
      align-items: center;
    }
  }

  .list-icon-wrapper {
    display: flex;
    align-items: center;
    position: relative;
    width: 40px;
    justify-content: flex-start;
  }

  .list-icon {
    margin-right: 15px;
  }

  .badge-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: #fff6df;
    color: #333333;
    font-size: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    line-height: 10px;
    position: absolute;
    top: -2px;
    left: -2px;
    border: 2px solid #FFFFFF;
    z-index: 1;
  }

  .uni-list-item:nth-child(1) .list-icon {
      display: none;
  }
  .uni-list-item:nth-child(1) .badge-icon {
      position: static;
      margin-right: 15px;
      border: none;
      font-size: 10px;
      padding: 2px;
  }

  .list-text {
    font-size: 16px;
    color: $text-color-black;
    flex: 1;
  }
}

// 全局覆盖补丁（使用正确的语法）
.grid-item :deep(.uni-icons) {
    color: $primary-color !important;
}

.list-card .uni-list-item:nth-child(1) :deep(.uni-list-item__container) {
    .list-icon-wrapper {
        .badge-icon {
            font-size: 10px;
            font-weight: bold;
            letter-spacing: -0.5px;
        }
    }
}
</style>
