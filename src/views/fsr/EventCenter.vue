<template>
  <div class="page-container fsr-page">
    <div class="page-head">
      <div>
        <h2>变化图斑库</h2>
        <p>统一管理变化图斑、风险判定与处置计划。</p>
      </div>
      <el-button type="primary" @click="load">刷新图斑</el-button>
    </div>

    <div class="panel">
      <div class="panel-title">变化图斑列表<span class="panel-tip">（待派发事件请前往"任务流程库"下发；研判结论为不属实/重复的线索归档于"已终结"页签）</span></div>
      <!-- 页签：待研判 + 六个处置态（不含待派发）+ 已终结（用户确认 2026-11-12） -->
      <el-tabs v-model="tab">
        <el-tab-pane v-for="s in tabsList" :key="s" :name="s">
          <template #label>
            {{ EVENT_STATUS[s]?.name }}<span class="tab-count num">{{ groups[s]?.length || 0 }}</span>
          </template>
          <el-form inline class="filter-bar">
            <el-form-item label="问题类型">
              <el-select v-model="filters.type" clearable style="width: 130px">
                <el-option v-for="i in typeOptions" :key="i.value" v-bind="i" />
              </el-select>
            </el-form-item>
            <el-form-item label="来源">
              <el-select v-model="filters.source" clearable style="width: 130px">
                <el-option v-for="i in sourceOptions" :key="i.value" v-bind="i" />
              </el-select>
            </el-form-item>
          </el-form>
          <el-table :data="groups[s]" stripe border>
            <el-table-column type="index" label="序号" width="55" />
            <el-table-column prop="code" label="图斑编号" width="150" />
            <el-table-column prop="foundTime" label="记录时间" width="110" />
            <el-table-column prop="regionName" label="所在位置" min-width="145" />
            <el-table-column label="疑似问题类型" width="120">
              <template #default="{ row }">{{ typeName(row.type) }}</template>
            </el-table-column>
            <el-table-column label="图斑面积" width="95">
              <template #default="{ row }">{{ row.spot?.areaMu || 0 }}亩</template>
            </el-table-column>
            <el-table-column label="风险等级" width="105">
              <template #default="{ row }"><el-tag v-if="row.status === 'to_review'" size="small" type="info">待研判评定</el-tag><StatusTag v-else :dict="RISK_MAP" :value="row.riskFinal" /></template>
            </el-table-column>
            <el-table-column label="风险判定依据" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.riskBasis }}</template>
            </el-table-column>
            <el-table-column label="关联地块" width="130">
              <template #default="{ row }">{{ row.spot?.plotId || '待关联' }}</template>
            </el-table-column>
            <el-table-column prop="subjectName" label="关联主体" min-width="150" />
            <el-table-column label="计划落实" min-width="150">
              <template #default="{ row }">{{ row.dispatchRequirement || '待制定' }}</template>
            </el-table-column>
            <el-table-column label="图斑状态" width="140">
              <template #default="{ row }"><StatusTag :dict="EVENT_STATUS" :value="row.status" /></template>
            </el-table-column>
            <el-table-column label="数据来源" width="115">
              <template #default="{ row }">{{ sourceName(row.source) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="open(row)">详情</el-button>
                <el-button v-if="canReview(row)" link type="warning" @click="openReview(row)">研判</el-button>
                <el-button v-if="row.status === 'pending'" link type="success" @click="dispatch(row)">派发</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 详情抽屉：基础信息 + 来源记录 + 风险修正 + 核查报告 + 处置轨迹 -->
    <el-drawer v-model="visible" :title="(current?.code || '') + ' 变化图斑详情'" size="760px">
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="图斑编号">{{ current.code }}</el-descriptions-item>
          <el-descriptions-item label="记录时间">{{ current.foundTime }}</el-descriptions-item>
          <el-descriptions-item label="问题类型">{{ typeName(current.type) }}</el-descriptions-item>
          <el-descriptions-item label="所在位置">{{ current.regionName }}</el-descriptions-item>
          <el-descriptions-item label="变化前面积">{{ current.spot?.beforeAreaMu || current.spot?.areaMu || 0 }}亩</el-descriptions-item>
          <el-descriptions-item label="变化后面积">{{ current.spot?.afterAreaMu || current.spot?.areaMu || 0 }}亩</el-descriptions-item>
          <el-descriptions-item label="变化率">{{ current.spot?.changeRate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="中心经纬度">{{ current.spot?.center?.join?.(', ') || '待采集' }}</el-descriptions-item>
          <el-descriptions-item label="关联主体">{{ current.subjectName }}</el-descriptions-item>
          <el-descriptions-item label="数据来源">{{ sourceName(current.source) }}</el-descriptions-item>
          <el-descriptions-item label="风险判定依据" :span="2">{{ current.riskBasis }}</el-descriptions-item>
          <el-descriptions-item label="问题描述" :span="2">{{ current.desc }}</el-descriptions-item>
        </el-descriptions>

        <!-- 区块一：来源记录（接口接入台账） -->
        <div class="sub-title">来源记录</div>
        <el-alert
          v-if="(current.sources?.length || 0) > 1"
          type="warning" :closable="false" show-icon
          title="存在多来源线索，已按去重规则合并关联（演示）"
          class="mb-8"
        />
        <template v-if="current.sources?.length">
          <div v-for="(s, i) in current.sources" :key="i" class="source-card">
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="来源类型">{{ s.sourceType || '—' }}</el-descriptions-item>
              <el-descriptions-item label="来源系统">{{ s.sourceSystem || '—' }}</el-descriptions-item>
              <el-descriptions-item label="接入批次号">{{ s.accessBatchNo || '—' }}</el-descriptions-item>
              <el-descriptions-item label="来源流水号">{{ s.serialNo || '—' }}</el-descriptions-item>
              <el-descriptions-item label="回执状态">{{ s.receiptStatus || '—' }}</el-descriptions-item>
              <el-descriptions-item label="回执编号">{{ s.receiptNo || '—' }}</el-descriptions-item>
              <el-descriptions-item label="原始证据" :span="3">
                <template v-if="(s.originalEvidence || []).length">
                  <el-tag v-for="(evName, j) in s.originalEvidence" :key="j" size="small" type="info" effect="plain" class="evidence-tag">{{ evName }}</el-tag>
                </template>
                <span v-else class="text-secondary">—</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </template>
        <div v-else class="empty-line">无接口来源记录</div>

        <!-- 区块二：风险判定与修正（省级可用，演示规则待业务确认） -->
        <div class="sub-title">风险判定与修正</div>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="风险自动等级">
            <StatusTag :dict="RISK_MAP" :value="current.riskAuto" />
          </el-descriptions-item>
          <el-descriptions-item label="风险最终等级">
            <StatusTag :dict="RISK_MAP" :value="current.riskFinal" />
          </el-descriptions-item>
          <el-descriptions-item label="调整原因">
            {{ current.riskAdjustReason || '未人工调整' }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="risk-foot">
          <span class="demo-note">演示风险规则，待业务确认</span>
          <el-button
            v-if="canAdjust" type="primary" plain size="small"
            @click="openAdjust"
          >修正风险</el-button>
        </div>

        <!-- 区块三：核查报告（证据附件以元数据表格展示） -->
        <template v-if="current.checkReport">
          <div class="sub-title">核查报告</div>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="核查结论">{{ current.checkReport.conclusion || '—' }}</el-descriptions-item>
            <el-descriptions-item label="核查人">{{ current.checkReport.checker || '—' }}</el-descriptions-item>
            <el-descriptions-item label="核查时间">{{ current.checkReport.time || current.checkReport.checkedAt || '—' }}</el-descriptions-item>
            <el-descriptions-item label="GPS定位" :span="2">{{ reportGps(current.checkReport) }}</el-descriptions-item>
            <el-descriptions-item label="上传状态">{{ current.checkReport.uploadStatus || '已上传' }}</el-descriptions-item>
            <el-descriptions-item label="情况描述" :span="3">{{ current.checkReport.desc || '—' }}</el-descriptions-item>
          </el-descriptions>
          <el-table :data="current.checkReport.attachments || []" border size="small" class="mt-8" empty-text="暂无证据附件">
            <el-table-column prop="name" label="文件名" min-width="180" show-overflow-tooltip />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">{{ attachTypeName(row.type) }}</template>
            </el-table-column>
            <el-table-column prop="time" label="采集时间" width="150" />
            <el-table-column prop="location" label="采集位置" min-width="150" show-overflow-tooltip />
            <el-table-column prop="watermark" label="水印状态" min-width="150" />
          </el-table>
        </template>

        <!-- 处置轨迹（新增节点自动带出） -->
        <div class="sub-title">处置轨迹</div>
        <FlowSteps :steps="current.trail || []" />
      </template>
    </el-drawer>

    <!-- 省级研判（to_review → pending / dismissed） -->
    <el-dialog v-model="reviewVisible" title="线索研判" width="540px">
      <el-alert type="info" :closable="false" style="margin-bottom: 12px"
        title="研判规则：省级判定线索是否转入核查（可研 5.5.3.3.3.1 事件研判环节）。卫星图斑经内业核验导入即视为完成技术研判，无需此步。" />
      <el-form ref="reviewFormRef" :model="reviewForm" label-width="90px">
        <el-form-item label="线索编号"><span class="num">{{ current?.code }}</span></el-form-item>
        <el-form-item label="研判结论">
          <el-radio-group v-model="reviewForm.action">
            <el-radio value="pass">转入核查（生成待派发事件）</el-radio>
            <el-radio value="dismiss">不转入（不属实/重复，终结归档）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="reviewForm.action === 'pass'" label="风险等级" required>
          <el-radio-group v-model="reviewForm.risk">
            <el-radio v-for="i in riskOptions" :key="i.value" :value="i.value">{{ i.label }}</el-radio>
          </el-radio-group>
          <div class="form-hint">系统建议等级：{{ RISK_MAP[current?.riskAuto]?.name || '中风险' }}（依据：{{ current?.riskBasis || '演示规则，待业务确认' }}），研判人可调整</div>
        </el-form-item>
        <el-form-item :label="reviewForm.action === 'pass' ? '研判意见' : '终结原因'" required>
          <el-input v-model="reviewForm.reason" type="textarea" :rows="3" :placeholder="reviewForm.action === 'pass' ? '请填写研判依据（如多源比对、备案核查情况）' : '请填写不属实/重复的判定依据（重复线索请说明合并关联的事件编号）'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewLoading" @click="submitReview">确认研判</el-button>
      </template>
    </el-dialog>

    <!-- 派发核查任务 -->
    <el-dialog v-model="dispatchVisible" title="派发核查任务" width="520px">
      <el-form label-width="90px">
        <el-form-item label="核查责任人"><el-input v-model="dispatchForm.assignee" /></el-form-item>
        <el-form-item label="核查时限"><el-input-number v-model="dispatchForm.deadlineDays" :min="1" :max="60" /></el-form-item>
        <el-form-item label="计划落实"><el-input v-model="dispatchForm.requirement" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchVisible = false">取消</el-button>
        <el-button type="primary" :loading="dispatchLoading" @click="submitDispatch">确认派发</el-button>
      </template>
    </el-dialog>

    <!-- 风险等级修正（省级角色） -->
    <el-dialog v-model="adjustVisible" title="修正风险等级" width="480px">
      <el-alert type="warning" :closable="false" show-icon title="演示风险规则，待业务确认" class="mb-8" />
      <el-form ref="adjustFormRef" :model="adjustForm" :rules="adjustRules" label-width="90px">
        <el-form-item label="新风险等级" prop="risk">
          <el-select v-model="adjustForm.risk" style="width: 100%">
            <el-option v-for="i in riskOptions" :key="i.value" v-bind="i" />
          </el-select>
        </el-form-item>
        <el-form-item label="修正原因" prop="reason">
          <el-input v-model="adjustForm.reason" type="textarea" :rows="3" placeholder="请填写修正原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjustLoading" @click="submitAdjust">确认修正</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchEvents, dispatchTask, adjustRisk, reviewEvent } from '@/api/fsr'
import { useUserStore } from '@/stores/user'
import { EVENT_STATUS, EVENT_STATUS_FLOW, EVENT_TYPE_MAP, EVENT_SOURCE_MAP, RISK_MAP } from '@/mock/common/dict'
import StatusTag from '@/components/common/StatusTag.vue'
import FlowSteps from '@/components/common/FlowSteps.vue'

const userStore = useUserStore()
const allRows = ref([])
const visible = ref(false)
const dispatchVisible = ref(false)
const adjustVisible = ref(false)
const current = ref(null)
const tab = ref('to_review')
const filters = reactive({ type: '', source: '' })
const dispatchForm = reactive({ assignee: '', deadlineDays: 7, requirement: '' })
const adjustForm = reactive({ risk: '', reason: '' })
const dispatchLoading = ref(false)
const adjustLoading = ref(false)
const adjustFormRef = ref(null)
// 研判（省级）：转事件（定风险等级）或终结（不属实/重复）
const reviewVisible = ref(false)
const reviewLoading = ref(false)
const reviewForm = reactive({ action: 'pass', risk: '', reason: '' })
const reviewFormRef = ref(null)

// 字典选项（类型/来源/风险均取字典，不写死）
const typeOptions = Object.entries(EVENT_TYPE_MAP).map(([value, v]) => ({ label: v.name, value }))
const sourceOptions = Object.entries(EVENT_SOURCE_MAP).map(([value, v]) => ({ label: v.name, value }))
const riskOptions = Object.entries(RISK_MAP).map(([value, v]) => ({ label: v.name, value }))

const typeName = (t) => EVENT_TYPE_MAP[t]?.name || '其他问题'
const sourceName = (s) => EVENT_SOURCE_MAP[s]?.name || '其他来源'
const attachTypeName = (t) => ({ photo: '照片', video: '视频' }[t] || t || '—')
// 核查报告定位展示：优先 gps 字段，兼容经纬度分字段
const reportGps = (cr) => cr?.gps || (cr?.longitude && cr?.latitude ? `${cr.longitude}, ${cr.latitude}` : '—')

// 风险修正弹窗校验：等级必选、原因必填（错误提示在输入框下方）
const adjustRules = {
  risk: [{ required: true, message: '请选择新风险等级', trigger: 'change' }],
  reason: [{ required: true, message: '请填写修正原因', trigger: 'blur' }]
}

// 演示风险规则：按面积/问题类型/区县关键字自动判定（口径待业务确认）
const assess = (e) => {
  const area = Number(e.spot?.areaMu || 0)
  const basic = e.desc?.includes('永久基本农田') || e.type === 'feilianghua' || e.regionName?.includes('重点') || e.regionName?.includes('基本农田')
  const risk = basic || area >= 400 || e.type === 'baomai' ? 'high' : area >= 200 || e.type === 'zhangshi' ? 'medium' : 'low'
  return { risk, basis: `图斑面积${area}亩；${basic ? '涉及永久基本农田或重点问题；' : '未识别永久基本农田；'}问题类型为${typeName(e.type)}` }
}

// 补齐风险字段（mock 已带 riskAuto/riskFinal 时以 mock 为准）
const withRisk = (e) => {
  const a = assess(e)
  return { ...e, riskAuto: e.riskAuto || a.risk, riskFinal: e.riskFinal || e.risk || a.risk, riskBasis: e.riskBasis || a.basis }
}

// 按类型/来源过滤并补齐风险字段
const baseRows = computed(() =>
  allRows.value
    .filter((e) => (!filters.type || e.type === filters.type) && (!filters.source || e.source === filters.source))
    .map(withRisk)
)

// 页签：待研判 + 处置态（不含待派发，任务库呈现）+ 已终结（用户确认 2026-11-12）
const tabsList = ['to_review', ...EVENT_STATUS_FLOW.filter((s) => s !== 'pending'), 'dismissed']

// 状态分组（页签数量，覆盖全部状态）
const groups = computed(() => {
  const g = Object.fromEntries(tabsList.map((s) => [s, []]))
  baseRows.value.forEach((e) => { if (g[e.status]) g[e.status].push(e) })
  return g
})

// 研判仅省级（用户确认 2026-11-12）
const canReview = (row) => userStore.role?.code === 'province' && row.status === 'to_review'
const openReview = (r) => {
  current.value = r
  reviewForm.action = 'pass'
  reviewForm.risk = r.riskAuto || 'medium'
  reviewForm.reason = ''
  reviewVisible.value = true
}
const submitReview = async () => {
  if (!reviewForm.reason.trim()) return ElMessage.warning('请填写研判原因')
  if (reviewForm.action === 'pass' && !reviewForm.risk) return ElMessage.warning('转事件必须确定风险等级')
  reviewLoading.value = true
  try {
    const r = await reviewEvent(current.value.id, reviewForm.action, { ...reviewForm, reviewer: userStore.role })
    if (!r.success) return ElMessage.error(r.message || '研判失败')
    ElMessage.success(reviewForm.action === 'pass' ? '研判通过，已转入任务流程库待派发' : '研判终结，线索已归档')
    reviewVisible.value = false
    visible.value = false
    load()
  } finally {
    reviewLoading.value = false
  }
}

// 省级角色且未结案可修正风险
const canAdjust = computed(() => userStore.role?.code === 'province' && current.value && current.value.status !== 'closed')

const load = async () => { allRows.value = await fetchEvents(userStore.role, {}) }

// 操作后刷新列表，并同步详情抽屉数据
const refreshCurrent = async () => {
  await load()
  if (current.value) current.value = baseRows.value.find((x) => x.id === current.value.id) || null
}

const open = (r) => { current.value = r; visible.value = true }

// 派发核查任务（pending → checking）
const dispatch = (r) => { current.value = r; dispatchForm.assignee = r.assignee || ''; dispatchVisible.value = true }
const submitDispatch = async () => {
  if (!dispatchForm.assignee.trim()) return ElMessage.warning('请填写核查责任人')
  dispatchLoading.value = true
  try {
    const r = await dispatchTask(current.value.id, dispatchForm)
    if (!r.success) return ElMessage.error(r.message || '派发失败')
    ElMessage.success('任务已派发')
    dispatchVisible.value = false
    visible.value = false
    load()
  } finally {
    dispatchLoading.value = false
  }
}

// 风险等级修正：选新等级 + 必填原因
const openAdjust = () => {
  adjustForm.risk = current.value.riskFinal || ''
  adjustForm.reason = ''
  adjustVisible.value = true
}
const submitAdjust = async () => {
  try {
    await adjustFormRef.value.validate()
  } catch {
    return // 校验失败，错误提示已显示在输入框下方
  }
  adjustLoading.value = true
  try {
    const r = await adjustRisk(current.value.id, adjustForm.risk, adjustForm.reason)
    if (!r.success) return ElMessage.error(r.message || '修正失败')
    ElMessage.success('风险等级已修正')
    adjustVisible.value = false
    refreshCurrent()
  } finally {
    adjustLoading.value = false
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
  background: var(--ah-primary-light, #e8f3ff); color: var(--ah-primary);
}
.filter-bar { margin-bottom: 4px; }
.sub-title {
  font-size: 14px; font-weight: 600; color: var(--ah-text);
  margin: 16px 0 10px; padding-left: 8px; border-left: 3px solid var(--ah-primary);
}
.source-card { margin-bottom: 8px; }
.evidence-tag { margin: 0 6px 4px 0; }
.empty-line { color: var(--ah-text-secondary); font-size: 13px; padding: 8px 0 2px; }
.risk-foot {
  display: flex; align-items: center; justify-content: space-between; margin-top: 8px;
}
.demo-note { color: var(--ah-text-secondary); font-size: 12px; }
.mb-8 { margin-bottom: 8px; }
.mt-8 { margin-top: 8px; }
.text-secondary { color: var(--ah-text-secondary); }
</style>
