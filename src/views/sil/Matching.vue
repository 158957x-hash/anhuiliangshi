<template>
  <div class="page-container sil-matching">
    <header class="page-head">
      <div>
        <h2>养殖企业查询匹配（按图索料）</h2>
        <p>收储主体按作物、品种和区域检索已备案种植地块，查看面积、预计产量和种植主体联系方式；线下对接后回到收储申报备案。</p>
      </div>
      <div class="head-actions">
        <el-button @click="router.push('/sil/storage-declare')">我的收储申报</el-button>
        <el-button v-if="active" type="primary" :disabled="active.occupied" @click="goExecution(active)">登记实际收储</el-button>
      </div>
    </header>

    <div class="matching-body">
      <section class="panel result-panel">
        <el-form :inline="true" class="filters" @submit.prevent="search">
          <el-form-item label="作物">
            <el-select v-model="query.crop" clearable placeholder="全部作物" style="width: 150px">
              <el-option v-for="crop in cropOptions" :key="crop.code" :label="crop.name" :value="crop.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="品种 / 主体"><el-input v-model="query.keyword" clearable placeholder="如 豫青贮23" style="width: 180px" /></el-form-item>
          <el-form-item label="最小面积"><el-input-number v-model="query.minArea" :min="0" :step="50" controls-position="right" style="width: 130px" /></el-form-item>
          <el-form-item><el-button type="primary" :loading="loading" @click="search">查询匹配</el-button></el-form-item>
        </el-form>

        <div class="match-summary">
          <span>匹配地块 <b>{{ rows.length }}</b> 块</span>
          <span>可收储面积 <b>{{ totalArea.toFixed(1) }}</b> 亩</span>
          <span>预计可收 <b>{{ totalYield.toFixed(1) }}</b> 吨</span>
          <span>覆盖主体 <b>{{ subjectCount }}</b> 家</span>
        </div>

        <el-table v-loading="loading" :data="rows" stripe border height="100%" highlight-current-row class="match-table" @row-click="focusRow">
          <el-table-column label="种植主体" min-width="180" show-overflow-tooltip>
            <template #default="{ row }"><b>{{ row.subjectName }}</b><small class="cell-sub">{{ row.regionName }}</small></template>
          </el-table-column>
          <el-table-column prop="plotName" label="地块" min-width="150" show-overflow-tooltip />
          <el-table-column label="作物 / 品种" min-width="150"><template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety }}</template></el-table-column>
          <el-table-column label="面积（亩）" width="100"><template #default="{ row }">{{ row.areaMu }}</template></el-table-column>
          <el-table-column label="预计产量（吨）" width="130"><template #default="{ row }">{{ row.expectedYield }}</template></el-table-column>
          <el-table-column label="备案号" min-width="180"><template #default="{ row }">{{ row.filedNo }}</template></el-table-column>
          <el-table-column label="收储状态" width="130">
            <template #default="{ row }"><el-tag v-if="row.occupied" size="small" type="info">已被收储</el-tag><el-tag v-else size="small" type="success" effect="plain">待收储</el-tag></template>
          </el-table-column>
          <el-table-column label="联系人" width="150"><template #default="{ row }">{{ row.owner }}<small class="cell-sub">{{ row.phone }}</small></template></el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }"><el-button link type="primary" :disabled="row.occupied" @click.stop="goExecution(row)">登记实际收储</el-button></template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !rows.length" description="没有匹配的已备案地块，试试放宽作物或面积条件" :image-size="70" />
      </section>

      <section class="map-panel">
        <BaseMap ref="mapRef" :center="[32.3, 117.2]" :zoom="7" />
        <div class="map-head"><b>匹配地块分布</b><span>点击地块查看主体与产量</span></div>
        <div class="map-legend"><i class="dot" />已备案青贮地块 <i class="dot orange" />受灾补充地块</div>
        <div v-if="active" class="map-card">
          <b>{{ active.subjectName }}</b>
          <p>{{ active.plotName }} · {{ silCropName(active.crop) }} / {{ active.variety }}</p>
          <p>{{ active.areaMu }} 亩 · 预计 {{ active.expectedYield }} 吨</p>
          <p>{{ active.owner }} · {{ active.phone }}</p>
          <el-button size="small" type="primary" :disabled="active.occupied" @click="goExecution(active)">登记实际收储</el-button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import BaseMap from '@/components/map/BaseMap.vue'
import { useUserStore } from '@/stores/user'
import { SIL_CROP_OPTIONS, silCropName, matchPlanting, fetchMapData } from '@/api/silPlan'

const router = useRouter()
const userStore = useUserStore()
const role = computed(() => userStore.role)
const cropOptions = SIL_CROP_OPTIONS()
const query = reactive({ crop: '', keyword: '', minArea: 0 })
const rows = ref([])
const loading = ref(false)
const active = ref(null)
const mapRef = ref(null)
const mapReady = ref(false)
let disasterFeatures = []

const totalArea = computed(() => rows.value.reduce((sum, row) => sum + Number(row.areaMu || 0), 0))
const totalYield = computed(() => rows.value.reduce((sum, row) => sum + Number(row.expectedYield || 0), 0))
const subjectCount = computed(() => new Set(rows.value.map(row => row.subjectName)).size)

async function search() {
  loading.value = true
  active.value = null
  try {
    rows.value = await matchPlanting({ crop: query.crop, keyword: query.keyword, minArea: query.minArea }, role.value)
    render()
  } catch (error) { ElMessage.error(error?.message || '查询失败') } finally { loading.value = false }
}

function render() {
  const map = mapRef.value
  if (!map) return
  const features = rows.value.filter(row => row.geometry).map(row => ({
    type: 'Feature',
    properties: { id: row.planId, name: row.plotName },
    geometry: row.geometry
  }))
  map.addGeoJSON('matchPlots', { type: 'FeatureCollection', features }, {
    style: { color: '#1d7f6e', weight: 2, fillColor: '#2fa88f', fillOpacity: 0.35 },
    onEachFeature: (feature, layer) => {
      layer.on('click', () => {
        const row = rows.value.find(item => item.planId === feature.properties.id && item.plotName === feature.properties.name)
        if (row) focusRow(row)
      })
    }
  })
  if (disasterFeatures.length) {
    map.addGeoJSON('disasterPlots', { type: 'FeatureCollection', features: disasterFeatures }, { style: { color: '#d97706', weight: 1.5, dashArray: '4 3', fillColor: '#f59e0b', fillOpacity: 0.2 } })
  }
  const points = rows.value.filter(row => row.center).map(row => ({
    type: 'Feature',
    properties: { name: row.subjectName },
    geometry: { type: 'Point', coordinates: [row.center[1], row.center[0]] }
  }))
  map.addGeoJSON('matchSubjects', { type: 'FeatureCollection', features: points }, {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, color: '#fff', weight: 2, fillColor: '#1d4ed8', fillOpacity: 1 })
  })
  if (features.length) {
    const bbox = bboxOf(features)
    if (bbox) map.fitBounds(bbox, [40, 40])
  }
}

function bboxOf(features) {
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
  return minLat === 90 ? null : [[minLat, minLng], [maxLat, maxLng]]
}

function focusRow(row) {
  active.value = row
  if (row.center) mapRef.value?.flyTo(row.center, 12)
}

function goExecution(row) {
  if (row.occupied) return
  router.push({ path: '/sil/ledger', query: { tab: 'storage', plot: `${row.planId}:${row.plotId}` } })
}

onMounted(async () => {
  await search()
  mapReady.value = true
  try {
    const data = await fetchMapData(role.value)
    disasterFeatures = (data.disasters || []).map(item => ({ type: 'Feature', properties: { id: item.id }, geometry: item.geometry })).filter(item => item.geometry)
    render()
  } catch (error) { /* 图层补充失败不影响查询 */ }
})
watch(() => role.value?.code, search)
</script>

<style scoped lang="scss">
.sil-matching { display: flex; flex-direction: column; min-height: 0; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.page-head h2 { font-size: 18px; margin-bottom: 6px; }
.page-head p { font-size: 12px; color: var(--ah-text-muted); line-height: 1.6; max-width: 860px; }
.matching-body { display: flex; gap: 12px; flex: 1; min-height: 0; }
.result-panel { flex: 1.25; min-width: 0; display: flex; flex-direction: column; }
.result-panel :deep(.el-table) { flex: 1; min-height: 0; }
.match-summary { display: flex; flex-wrap: wrap; gap: 18px; background: #f5f8fc; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 12px; color: var(--ah-text-secondary); }
.match-summary b { color: var(--ah-primary); font-size: 15px; margin-left: 4px; }
.cell-sub { display: block; font-size: 11px; color: var(--ah-text-muted); margin-top: 2px; }
.map-panel { position: relative; flex: 0 0 40%; min-width: 380px; border-radius: 10px; overflow: hidden; border: 1px solid var(--ah-border); background: #d8e4ee; }
.map-head { position: absolute; left: 14px; top: 14px; z-index: 500; background: rgba(255, 255, 255, 0.94); border-radius: 8px; padding: 8px 12px; box-shadow: 0 4px 14px rgba(15, 40, 70, 0.12); }
.map-head b { display: block; font-size: 13px; }
.map-head span { font-size: 11px; color: var(--ah-text-muted); }
.map-legend { position: absolute; left: 14px; bottom: 14px; z-index: 500; background: rgba(255, 255, 255, 0.94); border-radius: 8px; padding: 7px 10px; font-size: 11px; color: var(--ah-text-secondary); display: flex; align-items: center; gap: 6px; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: #2fa88f; display: inline-block; margin-left: 6px; }
.dot.orange { background: #f59e0b; }
.map-card { position: absolute; right: 14px; bottom: 14px; z-index: 500; width: 250px; background: #fff; border-radius: 10px; padding: 12px 14px; box-shadow: 0 8px 24px rgba(15, 40, 70, 0.18); }
.map-card b { font-size: 14px; }
.map-card p { font-size: 12px; color: var(--ah-text-secondary); margin: 6px 0 0; }
.map-card .el-button { margin-top: 10px; }
@media (max-width: 1400px) { .map-panel { flex-basis: 36%; min-width: 320px; } }
</style>
