<template>
  <div class="map-page sil-map">
    <BaseMap ref="mapRef" :center="[32.9, 115.8]" :zoom="8" />

    <aside class="map-side">
      <div class="side-head">
        <h2>种植上图</h2>
        <p>已备案青贮地块按图斑上图，点面结合查看种植主体、品种、面积和预计产量。</p>
      </div>
      <div class="side-stats">
        <div><b>{{ stats.plans }}</b><span>备案计划</span></div>
        <div><b>{{ stats.plots }}</b><span>地块数</span></div>
        <div><b>{{ stats.area.toFixed(0) }}</b><span>备案面积（亩）</span></div>
        <div><b>{{ stats.yield.toFixed(0) }}</b><span>预计产量（吨）</span></div>
      </div>
      <el-input v-model="keyword" placeholder="搜索主体 / 品种 / 备案号" clearable size="small" class="side-search" />
      <el-select v-model="region" clearable placeholder="全部属地（省 / 市 / 县）" size="small" class="side-region">
        <el-option v-for="item in regionOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <div class="side-list">
        <article v-for="plan in filteredPlans" :key="plan.id" class="plan-card" :class="{ active: selected?.id === plan.id }" @click="selectPlan(plan)">
          <header><b>{{ plan.subjectName }}</b><el-tag size="small" effect="plain">{{ plan.regionName }}</el-tag></header>
          <p>{{ plan.filedNo }}</p>
          <div class="plan-meta"><span>{{ plan.plots.length }} 块</span><span>{{ Number(plan.area).toFixed(1) }} 亩</span><span>{{ Number(plan.expectedYield).toFixed(1) }} 吨</span></div>
          <footer>{{ cropSummary(plan) }}</footer>
        </article>
        <el-empty v-if="!filteredPlans.length" description="暂无备案地块" :image-size="60" />
      </div>
    </aside>

    <div class="map-toolbar">
      <el-checkbox-group v-model="visibleLayers" size="small">
        <el-checkbox-button label="filed">备案地块</el-checkbox-button>
        <el-checkbox-button label="fence">数字围栏</el-checkbox-button>
        <el-checkbox-button label="disaster">受灾补充</el-checkbox-button>
        <el-checkbox-button label="subject">主体点位</el-checkbox-button>
      </el-checkbox-group>
    </div>

    <div class="map-legend">
      <span><i class="sw filed" />已备案种植地块</span>
      <span><i class="sw fence" />备案地块数字围栏</span>
      <span><i class="sw disaster" />受灾补充地块</span>
      <span><i class="dot" />种植主体</span>
    </div>

    <section v-if="selected" class="detail-card">
      <header>
        <div><h3>{{ selected.subjectName }}</h3><p>{{ selected.regionName }} · {{ selected.filedNo }}</p></div>
        <el-button link @click="selected = null">关闭</el-button>
      </header>
      <div class="detail-stats">
        <div><span>地块</span><b>{{ selected.plots.length }} 块</b></div>
        <div><span>面积</span><b>{{ Number(selected.area).toFixed(1) }} 亩</b></div>
        <div><span>预计产量</span><b>{{ Number(selected.expectedYield).toFixed(1) }} 吨</b></div>
      </div>
      <el-table :data="selected.plots" size="small" border max-height="220">
        <el-table-column prop="name" label="地块" min-width="120" show-overflow-tooltip />
        <el-table-column label="作物 / 品种" min-width="150"><template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety }}</template></el-table-column>
        <el-table-column prop="areaMu" label="面积" width="80" />
        <el-table-column prop="expectedYield" label="产量" width="80" />
      </el-table>
      <div class="detail-foot">
        <span>{{ selected.owner }} · {{ selected.phone }}</span>
        <el-button size="small" @click="goLedger">查看生产台账</el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import BaseMap from '@/components/map/BaseMap.vue'
import { useUserStore } from '@/stores/user'
import { fetchMapData, silCropName } from '@/api/silPlan'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const role = computed(() => userStore.role)
const mapRef = ref(null)
const plans = ref([])
const disasters = ref([])
const keyword = ref('')
const region = ref('')
const selected = ref(null)
const visibleLayers = ref(['filed', 'fence', 'disaster', 'subject'])
const stats = reactive({ plans: 0, plots: 0, area: 0, yield: 0 })

const regionOptions = computed(() => [...new Set(plans.value.map(plan => plan.regionName).filter(Boolean))])
const filteredPlans = computed(() => plans.value.filter(plan => (!region.value || plan.regionName === region.value) && (!keyword.value || `${plan.subjectName} ${plan.filedNo} ${cropSummary(plan)} ${plan.regionName}`.includes(keyword.value))))

function cropSummary(plan) {
  const names = [...new Set(plan.plots.map(plot => silCropName(plot.crop)))]
  return names.join('、')
}

async function load() {
  try {
    const data = await fetchMapData(role.value)
    plans.value = data.plans
    disasters.value = data.disasters
    stats.plans = plans.value.length
    stats.plots = plans.value.reduce((sum, plan) => sum + plan.plots.length, 0)
    stats.area = plans.value.reduce((sum, plan) => sum + Number(plan.area || 0), 0)
    stats.yield = plans.value.reduce((sum, plan) => sum + Number(plan.expectedYield || 0), 0)
    render()
    const planId = route.query.planId
    if (planId) {
      const plan = plans.value.find(item => item.id === planId)
      if (plan) selectPlan(plan)
    } else if (plans.value.length) {
      fitAll()
    }
  } catch (error) { ElMessage.error(error?.message || '加载失败') }
}

function plotFeatures() {
  const features = []
  filteredPlans.value.forEach(plan => {
    plan.plots.forEach(plot => {
      if (!plot.geometry) return
      features.push({
        type: 'Feature',
        properties: {
          planId: plan.id, plotName: plot.name, subjectName: plan.subjectName,
          crop: silCropName(plot.crop), variety: plot.variety, areaMu: plot.areaMu,
          expectedYield: plot.expectedYield, filedNo: plan.filedNo
        },
        geometry: plot.geometry
      })
    })
  })
  return features
}

function render() {
  const map = mapRef.value
  if (!map) return
  map.removeLayer('filedPlots')
  map.removeLayer('fencePlots')
  map.removeLayer('disasterPlots')
  map.removeLayer('subjectPoints')

  const features = plotFeatures()
  if (visibleLayers.value.includes('filed')) {
    map.addGeoJSON('filedPlots', { type: 'FeatureCollection', features }, {
      style: { color: '#1d7f6e', weight: 2, fillColor: '#34a08a', fillOpacity: 0.32 },
      onEachFeature: (feature, layer) => layer.on('click', () => selectPlanById(feature.properties.planId))
    })
  }
  if (visibleLayers.value.includes('fence')) {
    map.addGeoJSON('fencePlots', { type: 'FeatureCollection', features }, {
      style: { color: '#0f766e', weight: 1.2, dashArray: '6 4', fill: false },
      onEachFeature: (feature, layer) => layer.on('click', () => selectPlanById(feature.properties.planId))
    })
  }
  if (visibleLayers.value.includes('disaster')) {
    const disasterFeatures = disasters.value.filter(item => item.geometry).map(item => ({
      type: 'Feature',
      properties: { name: item.plotName, subjectName: item.subjectName },
      geometry: item.geometry
    }))
    map.addGeoJSON('disasterPlots', { type: 'FeatureCollection', features: disasterFeatures }, {
      style: { color: '#d97706', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.28 }
    })
  }
  if (visibleLayers.value.includes('subject')) {
    const points = filteredPlans.value.filter(plan => plan.plots[0]?.center).map(plan => ({
      type: 'Feature',
      properties: { planId: plan.id, name: plan.subjectName },
      geometry: { type: 'Point', coordinates: [plan.plots[0].center[1], plan.plots[0].center[0]] }
    }))
    map.addGeoJSON('subjectPoints', { type: 'FeatureCollection', features: points }, {
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, color: '#fff', weight: 2, fillColor: '#1d4ed8', fillOpacity: 1 }),
      onEachFeature: (feature, layer) => layer.on('click', () => selectPlanById(feature.properties.planId))
    })
  }
}

function selectPlanById(id) {
  const plan = plans.value.find(item => item.id === id)
  if (plan) selectPlan(plan)
}

function selectPlan(plan) {
  selected.value = plan
  const centers = plan.plots.map(plot => plot.center).filter(Boolean)
  if (!centers.length) return
  const lats = centers.map(center => center[0])
  const lngs = centers.map(center => center[1])
  mapRef.value?.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], [80, 80])
}

function fitAll() {
  const features = plotFeatures()
  if (!features.length) return
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  features.forEach(feature => {
    const walk = coords => {
      if (typeof coords[0] === 'number') {
        minLng = Math.min(minLng, coords[0]); maxLng = Math.max(maxLng, coords[0])
        minLat = Math.min(minLat, coords[1]); maxLat = Math.max(maxLat, coords[1])
      } else coords.forEach(walk)
    }
    walk(feature.geometry.coordinates)
  })
  mapRef.value?.fitBounds([[minLat, minLng], [maxLat, maxLng]], [40, 40])
}

function goLedger() { router.push('/sil/ledger') }

onMounted(load)
watch(visibleLayers, render, { deep: true })
watch([keyword, region], () => { render(); fitAll(); selected.value = null })
watch(() => role.value?.code, load)
</script>

<style scoped lang="scss">
.map-page { position: absolute; inset: 0; overflow: hidden; background: #d8e4ee; }
.map-side { position: absolute; z-index: 600; left: 16px; top: 16px; bottom: 16px; width: 320px; background: rgba(255, 255, 255, 0.97); border-radius: 12px; box-shadow: 0 10px 30px rgba(15, 40, 70, 0.16); display: flex; flex-direction: column; padding: 16px; }
.side-head h2 { font-size: 17px; margin-bottom: 6px; }
.side-head p { font-size: 11px; color: var(--ah-text-muted); line-height: 1.6; }
.side-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
.side-stats div { background: #f4f8fd; border-radius: 8px; padding: 8px 10px; }
.side-stats b { display: block; font-size: 18px; color: var(--ah-primary); font-variant-numeric: tabular-nums; }
.side-stats span { font-size: 11px; color: var(--ah-text-muted); }
.side-search { margin-bottom: 8px; }
.side-region { margin-bottom: 10px; }
.side-list { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 2px; }
.plan-card { border: 1px solid #e6edf6; border-radius: 9px; padding: 10px 12px; cursor: pointer; transition: all 0.15s ease; background: #fff; }
.plan-card:hover, .plan-card.active { border-color: #2fa88f; box-shadow: 0 4px 14px rgba(47, 168, 143, 0.16); }
.plan-card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.plan-card header b { font-size: 13px; }
.plan-card p { font-size: 11px; color: var(--ah-text-muted); margin: 4px 0 6px; }
.plan-meta { display: flex; gap: 10px; font-size: 11px; color: var(--ah-text-secondary); }
.plan-meta span { background: #f4f8fd; border-radius: 4px; padding: 2px 6px; }
.plan-card footer { font-size: 11px; color: var(--ah-text-muted); margin-top: 6px; }
.map-toolbar { position: absolute; z-index: 600; right: 16px; top: 16px; background: rgba(255, 255, 255, 0.96); border-radius: 8px; padding: 6px 8px; box-shadow: 0 6px 18px rgba(15, 40, 70, 0.12); }
.map-legend { position: absolute; z-index: 600; right: 16px; bottom: 16px; background: rgba(255, 255, 255, 0.96); border-radius: 8px; padding: 8px 12px; box-shadow: 0 6px 18px rgba(15, 40, 70, 0.12); font-size: 11px; color: var(--ah-text-secondary); display: flex; flex-direction: column; gap: 6px; }
.map-legend span { display: flex; align-items: center; gap: 6px; }
.sw { width: 16px; height: 9px; border-radius: 2px; display: inline-block; }
.sw.filed { background: #34a08a; }
.sw.fence { border: 1px dashed #0f766e; background: transparent; }
.sw.disaster { background: #f59e0b; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: #1d4ed8; display: inline-block; margin-left: 3px; }
.detail-card { position: absolute; z-index: 650; right: 16px; top: 64px; width: 380px; background: #fff; border-radius: 12px; box-shadow: 0 14px 40px rgba(15, 40, 70, 0.2); padding: 14px 16px; }
.detail-card header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.detail-card h3 { font-size: 15px; }
.detail-card header p { font-size: 11px; color: var(--ah-text-muted); margin-top: 4px; }
.detail-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
.detail-stats div { background: #f4f8fd; border-radius: 8px; padding: 8px 10px; }
.detail-stats span { display: block; font-size: 11px; color: var(--ah-text-muted); }
.detail-stats b { font-size: 14px; color: var(--ah-primary); }
.detail-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; font-size: 12px; color: var(--ah-text-secondary); }
</style>
