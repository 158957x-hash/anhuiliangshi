<template>
  <div class="mobile-page">
    <div class="mobile-head">
      <div><b>播种与收获列表</b><span>查看主体已填写的进度数据</span></div>
      <el-button link type="primary" @click="$router.back()">返回</el-button>
    </div>

    <MobileFunctionEntry title="进度工作台" subtitle="填报、查看和核对主体进度记录" role-label="种植主体" :items="entryItems" @select="selectEntry" />

    <div class="year-tabs">
      <button v-for="year in years" :key="year" :class="{ active: selectedYear === year }" @click="selectedYear = year">
        {{ year }}年
      </button>
    </div>

    <div class="tabs">
      <button :class="{ active: type === 'sow' }" @click="type = 'sow'">播种进度</button>
      <button :class="{ active: type === 'harvest' }" @click="type = 'harvest'">收获进度</button>
    </div>

    <section class="summary-card">
      <div class="summary-head"><b>{{ selectedYear }}年{{ type === 'sow' ? '播种' : '收获' }}总进度</b><el-tag size="small" :type="type === 'sow' ? 'warning' : 'success'">主体自报计划基准</el-tag></div>
      <div class="summary-number"><strong>{{ summary.reportedArea.toFixed(1) }}</strong><span> / {{ summary.planArea.toFixed(1) }} 亩</span></div>
      <el-progress :percentage="summary.progress" :status="type === 'harvest' ? 'success' : undefined" :show-text="false" />
      <div class="summary-foot"><span>计划面积 {{ summary.planArea.toFixed(1) }} 亩</span><b>{{ summary.progress }}%</b></div>
      <p>仅按主体自行维护的计划面积计算，不进入县、市、省正式进度统计。</p>
    </section>

    <div v-for="item in rows" :key="item.id" class="progress-card">
      <div class="progress-top"><el-tag size="small" :type="type === 'sow' ? 'warning' : 'success'">{{ type === 'sow' ? '播种上报' : '收获上报' }}</el-tag><span>{{ item.date || item.updatedAt }}</span></div>
      <b>{{ item.planName }}</b>
      <p>{{ item.cropName || item.crop }} · {{ item.regionName }} · {{ item.plotId }}</p>
      <div class="report-line"><span>本次上报面积</span><strong>{{ Number(item.area || 0).toFixed(1) }} 亩</strong></div><el-progress :percentage="rowProgress(item)" :status="type === 'harvest' ? 'success' : undefined" :stroke-width="8" :show-text="false" /><div class="progress-percent">累计进度 {{ rowProgress(item) }}%</div>
      <div class="report-meta"><span>上报主体：{{ item.subjectName || '当前主体' }}</span><span>{{ item.source || '皖企通填报' }}</span></div>
    </div>
    <section class="form-card">
      <div class="summary-head"><b>维护主体进度</b><el-tag size="small" type="warning">主体独立填报</el-tag></div>
      <el-form label-position="top">
        <el-form-item label="关联参考计划"><el-select v-model="form.taskId" style="width:100%" placeholder="请选择参考计划"><el-option v-for="task in yearTasks" :key="task.taskId" :label="`${task.planName} · ${task.cropType}`" :value="task.taskId" /></el-select></el-form-item>
        <el-form-item label="填报类型"><el-radio-group v-model="form.type"><el-radio-button label="sow">播种</el-radio-button><el-radio-button label="harvest">收获</el-radio-button></el-radio-group></el-form-item>
        <el-form-item label="本次填报面积（亩）"><el-input-number v-model="form.area" :min="0" :precision="1" controls-position="right" style="width:100%" /></el-form-item>
        <el-form-item label="关联地块"><el-select v-model="form.plotId" style="width:100%" placeholder="请选择地块"><el-option v-for="plot in plots" :key="plot.id" :label="`${plot.name}（${plot.areaMu}亩）`" :value="plot.id" /></el-select></el-form-item>
      </el-form>
      <el-alert title="主体进度仅供主体自身和行政端查看，不进入正式上报统计，也不需要行政审核。" type="info" :closable="false" />
      <el-button type="primary" class="submit-btn" @click="submitProgress">保存主体进度</el-button>
    </section>
    <el-empty v-if="!rows.length" description="暂无该年度进度填报数据" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { addProgressRecord, fetchProgressRecords, fetchSubjectPlanTasks, fetchSubjectPlotRelations } from '@/api/gpm'
import { PLOTS } from '@/mock/geo/plot-gen'
import { ElMessage } from 'element-plus'
import MobileFunctionEntry from '@/components/mobile/MobileFunctionEntry.vue'

const userStore = useUserStore()
const entryItems = [{ key: 'sow', label: '播种进度', description: '查看并维护播种填报', tone: 'green' }, { key: 'harvest', label: '收获进度', description: '查看并维护收获填报', tone: 'orange' }, { key: 'records', label: '历史记录', description: '按年度查看已提交记录', tone: 'blue' }]
const selectEntry = item => { if (item.key === 'sow' || item.key === 'harvest') type.value = item.key; document.querySelector(item.key === 'records' ? '.progress-card' : '.form-card')?.scrollIntoView({ behavior: 'smooth' }) }
const years = [2026, 2025, 2024]
const selectedYear = ref(2026)
const type = ref('sow')
const tasks = ref([])
const records = ref([])
const plots = ref([])
const form = reactive({ taskId: '', type: 'sow', area: 0, plotId: '' })
const summary = reactive({ planArea: 0, reportedArea: 0, progress: 0 })
const rowProgress = item => { const plan = Number(item.planArea || item.taskAreaMu || 0); const done = Number(item.reportedArea || item.area || 0); return plan ? Math.min(100, Number((done / plan * 100).toFixed(1))) : 0 }
const yearTasks = computed(() => tasks.value.filter(item => Number(item.year) === selectedYear.value))

const rows = computed(() => {
  const acceptedTypes = type.value === 'sow' ? ['sow', 'planting'] : ['harvest']
  return records.value.filter(item => Number(item.year || String(item.date || '').slice(0, 4)) === selectedYear.value && acceptedTypes.includes(item.type))
})

const load = async () => {
  const [taskRows, recordRows] = await Promise.all([
    fetchSubjectPlanTasks(userStore.role),
    fetchProgressRecords(userStore.role)
  ])
  tasks.value = taskRows || []
  records.value = recordRows || []
  const currentTasks = tasks.value.filter(item => Number(item.year) === selectedYear.value)
  const taskIds = new Set(currentTasks.map(item => item.taskId || item.id))
  const matchedRows = rows.value.filter(item => !item.taskId || taskIds.has(item.taskId))
  const intentions = JSON.parse(localStorage.getItem('wanqitong-intentions') || '[]')
  const latestPlan = intentions.find(item => item.subjectId === userStore.role?.subjectId && Number(item.year) === selectedYear.value)
  summary.planArea = latestPlan ? ['wheat', 'rice', 'corn', 'soybean'].reduce((sum, crop) => sum + Number(latestPlan[crop] || 0), 0) : 0
  summary.reportedArea = matchedRows.reduce((sum, item) => sum + Number(item.area || 0), 0)
  summary.progress = summary.planArea ? Number(Math.min(100, summary.reportedArea / summary.planArea * 100).toFixed(1)) : 0
}

const submitProgress = async () => {
  const task = yearTasks.value.find(item => item.taskId === form.taskId)
  if (!task) return ElMessage.warning('请选择关联参考计划')
  if (!form.plotId) return ElMessage.warning('请选择关联地块')
  if (Number(form.area) <= 0) return ElMessage.warning('请填写大于0的填报面积')
  const result = await addProgressRecord({ ...form, subjectId: userStore.role?.subjectId, regionCode: task.townCode, regionName: task.townName, planId: task.planId, taskId: task.taskId, planName: task.planName, cropName: task.cropType, role: userStore.role, source: '皖企通主体自报' })
  if (!result.success) return ElMessage.error(result.message || '保存失败')
  ElMessage.success('主体进度已保存')
  form.area = 0
  records.value = await fetchProgressRecords(userStore.role)
}

watch(type, (value) => { form.type = value })
watch([type, selectedYear], load)
onMounted(load)
onMounted(async () => {
  const relations = await fetchSubjectPlotRelations(userStore.role, { subjectId: userStore.role?.subjectId })
  const ids = new Set(relations.filter(item => item.relationStatus === '已关联').map(item => item.plotId))
  plots.value = PLOTS.filter(item => item.subjectId === userStore.role?.subjectId && ids.has(item.id))
})
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.summary-card,.progress-card,.form-card{background:#fff;border-radius:12px;padding:16px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;justify-content:space-between;color:#1f3c68}.mobile-head b{display:block;font-size:21px}.mobile-head span{display:block;color:#667085;font-size:13px;margin-top:4px}.year-tabs,.tabs{display:flex;gap:8px;margin-bottom:12px}.year-tabs button,.tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:8px;padding:9px;color:#667085}.year-tabs button.active,.tabs button.active{background:#eaf6f1;border-color:#2d8c72;color:#176b58;font-weight:600}.summary-card{background:linear-gradient(135deg,#eaf6f1,#f8fbfa);border:1px solid #d6eee5}.summary-head,.summary-foot{display:flex;align-items:center;justify-content:space-between}.summary-head{color:#176b58}.summary-number{margin:14px 0 10px;color:#667085}.summary-number strong{font-size:30px;color:#176b58}.summary-number span{font-size:14px}.summary-foot{font-size:12px;color:#667085;margin-top:8px}.summary-foot b{color:#176b58;font-size:16px}.summary-card p{font-size:11px;color:#7a918a;line-height:1.5;margin:10px 0 0}.progress-top{display:flex;justify-content:space-between;color:#98a2b3;font-size:11px}.progress-card>b{display:block;color:#243b5a;font-size:15px;margin:11px 0 5px}.progress-card p{font-size:12px;color:#667085;margin:0 0 13px}.report-line{display:flex;justify-content:space-between;align-items:center;padding:10px;background:#f4f8fb;border-radius:8px;font-size:12px;color:#667085}.report-line strong{font-size:16px;color:#176b58}.report-meta{display:flex;justify-content:space-between;gap:8px;color:#98a2b3;font-size:11px;margin-top:10px}.progress-percent{font-size:11px;color:#176b58;text-align:right;margin-top:3px}.form-card :deep(.el-form-item){margin-bottom:14px}.submit-btn{width:100%;margin-top:12px}
</style>

