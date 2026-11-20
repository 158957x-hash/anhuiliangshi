<template>
  <div class="page-container sil-plan">
    <header class="page-head">
      <div>
        <h2>种植计划申报</h2>
        <p>种植主体经皖企通自主申报，县级可代辖区内主体填报；县级备案后地块自动上图，并纳入青贮饲料生产台账。</p>
      </div>
      <div class="head-actions">
        <el-button v-if="canDeclare" type="primary" @click="openForm()">{{ isCounty ? '新增（县级代办）' : '新增种植计划' }}</el-button>
      </div>
    </header>

    <section class="panel">
      <el-form :inline="true" class="filters" @submit.prevent="load">
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="主体 / 品种 / 备案号" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option v-for="(item, key) in SIL_PLAN_STATUS" :key="key" :label="item.name" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="年度">
          <el-select v-model="filters.year" placeholder="全部年度" clearable style="width: 120px">
            <el-option v-for="year in years" :key="year" :label="`${year} 年`" :value="year" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="summary-grid">
        <div class="summary-card"><span>计划总数</span><b>{{ rows.length }}</b><small>当前筛选范围</small></div>
        <div class="summary-card"><span>已备案</span><b>{{ filedCount }}</b><small>可上图地块</small></div>
        <div class="summary-card"><span>待备案</span><b>{{ pendingCount }}</b><small>县级待办理</small></div>
        <div class="summary-card"><span>备案面积（亩）</span><b>{{ filedArea.toFixed(1) }}</b><small>预计产量 {{ filedYield.toFixed(1) }} 吨</small></div>
      </div>

      <el-table v-loading="loading" :data="rows" stripe border class="plan-table">
        <el-table-column label="申报 / 备案编号" min-width="200">
          <template #default="{ row }">
            <b class="mono">{{ row.filedNo || row.id }}</b>
            <small class="cell-sub">{{ row.filedNo ? `申报单 ${row.id}` : '尚未生成备案号' }}</small>
          </template>
        </el-table-column>
        <el-table-column prop="subjectName" label="种植主体" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <b>{{ row.subjectName }}</b>
            <small class="cell-sub">{{ row.owner }} · {{ row.regionName }}</small>
          </template>
        </el-table-column>
        <el-table-column label="地块 / 面积" width="150">
          <template #default="{ row }">{{ row.plots?.length || 0 }} 块 · {{ Number(row.area || 0).toFixed(1) }} 亩</template>
        </el-table-column>
        <el-table-column label="作物 / 品种" min-width="180">
          <template #default="{ row }">
            <span v-for="(plot, index) in row.plots || []" :key="plot.plotId" class="crop-line">{{ silCropName(plot.crop) }} / {{ plot.variety || '待补' }}<em v-if="index < (row.plots.length - 1)">、</em></span>
          </template>
        </el-table-column>
        <el-table-column label="预计产量（吨）" width="130">
          <template #default="{ row }">{{ Number(row.expectedYield || 0).toFixed(1) }}</template>
        </el-table-column>
        <el-table-column label="计划年度" width="110">
          <template #default="{ row }">{{ row.year }} {{ row.season }}</template>
        </el-table-column>
        <el-table-column label="来源" width="100">
          <template #default="{ row }"><el-tag size="small" :type="row.source === 'agent' ? 'warning' : 'info'" effect="plain">{{ row.source === 'agent' ? '县级代办' : '主体申报' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><el-tag size="small" :type="SIL_PLAN_STATUS[row.status]?.tag || 'info'">{{ SIL_PLAN_STATUS[row.status]?.name || row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ row.submittedAt || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="canEdit(row)" link type="primary" @click="openForm(row)">{{ row.status === 'rejected' ? '修改重报' : '编辑' }}</el-button>
            <el-button v-if="row.status === 'filed'" link type="primary" @click="viewMap(row)">上图</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !rows.length" description="暂无种植计划申报" :image-size="80" />
    </section>

    <!-- 申报 / 补正 -->
    <el-drawer v-model="formVisible" :title="form.id ? '种植计划详情 / 修改重报' : (isCounty ? '县级代办 · 新增种植计划' : '新增种植计划')" size="min(1000px, 96vw)" append-to-body>
      <div class="form-body">
        <section class="form-section">
          <div class="section-head"><h3>1. 种植主体</h3><span>主体档案来自地块管理，县级可代辖区主体填报</span></div>
          <el-form label-width="96px">
            <el-form-item v-if="isCounty" label="种植主体" required>
              <el-select v-model="form.subjectId" filterable placeholder="选择辖区内种植主体" style="width: 100%" @change="onSubjectChange">
                <el-option v-for="item in agentSubjects" :key="item.id" :label="`${item.name}（${item.regionName}）`" :value="item.id" />
              </el-select>
            </el-form-item>
            <template v-else>
              <el-form-item label="种植主体"><b>{{ role.unit }}</b></el-form-item>
              <el-form-item label="联系人"><span>{{ role.name }} · {{ role.regionName }}</span></el-form-item>
            </template>
            <el-form-item label="计划年度" required>
              <el-select v-model="form.year" style="width: 160px">
                <el-option v-for="year in years" :key="year" :label="`${year} 年`" :value="year" />
              </el-select>
              <el-tag class="season-tag" type="success" effect="plain">春夏季（青贮唯一收储季）</el-tag>
            </el-form-item>
          </el-form>
        </section>

        <section class="form-section">
          <div class="section-head"><h3>2. 选择地块并填报品种</h3><span>地块须属于所选主体；勾选后填写作物、品种和预计产量</span></div>
          <el-alert v-if="!form.subjectId" title="请先选择种植主体，再勾选地块。" type="info" :closable="false" />
          <el-table v-else :data="plotRows" border size="small" class="plot-table" max-height="360">
            <el-table-column width="52">
              <template #default="{ row }"><el-checkbox v-model="row.checked" :disabled="!row.geometry" @change="syncPlot(row)" /></template>
            </el-table-column>
            <el-table-column prop="name" label="地块" min-width="170" show-overflow-tooltip>
              <template #default="{ row }"><b>{{ row.name }}</b><small class="cell-sub">{{ row.regionName }} · {{ row.id }}</small></template>
            </el-table-column>
            <el-table-column prop="areaMu" label="面积（亩）" width="100" />
            <el-table-column label="作物" width="150">
              <template #default="{ row }">
                <el-select v-model="row.crop" size="small" :disabled="!row.checked" placeholder="选择作物">
                  <el-option v-for="crop in cropOptions" :key="crop.code" :label="crop.name" :value="crop.code" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="品种" width="150">
              <template #default="{ row }"><el-input v-model="row.variety" size="small" :disabled="!row.checked" placeholder="如 豫青贮23" /></template>
            </el-table-column>
            <el-table-column label="预计产量（吨）" width="150">
              <template #default="{ row }"><el-input-number v-model="row.expectedYield" size="small" :min="0" :precision="1" :disabled="!row.checked" controls-position="right" style="width: 100%" /></template>
            </el-table-column>
            <el-table-column label="边界" width="80">
              <template #default="{ row }"><el-tag size="small" :type="row.geometry ? 'success' : 'danger'" effect="plain">{{ row.geometry ? '可上图' : '缺失' }}</el-tag></template>
            </el-table-column>
          </el-table>
          <div v-if="form.subjectId" class="plot-summary">
            已选 <b>{{ selectedRows.length }}</b> 块 · <b>{{ selectedArea.toFixed(1) }}</b> 亩 · 预计产量 <b>{{ selectedYield.toFixed(1) }}</b> 吨
          </div>
        </section>

        <section class="form-section">
          <div class="section-head"><h3>3. 电子承诺书</h3><span>提交前须签署，随备案单据留存</span></div>
          <div class="promise-box">
            <p>本人承诺：申报的青贮饲料种植品种、面积、地块及预计产量真实准确；收割前主动接受属地核查；未申报备案的春夏季青贮收割，按毁麦事件处置。</p>
            <el-checkbox v-model="form.promiseAccepted">我已阅读并签署电子承诺书</el-checkbox>
          </div>
          <div class="upload-line">
            <span>佐证材料（选填）：</span>
            <el-upload :auto-upload="false" :show-file-list="false" multiple :on-change="addAttachment">
              <el-button size="small">添加附件</el-button>
            </el-upload>
            <el-tag v-for="(file, index) in form.attachments" :key="index" closable size="small" @close="form.attachments.splice(index, 1)">{{ file.name }}</el-tag>
          </div>
        </section>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button :loading="saving" @click="submit(false)">保存草稿</el-button>
          <el-button type="primary" :loading="saving" @click="submit(true)">提交备案</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 详情 -->
    <el-drawer v-model="detailVisible" title="种植计划详情" size="min(900px, 96vw)" append-to-body>
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="备案编号">{{ current.filedNo || '尚未备案' }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag size="small" :type="SIL_PLAN_STATUS[current.status]?.tag">{{ SIL_PLAN_STATUS[current.status]?.name }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="种植主体">{{ current.subjectName }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ current.owner }} · {{ current.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="属地">{{ current.regionName }}</el-descriptions-item>
          <el-descriptions-item label="计划年度">{{ current.year }} 年 {{ current.season }}</el-descriptions-item>
          <el-descriptions-item label="地块 / 面积">{{ current.plots?.length }} 块 · {{ Number(current.area).toFixed(1) }} 亩</el-descriptions-item>
          <el-descriptions-item label="预计产量">{{ Number(current.expectedYield).toFixed(1) }} 吨</el-descriptions-item>
          <el-descriptions-item label="申报来源">{{ current.source === 'agent' ? '县级代办' : '主体自主申报' }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ current.submittedAt || '—' }}</el-descriptions-item>
        </el-descriptions>

        <h3 class="block-title">地块与品种</h3>
        <el-table :data="current.plots || []" border size="small">
          <el-table-column prop="name" label="地块" min-width="170" />
          <el-table-column label="作物 / 品种" min-width="170"><template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety || '—' }}</template></el-table-column>
          <el-table-column prop="areaMu" label="面积（亩）" width="100" />
          <el-table-column prop="expectedYield" label="预计产量（吨）" width="130" />
          <el-table-column label="边界" width="80"><template #default="{ row }"><el-tag size="small" :type="row.geometry ? 'success' : 'danger'" effect="plain">{{ row.geometry ? '已上图' : '缺失' }}</el-tag></template></el-table-column>
        </el-table>

        <h3 class="block-title">电子承诺书</h3>
        <div class="promise-box">
          <p>{{ current.promise?.content }}</p>
          <small>签署人：{{ current.promise?.signer || '—' }} · {{ current.promise?.signedAt || '未签署' }}</small>
        </div>

        <h3 class="block-title">办理记录</h3>
        <el-timeline>
          <el-timeline-item v-for="(item, index) in current.auditTrail || []" :key="index" :timestamp="item.time">
            <b>{{ item.action }}</b> · {{ item.user }}<p v-if="item.opinion" class="trail-opinion">{{ item.opinion }}</p>
          </el-timeline-item>
        </el-timeline>

        <div class="drawer-footer">
          <el-button v-if="current.status === 'filed'" type="primary" @click="viewMap(current)">在种植上图查看</el-button>
          <el-button v-if="canEdit(current)" @click="openForm(current)">继续填报</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  SIL_PLAN_STATUS, SIL_CROP_OPTIONS, silCropName, canDeclarePlan,
  fetchPlans, savePlan, fetchSubjectPlots, fetchAgentSubjects
} from '@/api/silPlan'

const router = useRouter()
const userStore = useUserStore()
const role = computed(() => userStore.role)
const isCounty = computed(() => role.value?.code === 'county')
const canDeclare = computed(() => canDeclarePlan(role.value))
const years = [2026, 2027, 2028]
const cropOptions = SIL_CROP_OPTIONS()

const filters = reactive({ keyword: '', status: '', year: '' })
const rows = ref([])
const loading = ref(false)
const saving = ref(false)

const formVisible = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const form = reactive({ id: '', subjectId: '', year: 2027, plots: [], promiseAccepted: false, attachments: [] })
const plotRows = ref([])
const agentSubjects = ref([])

const filedCount = computed(() => rows.value.filter(item => item.status === 'filed').length)
const pendingCount = computed(() => rows.value.filter(item => item.status === 'pending').length)
const filedArea = computed(() => rows.value.filter(item => item.status === 'filed').reduce((sum, item) => sum + Number(item.area || 0), 0))
const filedYield = computed(() => rows.value.filter(item => item.status === 'filed').reduce((sum, item) => sum + Number(item.expectedYield || 0), 0))
const selectedRows = computed(() => plotRows.value.filter(item => item.checked))
const selectedArea = computed(() => selectedRows.value.reduce((sum, item) => sum + Number(item.areaMu || 0), 0))
const selectedYield = computed(() => selectedRows.value.reduce((sum, item) => sum + Number(item.expectedYield || 0), 0))

const canEdit = row => canDeclare.value && ['draft', 'rejected'].includes(row.status) && (role.value.code === 'county' || row.subjectId === role.value.subjectId)

async function load() {
  loading.value = true
  try { rows.value = await fetchPlans(filters, role.value) } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}
function reset() { filters.keyword = ''; filters.status = ''; filters.year = ''; load() }

async function ensureSubjects() {
  if (!isCounty.value) return
  if (!agentSubjects.value.length) agentSubjects.value = await fetchAgentSubjects(role.value)
}

async function openForm(row) {
  await ensureSubjects()
  const source = row || null
  form.id = source?.id || ''
  form.subjectId = source?.subjectId || (isCounty.value ? '' : role.value.subjectId)
  form.year = source?.year || 2027
  form.promiseAccepted = !!source?.promise?.signedAt
  form.attachments = source?.attachments ? [...source.attachments] : []
  formVisible.value = true
  if (form.subjectId) await loadPlots(source?.plots || [])
  else plotRows.value = []
}

async function onSubjectChange() {
  form.promiseAccepted = false
  await loadPlots([])
}

async function loadPlots(existing) {
  if (!form.subjectId) { plotRows.value = []; return }
  const plots = await fetchSubjectPlots(form.subjectId)
  const map = new Map((existing || []).map(item => [item.plotId, item]))
  plotRows.value = plots.map(plot => {
    const old = map.get(plot.id)
    return {
      id: plot.id,
      name: plot.name,
      areaMu: plot.areaMu,
      regionName: plot.regionName,
      geometry: plot.geometry,
      checked: !!old,
      crop: old?.crop || 'silage_corn',
      variety: old?.variety || '',
      expectedYield: old?.expectedYield ?? Math.round(plot.areaMu * 2.1 * 10) / 10
    }
  })
}

function syncPlot(row) { if (!row.checked) return; if (!row.crop) row.crop = 'silage_corn' }

function addAttachment(file) {
  form.attachments.push({ name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))}KB` })
}

async function submit(isSubmit) {
  if (!form.subjectId) return ElMessage.warning('请选择种植主体')
  if (!selectedRows.value.length) return ElMessage.warning('请勾选至少一个地块')
  if (isSubmit && !form.promiseAccepted) return ElMessage.warning('请签署电子承诺书')
  saving.value = true
  try {
    const result = await savePlan({
      id: form.id,
      subjectId: form.subjectId,
      year: form.year,
      promiseAccepted: form.promiseAccepted,
      attachments: form.attachments,
      plots: selectedRows.value.map(item => ({ plotId: item.id, crop: item.crop, variety: item.variety, expectedYield: item.expectedYield }))
    }, role.value, isSubmit)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success(isSubmit ? '已提交县级备案' : '草稿已保存')
    formVisible.value = false
    load()
  } finally { saving.value = false }
}

function openDetail(row) { current.value = row; detailVisible.value = true }
function viewMap(row) { router.push({ path: '/sil/map', query: { planId: row.id } }) }

onMounted(async () => { await ensureSubjects(); load() })
watch(() => role.value?.code, () => { load() })
</script>

<style scoped lang="scss">
.sil-plan { min-height: 0; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.page-head h2 { font-size: 18px; color: var(--ah-text); margin-bottom: 6px; }
.page-head p { font-size: 12px; color: var(--ah-text-muted); line-height: 1.6; max-width: 820px; }
.panel { flex: 1; min-height: 0; overflow: auto; }
.filters { margin-bottom: 4px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 4px 0 14px; }
.summary-card { background: #f5f8fc; border: 1px solid #e6edf6; border-radius: 8px; padding: 12px 14px; }
.summary-card span, .summary-card b, .summary-card small { display: block; }
.summary-card span { font-size: 12px; color: var(--ah-text-muted); }
.summary-card b { font-size: 22px; color: var(--ah-primary); margin: 4px 0; font-variant-numeric: tabular-nums; }
.summary-card small { font-size: 11px; color: var(--ah-text-muted); }
.cell-sub { display: block; font-size: 11px; color: var(--ah-text-muted); margin-top: 3px; }
.mono { font-variant-numeric: tabular-nums; }
.crop-line em { font-style: normal; }
.form-body { padding-bottom: 8px; }
.form-section { padding: 4px 0 12px; border-bottom: 1px dashed var(--ah-border); margin-bottom: 14px; }
.section-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.section-head h3 { font-size: 15px; color: var(--ah-text); }
.section-head span { font-size: 11px; color: var(--ah-text-muted); }
.season-tag { margin-left: 10px; }
.plot-table { margin-top: 4px; }
.plot-summary { margin-top: 10px; font-size: 12px; color: var(--ah-text-secondary); }
.plot-summary b { color: var(--ah-primary); }
.promise-box { background: #f7fafc; border: 1px solid #e6edf6; border-radius: 8px; padding: 12px 14px; }
.promise-box p { font-size: 12px; line-height: 1.8; color: var(--ah-text-secondary); margin-bottom: 8px; }
.promise-box small { font-size: 11px; color: var(--ah-text-muted); }
.upload-line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; font-size: 12px; color: var(--ah-text-secondary); }
.block-title { font-size: 14px; color: var(--ah-text); margin: 18px 0 10px; }
.trail-opinion { font-size: 12px; color: var(--ah-text-secondary); margin-top: 4px; }
.drawer-footer { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 16px; }
@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
