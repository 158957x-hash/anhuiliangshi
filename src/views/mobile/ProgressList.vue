<template>
  <div class="mobile-page">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>播种与收获进度</b><span>查看主体计划，维护汇总或地块进度</span></div></div>
    <div class="year-tabs"><button v-for="year in years" :key="year" :class="{active: selectedYear === year}" @click="selectedYear = year">{{ year }}年</button></div>
    <div class="tabs"><button :class="{active: type === 'sow'}" @click="type = 'sow'">播种进度</button><button :class="{active: type === 'harvest'}" @click="type = 'harvest'">收获进度</button></div>

    <section class="summary-card">
      <div class="section-title"><b>{{ selectedYear }}年{{ type === 'sow' ? '播种' : '收获' }}汇总</b><el-tag size="small" type="info">可只填汇总</el-tag></div>
      <div class="summary-number"><strong>{{ summary.done.toFixed(1) }}</strong><span> / {{ summary.plan.toFixed(1) }} 亩</span></div>
      <el-progress :percentage="summary.percent" :status="type === 'harvest' ? 'success' : undefined" :show-text="false" />
      <div class="summary-foot"><span>完成率 {{ summary.percent }}%</span><el-button size="small" type="primary" plain @click="openSummary">维护汇总</el-button></div>
      <p>地块明细可以不填；如果填写，系统同时展示“已填地块合计”和“主体汇总”，两者不强制相等。</p>
    </section>

    <section class="plan-list">
      <div class="section-title"><b>我的主体计划</b><el-tag size="small">{{ planRows.length }} 条</el-tag></div>
      <div v-for="plan in planRows" :key="plan.taskId" class="plan-card">
        <div><b>{{ plan.planName }}</b><p>{{ plan.cropName }} · 计划 {{ plan.planArea.toFixed(1) }} 亩</p></div>
        <div class="plan-actions"><span>完成 {{ plan.done.toFixed(1) }}亩</span><el-button size="small" type="primary" @click="openPlan(plan)">维护进度</el-button></div>
      </div>
      <el-empty v-if="!planRows.length" description="暂无已上报主体计划，请先完成计划上报" :image-size="55" />
    </section>

    <el-dialog v-model="dialogVisible" title="维护种植进度" width="94%" destroy-on-close>
      <template v-if="selectedPlan">
        <div class="plan-context"><b>{{ selectedPlan.planName }}</b><span>计划 {{ selectedPlan.planArea.toFixed(1) }} 亩</span></div>
        <el-form label-position="top"><el-form-item :label="`主体${type === 'sow' ? '已播' : '已收获'}汇总（亩）`"><el-input-number v-model="editSummary" :min="0" :max="selectedPlan.planArea" :precision="1" controls-position="right" style="width:100%" /></el-form-item></el-form>
        <div class="section-title detail-title"><b>地块进度明细（可选）</b><span>{{ detailRows.length }} 块</span></div>
        <div v-for="row in detailRows" :key="row.plotId" class="plot-row"><div><b>{{ row.plotName }}</b><small>计划 {{ row.planArea.toFixed(1) }} 亩</small></div><el-input-number v-model="row.done" :min="0" :max="row.planArea" :precision="1" controls-position="right" size="small" /><span>亩</span></div>
        <el-alert title="地块明细可全部留空；填报时只维护汇总，也可以只维护部分地块。" type="info" :closable="false" />
      </template>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="saveProgress">保存进度</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchSubjectPlanTasks } from '@/api/gpm'
import { PLOTS } from '@/mock/geo/plot-gen'

const userStore = useUserStore()
const years = [2026, 2025, 2024]
const selectedYear = ref(2026)
const type = ref('sow')
const tasks = ref([])
const reports = ref([])
const progress = ref([])
const dialogVisible = ref(false)
const summaryDialog = ref(false)
const selectedPlan = ref(null)
const detailRows = ref([])
const editSummary = ref(0)
const subjectId = computed(() => userStore.role?.subjectId)
const planReports = computed(() => reports.value.filter(item => Number(item.year) === selectedYear.value))
const planRows = computed(() => planReports.value.map(report => {
  const plan = tasks.value.find(item => item.taskId === report.taskId)
  const rows = report.rows || []
  const current = progress.value.find(item => item.taskId === report.taskId && item.type === type.value)
  const done = Number(current?.summary ?? rows.reduce((sum, row) => sum + Number(row.area || 0), 0))
  return { ...report, planName: plan?.planName || '主体自报计划', cropName: plan?.cropType || rows[0]?.crop || '未填写', planArea: rows.reduce((sum, row) => sum + Number(row.area || 0), 0), done }
}))
const summary = computed(() => { const plan = planRows.value.reduce((sum, row) => sum + row.planArea, 0); const done = planRows.value.reduce((sum, row) => sum + row.done, 0); return { plan, done, percent: plan ? Number(Math.min(100, done / plan * 100).toFixed(1)) : 0 } })
const key = (taskId, progressType = type.value) => `${subjectId.value}:${selectedYear.value}:${taskId}:${progressType}`
const openSummary = () => { if (!planRows.value.length) return ElMessage.warning('暂无已上报主体计划'); selectedPlan.value = planRows.value[0]; editSummary.value = summary.value.done; detailRows.value = []; summaryDialog.value = true }
const openPlan = plan => { selectedPlan.value = plan; const old = progress.value.find(item => item.taskId === plan.taskId && item.type === type.value); editSummary.value = Number(old?.summary ?? plan.done); detailRows.value = (plan.rows || []).map(row => ({ plotId: row.plotId, plotName: row.plotName, planArea: Number(row.area || 0), done: Number(old?.plots?.[row.plotId] || 0) })); dialogVisible.value = true }
const saveProgress = () => { if (!selectedPlan.value || editSummary.value < 0 || editSummary.value > selectedPlan.value.planArea) return ElMessage.warning('汇总进度不能超过主体计划面积'); const item = { subjectId: subjectId.value, taskId: selectedPlan.value.taskId, year: selectedYear.value, type: type.value, summary: Number(editSummary.value || 0), plots: Object.fromEntries(detailRows.value.filter(row => Number(row.done) > 0).map(row => [row.plotId, Number(row.done)])), updatedAt: new Date().toISOString() }; progress.value = [...progress.value.filter(row => !(row.subjectId === subjectId.value && row.taskId === item.taskId && row.type === item.type)), item]; localStorage.setItem('wanqitong-progress', JSON.stringify(progress.value)); dialogVisible.value = false; summaryDialog.value = false; ElMessage.success('进度已保存') }
const load = async () => { tasks.value = await fetchSubjectPlanTasks(userStore.role); reports.value = JSON.parse(localStorage.getItem('wanqitong-plan-reports') || '[]').filter(item => item.subjectId === subjectId.value && item.status === '已上报'); progress.value = JSON.parse(localStorage.getItem('wanqitong-progress') || '[]').filter(item => item.subjectId === subjectId.value) }
onMounted(load)
</script>

<style lang="scss" scoped>
.mobile-page{min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.summary-card,.plan-list{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;gap:8px;color:#1f3c68}.mobile-head b{display:block;font-size:21px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;padding:0 8px 4px 0}.year-tabs,.tabs{display:flex;gap:8px;margin-bottom:12px}.year-tabs button,.tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:8px;padding:9px;color:#667085}.year-tabs button.active,.tabs button.active{background:#eaf6f1;border-color:#2d8c72;color:#176b58;font-weight:600}.summary-card{background:linear-gradient(135deg,#eaf6f1,#f8fbfa);border:1px solid #d6eee5}.section-title,.summary-foot,.plan-card,.plan-actions,.plot-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.section-title{color:#243b5a;margin-bottom:10px}.section-title span,.plan-card p,.plot-row small{font-size:11px;color:#98a2b3}.summary-number{margin:12px 0;color:#667085}.summary-number strong{font-size:30px;color:#176b58}.summary-foot{font-size:12px;color:#667085;margin-top:10px}.summary-foot button{margin-left:auto}.summary-card p{font-size:11px;color:#7a918a;line-height:1.5}.plan-card{border-top:1px solid #edf0f5;padding:12px 0}.plan-card>b,.plan-card p{display:block}.plan-card p{margin:5px 0 0}.plan-actions{flex-direction:column;align-items:flex-end;color:#176b58;font-size:11px}.plan-context{padding:12px;background:#eaf6f1;border-radius:9px;color:#176b58;margin-bottom:12px}.plan-context span{float:right;color:#667085;font-size:12px}.detail-title{margin-top:14px}.plot-row{border-top:1px solid #edf0f5;padding:10px 0}.plot-row div{flex:1}.plot-row b,.plot-row small{display:block}.plot-row b{font-size:13px;color:#243b5a}.plot-row span{font-size:12px;color:#667085}.plot-row :deep(.el-input-number){width:125px}.mobile-page :deep(.el-dialog__body){padding-top:8px}
</style>
