<template>
  <div class="mobile-silage">
    <header><el-button link @click="router.push('/mobile/wanqitong')">‹ 返回</el-button><b>青贮饲料管理</b><span /></header>

    <section class="hero">
      <div class="hero-top"><b>{{ role.unit || role.name }}</b><el-tag size="small" effect="dark" type="success">收储主体</el-tag></div>
      <p>{{ role.regionName }} · 收储申报备案、实际收储登记，按图索料查找已备案种植主体</p>
    </section>

    <nav class="mobile-tabs two">
      <button v-for="item in tabs" :key="item.key" :class="{ active: tab === item.key }" @click="switchTab(item.key)">{{ item.label }}</button>
    </nav>

    <!-- 收储申报 -->
    <template v-if="tab === 'storages'">
      <div class="section-head"><div><h3>收储申报</h3><p>申报本年度计划收储的品种、重量、价格和用途，提交县级备案。</p></div><el-button type="primary" size="small" @click="openStorage()">申报</el-button></div>
      <div v-loading="loading">
        <article v-for="item in storages" :key="item.id" class="record-card">
          <div class="card-head"><b>{{ silCropName(item.crop) }} / {{ item.variety }}</b><el-tag size="small" :type="SIL_PLAN_STATUS[item.status]?.tag">{{ SIL_PLAN_STATUS[item.status]?.name }}</el-tag></div>
          <small>{{ item.filedNo || item.id }}</small>
          <p>{{ item.year }} 年 {{ item.season }} · 预计 {{ item.expectedWeight }} 吨 · {{ item.price }} 元/吨</p>
          <p class="crop">用途 {{ SIL_STORAGE_USAGE[item.usage] }} · 预计 {{ Number(item.amount || 0).toLocaleString() }} 元</p>
          <p v-if="item.status === 'filed'" class="crop">实际收储 {{ item.execution?.filled ? `${item.execution.actualWeight} 吨 · 来源 ${item.execution.sources?.length || 0} 块` : '尚未登记' }}</p>
          <div class="record-actions">
            <el-button link type="primary" @click="openStorageDetail(item)">查看详情</el-button>
            <el-button v-if="['draft','rejected'].includes(item.status)" link type="primary" @click="openStorage(item)">{{ item.status === 'rejected' ? '修改重报' : '继续填写' }}</el-button>
            <el-button v-if="item.status === 'filed'" link type="primary" @click="router.push({ path: '/mobile/wqt-silage-match', query: { storage: item.id } })">按图索料</el-button>
          </div>
        </article>
        <el-empty v-if="!loading && !storages.length" description="暂无收储申报" :image-size="65" />
      </div>
    </template>

    <!-- 实际收储 -->
    <template v-else>
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

    <!-- 收储申报详情 -->
    <el-dialog class="mobile-sheet" v-model="detailVisible" title="收储申报详情" width="94%">
      <DeclareDetail :row="detailRow || {}" type="storage" />
      <template #footer><el-button type="primary" @click="detailVisible = false">关闭</el-button></template>
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
import DeclareDetail from '@/components/sil/DeclareDetail.vue'
import {
  SIL_PLAN_STATUS, SIL_STORAGE_USAGE, SIL_CROP_OPTIONS, silCropName,
  fetchStorages, saveStorage, saveStorageExecution
} from '@/api/silPlan'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const role = computed(() => userStore.role || {})
const isStorage = computed(() => role.value.code === 'storage_subject')
const cropOptions = SIL_CROP_OPTIONS()
const tabs = [
  { key: 'storages', label: '收储申报' },
  { key: 'execution', label: '实际收储' }
]

const initialTab = () => (String(route.query.tab || '') === 'execution' ? 'execution' : 'storages')
const tab = ref(initialTab())
const loading = ref(false)
const saving = ref(false)
const storages = ref([])
const filedStorages = computed(() => storages.value.filter(row => row.status === 'filed'))
const detailVisible = ref(false)
const detailRow = ref(null)
const storageDialog = ref(false)
const storageForm = reactive({ id: '', year: 2027, crop: 'silage_corn', variety: '', expectedWeight: null, price: null, usage: 'self', contractFiles: [], promiseAccepted: false })
const execDialog = ref(false)
const execForm = reactive({ storageId: '', filedNo: '', label: '', crop: '', actualWeight: null, actualPrice: null, actualTime: '', sources: [] })

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
    storages.value = await fetchStorages({}, role.value)
  } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}

function switchTab(key) { tab.value = key; if (key === 'execution') load() }

function openStorageDetail(row) { detailRow.value = row; detailVisible.value = true }

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

onMounted(async () => {
  if (!isStorage.value) { router.replace('/mobile/wqt-silage-grower'); return }
  if (String(route.query.tab || '') === 'match') { router.replace({ path: '/mobile/wqt-silage-match', query: { storage: route.query.storage } }); return }
  tab.value = initialTab()
  await load()
  const storageId = String(route.query.storage || '')
  if (storageId) {
    const row = storages.value.find(item => item.id === storageId && item.status === 'filed')
    if (row) { tab.value = 'execution'; openExec(row) }
  }
})
watch(() => role.value.code, code => {
  if (code !== 'storage_subject') { router.replace('/mobile/wqt-silage-grower'); return }
  tab.value = initialTab()
  load()
})
</script>

<style scoped lang="scss">
.mobile-silage { box-sizing: border-box; width: 100%; min-width: 0; background: #f5f7fa; padding: 0 12px 24px; overflow-x: hidden; color: #344054; }
.mobile-silage header { display: grid; grid-template-columns: 65px minmax(0, 1fr) 65px; align-items: center; height: 58px; text-align: center; }
.mobile-silage header b { font-size: 19px; color: #243b53; }
.hero { background: linear-gradient(135deg, #176b58, #2d9d7c); color: #fff; border-radius: 14px; padding: 16px; }
.hero-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hero-top b { font-size: 17px; }
.hero p { margin: 8px 0 0; font-size: 12px; opacity: 0.9; }
.mobile-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); background: #fff; padding: 4px; border-radius: 10px; margin: 12px 0 4px; gap: 3px; }
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
.exec-target { background: #f4fbf8; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
.exec-target b, .exec-target span { display: block; }
.exec-target span { font-size: 12px; color: #6b7c8f; margin-top: 4px; }
.file-tag { margin-left: 6px; }
</style>
