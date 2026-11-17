<template>
  <div class="report-panel">
    <el-alert class="flow-alert" type="info" :closable="false" :title="flowDescription" />

    <div class="panel toolbar-panel">
      <el-form :inline="true" class="filters">
        <el-form-item label="年份"><el-select v-model="filters.year" style="width:120px" @change="loadAll"><el-option v-for="item in years" :key="item" :label="`${item}年`" :value="item" /></el-select></el-form-item>
        <el-form-item label="周期"><el-select v-model="filters.quarter" style="width:130px" @change="loadAll"><el-option v-for="item in quarters" :key="item" :label="item" :value="item" /></el-select></el-form-item>
        <el-button type="primary" @click="loadAll">刷新</el-button>
      </el-form>
      <div class="scope-label">当前范围：{{ role.regionName || '安徽省' }}</div>
    </div>

    <div class="metric-grid">
      <div class="metric-card"><span>本级计划面积</span><strong>{{ summary.planArea.toLocaleString() }}</strong><small>亩（{{ filters.year }}年{{ filters.quarter }}）</small></div>
      <div class="metric-card blue"><span>{{ isSow ? '已播面积' : '已收获面积' }}</span><strong>{{ summary.doneArea.toLocaleString() }}</strong><small>持续更新数据</small></div>
      <div class="metric-card green"><span>{{ isSow ? '播种' : '收获' }}进度</span><strong>{{ summary.progress }}%</strong><small>已完成 / 本级计划</small></div>
      <div class="metric-card orange"><span>下级填报情况</span><strong>{{ childFilledCount }}/{{ childCount }}</strong><small>{{ roleCode === 'county' ? '乡镇覆盖情况' : '主体填报情况' }}</small></div>
    </div>

    <div class="panel">
      <div class="panel-title"><span class="title-text">下级进度明细</span><span class="title-extra">点击下级名称可逐级查看，不产生审核单据</span></div>
      <div class="toolbar"><el-breadcrumb separator="/"><el-breadcrumb-item v-for="item in breadcrumbs" :key="item.code"><span class="breadcrumb-link" @click="goToLevel(item)">{{ item.name }}</span></el-breadcrumb-item></el-breadcrumb><span class="record-count">共 {{ drillRows.length }} 条</span></div>
      <el-table :data="drillRows" stripe border max-height="360">
        <el-table-column type="index" label="序号" width="65" align="center" />
        <el-table-column v-if="currentDrillLevel !== 'subject'" :label="childLabel" min-width="170"><template #default="{ row }"><el-button link type="primary" @click="openLevel(row)">{{ row.name }}</el-button></template></el-table-column>
        <el-table-column v-if="currentDrillLevel === 'subject'" prop="subjectName" label="种植主体" min-width="200" show-overflow-tooltip />
        <el-table-column v-if="currentDrillLevel === 'subject'" prop="cropName" :label="isSow ? '已播作物' : '收获作物'" width="100" />
        <el-table-column prop="planArea" label="计划面积（亩）" width="160" align="right" />
        <el-table-column prop="doneArea" :label="isSow ? '已播面积（亩）' : '已收获面积（亩）'" width="150" align="right" />
        <el-table-column label="进度" width="180"><template #default="{ row }"><div class="progress-cell"><el-progress :percentage="Number(row.progress || 0)" :stroke-width="10" /><span>{{ Number(row.progress || 0) }}%</span></div></template></el-table-column>
        <el-table-column v-if="currentDrillLevel === 'subject'" prop="updatedAt" label="最近更新" width="110" />
        <el-table-column v-if="currentDrillLevel !== 'subject'" label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openLevel(row)">查看下级</el-button></template></el-table-column>
        <template #empty><el-empty description="当前层级暂无进度数据" /></template>
      </el-table>
    </div>

    <div v-if="canReport" class="panel">
      <div class="panel-title"><span class="title-text">维护本级{{ isSow ? '播种' : '收获' }}进度</span><span class="title-extra">保存后可随时继续更新，不走审核流程</span></div>
      <el-alert type="info" :closable="false" class="report-tip" :title="roleCode === 'town' ? '乡镇可汇总已接入的种植主体进度，也可以代种植主体填写；不要求所有主体都完成填报。' : '县级可汇总乡镇进度，也可以代乡镇填写；县级上报时需要覆盖本县全部乡镇。'" />
      <el-form :inline="true" :model="progressForm" class="progress-form">
        <el-form-item label="填报对象"><el-select v-model="progressForm.regionCode" placeholder="选择对象" style="width:190px"><el-option v-for="item in editableRows" :key="item.regionCode" :label="item.regionName" :value="item.regionCode" /></el-select></el-form-item>
        <el-form-item label="作物"><el-input v-model="progressForm.crop" placeholder="如：小麦" style="width:140px" /></el-form-item>
        <el-form-item label="计划面积（亩）"><el-input-number v-model="progressForm.planArea" :min="0" :precision="1" controls-position="right" /></el-form-item>
        <el-form-item :label="isSow ? '已播面积（亩）' : '已收获面积（亩）'"><el-input-number v-model="progressForm.doneArea" :min="0" :precision="1" controls-position="right" /></el-form-item>
        <el-button type="primary" @click="saveProgress">保存更新</el-button>
        <el-button type="success" @click="submitProgress">提交本级进度</el-button>
      </el-form>
      <div class="update-footer"><span>{{ roleCode === 'county' ? `乡镇覆盖：${childFilledCount}/${childCount}` : `主体填报：${childFilledCount}/${childCount}` }}</span><div><el-tag :type="roleCode === 'county' && childFilledCount < childCount ? 'warning' : 'success'">{{ roleCode === 'county' && childFilledCount < childCount ? '仍需补齐乡镇数据' : '可持续更新' }}</el-tag><span class="submit-note">提交后仍可继续更新，不进入审核队列</span></div></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchProgressReportRows, saveSowingProgress, saveHarvestProgress } from '@/api/gpm'
import { getRegion } from '@/mock/common/regions'
import { useUserStore } from '@/stores/user'

const props = defineProps({ type: { type: String, default: 'sow' } })
const userStore = useUserStore(); const role = computed(() => userStore.role || {}); const roleCode = computed(() => role.value.code); const regionCode = computed(() => role.value.regionCode || '340000'); const isSow = computed(() => props.type === 'sow')
const years = [2026, 2025, 2024]; const quarters = ['全年', '第一季度', '第二季度', '第三季度', '第四季度']; const filters = reactive({ year: 2026, quarter: '第三季度' }); const rows = ref([]); const progressForm = reactive({ regionCode: '', crop: '', planArea: 0, doneArea: 0 }); const drillCode = ref(''); const breadcrumbs = ref([])
const canReport = computed(() => ['town', 'county'].includes(roleCode.value)); const flowDescription = computed(() => roleCode.value === 'county' ? '县级维护本县进度，可汇总或代填乡镇数据；县级展示和提交口径需要覆盖全部乡镇。' : '乡镇维护本镇进度，可汇总或代填种植主体数据；主体未全部接入不影响乡镇持续更新。')
const isSubjectLevel = computed(() => drillCode.value && (!getRegion(drillCode.value)?.children?.length || childLevelOf(drillCode.value) === 'subject'))
const childLevelOf = code => { if (!code || code === '340000') return 'city'; if (String(code).length === 6 && String(code).endsWith('00')) return 'county'; if (String(code).length === 6) return 'town'; return 'subject' }
const currentDrillLevel = computed(() => childLevelOf(drillCode.value || regionCode.value)); const childLabel = computed(() => ({ city: '市级地区', county: '县级地区', town: '乡镇地区', subject: '种植主体' }[currentDrillLevel.value] || '下级对象'))
const sumOf = list => { const planArea = list.reduce((s, i) => s + Number(i.planArea || 0), 0); const doneArea = list.reduce((s, i) => s + Number((isSow.value ? i.sownArea : i.harvestedArea) || 0), 0); return { planArea: Number(planArea.toFixed(1)), doneArea: Number(doneArea.toFixed(1)), progress: planArea ? Number((doneArea / planArea * 100).toFixed(1)) : 0 } }
const scopedRows = computed(() => rows.value.filter(item => Number(item.year) === Number(filters.year) && (!filters.quarter || filters.quarter === '全年' || item.quarter === filters.quarter)))
const rowsIn = code => scopedRows.value.filter(item => String(item.regionCode || '').startsWith(String(code)))
const drillRows = computed(() => { const code = drillCode.value || regionCode.value; const region = getRegion(code); const level = childLevelOf(code); if (level === 'subject' || !region?.children?.length) return rowsIn(code).filter(item => item.level === 'subject').map(item => ({ ...item, doneArea: Number((isSow.value ? item.sownArea : item.harvestedArea) || 0), progress: item.planArea ? Number((Number((isSow.value ? item.sownArea : item.harvestedArea) || 0) / Number(item.planArea) * 100).toFixed(1)) : 0 })); return (region.children || []).map(child => ({ code: child.code, name: child.name, ...sumOf(rowsIn(child.code).filter(item => item.level === level)) })).filter(item => item.planArea > 0) })
const summary = computed(() => sumOf(scopedRows.value.filter(item => item.level === roleCode.value || item.regionCode === regionCode.value)))
const editableRows = computed(() => rows.value.filter(item => item.regionCode && (item.level === roleCode.value || item.level === (roleCode.value === 'county' ? 'town' : 'subject'))).reduce((list, item) => list.some(row => row.regionCode === item.regionCode && row.crop === item.crop) ? list : [...list, item], []))
const childCount = computed(() => new Set(rows.value.filter(item => item.level === (roleCode.value === 'county' ? 'town' : 'subject')).map(item => item.regionCode)).size)
const childFilledCount = computed(() => new Set(rows.value.filter(item => item.level === (roleCode.value === 'county' ? 'town' : 'subject') && Number((isSow.value ? item.sownArea : item.harvestedArea) || 0) > 0).map(item => item.regionCode)).size)
const openLevel = row => { drillCode.value = row.code; breadcrumbs.value = [...breadcrumbs.value, row] }
const goToLevel = item => { const index = breadcrumbs.value.findIndex(row => row.code === item.code); if (index < 0) return; breadcrumbs.value = breadcrumbs.value.slice(0, index + 1); drillCode.value = item.code }
const loadAll = async () => { rows.value = await fetchProgressReportRows(role.value, { type: props.type, year: filters.year, quarter: filters.quarter }); const root = { code: regionCode.value, name: role.value.regionName || '本区域' }; breadcrumbs.value = [root]; drillCode.value = root.code; const first = editableRows.value[0]; if (first) { progressForm.regionCode = first.regionCode; progressForm.crop = first.cropName || first.crop || ''; progressForm.planArea = Number(first.planArea || 0); progressForm.doneArea = Number((isSow.value ? first.sownArea : first.harvestedArea) || 0) } }
const saveProgress = async () => { if (!progressForm.regionCode || !progressForm.crop) return ElMessage.warning('请选择填报对象并填写作物'); const payload = { ...progressForm, regionName: editableRows.value.find(item => item.regionCode === progressForm.regionCode)?.regionName || role.value.regionName, year: filters.year, quarter: filters.quarter }; const result = isSow.value ? await saveSowingProgress({ ...payload, sownArea: Number(progressForm.doneArea) }, role.value) : await saveHarvestProgress({ ...payload, harvestedArea: Number(progressForm.doneArea) }, role.value); if (!result.success) return ElMessage.error(result.message); ElMessage.success('进度已更新'); await loadAll() }
const submitProgress = () => { if (roleCode.value === 'county' && childFilledCount.value < childCount.value) return ElMessage.info(`当前已覆盖 ${childFilledCount.value}/${childCount.value} 个乡镇，可继续补填后提交；本次仅作演示`); ElMessage.success('本级进度已提交，后续仍可继续更新，不进入审核流程') }
onMounted(loadAll)
</script>

<style lang="scss" scoped>
.report-panel{display:flex;flex-direction:column;gap:12px}.flow-alert :deep(.el-alert__title){font-size:13px}.toolbar-panel{display:flex;align-items:center;justify-content:space-between}.toolbar-panel .filters{display:flex;align-items:center;margin:0}.toolbar-panel :deep(.el-form-item){margin:0 12px 0 0}.scope-label{color:#606266;font-size:13px}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric-card{padding:14px 16px;background:#fff;border-left:4px solid #8a97a8;border-radius:8px;box-shadow:0 1px 4px rgba(15,62,120,.06)}.metric-card.blue{border-color:var(--ah-primary,#1668DC)}.metric-card.green{border-color:var(--ah-success,#2d8c72)}.metric-card.orange{border-color:#d9942d}.metric-card span,.metric-card small{display:block;color:var(--ah-text-secondary,#718096);font-size:12px}.metric-card strong{display:block;margin:5px 0 2px;font-size:22px;color:var(--ah-text,#1f2937)}.panel{background:#fff;border:1px solid #e8edf3;border-radius:8px;padding:16px}.panel-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.title-text{font-weight:600;color:var(--ah-text,#1f2937)}.title-extra{color:var(--ah-text-secondary,#718096);font-size:12px}.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.breadcrumb-link{color:#409eff;cursor:pointer}.record-count{color:#909399;font-size:13px}.progress-cell{display:flex;align-items:center;gap:8px}.progress-cell :deep(.el-progress){flex:1}.progress-cell span{width:44px;color:#606266;text-align:right;font-size:12px}.report-tip{margin-bottom:12px}.update-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #edf0f5;color:#606266;font-size:13px}.submit-note{margin-left:10px;color:#98a2b3;font-size:12px}@media (max-width:900px){.metric-grid{grid-template-columns:repeat(2,1fr)}}
</style>
