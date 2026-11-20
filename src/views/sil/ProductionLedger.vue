<template>
  <div class="page-container sil-ledger">
    <header class="page-head">
      <div>
        <h2>青贮饲料生产台账</h2>
        <p>以已备案种植计划和收储备案为底账，由主体补充实际播种、收割与收储执行数据，县、市、省按属地汇总。</p>
      </div>
      <div class="head-actions"><el-button @click="exportLedger">导出台账</el-button></div>
    </header>

    <section class="panel">
      <div class="summary-grid">
        <div class="summary-card"><span>备案种植面积（亩）</span><b>{{ plantingArea.toFixed(1) }}</b><small>{{ planting.length }} 份备案计划</small></div>
        <div class="summary-card"><span>实际收获面积（亩）</span><b>{{ actualArea.toFixed(1) }}</b><small>已填报 {{ plantingDone }} 份</small></div>
        <div class="summary-card"><span>备案收储重量（吨）</span><b>{{ storageWeight.toFixed(1) }}</b><small>{{ storage.length }} 份收储备案</small></div>
        <div class="summary-card"><span>实际收储重量（吨）</span><b>{{ actualWeight.toFixed(1) }}</b><small>已填报 {{ storageDone }} 份</small></div>
      </div>

      <el-tabs v-model="tab">
        <el-tab-pane :label="`种植台账（${planting.length}）`" name="planting">
          <el-table v-loading="loading" :data="planting" stripe border>
            <el-table-column label="备案号" min-width="190"><template #default="{ row }"><b>{{ row.filedNo }}</b><small class="cell-sub">{{ row.subjectName }}</small></template></el-table-column>
            <el-table-column prop="regionName" label="属地" min-width="170" />
            <el-table-column label="年度" width="110"><template #default="{ row }">{{ row.year }} {{ row.season }}</template></el-table-column>
            <el-table-column label="地块 / 面积" width="140"><template #default="{ row }">{{ row.plotCount }} 块 · {{ row.area }} 亩</template></el-table-column>
            <el-table-column label="预计产量" width="110"><template #default="{ row }">{{ row.expectedYield }} 吨</template></el-table-column>
            <el-table-column label="播种 / 收割" min-width="190"><template #default="{ row }">{{ row.progress.sowingDate || '—' }} / {{ row.progress.harvestDate || '—' }}</template></el-table-column>
            <el-table-column label="实际面积 / 产量" width="180"><template #default="{ row }">{{ row.progress.actualArea ?? '—' }} 亩 / {{ row.progress.actualYield ?? '—' }} 吨</template></el-table-column>
            <el-table-column label="填报状态" width="110"><template #default="{ row }"><el-tag size="small" :type="row.progress.filled ? 'success' : 'info'" effect="plain">{{ row.progress.filled ? '已填报' : '待填报' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="120" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openProgress(row)">{{ canEdit(row) ? '填报' : '查看' }}</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane :label="`收储台账（${storage.length}）`" name="storage">
          <el-table v-loading="loading" :data="storage" stripe border>
            <el-table-column label="备案号" min-width="190"><template #default="{ row }"><b>{{ row.filedNo }}</b><small class="cell-sub">{{ row.storageSubjectName }}</small></template></el-table-column>
            <el-table-column prop="regionName" label="属地" min-width="170" />
            <el-table-column label="作物 / 品种" min-width="160"><template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety }}</template></el-table-column>
            <el-table-column label="预计重量 / 价格" width="170"><template #default="{ row }">{{ row.expectedWeight }} 吨 / {{ row.price }} 元</template></el-table-column>
            <el-table-column label="实际重量 / 价格" width="170"><template #default="{ row }">{{ row.execution.actualWeight ?? '—' }} 吨 / {{ row.execution.actualPrice ?? '—' }} 元</template></el-table-column>
            <el-table-column label="执行日期" width="130"><template #default="{ row }">{{ row.execution.actualTime || '—' }}</template></el-table-column>
            <el-table-column label="来源地块" width="150"><template #default="{ row }"><span :class="{ 'text-warning': row.execution.filled && !(row.execution.sources || []).length }">{{ row.execution.sources?.length || 0 }} 块 / {{ row.execution.sourcesWeight || 0 }} 吨</span></template></el-table-column>
            <el-table-column label="用途" width="90"><template #default="{ row }">{{ SIL_STORAGE_USAGE[row.usage] }}</template></el-table-column>
            <el-table-column label="填报状态" width="110"><template #default="{ row }"><el-tag size="small" :type="row.execution.filled ? 'success' : 'info'" effect="plain">{{ row.execution.filled ? '已填报' : '待填报' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="120" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openExecution(row)">{{ canEditStorage(row) ? '填报' : '查看' }}</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
      <el-empty v-if="!loading && !currentRows.length" description="暂无台账数据，完成备案后自动生成" :image-size="70" />
    </section>

    <el-dialog v-model="progressVisible" title="种植进度填报" width="520px" append-to-body>
      <div class="dialog-target"><b>{{ progressRow?.subjectName }}</b><span>{{ progressRow?.filedNo }} · {{ progressRow?.area }} 亩</span></div>
      <el-form label-width="100px">
        <el-form-item label="播种时间"><el-date-picker v-model="progressForm.sowingDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" :disabled="!canEdit(progressRow)" /></el-form-item>
        <el-form-item label="收割时间"><el-date-picker v-model="progressForm.harvestDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" :disabled="!canEdit(progressRow)" /></el-form-item>
        <el-form-item label="实际面积"><el-input-number v-model="progressForm.actualArea" :min="0" :precision="1" controls-position="right" style="width: 200px" :disabled="!canEdit(progressRow)" /><span class="unit">亩</span></el-form-item>
        <el-form-item label="实际产量"><el-input-number v-model="progressForm.actualYield" :min="0" :precision="1" controls-position="right" style="width: 200px" :disabled="!canEdit(progressRow)" /><span class="unit">吨</span></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="progressVisible = false">关闭</el-button>
        <el-button v-if="canEdit(progressRow)" type="primary" :loading="saving" @click="saveProgress">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="executionVisible" title="实际收储登记" width="860px" append-to-body>
      <div class="dialog-target"><b>{{ executionRow?.storageSubjectName }}</b><span>{{ executionRow?.filedNo }} · 计划 {{ executionRow?.expectedWeight }} 吨 · {{ executionRow?.price }} 元/吨</span></div>
      <el-form label-width="100px">
        <el-form-item label="实际重量"><el-input-number v-model="executionForm.actualWeight" :min="0" :precision="1" controls-position="right" style="width: 200px" :disabled="!canEditStorage(executionRow)" /><span class="unit">吨</span></el-form-item>
        <el-form-item label="实际单价"><el-input-number v-model="executionForm.actualPrice" :min="0" :precision="0" controls-position="right" style="width: 200px" :disabled="!canEditStorage(executionRow)" /><span class="unit">元/吨</span></el-form-item>
        <el-form-item label="收储时间"><el-date-picker v-model="executionForm.actualTime" type="date" value-format="YYYY-MM-DD" style="width: 220px" :disabled="!canEditStorage(executionRow)" /></el-form-item>
        <el-form-item label="来源地块" class="picker-item">
          <PlotPicker v-model="executionForm.sources" :crop="executionRow?.crop" :filed-no="executionRow?.filedNo" :limit="executionForm.actualWeight || 0" :disabled="!canEditStorage(executionRow)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="executionVisible = false">关闭</el-button>
        <el-button v-if="canEditStorage(executionRow)" type="primary" :loading="saving" @click="saveExecution">保存登记</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import PlotPicker from '@/components/sil/PlotPicker.vue'
import { SIL_STORAGE_USAGE, silCropName, fetchLedger, savePlantingProgress, saveStorageExecution, matchPlanting } from '@/api/silPlan'

const userStore = useUserStore()
const route = useRoute()
const role = computed(() => userStore.role)
const tab = ref('planting')
const planting = ref([])
const storage = ref([])
const loading = ref(false)
const saving = ref(false)
const progressVisible = ref(false)
const progressRow = ref(null)
const progressForm = reactive({ sowingDate: '', harvestDate: '', actualArea: null, actualYield: null })
const executionVisible = ref(false)
const executionRow = ref(null)
const executionForm = reactive({ actualWeight: null, actualPrice: null, actualTime: '', sources: [] })

const plantingArea = computed(() => planting.value.reduce((sum, row) => sum + Number(row.area || 0), 0))
const actualArea = computed(() => planting.value.reduce((sum, row) => sum + Number(row.progress?.actualArea || 0), 0))
const storageWeight = computed(() => storage.value.reduce((sum, row) => sum + Number(row.expectedWeight || 0), 0))
const actualWeight = computed(() => storage.value.reduce((sum, row) => sum + Number(row.execution?.actualWeight || 0), 0))
const plantingDone = computed(() => planting.value.filter(row => row.progress?.filled).length)
const storageDone = computed(() => storage.value.filter(row => row.execution?.filled).length)
const currentRows = computed(() => tab.value === 'planting' ? planting.value : storage.value)

const canEdit = row => !!row && (role.value.code === 'county' || (role.value.code === 'grower' && row.subjectId === role.value.subjectId))
const canEditStorage = row => !!row && (role.value.code === 'county' || (role.value.code === 'storage_subject' && row.storageSubjectId === role.value.storageSubjectId))

async function load() {
  loading.value = true
  try {
    const data = await fetchLedger(role.value)
    planting.value = data.planting
    storage.value = data.storage
  } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}

function openProgress(row) {
  progressRow.value = row
  Object.assign(progressForm, { sowingDate: row.progress.sowingDate || '', harvestDate: row.progress.harvestDate || '', actualArea: row.progress.actualArea ?? null, actualYield: row.progress.actualYield ?? null })
  progressVisible.value = true
}
async function saveProgress() {
  saving.value = true
  try {
    const result = await savePlantingProgress({ planId: progressRow.value.planId, ...progressForm }, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success('种植进度已更新')
    progressVisible.value = false
    load()
  } finally { saving.value = false }
}

const todayStr = () => {
  const date = new Date()
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

async function openExecution(row) {
  executionRow.value = row
  Object.assign(executionForm, {
    actualWeight: row?.execution?.actualWeight ?? null,
    actualPrice: row?.execution?.actualPrice ?? row?.price ?? null,
    actualTime: row?.execution?.actualTime || todayStr(),
    sources: (row?.execution?.sources || []).map(source => ({ ...source }))
  })
  executionVisible.value = true
}

async function saveExecution() {
  if (!executionForm.actualWeight) return ElMessage.warning('请填写实际收储重量')
  if (!executionForm.actualTime) return ElMessage.warning('请选择实际收储时间')
  saving.value = true
  try {
    const result = await saveStorageExecution({ storageId: executionRow.value.storageId, ...executionForm }, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success('实际收储已登记')
    await load()
    const fresh = storage.value.find(item => item.id === executionRow.value.id)
    if (fresh) executionRow.value = fresh
  } finally { saving.value = false }
}

async function prefillSource(plotKey) {
  try {
    const rows = await matchPlanting({ minArea: 0 }, role.value)
    const option = rows.find(item => `${item.planId}:${item.plotId}` === plotKey)
    if (!option) return
    if (option.occupied) return ElMessage.warning(`该地块已被${option.occupiedBy}登记收储`)
    if (executionForm.sources.some(source => `${source.planId}:${source.plotId}` === plotKey)) return
    executionForm.sources.push({
      planId: option.planId, filedNo: option.filedNo, plotId: option.plotId, plotName: option.plotName,
      subjectId: option.subjectId, subjectName: option.subjectName, crop: option.crop, variety: option.variety,
      weight: Math.round(Number(option.remaining ?? option.expectedYield ?? 0) * 10) / 10
    })
  } catch { /* 忽略 */ }
}

function exportLedger() {
  const rows = tab.value === 'planting' ? planting.value : storage.value
  ElMessage.success(`已生成 ${tab.value === 'planting' ? '种植' : '收储'}台账导出任务（${rows.length} 条，演示环境不下载文件）`)
}

onMounted(async () => {
  if (route.query.tab === 'storage') tab.value = 'storage'
  await load()
  const plotKey = String(route.query.plot || '')
  if (!plotKey) return
  const target = storage.value.find(row => !row.execution.filled) || storage.value[0]
  if (!target) { ElMessage.warning('暂无可登记实际收储的收储备案，请先完成收储申报'); return }
  await openExecution(target)
  await prefillSource(plotKey)
})
watch(() => role.value?.code, load)
</script>

<style scoped lang="scss">
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.page-head h2 { font-size: 18px; margin-bottom: 6px; }
.page-head p { font-size: 12px; color: var(--ah-text-muted); line-height: 1.6; max-width: 820px; }
.panel { flex: 1; min-height: 0; overflow: auto; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
.summary-card { background: #f5f8fc; border: 1px solid #e6edf6; border-radius: 8px; padding: 12px 14px; }
.summary-card span, .summary-card b, .summary-card small { display: block; }
.summary-card span { font-size: 12px; color: var(--ah-text-muted); }
.summary-card b { font-size: 22px; color: var(--ah-primary); margin: 4px 0; }
.summary-card small { font-size: 11px; color: var(--ah-text-muted); }
.cell-sub { display: block; font-size: 11px; color: var(--ah-text-muted); margin-top: 3px; }
.dialog-target { background: #f5f8fc; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
.dialog-target b, .dialog-target span { display: block; }
.dialog-target span { font-size: 12px; color: var(--ah-text-muted); margin-top: 4px; }
.unit { margin-left: 8px; font-size: 12px; color: var(--ah-text-muted); }
/* 来源地块按图选择：标签上置、内容占满整行，避免列表被压窄 */
.picker-item { display: block; }
.picker-item :deep(.el-form-item__label) { display: block; width: auto !important; padding-bottom: 4px; text-align: left; line-height: 1.5; }
.picker-item :deep(.el-form-item__content) { display: block; margin-left: 0 !important; }
.text-warning { color: #d9822b; }
@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
