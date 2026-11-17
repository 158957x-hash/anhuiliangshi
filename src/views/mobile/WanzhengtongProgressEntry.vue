<template>
  <div class="entry-page">
    <section class="context-card"><div class="context-title"><b>进度填报</b><el-tag size="small" type="info">已通过计划</el-tag></div><p>先选择已通过的乡镇计划，再填写本次新增进度；历史记录在计划详情中查看。</p></section>
    <section class="plan-list">
      <div class="section-title"><b>可填报计划</b><el-tag size="small">{{ planOptions.length }} 条</el-tag></div>
      <div v-for="item in planOptions" :key="item.id" class="plan-card">
        <div class="plan-card-main"><b>{{ item.year }}年{{ item.quarter }} · {{ item.cropName || item.crop }}</b><p>{{ item.planName }}</p><div class="plan-meta"><span>计划 {{ Number(item.planArea || 0).toLocaleString() }} 亩</span><span>累计 {{ Number(item.doneArea || 0).toLocaleString() }} 亩</span><el-tag size="small" type="success">{{ item.reportStatus || '已通过' }}</el-tag></div></div>
        <el-button type="primary" size="small" @click="openEntry(item)">填写进度</el-button>
      </div>
      <el-empty v-if="!planOptions.length" description="暂无已通过的乡镇计划" :image-size="60" />
    </section>

    <el-dialog v-model="dialogVisible" title="填写本次进度" width="94%" destroy-on-close>
      <template v-if="selectedPlan">
        <div class="plan-context"><div><span>计划</span><b>{{ selectedPlan.planName }}</b></div><div><span>作物</span><b>{{ selectedPlan.cropName || selectedPlan.crop }}</b></div><div><span>计划面积</span><b>{{ Number(selectedPlan.planArea || 0).toLocaleString() }} 亩</b></div><div><span>累计完成</span><b>{{ Number(selectedPlan.doneArea || 0).toLocaleString() }} 亩</b></div></div>
        <el-form label-position="top"><el-form-item label="填报类型"><div class="type-switch"><button :class="{active: form.type === 'sow'}" @click.prevent="form.type = 'sow'">播种</button><button :class="{active: form.type === 'harvest'}" @click.prevent="form.type = 'harvest'">收获</button></div></el-form-item><el-form-item :label="form.type === 'sow' ? '本次新增播种面积（亩）' : '本次新增收获面积（亩）'"><el-input-number v-model="form.incrementArea" :min="0" :max="Math.max(0, Number(selectedPlan.planArea || 0) - Number(selectedPlan.doneArea || 0))" :precision="1" controls-position="right" style="width:100%" /></el-form-item><el-form-item label="本次填报说明"><el-input v-model="form.remark" type="textarea" :rows="2" placeholder="如：本周新增播种面积" /></el-form-item></el-form>
        <div class="history-title"><b>本计划进度记录</b><span>每次新增均保留记录</span></div><div v-for="row in historyRows" :key="row.id" class="history-row"><span>{{ row.updatedAt || '2026-11-17' }}</span><span>新增 {{ Number(row.incrementArea || 0).toLocaleString() }} 亩</span><b>累计 {{ Number(row.sownArea || row.harvestedArea || 0).toLocaleString() }} 亩</b></div><el-empty v-if="!historyRows.length" description="暂无历史进度记录" :image-size="45" />
      </template>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存本次进度</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchProgressPlanOptions, fetchProgressReportRows, saveSowingProgress, saveHarvestProgress } from '@/api/gpm'
const userStore = useUserStore(); const year = 2026; const quarter = '第三季度'; const planOptions = ref([]); const rows = ref([]); const selectedPlan = ref(null); const dialogVisible = ref(false); const saving = ref(false); const form = reactive({ type: 'sow', incrementArea: 0, remark: '' })
const historyRows = computed(() => rows.value.filter(item => item.planId === selectedPlan.value?.planId && item.level === userStore.role?.code))
const load = async () => { planOptions.value = await fetchProgressPlanOptions(userStore.role, { year, quarter, type: form.type }); rows.value = await fetchProgressReportRows(userStore.role, { year, quarter, type: form.type }) }
const openEntry = item => { selectedPlan.value = item; form.incrementArea = 0; form.remark = ''; dialogVisible.value = true }
const save = async () => { if (!selectedPlan.value) return; const increment = Number(form.incrementArea || 0); const planArea = Number(selectedPlan.value.planArea || 0); const previous = Number(selectedPlan.value.doneArea || 0); if (previous + increment > planArea) return ElMessage.warning('本次新增面积不能超过剩余计划面积'); saving.value = true; const payload = { planId: selectedPlan.value.planId, planName: selectedPlan.value.planName, regionCode: selectedPlan.value.regionCode, regionName: selectedPlan.value.regionName, crop: selectedPlan.value.crop || selectedPlan.value.cropName, cropName: selectedPlan.value.cropName || selectedPlan.value.crop, planArea, year: selectedPlan.value.year, quarter: selectedPlan.value.quarter, remark: form.remark, progressIncrement: increment, ...(form.type === 'sow' ? { sownArea: increment } : { harvestedArea: increment }) }; const result = form.type === 'sow' ? await saveSowingProgress(payload, userStore.role) : await saveHarvestProgress(payload, userStore.role); saving.value = false; if (!result.success) return ElMessage.error(result.message || '保存失败'); ElMessage.success('本次进度已保存'); dialogVisible.value = false; await load() }
watch(() => form.type, load); onMounted(load)
</script>

<style lang="scss" scoped>
.entry-page{padding:0 2px}.context-card,.plan-list{background:#fff;border-radius:14px;padding:15px;margin-bottom:12px}.context-card{border:1px solid #d6eee5;background:#f8fcfa}.context-title,.section-title,.plan-meta,.history-title,.history-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.context-title{color:#176b58}.context-card p{margin:7px 0 0;color:#667085;font-size:12px;line-height:1.5}.section-title{color:#243b5a;margin-bottom:8px}.plan-card{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #edf0f5;padding:12px 0}.plan-card-main{min-width:0}.plan-card-main>b{color:#243b5a;font-size:14px}.plan-card-main p{margin:5px 0;color:#667085;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.plan-meta{justify-content:flex-start;color:#667085;font-size:11px}.plan-context{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:11px;margin-bottom:14px;background:#f4f8fb;border-radius:10px}.plan-context span,.plan-context b{display:block}.plan-context span{color:#98a2b3;font-size:11px}.plan-context b{margin-top:3px;color:#243b5a;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.type-switch{display:flex;gap:8px}.type-switch button{flex:1;border:1px solid #d9e2ec;border-radius:8px;background:#fff;padding:10px;color:#667085}.type-switch button.active{border-color:#2d8c72;background:#eaf6f1;color:#176b58;font-weight:600}.history-title{margin:14px 0 7px;color:#243b5a}.history-title span{color:#98a2b3;font-size:11px}.history-row{border-top:1px solid #edf0f5;padding:9px 0;color:#667085;font-size:11px}.history-row b{color:#176b58}
</style>
