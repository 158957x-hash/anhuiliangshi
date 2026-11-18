<template>
  <div class="mobile-page">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>计划管理</b><span>查看下发计划并按地块完成上报</span></div></div>
    <div class="year-tabs"><button v-for="year in years" :key="year" :class="{active: selectedYear === year}" @click="selectedYear = year">{{ year }}年</button></div>

    <section v-for="task in filteredTasks" :key="task.taskId" class="plan-card">
      <div class="plan-top"><el-tag size="small" type="info">下发计划</el-tag><el-tag size="small" :type="statusOf(task).type">{{ statusOf(task).text }}</el-tag></div>
      <h3>{{ task.planName }}</h3>
      <p class="location">{{ task.cityName }} · {{ task.countyName }} · {{ task.townName }}</p>
      <div class="plan-metrics"><div><b>{{ task.taskAreaMu }}</b><span>参考面积（亩）</span></div><div><b>{{ task.cropType }}</b><span>计划作物</span></div><div><b>{{ task.issuedAt || '本年度' }}</b><span>计划周期</span></div></div>
      <el-button v-if="!statusOf(task).reported" type="primary" class="detail-btn" @click="startReport(task)">上报计划</el-button>
      <el-button v-else type="primary" plain class="detail-btn" @click="viewReport(task)">查看已上报详情</el-button>
    </section>
    <section v-if="subjectPlots.length" class="compare-card">
      <div class="section-title"><b>地块年度对比</b><el-select v-model="compareYear" size="small" style="width:105px"><el-option v-for="year in compareYears" :key="year" :label="`${year}年`" :value="year" /></el-select></div>
      <p class="compare-tip">按同一地块对比本年度与历史上报面积，未上报地块显示为 0。</p>
      <div v-for="row in compareRows" :key="row.plotId" class="compare-row"><div><b>{{ row.plotName }}</b><span>{{ row.crop || '未填写作物' }}</span></div><div class="compare-values"><span><small>{{ compareYear }}年</small>{{ row.history.toFixed(1) }}亩</span><span><small>{{ selectedYear }}年</small>{{ row.current.toFixed(1) }}亩</span></div></div>
    </section>
    <section v-if="subjectPlots.length" class="compare-card">
      <div class="section-title"><b>地块年度对比</b><el-select v-model="compareYear" size="small" style="width:105px"><el-option v-for="year in compareYears" :key="year" :label="`${year}年`" :value="year" /></el-select></div>
      <p class="compare-tip">按同一地块对比本年度与历史上报面积，未上报地块显示为 0。</p>
      <div v-for="row in compareRows" :key="row.plotId" class="compare-row"><div><b>{{ row.plotName }}</b><span>{{ row.crop || '未填写作物' }}</span></div><div class="compare-values"><span><small>{{ compareYear }}年</small>{{ row.history.toFixed(1) }}亩</span><span><small>{{ selectedYear }}年</small>{{ row.current.toFixed(1) }}亩</span></div></div>
    </section>
    <el-empty v-if="!filteredTasks.length" description="暂无该年度下发计划" />

    <el-dialog v-model="reportVisible" :title="reportMode === 'view' ? '已上报计划详情' : '上报主体计划'" width="94%" destroy-on-close>
      <template v-if="activeTask">
        <div class="dialog-context"><b>{{ activeTask.planName }}</b><span>上级参考 {{ Number(activeTask.taskAreaMu || 0).toLocaleString() }} 亩</span></div>
        <div class="section-title dialog-title"><b>地块计划明细</b><el-tag size="small" type="info">{{ reportRows.length }} 块</el-tag></div>
        <div v-for="row in reportRows" :key="row.plotId" class="plot-plan-row">
          <div class="plot-info"><b>{{ row.plotName }}</b><span>地块面积 {{ row.plotArea }} 亩</span></div>
          <el-select v-model="row.crop" placeholder="选择作物" :disabled="reportMode === 'view'" size="small"><el-option v-for="crop in crops" :key="crop.value" :label="crop.label" :value="crop.value" /></el-select>
          <el-input-number v-model="row.area" :min="0" :max="Number(row.plotArea)" :precision="1" controls-position="right" :disabled="reportMode === 'view'" size="small" />
          <span class="unit">亩</span>
        </div>
        <el-empty v-if="!reportRows.length" description="暂无可关联地块，请先维护主体地块" :image-size="45" />
        <div v-if="reportMode !== 'view'" class="dialog-actions"><el-button plain @click="openPlotPicker">从地图选择地块</el-button><span>已填 {{ filledArea.toFixed(1) }} 亩</span></div>
        <div v-else class="dialog-summary">已上报 {{ filledArea.toFixed(1) }} 亩 · {{ reportRows.length }} 块地</div>
      </template>
      <template #footer><el-button @click="reportVisible = false">关闭</el-button><el-button v-if="reportMode !== 'view'" type="primary" :disabled="!canSubmit" @click="submitReport">提交上报</el-button></template>
    </el-dialog>

    <el-dialog v-model="pickerVisible" title="选择关联地块" width="94%" destroy-on-close>
      <div class="picker-tip">点击地图或下方地块卡片选择，已选地块会进入计划明细。地图仅用于选择，不在主页面展开。</div>
      <div class="map-wrap"><BaseMap ref="mapRef" :center="[33.16,115.62]" :zoom="10" /></div>
      <div class="picker-list"><button v-for="plot in subjectPlots" :key="plot.id" class="picker-row" :class="{selected: selectedIds.includes(plot.id)}" @click="togglePlot(plot)"><span><b>{{ plot.name }}</b><small>{{ plot.areaMu }}亩 · {{ plot.villageName || '所属村待补充' }}</small></span><strong>{{ selectedIds.includes(plot.id) ? '已选' : '选择' }}</strong></button></div>
      <template #footer><el-button @click="pickerVisible = false">取消</el-button><el-button type="primary" @click="confirmPlots">确定选择（{{ selectedIds.length }}）</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchSubjectPlanTasks, fetchSubjectPlotRelations } from '@/api/gpm'
import { PLOTS } from '@/mock/geo/plot-gen'
import BaseMap from '@/components/map/BaseMap.vue'

const userStore = useUserStore()
const years = [2026, 2025, 2024]
const selectedYear = ref(2026)
const tasks = ref([])
const records = ref([])
const subjectPlots = ref([])
const activeTask = ref(null)
const reportRows = ref([])
const reportVisible = ref(false)
const reportMode = ref('edit')
const pickerVisible = ref(false)
const selectedIds = ref([])
const mapRef = ref(null)
const filteredTasks = computed(() => tasks.value.filter(item => Number(item.year) === selectedYear.value))
const compareYear = ref(2025)
const compareYears = [2025, 2024]
const compareRows = computed(() => subjectPlots.value.map(plot => {
  const currentRecord = records.value.find(item => item.subjectId === userStore.role?.subjectId && Number(item.year) === selectedYear.value)
  const historyRecord = records.value.find(item => item.subjectId === userStore.role?.subjectId && Number(item.year) === compareYear.value)
  const current = currentRecord?.rows?.find(row => row.plotId === plot.id)
  const history = historyRecord?.rows?.find(row => row.plotId === plot.id)
  return { plotId: plot.id, plotName: plot.name, crop: current?.crop || history?.crop || '', current: Number(current?.area || 0), history: Number(history?.area || 0) }
})) [{ label: '小麦', value: 'wheat' }, { label: '水稻', value: 'rice' }, { label: '玉米', value: 'corn' }, { label: '大豆', value: 'soybean' }]
const filledArea = computed(() => reportRows.value.reduce((sum, row) => sum + Number(row.area || 0), 0))
const canSubmit = computed(() => reportRows.value.length > 0 && reportRows.value.every(row => row.crop && Number(row.area) > 0 && Number(row.area) <= Number(row.plotArea)))
const statusOf = task => {
  const record = records.value.find(item => item.taskId === task.taskId)
  return record ? { text: record.status || '已上报', type: record.status === '草稿' ? 'warning' : 'success', reported: true } : { text: '未上报', type: 'info', reported: false }
}
const recordKey = task => `wanqitong-plan-${userStore.role?.subjectId || 'unknown'}-${task.taskId}`
const buildRows = (task, record = null) => {
  const source = record?.rows || []
  const selected = new Set(source.map(row => row.plotId))
  return subjectPlots.value.filter(plot => selected.has(plot.id)).map(plot => {
    const old = source.find(row => row.plotId === plot.id)
    return { plotId: plot.id, plotName: plot.name, plotArea: Number(plot.areaMu || 0), crop: old?.crop || '', area: Number(old?.area || 0) }
  })
}
const startReport = task => { activeTask.value = task; reportMode.value = 'edit'; const record = records.value.find(item => item.taskId === task.taskId); reportRows.value = buildRows(task, record); selectedIds.value = reportRows.value.map(row => row.plotId); reportVisible.value = true }
const viewReport = task => { activeTask.value = task; reportMode.value = 'view'; const record = records.value.find(item => item.taskId === task.taskId); reportRows.value = buildRows(task, record); reportVisible.value = true }
const openPlotPicker = async () => { selectedIds.value = reportRows.value.map(row => row.plotId); pickerVisible.value = true; await nextTick(); renderMap() }
const renderMap = () => { if (!mapRef.value) return; mapRef.value.addGeoJSON('grower-plots', { type: 'FeatureCollection', features: subjectPlots.value.filter(plot => plot.geometry).map(plot => ({ type: 'Feature', properties: { id: plot.id }, geometry: plot.geometry })) }, { style: feature => ({ color: selectedIds.value.includes(feature.properties.id) ? '#e67e22' : '#2d8c72', weight: 2, fillOpacity: .35 }), onEachFeature: (feature, layer) => layer.on('click', () => togglePlot(subjectPlots.value.find(plot => plot.id === feature.properties.id))) }) }
const togglePlot = plot => { if (!plot) return; const index = selectedIds.value.indexOf(plot.id); if (index >= 0) selectedIds.value.splice(index, 1); else selectedIds.value.push(plot.id); renderMap() }
const confirmPlots = () => { reportRows.value = buildRows(activeTask.value, { rows: selectedIds.value.map(plotId => reportRows.value.find(row => row.plotId === plotId) || { plotId }) }); reportRows.value = selectedIds.value.map(plotId => { const plot = subjectPlots.value.find(item => item.id === plotId); const old = reportRows.value.find(row => row.plotId === plotId); return { plotId, plotName: plot.name, plotArea: Number(plot.areaMu || 0), crop: old?.crop || '', area: Number(old?.area || 0) } }); pickerVisible.value = false }
const submitReport = () => { if (!canSubmit.value) return ElMessage.warning('请为每块已选地块填写作物和不超过地块面积的上报面积'); const record = { taskId: activeTask.value.taskId, year: activeTask.value.year, status: '已上报', submittedAt: new Date().toISOString(), rows: reportRows.value.map(row => ({ ...row })) }; const all = JSON.parse(localStorage.getItem('wanqitong-plan-reports') || '[]').filter(item => !(item.subjectId === userStore.role?.subjectId && item.taskId === activeTask.value.taskId)); all.unshift({ ...record, subjectId: userStore.role?.subjectId }); localStorage.setItem('wanqitong-plan-reports', JSON.stringify(all)); records.value = all.filter(item => item.subjectId === userStore.role?.subjectId); reportVisible.value = false; ElMessage.success('主体计划已提交上报') }

onMounted(async () => { tasks.value = await fetchSubjectPlanTasks(userStore.role); const relations = await fetchSubjectPlotRelations(userStore.role, { subjectId: userStore.role?.subjectId }); const ids = new Set(relations.filter(item => item.relationStatus === '已关联').map(item => item.plotId)); subjectPlots.value = PLOTS.filter(item => item.subjectId === userStore.role?.subjectId && ids.has(item.id)); records.value = JSON.parse(localStorage.getItem('wanqitong-plan-reports') || '[]').filter(item => item.subjectId === userStore.role?.subjectId) })
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.plan-card,.compare-card{background:#fff;border-radius:12px;padding:16px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;gap:8px;color:#1f3c68}.mobile-head b{display:block;font-size:21px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;color:#333;padding:0 8px 4px 0}.year-tabs{display:flex;gap:8px;margin-bottom:12px}.year-tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:8px;padding:9px;color:#667085}.year-tabs button.active{background:#eaf6f1;border-color:#2d8c72;color:#176b58;font-weight:600}.plan-top{display:flex;justify-content:space-between}.plan-card h3{font-size:16px;color:#243b5a;margin:12px 0 5px}.location{font-size:12px;color:#667085;margin:0 0 12px}.plan-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.plan-metrics div{background:#f4f8fb;border-radius:8px;text-align:center;padding:9px 3px}.plan-metrics b,.plan-metrics span{display:block}.plan-metrics b{color:#176b58;font-size:16px}.plan-metrics span{color:#98a2b3;font-size:11px;margin-top:3px}.detail-btn{width:100%;margin-top:13px}.compare-tip{font-size:11px;color:#98a2b3;margin:-4px 0 8px}.compare-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 0;border-top:1px solid #edf0f5}.compare-row>div:first-child{min-width:0}.compare-row b,.compare-row span{display:block}.compare-row b{font-size:13px;color:#243b5a}.compare-row span{font-size:11px;color:#667085;margin-top:3px}.compare-values{display:flex;gap:12px;text-align:right}.compare-values span{color:#176b58;font-weight:600}.compare-values small{display:block;color:#98a2b3;font-weight:400}.dialog-context{display:flex;justify-content:space-between;gap:8px;padding:12px;background:#eaf6f1;border-radius:9px;color:#176b58}.dialog-context span{color:#667085;font-size:12px}.dialog-title{margin-top:16px}.plot-plan-row{display:grid;grid-template-columns:1.15fr .9fr 1fr auto;align-items:center;gap:6px;padding:11px 0;border-top:1px solid #edf0f5}.plot-info b,.plot-info span{display:block}.plot-info b{color:#243b5a;font-size:13px}.plot-info span{color:#98a2b3;font-size:10px;margin-top:4px}.plot-plan-row :deep(.el-input-number){width:100%}.unit{color:#667085;font-size:12px}.dialog-actions,.dialog-summary{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:10px;background:#f4f8fb;border-radius:8px;color:#176b58;font-size:12px}.picker-tip{font-size:12px;color:#667085;line-height:1.5;margin-bottom:10px}.map-wrap{height:230px;border-radius:10px;overflow:hidden}.picker-list{margin-top:8px}.picker-row{width:100%;display:flex;justify-content:space-between;align-items:center;border:0;border-top:1px solid #edf0f5;background:#fff;padding:11px 0;text-align:left}.picker-row span,.picker-row small{display:block}.picker-row b{color:#243b5a;font-size:13px}.picker-row small{color:#98a2b3;font-size:11px;margin-top:3px}.picker-row strong{color:#2d8c72;font-size:12px}.picker-row.selected strong{color:#e67e22}.mobile-page :deep(.el-dialog__body){padding-top:8px}
</style>
