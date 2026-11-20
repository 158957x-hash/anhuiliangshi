<template>
  <div class="mobile-match">
    <header><el-button link @click="router.push('/mobile/wanqitong')">‹ 返回</el-button><b>按图索料</b><span /></header>

    <section class="hero">
      <div class="hero-top"><b>{{ role.unit || role.name }}</b><el-tag size="small" effect="dark" type="success">收储主体</el-tag></div>
      <p>按已备案的收储申报，在图上查找对应作物的已备案种植地块与种植主体，点地块可查看种植主体详情。</p>
    </section>

    <section class="card">
      <div class="card-title">我的收储备案</div>
      <div class="declare-chips">
        <button v-for="item in filedStorages" :key="item.id" :class="{ active: item.id === activeStorageId }" @click="selectStorage(item)">
          <b>{{ silCropName(item.crop) }} / {{ item.variety }}</b>
          <span>{{ item.filedNo || item.id }}</span>
          <span>计划 {{ item.expectedWeight }} 吨 · {{ item.price }} 元/吨</span>
        </button>
        <el-empty v-if="!filedStorages.length" description="暂无已备案的收储申报，请先完成收储申报备案" :image-size="50" />
      </div>
    </section>

    <section class="card">
      <div class="filter-row">
        <el-select v-model="query.crop" size="small" placeholder="全部作物" style="width: 116px">
          <el-option v-for="crop in cropOptions" :key="crop.code" :label="crop.name" :value="crop.code" />
        </el-select>
        <el-input v-model="query.keyword" size="small" placeholder="品种 / 主体 / 地块" clearable />
        <el-button size="small" type="primary" :loading="loading" @click="search">查询</el-button>
      </div>
      <el-checkbox v-if="activeStorage?.variety" v-model="onlySameVariety" size="small" class="variety-check">仅看与备案一致的品种（{{ activeStorage.variety }}）</el-checkbox>
    </section>

    <div class="stat-row">
      <div><b>{{ rows.length }}</b><span>匹配地块</span></div>
      <div><b>{{ fmt(totalArea) }}</b><span>面积（亩）</span></div>
      <div><b>{{ fmt(totalYield) }}</b><span>预计产量（吨）</span></div>
      <div><b>{{ subjects.length }}</b><span>种植主体</span></div>
    </div>

    <div class="mini-map"><BaseMap ref="mapRef" :center="[32.9, 115.8]" :zoom="8" /><span class="map-tip">已备案地块 · 点击查看种植主体</span></div>

    <section class="card">
      <div class="card-title">匹配的种植主体（{{ subjects.length }}）</div>
      <article v-for="item in subjects" :key="item.subjectId" class="subject-card">
        <div class="row-title"><b>{{ item.subjectName }}</b><el-tag size="small" effect="plain">{{ item.regionName }}</el-tag></div>
        <p>{{ item.plots.length }} 块 · {{ fmt(item.area) }} 亩 · 预计 {{ fmt(item.yield) }} 吨 · 可收 {{ fmt(item.remaining) }} 吨</p>
        <p class="muted">{{ item.owner }} · {{ item.phone }}</p>
        <div class="row-actions">
          <el-button link type="primary" @click="focusSubject(item)">地图定位</el-button>
          <el-button link type="primary" @click="openSubject(item)">查看种植主体详情</el-button>
        </div>
      </article>
      <el-empty v-if="!loading && !subjects.length" description="没有匹配的已备案地块，试试放宽作物或关键词" :image-size="55" />
    </section>

    <el-dialog class="mobile-sheet" v-model="subjectVisible" title="种植主体详情" width="94%">
      <div class="subject-head">
        <b>{{ activeSubject?.subjectName }}</b>
        <el-tag size="small" effect="plain">{{ activeSubject?.regionName }}</el-tag>
      </div>
      <div class="detail-grid">
        <div><span>主体类型</span><b>{{ typeName(activeSubject?.subjectType) }}</b></div>
        <div><span>联系人</span><b>{{ activeSubject?.owner || '—' }}</b></div>
        <div><span>联系电话</span><b>{{ activeSubject?.phone || '—' }}</b></div>
        <div><span>匹配地块</span><b>{{ activeSubject?.plots.length }} 块 · {{ fmt(activeSubject?.area) }} 亩</b></div>
        <div><span>预计产量</span><b>{{ fmt(activeSubject?.yield) }} 吨</b></div>
        <div><span>可收储余量</span><b>{{ fmt(activeSubject?.remaining) }} 吨</b></div>
      </div>
      <div class="detail-title">已备案地块（{{ activeSubject?.plots.length }} 块）</div>
      <div class="plot-detail-list">
        <div v-for="(plot, index) in activeSubject?.plots || []" :key="`${plot.planId}-${plot.plotId}`" class="plot-detail">
          <div class="plot-detail-head"><b>{{ index + 1 }}. {{ plot.plotName }}</b><el-tag size="small" :type="plot.occupied ? 'info' : 'success'" effect="plain">{{ plot.occupied ? '已收储' : '待收储' }}</el-tag></div>
          <p>{{ silCropName(plot.crop) }} / {{ plot.variety }} · {{ plot.areaMu }} 亩 · 预计 {{ plot.expectedYield }} 吨</p>
          <p class="muted">{{ plot.filedNo }} · 可收 {{ plot.remaining }} 吨</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="subjectVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!activeStorageId" @click="goExecution">去登记实际收储</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import BaseMap from '@/components/map/BaseMap.vue'
import { useUserStore } from '@/stores/user'
import { SIL_CROP_OPTIONS, silCropName, matchPlanting, fetchStorages } from '@/api/silPlan'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const role = computed(() => userStore.role || {})
const cropOptions = SIL_CROP_OPTIONS()

const loading = ref(false)
const storages = ref([])
const rows = ref([])
const activeStorageId = ref('')
const onlySameVariety = ref(true)
const query = reactive({ crop: '', keyword: '' })
const mapRef = ref(null)
const subjectVisible = ref(false)
const activeSubject = ref(null)

const filedStorages = computed(() => storages.value.filter(row => row.status === 'filed'))
const activeStorage = computed(() => filedStorages.value.find(row => row.id === activeStorageId.value) || null)
const totalArea = computed(() => rows.value.reduce((sum, row) => sum + Number(row.areaMu || 0), 0))
const totalYield = computed(() => rows.value.reduce((sum, row) => sum + Number(row.expectedYield || 0), 0))
const subjects = computed(() => {
  const map = new Map()
  rows.value.forEach(row => {
    const key = row.subjectId
    const prev = map.get(key) || { subjectId: row.subjectId, subjectName: row.subjectName, subjectType: row.subjectType || '', regionName: row.regionName, owner: row.owner, phone: row.phone, plots: [], area: 0, yield: 0, remaining: 0 }
    prev.plots.push(row)
    prev.area += Number(row.areaMu || 0)
    prev.yield += Number(row.expectedYield || 0)
    prev.remaining += Number(row.remaining || 0)
    map.set(key, prev)
  })
  return [...map.values()].sort((a, b) => b.remaining - a.remaining)
})

const typeName = code => ({ cooperative: '合作社', family_farm: '家庭农场', enterprise: '农业企业', livestock_enterprise: '养殖企业', livestock_household: '养殖户', third_party: '第三方收储服务组织' }[code] || code || '—')
const fmt = value => (value === null || value === undefined || value === '' ? '—' : Number(value).toFixed(1))

async function loadStorages() {
  try {
    storages.value = await fetchStorages({}, role.value)
    if (!activeStorageId.value && filedStorages.value.length) {
      const fromQuery = String(route.query.storage || '')
      const hit = filedStorages.value.find(row => row.id === fromQuery) || filedStorages.value[0]
      selectStorage(hit)
      return
    }
  } catch (error) { ElMessage.error(error?.message || '加载收储备案失败') }
}

function selectStorage(item) {
  if (!item) return
  activeStorageId.value = item.id
  query.crop = item.crop || ''
  search()
}

async function search() {
  loading.value = true
  try {
    const data = await matchPlanting({ crop: query.crop, keyword: query.keyword }, role.value)
    const variety = activeStorage.value?.variety
    rows.value = onlySameVariety.value && variety ? data.filter(row => row.variety === variety) : data
    await nextTick()
    render()
  } catch (error) { ElMessage.error(error?.message || '查询失败') } finally { loading.value = false }
}

function render() {
  const map = mapRef.value
  if (!map) return
  const features = rows.value.filter(row => row.geometry).map(row => ({
    type: 'Feature',
    properties: { key: `${row.planId}:${row.plotId}` },
    geometry: row.geometry
  }))
  map.addGeoJSON('matchPlots', { type: 'FeatureCollection', features }, {
    style: { color: '#1d7f6e', weight: 2, fillColor: '#2fa88f', fillOpacity: 0.35 },
    onEachFeature: (feature, layer) => {
      layer.on('click', () => {
        const row = rows.value.find(item => `${item.planId}:${item.plotId}` === feature.properties.key)
        if (!row) return
        const subject = subjects.value.find(item => item.subjectId === row.subjectId)
        if (subject) openSubject(subject)
      })
    }
  })
  const points = rows.value.filter(row => row.center).map(row => ({
    type: 'Feature',
    properties: { subjectId: row.subjectId },
    geometry: { type: 'Point', coordinates: [row.center[1], row.center[0]] }
  }))
  map.addGeoJSON('matchSubjects', { type: 'FeatureCollection', features: points }, {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, color: '#fff', weight: 2, fillColor: '#1d4ed8', fillOpacity: 1 }),
    onEachFeature: (feature, layer) => {
      layer.on('click', () => {
        const subject = subjects.value.find(item => item.subjectId === feature.properties.subjectId)
        if (subject) openSubject(subject)
      })
    }
  })
  if (features.length) {
    const bbox = bboxOf(features)
    if (bbox) map.fitBounds(bbox, [30, 30])
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

function focusSubject(subject) {
  const points = subject.plots.filter(plot => plot.center).map(plot => [plot.center[1], plot.center[0]])
  if (!points.length) return
  const lats = points.map(point => point[0])
  const lngs = points.map(point => point[1])
  mapRef.value?.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], [40, 40])
}

function openSubject(subject) {
  if (!subject) return
  activeSubject.value = subject
  subjectVisible.value = true
  focusSubject(subject)
}

function goExecution() {
  if (!activeStorageId.value) return ElMessage.warning('请先选择收储备案')
  subjectVisible.value = false
  router.push({ path: '/mobile/wqt-silage', query: { tab: 'execution', storage: activeStorageId.value } })
}

onMounted(async () => {
  await loadStorages()
  if (!activeStorageId.value) await search()
})
watch(onlySameVariety, () => search())
watch(() => role.value.code, () => { loadStorages() })
</script>

<style scoped lang="scss">
.mobile-match { box-sizing: border-box; width: 100%; min-width: 0; background: #f5f7fa; padding: 0 12px 24px; overflow-x: hidden; color: #344054; }
.mobile-match header { display: grid; grid-template-columns: 65px minmax(0, 1fr) 65px; align-items: center; height: 58px; text-align: center; }
.mobile-match header b { font-size: 19px; color: #243b53; }
.hero { background: linear-gradient(135deg, #176b58, #2d9d7c); color: #fff; border-radius: 14px; padding: 16px; }
.hero-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hero-top b { font-size: 17px; }
.hero p { margin: 8px 0 0; font-size: 12px; opacity: 0.9; line-height: 1.6; }
.card { background: #fff; border-radius: 12px; padding: 13px; margin-top: 12px; }
.card-title { font-weight: 700; color: #243b5a; margin-bottom: 9px; font-size: 14px; }
.declare-chips { display: flex; flex-direction: column; gap: 8px; }
.declare-chips button { border: 1px solid #dbe6f0; background: #fff; border-radius: 10px; padding: 9px 11px; text-align: left; color: #344054; }
.declare-chips button.active { border-color: #2d9d7c; background: #f2fbf7; }
.declare-chips b { display: block; font-size: 13px; color: #243b53; }
.declare-chips span { display: block; font-size: 11px; color: #8a98a7; margin-top: 4px; word-break: break-all; }
.filter-row { display: flex; align-items: center; gap: 8px; }
.filter-row :deep(.el-input) { flex: 1; min-width: 0; }
.variety-check { margin-top: 9px; }
.stat-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.stat-row div { background: #fff; border-radius: 10px; padding: 11px 6px; text-align: center; }
.stat-row b { display: block; font-size: 17px; color: #176b58; }
.stat-row span { display: block; font-size: 11px; color: #8a98a7; margin-top: 4px; }
.mini-map { position: relative; height: 230px; border-radius: 12px; overflow: hidden; border: 1px solid #dbe6f0; margin-top: 12px; background: #d8e4ee; }
.map-tip { position: absolute; z-index: 500; left: 10px; top: 10px; background: rgba(255, 255, 255, 0.94); border-radius: 6px; padding: 5px 8px; font-size: 11px; color: #5b6b7c; }
.subject-card { border-top: 1px solid #edf0f5; padding: 11px 0; }
.subject-card:first-of-type { border-top: 0; padding-top: 0; }
.row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.row-title b { font-size: 14px; color: #243b53; line-height: 1.5; }
.subject-card p { font-size: 12px; color: #7a8b9e; margin: 6px 0 0; line-height: 1.5; }
.subject-card p.muted { color: #9aa6b2; }
.row-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 4px; }
.subject-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #f4fbf8; border-radius: 8px; padding: 10px 12px; }
.subject-head b { font-size: 15px; color: #243b53; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.detail-grid span { display: block; font-size: 11px; color: #8a98a7; }
.detail-grid b { display: block; font-size: 12px; color: #33475f; margin-top: 3px; }
.detail-title { font-size: 13px; font-weight: 700; color: #243b5a; margin: 14px 0 8px; }
.plot-detail-list { display: flex; flex-direction: column; gap: 8px; }
.plot-detail { border: 1px solid #e8eef5; border-radius: 8px; padding: 8px 10px; }
.plot-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.plot-detail-head b { font-size: 12px; color: #33475f; }
.plot-detail p { margin: 4px 0 0; font-size: 11px; color: #7a8b9e; line-height: 1.5; }
.plot-detail p.muted { color: #9aa6b2; }
</style>
