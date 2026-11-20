<template>
  <div class="page-container sil-storage">
    <header class="page-head">
      <div>
        <h2>青贮饲料作物收储申报</h2>
        <p>收储主体经皖企通申报收储的品种、价格和重量，县级可代办；备案后进入收储台账，并作为“未备案不得收储”的核查依据。</p>
      </div>
      <div class="head-actions">
        <el-button v-if="canDeclare" type="primary" @click="openForm()">{{ isCounty ? '新增（县级代办）' : '新增收储申报' }}</el-button>
      </div>
    </header>

    <section class="panel">
      <el-form :inline="true" class="filters" @submit.prevent="load">
        <el-form-item label="关键字"><el-input v-model="filters.keyword" placeholder="主体 / 品种 / 备案号" clearable style="width: 220px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option v-for="(item, key) in SIL_PLAN_STATUS" :key="key" :label="item.name" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="load">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>

      <div class="summary-grid">
        <div class="summary-card"><span>申报总数</span><b>{{ rows.length }}</b><small>当前筛选范围</small></div>
        <div class="summary-card"><span>已备案</span><b>{{ filedCount }}</b><small>可纳入收储台账</small></div>
        <div class="summary-card"><span>待备案</span><b>{{ pendingCount }}</b><small>县级待办理</small></div>
        <div class="summary-card"><span>备案收储重量（吨）</span><b>{{ filedWeight.toFixed(1) }}</b><small>备案金额 {{ filedAmount.toFixed(0) }} 元</small></div>
      </div>

      <el-table v-loading="loading" :data="rows" stripe border>
        <el-table-column label="申报 / 备案编号" min-width="200">
          <template #default="{ row }"><b class="mono">{{ row.filedNo || row.id }}</b><small class="cell-sub">{{ row.filedNo ? `申报单 ${row.id}` : '尚未生成备案号' }}</small></template>
        </el-table-column>
        <el-table-column label="收储主体" min-width="220" show-overflow-tooltip>
          <template #default="{ row }"><b>{{ row.storageSubjectName }}</b><small class="cell-sub">{{ STORAGE_SUBJECT_TYPES[row.subjectType] || '收储主体' }} · {{ row.owner }} · {{ row.regionName }}</small></template>
        </el-table-column>
        <el-table-column label="收储作物 / 品种" min-width="170">
          <template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety }}</template>
        </el-table-column>
        <el-table-column label="预计重量（吨）" width="130">
          <template #default="{ row }">{{ Number(row.expectedWeight || 0).toFixed(1) }}</template>
        </el-table-column>
        <el-table-column label="价格（元/吨）" width="130">
          <template #default="{ row }">{{ row.price ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="用途" width="90">
          <template #default="{ row }"><el-tag size="small" effect="plain" :type="row.usage === 'sell' ? 'warning' : 'info'">{{ SIL_STORAGE_USAGE[row.usage] || '—' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="来源" width="100">
          <template #default="{ row }">{{ row.source === 'agent' ? '县级代办' : '主体申报' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><el-tag size="small" :type="SIL_PLAN_STATUS[row.status]?.tag || 'info'">{{ SIL_PLAN_STATUS[row.status]?.name || row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="提交时间" width="160"><template #default="{ row }">{{ row.submittedAt || '—' }}</template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="canEdit(row)" link type="primary" @click="openForm(row)">{{ row.status === 'rejected' ? '修改重报' : '编辑' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !rows.length" description="暂无收储申报" :image-size="80" />
    </section>

    <el-drawer v-model="formVisible" :title="form.id ? '收储申报详情 / 修改重报' : (isCounty ? '县级代办 · 新增收储申报' : '新增收储申报')" size="min(880px, 96vw)" append-to-body>
      <el-form label-width="120px" class="storage-form">
        <el-form-item label="收储主体" required>
          <el-select v-if="isCounty" v-model="form.storageSubjectId" filterable placeholder="选择辖区内收储主体" style="width: 100%">
            <el-option v-for="item in subjectOptions" :key="item.id" :label="`${item.name}（${item.regionName}）`" :value="item.id" />
          </el-select>
          <b v-else>{{ role.unit }} · {{ role.regionName }}</b>
        </el-form-item>
        <el-form-item label="计划年度" required>
          <el-select v-model="form.year" style="width: 160px"><el-option v-for="year in [2026, 2027, 2028]" :key="year" :label="`${year} 年`" :value="year" /></el-select>
          <el-tag class="season-tag" type="success" effect="plain">春夏季</el-tag>
        </el-form-item>
        <el-form-item label="收储作物" required>
          <el-select v-model="form.crop" placeholder="选择作物" style="width: 220px">
            <el-option v-for="crop in cropOptions" :key="crop.code" :label="crop.name" :value="crop.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="收储品种" required><el-input v-model="form.variety" placeholder="如 豫青贮23" style="width: 320px" /></el-form-item>
        <el-form-item label="预计收储重量" required>
          <el-input-number v-model="form.expectedWeight" :min="0" :precision="1" controls-position="right" style="width: 200px" /><span class="unit">吨</span>
        </el-form-item>
        <el-form-item label="预计收储价格" required>
          <el-input-number v-model="form.price" :min="0" :precision="0" controls-position="right" style="width: 200px" /><span class="unit">元/吨</span>
        </el-form-item>
        <el-form-item label="预计金额"><b class="amount">{{ amountText }}</b></el-form-item>
        <el-form-item label="收储用途" required>
          <el-radio-group v-model="form.usage">
            <el-radio label="self">自用（养殖饲喂）</el-radio>
            <el-radio label="sell">出售</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.usage === 'sell'" label="收储合同" required>
          <div class="upload-line">
            <el-upload :auto-upload="false" :show-file-list="false" :on-change="addContract"><el-button size="small">上传合同附件</el-button></el-upload>
            <el-tag v-for="(file, index) in form.contractFiles" :key="index" closable size="small" @close="form.contractFiles.splice(index, 1)">{{ file.name }}</el-tag>
            <span v-if="!form.contractFiles.length" class="hint">出售用途须上传收储合同，自用可不传。</span>
          </div>
        </el-form-item>
        <el-form-item label="电子承诺书" required>
          <div class="promise-box">
            <p>本人承诺收储申报的品种、价格和重量真实；收储的青贮饲料来源于已备案种植地块，不收购未申报备案地块的青贮。</p>
            <el-checkbox v-model="form.promiseAccepted">我已阅读并签署电子承诺书</el-checkbox>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button :loading="saving" @click="submit(false)">保存草稿</el-button>
          <el-button type="primary" :loading="saving" @click="submit(true)">提交备案</el-button>
        </div>
      </template>
    </el-drawer>

    <el-drawer v-model="detailVisible" title="收储申报详情" size="min(820px, 96vw)" append-to-body>
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="备案编号">{{ current.filedNo || '尚未备案' }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag size="small" :type="SIL_PLAN_STATUS[current.status]?.tag">{{ SIL_PLAN_STATUS[current.status]?.name }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="收储主体">{{ current.storageSubjectName }}</el-descriptions-item>
          <el-descriptions-item label="主体类型">{{ STORAGE_SUBJECT_TYPES[current.subjectType] || '—' }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ current.owner }} · {{ current.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="属地">{{ current.regionName }}</el-descriptions-item>
          <el-descriptions-item label="收储作物 / 品种">{{ silCropName(current.crop) }} / {{ current.variety }}</el-descriptions-item>
          <el-descriptions-item label="计划年度">{{ current.year }} 年 {{ current.season }}</el-descriptions-item>
          <el-descriptions-item label="预计重量">{{ Number(current.expectedWeight || 0).toFixed(1) }} 吨</el-descriptions-item>
          <el-descriptions-item label="预计价格">{{ current.price ?? '—' }} 元/吨</el-descriptions-item>
          <el-descriptions-item label="用途">{{ SIL_STORAGE_USAGE[current.usage] || '—' }}</el-descriptions-item>
          <el-descriptions-item label="预计金额">{{ current.amount ? `${Number(current.amount).toLocaleString()} 元` : '—' }}</el-descriptions-item>
          <el-descriptions-item label="申报来源" :span="2">{{ current.source === 'agent' ? '县级代办' : '主体自主申报' }}</el-descriptions-item>
        </el-descriptions>
        <template v-if="(current.contractFiles || []).length">
          <h3 class="block-title">合同附件</h3>
          <el-tag v-for="file in current.contractFiles" :key="file.name" class="file-tag">{{ file.name }}</el-tag>
        </template>
        <h3 class="block-title">电子承诺书</h3>
        <div class="promise-box"><p>{{ current.promise?.content }}</p><small>签署人：{{ current.promise?.signer || '—' }} · {{ current.promise?.signedAt || '未签署' }}</small></div>
        <h3 class="block-title">实际执行</h3>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="实际重量">{{ current.execution?.actualWeight ?? '待填报' }}</el-descriptions-item>
          <el-descriptions-item label="实际价格">{{ current.execution?.actualPrice ?? '待填报' }}</el-descriptions-item>
          <el-descriptions-item label="执行日期">{{ current.execution?.actualTime || '待填报' }}</el-descriptions-item>
        </el-descriptions>
        <h3 class="block-title">办理记录</h3>
        <el-timeline>
          <el-timeline-item v-for="(item, index) in current.auditTrail || []" :key="index" :timestamp="item.time">
            <b>{{ item.action }}</b> · {{ item.user }}<p v-if="item.opinion" class="trail-opinion">{{ item.opinion }}</p>
          </el-timeline-item>
        </el-timeline>
        <div class="drawer-footer">
          <el-button v-if="current.status === 'filed'" @click="router.push('/sil/ledger')">查看收储台账</el-button>
          <el-button v-if="canEdit(current)" @click="openForm(current)">继续填报</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  SIL_PLAN_STATUS, SIL_STORAGE_USAGE, SIL_CROP_OPTIONS, silCropName, STORAGE_SUBJECT_TYPES,
  canDeclareStorage, fetchStorages, saveStorage, fetchStorageSubjects
} from '@/api/silPlan'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const role = computed(() => userStore.role)
const isCounty = computed(() => role.value?.code === 'county')
const canDeclare = computed(() => canDeclareStorage(role.value))
const cropOptions = SIL_CROP_OPTIONS()

const filters = reactive({ keyword: '', status: '' })
const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const subjectOptions = ref([])
const formVisible = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const form = reactive({ id: '', storageSubjectId: '', year: 2027, crop: 'silage_corn', variety: '', expectedWeight: null, price: null, usage: 'self', contractFiles: [], promiseAccepted: false })

const filedCount = computed(() => rows.value.filter(item => item.status === 'filed').length)
const pendingCount = computed(() => rows.value.filter(item => item.status === 'pending').length)
const filedWeight = computed(() => rows.value.filter(item => item.status === 'filed').reduce((sum, item) => sum + Number(item.expectedWeight || 0), 0))
const filedAmount = computed(() => rows.value.filter(item => item.status === 'filed').reduce((sum, item) => sum + Number(item.amount || 0), 0))
const amountText = computed(() => form.expectedWeight && form.price ? `${Number(form.expectedWeight * form.price).toLocaleString()} 元` : '—')

const canEdit = row => canDeclare.value && ['draft', 'rejected'].includes(row.status) && (isCounty.value || row.storageSubjectId === role.value.storageSubjectId)

async function load() {
  loading.value = true
  try { rows.value = await fetchStorages(filters, role.value) } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}
function reset() { filters.keyword = ''; filters.status = ''; load() }

async function openForm(row) {
  if (isCounty.value && !subjectOptions.value.length) subjectOptions.value = await fetchStorageSubjects(role.value)
  form.id = row?.id || ''
  form.storageSubjectId = row?.storageSubjectId || (isCounty.value ? '' : role.value.storageSubjectId)
  form.year = row?.year || 2027
  form.crop = row?.crop || String(route.query.crop || 'silage_corn')
  form.variety = row?.variety || String(route.query.variety || '')
  form.expectedWeight = row?.expectedWeight ?? (route.query.weight ? Number(route.query.weight) : null)
  form.price = row?.price ?? null
  form.usage = row?.usage || 'self'
  form.contractFiles = row?.contractFiles ? [...row.contractFiles] : []
  form.promiseAccepted = !!row?.promise?.signedAt
  formVisible.value = true
}

function addContract(file) { form.contractFiles.push({ name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))}KB` }) }

async function submit(isSubmit) {
  if (!form.storageSubjectId) return ElMessage.warning('请选择收储主体')
  if (!form.variety) return ElMessage.warning('请填写收储品种')
  if (!form.expectedWeight) return ElMessage.warning('请填写预计收储重量')
  if (isSubmit && form.usage === 'sell' && !form.contractFiles.length) return ElMessage.warning('出售用途须上传收储合同')
  saving.value = true
  try {
    const subject = subjectOptions.value.find(item => item.id === form.storageSubjectId)
    const result = await saveStorage({
      id: form.id,
      storageSubject: subject ? { ...subject, regionName: subject.regionName } : (form.id ? undefined : { id: form.storageSubjectId }),
      year: form.year,
      crop: form.crop,
      variety: form.variety,
      expectedWeight: form.expectedWeight,
      price: form.price,
      usage: form.usage,
      contractFiles: form.contractFiles,
      promiseAccepted: form.promiseAccepted
    }, role.value, isSubmit)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success(isSubmit ? '已提交县级备案' : '草稿已保存')
    formVisible.value = false
    load()
  } finally { saving.value = false }
}

function openDetail(row) { current.value = row; detailVisible.value = true }

onMounted(load)
watch(() => role.value?.code, load)
</script>

<style scoped lang="scss">
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.page-head h2 { font-size: 18px; margin-bottom: 6px; }
.page-head p { font-size: 12px; color: var(--ah-text-muted); line-height: 1.6; max-width: 820px; }
.panel { flex: 1; min-height: 0; overflow: auto; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 4px 0 14px; }
.summary-card { background: #f5f8fc; border: 1px solid #e6edf6; border-radius: 8px; padding: 12px 14px; }
.summary-card span, .summary-card b, .summary-card small { display: block; }
.summary-card span { font-size: 12px; color: var(--ah-text-muted); }
.summary-card b { font-size: 22px; color: var(--ah-primary); margin: 4px 0; font-variant-numeric: tabular-nums; }
.summary-card small { font-size: 11px; color: var(--ah-text-muted); }
.cell-sub { display: block; font-size: 11px; color: var(--ah-text-muted); margin-top: 3px; }
.mono { font-variant-numeric: tabular-nums; }
.storage-form { padding-top: 6px; }
.unit { margin-left: 8px; color: var(--ah-text-muted); font-size: 12px; }
.amount { color: var(--ah-danger); }
.season-tag { margin-left: 10px; }
.upload-line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.hint { font-size: 11px; color: var(--ah-text-muted); }
.promise-box { background: #f7fafc; border: 1px solid #e6edf6; border-radius: 8px; padding: 12px 14px; width: 100%; }
.promise-box p { font-size: 12px; line-height: 1.8; color: var(--ah-text-secondary); margin-bottom: 8px; }
.promise-box small { font-size: 11px; color: var(--ah-text-muted); }
.block-title { font-size: 14px; margin: 18px 0 10px; }
.file-tag { margin-right: 8px; }
.trail-opinion { font-size: 12px; color: var(--ah-text-secondary); margin-top: 4px; }
.drawer-footer { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 16px; }
@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
