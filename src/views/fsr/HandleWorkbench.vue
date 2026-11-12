<template>
  <div class="page-container fsr-page">
    <div class="page-head">
      <div>
        <h2>现场核查整改库</h2>
        <p>区分核查责任与整改责任，沉淀现场证据和整改闭环。</p>
      </div>
      <el-button type="primary" @click="load">刷新整改记录</el-button>
    </div>

    <div class="panel">
      <div class="panel-title">现场核查整改列表</div>
      <!-- 六环节页签（不含待派发，口径见 EVENT_STATUS 字典）；已结案只读 -->
      <el-tabs v-model="tab">
        <el-tab-pane v-for="s in tabs" :key="s" :name="s">
          <template #label>
            {{ EVENT_STATUS[s]?.name }}<span class="tab-count num">{{ groups[s]?.length || 0 }}</span>
          </template>
          <el-table :data="groups[s]" stripe border>
            <el-table-column prop="code" label="图斑编号" width="150" />
            <el-table-column prop="regionName" label="所在位置" min-width="140" />
            <el-table-column label="现场证据" width="95">
              <template #default="{ row }">{{ row.checkReport ? (row.checkReport.attachments?.length || 0) + ' 项' : '—' }}</template>
            </el-table-column>
            <el-table-column label="文字描述" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.checkReport?.desc || '待录入' }}</template>
            </el-table-column>
            <el-table-column label="GPS定位" width="150">
              <template #default="{ row }">{{ reportGps(row.checkReport) }}</template>
            </el-table-column>
            <el-table-column label="核查结论" width="100">
              <template #default="{ row }">{{ row.checkReport?.conclusion || '待核查' }}</template>
            </el-table-column>
            <el-table-column label="整改责任人" min-width="140">
              <template #default="{ row }">{{ row.rectificationResponsiblePerson || '待明确' }}</template>
            </el-table-column>
            <el-table-column label="措施时限" width="120">
              <template #default="{ row }">{{ row.rectifyDeadline || '待制定' }}</template>
            </el-table-column>
            <el-table-column label="整改完成情况" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.completionDescription || row.rectifyNote?.desc || '待提交' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="230" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="open(row)">查看</el-button>
                <!-- 待核查：现场核查录入（checking → reported） -->
                <el-button v-if="s === 'checking'" link type="success" @click="openCheck(row)">录入核查</el-button>
                <!-- 待审核：审核通过 / 打回重核（打回必须填意见） -->
                <el-button v-if="s === 'reviewing'" link type="success" :loading="auditPassLoadingId === row.id" @click="auditPass(row)">审核通过</el-button>
                <el-button v-if="s === 'reviewing'" link type="warning" @click="openAuditReject(row)">打回重核</el-button>
                <!-- 已审核（整改中）：提交整改（audited → recheck） -->
                <el-button v-if="s === 'audited'" link type="warning" @click="openRectify(row)">提交整改</el-button>
                <!-- 需复查：复核结案 / 退回整改（退回必须填意见） -->
                <el-button v-if="s === 'recheck'" link type="success" :loading="closePassLoadingId === row.id" @click="closePass(row)">复核通过</el-button>
                <el-button v-if="s === 'recheck'" link type="danger" @click="openCloseReject(row)">退回整改</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 详情弹窗：核查报告（附件表格） + 整改情况 + 结案信息 + 完整轨迹 -->
    <el-dialog v-model="visible" title="现场核查整改详情" width="860px">
      <template v-if="current">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="图斑编号">{{ current.code }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :dict="EVENT_STATUS" :value="current.status" /></el-descriptions-item>
          <el-descriptions-item label="数据来源">{{ sourceName(current.source) }}</el-descriptions-item>
          <el-descriptions-item label="核查责任人">{{ current.checkResponsiblePerson || current.assignee || '待明确' }}</el-descriptions-item>
          <el-descriptions-item label="核查时间">{{ current.checkReport?.time || current.checkedAt || '待核查' }}</el-descriptions-item>
          <el-descriptions-item label="核查结论">{{ current.checkReport?.conclusion || '待核查' }}</el-descriptions-item>
          <el-descriptions-item label="GPS定位" :span="2">{{ reportGps(current.checkReport) }}</el-descriptions-item>
          <el-descriptions-item label="上传状态">{{ current.checkReport?.uploadStatus || (current.checkReport ? '已上传' : '—') }}</el-descriptions-item>
          <el-descriptions-item label="文字描述" :span="3">{{ current.checkReport?.desc || '待录入' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 核查证据附件（元数据表格） -->
        <template v-if="current.checkReport">
          <div class="sub-title">核查证据（{{ current.checkReport.attachments?.length || 0 }} 项）</div>
          <el-table :data="current.checkReport.attachments || []" border size="small" empty-text="暂无证据附件">
            <el-table-column prop="name" label="文件名" min-width="180" show-overflow-tooltip />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">{{ attachTypeName(row.type) }}</template>
            </el-table-column>
            <el-table-column prop="time" label="采集时间" width="150" />
            <el-table-column prop="location" label="采集位置" min-width="150" show-overflow-tooltip />
            <el-table-column prop="watermark" label="水印状态" min-width="150" />
          </el-table>
        </template>

        <!-- 整改情况（已审核/需复查/已结案展示） -->
        <template v-if="showRectifyBlock">
          <div class="sub-title">整改情况</div>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="整改责任人">{{ current.rectificationResponsiblePerson || current.rectifyNote?.unit || '待明确' }}</el-descriptions-item>
            <el-descriptions-item label="整改时限">{{ current.rectifyDeadline || '待制定' }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ current.rectifyNote?.time || '—' }}</el-descriptions-item>
            <el-descriptions-item label="整改措施" :span="3">{{ current.rectifyNote?.desc || '待制定' }}</el-descriptions-item>
            <el-descriptions-item label="完成情况" :span="3">{{ current.completionDescription || '待提交' }}</el-descriptions-item>
          </el-descriptions>
          <el-table
            v-if="(current.rectifyNote?.attachments || []).length"
            :data="current.rectifyNote.attachments" border size="small" class="mt-8"
          >
            <el-table-column prop="name" label="文件名" min-width="180" show-overflow-tooltip />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">{{ attachTypeName(row.type) }}</template>
            </el-table-column>
            <el-table-column prop="time" label="采集时间" width="150" />
            <el-table-column prop="location" label="采集位置" min-width="140" show-overflow-tooltip />
            <el-table-column prop="watermark" label="水印状态" min-width="140" />
          </el-table>
        </template>

        <!-- 结案信息（复核通过后生成） -->
        <el-descriptions v-if="current.closeNo" :column="1" border size="small" class="mt-12">
          <el-descriptions-item label="结案编号">
            <span class="close-no num">{{ current.closeNo }}</span>
            <el-tag size="small" type="success" effect="plain" class="ml-8">事件简报已生成</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 处置轨迹（新增节点自动带出） -->
        <div class="sub-title">处置轨迹</div>
        <FlowSteps :steps="current.trail || []" />
      </template>
    </el-dialog>

    <!-- 现场核查录入（checking → reported） -->
    <el-dialog v-model="checkVisible" title="现场核查录入" width="600px">
      <el-form ref="checkFormRef" :model="checkForm" :rules="checkRules" label-width="100px">
        <el-form-item label="核查结论" prop="conclusion">
          <el-select v-model="checkForm.conclusion" style="width: 100%">
            <el-option v-for="i in conclusionOptions" :key="i" :label="i" :value="i" />
          </el-select>
        </el-form-item>
        <el-form-item label="情况描述" prop="desc">
          <el-input v-model="checkForm.desc" type="textarea" :rows="3" placeholder="请描述现场情况（必填）" />
        </el-form-item>
        <el-form-item label="经度" prop="longitude">
          <el-input-number v-model="checkForm.longitude" :min="0" :max="180" :precision="6" :value-on-clear="null" style="width: 220px" />
        </el-form-item>
        <el-form-item label="纬度" prop="latitude">
          <el-input-number v-model="checkForm.latitude" :min="0" :max="90" :precision="6" :value-on-clear="null" style="width: 220px" />
        </el-form-item>
        <el-form-item label="核查人">
          <el-input v-model="checkForm.checker" placeholder="默认取核查责任人" />
        </el-form-item>
        <el-form-item label="现场证据">
          <el-button size="small" plain type="primary" @click="addCheckEvidence">添加模拟证据（演示）</el-button>
          <span class="demo-note ml-8">移动端采集将自动加水印，此处为模拟数据</span>
        </el-form-item>
        <el-table v-if="checkForm.attachments.length" :data="checkForm.attachments" border size="small" class="mb-8">
          <el-table-column prop="name" label="文件名" min-width="170" show-overflow-tooltip />
          <el-table-column label="类型" width="70">
            <template #default="{ row }">{{ attachTypeName(row.type) }}</template>
          </el-table-column>
          <el-table-column prop="watermark" label="水印状态" min-width="150" />
          <el-table-column label="操作" width="60">
            <template #default="{ $index }">
              <el-button link type="danger" size="small" @click="checkForm.attachments.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer>
        <el-button @click="checkVisible = false">取消</el-button>
        <el-button type="primary" :loading="checkSubmitting" @click="submitCheck">提交并上报</el-button>
      </template>
    </el-dialog>

    <!-- 整改提交（audited → recheck） -->
    <el-dialog v-model="rectifyVisible" title="提交整改" width="600px">
      <el-form ref="rectifyFormRef" :model="rectifyForm" :rules="rectifyRules" label-width="100px">
        <el-form-item label="整改责任人" prop="rectificationResponsiblePerson">
          <el-input v-model="rectifyForm.rectificationResponsiblePerson" placeholder="责任人/责任单位" />
        </el-form-item>
        <el-form-item label="整改时限" prop="rectifyDeadline">
          <el-date-picker v-model="rectifyForm.rectifyDeadline" type="date" value-format="YYYY-MM-DD" placeholder="选择整改时限" style="width: 220px" />
        </el-form-item>
        <el-form-item label="完成情况" prop="completionDescription">
          <el-input v-model="rectifyForm.completionDescription" type="textarea" :rows="3" placeholder="请描述整改完成情况（必填）" />
        </el-form-item>
        <el-form-item label="整改证据">
          <el-button size="small" plain type="primary" @click="addRectifyEvidence">添加模拟证据（演示，可省略）</el-button>
        </el-form-item>
        <el-table v-if="rectifyForm.attachments.length" :data="rectifyForm.attachments" border size="small" class="mb-8">
          <el-table-column prop="name" label="文件名" min-width="170" show-overflow-tooltip />
          <el-table-column label="类型" width="70">
            <template #default="{ row }">{{ attachTypeName(row.type) }}</template>
          </el-table-column>
          <el-table-column prop="watermark" label="水印状态" min-width="150" />
          <el-table-column label="操作" width="60">
            <template #default="{ $index }">
              <el-button link type="danger" size="small" @click="rectifyForm.attachments.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer>
        <el-button @click="rectifyVisible = false">取消</el-button>
        <el-button type="primary" :loading="rectifySubmitting" @click="submitRectifyForm">提交整改</el-button>
      </template>
    </el-dialog>

    <!-- 审核打回重核（reviewing → checking，意见必填） -->
    <el-dialog v-model="auditRejectVisible" title="打回重核" width="480px">
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

    <!-- 复核退回整改（recheck → audited，意见必填） -->
    <el-dialog v-model="closeRejectVisible" title="复核退回整改" width="480px">
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchEvents, submitCheckReport, submitRectify, auditEvent, closeEvent } from '@/api/fsr'
import { useUserStore } from '@/stores/user'
import { EVENT_STATUS, EVENT_STATUS_FLOW, EVENT_SOURCE_MAP } from '@/mock/common/dict'
import StatusTag from '@/components/common/StatusTag.vue'
import FlowSteps from '@/components/common/FlowSteps.vue'

const userStore = useUserStore()
const rows = ref([])
const tab = ref('checking')
const visible = ref(false)
const current = ref(null)

// 六环节页签（不含待派发；已结案只读展示）
const tabs = EVENT_STATUS_FLOW.filter((s) => s !== 'pending')
const groups = reactive(Object.fromEntries(tabs.map((s) => [s, []])))

const checkVisible = ref(false)
const rectifyVisible = ref(false)
const auditRejectVisible = ref(false)
const closeRejectVisible = ref(false)
const checkFormRef = ref(null)
const rectifyFormRef = ref(null)
const auditRejectFormRef = ref(null)
const closeRejectFormRef = ref(null)
const checkSubmitting = ref(false)
const rectifySubmitting = ref(false)
const auditRejectSubmitting = ref(false)
const closeRejectSubmitting = ref(false)
const auditPassLoadingId = ref('')
const closePassLoadingId = ref('')

const checkForm = reactive({ conclusion: '', desc: '', longitude: null, latitude: null, checker: '', attachments: [] })
const rectifyForm = reactive({ rectificationResponsiblePerson: '', rectifyDeadline: '', completionDescription: '', attachments: [] })
const auditRejectForm = reactive({ opinion: '' })
const closeRejectForm = reactive({ opinion: '' })

const conclusionOptions = ['属实', '部分属实', '不属实']
const sourceName = (s) => EVENT_SOURCE_MAP[s]?.name || '其他来源'
const attachTypeName = (t) => ({ photo: '照片', video: '视频' }[t] || t || '—')
// 核查报告定位展示：优先 gps 字段，兼容经纬度分字段
const reportGps = (cr) => cr?.gps || (cr?.longitude && cr?.latitude ? `${cr.longitude}, ${cr.latitude}` : '待采集')

// 表单校验：核查结论/描述/定位必填，经纬度由接口强校验
const checkRules = {
  conclusion: [{ required: true, message: '请选择核查结论', trigger: 'change' }],
  desc: [{ required: true, message: '请填写现场情况描述', trigger: 'blur' }],
  longitude: [{ required: true, message: '请填写经度', trigger: 'blur' }],
  latitude: [{ required: true, message: '请填写纬度', trigger: 'blur' }]
}
const rectifyRules = {
  rectificationResponsiblePerson: [{ required: true, message: '请填写整改责任人', trigger: 'blur' }],
  completionDescription: [{ required: true, message: '请填写整改完成情况描述', trigger: 'blur' }]
}
// 意见类输入：打回/退回必填，错误提示在输入框下方
const opinionRules = { opinion: [{ required: true, message: '请填写意见', trigger: 'blur' }] }

// 整改情况区块展示条件
const showRectifyBlock = computed(() =>
  current.value && (current.value.rectifyNote || ['audited', 'recheck', 'closed'].includes(current.value.status))
)

const load = async () => {
  rows.value = await fetchEvents(userStore.role, {})
  tabs.forEach((s) => { groups[s] = rows.value.filter((e) => e.status === s) })
}

// 操作后刷新列表，并同步详情弹窗数据
const refreshCurrent = async () => {
  await load()
  if (current.value) current.value = rows.value.find((x) => x.id === current.value.id) || null
}

const nowTextLocal = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 模拟证据（演示）：追加一条带水印元数据的附件记录
const addMockEvidence = (list, prefix, location) => {
  const n = list.length + 1
  const isVideo = n % 3 === 0
  list.push({
    name: `${prefix}_${String(n).padStart(2, '0')}.${isVideo ? 'mp4' : 'jpg'}`,
    type: isVideo ? 'video' : 'photo',
    time: nowTextLocal(),
    location: location || '现场采集',
    watermark: '已加水印（时间+位置）'
  })
}
const addCheckEvidence = () => addMockEvidence(checkForm.attachments, 'IMG_CHECK', checkForm.longitude && checkForm.latitude ? `${checkForm.longitude}, ${checkForm.latitude}` : '')
const addRectifyEvidence = () => addMockEvidence(rectifyForm.attachments, 'IMG_RECTIFY', '整改后现场')

const open = (r) => { current.value = r; visible.value = true }

// ===== 现场核查录入 =====
const openCheck = (r) => {
  current.value = r
  Object.assign(checkForm, { conclusion: '', desc: '', longitude: null, latitude: null, checker: r.checkResponsiblePerson || r.assignee || '', attachments: [] })
  checkVisible.value = true
}
const submitCheck = async () => {
  try {
    await checkFormRef.value.validate()
  } catch {
    return // 校验失败，错误提示已显示在输入框下方
  }
  checkSubmitting.value = true
  try {
    const payload = {
      conclusion: checkForm.conclusion,
      desc: checkForm.desc,
      longitude: checkForm.longitude,
      latitude: checkForm.latitude,
      gps: `${checkForm.longitude}, ${checkForm.latitude}`,
      checker: checkForm.checker,
      attachments: checkForm.attachments
    }
    const r = await submitCheckReport(current.value.id, payload)
    if (!r?.success) return ElMessage.error(r?.message || '上报失败')
    ElMessage.success('核查上报成功，待市级接单')
    checkVisible.value = false
    load()
  } finally {
    checkSubmitting.value = false
  }
}

// ===== 审核（reviewing）：通过 / 打回重核 =====
const auditPass = async (row) => {
  try {
    await ElMessageBox.confirm('确认审核通过？通过后事件转入整改环节。', '审核通过', { type: 'warning', confirmButtonText: '确认通过', cancelButtonText: '取消' })
  } catch {
    return
  }
  auditPassLoadingId.value = row.id
  try {
    const r = await auditEvent(row.id, 'pass', '核查材料完整，事实清楚，请责任单位限期整改', userStore.role?.name || '审核人')
    if (!r?.success) return ElMessage.error(r?.message || '审核失败')
    ElMessage.success('审核通过，事件转入整改')
    load()
  } finally {
    auditPassLoadingId.value = ''
  }
}
const openAuditReject = (r) => {
  current.value = r
  auditRejectForm.opinion = ''
  auditRejectVisible.value = true
}
const submitAuditReject = async () => {
  try {
    await auditRejectFormRef.value.validate()
  } catch {
    return
  }
  auditRejectSubmitting.value = true
  try {
    const r = await auditEvent(current.value.id, 'reject', auditRejectForm.opinion, userStore.role?.name || '审核人')
    if (!r?.success) return ElMessage.error(r?.message || '打回失败')
    ElMessage.success('已打回重核，事件退回待核查')
    auditRejectVisible.value = false
    load()
  } finally {
    auditRejectSubmitting.value = false
  }
}

// ===== 整改提交（audited → recheck） =====
const openRectify = (r) => {
  current.value = r
  Object.assign(rectifyForm, {
    rectificationResponsiblePerson: r.rectificationResponsiblePerson || r.rectifyNote?.unit || r.assignee || '',
    rectifyDeadline: r.rectifyDeadline || '',
    completionDescription: '',
    attachments: []
  })
  rectifyVisible.value = true
}
const submitRectifyForm = async () => {
  try {
    await rectifyFormRef.value.validate()
  } catch {
    return
  }
  rectifySubmitting.value = true
  try {
    const r = await submitRectify(current.value.id, {
      rectificationResponsiblePerson: rectifyForm.rectificationResponsiblePerson,
      rectifyDeadline: rectifyForm.rectifyDeadline,
      completionDescription: rectifyForm.completionDescription,
      attachments: rectifyForm.attachments
    })
    if (!r?.success) return ElMessage.error(r?.message || '提交失败')
    ElMessage.success('整改已提交，申请复核')
    rectifyVisible.value = false
    load()
  } finally {
    rectifySubmitting.value = false
  }
}

// ===== 复核结案（recheck）：通过（生成结案编号与简报）/ 退回整改 =====
const closePass = async (row) => {
  try {
    await ElMessageBox.confirm('确认复核通过并结案？通过后将生成结案编号与事件简报。', '复核通过', { type: 'success', confirmButtonText: '确认结案', cancelButtonText: '取消' })
  } catch {
    return
  }
  closePassLoadingId.value = row.id
  try {
    const r = await closeEvent(row.id, 'pass', '', userStore.role?.name || '复核人')
    if (!r?.success) return ElMessage.error(r?.message || '复核失败')
    // 成功后展示接口返回的结案编号 closeNo
    ElMessage.success({ message: `复核通过，结案编号：${r.closeNo}，事件简报已生成`, duration: 6000 })
    load()
  } finally {
    closePassLoadingId.value = ''
  }
}
const openCloseReject = (r) => {
  current.value = r
  closeRejectForm.opinion = ''
  closeRejectVisible.value = true
}
const submitCloseReject = async () => {
  try {
    await closeRejectFormRef.value.validate()
  } catch {
    return
  }
  closeRejectSubmitting.value = true
  try {
    const r = await closeEvent(current.value.id, 'reject', closeRejectForm.opinion, userStore.role?.name || '复核人')
    if (!r?.success) return ElMessage.error(r?.message || '退回失败')
    ElMessage.success('复核不通过，已退回整改')
    closeRejectVisible.value = false
    load()
  } finally {
    closeRejectSubmitting.value = false
  }
}

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
.tab-count {
  display: inline-block; margin-left: 4px; padding: 0 6px; min-width: 18px; text-align: center;
  font-size: 12px; line-height: 18px; border-radius: 9px;
  background: #e8f3ff; color: var(--ah-primary);
}
.sub-title {
  font-size: 14px; font-weight: 600; color: var(--ah-text);
  margin: 16px 0 10px; padding-left: 8px; border-left: 3px solid var(--ah-primary);
}
.close-no { font-weight: 600; color: var(--ah-primary); font-size: 15px; }
.demo-note { color: var(--ah-text-secondary); font-size: 12px; }
.mb-8 { margin-bottom: 8px; }
.mt-8 { margin-top: 8px; }
.mt-12 { margin-top: 12px; }
.ml-8 { margin-left: 8px; }
</style>
