<template>
  <div class="map-dark-page">
    <BaseMap ref="baseMapRef" />

    <DrillBreadcrumb code="340000" />

    <LayerControl :layers="layers" @toggle="toggleLayer" />

    <!-- 左侧指标 -->
    <div class="left-panel">
      <div class="lp-card">
        <div class="lp-title">农药监管核心指标</div>
        <div class="lp-stats">
          <div class="lp-stat"><div class="map-stat-value num">{{ stats.producers }}</div><div class="lp-label">生产企业</div></div>
          <div class="lp-stat"><div class="map-stat-value num">{{ stats.shops }}</div><div class="lp-label">经营网点</div></div>
          <div class="lp-stat"><div class="map-stat-value num">{{ stats.batches }}</div><div class="lp-label">产品批次</div></div>
          <div class="lp-stat"><div class="map-stat-value num" style="color:#e64545">{{ stats.abnormal }}</div><div class="lp-label">异常预警</div></div>
        </div>
      </div>

      <div class="lp-card">
        <div class="lp-title">月度生产销售趋势（吨）</div>
        <BaseChart :option="chartOption" height="190px" dark />
      </div>

      <div class="lp-card">
        <div class="lp-title">主体列表</div>
        <div class="sub-scroll">
          <div v-for="s in subjectList" :key="s.id" class="sub-row" @click="locateSubject(s)">
            <span class="sb-type" :style="{ background: typeColor[s.type] + '33', color: typeColor[s.type] }">{{ typeNames[s.type] }}</span>
            <span class="sb-name">{{ s.name }}</span>
            <el-tag v-if="s.status !== '正常'" type="danger" size="small" effect="plain">{{ s.status }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="legend-card">
      <div class="lg-title">主体图例</div>
      <div class="lg-row"><span class="lg-dot" style="background:#e64545" />生产企业</div>
      <div class="lg-row"><span class="lg-dot" style="background:#e8b93c" />经营网点</div>
      <div class="lg-row"><span class="lg-dot" style="background:#4fd0c6" />使用主体</div>
      <div class="lg-row"><span class="lg-dot" style="background:#7e57c2" />回收处理主体</div>
      <div class="lg-row"><span class="lg-dot ring" style="border-color:#ff7a45" />异常预警（断点/待核查）</div>
    </div>

    <!-- 预警穿透 -->
    <el-drawer v-model="warnDrawer" title="异常预警详情" size="420px" append-to-body>
      <template v-if="warnSubject">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="主体名称">{{ warnSubject.subject.name }}</el-descriptions-item>
          <el-descriptions-item label="主体类型">{{ typeNames[warnSubject.subject.type] }}</el-descriptions-item>
          <el-descriptions-item label="区划代码">{{ warnSubject.subject.regionCode }}</el-descriptions-item>
        </el-descriptions>
        <el-alert v-for="(r, i) in warnSubject.reasons" :key="i" type="warning" :closable="false" show-icon
          :title="r" style="margin-top: 10px" />
        <div class="drawer-actions">
          <el-button type="warning" size="small" @click="$router.push('/pes/trade-ledger')">核查经营台账</el-button>
          <el-button size="small" @click="$router.push('/pes/trace')">核查流向追溯</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 主体穿透 -->
    <el-drawer v-model="subjectDrawer" :title="curSubject?.name" size="400px" append-to-body>
      <template v-if="curSubject">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="主体类型">{{ typeNames[curSubject.type] }}</el-descriptions-item>
          <el-descriptions-item label="许可证号">{{ curSubject.license || '—' }}</el-descriptions-item>
          <el-descriptions-item label="法人/负责人">{{ curSubject.legal || curSubject.owner || '—' }}</el-descriptions-item>
          <el-descriptions-item label="主体状态">
            <el-tag :type="curSubject.status === '正常' ? 'success' : 'danger'" size="small">{{ curSubject.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="curSubject.capacity" label="设计能力">{{ curSubject.capacity }}</el-descriptions-item>
        </el-descriptions>
        <div class="drawer-actions">
          <el-button type="primary" size="small" @click="$router.push('/pes/trace')">查看流向追溯</el-button>
          <el-button size="small" @click="$router.push('/pes/subjects')">查看主体档案</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import BaseMap from '@/components/map/BaseMap.vue'
import LayerControl from '@/components/map/LayerControl.vue'
import DrillBreadcrumb from '@/components/map/DrillBreadcrumb.vue'
import BaseChart from '@/components/charts/BaseChart.vue'
import { PES_SUBJECTS, PES_MONTHLY_STATS, PES_BATCHES, PES_FLOWS, pesSubjectsGeoJSON } from '@/mock/pes/data'
import anhuiCityGeo from '@/mock/geo/anhui-city.json'

const baseMapRef = ref(null)
const subjectDrawer = ref(false)
const curSubject = ref(null)
const warnDrawer = ref(false)
const warnSubject = ref(null)

const typeNames = { produce: '生产企业', operate: '经营网点', use: '使用主体', recycle: '回收主体' }
const typeColor = { produce: '#e64545', operate: '#e8b93c', use: '#4fd0c6', recycle: '#7e57c2' }

const layers = reactive([
  { id: 'cityBoundary', name: '行政区划', color: '#5b9bd5', visible: true },
  { id: 'produce', name: '生产企业', color: '#e64545', visible: true },
  { id: 'operate', name: '经营网点', color: '#e8b93c', visible: true },
  { id: 'use', name: '使用主体', color: '#4fd0c6', visible: true },
  { id: 'recycle', name: '回收处理主体', color: '#7e57c2', visible: true },
  { id: 'warning', name: '异常预警（C-08/C-12）', color: '#ff7a45', visible: true }
])

// 异常主体：断点流水流出方（C-12）+ 负库存主体（C-08 待核查，M-05 口径）
const warningSubjectIds = computed(() => {
  const set = new Set()
  PES_FLOWS.filter((f) => f.breakPoint && f.from).forEach((f) => set.add(f.from))
  const bal = {}
  PES_FLOWS.filter((f) => f.batchId).forEach((f) => {
    if (['produce', 'purchase', 'sale', 'buy', 'return'].includes(f.type) && f.to) bal[f.to] = (bal[f.to] || 0) + f.qty
    if (['sale', 'buy'].includes(f.type) && f.from) bal[f.from] = (bal[f.from] || 0) - f.qty
  })
  Object.entries(bal).forEach(([sid, v]) => { if (v < 0) set.add(sid) })
  return [...set]
})

const warningReasons = (sid) => {
  const reasons = []
  if (PES_FLOWS.some((f) => f.from === sid && f.breakPoint)) reasons.push('存在追溯断点流出（C-12）')
  const bal = {}
  PES_FLOWS.filter((f) => f.batchId).forEach((f) => {
    if (['produce', 'purchase', 'sale', 'buy', 'return'].includes(f.type) && f.to === sid) bal[f.batchId] = (bal[f.batchId] || 0) + f.qty
    if (['sale', 'buy'].includes(f.type) && f.from === sid) bal[f.batchId] = (bal[f.batchId] || 0) - f.qty
  })
  const neg = Object.values(bal).filter((v) => v < 0).length
  if (neg) reasons.push(`${neg} 个批次库存为负，待核查（C-08）`)
  return reasons
}

const stats = computed(() => ({
  producers: PES_SUBJECTS.filter((s) => s.type === 'produce').length,
  shops: PES_SUBJECTS.filter((s) => s.type === 'operate').length,
  batches: PES_BATCHES.length,
  // 异常预警 = 断点流水数（C-12）+ 负库存主体批次（C-08 待核查）
  abnormal: PES_FLOWS.filter((f) => f.breakPoint).length +
    new Set(PES_FLOWS.filter((f) => f.from && f.breakPoint).map((f) => f.from + f.batchId)).size
}))

const subjectList = computed(() => PES_SUBJECTS.filter((s) => s.type !== 'use'))

const chartOption = computed(() => ({
  grid: { left: 40, right: 10, top: 24, bottom: 24 },
  tooltip: { trigger: 'axis' },
  legend: { top: 0, right: 0, textStyle: { color: '#a8c0dc', fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
  xAxis: { type: 'category', data: PES_MONTHLY_STATS.map((s) => s.month.slice(5)), axisLabel: { color: '#7d97b8' } },
  yAxis: { type: 'value', axisLabel: { color: '#7d97b8' }, splitLine: { lineStyle: { color: 'rgba(59,102,158,0.2)' } } },
  series: [
    { name: '产量', type: 'line', smooth: true, data: PES_MONTHLY_STATS.map((s) => s.output), itemStyle: { color: '#4fd0c6' }, areaStyle: { color: 'rgba(79,208,198,0.15)' } },
    { name: '销量', type: 'line', smooth: true, data: PES_MONTHLY_STATS.map((s) => s.sales), itemStyle: { color: '#e8b93c' } }
  ]
}))

onMounted(() => {
  baseMapRef.value.addGeoJSON('cityBoundary', anhuiCityGeo, {
    style: { color: '#5b9bd5', weight: 1, fillColor: '#173a5e', fillOpacity: 0.3 },
    onEachFeature: (feature, layer) => layer.bindTooltip(feature.properties.name, { direction: 'center' })
  })

  // 各类主体点位（GeoJSON Point 需要 pointToLayer 渲染为 circleMarker）
  import('leaflet').then(({ default: L }) => {
    Object.keys(typeColor).forEach((type) => {
      const gj = pesSubjectsGeoJSON([type])
      const layer = L.geoJSON(gj, {
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: type === 'produce' ? 8 : 6,
            color: typeColor[type],
            weight: 2,
            fillColor: typeColor[type],
            fillOpacity: 0.75
          }),
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(`<b>${feature.properties.name}</b><br/>${typeNames[type]} · ${feature.properties.status}`)
          layer.on('click', () => {
            curSubject.value = PES_SUBJECTS.find((s) => s.id === feature.properties.id)
            subjectDrawer.value = true
          })
        }
      })
      baseMapRef.value.addLayer(type, layer)
    })

    // 异常预警图层：断点/待核查主体加脉冲外环
    const warnLayer = L.layerGroup()
    warningSubjectIds.value.forEach((sid) => {
      const s = PES_SUBJECTS.find((x) => x.id === sid)
      if (!s?.center) return
      const reasons = warningReasons(sid)
      L.circleMarker([s.center[1], s.center[0]], {
        radius: 13, color: '#ff7a45', weight: 2, dashArray: '4 3', fillColor: '#ff7a45', fillOpacity: 0.08
      }).addTo(warnLayer)
      const core = L.circleMarker([s.center[1], s.center[0]], {
        radius: 7, color: '#ff7a45', weight: 3, fillColor: '#ff7a45', fillOpacity: 0.9
      }).addTo(warnLayer)
      core.bindTooltip(`<b style="color:#ff7a45">异常预警</b><br/><b>${s.name}</b><br/>${reasons.join('<br/>')}`)
      core.on('click', () => {
        warnSubject.value = { subject: s, reasons }
        warnDrawer.value = true
      })
    })
    baseMapRef.value.addLayer('warning', warnLayer)
  })
})

const locateSubject = (s) => {
  const [lng, lat] = s.center
  baseMapRef.value.flyTo([lat, lng], 10)
  setTimeout(() => {
    curSubject.value = s
    subjectDrawer.value = true
  }, 600)
}

const toggleLayer = (id, visible) => {
  const l = baseMapRef.value.getLayer(id)
  if (!l) return
  if (visible) l.addTo(baseMapRef.value.map.value)
  else baseMapRef.value.map.value.removeLayer(l)
}
</script>

<style lang="scss" scoped>
.left-panel {
  position: absolute; top: 56px; left: 12px; z-index: 400;
  width: 296px; display: flex; flex-direction: column; gap: 10px;
  max-height: calc(100% - 76px); overflow: auto;
}
.lp-card {
  background: rgba(13, 30, 52, 0.9); border: 1px solid rgba(59, 102, 158, 0.4);
  border-radius: 10px; padding: 12px 14px; backdrop-filter: blur(6px);
}
.lp-title {
  font-size: 13.5px; font-weight: 600; color: #eaf2fc; margin-bottom: 10px;
  padding-left: 8px; border-left: 3px solid #c2571a;
}
.lp-stats { display: flex; justify-content: space-between; text-align: center;
  .map-stat-value { font-size: 19px; font-weight: 700; }
  .lp-label { font-size: 11px; color: #7d97b8; margin-top: 2px; }
}
.sub-scroll { max-height: 300px; overflow: auto; }
.sub-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 4px;
  border-bottom: 1px dashed rgba(59, 102, 158, 0.3); cursor: pointer;
  &:hover { background: rgba(30, 64, 108, 0.4); }
  .sb-type { font-size: 10.5px; padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }
  .sb-name { flex: 1; font-size: 12.5px; color: #d7e3f4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
.legend-card {
  position: absolute; bottom: 16px; right: 12px; z-index: 400;
  background: rgba(13, 30, 52, 0.9); border: 1px solid rgba(59, 102, 158, 0.4);
  border-radius: 10px; padding: 10px 14px;
  .lg-title { font-size: 12.5px; font-weight: 600; color: #eaf2fc; margin-bottom: 6px; }
  .lg-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #a8c0dc; padding: 2px 0;
    .lg-dot { width: 8px; height: 8px; border-radius: 50%; }
    .lg-dot.ring { background: transparent; border: 2px dashed; width: 10px; height: 10px; } }
}
.drawer-actions { margin-top: 14px; display: flex; gap: 8px; }
</style>
