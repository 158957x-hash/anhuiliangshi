<template>
  <div class="report-panel">
    <el-alert class="flow-alert" type="info" :closable="false" title="上报流程：主体上报（免审，直接生效）→ 乡镇向县级上报 → 县级审核 → 县级向市级上报 → 市级审核 → 市级向省级上报 → 省级审核" />

    <div class="panel toolbar-panel">
      <el-form :inline="true" class="filters">
        <el-form-item label="年份"><el-select v-model="filters.year" style="width:120px" @change="loadAll"><el-option v-for="item in years" :key="item" :label="`${item}年`" :value="item" /></el-select></el-form-item>
        <el-form-item label="周期"><el-select v-model="filters.quarter" style="width:130px" @change="loadAll"><el-option v-for="item in quarters" :key="item" :label="item" :value="item" /></el-select></el-form-item>
        <el-button type="primary" @click="loadAll">刷新</el-button>
      </el-form>
      <div class="scope-label">当前范围：{{ role.regionName || '安徽省' }}</div>
    </div>

    <div class="metric-grid">
      <div class="metric-card"><span>计划面积</span><strong>{{ summary.planArea.toLocaleString() }}</strong><small>亩（{{ filters.year }}年{{ filters.quarter }}）</small></div>
      <div class="metric-card blue"><span>{{ isSow ? '已播面积' : '已收获面积' }}</span><strong>{{ summary.doneArea.toLocaleString() }}</strong><small>亩（下级上报汇总）</small></div>
      <div class="metric-card green"><span>{{ isSow ? '播种' : '收获' }}进度</span><strong>{{ summary.progress }}%</strong><small>已完成 / 计划</small></div>
      <div class="metric-card orange"><span>上报主体数</span><strong>{{ summary.subjectCount }}</strong><small>辖区内种植主体</small></div>
    </div>

    <div class="panel">
      <div class="panel-title"><span class="title-text">下级上报明细</span><span class="title-extra">点击下级名称可逐级下钻至乡镇和主体</span></div>
      <div class="toolbar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.code"><span class="breadcrumb-link" @click="goToLevel(item)">{{ item.name }}</span></el-breadcrumb-item>
        </el-breadcrumb>
        <span class="record-count">共 {{ drillRows.length }} 条</span>
      </div>
      <el-table :data="drillRows" stripe border max-height="360">
        <el-table-column type="index" label="序号" width="65" align="center" />
        <el-table-column v-if="currentDrillLevel !== 'subject'" :label="childLabel" min-width="170">
          <template #default="{ row }"><el-button link type="primary" @click="openLevel(row)">{{ row.name }}</el-button></template>
        </el-table-column>
        <el-table-column v-if="currentDrillLevel === 'subject'" prop="subjectName" label="种植主体" min-width="200" show-overflow-tooltip />
        <el-table-column v-if="currentDrillLevel === 'subject'" prop="cropName" :label="isSow ? '已播作物' : '收获作物'" width="100" />
        <el-table-column prop="planArea" label="计划面积（亩）" width="140" align="right" />
        <el-table-column prop="doneArea" :label="isSow ? '已播面积（亩）' : '已收获面积（亩）'" width="150" align="right" />
        <el-table-column label="进度" width="180">
          <template #default="{ row }"><div class="progress-cell"><el-progress :percentage="Number(row.progress || 0)" :stroke-width="10" /><span>{{ Number(row.progress || 0) }}%</span></div></template>
        </el-table-column>
        <el-table-column v-if="currentDrillLevel === 'subject'" prop="updatedAt" label="填报日期" width="110" />
        <el-table-column v-if="currentDrillLevel !== 'subject'" label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openLevel(row)">查看下级</el-button></template></el-table-column>
        <template #empty><el-empty description="当前层级暂无上报数据" /></template>
      </el-table>
    </div>

    <div v-if="canReport" class="panel">
      <div class="panel-title">
        <span class="title-text">上报管理（{{ levelNameMap[roleCode] || '' }} → {{ parentName }}）</span>
        <el-button type="primary" @click="submit">向{{ parentName }}上报</el-button>
      </div>
      <el-alert v-if="roleCode !== 'town'" type="warning" :closable="false" class="report-tip" :title="`上报前需先完成辖区内${childLevelName}上报单的审核（至少一张审核通过），上级汇总数据以辖区内下级上报为准。`" />
      <el-table :data="myOrders" stripe border max-height="260">
        <el-table-column prop="year" label="年份" width="80"><template #default="{ row }">{{ row.year }}年</template></el-table-column>
        <el-table-column prop="quarter" label="周期" width="100" />
        <el-table-column label="上报对象" width="100"><template #default="{ row }">{{ row.auditLevelName }}</template></el-table-column>
        <el-table-column label="汇总数据" min-width="220"><template #default="{ row }">计划 {{ row.summary.planArea.toLocaleString() }} 亩 · {{ isSow ? '已播' : '已收获' }} {{ row.summary.doneArea.toLocaleString() }} 亩（{{ row.summary.progress }}%）</template></el-table-column>
        <el-table-column prop="reportedAt" label="上报时间" width="110" />
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag size="small" :type="orderTagType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column label="审核意见" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.auditOpinion || '—' }}</template></el-table-column>
        <el-table-column label="操作" width="130" fixed="right"><template #default="{ row }"><el-button v-if="row.status === '已驳回'" link type="primary" @click="submit">重新上报</el-button><el-button link type="primary" @click="openDetail(row)">查看详情</el-button></template></el-table-column>
        <template #empty><el-empty :description="`尚未上报${filters.year}年${filters.quarter}${isSow ? '播种' : '收获'}进度`" /></template>
      </el-table>
    </div>

    <div v-if="canAudit" class="panel">
      <div class="panel-title"><span class="title-text">待我审核的{{ childLevelName }}上报单</span><span class="title-extra">审核时可查看下级上报明细，支持逐级下钻到乡镇</span></div>
      <el-table :data="auditOrders" stripe border max-height="300">
        <el-table-column prop="year" label="年份" width="80"><template #default="{ row }">{{ row.year }}年</template></el-table-column>
        <el-table-column prop="quarter" label="周期" width="100" />
        <el-table-column :label="`${childLevelName}地区`" min-width="150"><template #default="{ row }">{{ row.regionName }}</template></el-table-column>
        <el-table-column label="上报单位" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.reporter }}</template></el-table-column>
        <el-table-column label="汇总数据" min-width="220"><template #default="{ row }">计划 {{ row.summary.planArea.toLocaleString() }} 亩 · {{ isSow ? '已播' : '已收获' }} {{ row.summary.doneArea.toLocaleString() }} 亩（{{ row.summary.progress }}%）</template></el-table-column>
        <el-table-column prop="reportedAt" label="上报时间" width="110" />
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag size="small" :type="orderTagType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">{{ row.canAudit ? '审核' : '查看' }}</el-button></template></el-table-column>
        <template #empty><el-empty description="暂无待审核的上报单" /></template>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" :title="`上报单详情${currentOrder?.canAudit ? '（审核）' : ''}`" width="960px" top="4vh" destroy-on-close>
      <template v-if="currentOrder">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="上报周期">{{ currentOrder.year }}年{{ currentOrder.quarter }}</el-descriptions-item>
          <el-descriptions-item label="上报层级">{{ levelNameMap[currentOrder.level] || '' }}</el-descriptions-item>
          <el-descriptions-item label="上报对象">{{ currentOrder.auditLevelName }}</el-descriptions-item>
          <el-descriptions-item label="上报单位" :span="2">{{ currentOrder.reporter }}</el-descriptions-item>
          <el-descriptions-item label="上报时间">{{ currentOrder.reportedAt }}</el-descriptions-item>
          <el-descriptions-item label="计划面积">{{ currentOrder.summary.planArea.toLocaleString() }} 亩</el-descriptions-item>
          <el-descriptions-item :label="isSow ? '已播面积' : '已收获面积'">{{ currentOrder.summary.doneArea.toLocaleString() }} 亩</el-descriptions-item>
          <el-descriptions-item label="进度">{{ currentOrder.summary.progress }}%</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag size="small" :type="orderTagType(currentOrder.status)">{{ currentOrder.status }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="审核单位">{{ currentOrder.auditor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ currentOrder.auditedAt || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-title"><b>上报明细（可下钻）</b><span class="drill-tip">点击行查看下级，直至乡镇和种植主体</span></div>
        <div class="toolbar">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in auditBreadcrumbs" :key="item.code"><span class="breadcrumb-link" @click="goToAuditLevel(item)">{{ item.name }}</span></el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <el-table :data="auditDrillRows" stripe border max-height="260">
          <el-table-column v-if="auditDrillLevel !== 'subject'" :label="auditChildLabel" min-width="170">
            <template #default="{ row }"><el-button link type="primary" @click="openAuditLevel(row)">{{ row.name }}</el-button></template>
          </el-table-column>
          <el-table-column v-if="auditDrillLevel === 'subject'" prop="subjectName" label="种植主体" min-width="200" show-overflow-tooltip />
          <el-table-column v-if="auditDrillLevel === 'subject'" prop="cropName" label="作物" width="100" />
          <el-table-column prop="planArea" label="计划面积（亩）" width="140" align="right" />
          <el-table-column prop="doneArea" :label="isSow ? '已播面积（亩）' : '已收获面积（亩）'" width="150" align="right" />
          <el-table-column label="进度" width="170"><template #default="{ row }"><span>{{ Number(row.progress || 0) }}%</span></template></el-table-column>
          <el-table-column v-if="auditDrillLevel === 'subject'" prop="updatedAt" label="填报日期" width="110" />
          <template #empty><el-empty description="暂无明细数据" /></template>
        </el-table>

        <div class="detail-title"><b>流转记录</b></div>
        <el-timeline class="order-timeline">
          <el-timeline-item v-for="(item, index) in currentOrder.timeline" :key="index" :timestamp="item.time" placement="top">
            <b>{{ item.operator }}</b><span class="timeline-action">{{ item.action }}</span>
          </el-timeline-item>
        </el-timeline>
        <el-alert v-if="currentOrder.auditOpinion" type="warning" :closable="false" :title="`最近审核意见：${currentOrder.auditOpinion}`" />

        <template v-if="currentOrder.canAudit">
          <div class="detail-title"><b>审核操作</b></div>
          <el-input v-model="auditOpinion" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="请填写审核意见（驳回时必填）" />
          <div class="audit-actions">
            <el-button type="success" @click="audit(true)">审核通过</el-button>
            <el-button type="danger" @click="audit(false)">驳回</el-button>
          </div>
        </template>
      </template>
      <template #footer><el-button @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchProgressReportRows, fetchProgressReportOrders, submitProgressReport, auditProgressReport } from '@/api/gpm'
import { getRegion } from '@/mock/common/regions'
import { useUserStore } from '@/stores/user'

const props = defineProps({ type: { type: String, default: 'sow' } })
const userStore = useUserStore()
const role = computed(() => userStore.role || {})
const roleCode = computed(() => role.value.code)
const regionCode = computed(() => role.value.regionCode || '340000')
const isSow = computed(() => props.type === 'sow')
const years = [2026, 2025, 2024]
const quarters = ['全年', '第一季度', '第二季度', '第三季度', '第四季度']
const filters = reactive({ year: 2026, quarter: '第三季度' })
const rows = ref([])
const orders = ref([])
const levelNameMap = { town: '乡镇', county: '县级', city: '市级' }

const canReport = computed(() => ['town', 'county', 'city'].includes(roleCode.value))
const canAudit = computed(() => ['county', 'city', 'province'].includes(roleCode.value))
const parentName = computed(() => ({ town: '县级', county: '市级', city: '省级' }[roleCode.value] || ''))
const childLevelName = computed(() => ({ county: '乡镇', city: '县级', province: '市级' }[roleCode.value] || ''))
const orderTagType = (status) => ({ 待审核: 'warning', 审核通过: 'success', 已驳回: 'danger' }[status] || 'info')

const quarterMatch = (item) => !filters.quarter || filters.quarter === '全年' || item.quarter === filters.quarter
const scopedRows = computed(() => rows.value.filter((item) => Number(item.year) === Number(filters.year) && quarterMatch(item) && String(item.regionCode || '').startsWith(String(regionCode.value))))
const summary = computed(() => {
  const planArea = scopedRows.value.reduce((sum, item) => sum + Number(item.planArea || 0), 0)
  const doneArea = scopedRows.value.reduce((sum, item) => sum + Number((isSow.value ? item.sownArea : item.harvestedArea) || 0), 0)
  return {
    planArea: Number(planArea.toFixed(1)),
    doneArea: Number(doneArea.toFixed(1)),
    progress: planArea ? Number((doneArea / planArea * 100).toFixed(1)) : 0,
    subjectCount: new Set(scopedRows.value.filter((item) => item.level === 'subject').map((item) => item.subjectId || item.subjectName)).size
  }
})

// ===== 下钻（下级上报明细）=====
const drillCode = ref('')
const breadcrumbs = ref([])
const childLevelOf = (code) => {
  if (!code || code === '340000') return 'city'
  if (String(code).length === 6 && String(code).endsWith('00')) return 'county'
  if (String(code).length === 6) return 'town'
  return 'subject'
}
const sumOf = (list) => {
  const planArea = list.reduce((sum, item) => sum + Number(item.planArea || 0), 0)
  const doneArea = list.reduce((sum, item) => sum + Number((isSow.value ? item.sownArea : item.harvestedArea) || 0), 0)
  return { planArea: Number(planArea.toFixed(1)), doneArea: Number(doneArea.toFixed(1)), progress: planArea ? Number((doneArea / planArea * 100).toFixed(1)) : 0 }
}
const rowsIn = (code) => scopedRows.value.filter((item) => String(item.regionCode || '').startsWith(String(code)))
const currentDrillLevel = computed(() => childLevelOf(drillCode.value || regionCode.value))
const childLabel = computed(() => ({ city: '市级地区', county: '县级地区', town: '乡镇地区', subject: '种植主体' }[currentDrillLevel.value]))
const drillRows = computed(() => {
  const code = drillCode.value || regionCode.value
  const region = getRegion(code)
  const level = childLevelOf(code)
  if (level === 'subject' || !region?.children?.length) {
    return rowsIn(code).filter((item) => item.level === 'subject').map((item) => ({ ...item, doneArea: Number((isSow.value ? item.sownArea : item.harvestedArea) || 0), progress: item.planArea ? Number((Number((isSow.value ? item.sownArea : item.harvestedArea) || 0) / Number(item.planArea) * 100).toFixed(1)) : 0 }))
  }
  return (region.children || []).map((child) => ({ code: child.code, name: child.name, ...sumOf(rowsIn(child.code).filter((item) => item.level === level)) })).filter((item) => item.planArea > 0)
})
const openLevel = (row) => { drillCode.value = row.code; breadcrumbs.value = [...breadcrumbs.value, row] }
const goToLevel = (item) => {
  const index = breadcrumbs.value.findIndex((row) => row.code === item.code)
  if (index < 0) return
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  drillCode.value = item.code
}

// ===== 上报单 =====
const myOrders = computed(() => orders.value.filter((item) => item.regionCode === regionCode.value && item.level === roleCode.value))
const auditOrders = computed(() => orders.value.filter((item) => item.level === ({ county: 'town', city: 'county', province: 'city' }[roleCode.value] || '')))
const submit = async () => {
  try {
    await ElMessageBox.confirm(`确认将 ${filters.year}年${filters.quarter} ${isSow.value ? '播种' : '收获'}进度向${parentName.value}上报吗？上报数据为当前辖区内下级上报汇总。`, '上报确认', { type: 'warning' })
  } catch { return }
  const result = await submitProgressReport(role.value, { type: props.type, year: filters.year, quarter: filters.quarter })
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success(`已向${parentName.value}上报，等待审核`)
  await loadOrders()
}

// ===== 审核弹窗 =====
const detailVisible = ref(false)
const currentOrder = ref(null)
const auditOpinion = ref('')
const auditDrillCode = ref('')
const auditBreadcrumbs = ref([])
const auditDrillLevel = computed(() => childLevelOf(auditDrillCode.value || currentOrder.value?.regionCode))
const auditChildLabel = computed(() => ({ city: '市级地区', county: '县级地区', town: '乡镇地区', subject: '种植主体' }[auditDrillLevel.value]))
const auditScopeRows = computed(() => {
  const order = currentOrder.value
  if (!order) return []
  return rows.value.filter((item) => Number(item.year) === Number(order.year) && (!order.quarter || order.quarter === '全年' || item.quarter === order.quarter) && String(item.regionCode || '').startsWith(String(order.regionCode)))
})
const auditRowsIn = (code) => auditScopeRows.value.filter((item) => String(item.regionCode || '').startsWith(String(code)))
const auditDrillRows = computed(() => {
  const order = currentOrder.value
  if (!order) return []
  const code = auditDrillCode.value || order.regionCode
  const region = getRegion(code)
  const level = childLevelOf(code)
  if (level === 'subject' || !region?.children?.length) {
    return auditRowsIn(code).filter((item) => item.level === 'subject').map((item) => ({ ...item, doneArea: Number((isSow.value ? item.sownArea : item.harvestedArea) || 0), progress: item.planArea ? Number((Number((isSow.value ? item.sownArea : item.harvestedArea) || 0) / Number(item.planArea) * 100).toFixed(1)) : 0 }))
  }
  return (region.children || []).map((child) => ({ code: child.code, name: child.name, ...sumOf(auditRowsIn(child.code).filter((item) => item.level === level)) })).filter((item) => item.planArea > 0)
})
const openAuditLevel = (row) => { auditDrillCode.value = row.code; auditBreadcrumbs.value = [...auditBreadcrumbs.value, row] }
const goToAuditLevel = (item) => {
  const index = auditBreadcrumbs.value.findIndex((row) => row.code === item.code)
  if (index < 0) return
  auditBreadcrumbs.value = auditBreadcrumbs.value.slice(0, index + 1)
  auditDrillCode.value = item.code
}
const openDetail = (row) => {
  currentOrder.value = row
  auditOpinion.value = ''
  auditDrillCode.value = ''
  auditBreadcrumbs.value = [{ code: row.regionCode, name: row.regionName }]
  detailVisible.value = true
}
const audit = async (approved) => {
  if (!approved && !auditOpinion.value.trim()) return ElMessage.warning('驳回时必须填写审核意见')
  try {
    await ElMessageBox.confirm(`确认${approved ? '审核通过' : '驳回'}「${currentOrder.value.regionName}」的上报单吗？`, '审核确认', { type: 'warning' })
  } catch { return }
  const result = await auditProgressReport(currentOrder.value.id, { approved, opinion: auditOpinion.value }, role.value)
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success(approved ? '已审核通过' : '已驳回')
  detailVisible.value = false
  await loadOrders()
}

const loadOrders = async () => { orders.value = await fetchProgressReportOrders(role.value, { type: props.type, year: filters.year, quarter: filters.quarter }) }
const loadAll = async () => {
  rows.value = await fetchProgressReportRows(role.value, { type: props.type })
  await loadOrders()
  const root = { code: regionCode.value, name: role.value.regionName || '安徽省' }
  breadcrumbs.value = [root]
  drillCode.value = root.code
}
onMounted(loadAll)
</script>

<style lang="scss" scoped>
.report-panel{display:flex;flex-direction:column;gap:12px}
.flow-alert :deep(.el-alert__title){font-size:13px}
.toolbar-panel{display:flex;align-items:center;justify-content:space-between}
.toolbar-panel .filters{display:flex;align-items:center;margin:0}
.toolbar-panel :deep(.el-form-item){margin:0 12px 0 0}
.scope-label{color:#606266;font-size:13px}
.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.metric-card{padding:14px 16px;background:#fff;border-left:4px solid #8a97a8;border-radius:8px;box-shadow:0 1px 4px rgba(15,62,120,.06)}
.metric-card.blue{border-color:var(--ah-primary,#1668DC)}
.metric-card.green{border-color:var(--ah-success,#2d8c72)}
.metric-card.orange{border-color:#d9942d}
.metric-card span,.metric-card small{display:block;color:var(--ah-text-secondary,#718096);font-size:12px}
.metric-card strong{display:block;margin:5px 0 2px;font-size:22px;color:var(--ah-text,#1f2937)}
.panel{background:#fff;border:1px solid #e8edf3;border-radius:8px;padding:16px}
.panel-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.title-text{font-weight:600;color:var(--ah-text,#1f2937)}
.title-extra{color:var(--ah-text-secondary,#718096);font-size:12px}
.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.breadcrumb-link{color:#409eff;cursor:pointer}
.record-count{color:#909399;font-size:13px}
.progress-cell{display:flex;align-items:center;gap:8px}
.progress-cell :deep(.el-progress){flex:1}
.progress-cell span{width:44px;color:#606266;text-align:right;font-size:12px}
.report-tip{margin-bottom:12px}
.detail-title{display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px}
.drill-tip{color:var(--ah-text-secondary,#718096);font-size:12px}
.order-timeline{margin-top:6px;padding-left:4px}
.timeline-action{margin-left:10px;color:#606266}
.audit-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px}
@media (max-width:900px){.metric-grid{grid-template-columns:repeat(2,1fr)}}
</style>
