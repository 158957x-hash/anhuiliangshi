<template>
  <div class="page-container sil-disaster">
    <header class="page-head">
      <div>
        <h2>受灾作物补充收储上报</h2>
        <p>已备案地块受灾后，种植主体（或县级代办）上报受灾面积与原因；县级确认后纳入补充收储，不改变原备案地块边界。</p>
      </div>
      <div class="head-actions"><el-button v-if="canReport" type="primary" @click="openForm()">新增受灾上报</el-button></div>
    </header>

    <section class="panel">
      <el-form :inline="true" class="filters" @submit.prevent="load">
        <el-form-item label="关键字"><el-input v-model="filters.keyword" placeholder="主体 / 地块 / 原因" clearable style="width: 220px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 160px">
            <el-option v-for="(item, key) in SIL_DISASTER_STATUS" :key="key" :label="item.name" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="load">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>

      <div class="summary-grid">
        <div class="summary-card"><span>上报总数</span><b>{{ filtered.length }}</b><small>当前筛选范围</small></div>
        <div class="summary-card"><span>待县级确认</span><b>{{ pendingCount }}</b><small>需属地核实</small></div>
        <div class="summary-card"><span>已纳入补充收储</span><b>{{ confirmedCount }}</b><small>计入补充台账</small></div>
        <div class="summary-card"><span>受灾面积（亩）</span><b>{{ totalArea.toFixed(1) }}</b><small>按上报面积合计</small></div>
      </div>

      <el-table v-loading="loading" :data="filtered" stripe border>
        <el-table-column prop="id" label="上报编号" min-width="180" />
        <el-table-column label="种植主体 / 地块" min-width="230">
          <template #default="{ row }"><b>{{ row.subjectName }}</b><small class="cell-sub">{{ row.plotName }} · {{ row.regionName }}</small></template>
        </el-table-column>
        <el-table-column label="作物 / 品种" min-width="160"><template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety || '—' }}</template></el-table-column>
        <el-table-column label="受灾面积（亩）" width="130"><template #default="{ row }">{{ row.affectedArea }}（{{ row.affectedRatio }}%）</template></el-table-column>
        <el-table-column prop="reason" label="受灾原因" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="150"><template #default="{ row }"><el-tag size="small" :type="SIL_DISASTER_STATUS[row.status]?.tag">{{ SIL_DISASTER_STATUS[row.status]?.name }}</el-tag></template></el-table-column>
        <el-table-column label="上报时间" width="160"><template #default="{ row }">{{ row.submittedAt }}</template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'pending' && canAudit" link type="success" @click="confirm(row)">确认纳入</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !filtered.length" description="暂无受灾补充上报" :image-size="80" />
    </section>

    <el-drawer v-model="formVisible" title="新增受灾作物补充收储上报" size="min(720px, 96vw)" append-to-body>
      <el-form label-width="110px">
        <el-form-item label="备案种植计划" required>
          <el-select v-model="form.planId" filterable placeholder="选择已备案种植计划" style="width: 100%" @change="onPlanChange">
            <el-option v-for="plan in plans" :key="plan.id" :label="`${plan.filedNo} · ${plan.subjectName}`" :value="plan.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="受灾地块" required>
          <el-select v-model="form.plotId" placeholder="选择地块" style="width: 100%">
            <el-option v-for="plot in plotOptions" :key="plot.plotId" :label="`${plot.name} · ${plot.areaMu} 亩`" :value="plot.plotId" />
          </el-select>
        </el-form-item>
        <el-form-item label="受灾面积" required>
          <el-input-number v-model="form.affectedArea" :min="0" :max="maxArea" :precision="1" controls-position="right" style="width: 200px" /><span class="unit">亩（地块 {{ maxArea }} 亩）</span>
        </el-form-item>
        <el-form-item label="受灾原因" required><el-input v-model="form.reason" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="如：风雹倒伏、连续降雨霉变等" /></el-form-item>
        <el-form-item label="现场佐证">
          <div class="upload-line">
            <el-upload :auto-upload="false" :show-file-list="false" multiple :on-change="addFile"><el-button size="small">添加照片/材料</el-button></el-upload>
            <el-tag v-for="(file, index) in form.attachments" :key="index" closable size="small" @close="form.attachments.splice(index, 1)">{{ file.name }}</el-tag>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="drawer-footer"><el-button @click="formVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">提交上报</el-button></div>
      </template>
    </el-drawer>

    <el-drawer v-model="detailVisible" title="受灾补充上报详情" size="min(760px, 96vw)" append-to-body>
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="上报编号">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag size="small" :type="SIL_DISASTER_STATUS[current.status]?.tag">{{ SIL_DISASTER_STATUS[current.status]?.name }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="种植主体">{{ current.subjectName }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ current.owner }} · {{ current.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="来源备案">{{ current.planNo }}</el-descriptions-item>
          <el-descriptions-item label="地块">{{ current.plotName }}（{{ current.plotArea }} 亩）</el-descriptions-item>
          <el-descriptions-item label="作物 / 品种">{{ silCropName(current.crop) }} / {{ current.variety || '—' }}</el-descriptions-item>
          <el-descriptions-item label="受灾面积">{{ current.affectedArea }} 亩（{{ current.affectedRatio }}%）</el-descriptions-item>
          <el-descriptions-item label="受灾原因" :span="2">{{ current.reason }}</el-descriptions-item>
          <el-descriptions-item v-if="current.confirmNo" label="补充收储编号" :span="2">{{ current.confirmNo }}</el-descriptions-item>
          <el-descriptions-item v-if="current.confirmedAt" label="确认时间" :span="2">{{ current.confirmedAt }} · {{ current.confirmedBy }}</el-descriptions-item>
        </el-descriptions>
        <h3 class="block-title">佐证材料</h3>
        <el-tag v-for="file in current.attachments || []" :key="file.name" class="file-tag">{{ file.name }}</el-tag>
        <el-empty v-if="!(current.attachments || []).length" description="无附件" :image-size="50" />
        <div class="drawer-footer">
          <el-button v-if="current.status === 'pending' && canAudit" type="primary" @click="confirm(current)">确认纳入补充收储</el-button>
          <el-button @click="router.push('/sil/map')">在种植上图查看</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  SIL_DISASTER_STATUS, silCropName, canReportDisaster, canAuditSil,
  fetchDisasters, saveDisaster, confirmDisaster, fetchPlans
} from '@/api/silPlan'

const router = useRouter()
const userStore = useUserStore()
const role = computed(() => userStore.role)
const canReport = computed(() => canReportDisaster(role.value))
const canAudit = computed(() => canAuditSil(role.value))

const filters = reactive({ keyword: '', status: '' })
const rows = ref([])
const plans = ref([])
const loading = ref(false)
const saving = ref(false)
const formVisible = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const form = reactive({ planId: '', plotId: '', affectedArea: null, reason: '', attachments: [] })

const filtered = computed(() => rows.value.filter(row => (!filters.status || row.status === filters.status) && (!filters.keyword || `${row.id} ${row.subjectName} ${row.plotName} ${row.reason}`.includes(filters.keyword))))
const pendingCount = computed(() => rows.value.filter(row => row.status === 'pending').length)
const confirmedCount = computed(() => rows.value.filter(row => row.status === 'confirmed').length)
const totalArea = computed(() => rows.value.reduce((sum, row) => sum + Number(row.affectedArea || 0), 0))
const plotOptions = computed(() => plans.value.find(plan => plan.id === form.planId)?.plots || [])
const maxArea = computed(() => Number(plotOptions.value.find(plot => plot.plotId === form.plotId)?.areaMu || 0))

async function load() {
  loading.value = true
  try {
    const [disasterRows, planRows] = await Promise.all([fetchDisasters({}, role.value), canReport.value ? fetchPlans({ status: 'filed' }, role.value) : Promise.resolve([])])
    rows.value = disasterRows
    plans.value = planRows
  } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}
function reset() { filters.keyword = ''; filters.status = ''; load() }

function openForm() {
  form.planId = ''
  form.plotId = ''
  form.affectedArea = null
  form.reason = ''
  form.attachments = []
  formVisible.value = true
}
function onPlanChange() { form.plotId = ''; form.affectedArea = null }
function addFile(file) { form.attachments.push({ name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))}KB` }) }

async function submit() {
  if (!form.planId) return ElMessage.warning('请选择已备案种植计划')
  if (!form.plotId) return ElMessage.warning('请选择受灾地块')
  if (!form.affectedArea) return ElMessage.warning('请填写受灾面积')
  if (!form.reason.trim()) return ElMessage.warning('请填写受灾原因')
  saving.value = true
  try {
    const result = await saveDisaster({ ...form }, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success('受灾补充上报已提交')
    formVisible.value = false
    load()
  } finally { saving.value = false }
}

async function confirm(row) {
  await ElMessageBox.confirm(`确认将 ${row.subjectName} 的 ${row.affectedArea} 亩受灾地块纳入补充收储？`, '县级确认', { type: 'warning' })
  const result = await confirmDisaster(row.id, role.value)
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success(`已纳入补充收储：${result.confirmNo}`)
  load()
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
.summary-card b { font-size: 22px; color: var(--ah-primary); margin: 4px 0; }
.summary-card small { font-size: 11px; color: var(--ah-text-muted); }
.cell-sub { display: block; font-size: 11px; color: var(--ah-text-muted); margin-top: 3px; }
.unit { margin-left: 8px; font-size: 12px; color: var(--ah-text-muted); }
.upload-line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.block-title { font-size: 14px; margin: 18px 0 10px; }
.file-tag { margin: 0 8px 8px 0; }
.drawer-footer { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 16px; }
@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
