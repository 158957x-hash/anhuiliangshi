<template>
  <div class="page-container report-page">
    <div class="page-head">
      <div><h2>上报计划</h2><p>{{ isCity ? '汇总查看各县上报数据，并形成市级上报计划。' : '查看当前角色已创建的上报记录，并新增本次粮食计划上报。' }}</p></div>
      <el-button type="primary" @click="openCreate">新增上报计划</el-button>
    </div>

    <div class="summary-grid">
      <div><span>上报记录</span><strong>{{ records.length }}</strong><small>当前角色历史记录</small></div>
      <div><span>待审核</span><strong>{{ records.filter(item => item.status === '待审核').length }}</strong><small>等待上级处理</small></div>
      <div><span>已通过</span><strong>{{ records.filter(item => item.status === '已通过').length }}</strong><small>审核通过记录</small></div>
      <div><span>本页对象</span><strong>{{ targetLabel }}</strong><small>本次上报明细对象</small></div>
    </div>

    <div class="panel">
      <div class="toolbar">
        <el-form :inline="true">
          <el-form-item label="关键字"><el-input v-model="filters.keyword" clearable placeholder="上报单号或计划作物" style="width:220px" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="filters.status" clearable placeholder="全部" style="width:130px"><el-option v-for="item in statuses" :key="item" :label="item" :value="item" /></el-select></el-form-item>
          <el-button type="primary" @click="loadRecords">查询</el-button>
        </el-form>
      </div>
      <el-table :data="filteredRecords" border stripe>
        <el-table-column prop="id" label="上报单号" min-width="190" />
        <el-table-column label="关联计划" min-width="210"><template #default="{ row }">{{ planText(row.planId) }}</template></el-table-column>
        <el-table-column prop="targetLevel" label="上报对象" width="110" />
        <el-table-column prop="sourceType" label="填报方式" width="120" />
        <el-table-column prop="totalArea" label="明细合计（万亩）" width="150" align="right" />
        <el-table-column prop="status" label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="125" />
        <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openRecord(row)">{{ row.status === '草稿' || row.status === '已驳回' ? '编辑' : '查看' }}</el-button></template></el-table-column>
      </el-table>
      <el-empty v-if="!filteredRecords.length" description="暂无上报记录，可点击右上角新增上报计划" />
    </div>

    <el-dialog v-model="dialogVisible" :title="editingRecord ? '编辑上报计划' : '新增上报计划'" width="1120px" top="5vh" destroy-on-close>
      <el-form label-width="100px" class="report-form">
        <el-form-item label="关联计划" required>
          <el-select v-model="selectedPlanId" placeholder="请选择已有粮食计划" style="width:430px" :disabled="!!editingRecord" @change="loadDialogDetail">
            <el-option v-for="item in plans" :key="item.id" :label="`${item.year}年${item.quarter}${item.cropType}（${item.area}万亩）`" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template v-if="dialogPlan">
        <div class="dialog-summary">
          <div><span>关联粮食计划</span><b>{{ dialogPlan.year }}年{{ dialogPlan.quarter }} · {{ dialogPlan.cropType }}</b></div>
          <div><span>计划面积</span><b>{{ dialogPlan.area }} 万亩</b></div>
          <div><span>上报对象</span><b>{{ targetLabel }}</b></div>
          <div><span>明细合计</span><b class="primary-text">{{ totalArea.toFixed(2) }} 万亩</b></div>
        </div>
        <el-alert v-if="report?.status === '已驳回'" :title="`审核意见：${report.reviewComment || '请修改后重新提交'}`" type="warning" show-icon :closable="false" class="alert" />
        <div class="detail-title"><b>{{ targetLabel }}逐项明细</b><span>{{ isCity ? '县级数据只读展示，市级不直接修改县级填报内容' : '本级合计由明细自动汇总' }}</span><el-button v-if="editingRecord && !isCity" size="small" @click="syncData">同步下级数据</el-button></div>
        <el-table :data="details" border stripe max-height="430">
          <el-table-column type="index" label="#" width="55" />
          <el-table-column prop="childName" :label="targetLabel" min-width="190" />
          <el-table-column prop="source" label="明细来源" width="110"><template #default="{ row }"><el-tag size="small" :type="row.source === 'sync' ? 'success' : 'info'">{{ row.source === 'sync' ? '同步' : '手工填报' }}</el-tag></template></el-table-column>
          <el-table-column v-if="isCity" label="县级填报状态" width="130"><template #default="{ row }"><el-tag size="small" :type="countyStatusType(row.countyStatus)">{{ row.countyStatus || '已填报' }}</el-tag></template></el-table-column>
          <el-table-column v-if="isCity" label="县级审核状态" width="130"><template #default="{ row }"><el-tag size="small" :type="auditStatusType(row.auditStatus)">{{ row.auditStatus || '待审核' }}</el-tag></template></el-table-column>
          <el-table-column label="作物" width="140"><template #default="{ row }"><span v-if="isCity">{{ row.cropName }}</span><el-select v-else v-model="row.cropName" size="small" @change="syncCrop(row)"><el-option v-for="crop in crops" :key="crop.id" :label="crop.name" :value="crop.name" /></el-select></template></el-table-column>
          <el-table-column label="计划面积（万亩）" width="180" align="right"><template #default="{ row }"><span v-if="isCity">{{ row.planArea }}</span><el-input-number v-else v-model="row.planArea" :min="0" :precision="2" :step="1" controls-position="right" /></template></el-table-column>
          <el-table-column label="说明" min-width="180"><template #default="{ row }"><span v-if="isCity">{{ row.remark || '县级填报数据' }}</span><el-input v-else v-model="row.remark" placeholder="填写说明" /></template></el-table-column>
        </el-table>
        <div class="table-footer"><span>共 {{ details.length }} 个{{ targetLabel }}明细</span><b>本级自动合计：{{ totalArea.toFixed(2) }} 万亩</b></div>
      </template>
      <el-empty v-if="!dialogPlan" description="请选择关联粮食计划" />
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button @click="save(false)">保存草稿</el-button><el-button type="primary" @click="save(true)">提交上报</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchCrops, fetchReportablePlans, fetchPlanReportDetail, fetchPlanReportRecords, createPlanReport, submitPlanReport, syncChildReportData } from '@/api/gpm'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const plans = ref([]); const crops = ref([]); const records = ref([])
const dialogVisible = ref(false); const editingRecord = ref(null); const selectedPlanId = ref(''); const dialogPlan = ref(null); const report = ref(null); const details = ref([])
const filters = reactive({ keyword: '', status: '' }); const statuses = ['草稿', '待审核', '已通过', '已驳回']
const labels = { county: '县级', town: '乡镇', subject: '种植主体', plot: '地块' }
const isCity = computed(() => userStore.role?.code === 'city')
const targetLabel = computed(() => labels[{ city: 'county', county: 'town', town: 'subject', grower: 'plot' }[userStore.role?.code]] || '下一级对象')
const countyStatusType = status => ({ 已填报: 'success', 未填报: 'info', 部分填报: 'warning' }[status] || 'info')
const auditStatusType = status => ({ 已通过: 'success', 待审核: 'warning', 未提交: 'info', 已驳回: 'danger' }[status] || 'info')
const totalArea = computed(() => details.value.reduce((sum, row) => sum + Number(row.planArea || 0), 0))
const filteredRecords = computed(() => records.value.filter(row => (!filters.status || row.status === filters.status) && (!filters.keyword || `${row.id}${planText(row.planId)}`.includes(filters.keyword))))
const planText = id => { const item = plans.value.find(plan => plan.id === id); return item ? `${item.year}年${item.quarter}${item.cropType}` : id }
const statusType = status => ({ 草稿: 'info', 待审核: 'warning', 已通过: 'success', 已驳回: 'danger' }[status] || 'info')
const syncCrop = row => { const item = crops.value.find(crop => crop.name === row.cropName); if (item) row.cropId = item.code }
const loadRecords = async () => { records.value = await fetchPlanReportRecords(userStore.role) }
const loadDialogDetail = async () => { if (!selectedPlanId.value) return; const data = await fetchPlanReportDetail(editingRecord.value?.id || '', userStore.role, selectedPlanId.value); dialogPlan.value = data.plan; report.value = data.report; details.value = data.details }
const openCreate = async () => { editingRecord.value = null; report.value = null; selectedPlanId.value = ''; dialogPlan.value = null; details.value = []; if (!plans.value.length) plans.value = await fetchReportablePlans(userStore.role); dialogVisible.value = true }
const openRecord = async row => { editingRecord.value = row; selectedPlanId.value = row.planId; await loadDialogDetail(); dialogVisible.value = true }
const save = async submit => { if (!selectedPlanId.value || !details.value.length) return ElMessage.warning('请选择关联计划并填写明细'); const result = await createPlanReport({ planId: selectedPlanId.value, details: details.value }, userStore.role); if (!result.success) return ElMessage.error(result.message); report.value = result.report; details.value = result.details; if (submit) { const submitted = await submitPlanReport(report.value.id, userStore.role); if (!submitted.success) return ElMessage.error(submitted.message); report.value = submitted.report; ElMessage.success('已提交上报') } else ElMessage.success('草稿已保存'); await loadRecords() }
const syncData = async () => { if (!report.value) return ElMessage.info('请先保存草稿'); const result = await syncChildReportData(report.value.id, userStore.role); if (result.success) { details.value = result.details; ElMessage.success('已同步下级数据') } }
onMounted(async () => { crops.value = await fetchCrops({ enabled: true }); plans.value = await fetchReportablePlans(userStore.role); await loadRecords() })
</script>

<style scoped lang="scss">
.report-page{overflow:auto}.page-head{display:flex;justify-content:space-between;align-items:flex-start}.page-head h2{margin:4px 0}.page-head p,.summary-grid small,.detail-title span{color:var(--ah-text-secondary);font-size:13px}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:15px 0}.summary-grid>div{background:#fff;border-left:4px solid var(--ah-primary);border-radius:8px;padding:14px 16px;box-shadow:0 1px 4px rgba(15,62,120,.06)}.summary-grid span,.summary-grid small{display:block}.summary-grid strong{display:block;font-size:22px;margin:7px 0}.toolbar{margin-bottom:14px}.dialog-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:#f5f8fc;border-radius:8px;padding:14px;margin-bottom:16px}.dialog-summary span,.dialog-summary b{display:block}.dialog-summary span{color:var(--ah-text-secondary);font-size:12px;margin-bottom:6px}.primary-text{color:var(--ah-primary)}.alert{margin-bottom:12px}.detail-title{display:flex;align-items:center;gap:14px;margin:12px 0}.detail-title span{margin-right:auto}.table-footer{display:flex;justify-content:space-between;padding:14px 4px;color:var(--ah-text-secondary)}.table-footer b{color:var(--ah-primary)}
</style>
