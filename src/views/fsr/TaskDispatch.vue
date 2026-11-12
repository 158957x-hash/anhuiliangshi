<template>
  <div class="page-container fsr-page">
    <div class="page-head">
      <div>
        <h2>任务流程库</h2>
        <p>按结构化节点记录任务下发、核查、上报、审核、整改和结案。</p>
      </div>
      <el-button type="primary" @click="load">刷新流程</el-button>
    </div>

    <div class="panel">
      <div class="panel-title">任务流程列表</div>
      <!-- 环节时限为演示口径，待业务确认 -->
      <div class="demo-note">环节时限为演示规则（核查7天/审核3天/整改15天/复核5天），待业务确认；核查录入与整改提交由县级核查人员通过移动端（皖政通）办理，桌面端仅展示进度</div>
      <!-- 七状态页签（口径见 EVENT_STATUS 字典），每个页签带数量 -->
      <el-tabs v-model="tab">
        <el-tab-pane v-for="s in EVENT_STATUS_FLOW" :key="s" :name="s">
          <template #label>
            {{ EVENT_STATUS[s]?.name }}<span class="tab-count num">{{ groups[s]?.length || 0 }}</span>
          </template>
          <el-table :data="groups[s]" stripe border>
            <el-table-column prop="taskId" label="流程编号" width="150">
              <template #default="{ row }">{{ row.taskId || '待生成' }}</template>
            </el-table-column>
            <el-table-column prop="code" label="图斑编号" width="145" />
            <el-table-column prop="regionName" label="所在位置" min-width="150" />
            <el-table-column label="下发时间" width="145">
              <template #default="{ row }">{{ row.dispatchedAt || '待下发' }}</template>
            </el-table-column>
            <el-table-column label="核查责任人/单位" min-width="180">
              <template #default="{ row }">{{ row.checkResponsiblePerson || row.checkResponsibleUnit || row.assignee || '待明确' }}</template>
            </el-table-column>
            <el-table-column label="核查时间" width="130">
              <template #default="{ row }">{{ row.checkedAt || '待核查' }}</template>
            </el-table-column>
            <el-table-column label="上报时间" width="130">
              <template #default="{ row }">{{ row.reportedAt || '待上报' }}</template>
            </el-table-column>
            <el-table-column label="审核人" width="125">
              <template #default="{ row }">{{ row.auditor || '待审核' }}</template>
            </el-table-column>
            <el-table-column label="审核时间" width="130">
              <template #default="{ row }">{{ row.auditedAt || '待审核' }}</template>
            </el-table-column>
            <el-table-column label="处置措施" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.completionDescription || row.rectifyNote?.desc || row.auditOpinion || '待明确' }}</template>
            </el-table-column>
            <el-table-column label="当前状态" width="140">
              <template #default="{ row }">
                <StatusTag :dict="EVENT_STATUS" :value="row.status" />
                <el-tag v-if="row.overdue" size="small" type="danger" effect="dark" class="overdue-tag">已超期</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="210" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" @click="openDispatch(row)">派发</el-button>
                <!-- 市级/省级角色可对已上报事件接单审核；接单前可退回重核（用户确认 2026-11-12） -->
                <el-button
                  v-if="row.status === 'reported' && canAccept" link type="success"
                  :loading="acceptLoadingId === row.id" @click="accept(row)"
                >接单审核</el-button>
                <el-button v-if="row.status === 'reported' && canAccept" link type="warning" @click="openReturn(row)">退回重核</el-button>
                <!-- 审核环节（reviewing）：审核通过 / 打回重核（由核查整改库合并入任务流程库，一事件一任务一页面） -->
                <el-button v-if="row.status === 'reviewing' && canAccept" link type="success" :loading="auditPassLoadingId === row.id" @click="auditPass(row)">审核通过</el-button>
                <el-button v-if="row.status === 'reviewing' && canAccept" link type="warning" @click="openAuditReject(row)">打回重核</el-button>
                <!-- 复核环节（recheck）：复核通过（结案）/ 退回整改 -->
                <el-button v-if="row.status === 'recheck' && canAccept" link type="success" :loading="closePassLoadingId === row.id" @click="closePass(row)">复核通过</el-button>
                <el-button v-if="row.status === 'recheck' && canAccept" link type="danger" @click="openCloseReject(row)">退回整改</el-button>
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
                <el-button link type="primary" @click="showTrail(row)">流程</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 接单前退回重核（reported → checking）：内嵌完整详情，退回前可查看核查上报情况 -->
    <el-dialog v-model="returnVisible" title="退回重核" width="720px" class="op-dialog">
      <template v-if="current">
        <TaskDetailContent :event="current" />
        <el-divider />
      </template>
      <el-alert type="warning" :closable="false" style="margin-bottom: 12px" title="接单前退回：事件将回到待核查状态，由原核查责任人补充材料后重新上报。" />
      <el-form label-width="80px">
        <el-form-item label="退回原因" required>
          <el-input v-model="returnForm.reason" type="textarea" :rows="3" placeholder="如：派发区域有误 / 图斑定位偏差需重新核实" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnVisible = false">取消</el-button>
        <el-button type="warning" :loading="returnLoading" @click="submitReturn">确认退回</el-button>
      </template>
    </el-dialog>

    <!-- 派发核查任务（pending → checking）：属地自动匹配 + 人工确认；内嵌完整任务详情（用户硬性要求 2026-11-12） -->
    <el-dialog v-model="visible" title="派发核查任务" width="720px" class="op-dialog">
      <template v-if="current">
        <TaskDetailContent :event="current" />
        <el-divider />
      </template>
      <el-alert type="info" :closable="false" class="dispatch-tip" title="系统按图斑属地自动匹配核查责任人（可改派），确认后任务直达县级执行层" />
      <el-form label-width="90px">
        <el-form-item label="图斑编号">{{ current?.code }}（{{ current?.regionName }}）</el-form-item>
        <el-form-item label="核查责任人">
          <el-select v-model="form.checkerId" placeholder="属地人员目录" style="width: 100%" @change="onCheckerChange">
            <el-option v-for="c in checkers" :key="c.id" :value="c.id" :label="`${c.name} · ${c.unit} ${c.duty}${c.recommended ? '（推荐）' : ''}`" />
          </el-select>
        </el-form-item>
        <el-form-item label="责任单位"><el-input :model-value="selectedChecker?.unit || ''" disabled /></el-form-item>
        <el-form-item label="核查截止">
          <el-date-picker v-model="form.checkDeadline" type="date" value-format="YYYY-MM-DD" :disabled-date="(d) => d.getTime() < Date.now() - 86400000" style="width: 100%" />
          <div class="field-hint">按业务配置核查时限自动推算，可调整</div>
        </el-form-item>
        <el-form-item label="派发要求"><el-input v-model="form.requirement" type="textarea" placeholder="核查重点、取证要求等" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="dispatchLoading" @click="submit">确认派发</el-button>
      </template>
    </el-dialog>

    <!-- 审核打回重核（reviewing → checking，意见必填）：内嵌完整详情可查看核查上报 -->
    <el-dialog v-model="auditRejectVisible" title="打回重核" width="720px" class="op-dialog">
      <template v-if="current"><TaskDetailContent :event="current" /><el-divider /></template>
      <el-form ref="auditRejectFormRef" :model="auditRejectForm" :rules="opinionRules" label-width="90px">
        <el-form-item label="审核意见" prop="opinion">
          <el-input v-model="auditRejectForm.opinion" type="textarea" :rows="3" placeholder="请填写打回原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditRejectVisible = false">取消</el-button>
        <el-button type="warning" :loading="auditRejectSubmitting" @click="submitAuditReject">确认打回</el-button>
      </template>
    </el-dialog>

    <!-- 复核退回整改（recheck → audited，意见必填）：内嵌完整详情可查看整改情况 -->
    <el-dialog v-model="closeRejectVisible" title="复核退回整改" width="720px" class="op-dialog">
      <template v-if="current"><TaskDetailContent :event="current" /><el-divider /></template>
      <el-form ref="closeRejectFormRef" :model="closeRejectForm" :rules="opinionRules" label-width="90px">
        <el-form-item label="复核意见" prop="opinion">
          <el-input v-model="closeRejectForm.opinion" type="textarea" :rows="3" placeholder="请填写退回原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeRejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="closeRejectSubmitting" @click="submitCloseReject">确认退回</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情抽屉（事件/任务/核查附件/整改复核/全轨迹） -->
    <TaskDetailDrawer :visible="detailVisible" :event="detailEvent" @close="detailVisible = false" />

    <!-- 处置轨迹（完整展示，含市级接单/风险修正等新节点） -->
    <el-dialog v-model="trailVisible" title="任务流程" width="560px">
      <FlowSteps :steps="current?.trail || []" />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchEvents, dispatchTask, acceptReport, returnReport, auditEvent, closeEvent, fetchCheckers } from '@/api/fsr'
import { useUserStore } from '@/stores/user'
import { EVENT_STATUS, EVENT_STATUS_FLOW } from '@/mock/common/dict'
import StatusTag from '@/components/common/StatusTag.vue'
import FlowSteps from '@/components/common/FlowSteps.vue'
import TaskDetailDrawer from './TaskDetailDrawer.vue'
import TaskDetailContent from './TaskDetailContent.vue'

const userStore = useUserStore()
const rows = ref([])
const tab = ref('pending')
const visible = ref(false)
const trailVisible = ref(false)
const current = ref(null)
const form = reactive({ checkerId: '', checkDeadline: '', requirement: '' })
const dispatchLoading = ref(false)
const acceptLoadingId = ref('')
const checkers = ref([])
const selectedChecker = computed(() => checkers.value.find((c) => c.id === form.checkerId))
const onCheckerChange = () => {}
// 任务详情抽屉
const detailVisible = ref(false)
const detailEvent = ref(null)
const openDetail = (row) => { detailEvent.value = row; detailVisible.value = true }
// 接单前退回重核（reported → checking）：原因必填
const returnVisible = ref(false)
const returnLoading = ref(false)
const returnForm = reactive({ reason: '' })
const openReturn = (row) => { current.value = row; returnForm.reason = ''; returnVisible.value = true }
const submitReturn = async () => {
  if (!returnForm.reason.trim()) return ElMessage.warning('请填写退回原因')
  returnLoading.value = true
  try {
    const r = await returnReport(current.value.id, returnForm.reason, { name: userStore.role?.name })
    if (!r.success) return ElMessage.error(r.message || '退回失败')
    ElMessage.success('已退回重核，事件回到待核查状态')
    returnVisible.value = false
    load()
  } finally { returnLoading.value = false }
}

// 七状态分组（按事件真实状态归组，reported 页签可达）
const groups = reactive(Object.fromEntries(EVENT_STATUS_FLOW.map((s) => [s, []])))

// 市级/省级角色可接单审核（其他角色不显示按钮）
const canAccept = computed(() => ['city', 'province'].includes(userStore.role?.code))

const load = async () => {
  rows.value = await fetchEvents(userStore.role, {})
  EVENT_STATUS_FLOW.forEach((s) => { groups[s] = rows.value.filter((e) => e.status === s) })
}

// 派发核查任务：属地自动匹配 + 人工确认，截止日期按配置时限推算（默认7天）
const openDispatch = async (r) => {
  current.value = r; form.checkerId = ''; form.requirement = ''
  const d = new Date(Date.now() + 7 * 86400000); form.checkDeadline = d.toISOString().slice(0, 10)
  visible.value = true
  checkers.value = await fetchCheckers(r.regionCode)
  form.checkerId = checkers.value.find((c) => c.recommended)?.id || checkers.value[0]?.id || ''
}
const submit = async () => {
  const c = selectedChecker.value
  if (!c) return ElMessage.warning('请从属地人员目录选择核查责任人')
  if (!form.checkDeadline) return ElMessage.warning('请选择核查截止日期')
  dispatchLoading.value = true
  try {
    const r = await dispatchTask(current.value.id, { checkerId: c.id, checkerName: c.name, checkerUnit: c.unit, checkDeadline: form.checkDeadline, requirement: form.requirement })
    if (!r.success) return ElMessage.error(r.message || '派发失败')
    ElMessage.success(`任务已派发至${c.unit}（${r.taskId}）`)
    visible.value = false
    load()
  } finally {
    dispatchLoading.value = false
  }
}

// 接单审核（reported → reviewing）；接口按 { role, name } 形态校验，role 取演示角色 code
const accept = async (row) => {
  acceptLoadingId.value = row.id
  try {
    const r = await acceptReport(row.id, { role: userStore.role?.code, name: userStore.role?.name })
    if (!r?.success) return ElMessage.error(r?.message || '接单失败')
    ElMessage.success('接单成功，已转入待审核，请在"待审核"页签完成审核')
    load()
  } finally {
    acceptLoadingId.value = ''
  }
}

const showTrail = (r) => { current.value = r; trailVisible.value = true }

// ===== 审核环节（reviewing）：通过（转整改）/ 打回重核（退回核查），由原核查整改库合并（用户确认 2026-11-12） =====
const opinionRules = { opinion: [{ required: true, message: '请填写意见', trigger: 'blur' }] }
const auditRejectVisible = ref(false)
const auditRejectSubmitting = ref(false)
const auditRejectFormRef = ref(null)
const auditRejectForm = reactive({ opinion: '' })
const auditPassLoadingId = ref('')
const auditPass = async (row) => {
  try {
    await ElMessageBox.confirm('确认审核通过？事件将转入整改环节。', '审核通过', { type: 'success', confirmButtonText: '确认通过', cancelButtonText: '取消' })
  } catch { return }
  auditPassLoadingId.value = row.id
  try {
    const r = await auditEvent(row.id, 'pass', '核查材料完整，事实清楚，请责任单位限期整改', userStore.role?.name || '审核人')
    if (!r?.success) return ElMessage.error(r?.message || '审核失败')
    ElMessage.success('审核通过，事件转入整改')
    load()
  } finally { auditPassLoadingId.value = '' }
}
const openAuditReject = (r) => { current.value = r; auditRejectForm.opinion = ''; auditRejectVisible.value = true }
const submitAuditReject = async () => {
  try { await auditRejectFormRef.value.validate() } catch { return }
  auditRejectSubmitting.value = true
  try {
    const r = await auditEvent(current.value.id, 'reject', auditRejectForm.opinion, userStore.role?.name || '审核人')
    if (!r?.success) return ElMessage.error(r?.message || '打回失败')
    ElMessage.success('已打回重核，事件退回待核查')
    auditRejectVisible.value = false
    load()
  } finally { auditRejectSubmitting.value = false }
}

// ===== 复核环节（recheck）：通过（结案生成简报）/ 退回整改 =====
const closeRejectVisible = ref(false)
const closeRejectSubmitting = ref(false)
const closeRejectFormRef = ref(null)
const closeRejectForm = reactive({ opinion: '' })
const closePassLoadingId = ref('')
const closePass = async (row) => {
  try {
    await ElMessageBox.confirm('确认复核通过并结案？通过后将生成结案编号与事件简报。', '复核通过', { type: 'success', confirmButtonText: '确认结案', cancelButtonText: '取消' })
  } catch { return }
  closePassLoadingId.value = row.id
  try {
    const r = await closeEvent(row.id, 'pass', '', userStore.role?.name || '复核人')
    if (!r?.success) return ElMessage.error(r?.message || '复核失败')
    ElMessage.success({ message: `复核通过，结案编号：${r.closeNo}，事件简报已生成`, duration: 6000 })
    load()
  } finally { closePassLoadingId.value = '' }
}
const openCloseReject = (r) => { current.value = r; closeRejectForm.opinion = ''; closeRejectVisible.value = true }
const submitCloseReject = async () => {
  try { await closeRejectFormRef.value.validate() } catch { return }
  closeRejectSubmitting.value = true
  try {
    const r = await closeEvent(current.value.id, 'reject', closeRejectForm.opinion, userStore.role?.name || '复核人')
    if (!r?.success) return ElMessage.error(r?.message || '退回失败')
    ElMessage.success('复核不通过，已退回整改')
    closeRejectVisible.value = false
    load()
  } finally { closeRejectSubmitting.value = false }
}
onMounted(() => {
  // 支持从变化图斑库"去接单"跳转定位页签（用户反馈 2026-11-12）
  const qTab = useRoute().query.tab
  if (qTab && EVENT_STATUS_FLOW.includes(qTab)) tab.value = qTab
  load()
})
</script>

<style scoped lang="scss">
.fsr-page { overflow: auto; }
.page-head {
  display: flex; justify-content: space-between; margin-bottom: 14px;
  h2 { margin: 4px 0; font-size: 20px; font-weight: 600; }
  p { margin: 0; color: var(--ah-text-secondary); font-size: 13px; }
}
.panel-title { font-weight: 500; }
.demo-note { color: var(--ah-text-secondary); font-size: 12px; margin: -6px 0 10px; }
.tab-count {
  display: inline-block; margin-left: 4px; padding: 0 6px; min-width: 18px; text-align: center;
  font-size: 12px; line-height: 18px; border-radius: 9px;
  background: #e8f3ff; color: var(--ah-primary);
}
.overdue-tag { margin-left: 6px; }
.dispatch-tip { margin-bottom: 12px; }
/* 操作弹窗内嵌完整详情（用户硬性要求 2026-11-12）：弹窗内容超高滚动 */
:deep(.op-dialog .el-dialog__body) { max-height: 68vh; overflow-y: auto; }
.field-hint { margin-top: 4px; font-size: 12px; color: var(--ah-text-secondary); line-height: 1.4; }
</style>
