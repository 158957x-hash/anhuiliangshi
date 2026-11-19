<template>
  <div class="page-container plan-page">
    <div class="page-head">
      <div><h2>种植计划管理</h2><p>{{ userStore.role?.code === 'province' ? '制定省级计划并向各市下达参考计划。' : userStore.role?.code === 'city' ? '查看省级下达计划，编制市级上报计划，并向各县下达参考计划。' : '查看市级下达计划，编制县级上报计划，并向各乡镇下达参考计划。' }}</p></div>
      <el-button v-if="userStore.role?.code === 'province'" type="primary" @click="openCreate">新增种植计划</el-button>
    </div>

    <div class="panel">
      <div class="panel-title"><span class="title-text">计划列表</span><span class="title-extra">共 {{ rows.length }} 条计划</span></div>
      <el-form :inline="true" class="filters">
        <el-form-item label="年份"><el-select v-model="filters.year" clearable placeholder="全部年份" style="width:130px"><el-option v-for="year in years" :key="year" :label="`${year}年`" :value="year"/></el-select></el-form-item>
        <el-form-item label="季度"><el-select v-model="filters.quarter" clearable placeholder="全部季度" style="width:140px"><el-option v-for="quarter in quarters" :key="quarter" :label="quarter" :value="quarter"/></el-select></el-form-item>
        <el-form-item label="关键词"><el-input v-model="filters.keyword" clearable placeholder="作物类型或计划说明" @keyup.enter="load"/></el-form-item>
        <el-button type="primary" @click="load">查询</el-button><el-button @click="reset">重置</el-button>
      </el-form>
      <el-table :data="rows" stripe border>
        <el-table-column prop="year" label="年份" width="90"/>
        <el-table-column prop="quarter" label="季度" width="110"/>
        <el-table-column prop="area" label="计划种植面积（万亩）" width="150" align="right"/>
        <el-table-column prop="cropType" label="作物类型" width="150"/>
        <el-table-column prop="description" label="计划说明" min-width="280" show-overflow-tooltip/>
        <el-table-column label="附件" min-width="220">
          <template #default="{ row }">
            <template v-if="userStore.role?.code === 'province'">
              <el-upload action="#" :auto-upload="false" :show-file-list="false" @change="(file) => attachFile(row, file)"><el-button link type="primary">{{ row.attachmentName ? '重新上传' : '上传附件' }}</el-button></el-upload>
            </template>
            <span v-if="row.attachmentName" class="attachment-name">{{ row.attachmentName }}</span>
            <span v-else class="attachment-empty">未上传</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="125"><template #default="{ row }"><el-tag size="small" :type="['市级上报已通过', '县级上报已通过', '已分解'].includes(row.status) ? 'success' : ['市级上报已退回', '县级上报已退回'].includes(row.status) ? 'danger' : 'warning'">{{ row.status || '未上报' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="180" fixed="right"><template #default="{ row }"><div class="action-buttons"><el-button link type="primary" @click="showDetail(row)">查看计划</el-button><el-button v-if="userStore.role?.code !== 'province'" link type="primary" @click="openEdit(row)">编制</el-button><el-button v-if="userStore.role?.code === 'province'" link type="primary" @click="openEdit(row)">编辑</el-button><el-button v-if="userStore.role?.code === 'province'" link type="danger" @click="removePlan(row)">删除</el-button></div></template></el-table-column>
      </el-table>
      <el-empty v-if="!rows.length" description="暂无种植计划"/>
    </div>

    <el-dialog v-model="formVisible" :title="form.id ? '编辑种植计划' : '新增种植计划'" width="620px">
      <el-form :model="form" label-width="105px">
        <el-form-item label="年份" required><el-date-picker v-model="form.year" type="year" value-format="YYYY" style="width:100%"/></el-form-item>
        <el-form-item label="季度" required><el-select v-model="form.quarter" style="width:100%"><el-option v-for="quarter in quarters" :key="quarter" :label="quarter" :value="quarter"/></el-select></el-form-item>
        <el-form-item label="计划种植面积" required><div class="unit-input"><el-input-number v-model="form.area" :min="0" :precision="0"/><span>万亩</span></div></el-form-item>
        <el-form-item label="作物" required><el-select v-model="form.cropType" placeholder="请选择一种作物" style="width:100%"><el-option v-for="crop in cropOptions" :key="crop" :label="crop" :value="crop"/></el-select></el-form-item>
        <el-form-item label="计划说明" required><el-input v-model="form.description" type="textarea" :rows="4" maxlength="200" show-word-limit/></el-form-item>
        <el-form-item label="附件"><el-upload action="#" :auto-upload="false" :show-file-list="false" @change="(file) => form.attachmentName = file.name"><el-button>选择附件</el-button></el-upload><span v-if="form.attachmentName" class="attachment-name">{{ form.attachmentName }}</span></el-form-item>
      </el-form>
      <template #footer><el-button @click="formVisible=false">取消</el-button><el-button type="primary" @click="save">保存计划</el-button></template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="参考计划与本级上报计划" width="1050px">
      <template v-if="current">
        <el-descriptions :column="3" border><el-descriptions-item label="年份">{{ current.year }}年</el-descriptions-item><el-descriptions-item label="季度">{{ current.quarter }}</el-descriptions-item><el-descriptions-item label="计划种植面积">{{ current.area }} 万亩</el-descriptions-item><el-descriptions-item label="作物类型">{{ current.cropType }}</el-descriptions-item><el-descriptions-item label="附件">{{ current.attachmentName || '未上传' }}</el-descriptions-item><el-descriptions-item label="状态"><el-tag size="small">{{ current.status }}</el-tag></el-descriptions-item><el-descriptions-item label="计划说明" :span="3">{{ current.description }}</el-descriptions-item></el-descriptions>
        <div class="detail-title"><b>{{ taskTitle }}</b></div>
        <el-table v-if="userStore.role?.code !== 'town'" :data="cityRows" stripe border max-height="390"><el-table-column :prop="taskRegionField" :label="taskRegionLabel" min-width="140"/><el-table-column prop="targetArea" :label="taskAreaLabel" width="150" align="right"/><el-table-column prop="cropType" label="作物类型" min-width="150"/><el-table-column prop="status" label="分解状态" width="110"><template #default="{ row }"><el-tag size="small" :type="row.status === '已分解' ? 'success' : 'warning'">{{ row.status }}</el-tag></template></el-table-column><el-table-column prop="updatedAt" label="更新时间" width="120"/></el-table><el-table v-else :data="subjectRows" stripe border max-height="390"><el-table-column prop="subjectName" label="种植大户/主体" min-width="220"/><el-table-column prop="owner" label="负责人" width="100"/><el-table-column prop="villageName" label="村" width="110"/><el-table-column prop="targetArea" label="主体分配参考面积（亩）" width="140" align="right"/><el-table-column label="地块分配参考面积" min-width="270"><template #default="{ row }"><div v-for="plot in row.plotRows" :key="plot.plotId" class="plot-summary-row">{{ plot.plotName }}：{{ Number(plot.targetArea || 0).toFixed(1) }}亩</div></template></el-table-column><el-table-column prop="cropType" label="作物类型" width="110"/><el-table-column prop="status" label="分解状态" width="110"><template #default="{ row }"><el-tag size="small" :type="row.status === '已分解' ? 'success' : 'warning'">{{ row.status }}</el-tag></template></el-table-column></el-table>
      </template>
      <template #footer><el-button @click="detailVisible=false">关闭</el-button><el-button v-if="['province','city','county'].includes(userStore.role?.code)" type="success" @click="openDecompose">分解计划</el-button><el-button v-if="userStore.role?.code !== 'province' && ['未上报', '市级上报草稿', '县级上报草稿', '市级上报已退回', '县级上报已退回'].includes(current?.status || '未上报')" type="primary" @click="submit(current)">上报计划</el-button></template>
    </el-dialog>

    <el-dialog v-model="decomposeVisible" :title="taskTitle" :width="userStore.role?.code === 'town' ? '94vw' : '900px'" top="5vh" class="decompose-dialog" destroy-on-close>
      <template v-if="userStore.role?.code === 'town'">
        <el-alert class="decompose-guide" title="请将县级下达计划分配到本乡镇种植主体，面积仅作参考。" type="info" :closable="false"/>
        <el-table :data="subjectRows" border stripe class="decompose-table"><el-table-column prop="subjectName" label="种植大户/主体" min-width="210"/><el-table-column prop="owner" label="负责人" width="100"/><el-table-column prop="targetArea" label="主体分配参考面积（亩）" width="145" align="right"><template #default="{ row }"><el-input-number v-model="row.targetArea" :min="0" :precision="1" controls-position="right"/></template></el-table-column><el-table-column label="镇村及地块分配参考" min-width="540"><template #default="{ row }"><div v-for="plot in row.plotRows" :key="plot.plotId" class="plot-task-row"><span class="plot-region">{{ plot.townName }} / {{ plot.villageName }}</span><span class="plot-name">{{ plot.plotName }}</span><span class="plot-capacity">{{ plot.areaMu.toFixed(1) }}亩</span><el-input-number v-model="plot.targetArea" :min="0" :max="plot.areaMu" :precision="1" controls-position="right" size="small"/></div><div v-if="!row.plotRows?.length" class="attachment-empty">请先选择地块</div></template></el-table-column><el-table-column label="地块选择" min-width="210"><template #default="{ row }"><el-select v-model="row.plotIds" multiple collapse-tags collapse-tags-tooltip placeholder="选择地块" style="width:100%" @change="syncPlotRows(row)"><el-option v-for="plot in row.plots" :key="plot.id" :label="`${plot.name}（${plot.areaMu.toFixed(1)}亩）`" :value="plot.id"/></el-select></template></el-table-column><el-table-column prop="cropType" label="作物类型" width="110"/></el-table>
        <div class="decompose-summary"><div><span>主体数量</span><b>{{ subjectRows.length }}</b><em>个</em></div><div><span>主体任务合计</span><b>{{ subjectTotal.toFixed(1) }}</b><em>亩</em></div><div><span>地块数量</span><b>{{ subjectRows.reduce((sum, row) => sum + (row.plotIds?.length || 0), 0) }}</b><em>块</em></div></div>
      </template>
      <template v-else>
        <el-alert :title="`${taskRegionLabel}分解面积可根据实际情况调整，不要求与${userStore.role?.code === 'city' ? '上级下达计划' : '上级下达计划'}完全一致。`" type="info" :closable="false"/>
        <el-table :data="cityRows" border stripe class="decompose-table"><el-table-column :prop="taskRegionField" :label="taskRegionLabel" min-width="160"/><el-table-column :label="taskAreaLabel" width="220"><template #default="{ row }"><el-input-number v-model="row.targetArea" :min="0" :precision="0" controls-position="right"/></template></el-table-column><el-table-column prop="cropType" label="作物类型" min-width="150"/></el-table>
        <div class="decompose-total">已分解计划种植面积：<b>{{ decomposedTotal }}</b> 万亩 <el-tag type="info">允许与计划面积存在差异</el-tag></div>
      </template>
      <template #footer><div class="dialog-footer"><span class="footer-tip">{{ userStore.role?.code === 'town' ? '请根据实际情况确认每块地的主体分配参考面积后再保存' : '请根据实际情况确认参考分配面积后再保存' }}</span><div><el-button @click="decomposeVisible=false">取消</el-button><el-button type="primary" @click="saveDecompose">保存任务分解</el-button></div></div></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchPlantingPlans, savePlantingPlan, deletePlantingPlan, fetchPlantingPlanCityTasks, savePlantingPlanCityTasks, fetchPlantingPlanSubjectTasks, savePlantingPlanSubjectTasks, submitPlantingPlan, fetchCrops } from '@/api/gpm'
import { listCities } from '@/mock/common/regions'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const quarters = ['全年', '第一季度', '第二季度', '第三季度', '第四季度']
const cropOptions = ref([])
const years = [2026, 2025, 2024]
const rows = ref([])
const filters = reactive({ year: '', quarter: '', keyword: '' })
const formVisible = ref(false)
const detailVisible = ref(false)
const decomposeVisible = ref(false)
const current = ref(null)
const cityRows = ref([])
const subjectRows = ref([])
const form = reactive({ id: '', year: '2026', quarter: '第一季度', area: 0, cropType: '', description: '', attachmentName: '' })
const decomposedTotal = computed(() => cityRows.value.reduce((sum, item) => sum + Number(item.targetArea || 0), 0))
const taskTitle = computed(() => userStore.role?.code === 'province' ? '省级下达计划（各市参考）' : userStore.role?.code === 'city' ? '市级下达计划（各县参考）' : '县级下达计划（各乡镇参考）')
const taskRegionField = computed(() => userStore.role?.code === 'province' ? 'cityName' : userStore.role?.code === 'city' ? 'countyName' : 'townName')
const taskRegionLabel = computed(() => userStore.role?.code === 'province' ? '市级行政区' : userStore.role?.code === 'city' ? '县级行政区' : '乡镇行政区')
const taskAreaLabel = computed(() => userStore.role?.code === 'province' ? '计划种植面积（万亩）' : userStore.role?.code === 'city' ? '县级参考面积（万亩）' : '乡镇参考面积（万亩）')
const subjectTotal = computed(() => subjectRows.value.reduce((sum, item) => sum + Number(item.targetArea || 0), 0))
const syncPlotRows = (row) => {
  const selected = row.plotIds || []
  const existing = row.plotRows || []
  const totalArea = row.plots.filter((plot) => selected.includes(plot.id)).reduce((sum, plot) => sum + Number(plot.areaMu || 0), 0)
  row.plotRows = selected.map((plotId, index) => {
    const plot = row.plots.find((item) => item.id === plotId)
    const saved = existing.find((item) => item.plotId === plotId)
    if (saved) return saved
    return {
      plotId,
      plotName: plot?.name || plotId,
      townCode: plot?.regionCode,
      townName: plot?.townName || plot?.regionName || plot?.regionCode || '',
      villageName: plot?.villageName || '',
      areaMu: Number(Number(plot?.areaMu || 0).toFixed(1)),
      targetArea: index === selected.length - 1
        ? Number((Number(row.targetArea || 0) - selected.slice(0, -1).reduce((sum, id) => sum + Number((Number(row.targetArea || 0) * Number(row.plots.find((item) => item.id === id)?.areaMu || 0) / Math.max(totalArea, 1)).toFixed(1)), 0)).toFixed(1))
        : Number((Number(row.targetArea || 0) * Number(plot?.areaMu || 0) / Math.max(totalArea, 1)).toFixed(1))
    }
  })
}
const load = async () => { rows.value = await fetchPlantingPlans(userStore.role, filters) }
const reset = () => { Object.assign(filters, { year: '', quarter: '', keyword: '' }); load() }
const openCreate = () => { Object.assign(form, { id: '', year: '2026', quarter: '第一季度', area: 0, cropType: '', description: '', attachmentName: '' }); formVisible.value = true }
const openEdit = (row) => { Object.assign(form, row, { year: String(row.year), cropType: String(row.cropType || '') }); formVisible.value = true }
const removePlan = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除“${row.year}年${row.quarter}种植计划”吗？删除后相关市级分解任务也会一并删除。`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  const result = await deletePlantingPlan(row.id)
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success('种植计划已删除')
  load()
}
const save = async () => {
  if (!form.cropType) return ElMessage.warning('请选择一种作物')
  const result = await savePlantingPlan({ ...form }, userStore.role)
  if (!result.success) return ElMessage.warning(result.message)
  formVisible.value = false
  ElMessage.success('种植计划已保存')
  load()
}
const attachFile = async (row, file) => {
  const result = await savePlantingPlan({ ...row, attachmentName: file.name }, userStore.role)
  if (!result.success) return ElMessage.error(result.message)
  row.attachmentName = file.name
  ElMessage.success('附件已上传')
}
const showDetail = (row) => { current.value = row; cityRows.value = []; subjectRows.value = []; detailVisible.value = true; loadCityRows(row) }
const loadCityRows = async (row) => {
  if (userStore.role?.code === 'town') {
    subjectRows.value = await fetchPlantingPlanSubjectTasks(row.id, userStore.role)
    return
  }
  const saved = await fetchPlantingPlanCityTasks(row.id, userStore.role)
  if (saved.length) {
    cityRows.value = saved
    return
  }
  const cities = listCities()
  cityRows.value = cities.map((city, index) => ({ id: `${row.id}-${city.code}`, cityCode: city.code, cityName: city.name, targetArea: index === cities.length - 1 ? Number(row.area) : 0, cropType: row.cropType, status: '待下达', issuedAt: '' }))
}
const openDecompose = () => { detailVisible.value = false; decomposeVisible.value = true; generateFactors() }
const generateFactors = () => {}
const saveDecompose = async () => {
  if (userStore.role?.code === 'town') {
    const result = await savePlantingPlanSubjectTasks(current.value.id, subjectRows.value, userStore.role)
    if (!result.success) return ElMessage.error(result.message)
    subjectRows.value = result.rows
    decomposeVisible.value = false
    detailVisible.value = true
    ElMessage.success('已将县级任务分解到种植大户和地块')
    return
  }
  const result = await savePlantingPlanCityTasks(current.value.id, cityRows.value, userStore.role)
  if (!result.success) return ElMessage.error(result.message)
  cityRows.value = result.rows
  current.value.status = result.rows[0]?.status || current.value.status
  decomposeVisible.value = false
  detailVisible.value = true
    ElMessage.success('任务已分解并保存')
  await load()
}
const submit = async (row) => {
  const result = await submitPlantingPlan(row.id, userStore.role)
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success(userStore.role?.code === 'city' ? '市级上报计划已提交省级审核' : '县级上报计划已提交市级审核')
  await load()
}
onMounted(async () => { cropOptions.value = (await fetchCrops({ enabled: true })).map((item) => item.name); await load() })
</script>

<style lang="scss" scoped>
.plan-page{overflow:auto}.unit-input{display:flex;align-items:center;gap:8px;width:100%}.unit-input :deep(.el-input-number){flex:1}.page-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}.page-head h2{margin:4px 0 5px;font-size:22px;color:var(--ah-text)}.page-head p{color:var(--ah-text-secondary);font-size:13px}.filters{display:flex;align-items:center;flex-wrap:nowrap}.filters :deep(.el-form-item){margin-bottom:12px;margin-right:12px}.attachment-name{display:inline-block;margin-left:8px;max-width:165px;overflow:hidden;vertical-align:middle;text-overflow:ellipsis;white-space:nowrap;color:var(--ah-text-secondary);font-size:12px}.detail-title{display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px}.decompose-table{margin-top:14px}.factor-summary{line-height:1.6;color:var(--ah-text-secondary);white-space:normal}.factor-tags{display:flex;gap:6px;flex-wrap:wrap}.decompose-total{display:flex;align-items:center;gap:12px;margin-top:14px;color:var(--ah-text-secondary)}.decompose-total b{color:var(--ah-primary);font-size:20px}.plan-page :deep(.el-table__fixed-right .cell){white-space:nowrap}.action-buttons{display:flex;align-items:center;flex-wrap:nowrap;white-space:nowrap}.action-buttons :deep(.el-button){flex:0 0 auto;margin:0 6px 0 0;padding:0}.action-buttons :deep(.el-button:last-child){margin-right:0}.decompose-dialog :deep(.el-dialog){border-radius:14px;overflow:hidden}.decompose-dialog :deep(.el-dialog__header){padding:18px 24px;background:linear-gradient(135deg,#eef6ff,#f7fbff);border-bottom:1px solid #e5edf6}.decompose-dialog :deep(.el-dialog__title){font-size:18px;font-weight:700;color:#193b68}.decompose-dialog :deep(.el-dialog__body){padding:18px 24px 12px;max-height:78vh;overflow:auto}.decompose-dialog :deep(.el-dialog__footer){padding:14px 24px;border-top:1px solid #e9eef5;background:#fbfcfe}.decompose-guide{margin-bottom:14px}.decompose-guide :deep(.el-alert__title){font-size:13px;line-height:22px}.decompose-table{border-radius:8px;overflow:hidden}.decompose-table :deep(th){height:44px;background:#f2f6fb;color:#294b72;font-weight:700}.decompose-table :deep(td){padding:10px 8px}.decompose-table :deep(.el-table__row:hover>td){background:#f5faff!important}.plot-task-row{display:grid;grid-template-columns:132px minmax(150px,1fr) 74px 156px;align-items:center;gap:7px;padding:7px 0;border-bottom:1px dashed #e2e8f0;line-height:20px;min-width:0}.plot-task-row:last-child{border-bottom:0}.plot-region{min-width:0;font-size:12px;color:#58708d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.plot-name{min-width:0;font-weight:600;color:#304d6e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.plot-capacity{font-size:12px;color:#7b8794;text-align:right;white-space:nowrap}.plot-task-row :deep(.el-input-number){width:156px;min-width:156px}.plot-task-row :deep(.el-input-number .el-input__wrapper){box-shadow:0 0 0 1px #c9d8e8 inset;padding-left:8px;padding-right:34px}.plot-task-row :deep(.el-input-number .el-input-number__decrease),.plot-task-row :deep(.el-input-number .el-input-number__increase){width:28px}.plot-task-row :deep(.el-input-number .el-input__inner){min-width:0;text-align:right}.plot-summary-row{padding:3px 0;color:#40566f}.decompose-summary{display:flex;gap:14px;margin-top:16px}.decompose-summary>div{flex:1;display:flex;align-items:baseline;gap:8px;padding:12px 16px;border:1px solid #e2eaf3;border-radius:8px;background:#f8fbff}.decompose-summary span{font-size:13px;color:#718096}.decompose-summary b{font-size:20px;color:#1d5d9b}.decompose-summary em{font-style:normal;font-size:12px;color:#718096}.dialog-footer{display:flex;align-items:center;justify-content:space-between}.footer-tip{font-size:12px;color:#8492a6}@media (max-width:900px){.decompose-dialog :deep(.el-dialog__body){padding:12px}.plot-task-row{grid-template-columns:1fr 1fr}.plot-task-row :deep(.el-input-number){width:100%}.dialog-footer{display:block}.footer-tip{display:block;margin-bottom:8px}}
</style>




