<template>
  <div class="mobile-page">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>乡镇计划管理</b><span>{{ isTown ? '维护乡镇独立上报计划' : '审核乡镇上报计划' }}</span></div></div>

    <template v-if="isTown">
      <section class="info-card"><b>县级下达计划</b><p>县级下达计划用于参考和分配，乡镇上报计划需要单独填写。</p></section>
      <section class="list-card issued-card">
        <div class="section-title"><b>下达计划</b><el-tag size="small" type="info">参考</el-tag></div>
        <div v-for="item in plans" :key="item.id" class="issued-item">
          <div><b>{{ item.year }}年{{ item.quarter }} · {{ item.cropType }}</b><p>{{ Number(item.area || 0).toLocaleString() }} 亩 · {{ item.description }}</p></div>
          <el-tag size="small" type="success">已下达</el-tag>
        </div>
        <el-empty v-if="!plans.length" description="暂无县级下达计划" :image-size="55" />
      </section>
      <section class="form-card">
        <div class="section-title"><b>编制乡镇上报计划</b><el-tag size="small" type="warning">乡镇独立填报</el-tag></div>
        <el-form label-position="top">
          <el-form-item label="关联县级下达计划"><el-select v-model="form.planId" style="width:100%" placeholder="请选择计划" @change="selectPlan"><el-option v-for="plan in plans" :key="plan.id" :label="`${plan.year}年${plan.quarter}${plan.cropType}`" :value="plan.id" /></el-select></el-form-item>
          <el-form-item label="年度 / 周期"><div class="readonly-period">{{ form.year ? `${form.year}年${form.quarter}` : '选择参考计划后自动带出' }}</div></el-form-item>
          <el-form-item label="作物"><el-select v-model="form.cropType" placeholder="请选择一种作物" style="width:100%"><el-option label="小麦" value="小麦"/><el-option label="水稻" value="水稻"/><el-option label="玉米" value="玉米"/><el-option label="大豆" value="大豆"/></el-select></el-form-item>
          <el-form-item label="乡镇上报计划面积（万亩）"><el-input-number v-model="form.area" :min="0" :precision="2" controls-position="right" style="width:100%" /></el-form-item>
          <el-form-item label="填报说明"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="120" show-word-limit /></el-form-item>
        </el-form>
        <div class="reference-line"><span>种植主体分配面积（参考）</span><b>{{ subjectReferenceArea.toFixed(2) }} 万亩</b></div>
        <p class="muted">主体分配面积只作参考，不自动汇总为乡镇上报计划面积。</p>
        <div v-if="subjectRows.length" class="subject-reference-box">
          <div class="section-title"><b>种植主体分配参考</b><el-tag size="small" type="info">仅供参考</el-tag></div>
          <div v-for="row in subjectRows" :key="row.subjectId" class="subject-reference-row"><span>{{ row.subjectName }}</span><el-input-number v-model="row.targetArea" :min="0" :precision="1" controls-position="right" /></div>
          <el-button plain class="full-button" @click="saveSubjectReference">保存主体分配参考</el-button>
        </div>
      <el-button type="primary" class="full-button" @click="save">保存</el-button>
      </section>
      <section class="list-card"><div class="section-title"><b>我的乡镇上报计划</b><el-tag size="small">{{ reports.length }} 条</el-tag></div><div v-for="item in reports" :key="item.id" class="report-item"><div><b>{{ item.year }}年{{ item.quarter }} · {{ item.cropType }}</b><p>{{ Number(item.area || 0).toFixed(2) }} 万亩 · {{ item.updatedAt }}</p></div><div class="item-actions"><el-tag size="small" :type="tagType(item.status)">{{ item.status }}</el-tag><el-button v-if="['草稿','已驳回'].includes(item.status)" link type="primary" @click="edit(item)">编辑</el-button><el-button v-if="['草稿','已驳回'].includes(item.status)" link type="success" @click="submit(item)">上报</el-button></div></div><el-empty v-if="!reports.length" description="暂无乡镇上报计划" :image-size="55" /></section>
    </template>

    <template v-else>
      <section class="list-card issued-card">
        <div class="section-title"><b>上级下达计划</b><el-tag size="small" type="info">参考</el-tag></div>
        <div v-for="item in plans" :key="item.id" class="issued-item">
          <div><b>{{ item.year }}年{{ item.quarter }} · {{ item.cropType }}</b><p>{{ Number(item.area || 0).toLocaleString() }} 亩 · {{ item.description }}</p></div>
          <el-tag size="small" type="success">已下达</el-tag>
        </div>
        <el-empty v-if="!plans.length" description="暂无上级下达计划" :image-size="55" />
        <p class="muted">下达计划只作编制参考，县级正式上报以本级上报计划为准。</p>
      </section>
      <section class="list-card"><div class="section-title"><b>乡镇上报计划</b><el-tag size="small" type="warning">待审核 {{ pendingReports.length }} 条</el-tag></div><div v-for="item in reports" :key="item.id" class="report-item"><div><b>{{ item.townName }} · {{ item.year }}年{{ item.quarter }}</b><p>{{ item.cropType }} · {{ Number(item.area).toFixed(2) }} 万亩</p><small>主体分配参考：{{ Number(item.subjectReferenceArea || 0).toFixed(2) }} 万亩</small></div><div class="item-actions"><el-tag size="small" :type="tagType(item.status)">{{ item.status }}</el-tag><el-button v-if="item.status === '待县级审核'" link type="success" @click="audit(item, true)">通过</el-button><el-button v-if="item.status === '待县级审核'" link type="danger" @click="audit(item, false)">退回</el-button></div></div><el-empty v-if="!reports.length" description="暂无乡镇上报计划，县级流程不受影响" :image-size="60" /></section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchIssuedPlantingPlans, fetchPlantingPlanSubjectTasks, savePlantingPlanSubjectTasks, fetchTownPlanReports, saveTownPlanReport, submitTownPlanReport, auditTownPlanReport } from '@/api/gpm'

defineProps({ embedded: { type: Boolean, default: false } })

const userStore = useUserStore()
const isTown = computed(() => userStore.role?.code === 'town')
const plans = ref([])
const reports = ref([])
const subjectRows = ref([])
const form = reactive({ id: '', planId: '', year: '', quarter: '', cropType: '', area: 0, remark: '' })
const subjectReferenceArea = computed(() => subjectRows.value.reduce((sum, item) => sum + Number(item.targetArea || 0) / 10000, 0))
const tagType = status => ({ 草稿: 'info', 待县级审核: 'warning', 审核通过: 'success', 已驳回: 'danger' }[status] || 'info')
const pendingReports = computed(() => reports.value.filter(item => item.status === '待县级审核'))
const load = async () => {
  plans.value = await fetchIssuedPlantingPlans(userStore.role, {})
  reports.value = await fetchTownPlanReports(userStore.role)
  if (isTown.value && form.planId) subjectRows.value = await fetchPlantingPlanSubjectTasks(form.planId, userStore.role)
}
const selectPlan = async () => { subjectRows.value = form.planId ? await fetchPlantingPlanSubjectTasks(form.planId, userStore.role) : []; const plan = plans.value.find(item => item.id === form.planId); if (plan) { form.year = plan.year; form.quarter = plan.quarter; form.cropType = plan.cropType } }
const edit = async (item) => { Object.assign(form, { id: item.id, planId: item.planId, year: item.year, quarter: item.quarter, cropType: item.cropType, area: Number(item.area || 0), remark: item.remark || '' }); subjectRows.value = await fetchPlantingPlanSubjectTasks(item.planId, userStore.role) }
const saveSubjectReference = async () => { if (!form.planId) return ElMessage.warning('请先选择县级参考计划'); const result = await savePlantingPlanSubjectTasks(form.planId, subjectRows.value, userStore.role); if (!result.success) return ElMessage.error(result.message); subjectRows.value = result.rows || subjectRows.value; ElMessage.success('主体分配参考已保存') }
const save = async () => { if (!form.planId || !form.cropType) return ElMessage.warning('请选择计划并填写作物类型'); const result = await saveTownPlanReport({ ...form, subjectReferenceArea: subjectReferenceArea.value }, userStore.role); if (!result.success) return ElMessage.error(result.message); ElMessage.success('乡镇上报计划已保存'); await load() }
const submit = async item => { const result = await submitTownPlanReport(item.id, userStore.role); if (!result.success) return ElMessage.error(result.message); ElMessage.success('已提交县级审核'); await load() }
const audit = async (item, approved) => { let opinion = ''; try { if (approved) await ElMessageBox.confirm(`确认通过${item.townName}的乡镇上报计划吗？`, '审核确认'); else opinion = (await ElMessageBox.prompt('请填写退回意见', '退回计划', { inputType: 'textarea' })).value } catch { return } const result = await auditTownPlanReport(item.id, approved, opinion, userStore.role); if (!result.success) return ElMessage.error(result.message); ElMessage.success(approved ? '已审核通过' : '已退回'); await load() }
onMounted(load)
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.info-card,.form-card,.list-card{background:#fff;border-radius:12px;padding:15px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;gap:8px;color:#1f3c68}.mobile-head b{display:block;font-size:19px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;padding:0 8px 4px 0}.info-card{border:1px solid #d6eee5;background:#f8fcfa;color:#176b58}.info-card p,.muted{font-size:12px;color:#667085;line-height:1.5;margin:7px 0 0}.section-title,.report-item,.item-actions,.reference-line{display:flex;align-items:center;justify-content:space-between;gap:8px}.section-title{color:#243b5a;margin-bottom:12px}.reference-line{padding:10px;background:#f4f8fb;border-radius:8px;color:#667085;font-size:12px}.reference-line b{color:#176b58}.subject-reference-box{margin-top:10px;padding:10px;border:1px dashed #cbd9e8;border-radius:8px;background:#fbfdff}.subject-reference-box .section-title{margin-bottom:6px}.subject-reference-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid #edf0f5;color:#44546a;font-size:12px}.subject-reference-row :deep(.el-input-number){width:150px}.full-button{width:100%;margin-top:10px}.report-item{padding:12px 0;border-top:1px solid #edf0f5}.report-item b{font-size:14px;color:#243b5a}.report-item p,.report-item small{display:block;color:#667085;font-size:12px;margin:5px 0 0}.item-actions{flex-shrink:0}.item-actions :deep(.el-button){padding:0 2px}
.issued-card{border:1px solid #d6eee5;background:#fbfefc}.issued-item{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #edf0f5;padding:11px 0}.issued-item b{color:#243b5a;font-size:13px}.issued-item p{margin:5px 0 0;color:#667085;font-size:11px;line-height:1.4}</style>


