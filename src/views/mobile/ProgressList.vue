<template>
  <div class="mobile-page">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>播种与收获进度</b><span>在自己的计划列表中维护播种和收获进度</span></div></div>
    <div class="year-tabs"><button v-for="year in years" :key="year" :class="{active: selectedYear === year}" @click="selectedYear = year">{{ year }}年</button></div>
    <section class="plan-list">
      <div class="section-title"><b>我的主体计划</b><el-tag size="small">{{ planRows.length }} 条</el-tag></div>
      <div v-for="plan in planRows" :key="plan.taskId" class="plan-card">
        <div class="plan-title"><div><b>{{ plan.planName }}</b><p>{{ plan.cropName }} · 计划 {{ plan.planArea.toFixed(1) }} 亩</p></div><el-tag size="small" type="info">计划任务</el-tag></div>
        <div class="progress-line"><span>播种</span><el-progress :percentage="plan.sowPercent" :stroke-width="10" /><strong>{{ plan.sowDone.toFixed(1) }}亩</strong></div>
        <div class="progress-line"><span>收获</span><el-progress :percentage="plan.harvestPercent" status="success" :stroke-width="10" /><strong>{{ plan.harvestDone.toFixed(1) }}亩</strong></div>
        <div class="plan-footer"><span>最近更新：{{ plan.updatedAt || '待填报' }}</span><el-button size="small" type="primary" @click="openPlan(plan)">维护进度</el-button></div>
      </div>
      <el-empty v-if="!planRows.length" description="暂无主体计划" :image-size="55" />
    </section>

    <el-dialog v-model="dialogVisible" title="维护计划进度" width="94%" destroy-on-close>
      <template v-if="selectedPlan">
        <div class="plan-context"><b>{{ selectedPlan.planName }}</b><span>计划 {{ selectedPlan.planArea.toFixed(1) }} 亩</span></div>
        <el-form label-position="top"><el-form-item label="进度类型"><div class="type-switch"><button :class="{active: editType === 'sow'}" @click.prevent="editType = 'sow'">播种</button><button :class="{active: editType === 'harvest'}" @click.prevent="editType = 'harvest'">收获</button></div></el-form-item><el-form-item :label="editType === 'sow' ? '累计已播面积（亩）' : '累计已收获面积（亩）'"><el-input-number v-model="editSummary" :min="0" :max="selectedPlan.planArea" :precision="1" controls-position="right" style="width:100%" /></el-form-item></el-form>
        <div class="section-title detail-title"><b>地块明细</b><span>可填部分地块</span></div>
        <div v-for="row in detailRows" :key="row.plotId" class="plot-row"><div><b>{{ row.plotName }}</b><small>计划 {{ row.planArea.toFixed(1) }} 亩</small></div><el-input-number v-model="row.done" :min="0" :max="row.planArea" :precision="1" controls-position="right" size="small" /><span>亩</span></div>
        <el-alert title="可以只填主体累计进度，也可以补充部分地块明细；两者均会保留记录。" type="info" :closable="false" />
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
const userStore = useUserStore(); const years = [2026, 2025, 2024]; const selectedYear = ref(2026); const tasks = ref([]); const progress = ref([]); const dialogVisible = ref(false); const selectedPlan = ref(null); const detailRows = ref([]); const editSummary = ref(0); const editType = ref('sow'); const subjectId = computed(() => userStore.role?.subjectId)
const planRows = computed(() => tasks.value.filter(item => Number(item.year) === selectedYear.value).map(task => { const sow = progress.value.find(x => x.taskId === task.taskId && x.type === 'sow'); const harvest = progress.value.find(x => x.taskId === task.taskId && x.type === 'harvest'); const planArea = Number(task.taskAreaMu || task.taskArea || 0); const sowDone = Number(sow?.summary ?? Math.min(planArea, planArea * .38)); const harvestDone = Number(harvest?.summary ?? Math.min(planArea, planArea * .16)); return { ...task, planArea, sowDone, harvestDone, sowPercent: planArea ? Number((sowDone / planArea * 100).toFixed(1)) : 0, harvestPercent: planArea ? Number((harvestDone / planArea * 100).toFixed(1)) : 0, updatedAt: sow?.updatedAt || harvest?.updatedAt || '2026-11-17' } }))
const openPlan = plan => { selectedPlan.value = plan; editType.value = 'sow'; const old = progress.value.find(x => x.taskId === plan.taskId && x.type === 'sow'); editSummary.value = Number(old?.summary ?? plan.sowDone); const plots = PLOTS.filter(p => p.subjectId === subjectId.value).slice(0, 5); detailRows.value = plots.map(p => ({ plotId: p.id, plotName: p.name, planArea: Number(p.areaMu || 0), done: Number(old?.plots?.[p.id] || 0) })); dialogVisible.value = true }
const saveProgress = () => { if (!selectedPlan.value || editSummary.value > selectedPlan.value.planArea) return ElMessage.warning('进度不能超过计划面积'); const item = { subjectId: subjectId.value, taskId: selectedPlan.value.taskId, year: selectedYear.value, type: editType.value, summary: Number(editSummary.value || 0), plots: Object.fromEntries(detailRows.value.filter(x => Number(x.done) > 0).map(x => [x.plotId, Number(x.done)])), updatedAt: new Date().toISOString().slice(0, 10) }; progress.value = [...progress.value.filter(x => !(x.subjectId === subjectId.value && x.taskId === item.taskId && x.type === item.type)), item]; localStorage.setItem('wanqitong-progress', JSON.stringify(progress.value)); dialogVisible.value = false; ElMessage.success('进度已保存') }
const load = async () => { const result = await fetchSubjectPlanTasks(userStore.role); tasks.value = result?.length ? result : [{ taskId: 'DEMO-TASK-2026-Q3', year: 2026, quarter: '第三季度', planName: '2026年第三季度玉米种植计划', taskAreaMu: 620, cropType: '玉米', cityName: '阜阳市', countyName: '太和县', townName: '旧县镇' }]; progress.value = JSON.parse(localStorage.getItem('wanqitong-progress') || '[]').filter(x => x.subjectId === subjectId.value) }
onMounted(load)
</script>

<style lang="scss" scoped>
.mobile-page{min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.plan-list{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;gap:8px;color:#1f3c68}.mobile-head b{display:block;font-size:21px}.mobile-head span{display:block;color:#667085;font-size:12px}.back-button{border:0;background:none;font-size:36px;line-height:1;padding:0 8px 4px 0}.year-tabs{display:flex;gap:8px;margin-bottom:12px}.year-tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:8px;padding:9px;color:#667085}.year-tabs button.active{background:#eaf6f1;border-color:#2d8c72;color:#176b58}.section-title,.plan-title,.plan-footer,.progress-line{display:flex;align-items:center;justify-content:space-between;gap:8px}.section-title{color:#243b5a;margin-bottom:10px}.plan-card{border-top:1px solid #edf0f5;padding:14px 0}.plan-title>div{min-width:0}.plan-title b{color:#243b5a;font-size:14px}.plan-title p{margin:5px 0 0;color:#667085;font-size:11px}.progress-line{margin:13px 0 0;color:#667085;font-size:12px}.progress-line>span{width:34px}.progress-line :deep(.el-progress){flex:1}.progress-line strong{width:66px;color:#176b58;text-align:right;font-size:11px}.plan-footer{margin-top:13px;color:#98a2b3;font-size:11px}.plan-context{padding:12px;background:#eaf6f1;border-radius:9px;color:#176b58}.plan-context span{float:right;color:#667085;font-size:12px}.type-switch{display:flex;gap:8px}.type-switch button{flex:1;border:1px solid #d9e2ec;border-radius:8px;background:#fff;padding:10px;color:#667085}.type-switch button.active{border-color:#2d8c72;background:#eaf6f1;color:#176b58;font-weight:600}.detail-title{margin-top:14px}.plot-row{display:flex;align-items:center;gap:8px;border-top:1px solid #edf0f5;padding:10px 0}.plot-row div{flex:1}.plot-row b,.plot-row small{display:block}.plot-row b{font-size:12px;color:#243b5a}.plot-row small{font-size:11px;color:#98a2b3}.plot-row span{font-size:11px;color:#667085}.plot-row :deep(.el-input-number){width:104px}
</style>