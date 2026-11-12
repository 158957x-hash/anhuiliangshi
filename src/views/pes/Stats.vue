<template>
  <div class="page-container">
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">统计报表（E14 · 指标口径待 C-25）</span>
        <div class="title-extra">
          <el-select v-model="cityFilter" clearable placeholder="全省（下钻选择地市）" style="width: 220px; margin-right: 10px">
            <el-option v-for="c in cityOptions" :key="c.code" :label="c.name" :value="c.code" />
          </el-select>
          <el-radio-group v-model="period" size="small">
            <el-radio-button value="month">月度</el-radio-button>
            <el-radio-button value="year">年度（重采样演示）</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px"
        title="指标口径待客户确认（C-25）：产量/销量/出口口径、统计周期（月/年聚合规则）以客户确认结果为准，年度数据由月度重采样生成（design_proposal）。" />

      <div class="stat-row">
        <StatCard label="期间产量合计（吨）" :value="totalOutput" icon="Box" color="#0f5eb5" />
        <StatCard label="期间销量合计（吨）" :value="totalSales" icon="SoldOut" color="#1e6b52" />
        <StatCard label="期间销售额（万元）" :value="totalAmount" icon="Money" color="#8a6d3b" />
        <StatCard label="期间出口量（吨）" :value="totalExport" icon="Ship" color="#7e57c2" />
      </div>

      <div class="chart-grid">
        <div class="chart-cell">
          <h4>产量 / 销量趋势{{ cityFilter ? '（全省口径，未按市拆分）' : '' }}</h4>
          <BaseChart :option="trendOption" height="300px" />
        </div>
        <div class="chart-cell">
          <h4>{{ cityFilter ? cityName + ' ' : '' }}主体类型分布（E1）</h4>
          <BaseChart :option="subjectPieOption" height="300px" />
        </div>
        <div class="chart-cell">
          <h4>{{ cityFilter ? cityName + ' ' : '各地市' }}回收重量（kg）</h4>
          <BaseChart :option="recycleBarOption" height="300px" />
        </div>
      </div>

      <!-- 下钻明细：所选区划主体清单（PES-R09/R10 下钻可追溯） -->
      <div v-if="cityFilter" class="drill-panel">
        <h4>{{ cityName }} 在档主体明细（{{ drillSubjects.length }} 家）</h4>
        <el-table :data="drillSubjects" border size="small" max-height="320">
          <el-table-column prop="id" label="主体编号" width="130" />
          <el-table-column prop="name" label="主体名称" min-width="220" show-overflow-tooltip />
          <el-table-column label="类型" width="100" align="center">
            <template #default="{ row }">{{ { produce: '生产企业', operate: '经营企业', use: '使用主体', recycle: '回收主体' }[row.type] }}</template>
          </el-table-column>
          <el-table-column prop="regionCode" label="区划代码" width="100" />
          <el-table-column prop="status" label="状态" width="90" align="center" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchMonthlyStats, fetchRecycles, fetchPesSubjects } from '@/api/pes'
import StatCard from '@/components/common/StatCard.vue'
import BaseChart from '@/components/charts/BaseChart.vue'

const period = ref('month')
const cityFilter = ref('')
const monthly = ref([])
const recycles = ref([])
const subjects = ref([])

const CITY_NAMES = {
  3401: '合肥', 3402: '芜湖', 3403: '蚌埠', 3404: '淮南', 3405: '马鞍山', 3406: '淮北',
  3407: '铜陵', 3408: '安庆', 3410: '黄山', 3411: '滁州', 3412: '阜阳', 3413: '宿州',
  3415: '六安', 3416: '亳州', 3417: '池州', 3418: '宣城'
}
const cityOptions = computed(() => {
  const codes = [...new Set(subjects.value.map((s) => String(s.regionCode).slice(0, 4)))]
  return codes.sort().map((c) => ({ code: c, name: CITY_NAMES[c] || c }))
})
const cityName = computed(() => CITY_NAMES[cityFilter.value] || cityFilter.value)
const drillSubjects = computed(() => subjects.value.filter((s) => String(s.regionCode).startsWith(cityFilter.value)))

// 年度视图 = 月度重采样（design_proposal）
const statRows = computed(() => {
  if (period.value === 'month') return monthly.value
  const byYear = {}
  monthly.value.forEach((m) => {
    const y = m.month.slice(0, 4)
    byYear[y] = byYear[y] || { month: y, output: 0, sales: 0, salesAmount: 0, export: 0 }
    byYear[y].output += m.output
    byYear[y].sales += m.sales
    byYear[y].salesAmount += m.salesAmount
    byYear[y].export += m.export
  })
  return Object.values(byYear)
})

const totalOutput = computed(() => statRows.value.reduce((s, r) => s + r.output, 0))
const totalSales = computed(() => statRows.value.reduce((s, r) => s + r.sales, 0))
const totalAmount = computed(() => statRows.value.reduce((s, r) => s + r.salesAmount, 0))
const totalExport = computed(() => statRows.value.reduce((s, r) => s + r.export, 0))

const trendOption = computed(() => ({
  grid: { left: 60, right: 30, top: 40, bottom: 30 },
  tooltip: { trigger: 'axis' },
  legend: { data: ['产量', '销量', '出口量'], top: 0 },
  xAxis: { type: 'category', data: statRows.value.map((r) => r.month) },
  yAxis: { type: 'value', name: '吨' },
  series: [
    { name: '产量', type: 'line', smooth: true, data: statRows.value.map((r) => r.output), itemStyle: { color: '#0f5eb5' } },
    { name: '销量', type: 'line', smooth: true, data: statRows.value.map((r) => r.sales), itemStyle: { color: '#1e6b52' } },
    { name: '出口量', type: 'line', smooth: true, data: statRows.value.map((r) => r.export), itemStyle: { color: '#7e57c2' } }
  ]
}))

const subjectPieOption = computed(() => {
  const nameMap = { produce: '生产企业', operate: '经营企业', use: '使用主体', recycle: '回收主体' }
  const colorMap = { produce: '#0f5eb5', operate: '#1e6b52', use: '#8a6d3b', recycle: '#7e57c2' }
  const cnt = {}
  drillSubjects.value.forEach((s) => { cnt[s.type] = (cnt[s.type] || 0) + 1 })
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['38%', '62%'], center: ['50%', '44%'],
      data: Object.entries(cnt).map(([k, v]) => ({ name: nameMap[k] || k, value: v, itemStyle: { color: colorMap[k] } })),
      label: { formatter: '{b}: {c}' }
    }]
  }
})

const recycleBarOption = computed(() => {
  const list = cityFilter.value ? recycles.value.filter((r) => String(r.regionCode).startsWith(cityFilter.value)) : recycles.value
  const cityMap = {}
  list.forEach((r) => {
    const city = String(r.regionCode).slice(0, 4)
    cityMap[city] = (cityMap[city] || 0) + (r.weight || 0)
  })
  return {
    grid: { left: 60, right: 20, top: 30, bottom: 30 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: Object.keys(cityMap).map((c) => (CITY_NAMES[c] || c) + (cityFilter.value ? '' : '市')) },
    yAxis: { type: 'value', name: 'kg' },
    series: [{ type: 'bar', data: Object.values(cityMap), itemStyle: { color: '#2f8f83', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 }]
  }
})

onMounted(async () => {
  ;[monthly.value, recycles.value, subjects.value] = await Promise.all([
    fetchMonthlyStats(), fetchRecycles(null), fetchPesSubjects({ regionCode: '340000' })
  ])
})
</script>

<style lang="scss" scoped>
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.chart-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  .chart-cell {
    background: #fbfcfe;
    border: 1px solid #eef1f6;
    border-radius: 10px;
    padding: 12px 14px;
    h4 { margin: 0 0 8px; font-size: 14px; color: var(--ah-text); }
  }
}
.drill-panel {
  margin-top: 16px;
  background: #fbfcfe;
  border: 1px solid #eef1f6;
  border-radius: 10px;
  padding: 12px 14px;
  h4 { margin: 0 0 10px; font-size: 14px; color: var(--ah-text); }
}
@media (max-width: 1100px) {
  .stat-row { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
}
</style>
