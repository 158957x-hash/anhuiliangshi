<template>
  <div class="page-container fsr-page">
    <div class="page-head">
      <div>
        <h2>长势对比库</h2>
        <p>基于独立长势监测记录进行研判、对比与预警推送（数据不由事件派生；长势异常经预警推送进入变化图斑库统一流转）。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="load">刷新记录</el-button>
    </div>

    <!-- 顶部指标卡：全部基于独立长势记录统计 -->
    <div class="stat-grid">
      <div class="stat-card blue"><span>记录总数</span><strong>{{ stats.total }}</strong><small>条</small></div>
      <div class="stat-card orange"><span>待研判</span><strong>{{ stats.pending }}</strong><small>含待研判与模型失败</small></div>
      <div class="stat-card green"><span>已研判</span><strong>{{ stats.done }}</strong><small>含模型研判与人工研判</small></div>
      <div class="stat-card red"><span>减产风险记录</span><strong>{{ stats.downRisk }}</strong><small>条</small></div>
    </div>
    <p class="stat-note">统计口径：基于独立长势记录统计（长势监测研判记录，非事件派生数据）。</p>

    <!-- 长势同比对比（评标演示点：分品种/分区域 今年vs去年 颜色对比；演示数据） -->
    <div class="panel">
      <div class="panel-title">
        长势同比对比（长势指数，100=常年基准）
        <el-radio-group v-model="compareDim" size="small" style="margin-left: 16px">
          <el-radio-button value="crop">分品种</el-radio-button>
          <el-radio-button value="region">分区域</el-radio-button>
        </el-radio-group>
        <el-tag size="small" type="info" style="margin-left: 12px">演示数据，待业务确认</el-tag>
      </div>
      <BaseChart :option="compareOption" height="300px" />
    </div>

    <div class="panel">
      <div class="panel-title">
        <span class="title-text">长势记录列表</span>
        <span class="title-extra text-secondary">共 {{ rows.length }} 条</span>
      </div>

      <el-form inline class="mb-12">
        <el-form-item label="研判状态">
          <el-select v-model="filters.judgeStatus" clearable placeholder="全部" style="width: 140px">
            <el-option v-for="i in judgeOptions" :key="i.value" :label="i.label" :value="i.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域">
          <el-select v-model="filters.regionCode" clearable placeholder="全部" style="width: 150px">
            <el-option v-for="i in regionOptions" :key="i.value" :label="i.label" :value="i.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据来源">
          <el-select v-model="filters.dataSourceType" clearable placeholder="全部" style="width: 140px">
            <el-option v-for="i in sourceOptions" :key="i" :label="i" :value="i" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" class="mb-12">
        <el-button size="small" type="primary" plain @click="load">重试加载</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="rows" stripe border empty-text="暂无长势记录，请调整筛选条件或点击刷新">
        <el-table-column prop="id" label="记录ID" width="130" />
        <el-table-column prop="monitorPeriod" label="监测期" min-width="200" show-overflow-tooltip />
        <el-table-column prop="regionName" label="区域" width="100" />
        <el-table-column prop="cropName" label="作物" width="70" />
        <el-table-column prop="dataSourceType" label="数据来源" width="100" />
        <el-table-column prop="dataBatchNo" label="数据批次" width="150" show-overflow-tooltip />
        <el-table-column label="长势等级" width="90">
          <template #default="{ row }">{{ levelName(row.growthLevel) }}</template>
        </el-table-column>
        <el-table-column label="产量趋势" width="95">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.yieldTrend === 'down_risk' }">{{ trendName(row.yieldTrend) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="NDVI偏差" width="95">
          <template #default="{ row }">{{ row.ndviDeviation || '—' }}</template>
        </el-table-column>
        <el-table-column label="研判状态" width="95">
          <template #default="{ row }">
            <StatusTag :dict="GROWTH_JUDGE_STATUS" :value="row.judgeStatus" />
          </template>
        </el-table-column>
        <el-table-column label="研判人/时间" min-width="160">
          <template #default="{ row }">
            <div>{{ row.judgePerson || '—' }}</div>
            <div class="cell-sub">{{ row.judgeAt || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="canJudge(row)" link type="warning" @click="openJudge(row)">人工研判</el-button>
            <el-button v-if="canGenerate(row)" link type="success" @click="pushWarning(row)">推送预警</el-button>
            <span v-if="row.warningPushed" class="generated-no">已推送 {{ row.warningPushed }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" :title="current ? `长势记录详情 ${current.id}` : '长势记录详情'" size="520px">
      <template v-if="current">
        <el-alert
          v-if="current.judgeStatus === 'model_failed'"
          type="error" show-icon :closable="false" class="mb-12"
          title="模型失败不得生成结论"
          :description="current.modelFailReason || '模型研判失败，禁止据此生成结论或推送预警'"
        />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="监测期">{{ current.monitorPeriod }}</el-descriptions-item>
          <el-descriptions-item label="区域">{{ current.regionName }}（{{ current.regionCode }}）</el-descriptions-item>
          <el-descriptions-item label="作物">{{ current.cropName }}</el-descriptions-item>
          <el-descriptions-item label="品种">{{ current.variety || '—' }}</el-descriptions-item>
          <el-descriptions-item label="数据来源">{{ current.dataSourceType }} · {{ current.dataSourceName }}</el-descriptions-item>
          <el-descriptions-item label="数据批次">{{ current.dataBatchNo }}</el-descriptions-item>
          <el-descriptions-item label="基线引用">{{ current.baselineRef || '—' }}</el-descriptions-item>
          <el-descriptions-item label="长势等级">{{ levelName(current.growthLevel) }}</el-descriptions-item>
          <el-descriptions-item label="产量趋势">{{ trendName(current.yieldTrend) }}</el-descriptions-item>
          <el-descriptions-item label="NDVI偏差">{{ current.ndviDeviation || '—' }}</el-descriptions-item>
          <el-descriptions-item label="置信度">{{ current.confidence == null ? '—' : Number(current.confidence).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="研判状态">{{ judgeName(current.judgeStatus) }}</el-descriptions-item>
          <el-descriptions-item label="研判人/时间">{{ current.judgePerson || '—' }} / {{ current.judgeAt || '—' }}</el-descriptions-item>
          <el-descriptions-item label="田管措施">{{ current.measure || '—' }}</el-descriptions-item>
          <el-descriptions-item label="区域建议">{{ current.suggestion || '—' }}</el-descriptions-item>
          <el-descriptions-item label="预警推送">{{ current.warningPushed || '未推送' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <!-- 人工研判弹窗 -->
    <el-dialog v-model="judgeVisible" title="人工研判" width="520px">
      <el-form label-width="90px">
        <el-form-item label="记录ID">
          <span>{{ current?.id }}</span>
        </el-form-item>
        <el-form-item label="长势等级" required>
          <el-select v-model="judgeForm.level" placeholder="请选择长势等级" style="width: 100%">
            <el-option v-for="i in levelOptions" :key="i.value" :label="i.label" :value="i.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="产量趋势" required>
          <el-select v-model="judgeForm.trend" placeholder="请选择产量趋势" style="width: 100%">
            <el-option v-for="i in trendOptions" :key="i.value" :label="i.label" :value="i.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="田管措施">
          <el-input v-model="judgeForm.measure" type="textarea" :rows="2" placeholder="请填写田管措施" />
        </el-form-item>
        <el-form-item label="区域建议">
          <el-input v-model="judgeForm.suggestion" type="textarea" :rows="2" placeholder="请填写区域建议" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="judgeVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitJudge">提交研判</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchGrowthRecords, judgeGrowth, pushGrowthWarning } from '@/api/fsr'
import BaseChart from '@/components/charts/BaseChart.vue'
import { GROWTH_JUDGE_STATUS } from '@/mock/common/dict'
import StatusTag from '@/components/common/StatusTag.vue'
import { listCities } from '@/mock/common/regions'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 展示映射：等级/趋势取值与研判弹窗选项一致，不涉及事件类型映射
const LEVEL_MAP = { good: '良好', normal: '正常', weak: '偏弱', need_attention: '需关注' }
const TREND_MAP = { up: '稳中有增', stable: '基本稳定', down_risk: '下降风险' }
const levelOptions = [
  { value: 'good', label: '良好' },
  { value: 'normal', label: '正常' },
  { value: 'weak', label: '偏弱' },
  { value: 'need_attention', label: '需关注' }
]
const trendOptions = [
  { value: 'up', label: '稳中有增' },
  { value: 'stable', label: '基本稳定' },
  { value: 'down_risk', label: '下降风险' }
]
const levelName = (v) => LEVEL_MAP[v] || v || '—'
const trendName = (v) => TREND_MAP[v] || v || '—'
const judgeName = (v) => GROWTH_JUDGE_STATUS[v]?.name || v || '—'

const allRows = ref([])
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const filters = reactive({ judgeStatus: '', regionCode: '', dataSourceType: '' })
const detailVisible = ref(false)
const judgeVisible = ref(false)
const current = ref(null)
const judgeForm = reactive({ level: '', trend: '', measure: '', suggestion: '' })

const judgeOptions = Object.entries(GROWTH_JUDGE_STATUS).map(([value, i]) => ({ value, label: i.name }))
// 区域下拉：按记录 regionCode 前4位去重，展示对应地市名称
const cityMap = Object.fromEntries(listCities().map((c) => [c.code.slice(0, 4), c.name]))
const regionOptions = computed(() => {
  const prefixes = [...new Set(allRows.value.map((r) => String(r.regionCode).slice(0, 4)))]
  return prefixes.map((p) => ({ value: p, label: cityMap[p] || p }))
})
const sourceOptions = computed(() => [...new Set(allRows.value.map((r) => r.dataSourceType).filter(Boolean))])

// 列表数据：加载全量后本地筛选，指标卡口径保持全局
const rows = computed(() =>
  allRows.value.filter((r) => {
    if (filters.judgeStatus && r.judgeStatus !== filters.judgeStatus) return false
    if (filters.regionCode && !String(r.regionCode).startsWith(filters.regionCode)) return false
    if (filters.dataSourceType && r.dataSourceType !== filters.dataSourceType) return false
    return true
  })
)

const stats = computed(() => ({
  total: allRows.value.length,
  pending: allRows.value.filter((r) => ['pending', 'model_failed'].includes(r.judgeStatus)).length,
  done: allRows.value.filter((r) => ['model_done', 'manual_done'].includes(r.judgeStatus)).length,
  downRisk: allRows.value.filter((r) => r.yieldTrend === 'down_risk').length
}))

const canJudge = (row) => ['pending', 'model_failed'].includes(row.judgeStatus)
const canGenerate = (row) => ['model_done', 'manual_done'].includes(row.judgeStatus) && !row.warningPushed && row.growthLevel !== 'good' && row.growthLevel !== 'normal'

// 长势同比对比（演示数据；分品种/分区域 今年vs去年，颜色区分，对应评标演示口径）
const compareDim = ref('crop')
const COMPARE_DATA = {
  crop: {
    cats: ['小麦', '水稻', '玉米', '大豆'],
    thisYear: [86, 92, 78, 88],
    lastYear: [82, 90, 84, 85]
  },
  region: {
    cats: ['涡阳县', '蒙城县', '太和县', '颍州区'],
    thisYear: [85, 91, 80, 87],
    lastYear: [83, 89, 85, 86]
  }
}
const compareOption = computed(() => {
  const d = COMPARE_DATA[compareDim.value]
  const diff = (i) => d.thisYear[i] - d.lastYear[i]
  return {
    tooltip: { trigger: 'axis', formatter: (ps) => `${ps[0].axisValue}<br/>` + ps.map((p) => `${p.marker}${p.seriesName}：${p.value}（${diff(p.dataIndex) >= 0 ? '+' : ''}${diff(p.dataIndex)}）`).join('<br/>') },
    legend: { data: ['2026年本期', '2025年同期'], top: 0 },
    grid: { left: 40, right: 20, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: d.cats },
    yAxis: { type: 'value', min: 60, max: 100, name: '长势指数' },
    series: [
      { name: '2026年本期', type: 'bar', data: d.thisYear, itemStyle: { color: '#2f8c76' }, barWidth: 22, label: { show: true, position: 'top', formatter: (p) => { const v = diff(p.dataIndex); return v >= 0 ? `+${v}` : `${v}` }, color: (p) => (diff(p.dataIndex) >= 0 ? '#2f8c76' : '#e64545') } },
      { name: '2025年同期', type: 'bar', data: d.lastYear, itemStyle: { color: '#b8c4cc' }, barWidth: 22 }
    ]
  }
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    allRows.value = await fetchGrowthRecords(userStore.role, {})
  } catch (e) {
    error.value = '长势记录加载失败：' + (e?.message || '网络异常，请重试')
  } finally {
    loading.value = false
  }
}

const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

const openJudge = (row) => {
  current.value = row
  judgeForm.level = ''
  judgeForm.trend = ''
  judgeForm.measure = row.measure || ''
  judgeForm.suggestion = row.suggestion || ''
  judgeVisible.value = true
}

const submitJudge = async () => {
  if (!judgeForm.level) return ElMessage.warning('请选择长势等级')
  if (!judgeForm.trend) return ElMessage.warning('请选择产量趋势')
  submitting.value = true
  try {
    const r = await judgeGrowth(current.value.id, {
      level: judgeForm.level,
      trend: judgeForm.trend,
      measure: judgeForm.measure,
      suggestion: judgeForm.suggestion,
      judgePerson: userStore.role?.name ? `${userStore.role.name}（演示）` : '研判人（演示）'
    })
    if (!r.success) return ElMessage.error(r.message || '人工研判失败')
    ElMessage.success('人工研判已提交')
    judgeVisible.value = false
    load()
  } finally {
    submitting.value = false
  }
}

const pushWarning = async (row) => {
  const r = await pushGrowthWarning(row.id)
  if (!r.success) return ElMessage.error(r.message || '预警推送失败')
  try {
    await ElMessageBox.confirm(`预警已推送至属地，事件已登记至变化图斑库（${r.code}，待派发）。是否前往事件库查看？`, '推送成功', {
      confirmButtonText: '前往事件库',
      cancelButtonText: '留在本页',
      type: 'success'
    })
    router.push('/fsr/events')
  } catch (e) { /* 留在本页 */ }
  load()
}

onMounted(load)
</script>

<style scoped lang="scss">
.fsr-page { overflow: auto; }
.page-head { display: flex; justify-content: space-between; margin-bottom: 14px; }
.page-head h2 { margin: 4px 0; font-size: 20px; font-weight: 600; }
.page-head p { margin: 0; color: var(--ah-text-secondary); font-size: 13px; }
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
.stat-card { padding: 14px 16px; background: #fff; border: 1px solid var(--ah-border); border-top: 3px solid var(--ah-primary); border-radius: 8px; }
.stat-card span, .stat-card small { display: block; color: var(--ah-text-muted); font-size: 12px; }
.stat-card strong { display: inline-block; margin: 6px 5px 2px 0; font-size: 24px; font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif; }
.stat-card.orange { border-top-color: var(--ah-warning); }
.stat-card.green { border-top-color: var(--ah-success); }
.stat-card.red { border-top-color: var(--ah-danger); }
.stat-note { margin: 0 0 12px; color: var(--ah-text-muted); font-size: 12px; }
.cell-sub { color: var(--ah-text-muted); font-size: 12px; }
.generated-no { color: var(--ah-text-muted); font-size: 12px; }
@media (max-width: 900px) { .stat-grid { grid-template-columns: 1fr 1fr; } }
</style>
