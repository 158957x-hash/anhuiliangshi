<template>
  <div class="page-container progress-page">
    <el-dialog v-model="reportVisible" title="主体收获进度上报详情" width="820px">
      <el-descriptions v-if="selectedReport" :column="2" border>
        <el-descriptions-item label="种植主体">{{ selectedReport.subjectName }}</el-descriptions-item>
        <el-descriptions-item label="所属地区">{{ selectedReport.regionName }}</el-descriptions-item>
        <el-descriptions-item label="上报作物数">{{ selectedReport.reports.length }} 种</el-descriptions-item>
        <el-descriptions-item label="最近填报日期">{{ selectedReport.updatedAt }}</el-descriptions-item>
      </el-descriptions>
      <el-table v-if="selectedReport" :data="selectedReport.reports" border stripe>
        <el-table-column prop="cropName" label="作物" width="100" />
        <el-table-column prop="planArea" label="计划面积（亩）" align="right" />
        <el-table-column prop="harvestedArea" label="已收获面积（亩）" align="right" />
        <el-table-column prop="harvestProgress" label="收获进度" width="120" align="center">
          <template #default="{ row }">{{ row.harvestProgress }}%</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="填报日期" width="120" />
      </el-table>
    </el-dialog>

    <div class="page-header">
      <div>
        <h2>收获进度调度</h2>
        <p>{{ isReadOnlyRole ? '按粮食计划查看收获进度，点击计划后查看下级行政区划进度。' : '持续维护收获进度；乡镇可代主体填报，县级可代乡镇填报并汇总。' }}</p>
      </div>
      <div class="scope-label">当前范围：{{ userStore.regionName }}</div>
    </div>

    <el-tabs v-model="activeTab" class="content-tabs">
      <el-tab-pane label="进度总览" name="overview">
        <div class="panel list-panel">
          <div class="toolbar">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.code">
                <span class="breadcrumb-link" @click="goToLevel(item)">{{ item.name }}</span>
              </el-breadcrumb-item>
            </el-breadcrumb>
            <span class="record-count">共 {{ currentRows.length }} 条记录</span>
          </div>

          <div v-if="isSubjectLevel" class="detail-tip">{{ currentRegionName }}种植主体收获进度上报明细</div>

          <el-table :data="currentRows" stripe border max-height="calc(100vh - 320px)">
            <el-table-column type="index" label="序号" width="65" align="center" />
            <el-table-column :label="isSubjectLevel ? '主体/地区' : currentChildLabel" min-width="190">
              <template #default="{ row }">
                <span v-if="isSubjectLevel">{{ row.subjectName || row.regionName }}</span>
                <el-button v-else link type="primary" @click="openLevel(row)">{{ row.name }}</el-button>
              </template>
            </el-table-column>
            <el-table-column v-if="isSubjectLevel" prop="planName" label="主体参考计划" min-width="220" show-overflow-tooltip />
            <el-table-column v-if="isSubjectLevel" prop="cropName" label="作物" width="100" />
            <el-table-column prop="planArea" :label="isSubjectLevel ? '主体参考面积（亩）' : '本级上报计划面积（亩）'" width="170" align="right" />
            <el-table-column prop="harvestedArea" label="已收获面积（亩）" width="150" align="right" />
            <el-table-column label="收获进度" width="190">
              <template #default="{ row }">
                <div class="progress-cell">
                  <el-progress :percentage="row.harvestProgress" :stroke-width="10" />
                  <span>{{ row.harvestProgress }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-if="isSubjectLevel" prop="updatedAt" label="填报日期" width="120" />
            <el-table-column v-if="isSubjectLevel" label="操作" width="130" fixed="right">
              <template #default="{ row }"><el-button link type="primary" @click="viewSubjectReport(row)">详情</el-button></template>
            </el-table-column>
            <el-table-column v-else label="操作" width="100" fixed="right">
              <template #default="{ row }"><el-button link type="primary" @click="openLevel(row)">下级</el-button></template>
            </el-table-column>
            <template #empty"><el-empty description="暂无上报进度记录" /></template>
          </el-table>
        </div>
      </el-tab-pane>
      <el-tab-pane v-if="!isReadOnlyRole" label="进度填报" name="report">
        <ProgressReportPanel type="harvest" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { fetchHarvestProgress, fetchProgressPlanOverview } from '@/api/gpm'
import { getRegion } from '@/mock/common/regions'
import ProgressReportPanel from './ProgressReportPanel.vue'

const userStore = useUserStore()
const records = ref([])
const reportVisible = ref(false)
const selectedReport = ref(null)
const currentCode = ref('')
const breadcrumbs = ref([])
const activeTab = ref('overview')
const roleLevel = computed(() => userStore.role?.code || 'province')
const currentRegion = computed(() => getRegion(currentCode.value))
const currentLevel = computed(() => breadcrumbs.value.length - 1)
const subjectLevel = computed(() => ({ province: 3, city: 2, county: 1, town: 0 }[roleLevel.value] ?? 3))
const isReadOnlyRole = computed(() => ['province', 'city'].includes(roleLevel.value))
const selectedPlanId = ref('')
const planOverview = ref([])
const isSubjectLevel = computed(() => selectedPlanId.value && (currentLevel.value >= subjectLevel.value || !currentRegion.value?.children?.length))
const currentRegionName = computed(() => currentRegion.value?.name || userStore.regionName || '本区域')
// 按区划编码判断下级层级（省→市、市→县、县→乡镇、乡镇→主体）
const childLevelOf = (code) => {
  if (!code || code === '340000') return 'city'
  if (String(code).length === 6 && String(code).endsWith('00')) return 'county'
  if (String(code).length === 6) return 'town'
  return 'subject'
}
const currentChildLabel = computed(() => isReadOnlyRole.value && !selectedPlanId.value ? '粮食计划' : ({ city: '市级地区', county: '县级地区', town: '乡镇地区', subject: '种植主体' }[childLevelOf(currentCode.value)] || '下级地区'))
const filters = { crop: '' }
const sumRows = rows => {
  const planArea = rows.reduce((sum, item) => sum + Number(item.planArea || 0), 0)
  const harvestedArea = rows.reduce((sum, item) => sum + Number(item.harvestedArea || 0), 0)
  return { planArea: Number(planArea.toFixed(1)), harvestedArea: Number(harvestedArea.toFixed(1)), harvestProgress: planArea ? Number((harvestedArea / planArea * 100).toFixed(1)) : 0 }
}
const rowsInRegion = code => records.value.filter(item => (!selectedPlanId.value || item.planId === selectedPlanId.value) && String(item.regionCode || '').startsWith(String(code)))
const planRows = computed(() => [...new Map(records.value.filter(item => Number(item.year) === 2026).map(item => [item.planId || item.planName, item])).values()].map(item => ({ ...sumRows(records.value.filter(row => (row.planId || row.planName) === (item.planId || item.planName))), planId: item.planId || item.planName, code: item.planId || item.planName, name: item.planName || `${item.year}年${item.quarter}${item.cropName || item.crop || ''}计划`, planName: item.planName || `${item.year}年${item.quarter}${item.cropName || item.crop || ''}计划`, year: item.year, quarter: item.quarter })))
const currentRows = computed(() => {
  if (!selectedPlanId.value) return planOverview.value
  if (isSubjectLevel.value) {
    const subjectRows = rowsInRegion(currentCode.value).filter(item => item.level === 'subject').filter(item => !filters.crop || item.crop === filters.crop)
    const grouped = new Map()
    subjectRows.forEach(item => {
      const key = item.subjectId || item.subjectName || item.regionCode
      const current = grouped.get(key) || { ...item, reports: [], planArea: 0, harvestedArea: 0 }
      current.reports.push(item)
      current.planArea += Number(item.planArea || 0)
      current.harvestedArea += Number(item.harvestedArea || 0)
      current.harvestProgress = current.planArea ? Number((current.harvestedArea / current.planArea * 100).toFixed(1)) : 0
      grouped.set(key, current)
    })
    return [...grouped.values()]
  }
  const level = childLevelOf(currentCode.value)
  return (currentRegion.value?.children || []).map(region => ({ ...region, ...sumRows(rowsInRegion(region.code).filter(item => item.level !== 'plan')) })).filter(item => item.planArea > 0)
})
const load = async () => {
  records.value = await fetchHarvestProgress(userStore.role || {})
  planOverview.value = await fetchProgressPlanOverview(userStore.role || {}, 'harvest')
  const roleRegionCode = userStore.role?.regionCode || '340000'
  currentCode.value = roleRegionCode
  const root = getRegion(roleRegionCode)
  breadcrumbs.value = root ? [root] : [{ code: roleRegionCode, name: userStore.regionName || '安徽省' }]
}
const openLevel = row => { if (!selectedPlanId.value) { selectedPlanId.value = row.planId; breadcrumbs.value = [...breadcrumbs.value, { code: row.planId, name: row.name }]; return } currentCode.value = row.code; breadcrumbs.value = [...breadcrumbs.value, row] }
const viewSubjectReport = row => { selectedReport.value = row; reportVisible.value = true }
const goToLevel = item => { const index = breadcrumbs.value.findIndex(row => row.code === item.code); if (index < 0) return; breadcrumbs.value = breadcrumbs.value.slice(0, index + 1); if (breadcrumbs.value.length <= 1) selectedPlanId.value = ''; currentCode.value = item.code }
onMounted(load)
</script>

<style lang="scss" scoped>
.progress-page { gap: 12px; overflow: auto; }
.content-tabs { flex: 1; min-height: 0; display: flex; flex-direction: column; :deep(.el-tabs__content) { flex: 1; overflow: auto; } }
.page-header { display: flex; align-items: center; justify-content: space-between; padding: 4px 2px; h2 { margin: 0; color: #1f2937; font-size: 20px; } p { margin: 8px 0 0; color: #909399; font-size: 13px; } }
.scope-label, .record-count { color: #606266; font-size: 13px; }
.list-panel { flex: 1; min-height: 0; padding: 16px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.breadcrumb-link { color: #409eff; cursor: pointer; }
.detail-tip { margin-bottom: 12px; padding: 10px 12px; color: #606266; background: #f4f8ff; border-radius: 4px; }
.progress-cell { display: flex; align-items: center; gap: 8px; :deep(.el-progress) { flex: 1; } span { width: 42px; color: #606266; text-align: right; } }
</style>
