<template>
    <view class="antique-page">
      <!-- 分类筛选 -->
      <view class="category-wrapper">
        <!-- <scroll-view class="category-scroll" scroll-x="true" show-scrollbar="false">
          <view class="category-content">
            <view
              class="category-pill"
              v-for="(cat, index) in categories"
              :key="index"
              :class="{ active: currentCategory === cat }"
              @click="currentCategory = cat"
            >
              <text>{{ cat }}</text>
            </view>
          </view>
        </scroll-view> -->
      </view>

      <!-- 排序切换 -->
      <view class="sort-row">
        <view class="sort-item" :class="{ active: sortType === 'latest' }" @click="sortType = 'latest'">
          <text>{{ t('antique.latest') }}</text>
        </view>
        <view class="sort-item" :class="{ active: sortType === 'hot' }" @click="sortType = 'hot'">
          <text>{{ t('antique.hot') }}</text>
        </view>
      </view>

      <!-- 首次加载 -->
      <view v-if="loading" class="state-box">
        <text class="state-text">{{ t('antique.loading') }}</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="filteredItems.length === 0" class="state-box">
        <text class="state-icon">🏺</text>
        <text class="state-text">{{ t('antique.empty') }}</text>
        <text class="state-sub">{{ t('antique.emptyHint') }}</text>
      </view>

      <!-- 瀑布流双栏 -->
      <view v-else class="waterfall">
        <view class="waterfall-col">
          <view
            class="antique-card"
            v-for="item in leftColumn"
            :key="item.id"
            @click="openDetail(item)"
          >
            <image class="cover-img" :src="item.cover" mode="widthFix" :style="{ height: item.coverHeight + 'rpx' }"></image>
            <view class="card-body">
              <text class="title">{{ item.title }}</text>
              <text class="desc">{{ item.desc }}</text>
              <view class="tag-row">
                <text class="era-tag">{{ item.era }}</text>
              </view>
              <view class="author-row">
                <image class="author-avatar" :src="item.author.avatar" mode="aspectFill"></image>
                <text class="author-name">{{ item.author.name }}</text>
                <view class="collect-btn" @click.stop="toggleCollect(item)">
                  <text class="collect-icon">{{ item.isCollected ? '★' : '☆' }}</text>
                  <text class="collect-num">{{ item.collectCount }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="waterfall-col">
          <view
            class="antique-card"
            v-for="item in rightColumn"
            :key="item.id"
            @click="openDetail(item)"
          >
            <image class="cover-img" :src="item.cover" mode="widthFix" :style="{ height: item.coverHeight + 'rpx' }"></image>
            <view class="card-body">
              <text class="title">{{ item.title }}</text>
              <text class="desc">{{ item.desc }}</text>
              <view class="tag-row">
                <text class="era-tag">{{ item.era }}</text>
              </view>
              <view class="author-row">
                <image class="author-avatar" :src="item.author.avatar" mode="aspectFill"></image>
                <text class="author-name">{{ item.author.name }}</text>
                <view class="collect-btn" @click.stop="toggleCollect(item)">
                  <text class="collect-icon">{{ item.isCollected ? '★' : '☆' }}</text>
                  <text class="collect-num">{{ item.collectCount }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 发布悬浮按钮 -->
      <view class="fab-button" @click="handlePublish">
        <uni-icons type="plusempty" size="24" color="#000"></uni-icons>
      </view>
    </view>
  </template>

  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { t } from '@/utils/localeRuntime.js'

  // ------- 分类 & 排序 -------
  const categories = ref(['全部', '瓷器', '玉器', '书画', '钱币', '家具', '杂项']);
  const currentCategory = ref('全部');
  const sortType = ref('latest');
  const loading = ref(false);

  // ------- 数据（先做页面，暂用本地占位数据，不接口） -------
  const items = ref([]);

  function buildMockData() {
    const mock = [
      { id: 1, title: '清乾隆 青花缠枝莲纹瓶', desc: '包浆自然，青花发色沉稳，家传三代。', era: '清代', category: '瓷器', cover: 'https://picsum.photos/seed/antique1/400/560' },
      { id: 2, title: '汉代 白玉蝉', desc: '玉质温润，沁色自然，雕工古朴。', era: '汉代', category: '玉器', cover: 'https://picsum.photos/seed/antique2/400/420' },
      { id: 3, title: '齐白石 花鸟立轴', desc: '纸本设色，款识清晰，附鉴定证书。', era: '近代', category: '书画', cover: 'https://picsum.photos/seed/antique3/400/500' },
      { id: 4, title: '光绪元宝 银币', desc: '品相极佳，边齿完整，存世量稀少。', era: '清代', category: '钱币', cover: 'https://picsum.photos/seed/antique4/400/380' },
      { id: 5, title: '明式黄花梨圈椅', desc: '一木一器，包浆浑厚，结构完整无修。', era: '明代', category: '家具', cover: 'https://picsum.photos/seed/antique5/400/600' },
      { id: 6, title: '宋代 建盏兔毫盏', desc: '油滴斑纹自然，胎质厚重，宋代茶器代表。', era: '宋代', category: '瓷器', cover: 'https://picsum.photos/seed/antique6/400/440' },
      { id: 7, title: '民国铜镜', desc: '纹饰精美，铜质细腻，附木盒。', era: '民国', category: '杂项', cover: 'https://picsum.photos/seed/antique7/400/480' },
      { id: 8, title: '战国 蚁鼻钱一组', desc: '共12枚，锈色统一，出自同一窖藏。', era: '战国', category: '钱币', cover: 'https://picsum.photos/seed/antique8/400/360' }
    ];

    return mock.map((m) => ({
      ...m,
      coverHeight: 320 + (m.id % 4) * 60,
      author: {
        name: ['藏友老周', '古玩阁主', '沐雨轩', '拾遗斋'][m.id % 4],
        avatar: `https://i.pravatar.cc/80?img=${m.id + 10}`
      },
      isCollected: false,
      collectCount: 10 + m.id * 3
    }));
  }

  onMounted(() => {
    loading.value = true;
    // 先做页面：本地模拟数据，后续替换为真实接口请求
    setTimeout(() => {
      items.value = buildMockData();
      loading.value = false;
    }, 200);
  });

  // ------- 筛选 + 瀑布流分栏 -------
  const filteredItems = computed(() => {
    if (currentCategory.value === '全部') return items.value;
    return items.value.filter((i) => i.category === currentCategory.value);
  });

  const leftColumn = computed(() => filteredItems.value.filter((_, idx) => idx % 2 === 0));
  const rightColumn = computed(() => filteredItems.value.filter((_, idx) => idx % 2 === 1));

  // ------- 交互 -------
  function toggleCollect(item) {
    item.isCollected = !item.isCollected;
    item.collectCount += item.isCollected ? 1 : -1;
  }

  function openDetail(item) {
    // 详情页接口未接入，先提示
    uni.showToast({ title: t('antique.detailInDevelopment'), icon: 'none' });
  }

  function handlePublish() {
    // 发布页/接口未接入，先提示
    uni.showToast({ title: t('antique.publishInDevelopment'), icon: 'none' });
  }
  </script>

  <style scoped lang="scss">
  $brand-yellow: #FFCE00;
  $text-main: #1A1A1A;
  $text-sub: #999999;
  $gray-bg: #F5F6F8;

  .antique-page {
    padding: 0 30rpx;
    min-height: 60vh;
  }

  /* 分类筛选 */
  .category-wrapper {
    padding: 10rpx 0 4rpx;

    .category-scroll {
      white-space: nowrap;

      ::-webkit-scrollbar {
        display: none;
      }

      .category-content {
        display: inline-flex;
      }

      .category-pill {
        height: 60rpx;
        padding: 0 28rpx;
        background-color: $gray-bg;
        border-radius: 30rpx;
        display: flex;
        align-items: center;
        margin-right: 16rpx;

        text {
          font-size: 26rpx;
          color: $text-main;
        }

        &.active {
          background-color: $brand-yellow;

          text {
            font-weight: bold;
          }
        }
      }
    }
  }

  /* 排序切换 */
  .sort-row {
    display: flex;
    gap: 30rpx;
    padding: 20rpx 4rpx 10rpx;

    .sort-item {
      font-size: 26rpx;
      color: $text-sub;

      &.active {
        color: $text-main;
        font-weight: bold;
      }
    }
  }

  /* 状态提示 */
  .state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 120rpx 0;

    .state-icon {
      font-size: 60rpx;
      margin-bottom: 20rpx;
    }

    .state-text {
      font-size: 28rpx;
      color: $text-sub;
    }

    .state-sub {
      font-size: 24rpx;
      color: #C0C0C0;
      margin-top: 10rpx;
    }
  }

  /* 瀑布流 */
  .waterfall {
    display: flex;
    gap: 20rpx;
    padding-top: 10rpx;

    .waterfall-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20rpx;
    }
  }

  .antique-card {
    background-color: #ffffff;
    border-radius: 16rpx;
    overflow: hidden;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

    .cover-img {
      width: 100%;
      display: block;
      background-color: #f0f0f0;
    }

    .card-body {
      padding: 16rpx 18rpx 18rpx;

      .title {
        font-size: 28rpx;
        font-weight: bold;
        color: $text-main;
        line-height: 1.4;
        display: block;
      }

      .desc {
        font-size: 24rpx;
        color: $text-sub;
        margin-top: 8rpx;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        line-height: 1.5;
      }

      .tag-row {
        margin-top: 12rpx;

        .era-tag {
          display: inline-block;
          font-size: 20rpx;
          color: #A87E00;
          background-color: #FFF6D9;
          padding: 4rpx 14rpx;
          border-radius: 8rpx;
        }
      }

      .author-row {
        display: flex;
        align-items: center;
        margin-top: 16rpx;

        .author-avatar {
          width: 36rpx;
          height: 36rpx;
          border-radius: 50%;
          margin-right: 10rpx;
          background-color: #eee;
        }

        .author-name {
          flex: 1;
          font-size: 22rpx;
          color: $text-sub;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .collect-btn {
          display: flex;
          align-items: center;

          .collect-icon {
            font-size: 26rpx;
            color: $brand-yellow;
          }

          .collect-num {
            font-size: 22rpx;
            color: $text-sub;
            margin-left: 4rpx;
          }
        }
      }
    }
  }

  /* 发布悬浮按钮 */
  .fab-button {
    position: fixed;
    right: 40rpx;
    bottom: 200rpx;
    width: 100rpx;
    height: 100rpx;
    background-color: $brand-yellow;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 8rpx 16rpx rgba(255, 206, 0, 0.4);
    z-index: 99;
  }
  </style>
