<template>
  <div class="mobile-page">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>计划管理</b><span>查看下发计划并按地块完成主体上报</span></div></div>
    <div class="year-tabs"><button v-for="year in years" :key="year" :class="{active: selectedYear === year}" @click="selectedYear = year">{{ year }}年</button></div>

    <section v-for="task in filteredTasks" :key="task.taskId" class="plan-card">
      <div class="plan-top"><el-tag size="small" type="info">下发计划</el-tag><el-tag size="small" :type="statusOf(task).type">{{ statusOf(task).text }}</el-tag></div>
      <h3>{{ task.planName }}</h3>
      <p class="location">{{ task.cityName }} · {{ task.countyName }} · {{ task.townName }}</p>
      <div class="plan-metrics"><div><b>{{ task.taskAreaMu }}</b><span>参考面积（亩）</span></div><div><b>{{ task.cropType }}</b><span>计划作物</span></div><div><b>{{ task.issuedAt || '本年度' }}</b><span>计划周期</span></div></div>
      <el-button v-if="!statusOf(task).reported" type="primary" class="detail-btn" @click="startReport(task)">上报计划</el-button>
      <el-button v-else type="primary" plain class="detail-btn" @click="viewReport(task)">查看已上报详情</el-button>
    </section>
    <el-empty v-if="!filteredTasks.length" description="暂无该年度下发计划" />

    <el-dialog v-model="reportVisible" :title="reportMode === 'view' ? '已上报计划详情' : '上报主体计划'" width="94%" destroy-on-close>
      <template v-if="activeTask">
        <div class="dialog-context"><b>{{ activeTask.planName }}</b><span>上级参考 {{ Number(activeTask.taskAreaMu || 0).toLocaleString() }} 亩</span></div>
        <div class="selection-switch"><b>选择关联地块</b><el-radio-group v-model="pickerMode" size="small"><el-radio-button label="list">地块列表</el-radio-button><el-radio-button label="map">地图选择</el-radio-button></el-radio-group></div>
        <div v-if="pickerMode === 'map'" class="map-wrap"><BaseMap ref="mapRef" :center="[33.16,115.62]" :zoom="10" /></div>
        <div class="picker-list compact"><button v-for="plot in subjectPlots" :key="plot.id" class="picker-row" :class="{selected: selectedIds.includes(plot.id)}" @click="togglePlot(plot)"><span><b>{{ plot.name }}</b><small>{{ Number(plot.areaMu || 0).toFixed(1) }}亩 · {{ cropName(plot.crop) }}</small></span><strong>{{ selectedIds.includes(plot.id) ? '已选' : '选择' }}</strong></button></div>
        <el-empty v-if="!subjectPlots.length" description="暂无主体地块，已生成演示地块数据" :image-size="45" />
        <div class="section-title dialog-title"><b>地块计划明细</b><el-tag size="small" type="info">{{ reportRows.length }} 块</el-tag></div>
        <div v-for="row in reportRows" :key="row.plotId" class="plot-plan-row"><div class="plot-info"><b>{{ row.plotName }}</b><span>地块面积 {{ row.plotArea }} 亩</span></div><el-select v-model="row.crop" placeholder="选择作物" :disabled="reportMode === 'view'" size="small"><el-option v-for="crop in crops" :key="crop.value" :label="crop.label" :value="crop.value" /></el-select><el-input-number v-model="row.area" :min="0" :max="Number(row.plotArea)" :precision="1" controls-position="right" :disabled="reportMode === 'view'" size="small" /><span class="unit">亩</span></div>
        <div class="dialog-summary">已填 {{ filledArea.toFixed(1) }} 亩 · {{ reportRows.length }} 块地</div>
      </template>
      <template #footer><el-button @click="reportVisible = false">关闭</el-button><el-button v-if="reportMode !== 'view'" type="primary" :disabled="!canSubmit" @click="submitReport">提交上报</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchSubjectPlanTasks } from '@/api/gpm'
import { PLOTS } from '@/mock/geo/plot-gen'
import BaseMap from '@/components/map/BaseMap.vue'

const userStore = useUserStore(); const years = [2026, 2025, 2024]; const selectedYear = ref(2026); const tasks = ref([]); const records = ref([]); const subjectPlots = ref([]); const activeTask = ref(null); const reportRows = ref([]); const reportVisible = ref(false); const reportMode = ref('edit'); const selectedIds = ref([]); const pickerMode = ref('list'); const mapRef = ref(null)
const crops = [{ label: '小麦', value: 'wheat' }, { label: '水稻', value: 'rice' }, { label: '玉米', value: 'corn' }, { label: '大豆', value: 'soybean' }]
const filteredTasks = computed(() => tasks.value.filter(item => Number(item.year) === selectedYear.value)); const filledArea = computed(() => reportRows.value.reduce((sum, row) => sum + Number(row.area || 0), 0)); const canSubmit = computed(() => reportRows.value.length > 0 && reportRows.value.every(row => row.crop && Number(row.area) > 0 && Number(row.area) <= Number(row.plotArea)))
const cropName = crop => ({ wheat: '小麦', rice: '水稻', corn: '玉米', soybean: '大豆', silage_corn: '青贮玉米' }[crop] || crop || '未设置')
const statusOf = task => { const record = records.value.find(item => item.taskId === task.taskId); return record ? { text: '已上报', type: 'success', reported: true } : { text: '未上报', type: 'info', reported: false } }
const buildRows = record => subjectPlots.value.filter(plot => !record || (record.rows || []).some(row => row.plotId === plot.id)).map(plot => { const old = record?.rows?.find(row => row.plotId === plot.id); return { plotId: plot.id, plotName: plot.name, plotArea: Number(plot.areaMu || 0), crop: old?.crop || plot.crop || 'wheat', area: Number(old?.area || 0) } })
const startReport = task => { activeTask.value = task; reportMode.value = 'edit'; const record = records.value.find(item => item.taskId === task.taskId); reportRows.value = buildRows(record); selectedIds.value = reportRows.value.map(row => row.plotId); reportVisible.value = true }
const viewReport = task => { activeTask.value = task; reportMode.value = 'view'; const record = records.value.find(item => item.taskId === task.taskId); reportRows.value = buildRows(record); selectedIds.value = reportRows.value.map(row => row.plotId); reportVisible.value = true }
const togglePlot = plot => { const i = selectedIds.value.indexOf(plot.id); if (i >= 0) selectedIds.value.splice(i, 1); else selectedIds.value.push(plot.id); reportRows.value = subjectPlots.value.filter(plot => selectedIds.value.includes(plot.id)).map(plot => { const old = reportRows.value.find(row => row.plotId === plot.id); return { plotId: plot.id, plotName: plot.name, plotArea: Number(plot.areaMu || 0), crop: old?.crop || plot.crop || 'wheat', area: Number(old?.area || 0) } }); if (pickerMode.value === 'map') renderMap() }
const renderMap = () => { if (!mapRef.value) return; mapRef.value.addGeoJSON('subject-plots', { type: 'FeatureCollection', features: subjectPlots.value.filter(p => p.geometry).map(p => ({ type: 'Feature', properties: { id: p.id }, geometry: p.geometry })) }, { style: feature => ({ color: selectedIds.value.includes(feature.properties.id) ? '#e67e22' : '#2d8c72', weight: 2, fillOpacity: .35 }), onEachFeature: (feature, layer) => layer.on('click', () => togglePlot(subjectPlots.value.find(p => p.id === feature.properties.id))) }) }
const submitReport = () => { if (!canSubmit.value) return ElMessage.warning('请为已选地块填写作物和面积'); const all = JSON.parse(localStorage.getItem('wanqitong-plan-reports') || '[]').filter(item => !(item.subjectId === userStore.role?.subjectId && item.taskId === activeTask.value.taskId)); all.unshift({ id: `SUBJECT-PLAN-${Date.now()}`, subjectId: userStore.role?.subjectId, taskId: activeTask.value.taskId, year: activeTask.value.year, status: '已上报', submittedAt: new Date().toISOString(), rows: reportRows.value.map(row => ({ ...row })) }); localStorage.setItem('wanqitong-plan-reports', JSON.stringify(all)); records.value = all.filter(item => item.subjectId === userStore.role?.subjectId); reportVisible.value = false; ElMessage.success('主体计划已保存') }
const load = async () => { const result = await fetchSubjectPlanTasks(userStore.role); tasks.value = result?.length ? result : [{ taskId: 'DEMO-TASK-2026-Q3', planId: 'PLANT-2026-Q3', year: 2026, quarter: '第三季度', planName: '2026年第三季度玉米种植计划', taskAreaMu: 620, cropType: '玉米', cityName: '阜阳市', countyName: '太和县', townName: '旧县镇', issuedAt: '2026-09-10' }]; subjectPlots.value = PLOTS.filter(item => item.subjectId === userStore.role?.subjectId); records.value = JSON.parse(localStorage.getItem('wanqitong-plan-reports') || '[]').filter(item => item.subjectId === userStore.role?.subjectId); await nextTick(); if (pickerMode.value === 'map') renderMap() }
load(); onMounted(load)
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.plan-card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;gap:8px;color:#1f3c68}.mobile-head b{display:block;font-size:21px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;padding:0 8px 4px 0}.year-tabs{display:flex;gap:8px;margin-bottom:12px}.year-tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:8px;padding:9px;color:#667085}.year-tabs button.active{background:#eaf6f1;border-color:#2d8c72;color:#176b58}.plan-top,.section-title,.selection-switch,.plot-plan-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.plan-card h3{font-size:16px;color:#243b5a;margin:12px 0 5px}.location{font-size:12px;color:#667085;margin:0 0 12px}.plan-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.plan-metrics div{background:#f4f8fb;border-radius:8px;text-align:center;padding:9px 3px}.plan-metrics b,.plan-metrics span{display:block}.plan-metrics b{color:#176b58;font-size:16px}.plan-metrics span{color:#98a2b3;font-size:11px;margin-top:3px}.detail-btn{width:100%;margin-top:13px}.dialog-context{display:flex;justify-content:space-between;gap:8px;padding:12px;background:#eaf6f1;border-radius:9px;color:#176b58}.dialog-context span{color:#667085;font-size:12px}.selection-switch{margin:14px 0 8px}.map-wrap{height:210px;border-radius:10px;overflow:hidden;margin-bottom:8px}.picker-list{max-height:210px;overflow:auto;border:1px solid #edf0f5;border-radius:9px}.picker-row{width:100%;display:flex;align-items:center;justify-content:space-between;border:0;border-top:1px solid #edf0f5;background:#fff;padding:10px;text-align:left}.picker-row:first-child{border-top:0}.picker-row span{display:flex;flex-direction:column;gap:3px}.picker-row small{color:#98a2b3}.picker-row strong{color:#2d8c72}.picker-row.selected{background:#eef9f4}.dialog-title{margin:14px 0 8px}.plot-plan-row{border-top:1px solid #edf0f5;padding:9px 0}.plot-info{flex:1;min-width:0}.plot-info b,.plot-info span{display:block}.plot-info b{font-size:12px;color:#243b5a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.plot-info span,.unit{font-size:11px;color:#98a2b3}.plot-plan-row :deep(.el-input-number){width:92px}.plot-plan-row :deep(.el-select){width:92px}.dialog-summary{margin-top:12px;padding:10px;background:#f4f8fb;border-radius:8px;color:#176b58;font-size:12px}
</style>