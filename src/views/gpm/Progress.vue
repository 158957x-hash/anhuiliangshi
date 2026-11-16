<template>
  <div class="page-container progress-page">
    <el-dialog v-model="reportVisible" title="主体播种进度上报详情" width="820px">
      <el-descriptions v-if="selectedReport" :column="2" border class="report-summary">
        <el-descriptions-item label="种植主体">{{ selectedReport.subjectName }}</el-descriptions-item>
        <el-descriptions-item label="所属地区">{{ selectedReport.regionName }}</el-descriptions-item>
        <el-descriptions-item label="上报作物数">{{ selectedReport.reports.length }} 种</el-descriptions-item>
        <el-descriptions-item label="最近填报日期">{{ selectedReport.updatedAt }}</el-descriptions-item>
      </el-descriptions>
      <el-table v-if="selectedReport" :data="selectedReport.reports" border stripe class="report-table">
        <el-table-column prop="cropName" label="作物" width="100" />
        <el-table-column prop="planArea" label="计划面积（亩）" align="right" />
        <el-table-column prop="sownArea" label="已播面积（亩）" align="right" />
        <el-table-column label="播种进度" width="120" align="center">
          <template #default="{ row }">{{ row.sowProgress }}%</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="填报日期" width="120" />
      </el-table>
    </el-dialog>
    <div class="page-header">
      <div>
        <h2>播种进度调度</h2>
        <p>播种进度以已下达的种植计划为基准，主体按计划任务上报已播面积（免审直接生效），乡镇、县、市逐级上报审核至省级。</p>
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

          <div v-if="isSubjectLevel" class="detail-tip">
            {{ currentRegionName }}种植主体播种进度上报明细
          </div>

          <el-table :data="currentRows" stripe border max-height="calc(100vh - 320px)">
            <el-table-column type="index" label="序号" width="65" align="center" />
            <el-table-column :label="isSubjectLevel ? '主体/地区' : currentChildLabel" min-width="190">
              <template #default="{ row }">
                <span v-if="isSubjectLevel">{{ row.subjectName || row.regionName }}</span>
                <el-button v-else link type="primary" @click="openLevel(row)">{{ row.name }}</el-button>
              </template>
            </el-table-column>
            <el-table-column v-if="isSubjectLevel" prop="cropName" label="作物" width="100" />
            <el-table-column v-if="isSubjectLevel" prop="planName" label="下达计划" min-width="220" show-overflow-tooltip />
            <el-table-column v-if="isSubjectLevel" prop="cropName" label="计划作物" width="100" />
            <el-table-column prop="planArea" label="下达面积（亩）" width="140" align="right" />
            <el-table-column prop="sownArea" label="已播面积（亩）" width="140" align="right" />
            <el-table-column label="播种进度" width="190">
              <template #default="{ row }">
                <div class="progress-cell">
                  <el-progress :percentage="row.sowProgress" :stroke-width="10" />
                  <span>{{ row.sowProgress }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-if="isSubjectLevel" prop="updatedAt" label="填报日期" width="120" />
            <el-table-column v-if="isSubjectLevel" label="操作" width="130" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="viewSubjectReport(row)">查看上报</el-button>
              </template>
            </el-table-column>
            <el-table-column v-else label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openLevel(row)">查看下级</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无上报进度记录" />
            </template>
          </el-table>
        </div>
      </el-tab-pane>
      <el-tab-pane label="上报与审核" name="report">
        <ProgressReportPanel type="sow" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { fetchSowingProgress } from '@/api/gpm'
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
const isSubjectLevel = computed(() => currentLevel.value >= subjectLevel.value || !currentRegion.value?.children?.length)
const currentRegionName = computed(() => currentRegion.value?.name || userStore.regionName || '本区域')
// 按区划编码判断下级层级（省→市、市→县、县→乡镇、乡镇→主体）
const childLevelOf = (code) => {
  if (!code || code === '340000') return 'city'
  if (String(code).length === 6 && String(code).endsWith('00')) return 'county'
  if (String(code).length === 6) return 'town'
  return 'subject'
}
const currentChildLabel = computed(() => ({ city: '市级地区', county: '县级地区', town: '乡镇地区', subject: '种植主体' }[childLevelOf(currentCode.value)] || '下级地区'))

const sumRows = rows => {
  const planArea = rows.reduce((sum, item) => sum + Number(item.planArea || 0), 0)
  const sownArea = rows.reduce((sum, item) => sum + Number(item.sownArea || 0), 0)
  return {
    planArea: Number(planArea.toFixed(1)),
    sownArea: Number(sownArea.toFixed(1)),
    sowProgress: planArea ? Number((sownArea / planArea * 100).toFixed(1)) : 0
  }
}

const rowsInRegion = code => records.value.filter(item => String(item.regionCode || '').startsWith(String(code)))
const currentRows = computed(() => {
  if (isSubjectLevel.value) {
    const subjectRows = rowsInRegion(currentCode.value)
      .filter(item => item.level === 'subject')
      .filter(item => !filters.crop || item.crop === filters.crop)
    if (subjectRows.length) {
      const grouped = new Map()
      subjectRows.forEach(item => {
        const key = item.subjectId || item.subjectName || item.regionCode
        const current = grouped.get(key) || {
          ...item,
          reports: [],
          planArea: 0,
          sownArea: 0
        }
        current.reports.push(item)
        current.planArea += Number(item.planArea || 0)
        current.sownArea += Number(item.sownArea || 0)
        current.sowProgress = current.planArea ? Number((current.sownArea / current.planArea * 100).toFixed(1)) : 0
        grouped.set(key, current)
      })
      return [...grouped.values()]
    }

    return rowsInRegion(currentCode.value)
      .filter(item => item.level !== 'city' && item.level !== 'county')
      .filter(item => !filters.crop || item.crop === filters.crop)
      .map(item => ({ ...item, subjectName: item.subjectName || item.regionName }))
  }

  const level = childLevelOf(currentCode.value)
  return (currentRegion.value?.children || []).map(region => ({
    ...region,
    ...sumRows(rowsInRegion(region.code).filter(item => item.level === level))
  })).filter(item => item.planArea > 0)
})
const filters = { crop: '' }

const load = async () => {
  records.value = await fetchSowingProgress(userStore.role || {})
  const roleRegionCode = userStore.role?.regionCode || '340000'
  currentCode.value = roleRegionCode
  const root = getRegion(roleRegionCode)
  breadcrumbs.value = root ? [root] : [{ code: roleRegionCode, name: userStore.regionName || '安徽省' }]
}
const openLevel = row => {
  currentCode.value = row.code
  breadcrumbs.value = [...breadcrumbs.value, row]
}
const viewSubjectReport = row => {
  selectedReport.value = row
  reportVisible.value = true
}
const goToLevel = item => {
  const index = breadcrumbs.value.findIndex(row => row.code === item.code)
  if (index < 0) return
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  currentCode.value = item.code
}

onMounted(load)
</script>

<style lang="scss" scoped>
.progress-page {
  gap: 12px;
  overflow: auto;
}

.content-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
  }
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;

  h2 {
    margin: 0;
    color: #1f2937;
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: #909399;
    font-size: 13px;
  }
}

.scope-label {
  color: #606266;
  font-size: 13px;
}

.list-panel {
  flex: 1;
  min-height: 0;
  padding: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.breadcrumb-link {
  color: #409eff;
  cursor: pointer;
}

.record-count {
  color: #909399;
  font-size: 13px;
}

.detail-tip {
  margin-bottom: 12px;
  padding: 10px 12px;
  color: #606266;
  background: #f4f8ff;
  border-radius: 4px;
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  :deep(.el-progress) {
    flex: 1;
  }

  span {
    width: 42px;
    color: #606266;
    text-align: right;
  }
}

@media (max-width: 800px) {
  .page-header,
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
