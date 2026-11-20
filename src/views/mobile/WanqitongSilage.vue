<template>
  <div class="mobile-silage">
    <header><el-button link @click="router.push('/mobile/wanqitong')">‹ 返回</el-button><b>青贮饲料管理</b><span /></header>

    <section class="hero">
      <div class="hero-top"><b>{{ role.unit || role.name }}</b><el-tag size="small" effect="dark" type="success">{{ isStorage ? '收储主体' : '种植主体' }}</el-tag></div>
      <p>{{ role.regionName }} · {{ isStorage ? '收储申报与实际收储登记' : '种植计划申报与生产进度' }}</p>
    </section>

    <nav class="mobile-tabs" :class="{ two: tabs.length === 2 }">
      <button v-for="item in tabs" :key="item.key" :class="{ active: tab === item.key }" @click="switchTab(item.key)">{{ item.label }}</button>
    </nav>

    <!-- 种植计划 -->
    <template v-if="tab === 'plans'">
      <div class="section-head"><div><h3>我的种植计划</h3><p>申报品种、面积、地块和预计产量，提交后由县级备案。</p></div><el-button type="primary" size="small" @click="openPlanForm()">申报</el-button></div>
      <div v-loading="loading">
        <article v-for="item in plans" :key="item.id" class="record-card">
          <div class="card-head"><b>{{ item.year }} 年 {{ item.season }}</b><el-tag size="small" :type="SIL_PLAN_STATUS[item.status]?.tag">{{ SIL_PLAN_STATUS[item.status]?.name }}</el-tag></div>
          <small>{{ item.filedNo || item.id }}</small>
          <p>{{ item.plots?.length }} 块地 · {{ Number(item.area).toFixed(1) }} 亩 · 预计 {{ Number(item.expectedYield).toFixed(1) }} 吨</p>
          <p class="crop">{{ cropText(item) }}</p>
          <div class="record-actions">
            <el-button v-if="['draft','rejected'].includes(item.status)" link type="primary" @click="openPlanForm(item)">{{ item.status === 'rejected' ? '修改重报' : '继续填写' }}</el-button>
            <el-button v-if="item.status === 'filed'" link type="primary" @click="openProgress(item)">维护进度</el-button>
            <el-button link type="primary" @click="openDisaster(item)">受灾上报</el-button>
          </div>
        </article>
        <el-empty v-if="!loading && !plans.length" description="暂无种植计划，点击右上角申报" :image-size="65" />
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
      <el-empty v-if="!filedPlans.length" description="备案通过后可维护种植进度" :image-size="65" />
    </template>

    <!-- 受灾上报 -->
    <template v-else-if="tab === 'disaster'">
      <div class="section-head"><div><h3>受灾补充上报</h3><p>备案地块受灾后上报面积与原因，县级确认后纳入补充收储。</p></div><el-button type="primary" size="small" @click="openDisaster()">上报</el-button></div>
      <article v-for="item in disasters" :key="item.id" class="record-card">
        <div class="card-head"><b>{{ item.plotName }}</b><el-tag size="small" :type="SIL_DISASTER_STATUS[item.status]?.tag">{{ SIL_DISASTER_STATUS[item.status]?.name }}</el-tag></div>
        <small>{{ item.id }} · {{ item.planNo }}</small>
        <p>{{ silCropName(item.crop) }} / {{ item.variety }} · 受灾 {{ item.affectedArea }} 亩（{{ item.affectedRatio }}%）</p>
        <p class="crop">{{ item.reason }}</p>
        <p v-if="item.confirmNo" class="crop">补充收储编号 {{ item.confirmNo }}</p>
      </article>
      <el-empty v-if="!disasters.length" description="暂无受灾上报" :image-size="65" />
    </template>

    <!-- 收储申报（计划） -->
    <template v-else-if="tab === 'storages'">
      <div class="section-head"><div><h3>收储申报</h3><p>申报本年度计划收储的品种、重量、价格和用途，提交县级备案。</p></div><el-button type="primary" size="small" @click="openStorage()">申报</el-button></div>
      <article v-for="item in storages" :key="item.id" class="record-card">
        <div class="card-head"><b>{{ silCropName(item.crop) }} / {{ item.variety }}</b><el-tag size="small" :type="SIL_PLAN_STATUS[item.status]?.tag">{{ SIL_PLAN_STATUS[item.status]?.name }}</el-tag></div>
        <small>{{ item.filedNo || item.id }}</small>
        <p>{{ item.year }} 年 {{ item.season }} · 预计 {{ item.expectedWeight }} 吨 · {{ item.price }} 元/吨</p>
        <p class="crop">用途 {{ SIL_STORAGE_USAGE[item.usage] }} · 预计 {{ Number(item.amount || 0).toLocaleString() }} 元</p>
        <p v-if="item.status === 'filed'" class="crop">实际收储 {{ item.execution?.filled ? `${item.execution.actualWeight} 吨 · 来源 ${item.execution.sources?.length || 0} 块` : '尚未登记' }}</p>
        <div class="record-actions">
          <el-button v-if="['draft','rejected'].includes(item.status)" link type="primary" @click="openStorage(item)">{{ item.status === 'rejected' ? '修改重报' : '继续填写' }}</el-button>
        </div>
      </article>
      <el-empty v-if="!storages.length" description="暂无收储申报" :image-size="65" />
    </template>

    <!-- 实际收储（执行） -->
    <template v-else-if="tab === 'execution'">
      <div class="section-head"><div><h3>实际收储登记</h3><p>备案通过后登记实际收储重量、价格、时间与来源地块，点「按图选择地块」进入地图选取。</p></div></div>
      <article v-for="item in filedStorages" :key="item.id" class="record-card">
        <div class="card-head"><b>{{ item.filedNo }}</b><el-tag size="small" :type="item.execution?.filled ? 'success' : 'warning'" effect="plain">{{ item.execution?.filled ? '已登记' : '待登记' }}</el-tag></div>
        <p>{{ silCropName(item.crop) }} / {{ item.variety }} · 计划 {{ item.expectedWeight }} 吨 · {{ item.price }} 元/吨</p>
        <p class="crop">实际 {{ item.execution?.actualWeight ?? '—' }} 吨 · {{ item.execution?.actualPrice ?? '—' }} 元/吨 · {{ item.execution?.actualTime || '—' }}</p>
        <p class="crop">来源地块 {{ item.execution?.sources?.length || 0 }} 块 · 合计 {{ item.execution?.sourcesWeight || 0 }} 吨</p>
        <div class="record-actions"><el-button link type="primary" @click="openExec(item)">{{ item.execution?.filled ? '修改实际收储' : '登记实际收储' }}</el-button></div>
      </article>
      <el-empty v-if="!filedStorages.length" description="收储备案通过后可登记实际收储" :image-size="65" />
    </template>


    <!-- 种植计划表单 -->
    <el-dialog class="mobile-sheet" v-model="planDialog" :title="planForm.id ? '种植计划修改重报' : '申报种植计划'" width="94%">
      <el-form label-position="top">
        <el-form-item label="计划年度"><el-select v-model="planForm.year" style="width: 100%"><el-option v-for="year in [2026, 2027, 2028]" :key="year" :label="`${year} 年 春夏季`" :value="year" /></el-select></el-form-item>
        <el-form-item label="选择地块并填写作物、品种、预计产量">
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
    <el-dialog class="mobile-sheet" v-model="progressDialog" title="种植进度填报" width="94%">
      <el-form label-position="top">
        <el-form-item label="播种时间"><el-date-picker v-model="progressForm.sowingDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="收割时间"><el-date-picker v-model="progressForm.harvestDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="实际面积（亩）"><el-input-number v-model="progressForm.actualArea" :min="0" :precision="1" controls-position="right" style="width: 100%" /></el-form-item>
        <el-form-item label="实际产量（吨）"><el-input-number v-model="progressForm.actualYield" :min="0" :precision="1" controls-position="right" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="progressDialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitProgress">保存</el-button></template>
    </el-dialog>

    <!-- 受灾表单 -->
    <el-dialog class="mobile-sheet" v-model="disasterDialog" title="受灾补充上报" width="94%">
      <el-form label-position="top">
        <el-form-item label="备案种植计划"><el-select v-model="disasterForm.planId" style="width: 100%" @change="disasterForm.plotId = ''"><el-option v-for="plan in filedPlans" :key="plan.id" :label="`${plan.filedNo} · ${plan.subjectName}`" :value="plan.id" /></el-select></el-form-item>
        <el-form-item label="受灾地块"><el-select v-model="disasterForm.plotId" style="width: 100%"><el-option v-for="plot in disasterPlots" :key="plot.plotId" :label="`${plot.name}（${plot.areaMu} 亩）`" :value="plot.plotId" /></el-select></el-form-item>
        <el-form-item label="受灾面积（亩）"><el-input-number v-model="disasterForm.affectedArea" :min="0" :precision="1" controls-position="right" style="width: 100%" /></el-form-item>
        <el-form-item label="受灾原因"><el-input v-model="disasterForm.reason" type="textarea" :rows="3" maxlength="200" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="disasterDialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitDisaster">提交上报</el-button></template>
    </el-dialog>

    <!-- 收储表单 -->
    <el-dialog class="mobile-sheet" v-model="storageDialog" :title="storageForm.id ? '收储申报修改重报' : '收储申报'" width="94%">
      <el-form label-position="top">
        <el-form-item label="收储作物"><el-select v-model="storageForm.crop" style="width: 100%"><el-option v-for="crop in cropOptions" :key="crop.code" :label="crop.name" :value="crop.code" /></el-select></el-form-item>
        <el-form-item label="收储品种"><el-input v-model="storageForm.variety" placeholder="如 豫青贮23" /></el-form-item>
        <el-form-item label="预计收储重量（吨）"><el-input-number v-model="storageForm.expectedWeight" :min="0" :precision="1" controls-position="right" style="width: 100%" /></el-form-item>
        <el-form-item label="预计收储价格（元/吨）"><el-input-number v-model="storageForm.price" :min="0" :precision="0" controls-position="right" style="width: 100%" /></el-form-item>
        <el-form-item label="收储用途"><el-radio-group v-model="storageForm.usage"><el-radio label="self">自用</el-radio><el-radio label="sell">出售</el-radio></el-radio-group></el-form-item>
        <el-form-item v-if="storageForm.usage === 'sell'" label="收储合同">
          <el-upload :auto-upload="false" :show-file-list="false" :on-change="addContract"><el-button size="small">上传合同</el-button></el-upload>
          <el-tag v-for="(file, index) in storageForm.contractFiles" :key="index" closable size="small" class="file-tag" @close="storageForm.contractFiles.splice(index, 1)">{{ file.name }}</el-tag>
        </el-form-item>
        <el-form-item><el-checkbox v-model="storageForm.promiseAccepted">签署电子承诺书（不收购未备案地块青贮）</el-checkbox></el-form-item>
      </el-form>
      <template #footer><el-button @click="storageDialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitStorage">提交备案</el-button></template>
    </el-dialog>

    <!-- 实际收储登记表单 -->
    <el-dialog class="mobile-sheet" v-model="execDialog" title="实际收储登记" width="94%">
      <div class="exec-target"><b>{{ execForm.label }}</b><span>{{ execForm.filedNo }}</span></div>
      <el-form label-position="top">
        <el-form-item label="实际收储重量（吨）"><el-input-number v-model="execForm.actualWeight" :min="0" :precision="1" controls-position="right" style="width: 100%" /></el-form-item>
        <el-form-item label="实际收储单价（元/吨）"><el-input-number v-model="execForm.actualPrice" :min="0" :precision="0" controls-position="right" style="width: 100%" /></el-form-item>
        <el-form-item label="实际收储时间"><el-date-picker v-model="execForm.actualTime" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="来源地块">
          <PlotPicker v-model="execForm.sources" :crop="execForm.crop" :filed-no="execForm.filedNo" :limit="execForm.actualWeight || 0" layout="mobile" />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="execDialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitExec">保存登记</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import PlotPicker from '@/components/sil/PlotPicker.vue'
import {
  SIL_PLAN_STATUS, SIL_DISASTER_STATUS, SIL_STORAGE_USAGE, SIL_CROP_OPTIONS, silCropName,
  fetchPlans, savePlan, fetchSubjectPlots, fetchDisasters, saveDisaster,
  fetchStorages, saveStorage, savePlantingProgress, saveStorageExecution
} from '@/api/silPlan'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const role = computed(() => userStore.role || {})
const isStorage = computed(() => role.value.code === 'storage_subject')
const cropOptions = SIL_CROP_OPTIONS()
const tabs = computed(() => isStorage.value
  ? [{ key: 'storages', label: '收储申报' }, { key: 'execution', label: '实际收储' }]
  : [{ key: 'plans', label: '种植计划' }, { key: 'progress', label: '种植进度' }, { key: 'disaster', label: '受灾上报' }])

const initialTab = () => {
  const q = String(route.query.tab || '')
  if (isStorage.value) return ['storages', 'execution'].includes(q) ? q : 'storages'
  return ['plans', 'progress', 'disaster'].includes(q) ? q : 'plans'
}
const tab = ref(initialTab())

const loading = ref(false)
const saving = ref(false)
const plans = ref([])
const storages = ref([])
const disasters = ref([])
const filedPlans = computed(() => plans.value.filter(plan => plan.status === 'filed'))
const filedStorages = computed(() => storages.value.filter(row => row.status === 'filed'))

const planDialog = ref(false)
const planForm = reactive({ id: '', year: 2027, rows: [], promiseAccepted: false })
const progressDialog = ref(false)
const progressForm = reactive({ planId: '', sowingDate: '', harvestDate: '', actualArea: null, actualYield: null })
const disasterDialog = ref(false)
const disasterForm = reactive({ planId: '', plotId: '', affectedArea: null, reason: '' })
const disasterPlots = computed(() => filedPlans.value.find(plan => plan.id === disasterForm.planId)?.plots || [])
const storageDialog = ref(false)
const storageForm = reactive({ id: '', year: 2027, crop: 'silage_corn', variety: '', expectedWeight: null, price: null, usage: 'self', contractFiles: [], promiseAccepted: false })

const execDialog = ref(false)
const execForm = reactive({ storageId: '', filedNo: '', label: '', crop: '', actualWeight: null, actualPrice: null, actualTime: '', sources: [] })

const cropText = plan => [...new Set((plan.plots || []).map(plot => `${silCropName(plot.crop)}/${plot.variety || '待补'}`))].join('、')

const today = () => {
  const date = new Date()
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const remainWeight = row => {
  const expected = Number(row.expectedWeight || 0)
  const done = Number(row.execution?.actualWeight || 0)
  return Math.max(0, Math.round((expected - done) * 10) / 10)
}

async function load() {
  loading.value = true
  try {
    if (isStorage.value) {
      storages.value = await fetchStorages({}, role.value)
    } else {
      const [planRows, disasterRows] = await Promise.all([fetchPlans({}, role.value), fetchDisasters({}, role.value)])
      plans.value = planRows
      disasters.value = disasterRows
    }
  } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}

function switchTab(key) { tab.value = key; if (key === 'progress' || key === 'execution') load() }

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

function openDisaster(plan) {
  disasterForm.planId = plan?.status === 'filed' ? plan.id : ''
  disasterForm.plotId = ''
  disasterForm.affectedArea = null
  disasterForm.reason = ''
  disasterDialog.value = true
}

async function submitDisaster() {
  if (!disasterForm.planId || !disasterForm.plotId) return ElMessage.warning('请选择备案计划与地块')
  if (!disasterForm.affectedArea || !disasterForm.reason.trim()) return ElMessage.warning('请填写受灾面积和原因')
  saving.value = true
  try {
    const result = await saveDisaster({ ...disasterForm }, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success('受灾上报已提交')
    disasterDialog.value = false
    tab.value = 'disaster'
    load()
  } finally { saving.value = false }
}

function openStorage(row) {
  Object.assign(storageForm, {
    id: row?.id || '', year: row?.year || 2027, crop: row?.crop || 'silage_corn',
    variety: row?.variety || '', expectedWeight: row?.expectedWeight ?? null,
    price: row?.price ?? null, usage: row?.usage || 'self', contractFiles: row?.contractFiles ? [...row.contractFiles] : [],
    promiseAccepted: !!row?.promise?.signedAt
  })
  storageDialog.value = true
}

function addContract(file) { storageForm.contractFiles.push({ name: file.name }) }

async function submitStorage() {
  if (!storageForm.variety) return ElMessage.warning('请填写收储品种')
  if (!storageForm.expectedWeight) return ElMessage.warning('请填写预计收储重量')
  if (storageForm.usage === 'sell' && !storageForm.contractFiles.length) return ElMessage.warning('出售用途须上传合同')
  if (!storageForm.promiseAccepted) return ElMessage.warning('请签署电子承诺书')
  saving.value = true
  try {
    const result = await saveStorage({ ...storageForm }, role.value, true)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success('已提交县级备案')
    storageDialog.value = false
    load()
  } finally { saving.value = false }
}

function openExec(row) {
  Object.assign(execForm, {
    storageId: row.id,
    filedNo: row.filedNo || row.id,
    label: `${silCropName(row.crop)} / ${row.variety} · 计划 ${row.expectedWeight} 吨`,
    crop: row.crop,
    actualWeight: row.execution?.actualWeight ?? remainWeight(row) ?? null,
    actualPrice: row.execution?.actualPrice ?? row.price ?? null,
    actualTime: row.execution?.actualTime || today(),
    sources: (row.execution?.sources || []).map(source => ({ ...source }))
  })
  execDialog.value = true
}

async function submitExec() {
  if (!execForm.actualWeight) return ElMessage.warning('请填写实际收储重量')
  if (!execForm.actualTime) return ElMessage.warning('请选择实际收储时间')
  saving.value = true
  try {
    const result = await saveStorageExecution({
      storageId: execForm.storageId,
      actualWeight: execForm.actualWeight,
      actualPrice: execForm.actualPrice,
      actualTime: execForm.actualTime,
      sources: execForm.sources
    }, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success('实际收储已登记')
    execDialog.value = false
    tab.value = 'execution'
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
.mobile-tabs.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
.record-actions { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eef2f5; padding-top: 7px; margin-top: 8px; }
.area { font-size: 12px; color: #167e67; }
.plot-list { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.plot-row { border: 1px solid #e2eaf1; border-radius: 8px; padding: 8px 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.plot-row.checked { border-color: #2d9d7c; background: #f4fbf8; }
.plot-row :deep(.el-select), .plot-row :deep(.el-input) { width: 110px; }
.plot-row :deep(.el-input-number) { width: 110px; }
.exec-target { background: #f4fbf8; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
.exec-target b, .exec-target span { display: block; }
.exec-target span { font-size: 12px; color: #6b7c8f; margin-top: 4px; }
  .receipt-list { margin: 8px 0 0; border-top: 1px dashed #e3eaf3; padding-top: 6px; }
  .receipt-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 0; font-size: 12px; color: #5d6b7a; }
  .receipt-row span { flex: 1; min-width: 0; }
.file-tag { margin-left: 6px; }
</style>
