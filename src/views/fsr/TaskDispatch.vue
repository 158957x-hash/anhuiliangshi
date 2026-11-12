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
      <div class="demo-note">环节时限为演示规则（核查7天/审核3天/整改15天/复核5天），待业务确认</div>
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
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" @click="openDispatch(row)">派发</el-button>
                <!-- 市级/省级角色可对已上报事件接单审核；接单前可退回重核（用户确认 2026-11-12） -->
                <el-button
                  v-if="row.status === 'reported' && canAccept" link type="success"
                  :loading="acceptLoadingId === row.id" @click="accept(row)"
                >接单审核</el-button>
                <el-button v-if="row.status === 'reported' && canAccept" link type="warning" @click="openReturn(row)">退回重核</el-button>
                <el-button link type="primary" @click="showTrail(row)">流程</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 接单前退回重核（reported → checking） -->
    <el-dialog v-model="returnVisible" title="退回重核" width="480px">
      <el-alert type="warning" :closable="false" style="margin-bottom: 12px" title="接单前退回：事件将回到待核查状态，由原核查责任人补充材料后重新上报。" />
      <el-form label-width="80px">
        <el-form-item label="事件编号"><span class="num">{{ current?.code }}</span></el-form-item>
        <el-form-item label="退回原因" required>
          <el-input v-model="returnForm.reason" type="textarea" :rows="3" placeholder="如：派发区域有误 / 图斑定位偏差需重新核实" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnVisible = false">取消</el-button>
        <el-button type="warning" :loading="returnLoading" @click="submitReturn">确认退回</el-button>
      </template>
    </el-dialog>

    <!-- 派发核查任务（pending → checking） -->
    <el-dialog v-model="visible" title="派发核查任务" width="520px">
      <el-form label-width="90px">
        <el-form-item label="图斑编号">{{ current?.code }}</el-form-item>
        <el-form-item label="核查责任人"><el-input v-model="form.assignee" /></el-form-item>
        <el-form-item label="核查截止"><el-input-number v-model="form.deadlineDays" :min="1" :max="60" /></el-form-item>
        <el-form-item label="计划落实"><el-input v-model="form.requirement" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="dispatchLoading" @click="submit">确认派发</el-button>
      </template>
    </el-dialog>

    <!-- 处置轨迹（完整展示，含市级接单/风险修正等新节点） -->
    <el-dialog v-model="trailVisible" title="任务流程" width="560px">
      <FlowSteps :steps="current?.trail || []" />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchEvents, dispatchTask, acceptReport, returnReport } from '@/api/fsr'
import { useUserStore } from '@/stores/user'
import { EVENT_STATUS, EVENT_STATUS_FLOW } from '@/mock/common/dict'
import StatusTag from '@/components/common/StatusTag.vue'
import FlowSteps from '@/components/common/FlowSteps.vue'

const userStore = useUserStore()
const rows = ref([])
const tab = ref('pending')
const visible = ref(false)
const trailVisible = ref(false)
const current = ref(null)
const form = reactive({ assignee: '', deadlineDays: 7, requirement: '' })
const dispatchLoading = ref(false)
const acceptLoadingId = ref('')
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

// 派发核查任务
const openDispatch = (r) => { current.value = r; form.assignee = r.assignee || ''; form.requirement = ''; visible.value = true }
const submit = async () => {
  if (!form.assignee.trim()) return ElMessage.warning('请填写核查责任人')
  dispatchLoading.value = true
  try {
    const r = await dispatchTask(current.value.id, form)
    if (!r.success) return ElMessage.error(r.message || '派发失败')
    ElMessage.success('任务已派发')
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
    ElMessage.success('接单成功，事件转入待审核')
    load()
  } finally {
    acceptLoadingId.value = ''
  }
}

const showTrail = (r) => { current.value = r; trailVisible.value = true }
onMounted(load)
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
</style>
