<template>
  <view class="page-container">
    <view class="card-container">
      <scroll-view class="table-scroll-wrapper" scroll-x scroll-y @scrolltolower="loadMoreDays">
        <view class="table">
          <!-- 表头 -->
          <view class="tr thead">
            <view class="th sticky-col-1 col-date">
              日期
            </view>
            <view class="th sticky-col-2 col-shift" style="padding: 0px;">
              <text class="header-icon">⏰</text> 时间
            </view>
            <view class="th col-income">
              <text class="header-icon">💰</text> 收入
            </view>
            <view class="th col-cash">
              <text class="header-icon">💵</text> 现金
            </view>
            <view class="th col-octopus">
              <text class="header-icon">🐙</text> 八达通
            </view>
            <view class="th col-total">
              <text class="header-icon">📊</text> 总计
            </view>
          </view>

          <block v-for="(dayItem, index) in tableData" :key="index">
            <view class="day-group">
              <view class="td sticky-col-1 col-date date-cell day-date-cell">
                <view class="date-content">
                  <picker mode="date" @change="(e) => onDateChange(e, index)">
                    <!-- 占位文字：字号12px，颜色浅灰 -->
                    <text :class="dayItem.date ? 'date-text' : 'placeholder-text'"
                      style="font-size: 12px; color: #ccc;">
                      {{ dayItem.date || '请选择日期' }}
                    </text>
                  </picker>
                </view>
              </view>

              <view class="day-rows">
                <!-- 早班 -->
                <view class="tr">
                  <view class="td sticky-col-2 col-shift shift-text">
                    <text class="shift-icon"></text> 早
                  </view>
                  <view class="td col-income"><input type="digit" placeholder="请输入金额" v-model="dayItem.morning.income"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-cash"><input type="digit" placeholder="请输入金额" v-model="dayItem.morning.cash"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-octopus"><input type="digit" placeholder="请输入金额" v-model="dayItem.morning.octopus"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-total total-text">{{ calculateTotal(dayItem.morning) }}</view>
                </view>
                <!-- 中班 -->
                <view class="tr">
                  <view class="td sticky-col-2 col-shift shift-text">
                    <text class="shift-icon"></text> 中
                  </view>
                  <view class="td col-income"><input type="digit" placeholder="请输入金额" v-model="dayItem.noon.income"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-cash"><input type="digit" placeholder="请输入金额" v-model="dayItem.noon.cash"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-octopus"><input type="digit" placeholder="请输入金额" v-model="dayItem.noon.octopus"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-total total-text">{{ calculateTotal(dayItem.noon) }}</view>
                </view>
                <!-- 晚班 -->
                <view class="tr">
                  <view class="td sticky-col-2 col-shift shift-text">
                    <text class="shift-icon"></text> 晚
                  </view>
                  <view class="td col-income"><input type="digit" placeholder="请输入金额" v-model="dayItem.night.income"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-cash"><input type="digit" placeholder="请输入金额" v-model="dayItem.night.cash"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-octopus"><input type="digit" placeholder="请输入金额" v-model="dayItem.night.octopus"
                      placeholder-class="ph-color" /></view>
                  <view class="td col-total total-text">{{ calculateTotal(dayItem.night) }}</view>
                </view>
              </view>
            </view>
          </block>
        </view>
      </scroll-view>
    </view>

    <!-- 底部提交栏 -->
    <view class="footer-bar">
      <view class="footer-left">
        <view class="stat-item">
          <text class="label">📋 总天数</text>
          <text class="value">{{ totalDays }}</text>
        </view>
        <view class="stat-item">
          <text class="label">💰 总金额</text>
          <text class="value highlight">${{ grandTotal }}</text>
        </view>
      </view>
      <view class="footer-right-buttons">
        <button class="btn-add" @click="loadMoreDays">➕ 添加</button>
        <button class="btn-submit" @click="handleSubmit">📤 提交数据</button>
        <button class="btn-export" @click="handleExport">📥 导出</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { get, post } from '@/utils/request.js'
import { config } from '@/utils/config.js'
import { getToken } from '@/utils/auth.js'

const branchId = ref(1)

onLoad(async (options) => {
  if (options.branchId) {
    branchId.value = parseInt(options.branchId, 10)
  }
  await loadExistingData()
})

const loadExistingData = async () => {
  try {
    const res = await get('/api/financial/form-by-branch', {
      branchId: branchId.value,
      type: 'detail'
    })
    if (res && res.details && res.details.length > 0) {
      tableData.value = res.details
    } else {
      tableData.value = Array.from({ length: 10 }, () => createEmptyDay())
    }
  } catch (e) {
    console.error('加载已有数据失败:', e)
  }
}

const createEmptyShift = () => ({ income: '', cash: '', octopus: '' })
const createEmptyDay = () => ({
  date: '',
  morning: createEmptyShift(),
  noon: createEmptyShift(),
  night: createEmptyShift(),
})

const tableData = ref([])

// 计算有效天数
const totalDays = computed(() => {
  return tableData.value.filter(d => d.date && d.date.trim() !== '').length
})

// 计算总金额（现金+八达通）
const grandTotal = computed(() => {
  let sum = 0
  tableData.value.forEach(day => {
    ['morning', 'noon', 'night'].forEach(key => {
      const shift = day[key]
      const cash = parseFloat(shift.cash) || 0
      const octopus = parseFloat(shift.octopus) || 0
      sum += cash + octopus
    })
  })
  return sum.toFixed(2)
})

const loadMoreDays = () => {
  console.log('触底加载更多')
  tableData.value.push(createEmptyDay())
}

const onDateChange = (e, index) => {
  tableData.value[index].date = e.detail.value
}

const calculateTotal = (shiftData) => {
  const cash = parseFloat(shiftData.cash) || 0
  const octopus = parseFloat(shiftData.octopus) || 0
  return (cash + octopus).toFixed(2)
}

// 提交处理
const handleSubmit = async () => {
  const validData = []
  tableData.value.forEach(day => {
    const date = day.date ? day.date.trim() : ''
    if (!date) return
    const hasData = ['morning', 'noon', 'night'].some(key => {
      const s = day[key]
      return (s.income && s.income.trim() !== '') ||
        (s.cash && s.cash.trim() !== '') ||
        (s.octopus && s.octopus.trim() !== '')
    })
    if (hasData) {
      validData.push({
        date,
        morning: { ...day.morning },
        noon: { ...day.noon },
        night: { ...day.night },
      })
    }
  })

  if (validData.length === 0) {
    uni.showToast({
      title: '没有可提交的数据，请填写日期和金额',
      icon: 'none',
      duration: 2000
    })
    return
  }

  try {
    const title = `分店 ${branchId.value} 报销明细表`

    await post('/api/financial/form', {
      branchId: branchId.value,
      title,
      type: 'detail',
      data: validData
    })

    uni.showToast({
      title: `✅ 成功提交 ${validData.length} 天数据！`,
      icon: 'success',
      duration: 2000
    })

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (err) {
    console.error('提交失败:', err)
  }
}

// 导出为 XLSX 格式 (支持网页端直接跳转下载、以及小程序内本地下载打开)
const handleExport = () => {
  const downloadUrl = `${config.baseURL}/api/financial/export?branchId=${branchId.value}&type=detail&token=${getToken()}`

  // #ifdef H5
  // H5 网页端直接跳转或在新窗口中打开，触发浏览器原生 XLSX 下载
  window.open(downloadUrl, '_blank')
  // #endif

  // #ifndef H5
  // 小程序端 / App 端：先下载临时文件，再通过本地文档阅读器直接打开
  uni.showLoading({ title: '正在导出 XLSX...' })
  uni.downloadFile({
    url: downloadUrl,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({
          filePath: res.tempFilePath,
          showMenu: true, // 允许用户分享文件、保存到微信等，极佳的体验
          success: () => {
            uni.hideLoading()
          },
          fail: (err) => {
            uni.hideLoading()
            uni.showToast({ title: '打开文档失败，请确保安装了 Office 或 WPS', icon: 'none' })
          }
        })
      } else {
        uni.hideLoading()
        uni.showToast({ title: '导出失败，请先保存数据', icon: 'none' })
      }
    },
    fail: (err) => {
      uni.hideLoading()
      uni.showToast({ title: '下载文档失败', icon: 'none' })
    }
  })
  // #endif
}
</script>

<style lang="scss" scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #F6F6F6;
}

.card-container {
  margin: 12px 12px 0 12px;
  background-color: #ffffff;
  border-radius: 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.table-scroll-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
}

.table {
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 100%;
}

.tr {
  display: flex;
  border-bottom: 1px solid #f5f6f8;
}

.day-group {
  display: flex;
  width: max-content;
  min-width: 100%;
  border-bottom: 4px solid #f5f6f8;
}

.day-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.thead {
  background-color: #f9fafe;
  position: sticky;
  top: 0;
  z-index: 30;

  .th {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: bold;
    color: #555;
    text-align: center;
    border-right: 1px solid #f0f0f0;
    background-color: #f9fafe;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
}

.th,
.td {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  background-color: #ffffff;
  border-right: 1px solid #fafafa;
  box-sizing: border-box;
}

/* 列宽定义 */
.col-date {
  width: 100px;
}

.col-shift {
  width: 60px;
}

.col-income {
  width: 120px;
}

.col-cash {
  width: 120px;
}

.col-octopus {
  width: 120px;
}

.col-total {
  width: 120px;
}

/* 固定列位置 —— 关键修改：left 与 col-date 宽度一致 */
.sticky-col-1 {
  position: sticky;
  left: 0;
  z-index: 10;
  box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.03);
}

.sticky-col-2 {
  position: sticky;
  left: 100px;
  /* 调整为 col-date 宽度，实现紧贴日期列 */
  z-index: 10;
  box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.05);
}

.thead .sticky-col-1,
.thead .sticky-col-2 {
  z-index: 40;
}

/* 表头图标 */
.header-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

/* 日期列图标 */
.date-cell .calendar-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  flex-shrink: 0;
}

.date-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-date-cell {
  height: auto !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shift-text {
  font-weight: bold;
  color: #333;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.shift-icon {
  font-size: 16px;
  line-height: 1;
}

input {
  width: 100%;
  height: 100%;
  text-align: center;
  font-size: 14px;
  color: #333;
}

:deep(.ph-color) {
  color: #c0c4cc;
  font-size: 13px;
}

.total-text {
  color: #409eff;
  font-weight: bold;
  font-size: 15px;
}

/* 底部工具栏 */
.footer-bar {
  flex-shrink: 0;
  background-color: #ffffff;
  padding: 12px 20px 16px 20px;
  border-top: 1px solid #eef2f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 12px 12px 12px;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.02);
  gap: 12px;
  flex-wrap: wrap;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 14px;
  color: #475569;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;

  .label {
    color: #94a3b8;
    font-weight: 400;
  }

  .value {
    color: #1e293b;
    font-weight: 600;

    &.highlight {
      color: #2563eb;
    }
  }
}

.btn-submit {
  flex-shrink: 0;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 !important;

  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}

.footer-right-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex-wrap: wrap;
}

.btn-add {
  flex-shrink: 0;
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;

  &:active {
    transform: scale(0.97);
    background-color: #e2e8f0;
  }
}

.btn-export {
  flex-shrink: 0;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);

  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}
</style>