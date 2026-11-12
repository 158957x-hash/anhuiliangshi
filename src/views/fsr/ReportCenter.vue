<template>
  <div class="page-container fsr-page">
    <div class="page-head">
      <div>
        <h2>事件简报与排名</h2>
        <p>查看已结案事件简报与地市处置排名（统计口径为演示口径，待业务确认）。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadAll">刷新数据</el-button>
    </div>

    <!-- 事件简报 -->
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">事件简报</span>
        <span class="title-extra text-secondary">共 {{ reports.length }} 份</span>
      </div>
      <el-alert v-if="reportError" type="error" :title="reportError" show-icon :closable="false" class="mb-12">
        <el-button size="small" type="primary" plain @click="loadReports">重试加载</el-button>
      </el-alert>
      <el-table v-loading="reportLoading" :data="reports" stripe border empty-text="暂无事件简报（事件复核结案后自动生成）">
        <el-table-column prop="reportNo" label="报告编号" width="140" />
        <el-table-column prop="eventCode" label="事件编号" width="140" />
        <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
        <el-table-column prop="generatedAt" label="生成时间" width="150" />
        <el-table-column prop="statVersion" label="统计口径版本" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openReport(row)">查看</el-button>
            <el-button link type="success" @click="downloadReport(row)">下载</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 地市排名 -->
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">地市排名</span>
        <span class="title-extra text-secondary">统计口径：{{ rankStatVersion }}</span>
      </div>
      <el-form inline class="mb-12">
        <el-form-item label="周期">
          <el-select v-model="period" style="width: 140px" @change="loadRank">
            <el-option v-for="i in periodOptions" :key="i.value" :label="i.label" :value="i.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="指标">
          <el-select v-model="metric" style="width: 140px" @change="loadRank">
            <el-option v-for="i in metricOptions" :key="i.value" :label="i.label" :value="i.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-alert v-if="rankError" type="error" :title="rankError" show-icon :closable="false" class="mb-12">
        <el-button size="small" type="primary" plain @click="loadRank">重试加载</el-button>
      </el-alert>
      <el-table
        v-loading="rankLoading" :data="rankRows" stripe border
        empty-text="暂无排名数据" :row-class-name="rankRowClass"
      >
        <el-table-column prop="rank" label="排名" width="70" align="center" />
        <el-table-column prop="city" label="地市" width="110" />
        <el-table-column prop="total" label="事件总数" width="100" align="center" />
        <el-table-column prop="closed" label="已结案" width="100" align="center" />
        <el-table-column prop="closeRate" label="办结率" width="100" align="center" />
        <el-table-column prop="avgDays" label="平均处置天数（天）" min-width="140" align="center" />
      </el-table>
      <p class="rank-note">说明：排名前三行以主色浅底高亮；周期与指标切换重新请求排名数据（演示周期内数据相同）。</p>
    </div>

    <!-- 简报查看抽屉 -->
    <el-drawer v-model="reportVisible" :title="curReport ? curReport.title : '事件简报'" size="520px">
      <template v-if="curReport">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="报告编号">{{ curReport.reportNo }}</el-descriptions-item>
          <el-descriptions-item label="事件编号">{{ curReport.eventCode }}</el-descriptions-item>
          <el-descriptions-item label="生成时间">{{ curReport.generatedAt }}</el-descriptions-item>
          <el-descriptions-item label="统计口径版本">{{ curReport.statVersion }}</el-descriptions-item>
        </el-descriptions>
        <div class="drawer-sec">简报摘要</div>
        <p class="summary-text">{{ curReport.summary }}</p>
        <div class="drawer-sec">简报字段清单</div>
        <div class="field-tags">
          <el-tag v-for="f in curReport.fields" :key="f" type="info" effect="plain">{{ f }}</el-tag>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchEventReports, fetchCityRank } from '@/api/fsr'

const reports = ref([])
const reportLoading = ref(false)
const reportError = ref('')
const reportVisible = ref(false)
const curReport = ref(null)

// 排名：周期（演示数据相同）与指标切换均重新请求
const period = ref('2026-10')
const metric = ref('total')
const periodOptions = [
  { value: '2026-10', label: '2026年10月' },
  { value: '2026-09', label: '2026年9月' }
]
const metricOptions = [
  { value: 'total', label: '事件总数' },
  { value: 'closeRate', label: '办结率' },
  { value: 'avgDays', label: '处置时效' }
]
const rankStatVersion = ref('')
const rankRows = ref([])
const rankLoading = ref(false)
const rankError = ref('')
const loading = computed(() => reportLoading.value || rankLoading.value)

const loadReports = async () => {
  reportLoading.value = true
  reportError.value = ''
  try {
    reports.value = await fetchEventReports()
  } catch (e) {
    reportError.value = '简报加载失败：' + (e?.message || '网络异常，请重试')
  } finally {
    reportLoading.value = false
  }
}

const loadRank = async () => {
  rankLoading.value = true
  rankError.value = ''
  try {
    const r = await fetchCityRank(period.value, metric.value)
    rankRows.value = r.rows || []
    rankStatVersion.value = r.statVersion || '演示口径 v1.0（待业务确认）'
  } catch (e) {
    rankError.value = '排名加载失败：' + (e?.message || '网络异常，请重试')
  } finally {
    rankLoading.value = false
  }
}

const rankRowClass = ({ row }) => (Number(row.rank) <= 3 ? 'rank-top-row' : '')

const loadAll = () => {
  loadReports()
  loadRank()
}

const openReport = (row) => {
  curReport.value = row
  reportVisible.value = true
}

const downloadReport = () => ElMessage.info('演示环境：简报下载待接入文件服务')

onMounted(loadAll)
</script>

<style scoped lang="scss">
.fsr-page { overflow: auto; }
.page-head { display: flex; justify-content: space-between; margin-bottom: 14px; }
.page-head h2 { margin: 4px 0; font-size: 20px; font-weight: 600; }
.page-head p { margin: 0; color: var(--ah-text-secondary); font-size: 13px; }
.drawer-sec { margin: 16px 0 10px; font-size: 15px; font-weight: 500; color: var(--ah-text); }
.summary-text { color: var(--ah-text-secondary); font-size: 14px; line-height: 1.8; margin: 0; }
.field-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.rank-note { margin: 10px 0 0; color: var(--ah-text-muted); font-size: 12px; }
:deep(.el-table .rank-top-row),
:deep(.el-table .rank-top-row td.el-table__cell) { background: var(--el-color-primary-light-9); }
</style>
