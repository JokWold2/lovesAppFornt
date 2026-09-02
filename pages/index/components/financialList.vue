<template>
  <view class="page-container">
    <!-- 顶部水平滚动分店选择 -->
    <scroll-view class="branch-tabs-scroll" scroll-x show-scrollbar="false">
      <view class="branch-tabs-container">
        <view 
          v-for="i in 9" 
          :key="i" 
          class="branch-tab-item" 
          :class="{ active: currentBranchId === i }" 
          @click="selectBranch(i)"
        >
          分店 {{ i }}
        </view>
      </view>
    </scroll-view>

    <!-- 报表卡片列表 -->
    <view class="card-list">
      <!-- 1. 财务录入表 -->
      <view class="card-item" @click="goForm('financial')">
        <view class="card-title-row">
          <view class="card-title">财务录入表</view>
          <view class="badge badge-financial">财务表</view>
        </view>
        
        <view class="card-meta" v-if="status.financial">
          <view class="meta-item">
            <image class="icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpolyline points='12 6 12 12 16 14'%3E%3C/polyline%3E%3C/svg%3E" mode="aspectFit"></image>
            <text class="meta-text">{{ status.financial.time }}</text>
          </view>
          
          <view class="meta-item">
            <image class="icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E" mode="aspectFit"></image>
            <text class="meta-text">{{ status.financial.author }}</text>
          </view>
        </view>
        
        <view class="card-meta-empty" v-else>
          <text class="empty-text">⚡ 暂无历史数据，点击立即录入</text>
        </view>
      </view>

      <!-- 2. 报销明细表 -->
      <view class="card-item" @click="goForm('detail')">
        <view class="card-title-row">
          <view class="card-title">报销明细表</view>
          <view class="badge badge-detail">明细表</view>
        </view>
        
        <view class="card-meta" v-if="status.detail">
          <view class="meta-item">
            <image class="icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpolyline points='12 6 12 12 16 14'%3E%3C/polyline%3E%3C/svg%3E" mode="aspectFit"></image>
            <text class="meta-text">{{ status.detail.time }}</text>
          </view>
          
          <view class="meta-item">
            <image class="icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E" mode="aspectFit"></image>
            <text class="meta-text">{{ status.detail.author }}</text>
          </view>
        </view>
        
        <view class="card-meta-empty" v-else>
          <text class="empty-text">📝 暂无历史数据，点击立即报销</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request.js'

const currentBranchId = ref(1)
const status = ref({
  financial: null,
  detail: null
})

// 加载该分店的两个报表状态
const loadData = async () => {
  try {
    const data = await get('/api/financial/branch-status', { branchId: currentBranchId.value })
    status.value = data
  } catch (e) {
    console.error('Failed to load branch status:', e)
  }
}

const selectBranch = (id) => {
  currentBranchId.value = id
  loadData()
}

onShow(() => {
  loadData()
})

// 点击卡片进入对应的报表编辑页面
const goForm = (type) => {
  if (type === 'detail') {
    uni.navigateTo({ 
      url: `/pages/index/components/financialExcel?branchId=${currentBranchId.value}&type=detail` 
    })
  } else {
    uni.navigateTo({ 
      url: `/pages/index/components/financialTable?branchId=${currentBranchId.value}&type=financial` 
    })
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f4f5f7; 
  padding: 16px 12px;
  box-sizing: border-box;
}

/* 分店横向滚动导航 */
.branch-tabs-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 18px;
  background-color: #ffffff;
  border-radius: 10px;
  padding: 10px;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.branch-tabs-container {
  display: flex;
  flex-direction: row;
}

.branch-tab-item {
  display: inline-block;
  padding: 8px 18px;
  font-size: 14px;
  color: #555555;
  border-radius: 20px;
  margin-right: 10px;
  background-color: #f1f3f6;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:last-child {
    margin-right: 0;
  }
  
  &.active {
    color: #ffffff;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    font-weight: bold;
    box-shadow: 0 3px 8px rgba(37, 99, 235, 0.25);
  }
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-item {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 20px 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  transition: transform 0.15s ease;
  
  &:active {
    transform: scale(0.99);
  }
  
  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  
  .card-title {
    font-size: 18px;
    font-weight: bold;
    color: #1e293b;
    line-height: 1.4;
  }
  
  .badge {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 12px;
    text-transform: uppercase;
    
    &.badge-financial {
      background-color: #eff6ff;
      color: #2563eb;
    }
    
    &.badge-detail {
      background-color: #fef2f2;
      color: #ef4444;
    }
  }
  
  .card-meta {
    display: flex;
    align-items: center;
    
    .meta-item {
      display: flex;
      align-items: center;
      margin-right: 20px;
      
      .icon {
        width: 14px;
        height: 14px;
        margin-right: 5px;
      }
      
      .meta-text {
        font-size: 13px;
        color: #64748b;
      }
    }
  }
  
  .card-meta-empty {
    .empty-text {
      font-size: 13px;
      color: #94a3b8;
      font-style: italic;
    }
  }
}
</style>
