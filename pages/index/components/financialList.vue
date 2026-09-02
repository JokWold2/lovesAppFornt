<template>
    <view class="page-container">
      <!-- 列表渲染 -->
      <view class="card-list">
        <view class="card-item" v-for="item in recordList" :key="item.id" @click="goExcel(item)">
          <!-- 标题 -->
          <view class="card-title">{{ item.title }}</view>
          
          <!-- 底部元信息 (时间 + 录入人) -->
          <view class="card-meta">
            <view class="meta-item">
              <!-- 时钟图标 (行内 SVG) -->
              <image class="icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpolyline points='12 6 12 12 16 14'%3E%3C/polyline%3E%3C/svg%3E" mode="aspectFit"></image>
              <text class="meta-text">{{ item.time }}</text>
            </view>
            
            <view class="meta-item">
              <!-- 用户图标 (行内 SVG) -->
              <image class="icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E" mode="aspectFit"></image>
              <text class="meta-text">{{ item.author }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { onShow } from '@dcloudio/uni-app'
  import { get } from '@/utils/request.js'
  
  // 点击卡片跳转到财务录入页，并传递 title 参数
  const goExcel = (item) => {
    uni.navigateTo({ url: `/pages/index/components/financialExcel?title=${encodeURIComponent(item.title)}` })
  }

  // 列表数据
  const recordList = ref([])

  const loadData = async () => {
    try {
      const data = await get('/api/financial/list')
      recordList.value = data
    } catch (e) {
      console.error('Failed to load financial list:', e)
    }
  }

  onShow(() => {
    loadData()
  })
  </script>
  
  <style lang="scss" scoped>
  /* 页面底层背景色，为了凸显白色卡片 */
  .page-container {
    min-height: 100vh;
    background-color: #f4f5f7; 
    padding: 16px 12px;
    box-sizing: border-box;
  }
  
  .card-list {
    display: flex;
    flex-direction: column;
    gap: 12px; /* 卡片之间的间距 */
  }
  
  .card-item {
    background-color: #ffffff;
    border-radius: 8px;
    padding: 18px 16px;
    /* 添加轻微的阴影以提升质感，如果不想要可以删掉 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    
    .card-title {
      font-size: 17px;
      font-weight: bold;
      color: #333333;
      margin-bottom: 12px;
      line-height: 1.4;
    }
    
    .card-meta {
      display: flex;
      align-items: center;
      
      .meta-item {
        display: flex;
        align-items: center;
        margin-right: 16px; /* 时间和人名之间的间距 */
        
        .icon {
          width: 14px;
          height: 14px;
          margin-right: 4px;
        }
        
        .meta-text {
          font-size: 14px;
          color: #999999;
        }
      }
    }
  }
  </style>