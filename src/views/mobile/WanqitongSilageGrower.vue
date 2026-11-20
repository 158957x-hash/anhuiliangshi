<template>
  <div class="mobile-silage grower">
    <header><el-button link @click="router.push('/mobile/wanqitong')">‹ 返回</el-button><b>青贮饲料管理</b><span /></header>

    <section class="hero">
      <div class="hero-top"><b>{{ role.unit || role.name }}</b><el-tag size="small" effect="dark" type="success">种植主体</el-tag></div>
      <p>{{ role.regionName }} · 青贮种植计划申报、种植进度填报与受灾补充上报</p>
    </section>

    <nav class="mobile-tabs">
      <button v-for="item in tabs" :key="item.key" :class="{ active: tab === item.key }" @click="switchTab(item.key)">{{ item.label }}</button>
    </nav>

    <!-- 我的青贮种植计划 -->
    <template v-if="tab === 'plans'">
      <div class="section-head"><div><h3>我的青贮种植计划</h3><p>按地块申报青贮作物、品种与预计产量，提交后由县级备案。</p></div><el-button type="primary" size="small" @click="openPlanForm()">申报</el-button></div>
      <div v-loading="loading">
        <article v-for="item in plans" :key="item.id" class="record-card">
          <div class="card-head"><b>{{ item.year }} 年 {{ item.season }}</b><el-tag size="small" :type="SIL_PLAN_STATUS[item.status]?.tag">{{ SIL_PLAN_STATUS[item.status]?.name }}</el-tag></div>
          <small>{{ item.filedNo || item.id }}</small>
          <p>{{ item.plots?.length }} 块地 · {{ Number(item.area).toFixed(1) }} 亩 · 预计 {{ Number(item.expectedYield).toFixed(1) }} 吨</p>
          <p class="crop">{{ cropText(item) }}</p>
          <p v-if="item.status === 'filed'" class="crop">进度：{{ item.progress?.filled ? `已填报 · 实际 ${item.progress?.actualYield ?? '—'} 吨` : '待填报' }}</p>
          <div class="record-actions">
            <el-button link type="primary" @click="openDetail(item)">查看详情</el-button>
            <el-button v-if="['draft','rejected'].includes(item.status)" link type="primary" @click="openPlanForm(item)">{{ item.status === 'rejected' ? '修改重报' : '继续填写' }}</el-button>
            <el-button v-if="item.status === 'filed'" link type="primary" @click="openProgress(item)">维护进度</el-button>
            <el-button link type="primary" @click="openDisaster()">受灾上报</el-button>
          </div>
        </article>
        <el-empty v-if="!loading && !plans.length" description="暂无青贮种植计划，点击右上角申报" :image-size="65" />
      </div>
    </template>

    <!-- 种植进度 -->
    <template v-else-if="tab === 'progress'">
      <div class="section-head"><div><h3>种植进度</h3><p>补充实际播种、收割时间与面积产量，进入生产台账。</p></div></div>
      <article v-for="item in filedPlans" :key="item.id" class="record-card">
        <div class="card-head"><b>{{ item.filedNo }}</b><el-tag size="small" :type="item.progress?.filled ? 'success' : 'info'" effect="plain">{{ item.progress?.filled ? '已填报' : '待填报' }}</el-tag></div>
        <p>{{ item.plots?.length }} 块 · {{ item.area }} 亩 · 预计 {{ item.expectedYield }} 吨</p>
        <p class="crop">播种 {{ item.progress?.sowingDate || '—' }} · 收割 {{ item.progress?.harvestDate || '—' }}</p>
        <p class="crop">实际 {{ item.progress?.actualArea ?? '—' }} 亩 / {{ item.progress?.actualYield ?? '—' }} 吨</p>
        <div class="record-actions"><el-button link type="primary" @click="openProgress(item)">{{ item.progress?.filled ? '修改进度' : '填报进度' }}</el-button></div>
      </article>
      <el-empty v-if="!filedPlans.length" description="青贮计划备案通过后可维护种植进度" :image-size="65" />
    </template>

    <!-- 受灾上报 -->
    <template v-else>
      <div class="section-head"><div><h3>受灾补充上报</h3><p>按粮食计划的受灾地块上报面积与原因，县级确认后纳入补充收储；无粮食计划可手动填写地块。</p></div><el-button type="primary" size="small" @click="openDisaster()">上报</el-button></div>
      <article v-for="item in disasters" :key="item.id" class="record-card">
        <div class="card-head"><b>{{ item.plotName }}</b><el-tag size="small" :type="SIL_DISASTER_STATUS[item.status]?.tag">{{ SIL_DISASTER_STATUS[item.status]?.name }}</el-tag></div>
        <small>{{ item.id }} · {{ item.planNo || '手动填报' }}</small>
        <p>{{ item.cropName || grainCropName(item.crop) }} · 受灾 {{ item.affectedArea }} / {{ item.plotArea }} 亩（{{ item.affectedRatio }}%）</p>
        <p class="crop">{{ item.reason }}</p>
        <p v-if="item.confirmNo" class="crop">补充收储编号 {{ item.confirmNo }}</p>
      </article>
      <el-empty v-if="!disasters.length" description="暂无受灾上报" :image-size="65" />
    </template>

    <!-- 计划详情 -->
    <el-dialog class="mobile-sheet" v-model="detailVisible" title="青贮种植计划详情" width="94%">
      <DeclareDetail :row="detailRow || {}" type="plan" />
      <template #footer><el-button type="primary" @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>

    <!-- 种植计划表单 -->
    <el-dialog class="mobile-sheet" v-model="planDialog" :title="planForm.id ? '青贮种植计划修改重报' : '申报青贮种植计划'" width="94%">
      <el-form label-position="top">
        <el-form-item label="计划年度"><el-select v-model="planForm.year" style="width: 100%"><el-option v-for="year in [2026, 2027, 2028]" :key="year" :label="`${year} 年 春夏季`" :value="year" /></el-select></el-form-item>
        <el-form-item label="选择地块并填写青贮作物、品种、预计产量">
          <div class="plot-list">
            <div v-for="row in planForm.rows" :key="row.id" class="plot-row" :class="{ checked: row.checked }">
              <el-checkbox v-model="row.checked">{{ row.name }}（{{ row.areaMu }} 亩）</el-checkbox>
              <template v-if="row.checked">
                <el-select v-model="row.crop" size="small" placeholder="作物"><el-option v-for="crop in cropOptions" :key="crop.code" :label="crop.name" :value="crop.code" /></el-select>
                <el-input v-model="row.variety" size="small" placeholder="品种" />
                <el-input-number v-model="row.expectedYield" size="small" :min="0" :precision="1" controls-position="right" />
              </template>
            </div>
            <el-empty v-if="!planForm.rows.length" description="主体暂无可申报地块" :image-size="50" />
          </div>
        </el-form-item>
        <el-form-item><el-checkbox v-model="planForm.promiseAccepted">我已阅读并签署电子承诺书（数据真实，未备案不收储）</el-checkbox></el-form-item>
      </el-form>
      <template #footer><el-button @click="planDialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitPlan">提交备案</el-button></template>
    </el-dialog>

    <!-- 进度表单 -->
    <el-dialog class="mobile-sheet" v-model="progressDialog" title="青贮种植进度填报" width="94%">
      <el-form label-position="top">
        <el-form-item label="播种时间"><el-date-picker v-model="progressForm.sowingDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="收割时间"><el-date-picker v-model="progressForm.harvestDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="实际面积（亩）"><el-input-number v-model="progressForm.actualArea" :min="0" :precision="1" controls-position="right" style="width: 100%" /></el-form-item>
        <el-form-item label="实际产量（吨）"><el-input-number v-model="progressForm.actualYield" :min="0" :precision="1" controls-position="right" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="progressDialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitProgress">保存</el-button></template>
    </el-dialog>

    <!-- 受灾表单：粮食计划可选，地块可改面积/作物，也可手动添加 -->
    <el-dialog class="mobile-sheet" v-model="disasterDialog" title="受灾补充上报" width="94%">
      <el-form label-position="top">
        <el-form-item label="粮食种植计划（可选）">
          <el-select v-model="disasterForm.planId" clearable placeholder="选计划带出地块，不选也可手动填" style="width: 100%" @change="onDisasterPlanChange">
            <el-option v-for="plan in grainPlans" :key="plan.id" :label="`${plan.planName} · ${plan.cropType}`" :value="plan.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="受灾地块（申报主体是地块）">
          <div class="plot-list">
            <div v-for="(row, index) in disasterForm.rows" :key="row.key" class="plot-row" :class="{ checked: row.checked }">
              <div class="plot-line">
                <el-checkbox v-model="row.checked">{{ row.manual ? '手动添加' : '粮食计划地块' }}</el-checkbox>
                <el-tag size="small" effect="plain" :type="row.manual ? 'info' : 'success'">{{ row.manual ? '手动' : '计划' }}</el-tag>
                <el-button v-if="row.manual" link type="danger" size="small" @click="removeDisasterRow(index)">移除</el-button>
              </div>
              <template v-if="row.checked">
                <label class="plot-field"><span>地块名称</span><el-input v-model="row.plotName" size="small" class="plot-name" placeholder="地块名称" /></label>
                <div class="plot-grid">
                  <label class="plot-field"><span>种植面积（亩）</span><el-input-number v-model="row.areaMu" size="small" :min="0" :precision="1" :controls="false" /></label>
                  <label class="plot-field"><span>作物</span><el-select v-model="row.crop" size="small" placeholder="作物"><el-option v-for="crop in grainCrops" :key="crop.code" :label="crop.name" :value="crop.code" /></el-select></label>
                </div>
                <label class="plot-field"><span>受灾面积（亩）</span><el-input-number v-model="row.affectedArea" size="small" :min="0" :precision="1" :controls="false" /></label>
              </template>
            </div>
            <el-empty v-if="!disasterForm.rows.length" description="选择粮食计划带出地块，或手动添加" :image-size="50" />
          </div>
          <el-button size="small" class="add-plot" @click="addDisasterRow">+ 添加其他地块</el-button>
          <p class="sheet-tip">已选 {{ disasterChecked.length }} 块 · 种植 {{ disasterArea }} 亩 · 受灾 {{ disasterAffected }} 亩</p>
        </el-form-item>
        <el-form-item label="受灾原因"><el-input v-model="disasterForm.reason" type="textarea" :rows="3" maxlength="200" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="disasterDialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitDisaster">提交上报</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import DeclareDetail from '@/components/sil/DeclareDetail.vue'
import {
  SIL_PLAN_STATUS, SIL_DISASTER_STATUS, SIL_CROP_OPTIONS, silCropName,
  GRAIN_CROP_OPTIONS, grainCropName,
  fetchPlans, savePlan, fetchSubjectPlots, fetchDisasters, saveDisaster, savePlantingProgress, fetchGrainPlanOptions
} from '@/api/silPlan'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const role = computed(() => userStore.role || {})
const cropOptions = SIL_CROP_OPTIONS()
const tabs = [
  { key: 'plans', label: '种植计划' },
  { key: 'progress', label: '种植进度' },
  { key: 'disaster', label: '受灾上报' }
]

const initialTab = () => {
  const q = String(route.query.tab || '')
  return ['plans', 'progress', 'disaster'].includes(q) ? q : 'plans'
}
const tab = ref(initialTab())
const loading = ref(false)
const saving = ref(false)
const plans = ref([])
const disasters = ref([])
const filedPlans = computed(() => plans.value.filter(plan => plan.status === 'filed'))

const detailVisible = ref(false)
const detailRow = ref(null)
const planDialog = ref(false)
const planForm = reactive({ id: '', year: 2027, rows: [], promiseAccepted: false })
const progressDialog = ref(false)
const progressForm = reactive({ planId: '', sowingDate: '', harvestDate: '', actualArea: null, actualYield: null })
const disasterDialog = ref(false)
const disasterForm = reactive({ planId: '', reason: '', rows: [] })
const grainPlans = ref([])
const grainCrops = GRAIN_CROP_OPTIONS()
const disasterChecked = computed(() => disasterForm.rows.filter(row => row.checked))
const disasterArea = computed(() => disasterChecked.value.reduce((sum, row) => sum + Number(row.areaMu || 0), 0).toFixed(1))
const disasterAffected = computed(() => disasterChecked.value.reduce((sum, row) => sum + Number(row.affectedArea || 0), 0).toFixed(1))

const cropText = plan => [...new Set((plan.plots || []).map(plot => `${silCropName(plot.crop)}/${plot.variety || '待补'}`))].join('、')

async function load() {
  loading.value = true
  try {
    const [planRows, disasterRows] = await Promise.all([fetchPlans({}, role.value), fetchDisasters({}, role.value)])
    plans.value = planRows
    disasters.value = disasterRows
  } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}

function switchTab(key) { tab.value = key }

function openDetail(row) { detailRow.value = row; detailVisible.value = true }

async function openPlanForm(plan) {
  const rows = await fetchSubjectPlots(role.value.subjectId)
  const existing = new Map((plan?.plots || []).map(item => [item.plotId, item]))
  planForm.id = plan?.id || ''
  planForm.year = plan?.year || 2027
  planForm.promiseAccepted = !!plan?.promise?.signedAt
  planForm.rows = rows.map(row => {
    const old = existing.get(row.id)
    return { id: row.id, name: row.name, areaMu: row.areaMu, checked: !!old, crop: old?.crop || 'silage_corn', variety: old?.variety || '', expectedYield: old?.expectedYield ?? Math.round(row.areaMu * 2.1 * 10) / 10 }
  })
  planDialog.value = true
}

async function submitPlan() {
  const selected = planForm.rows.filter(row => row.checked)
  if (!selected.length) return ElMessage.warning('请勾选至少一个地块')
  if (!planForm.promiseAccepted) return ElMessage.warning('请签署电子承诺书')
  saving.value = true
  try {
    const result = await savePlan({ id: planForm.id, subjectId: role.value.subjectId, year: planForm.year, promiseAccepted: true, plots: selected.map(row => ({ plotId: row.id, crop: row.crop, variety: row.variety, expectedYield: row.expectedYield })) }, role.value, true)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success('已提交县级备案')
    planDialog.value = false
    load()
  } finally { saving.value = false }
}

function openProgress(plan) {
  Object.assign(progressForm, { planId: plan.id, sowingDate: plan.progress?.sowingDate || '', harvestDate: plan.progress?.harvestDate || '', actualArea: plan.progress?.actualArea ?? null, actualYield: plan.progress?.actualYield ?? null })
  progressDialog.value = true
}

async function submitProgress() {
  saving.value = true
  try {
    const result = await savePlantingProgress({ ...progressForm }, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success('进度已保存')
    progressDialog.value = false
    load()
  } finally { saving.value = false }
}

async function openDisaster() {
  disasterForm.planId = ''
  disasterForm.reason = ''
  disasterForm.rows = []
  disasterDialog.value = true
  try {
    grainPlans.value = await fetchGrainPlanOptions(role.value, role.value?.subjectId)
  } catch (error) {
    grainPlans.value = []
    ElMessage.warning(error?.message || '粮食计划加载失败，可手动填写地块')
  }
}
// 计划只用于筛选地块：切计划时保留手动地块与已填内容
function onDisasterPlanChange() {
  const plan = grainPlans.value.find(item => item.id === disasterForm.planId)
  const manualRows = disasterForm.rows.filter(row => row.manual)
  const planRows = (plan?.plots || []).map(plot => {
    const prev = disasterForm.rows.find(row => row.plotId === plot.plotId)
    return {
      key: plot.plotId,
      plotId: plot.plotId,
      plotName: prev?.plotName ?? plot.plotName,
      areaMu: prev?.areaMu ?? plot.areaMu,
      crop: prev?.crop || plot.crop,
      affectedArea: prev?.affectedArea ?? null,
      checked: prev?.checked ?? true,
      manual: false
    }
  })
  disasterForm.rows = [...planRows, ...manualRows]
}
function addDisasterRow() {
  disasterForm.rows.push({ key: `manual-${Date.now()}-${disasterForm.rows.length}`, plotId: '', plotName: '', areaMu: null, crop: '', affectedArea: null, checked: true, manual: true })
}
function removeDisasterRow(index) { if (disasterForm.rows[index]?.manual) disasterForm.rows.splice(index, 1) }

async function submitDisaster() {
  const picked = disasterChecked.value
  if (!picked.length) return ElMessage.warning('请至少勾选或添加一个受灾地块')
  for (const row of picked) {
    if (!String(row.plotName || '').trim()) return ElMessage.warning('请填写地块名称')
    if (!Number(row.areaMu)) return ElMessage.warning(`请填写「${row.plotName}」的种植面积`)
    if (!row.crop) return ElMessage.warning(`请选择「${row.plotName}」的作物`)
    if (!Number(row.affectedArea)) return ElMessage.warning(`请填写「${row.plotName}」的受灾面积`)
    if (Number(row.affectedArea) > Number(row.areaMu)) return ElMessage.warning(`「${row.plotName}」受灾面积不能大于种植面积`)
  }
  if (!disasterForm.reason.trim()) return ElMessage.warning('请填写受灾原因')
  saving.value = true
  try {
    const result = await saveDisaster({
      subjectId: role.value?.subjectId,
      planId: disasterForm.planId,
      reason: disasterForm.reason,
      plots: picked.map(row => ({ plotId: row.plotId, plotName: row.plotName, areaMu: row.areaMu, crop: row.crop, affectedArea: row.affectedArea }))
    }, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success(result.count > 1 ? `已提交 ${result.count} 条受灾上报` : '受灾上报已提交')
    disasterDialog.value = false
    tab.value = 'disaster'
    load()
  } finally { saving.value = false }
}

onMounted(() => { tab.value = initialTab(); load() })
watch(() => role.value.code, () => { tab.value = initialTab(); load() })
</script>

<style scoped lang="scss">
.mobile-silage { box-sizing: border-box; width: 100%; min-width: 0; background: #f5f7fa; padding: 0 12px 24px; overflow-x: hidden; color: #344054; }
.mobile-silage header { display: grid; grid-template-columns: 65px minmax(0, 1fr) 65px; align-items: center; height: 58px; text-align: center; }
.mobile-silage header b { font-size: 19px; color: #243b53; }
.hero { background: linear-gradient(135deg, #176b58, #2d9d7c); color: #fff; border-radius: 14px; padding: 16px; }
.hero-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hero-top b { font-size: 17px; }
.hero p { margin: 8px 0 0; font-size: 12px; opacity: 0.9; }
.mobile-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: #fff; padding: 4px; border-radius: 10px; margin: 12px 0 4px; gap: 3px; }
.mobile-tabs button { border: 0; background: transparent; padding: 11px 4px; font-size: 12px; color: #7a899a; border-radius: 8px; }
.mobile-tabs button.active { color: #167e67; background: #eaf5f1; font-weight: 600; }
.section-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin: 16px 0 10px; }
.section-head h3 { font-size: 16px; margin: 0 0 6px; color: #243b53; }
.section-head p { font-size: 12px; color: #8a98a7; margin: 0; line-height: 1.6; }
.record-card { padding: 15px; background: #fff; border: 1px solid #e2eaf1; border-radius: 10px; margin-bottom: 12px; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 9px; }
.card-head b { font-size: 14px; line-height: 1.6; word-break: break-word; }
.record-card > small { display: block; color: #9aa6b2; font-size: 11px; margin: 7px 0; word-break: break-all; }
.record-card p { font-size: 12px; color: #7a8b9e; margin: 6px 0; line-height: 1.5; }
.record-card p.crop { color: #5b6b7c; }
.record-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; border-top: 1px solid #eef2f5; padding-top: 7px; margin-top: 8px; }
.plot-list { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.plot-row { border: 1px solid #e2eaf1; border-radius: 8px; padding: 8px 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.plot-row.checked { border-color: #2d9d7c; background: #f4fbf8; }
.plot-row :deep(.el-select), .plot-row :deep(.el-input) { width: 110px; }
.plot-row :deep(.el-input-number) { width: 110px; }
.plot-row :deep(.plot-name) { width: 100%; }
.plot-line { display: flex; align-items: center; gap: 8px; width: 100%; }
.plot-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6px; width: 100%; }
.plot-grid :deep(.el-input-number), .plot-grid :deep(.el-select) { width: 100%; }
.add-plot { margin-top: 8px; width: 100%; }
.sheet-tip { font-size: 11px; color: #8a98a7; margin: 8px 0 0; }
.plot-field { display: flex; flex-direction: column; gap: 4px; width: 100%; min-width: 0; }
.plot-field > span { font-size: 11px; color: #8a98a7; line-height: 1.2; }
.plot-field :deep(.el-input-number), .plot-field :deep(.el-select), .plot-field :deep(.el-input) { width: 100%; }
</style>
