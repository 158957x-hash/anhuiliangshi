<template>
  <el-dialog v-model="opened" title="按图批量选择收储地块" class="ordinary-plot-dialog" width="1120px" top="4vh" destroy-on-close append-to-body @opened="renderMap(true)" @closed="stopDraw">
    <el-alert v-if="fixedSubjectIds.length" title="候选地块限定为第一步已选种植主体；如需调整主体，请返回第一步。" type="info" :closable="false"/>
    <div v-else class="picker-search">
      <el-input v-model="subjectKeyword" placeholder="先搜索种植主体名称或负责人" clearable @keyup.enter="searchSubjects" aria-label="搜索种植主体" />
      <el-button type="primary" :loading="searching" @click="searchSubjects">搜索主体</el-button>
    </div>
    <div v-if="searched && !fixedSubjectIds.length" class="subject-results">
      <el-checkbox-group v-model="subjectIds"><el-checkbox v-for="s in subjects" :key="s.id" :label="s.id">{{ s.name }}</el-checkbox></el-checkbox-group>
      <el-empty v-if="!subjects.length" description="未找到种植主体，请修改关键词" :image-size="42" />
      <el-button v-if="subjects.length" type="primary" plain :disabled="!subjectIds.length" :loading="loading" @click="loadPlots">查询所选主体地块</el-button>
    </div>
    <div v-if="error" class="load-error">{{ error }} <el-button link type="primary" @click="retry">重试</el-button></div>
    <div class="picker-body">
      <div class="map-side">
        <div class="map-canvas"><BaseMap ref="mapRef" :center="[33.16, 115.62]" :zoom="9" /></div>
        <div class="map-tools">
          <template v-if="!drawing"><el-button size="small" :disabled="!candidatePlots.length" @click="startDraw">手绘圈选候选地块</el-button><el-button size="small" :disabled="!candidatePlots.length" @click="renderMap(true)">定位当前地块</el-button></template>
          <template v-else><el-button size="small" type="primary" @click="finishDraw">完成圈选</el-button><el-button size="small" @click="drawApi?.undo()">撤销点</el-button><el-button size="small" @click="stopDraw">取消圈选</el-button></template>
        </div>
        <p class="map-tip">{{ drawing ? '依次点击地图设置圈选范围，至少 3 个点。' : '绿色：候选地块；橙色：已选地块。点击地块选择或取消。手绘圈只筛选地块，不作为备案边界。' }}</p>
      </div>
      <aside class="list-side">
        <el-input v-model="plotKeyword" clearable placeholder="筛选地块名称、编号、作物" aria-label="筛选候选地块" />
        <div class="list-toolbar"><b>候选 {{ filteredPlots.length }} 块</b><el-button link type="primary" :disabled="!selectableFiltered.length" @click="selectFiltered">全选筛选结果</el-button><el-button v-if="drawFilter" link @click="clearDrawFilter">取消圈选筛选</el-button></div>
        <div v-loading="loading" class="candidate-list">
          <div v-for="p in filteredPlots" :key="p.id" class="plot-row" :class="{ selected: selectedIds.includes(p.id) }">
            <el-checkbox :model-value="selectedIds.includes(p.id)" :disabled="!p.geometry" @change="toggle(p)"><b>{{ p.name }}</b></el-checkbox>
            <small>{{ p.id }} · {{ Number(p.areaMu || 0).toFixed(1) }} 亩</small><small>{{ p.subjectName }}</small>
            <div class="plot-position"><span>{{ p.geometry ? (p.regionName || p.regionCode || '位置见地图') : '缺少边界，暂不能生成备案范围' }}</span><el-button v-if="p.geometry" link size="small" @click="locate(p)">定位</el-button></div>
          </div>
          <el-empty v-if="!loading && !filteredPlots.length" :description="queried ? '没有符合条件的地块' : '请先搜索种植主体，再查询地块'" :image-size="54" />
        </div>
      </aside>
    </div>
    <div class="selection-head"><b>已选 {{ selectedRows.length }} 块 / {{ selectedArea.toFixed(1) }} 亩</b><el-button link :disabled="!selectedIds.length" @click="clearSelection">清空选择</el-button></div>
    <div class="selection-tags"><el-tag v-for="p in selectedRows" :key="p.id" closable @close="toggle(p)">{{ p.name }} · {{ p.id }}</el-tag><span v-if="!selectedRows.length">尚未选择地块</span></div>
    <template #footer><el-button @click="opened = false">取消</el-button><el-button type="primary" @click="confirm">确认选择（{{ selectedRows.length }}）</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import BaseMap from '@/components/map/BaseMap.vue'
import { searchPlantingSubjects, searchOrdinaryPlots } from '@/api/silOrdinary'
import { useUserStore } from '@/stores/user'

const emit = defineEmits(['confirm'])
const userStore = useUserStore()
const opened = ref(false), mapRef = ref(null), subjectKeyword = ref(''), subjects = ref([]), subjectIds = ref([])
const fixedSubjectIds = ref([])
const searched = ref(false), queried = ref(false), searching = ref(false), loading = ref(false), error = ref(''), errorSource = ref('')
const candidatePlots = ref([]), plotKeyword = ref(''), selectedIds = ref([]), knownPlots = ref(new Map())
const drawing = ref(false), drawApi = ref(null), drawFilter = ref(null)
const filteredPlots = computed(() => candidatePlots.value.filter(p => (!drawFilter.value || drawFilter.value.includes(p.id)) && (!plotKeyword.value || `${p.id}${p.name}${p.cropName || p.crop || ''}`.includes(plotKeyword.value.trim()))))
const selectableFiltered = computed(() => filteredPlots.value.filter(p => p.geometry))
const selectedRows = computed(() => selectedIds.value.map(id => knownPlots.value.get(id)).filter(Boolean))
const selectedArea = computed(() => selectedRows.value.reduce((sum, p) => sum + Number(p.areaMu || 0), 0))

function open(rows = [], presetSubjectIds = []) {
  fixedSubjectIds.value = [...presetSubjectIds]
  if (presetSubjectIds.length) rows = rows.filter(plot => presetSubjectIds.includes(plot.subjectId))
  knownPlots.value = new Map(rows.map(p => [p.plotId || p.id, { ...p, id: p.plotId || p.id }]))
  selectedIds.value = [...knownPlots.value.keys()]
  candidatePlots.value = []; subjects.value = []; subjectIds.value = [...presetSubjectIds]; subjectKeyword.value = ''; plotKeyword.value = ''; searched.value = !!presetSubjectIds.length; queried.value = false; error.value = ''; drawFilter.value = null; opened.value = true
  if (presetSubjectIds.length) loadPlots()
}
async function searchSubjects() {
  if (!subjectKeyword.value.trim()) return ElMessage.warning('请输入种植主体名称或负责人后再搜索')
  searching.value = true; error.value = ''
  try { subjects.value = await searchPlantingSubjects(subjectKeyword.value.trim(), userStore.role); subjectIds.value = []; searched.value = true }
  catch { error.value = '主体查询失败，请重试'; errorSource.value = 'subjects' }
  finally { searching.value = false }
}
async function loadPlots() {
  if (!subjectIds.value.length) return ElMessage.warning('请先选择要查询的种植主体')
  stopDraw(); loading.value = true; error.value = ''
  try {
    candidatePlots.value = await searchOrdinaryPlots([...subjectIds.value], userStore.role)
    const next = new Map(knownPlots.value); candidatePlots.value.forEach(p => next.set(p.id, p)); knownPlots.value = next
    queried.value = true; drawFilter.value = null; await nextTick(); renderMap(true)
  } catch { error.value = '地块加载失败，请重试'; errorSource.value = 'plots' }
  finally { loading.value = false }
}
function toggle(p) {
  if (drawing.value || (!p.geometry && !selectedIds.value.includes(p.id))) return
  selectedIds.value = selectedIds.value.includes(p.id) ? selectedIds.value.filter(id => id !== p.id) : [...selectedIds.value, p.id]
  renderMap()
}
function selectFiltered() { selectedIds.value = [...new Set([...selectedIds.value, ...selectableFiltered.value.map(p => p.id)])]; renderMap() }
function clearSelection() { selectedIds.value = []; renderMap() }
function locate(p) { const ring = p.geometry?.coordinates?.[0]; if (ring?.length) mapRef.value?.fitBounds(ring.map(([lng, lat]) => [lat, lng]), [30, 30]) }
function renderMap(fit = false) {
  if (!mapRef.value) return
  mapRef.value.map?.invalidateSize?.()
  const rows = new Map([...candidatePlots.value, ...selectedRows.value].map(p => [p.id, p]))
  const features = [...rows.values()].filter(p => p.geometry).map(p => ({ type: 'Feature', properties: { id: p.id }, geometry: p.geometry }))
  const layer = mapRef.value.addGeoJSON('ordinary-candidates', { type: 'FeatureCollection', features }, {
    style: feature => { const chosen = selectedIds.value.includes(feature.properties.id); const muted = drawFilter.value && !drawFilter.value.includes(feature.properties.id) && !chosen; return { color: chosen ? '#e48c19' : '#278b79', weight: chosen ? 3 : 2, fillColor: chosen ? '#f6ad40' : '#43a58e', fillOpacity: muted ? .05 : chosen ? .5 : .22 } },
    onEachFeature: (feature, item) => { const p = rows.get(feature.properties.id); const label = document.createElement('span'); label.textContent = `${p.name}（${p.id}）`; item.bindTooltip(label); item.on('click', () => toggle(p)) }
  })
  if (fit && layer?.getBounds?.().isValid()) mapRef.value.fitBounds(layer.getBounds(), [35, 35])
}
function inside(point, ring) {
  let yes = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [x, y] = point, [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) yes = !yes }
  return yes
}
function intersects(a, b) {
  if (a.some(p => inside(p, b)) || b.some(p => inside(p, a))) return true
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  for (let i = 0; i < a.length - 1; i++) for (let j = 0; j < b.length - 1; j++) { if (cross(a[i], a[i+1], b[j]) * cross(a[i], a[i+1], b[j+1]) < 0 && cross(b[j], b[j+1], a[i]) * cross(b[j], b[j+1], a[i+1]) < 0) return true }
  return false
}
function startDraw() {
  drawing.value = true
  drawApi.value = mapRef.value?.startPolygonDraw({ onFinish: geometry => {
    drawFilter.value = candidatePlots.value.filter(p => p.geometry?.coordinates?.[0] && intersects(p.geometry.coordinates[0], geometry.coordinates[0])).map(p => p.id)
    stopDraw(); renderMap(); ElMessage.info(`圈选得到 ${drawFilter.value.length} 块候选地块，请勾选或全选后确认`)
  } })
}
function finishDraw() { if (!drawApi.value?.finish()) ElMessage.warning('至少需要 3 个圈选点') }
function stopDraw() { drawApi.value?.stop(); drawApi.value = null; drawing.value = false }
function clearDrawFilter() { drawFilter.value = null; renderMap() }
function confirm() { stopDraw(); emit('confirm', selectedRows.value.filter(p => !fixedSubjectIds.value.length || fixedSubjectIds.value.includes(p.subjectId)).map(p => ({ ...p }))); opened.value = false }
function retry() { if (errorSource.value === 'subjects') searchSubjects(); else loadPlots() }
function close() { stopDraw(); opened.value = false }
defineExpose({ open, close })
</script>

<style scoped lang="scss">
.picker-search{display:flex;gap:10px}.subject-results{padding:12px 0;border-bottom:1px solid #e7edf3}.subject-results :deep(.el-checkbox-group){display:flex;flex-wrap:wrap;gap:8px}.subject-results :deep(.el-checkbox){height:auto;white-space:normal;margin:0 14px 8px 0}.picker-body{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:14px;margin-top:14px}.map-side{min-width:0}.map-canvas{height:350px;position:relative;border:1px solid #dbe5ed;border-radius:10px;overflow:hidden}.map-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.map-tools :deep(.el-button+.el-button){margin-left:0}.map-tip{color:#687b8d;font-size:12px;line-height:1.6;margin:8px 0}.list-side{min-width:0;border:1px solid #e2e9ef;border-radius:10px;padding:10px}.list-toolbar{display:flex;align-items:center;justify-content:space-between;gap:4px;flex-wrap:wrap;font-size:12px;padding:8px 0}.candidate-list{height:320px;overflow:auto}.plot-row{padding:10px;border:1px solid #e5ecf2;border-radius:8px;margin-bottom:8px}.plot-row.selected{background:#fff7e9;border-color:#f0bd69}.plot-row :deep(.el-checkbox){width:100%;height:auto;white-space:normal}.plot-row :deep(.el-checkbox__label){min-width:0;white-space:normal;word-break:break-word}.plot-row small{display:block;color:#7b8999;margin:5px 0;font-size:12px}.plot-position{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#8b99a6;gap:4px}.selection-head{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e7edf3;padding-top:12px;margin-top:8px}.selection-tags{display:flex;gap:6px;flex-wrap:wrap;max-height:85px;overflow:auto;padding:8px 0;color:#8b99a6;font-size:12px}.selection-tags :deep(.el-tag){height:auto;white-space:normal;padding:4px 8px}.load-error{background:#fff1ef;color:#c44436;padding:8px;margin-top:8px}
@media(max-width:650px){.picker-body{grid-template-columns:1fr}.map-canvas{height:240px}.candidate-list{height:180px}.picker-search{gap:5px}.selection-tags{max-height:70px}.picker-search :deep(.el-button){padding:8px}.map-tools :deep(.el-button){font-size:11px;padding:8px}.subject-results :deep(.el-checkbox__label){white-space:normal}.map-tip{font-size:11px}}
</style>
<style lang="scss">.ordinary-plot-dialog{max-width:calc(100vw - 24px);border-radius:12px}.ordinary-plot-dialog .el-dialog__body{max-height:calc(92vh - 130px);overflow-y:auto}.ordinary-plot-dialog .el-dialog__footer{border-top:1px solid #edf0f3}.ordinary-plot-dialog .el-dialog__title{font-size:17px}@media(max-width:650px){.ordinary-plot-dialog{max-width:calc(100vw - 12px);padding:12px}.ordinary-plot-dialog .el-dialog__body{max-height:calc(92vh - 130px)}}</style>
