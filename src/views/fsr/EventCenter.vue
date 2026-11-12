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
      <div class="panel-title">变化图斑列表<span class="panel-tip">（待研判线索在本页"研判"处理，通过后转入"任务流程库"待派发；不属实/重复的归档于"已终结"页签；核查审核等处置操作统一在"任务流程库"对应页签进行）</span></div>
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
                <!-- 处置操作跳转指引（用户反馈 2026-11-12：市级/省级找不到审核入口）：本库为展示库，操作在对应工作台 -->
                <el-button v-if="row.status === 'reported' && canOperate" link type="success" @click="go(row, 'task', 'reported')">去接单</el-button>
                <el-button v-if="row.status === 'reviewing' && canOperate" link type="success" @click="go(row, 'task', 'reviewing')">去审核</el-button>
                <el-button v-if="row.status === 'recheck' && canOperate" link type="warning" @click="go(row, 'task', 'recheck')">去复核</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 详情抽屉：统一任务详情（TaskDetailContent：事件/来源/举报证据/派发/核查/整改复核/全环节轨迹，与其他库一致） -->
    <TaskDetailDrawer :visible="visible" :event="current" @close="visible = false" />

    <!-- 省级研判（to_review → pending / dismissed；随手拍归属地块确认与风险修正统一在研判弹窗，用户确认 2026-11-12） -->
    <!-- 研判弹窗内嵌完整任务详情（用户硬性要求：每一步都能查看之前的详情和进度，2026-11-12） -->
    <el-dialog v-model="reviewVisible" title="线索研判" width="720px" class="op-dialog">
      <template v-if="current">
        <TaskDetailContent :event="current" />
        <el-divider />
        <el-alert type="info" :closable="false" style="margin-bottom: 12px"
          title="研判规则：省级判定线索是否转入核查（可研 5.5.3.3.3.1 事件研判环节）。卫星图斑经内业核验导入即视为完成技术研判，无需此步。" />
        <el-form ref="reviewFormRef" :model="reviewForm" label-width="90px">
        <!-- 研判结论：仅待研判线索显示 -->
        <el-form-item v-if="current?.status === 'to_review'" label="研判结论">
          <el-radio-group v-model="reviewForm.action">
            <el-radio value="pass">转入核查（生成待派发事件）</el-radio>
            <el-radio value="dismiss">不转入（不属实/重复，终结归档）</el-radio>
          </el-radio-group>
        </el-form-item>
        <!-- 转核查定级 -->
        <el-form-item v-if="current?.status === 'to_review' && reviewForm.action === 'pass'" label="风险等级" required>
          <el-radio-group v-model="reviewForm.risk">
            <el-radio v-for="i in riskOptions" :key="i.value" :value="i.value">{{ i.label }}</el-radio>
          </el-radio-group>
          <div class="form-hint">系统建议等级：{{ RISK_MAP[current?.riskAuto]?.name || '中风险' }}（依据：{{ current?.riskBasis || '演示规则，待业务确认' }}），研判人可调整</div>
        </el-form-item>
        <!-- 归属地块确认：随手拍线索未关联地块时（公众以拍照定位坐标落图，地块套合由省级研判） -->
        <el-form-item v-if="current?.source === 'snapshot' && !current?.spot?.plotId" label="归属地块">
          <el-select v-model="reviewForm.assignPlotId" clearable filterable placeholder="按拍照定位坐标套合选择本地块（可留空）" style="width: 100%">
            <el-option v-for="p in countyPlots" :key="p.id" :label="`${p.name}（${p.areaMu}亩）`" :value="p.id" />
          </el-select>
          <div class="form-hint">线索以拍照定位坐标（{{ current?.spot?.center?.join?.(', ') || '定位待采集' }}）落图；确认后中心取地块中心</div>
        </el-form-item>
        <!-- 风险修正：非待研判（已定级）事件可在此调整；待研判转核查用上方"风险等级" -->
        <template v-if="current?.status !== 'to_review' && current?.status !== 'dismissed'">
          <el-form-item label="风险修正">
            <el-select v-model="reviewForm.adjustRisk" clearable placeholder="不调整（选填）" style="width: 100%">
              <el-option v-for="i in riskOptions" :key="i.value" v-bind="i" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="reviewForm.adjustRisk" label="修正原因">
            <el-input v-model="reviewForm.adjustReason" type="textarea" :rows="2" placeholder="请填写修正原因" />
          </el-form-item>
        </template>
        <el-form-item v-if="current?.status === 'to_review' || reviewForm.adjustRisk" :label="current?.status === 'to_review' ? (reviewForm.action === 'pass' ? '研判意见' : '终结原因') : '修正原因'">
          <el-input v-model="reviewForm.reason" type="textarea" :rows="3" :placeholder="current?.status === 'to_review' ? (reviewForm.action === 'pass' ? '请填写研判依据（如多源比对、备案核查情况）' : '请填写不属实/重复的判定依据（重复线索请说明合并关联的事件编号）') : '请填写修正原因'" />
        </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewLoading" @click="submitReview">确认研判</el-button>
      </template>
    </el-dialog>

    <!-- 派发核查任务（内嵌完整任务详情：派发前可查看事件背景与进度，用户硬性要求 2026-11-12） -->
    <el-dialog v-model="dispatchVisible" title="派发核查任务" width="720px" class="op-dialog">
      <template v-if="current">
        <TaskDetailContent :event="current" />
        <el-divider />
        <el-form label-width="90px">
        <el-form-item label="核查责任人"><el-input v-model="dispatchForm.assignee" /></el-form-item>
        <el-form-item label="核查时限"><el-input-number v-model="dispatchForm.deadlineDays" :min="1" :max="60" /></el-form-item>
        <el-form-item label="计划落实"><el-input v-model="dispatchForm.requirement" type="textarea" /></el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="dispatchVisible = false">取消</el-button>
        <el-button type="primary" :loading="dispatchLoading" @click="submitDispatch">确认派发</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchEvents, dispatchTask, adjustRisk, reviewEvent, assignSnapshotPlot } from '@/api/fsr'
import { PLOTS } from '@/mock/geo/plot-gen'
import { useUserStore } from '@/stores/user'
import { EVENT_STATUS, EVENT_STATUS_FLOW, EVENT_TYPE_MAP, EVENT_SOURCE_MAP, RISK_MAP } from '@/mock/common/dict'
import StatusTag from '@/components/common/StatusTag.vue'
import TaskDetailDrawer from './TaskDetailDrawer.vue'
import TaskDetailContent from './TaskDetailContent.vue'

const userStore = useUserStore()
const allRows = ref([])
const visible = ref(false)
const dispatchVisible = ref(false)
const current = ref(null)
const tab = ref('to_review')
const filters = reactive({ type: '', source: '' })
const dispatchForm = reactive({ assignee: '', deadlineDays: 7, requirement: '' })
const dispatchLoading = ref(false)
// 研判（省级）：转事件（定风险等级）或终结（不属实/重复）；归属地块确认与风险修正统一在研判弹窗（用户确认 2026-11-12）
const reviewVisible = ref(false)
const reviewLoading = ref(false)
const reviewForm = reactive({ action: 'pass', risk: '', reason: '', assignPlotId: '', adjustRisk: '', adjustReason: '' })
const reviewFormRef = ref(null)

// 字典选项（类型/来源/风险均取字典，不写死）
const typeOptions = Object.entries(EVENT_TYPE_MAP).map(([value, v]) => ({ label: v.name, value }))
const sourceOptions = Object.entries(EVENT_SOURCE_MAP).map(([value, v]) => ({ label: v.name, value }))
const riskOptions = Object.entries(RISK_MAP).map(([value, v]) => ({ label: v.name, value }))

const typeName = (t) => EVENT_TYPE_MAP[t]?.name || '其他问题'
const sourceName = (s) => EVENT_SOURCE_MAP[s]?.name || '其他来源'

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

// 研判仅省级（用户确认 2026-11-12）；入口扩展：待研判线索、或随手拍未关联地块线索（归属地块确认统一在研判弹窗）
const canReview = (row) => userStore.role?.code === 'province' && (row.status === 'to_review' || (row.source === 'snapshot' && !row.spot?.plotId))
const openReview = (r) => {
  current.value = r
  reviewForm.action = 'pass'
  reviewForm.risk = r.riskAuto || 'medium'
  reviewForm.reason = ''
  reviewForm.assignPlotId = ''
  reviewForm.adjustRisk = ''
  reviewForm.adjustReason = ''
  reviewVisible.value = true
}
// 研判提交（三段合一）：归属地块确认 → 风险修正（非待研判）→ 研判结论（待研判）
const submitReview = async () => {
  if (current.value.status === 'to_review') {
    if (!reviewForm.reason.trim()) return ElMessage.warning('请填写研判原因')
    if (reviewForm.action === 'pass' && !reviewForm.risk) return ElMessage.warning('转事件必须确定风险等级')
  }
  if (reviewForm.adjustRisk && !reviewForm.adjustReason.trim()) return ElMessage.warning('请填写风险修正原因')
  reviewLoading.value = true
  try {
    // ① 归属地块确认（随手拍未关联地块）
    if (reviewForm.assignPlotId) {
      const a = await assignSnapshotPlot(current.value.id, reviewForm.assignPlotId, userStore.role)
      if (!a.success) return ElMessage.error(a.message || '归属地块确认失败')
    }
    // ② 风险修正（非待研判事件，选填）
    if (reviewForm.adjustRisk) {
      const a = await adjustRisk(current.value.id, reviewForm.adjustRisk, reviewForm.adjustReason)
      if (!a.success) return ElMessage.error(a.message || '风险修正失败')
    }
    // ③ 研判结论（待研判线索）
    if (current.value.status === 'to_review') {
      const r = await reviewEvent(current.value.id, reviewForm.action, { ...reviewForm, reviewer: userStore.role })
      if (!r.success) return ElMessage.error(r.message || '研判失败')
      ElMessage.success(reviewForm.action === 'pass' ? '研判通过，已转入任务流程库待派发' : '研判终结，线索已归档')
    } else {
      ElMessage.success(reviewForm.assignPlotId ? '已确认归属地块' : '风险等级已修正')
    }
    reviewVisible.value = false
    visible.value = false
    load()
  } finally {
    reviewLoading.value = false
  }
}

// 归属地块候选（用户确认 2026-11-12：归属地块确认在研判弹窗内进行，详情只展示）：地块按事件所在区县过滤
const countyPlots = computed(() => PLOTS.filter((p) => String(p.regionCode || '').startsWith(String(current.value?.regionCode || '').slice(0, 6))))

const load = async () => { allRows.value = await fetchEvents(userStore.role, {}) }

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

onMounted(load)

// 处置操作跳转：接单/审核/复核统一指向任务流程库对应页签（核查整改库已合并，用户确认 2026-11-12）
import { useRouter } from 'vue-router'
const router = useRouter()
const canOperate = computed(() => ['city', 'province'].includes(userStore.role?.code))
const go = (row, page, tab) => router.push({ path: `/fsr/${page}`, query: { tab, code: row.code } })
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
/* 操作弹窗内嵌完整详情（用户硬性要求 2026-11-12）：弹窗内容超高滚动 */
:deep(.op-dialog .el-dialog__body) { max-height: 68vh; overflow-y: auto; }
.evidence-tag { margin: 0 6px 4px 0; }
.empty-line { color: var(--ah-text-secondary); font-size: 13px; padding: 8px 0 2px; }
.assign-plot{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.risk-foot {
  display: flex; align-items: center; justify-content: space-between; margin-top: 8px;
}
.demo-note { color: var(--ah-text-secondary); font-size: 12px; }
.mb-8 { margin-bottom: 8px; }
.mt-8 { margin-top: 8px; }
.text-secondary { color: var(--ah-text-secondary); }
</style>
