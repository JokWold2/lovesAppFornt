<template>
  <view class="page-container">
    <view class="card-container">
      <scroll-view class="table-scroll-wrapper" scroll-x scroll-y @scrolltolower="loadMoreRows">
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
                    <text :class="row.date ? 'date-text' : 'placeholder-text'" style="font-size: 12px; color: #ccc;">
                      {{ row.date || '请选择日期' }}
                    </text>
                  </picker>
                </view>
              </view>

              <!-- 公司名 -->
              <view class="td col-company">
                <view class="input-container">
                  <input type="text" placeholder="公司名" v-model="row.company" placeholder-class="ph-color" />
                  <picker mode="selector" :range="companyNames" @change="(e) => onCompanySelect(e, index)">
                    <view class="picker-trigger">▼</view>
                  </picker>
                </view>
              </view>

              <!-- 货名 -->
              <view class="td col-goods">
                <view class="input-container">
                  <input type="text" placeholder="货名" v-model="row.goods" placeholder-class="ph-color" />
                  <picker mode="selector" :range="getGoodsRange(row.company)" @change="(e) => onGoodsSelect(e, index)">
                    <view class="picker-trigger">▼</view>
                  </picker>
                </view>
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
      <view class="footer-right-buttons">
        <button class="btn-add" @click="loadMoreRows">➕ 添加</button>
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
const referenceData = ref([])

const companyNames = computed(() => {
  return referenceData.value.map(item => item.supplier)
})

onLoad(async (options) => {
  if (options.branchId) {
    branchId.value = parseInt(options.branchId, 10)
  }
  await Promise.all([
    loadExistingData(),
    loadReferenceData()
  ])
})

const loadReferenceData = async () => {
  try {
    const res = await get('/api/financial/reference-data')
    if (res && Array.isArray(res)) {
      referenceData.value = res
    }
  } catch (e) {
    console.error('加载参考数据失败:', e)
  }
}

const onCompanySelect = (e, index) => {
  const selectedIndex = parseInt(e.detail.value, 10)
  if (companyNames.value[selectedIndex]) {
    tableData.value[index].company = companyNames.value[selectedIndex]
    // 重置货物与价格，等待重新选择
    tableData.value[index].goods = ''
    tableData.value[index].price = ''
  }
}

const getGoodsRange = (companyName) => {
  if (!companyName) return []
  const found = referenceData.value.find(item => item.supplier === companyName)
  return found ? found.items.map(i => i.name) : []
}

const onGoodsSelect = (e, index) => {
  const selectedIndex = parseInt(e.detail.value, 10)
  const companyName = tableData.value[index].company
  const goodsList = getGoodsRange(companyName)
  const goodsName = goodsList[selectedIndex]
  if (goodsName) {
    tableData.value[index].goods = goodsName
    
    // 自动带上单价
    const foundSupplier = referenceData.value.find(item => item.supplier === companyName)
    if (foundSupplier) {
      const foundItem = foundSupplier.items.find(i => i.name === goodsName)
      if (foundItem && foundItem.price !== null && foundItem.price !== undefined) {
        tableData.value[index].price = String(foundItem.price)
      } else {
        tableData.value[index].price = ''
      }
    }
  }
}

const loadExistingData = async () => {
  try {
    const res = await get('/api/financial/form-by-branch', {
      branchId: branchId.value,
      type: 'financial'
    })
    if (res && res.details && res.details.length > 0) {
      tableData.value = res.details
    } else {
      tableData.value = Array.from({ length: 10 }, () => createEmptyRow())
    }
  } catch (e) {
    console.error('加载已有数据失败:', e)
  }
}

const createEmptyRow = () => ({
  date: '',
  company: '',
  goods: '',
  quantity: '',
  price: '',
})

const tableData = ref([])

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
    const title = `分店 ${branchId.value} 财务录入表`

    await post('/api/financial/form', {
      branchId: branchId.value,
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

// 导出为 XLSX 格式 (支持网页端直接跳转下载、以及小程序内本地下载打开)
const handleExport = () => {
  const downloadUrl = `${config.baseURL}/api/financial/export?branchId=${branchId.value}&type=financial&token=${getToken()}`

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

.col-company {
  width: 130px;
}

.col-goods {
  width: 120px;
}

.col-quantity {
  width: 90px;
}

.col-price {
  width: 90px;
}

.col-total {
  width: 110px;
}

/* 固定列位置 —— 关键修改：实现紧贴左侧 */
.sticky-col-1 {
  position: sticky;
  left: 0;
  z-index: 10;
  box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.03);
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

.input-container {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  position: relative;
}

.input-container input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  font-size: 13px;
  text-align: center;
  padding: 0 4px;
}

.picker-trigger {
  width: 24px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 10px;
  cursor: pointer;
  background-color: #f8fafc;
  border-left: 1px solid #f1f5f9;
  box-sizing: border-box;
  &:active {
    background-color: #e2e8f0;
  }
}
</style>
