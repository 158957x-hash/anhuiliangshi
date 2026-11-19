<template>
  <div class="mobile-page">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>乡镇计划管理</b><span>{{ isTown ? '任务分解与计划上报' : '审核乡镇上报计划' }}</span></div></div>

    <template v-if="isTown">
      <section v-if="activeSection === 'plan'" class="info-card"><b>县级下达计划</b><p>县级任务用于乡镇执行参考。可以把任务分解到本乡镇种植主体；主体分解面积不自动替代乡镇正式上报面积。</p></section>
      <section v-if="activeSection === 'plan'" class="list-card issued-card">
        <div class="section-title"><b>县级分解计划</b><el-tag size="small" type="info">{{ plans.length }} 条</el-tag></div>
        <div class="year-tabs"><button v-for="year in years" :key="year" :class="{active: selectedYear === year}" @click="selectedYear = year">{{ year }}年</button></div>
        <div v-for="item in filteredPlans" :key="item.id" class="plan-row">
          <div class="plan-row-main"><b>{{ item.year }}年{{ item.quarter }} · {{ item.cropType }}</b><p>{{ Number(item.area || 0).toLocaleString() }} 亩 · {{ item.description }}</p><small>主体已分解 {{ decompositionSummary(item).count }} 个 · {{ decompositionSummary(item).area.toLocaleString() }} 亩</small></div>
          <div class="plan-row-action"><el-button size="small" type="primary" @click="openDecompose(item)">任务分解</el-button></div>
        </div>
        <el-empty v-if="!filteredPlans.length" description="暂无县级分解计划" :image-size="55" />
      </section>
      <section v-if="activeSection === 'report'" class="list-card plan-entry-card">
        <div class="section-title"><div><b>乡镇自报计划</b><small>查看本乡镇已经填写的计划记录</small></div><el-button type="primary" size="small" @click="startReport(filteredPlans[0])" :disabled="!filteredPlans.length">新增上报计划</el-button></div>
        <div v-for="item in reports" :key="item.id" class="report-card"><div class="report-main"><b>{{ item.year }}年{{ item.quarter }} · {{ item.cropType }}</b><p>上报面积 {{ Number(item.area || 0).toLocaleString() }} 亩 · 主体参考 {{ Number(item.subjectReferenceArea || 0).toLocaleString() }} 亩</p><small>{{ item.remark || '暂无填报说明' }}</small></div><el-tag size="small" :type="tagType(item.status)">{{ item.status }}</el-tag><el-button link type="primary" @click="edit(item)">查看/编辑</el-button></div>
        <el-empty v-if="!reports.length" description="暂无乡镇上报计划，可点击新增" :image-size="55" />
      </section>
      <section v-if="activeSection === 'plan'" class="list-card subject-card"><div class="section-title"><b>已分解主体任务</b><el-tag size="small" type="info">当前计划</el-tag></div><div v-for="item in subjectRows" :key="item.id || item.subjectId" class="subject-plan-row"><div><b>{{ item.subjectName || item.name }}</b><p>{{ item.cropName || item.crop || '粮食作物' }} · 分解 {{ Number(item.targetArea || item.planArea || item.taskAreaMu || 0).toLocaleString() }} 亩</p></div><div class="subject-row-actions"><div><strong>{{ Number(item.sownArea || item.sowArea || 0).toLocaleString() }} 亩</strong><small>已播</small></div><el-button link type="primary" @click="viewSubject(item)">详情</el-button></div></div><el-empty v-if="!subjectRows.length" description="暂无主体任务，请先从上方计划进入“种植计划制定”" :image-size="45" /></section>
      <el-dialog v-model="decomposeDialog" title="分解到种植主体" width="96%" destroy-on-close>
        <template v-if="decomposePlan">
          <div class="decompose-context"><b>{{ decomposePlan.year }}年{{ decomposePlan.quarter }} · {{ decomposePlan.cropType }}</b><span>县级下达 {{ Number(decomposePlan.area || 0).toLocaleString() }} 亩</span></div>
          <p class="muted">主体分解是乡镇执行参考，不等同于主体正式上报；可先保存已维护的主体明细。</p>
          <div class="decompose-summary"><div><span>主体数量</span><b>{{ subjectRows.length }}</b><em>个</em></div><div><span>已分解面积</span><b>{{ subjectTotal.toLocaleString() }}</b><em>亩</em></div><div><span>关联地块</span><b>{{ plotTotal }}</b><em>块</em></div></div>
          <div v-for="(row, index) in subjectRows" :key="row.id || row.subjectId || index" class="subject-editor-card">
            <div class="subject-editor-head"><span class="subject-index">主体 {{ index + 1 }}</span><el-button link type="danger" @click="removeSubjectRow(row)">删除</el-button></div>
            <el-select v-model="row.subjectId" class="subject-select" filterable allow-create default-first-option clearable placeholder="选择或输入种植主体" size="small" @change="syncSubjectRow(row)"><el-option v-for="subject in subjectOptions" :key="subject.id" :label="subject.name" :value="subject.id" /></el-select>
            <div class="subject-meta"><span>{{ row.subjectName || '未选择主体' }}</span><span>{{ row.owner || '负责人待补充' }} · {{ row.plotIds?.length || 0 }} 块地</span></div>
            <div class="subject-area-line"><span>分解面积（亩）</span><el-input-number v-model="row.targetArea" :min="0" :precision="1" controls-position="right" size="small" /></div>
          </div>
          <el-button plain class="full-button" @click="addSubjectRow">新增主体</el-button>
        </template>
        <template #footer><el-button @click="decomposeDialog = false">取消</el-button><el-button type="primary" @click="saveDecompose">保存主体分解</el-button></template>
      </el-dialog>
      <el-dialog v-model="subjectDetailDialog" title="主体任务详情" width="94%" destroy-on-close><template v-if="selectedSubject"><el-descriptions :column="1" border><el-descriptions-item label="主体名称">{{ selectedSubject.subjectName }}</el-descriptions-item><el-descriptions-item label="主体编号">{{ selectedSubject.subjectId || '待补充' }}</el-descriptions-item><el-descriptions-item label="负责人">{{ selectedSubject.owner || '—' }}</el-descriptions-item><el-descriptions-item label="计划周期">{{ selectedSubject.year }}年{{ selectedSubject.quarter }} · {{ selectedSubject.cropType }}</el-descriptions-item><el-descriptions-item label="分解面积">{{ Number(selectedSubject.targetArea || 0).toLocaleString() }} 亩</el-descriptions-item><el-descriptions-item label="已播面积">{{ Number(selectedSubject.sownArea || 0).toLocaleString() }} 亩</el-descriptions-item></el-descriptions><div class="detail-subtitle">关联地块</div><el-table :data="selectedSubject.plotRows || []" border size="small"><el-table-column prop="plotName" label="地块名称" min-width="180"/><el-table-column prop="villageName" label="村" width="90"/><el-table-column prop="areaMu" label="地块面积（亩）" width="120"/><el-table-column prop="targetArea" label="分解面积（亩）" width="120"/></el-table><el-empty v-if="!selectedSubject.plotRows?.length" description="暂无关联地块，当前仅保存主体级任务" :image-size="45"/></template><template #footer><el-button @click="subjectDetailDialog = false">关闭</el-button></template></el-dialog>
      <el-dialog v-model="reportDialog" title="乡镇上报计划" width="94%" destroy-on-close>
      <section class="form-card">
        <div class="section-title"><b>编制乡镇上报计划</b><el-tag size="small" type="warning">乡镇独立填报</el-tag></div>
        <el-form label-position="top">
          <el-form-item label="关联县级下达计划"><el-select v-model="form.planId" style="width:100%" placeholder="请选择计划" @change="selectPlan"><el-option v-for="plan in plans" :key="plan.id" :label="`${plan.year}年${plan.quarter}${plan.cropType}`" :value="plan.id" /></el-select></el-form-item>
          <el-form-item label="年度 / 周期"><div class="readonly-period">{{ form.year ? `${form.year}年${form.quarter}` : '选择参考计划后自动带出' }}</div></el-form-item>
          <el-form-item label="作物"><el-select v-model="form.cropType" placeholder="请选择一种作物" style="width:100%"><el-option label="小麦" value="小麦"/><el-option label="水稻" value="水稻"/><el-option label="玉米" value="玉米"/><el-option label="大豆" value="大豆"/></el-select></el-form-item>
          <el-form-item label="乡镇上报计划面积（万亩）"><el-input-number v-model="form.area" :min="0" :precision="2" controls-position="right" style="width:100%" /></el-form-item>
          <el-form-item label="填报说明"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="120" show-word-limit /></el-form-item>
        </el-form>
        <div class="reference-line"><span>主体分配参考合计</span><b>{{ subjectReferenceArea.toFixed(2) }} 万亩</b></div>
        <p class="muted">主体分配面积只作参考，不自动汇总为乡镇上报计划面积。</p>
        <div class="subject-reference-box">
          <div class="section-title"><div><b>种植主体明细</b><small>在列表中选择或输入主体，并查看主体自报计划</small></div><el-button size="small" type="primary" plain @click="addSubjectRow">添加主体</el-button></div>
          <div v-for="row in subjectRows" :key="row.id || row.subjectId" class="subject-reference-row subject-reference-card">
            <div class="subject-row-main"><el-select v-model="row.subjectId" filterable allow-create default-first-option clearable placeholder="选择或输入主体" size="small" @change="syncSubjectRow(row)"><el-option v-for="subject in subjectOptions" :key="subject.id" :label="subject.name" :value="subject.id" /></el-select><div class="subject-name-input"><el-input v-model="row.subjectName" size="small" placeholder="主体名称" /></div><small v-if="row.subjectId && !hasSubjectPlan(row)" class="no-plan-tip">该主体暂无自报计划</small><small v-else-if="row.subjectId" class="has-plan-tip">已有主体自报计划，可查看详情</small></div>
            <div class="subject-row-side"><el-input-number v-model="row.targetArea" :min="0" :precision="1" controls-position="right" size="small" /><el-button link type="primary" @click="viewSubjectPlan(row)" :disabled="!hasSubjectPlan(row)">查看详情</el-button><el-button link type="danger" @click="removeSubjectRow(row)">删除</el-button></div>
          </div>
          <el-empty v-if="!subjectRows.length" description="暂未添加种植主体，可点击右上角添加" :image-size="45" />
          <el-button v-if="subjectRows.length" plain class="full-button" @click="saveSubjectReference">保存主体分配参考</el-button>
        </div>
      <el-button type="primary" class="full-button" @click="save">保存草稿</el-button>
      <el-button type="success" class="full-button" :disabled="!form.id" @click="submitCurrent">提交上报</el-button>
      </section>
      <div class="dialog-footer-space"></div>
      </el-dialog>
      <el-dialog v-model="subjectPlanVisible" title="种植主体自报计划详情" width="94%" destroy-on-close>
        <template v-if="selectedSubjectPlan"><div class="subject-detail-head"><b>{{ selectedSubjectPlan.subjectName }}</b><el-tag size="small" type="success">主体自报计划</el-tag></div><div v-for="row in selectedSubjectPlan.rows" :key="row.plotId" class="subject-plan-detail-row"><div><b>{{ row.plotName || '关联地块' }}</b><small>{{ row.crop || '未填写作物' }}</small></div><strong>{{ Number(row.area || 0).toFixed(1) }} 亩</strong></div><el-empty v-if="!selectedSubjectPlan.rows.length" description="主体已上报计划，但暂无地块明细" :image-size="45" /></template>
        <el-empty v-else description="该主体暂无自报计划" :image-size="45" />
      </el-dialog>
      <el-dialog v-model="detailDialog" title="乡镇上报计划详情" width="92%"><template v-if="selectedReport"><el-descriptions :column="1" border><el-descriptions-item label="关联计划">{{ selectedReport.year }}年{{ selectedReport.quarter }} · {{ selectedReport.cropType }}</el-descriptions-item><el-descriptions-item label="乡镇上报面积">{{ Number(selectedReport.area || 0).toFixed(2) }} 万亩</el-descriptions-item><el-descriptions-item label="当前状态"><el-tag size="small" :type="tagType(selectedReport.status)">{{ selectedReport.status }}</el-tag></el-descriptions-item><el-descriptions-item label="填报说明">{{ selectedReport.remark || '—' }}</el-descriptions-item><el-descriptions-item label="计划编号">{{ selectedReport.planId || '—' }}</el-descriptions-item><el-descriptions-item label="县级计划面积">{{ Number(selectedReport.sourcePlanArea || 0).toFixed(2) || '—' }} 万亩</el-descriptions-item><el-descriptions-item label="乡镇上报面积">{{ Number(selectedReport.area || 0).toFixed(2) }} 万亩</el-descriptions-item><el-descriptions-item label="主体参考面积">{{ Number(selectedReport.subjectReferenceArea || 0).toFixed(2) }} 万亩</el-descriptions-item><el-descriptions-item label="提交时间">{{ selectedReport.submittedAt || '—' }}</el-descriptions-item><el-descriptions-item label="审核人">{{ selectedReport.auditor || '—' }}</el-descriptions-item><el-descriptions-item label="审核时间">{{ selectedReport.auditedAt || '—' }}</el-descriptions-item><el-descriptions-item label="审核意见">{{ selectedReport.auditOpinion || '—' }}</el-descriptions-item><el-descriptions-item label="更新时间">{{ selectedReport.updatedAt || '—' }}</el-descriptions-item></el-descriptions></template><template #footer><el-button @click="detailDialog = false">关闭</el-button></template></el-dialog>
    </template>

    <template v-else>
      <section v-if="activeSection === 'plan'" class="list-card issued-card">
        <div class="section-title"><b>上级下达计划</b><el-tag size="small" type="info">参考</el-tag></div>
        <div v-for="item in plans" :key="item.id" class="issued-item">
          <div><b>{{ item.year }}年{{ item.quarter }} · {{ item.cropType }}</b><p>{{ Number(item.area || 0).toLocaleString() }} 亩 · {{ item.description }}</p></div>
          <el-tag size="small" type="success">已下达</el-tag>
        </div>
        <el-empty v-if="!plans.length" description="暂无上级下达计划" :image-size="55" />
        <p class="muted">下达计划只作编制参考，县级正式上报以本级上报计划为准。</p>
      </section>
      <section v-if="activeSection === 'report'" class="list-card issued-card">
        <div class="section-title"><b>本级计划上报</b><el-button size="small" type="primary" @click="startReport(plans[0])" :disabled="!plans.length">上报计划</el-button></div>
        <p class="muted">维护本级种植计划并提交上级审核；任务分解和上报计划分别保存。</p>
      </section>
      <el-dialog v-model="reportDialog" title="县级计划上报" width="94%" destroy-on-close>
        <section class="form-card">
          <div class="section-title"><b>编制县级上报计划</b><el-tag size="small" type="warning">县级独立填报</el-tag></div>
          <el-form label-position="top">
            <el-form-item label="关联县级下达计划"><div class="readonly-period">{{ form.planId ? `${form.year}年${form.quarter} · ${form.cropType}` : '未选择计划' }}</div></el-form-item>
            <el-form-item label="计划面积（亩）"><el-input-number v-model="form.area" :min="0" :precision="2" controls-position="right" style="width:100%" /></el-form-item>
            <el-form-item label="填报说明"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="120" show-word-limit /></el-form-item>
          </el-form>
          <el-button type="primary" class="full-button" @click="save">保存草稿</el-button>
          <el-button type="success" class="full-button" :disabled="!form.id" @click="submitCurrent">提交上报</el-button>
        </section>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useRoute } from 'vue-router'
import { fetchIssuedPlantingPlans, fetchPlantingPlanSubjectTasks, savePlantingPlanSubjectTasks, fetchTownPlanReports, saveTownPlanReport, submitTownPlanReport, auditTownPlanReport, savePlantingPlan, submitPlantingPlan } from '@/api/gpm'
import { GROW_SUBJECTS } from '@/mock/geo/plot-gen'

defineProps({ embedded: { type: Boolean, default: false } })

const route = useRoute()
const userStore = useUserStore()
const activeSection = ref(route.query.tab || 'plan')
const selectedYear = ref(2026)
const subjectOptions = ref(GROW_SUBJECTS.filter(item => String(item.regionCode).startsWith('341222104')))
const filteredPlans = computed(() => plans.value.filter(item => Number(item.year) === selectedYear.value))
const isTown = computed(() => userStore.role?.code === 'town')
const plans = ref([])
const reports = ref([])
const subjectRows = ref([])
const reportDialog = ref(false)
const detailDialog = ref(false)
const decomposeDialog = ref(false)
const subjectDetailDialog = ref(false)
const subjectPlanVisible = ref(false)
const selectedSubjectPlan = ref(null)
const selectedReport = ref(null)
const selectedSubject = ref(null)
const decomposePlan = ref(null)
const form = reactive({ id: '', planId: '', year: '', quarter: '', cropType: '', area: 0, remark: '', subjectId: '', subjectName: '' })
const subjectReferenceArea = computed(() => subjectRows.value.reduce((sum, item) => sum + Number(item.targetArea || 0) / 10000, 0))
const subjectTotal = computed(() => subjectRows.value.reduce((sum, item) => sum + Number(item.targetArea || 0), 0))
const plotTotal = computed(() => subjectRows.value.reduce((sum, item) => sum + Number(item.plotIds?.length || 0), 0))
const decompositionSummary = (plan) => {
  const rows = plan.id === decomposePlan.value?.id ? subjectRows.value : []
  return { count: rows.length, area: rows.reduce((sum, item) => sum + Number(item.targetArea || 0), 0) }
}
const tagType = status => ({ 草稿: 'info', 待县级审核: 'warning', 审核通过: 'success', 已驳回: 'danger' }[status] || 'info')
const pendingReports = computed(() => reports.value.filter(item => item.status === '待县级审核'))
const planReportStatus = plan => {
  const item = reports.value.find(row => row.planId === plan.id)
  if (!item) return { text: '未上报', type: 'info', action: '发起上报', editable: true }
  if (item.status === '草稿' || item.status === '已驳回') return { text: item.status, type: tagType(item.status), action: '继续填报', editable: true }
  return { text: item.status, type: tagType(item.status), action: '查看详情', editable: false }
}
const handlePlanAction = item => {
  const report = reports.value.find(row => row.planId === item.id)
  if (report && !planReportStatus(item).editable) return viewReport(report)
  return startReport(item)
}
const selectSubject = id => { const item = subjectOptions.value.find(subject => subject.id === id); if (item) form.subjectName = item.name }
const syncSubjectRow = row => { const item = subjectOptions.value.find(subject => subject.id === row.subjectId); if (item) { row.subjectName = item.name; row.owner = item.owner; row.regionCode = item.regionCode; row.plots = row.plots || [] } else if (row.subjectId) row.subjectName = String(row.subjectId) }
const subjectPlanFor = row => { const reports = JSON.parse(localStorage.getItem('wanqitong-plan-reports') || '[]'); return reports.find(item => item.subjectId === row.subjectId) || null }
const hasSubjectPlan = row => Boolean(row.subjectId && subjectPlanFor(row))
const viewSubjectPlan = row => { const report = subjectPlanFor(row); selectedSubjectPlan.value = report ? { subjectName: row.subjectName, rows: report.rows || [] } : null; subjectPlanVisible.value = true }
const addSubjectRow = () => { subjectRows.value.push({ id: `draft-subject-${Date.now()}`, planId: decomposePlan.value?.id, regionCode: userStore.role?.regionCode, subjectId: '', subjectName: '', targetArea: 0, plotIds: [], plotRows: [], status: '待分解', year: decomposePlan.value?.year, quarter: decomposePlan.value?.quarter, cropType: decomposePlan.value?.cropType }) }
const removeSubjectRow = row => { subjectRows.value = subjectRows.value.filter(item => item !== row) }
const openDecompose = async plan => { decomposePlan.value = plan; subjectRows.value = (await fetchPlantingPlanSubjectTasks(plan.id, userStore.role)) || []; subjectRows.value = subjectRows.value.map(row => ({ ...row, year: plan.year, quarter: plan.quarter, cropType: plan.cropType })); decomposeDialog.value = true }
const openReport = async plan => { await startReport(plan || filteredPlans.value[0]) }
const saveDecompose = async () => { if (!decomposePlan.value) return; const result = await savePlantingPlanSubjectTasks(decomposePlan.value.id, subjectRows.value, userStore.role); if (!result.success) return ElMessage.error(result.message); subjectRows.value = (result.rows || subjectRows.value).map(row => ({ ...row, year: decomposePlan.value.year, quarter: decomposePlan.value.quarter, cropType: decomposePlan.value.cropType })); decomposeDialog.value = false; ElMessage.success('主体任务分解已保存') }
const viewSubject = item => { selectedSubject.value = { ...item, year: item.year || decomposePlan.value?.year, quarter: item.quarter || decomposePlan.value?.quarter, cropType: item.cropType || decomposePlan.value?.cropType }; subjectDetailDialog.value = true }
const startReport = async plan => {
  const existing = reports.value.find(row => row.planId === plan.id)
  if (existing) await edit(existing)
  else { Object.assign(form, { id: '', planId: plan.id, year: plan.year, quarter: plan.quarter, cropType: plan.cropType, area: 0, remark: '' }); subjectRows.value = await fetchPlantingPlanSubjectTasks(plan.id, userStore.role) }
  reportDialog.value = true
}
const viewReport = item => { selectedReport.value = { ...item, sourcePlanArea: plans.value.find(plan => plan.id === item.planId)?.area || 0 }; detailDialog.value = true }
const load = async () => {
  plans.value = await fetchIssuedPlantingPlans(userStore.role, {})
  reports.value = await fetchTownPlanReports(userStore.role)
  if (isTown.value) { subjectRows.value = []; decomposePlan.value = null }
  if (isTown.value && form.planId) subjectRows.value = await fetchPlantingPlanSubjectTasks(form.planId, userStore.role)
}
const selectPlan = async () => { subjectRows.value = form.planId ? await fetchPlantingPlanSubjectTasks(form.planId, userStore.role) : []; const plan = plans.value.find(item => item.id === form.planId); if (plan) { form.year = plan.year; form.quarter = plan.quarter; form.cropType = plan.cropType } }
const edit = async (item) => { Object.assign(form, { id: item.id, planId: item.planId, year: item.year, quarter: item.quarter, cropType: item.cropType, area: Number(item.area || 0), remark: item.remark || '' }); subjectRows.value = await fetchPlantingPlanSubjectTasks(item.planId, userStore.role); reportDialog.value = true }
const saveSubjectReference = async () => { if (!form.planId) return ElMessage.warning('请先选择县级参考计划'); const result = await savePlantingPlanSubjectTasks(form.planId, subjectRows.value, userStore.role); if (!result.success) return ElMessage.error(result.message); subjectRows.value = result.rows || subjectRows.value; ElMessage.success('主体分配参考已保存') }
const save = async () => {
  if (!form.planId || !form.cropType) return ElMessage.warning('请选择计划并填写作物类型')
  const result = isTown.value
    ? await saveTownPlanReport({ ...form, subjectReferenceArea: subjectReferenceArea.value, subjectRows: subjectRows.value.map(row => ({ subjectId: row.subjectId || '', subjectName: row.subjectName || '', targetArea: Number(row.targetArea || 0), owner: row.owner || '', plotIds: row.plotIds || [] })) }, userStore.role)
    : await savePlantingPlan({ id: form.planId, year: form.year, quarter: form.quarter, cropType: form.cropType, area: Number(form.area || 0), description: form.remark || `${form.year}年${form.quarter}${form.cropType}县级上报计划` }, userStore.role)
  if (!result.success) return ElMessage.error(result.message)
  form.id = result.item?.id || form.planId
  ElMessage.success('计划草稿已保存')
  reportDialog.value = false
  await load()
}
const submitCurrent = async () => {
  if (!form.id) return ElMessage.warning('请先保存草稿')
  const result = isTown.value ? await submitTownPlanReport(form.id, userStore.role) : await submitPlantingPlan(form.id, userStore.role)
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success('已提交上级审核')
  reportDialog.value = false
  await load()
}
const submit = async item => { const result = await submitTownPlanReport(item.id, userStore.role); if (!result.success) return ElMessage.error(result.message); ElMessage.success('已提交县级审核'); reportDialog.value = false; await load() }
const audit = async (item, approved) => { let opinion = ''; try { if (approved) await ElMessageBox.confirm(`确认通过${item.townName}的乡镇上报计划吗？`, '审核确认'); else opinion = (await ElMessageBox.prompt('请填写退回意见', '退回计划', { inputType: 'textarea' })).value } catch { return } const result = await auditTownPlanReport(item.id, approved, opinion, userStore.role); if (!result.success) return ElMessage.error(result.message); ElMessage.success(approved ? '已审核通过' : '已退回'); await load() }
onMounted(load)
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px;overflow-x:hidden}.mobile-head,.info-card,.form-card,.list-card{background:#fff;border-radius:14px;padding:15px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;gap:8px;color:#1f3c68}.mobile-head b{display:block;font-size:19px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;padding:0 8px 4px 0}.info-card{border:1px solid #d6eee5;background:#f8fcfa;color:#176b58}.info-card p,.muted{font-size:12px;color:#667085;line-height:1.5;margin:7px 0 0}.section-title,.report-item,.report-card,.item-actions,.reference-line{display:flex;align-items:center;justify-content:space-between;gap:8px}.section-title{color:#243b5a;margin-bottom:12px}.section-title small{display:block;color:#98a2b3;font-size:11px;font-weight:400;margin-top:4px}.report-card{border-top:1px solid #edf0f5;padding:12px 0}.report-main{flex:1;min-width:0}.report-main b{color:#243b5a;font-size:13px}.report-main p,.report-main small{display:block;color:#667085;font-size:11px;margin:5px 0 0}.report-main small{color:#98a2b3}.report-card :deep(.el-button){flex-shrink:0}.reference-line{padding:10px;background:#f4f8fb;border-radius:8px;color:#667085;font-size:12px}.reference-line b{color:#176b58}.subject-reference-box{margin-top:10px;padding:10px;border:1px dashed #cbd9e8;border-radius:8px;background:#fbfdff}.subject-reference-box .section-title{margin-bottom:6px}.subject-reference-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 0;border-top:1px solid #edf0f5;color:#44546a;font-size:12px}.subject-reference-row :deep(.el-input-number){width:112px}.subject-reference-card{align-items:flex-start}.subject-row-main{flex:1;min-width:0}.subject-row-main :deep(.el-select),.subject-name-input{width:100%;margin-bottom:5px}.subject-row-side{display:flex;align-items:center;gap:3px;flex-shrink:0}.subject-row-side :deep(.el-button){padding:0 3px}.no-plan-tip,.has-plan-tip{display:block;font-size:10px}.no-plan-tip{color:#98a2b3}.has-plan-tip{color:#2d8c72}.subject-detail-head{display:flex;align-items:center;justify-content:space-between;padding:12px;background:#eaf6f1;border-radius:9px;color:#176b58}.subject-plan-detail-row{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #edf0f5;padding:11px 0}.subject-plan-detail-row b,.subject-plan-detail-row small{display:block}.subject-plan-detail-row small{margin-top:4px;color:#98a2b3;font-size:11px}.subject-plan-detail-row strong{color:#176b58}.full-button{width:100%;margin-top:10px}.plan-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #edf0f5;padding:12px 0}.plan-row-main{min-width:0}.plan-row-main b{font-size:14px;color:#243b5a}.plan-row-main p{margin:5px 0 0;color:#667085;font-size:11px;line-height:1.4}.plan-row-action{display:flex;align-items:center;gap:6px;flex-shrink:0}.report-item{padding:12px 0;border-top:1px solid #edf0f5}.report-item b{font-size:14px;color:#243b5a}.report-item p,.report-item small{display:block;color:#667085;font-size:12px;margin:5px 0 0}.item-actions{flex-shrink:0}.item-actions :deep(.el-button){padding:0 2px}.dialog-footer-space{height:8px}
.subject-card{border:1px solid #d6eee5;background:#fbfefc}.subject-plan-row{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #edf0f5;padding:10px 0}.subject-plan-row p,.subject-plan-row small{display:block;margin:4px 0 0;color:#667085;font-size:11px}.subject-plan-row strong{color:#176b58}.subject-editor-card{background:#fbfdff;border:1px solid #e5ebf2;border-radius:10px;padding:11px;margin:9px 0}.subject-editor-head,.subject-meta,.subject-area-line{display:flex;align-items:center;justify-content:space-between;gap:8px}.subject-index{font-weight:600;color:#243b5a;font-size:13px}.subject-select{width:100%;margin:8px 0}.subject-meta{color:#667085;font-size:11px}.subject-meta span:last-child{color:#98a2b3}.subject-area-line{border-top:1px solid #edf0f5;margin-top:9px;padding-top:9px;color:#667085;font-size:12px}.subject-area-line :deep(.el-input-number){width:145px}.issued-card{border:1px solid #d6eee5;background:#fbfefc}.issued-item{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #edf0f5;padding:11px 0}.issued-item b{color:#243b5a;font-size:13px}.issued-item p{margin:5px 0 0;color:#667085;font-size:11px;line-height:1.4}</style>


