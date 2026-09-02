<template>
  <view class="page-container">
    <view class="card-container">
      <scroll-view
        class="table-scroll-wrapper"
        scroll-x
        scroll-y
        @scrolltolower="loadMoreRows"
      >
        <view class="table">
          <!-- 表头 -->
          <view class="tr thead">
            <view class="th sticky-col-1 col-date">
              日期
            </view>
            <view class="th col-company">
              公司名
            </view>
            <view class="th col-goods">
              货名
            </view>
            <view class="th col-quantity">
              数量
            </view>
            <view class="th col-price">
              单价
            </view>
            <view class="th col-total">
              总计
            </view>
          </view>

          <block v-for="(row, index) in tableData" :key="index">
            <view class="tr">
              <!-- 日期列 (固定) -->
              <view class="td sticky-col-1 col-date date-cell">
                <view class="date-content">
                  <picker mode="date" @change="(e) => onDateChange(e, index)">
                    <!-- 占位文字：字号12px，颜色浅灰 -->
                    <text
                      :class="row.date ? 'date-text' : 'placeholder-text'"
                      style="font-size: 12px; color: #ccc;"
                    >
                      {{ row.date || '请选择日期' }}
                    </text>
                  </picker>
                </view>
              </view>

              <!-- 公司名 -->
              <view class="td col-company">
                <input type="text" placeholder="请输入公司" v-model="row.company" placeholder-class="ph-color" />
              </view>

              <!-- 货名 -->
              <view class="td col-goods">
                <input type="text" placeholder="请输入货名" v-model="row.goods" placeholder-class="ph-color" />
              </view>

              <!-- 数量 -->
              <view class="td col-quantity">
                <input type="digit" placeholder="数量" v-model="row.quantity" placeholder-class="ph-color" />
              </view>

              <!-- 单价 -->
              <view class="td col-price">
                <input type="digit" placeholder="单价" v-model="row.price" placeholder-class="ph-color" />
              </view>

              <!-- 总计 -->
              <view class="td col-total total-text">
                {{ calculateRowTotal(row) }}
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
          <text class="value">{{ totalRows }}</text>
        </view>
        <view class="stat-item">
          <text class="label">💰 总金额</text>
          <text class="value highlight">${{ grandTotal }}</text>
        </view>
      </view>
      <button class="btn-submit" @click="handleSubmit">📤 提交数据</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { post } from '@/utils/request.js'

const createEmptyRow = () => ({
  date: '',
  company: '',
  goods: '',
  quantity: '',
  price: '',
})

const tableData = ref(Array.from({ length: 10 }, () => createEmptyRow()))

// 计算有效天数
const totalRows = computed(() => {
  return tableData.value.filter(r => r.date && r.date.trim() !== '').length
})

// 计算总金额（数量 * 单价）
const grandTotal = computed(() => {
  let sum = 0
  tableData.value.forEach(row => {
    const q = parseFloat(row.quantity) || 0
    const p = parseFloat(row.price) || 0
    sum += q * p
  })
  return sum.toFixed(2)
})

const loadMoreRows = () => {
  console.log('触底加载更多')
  tableData.value.push(createEmptyRow())
}

const onDateChange = (e, index) => {
  tableData.value[index].date = e.detail.value
}

const calculateRowTotal = (row) => {
  const q = parseFloat(row.quantity) || 0
  const p = parseFloat(row.price) || 0
  return (q * p).toFixed(2)
}

// 提交处理
const handleSubmit = async () => {
  const validData = []
  tableData.value.forEach(row => {
    const date = row.date ? row.date.trim() : ''
    if (!date) return
    const hasData = (row.company && row.company.trim() !== '') ||
                    (row.goods && row.goods.trim() !== '') ||
                    (row.quantity && row.quantity.trim() !== '') ||
                    (row.price && row.price.trim() !== '')
    if (hasData) {
      validData.push({
        date,
        company: row.company,
        goods: row.goods,
        quantity: row.quantity,
        price: row.price,
        total: calculateRowTotal(row)
      })
    }
  })

  if (validData.length === 0) {
    uni.showToast({
      title: '没有可提交的数据，请填写日期和详情',
      icon: 'none',
      duration: 2000
    })
    return
  }

  try {
    const now = new Date()
    const title = `${now.getFullYear()}年${now.getMonth() + 1}月财务录入表`

    await post('/api/financial/form', {
      title,
      type: 'financial',
      data: validData
    })

    uni.showToast({
      title: `✅ 成功提交 ${validData.length} 条数据！`,
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

.th, .td {
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
.col-date { width: 100px; }
.col-company { width: 130px; }
.col-goods { width: 120px; }
.col-quantity { width: 90px; }
.col-price { width: 90px; }
.col-total { width: 110px; }

/* 固定列位置 —— 关键修改：实现紧贴左侧 */
.sticky-col-1 {
  position: sticky;
  left: 0;
  z-index: 10;
  box-shadow: 2px 0 5px -2px rgba(0,0,0,0.03);
}

.thead .sticky-col-1 {
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
  padding: 10px 28px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}
</style>
