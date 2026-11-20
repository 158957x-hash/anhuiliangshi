<template>
  <div class="plot-picker" :class="{ mobile: isMobile }">
    <div class="picked-head">
      <span class="picked-summary">已选 <b>{{ modelValue.length }}</b> 块 · 合计 <b :class="{ over: isOver }">{{ pickedWeight }}</b> 吨<template v-if="limit > 0 && !isMobile">（上限 {{ limit }} 吨）</template></span>
      <el-button size="small" type="primary" plain :disabled="disabled" @click="openPicker">按图选择地块</el-button>
    </div>

    <el-table
      v-if="!isMobile"
      :data="modelValue"
      size="small"
      border
      class="picked-table"
      empty-text="尚未选择来源地块，点击右上角「按图选择地块」在地图上选取"
    >
      <el-table-column label="地块" min-width="170">
        <template #default="{ row }">
          <b>{{ row.plotName }}</b>
          <small class="cell-sub">{{ row.filedNo }}</small>
        </template>
      </el-table-column>
      <el-table-column prop="subjectName" label="种植主体" min-width="150" />
      <el-table-column label="作物 / 品种" min-width="150">
        <template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety }}</template>
      </el-table-column>
      <el-table-column label="本次重量（吨）" width="160">
        <template #default="{ row }">
          <el-input-number
            v-model="row.weight"
            size="small"
            :min="0"
            :precision="1"
            controls-position="right"
            :disabled="disabled"
            style="width: 120px"
            @change="emitModel"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center">
        <template #default="{ $index }">
          <el-button link type="danger" :disabled="disabled" @click="remove($index)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-else class="picked-cards">
      <div v-if="!modelValue.length" class="picked-empty">尚未选择来源地块，点击「按图选择地块」在地图上选取</div>
      <div v-for="(source, index) in modelValue" :key="`${source.planId}-${source.plotId}`" class="picked-card">
        <div class="picked-card-head">
          <b>{{ source.plotName }}</b>
          <span>{{ source.subjectName }}</span>
        </div>
        <div class="picked-card-meta">{{ silCropName(source.crop) }} / {{ source.variety }} · {{ source.filedNo }}</div>
        <div class="picked-card-foot">
          <el-input-number
            v-model="source.weight"
            size="small"
            :min="0"
            :precision="1"
            controls-position="right"
            :disabled="disabled"
            @change="emitModel"
          />
          <span class="unit-text">吨</span>
          <el-button link type="danger" :disabled="disabled" @click="remove(index)">移除</el-button>
        </div>
      </div>
    </div>

    <p class="picker-tip">同一地块只能被一条收储登记占用；来源地块重量合计不得超过实际收储重量。</p>

    <el-dialog
      v-model="mapVisible"
      :class="['plot-map-dialog', { 'mobile-sheet': isMobile }]"
      :width="isMobile ? '100%' : '980px'"
      :title="isMobile ? '选择来源地块' : '按图选择来源地块'"
      :append-to-body="false"
      :close-on-click-modal="false"
      @opened="onOpened"
    >
      <div class="map-filter">
        <el-select v-model="query.crop" size="small" clearable placeholder="全部作物" @change="load">
          <el-option v-for="crop in cropOptions" :key="crop.code" :label="crop.name" :value="crop.code" />
        </el-select>
        <el-input v-model="query.keyword" size="small" clearable placeholder="品种 / 主体 / 地块" @keyup.enter="load" />
        <el-button size="small" type="primary" :loading="loading" @click="load">查询</el-button>
      </div>

      <div class="map-body">
        <div class="map-canvas">
          <BaseMap ref="mapRef" :center="[32.6, 116.9]" :zoom="8" />
          <div class="map-hint">点击地图地块可选中 / 取消</div>
        </div>
        <div class="map-list">
          <div
            v-for="row in rows"
            :key="keyOf(row)"
            class="plot-item"
            :class="{ picked: draftKeys.has(keyOf(row)), full: isBlocked(row) }"
            @click="toggle(row)"
          >
            <div class="plot-main">
              <b>{{ row.plotName }}</b>
              <span>{{ row.subjectName }}</span>
            </div>
            <div class="plot-meta">{{ silCropName(row.crop) }} / {{ row.variety }} · {{ row.areaMu }} 亩 · 预计 {{ row.expectedYield }} 吨</div>
            <div class="plot-tags">
              <el-tag v-if="isBlocked(row)" size="small" type="info">已被{{ row.occupiedBy }}收储</el-tag>
              <el-tag v-else size="small" type="success" effect="plain">剩余 {{ row.remaining }} 吨</el-tag>
              <el-tag v-if="draftKeys.has(keyOf(row))" size="small" type="warning" effect="dark">已选</el-tag>
            </div>
          </div>
          <el-empty v-if="!loading && !rows.length" description="没有匹配的备案地块" :image-size="50" />
        </div>
      </div>

      <template #footer>
        <span class="map-summary">已选 <b>{{ draft.length }}</b> 块 · 合计 <b :class="{ over: isDraftOver }">{{ draftWeight }}</b> 吨<template v-if="limit > 0 && !isMobile">（上限 {{ limit }} 吨）</template></span>
        <el-button @click="mapVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMap">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import BaseMap from '@/components/map/BaseMap.vue'
import { useUserStore } from '@/stores/user'
import { matchPlanting, silCropName, SIL_CROP_OPTIONS } from '@/api/silPlan'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  crop: { type: String, default: '' },
  filedNo: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  layout: { type: String, default: 'pc' },
  limit: { type: Number, default: 0 }
})
const emit = defineEmits(['update:modelValue'])

const userStore = useUserStore()
const role = computed(() => userStore.role || {})
const isMobile = computed(() => props.layout === 'mobile')
const cropOptions = SIL_CROP_OPTIONS()

const rows = ref([])
const draft = ref([])
const loading = ref(false)
const mapVisible = ref(false)
const mapRef = ref(null)
const query = reactive({ crop: props.crop || '', keyword: '' })

const keyOf = row => `${row.planId}:${row.plotId}`
// 已被本单（同一备案号）占用的地块仍可选，避免编辑已有登记时被自己挡住
const isBlocked = row => Boolean(row.occupied) && row.occupiedFiledNo !== (props.filedNo || '')

const pickedWeight = computed(() => Math.round(props.modelValue.reduce((sum, item) => sum + Number(item.weight || 0), 0) * 10) / 10)
const draftKeys = computed(() => new Set(draft.value.map(keyOf)))
const draftWeight = computed(() => Math.round(draft.value.reduce((sum, item) => sum + Number(item.weight || 0), 0) * 10) / 10)
const isOver = computed(() => props.limit > 0 && pickedWeight.value > props.limit)
const isDraftOver = computed(() => props.limit > 0 && draftWeight.value > props.limit)

function openPicker() {
  if (props.disabled) return
  draft.value = props.modelValue.map(item => ({ ...item }))
  mapVisible.value = true
  load()
}

async function load() {
  loading.value = true
  try {
    rows.value = await matchPlanting({ crop: query.crop, keyword: query.keyword, minArea: 0 }, role.value)
    await nextTick()
    paint()
  } finally {
    loading.value = false
  }
}

function onOpened() {
  paint()
  resize()
}

function paint() {
  const map = mapRef.value
  if (!map) return
  map.removeLayer('pickerPlots')
  const features = rows.value.filter(row => row.geometry).map(row => ({
    type: 'Feature',
    properties: { key: keyOf(row), picked: draftKeys.value.has(keyOf(row)), occupied: isBlocked(row) },
    geometry: row.geometry
  }))
  if (!features.length) return
  map.addGeoJSON('pickerPlots', { type: 'FeatureCollection', features }, {
    style: feature => (feature.properties.picked
      ? { color: '#d97706', weight: 2.4, fillColor: '#f59e0b', fillOpacity: 0.42 }
      : feature.properties.occupied
        ? { color: '#9aa6b2', weight: 1.6, dashArray: '5 4', fillColor: '#cbd5e1', fillOpacity: 0.25 }
        : { color: '#1d7f6e', weight: 2, fillColor: '#34a08a', fillOpacity: 0.3 }),
    onEachFeature: (feature, layer) => layer.on('click', () => {
      const row = rows.value.find(item => keyOf(item) === feature.properties.key)
      if (row) toggle(row)
    })
  })
  fit()
}

function resize() {
  setTimeout(() => {
    const exposed = mapRef.value?.map
    const leaflet = exposed?.value || exposed
    leaflet?.invalidateSize?.()
    fit()
  }, 260)
}

function fit() {
  // center 存的是 [lng, lat]，Leaflet 需要 [lat, lng]
  const points = rows.value.filter(row => row.center).map(row => [row.center[1], row.center[0]])
  if (!points.length) return
  const lats = points.map(point => point[0])
  const lngs = points.map(point => point[1])
  mapRef.value?.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], [40, 40])
}

function toggle(row) {
  if (isBlocked(row)) return ElMessage.warning(`该地块已被${row.occupiedBy}登记收储`)
  const key = keyOf(row)
  if (draftKeys.value.has(key)) {
    draft.value = draft.value.filter(item => keyOf(item) !== key)
  } else {
    // 默认填入剩余产量，但不超过本单实际收储重量尚未分配的额度
    const remainYield = Number(row.remaining || row.expectedYield || 0)
    const capacity = props.limit > 0 ? Math.round((props.limit - draftWeight.value) * 10) / 10 : remainYield
    if (props.limit > 0 && capacity <= 0) return ElMessage.warning('已选地块重量已达实际收储重量，请先调大实际收储重量')
    draft.value = [...draft.value, {
      planId: row.planId,
      filedNo: row.filedNo,
      plotId: row.plotId,
      plotName: row.plotName,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      crop: row.crop,
      variety: row.variety,
      weight: Math.round(Math.min(remainYield, capacity) * 10) / 10
    }]
  }
  paint()
}

function confirmMap() {
  emit('update:modelValue', draft.value.map(item => ({ ...item })))
  mapVisible.value = false
}

function emitModel() {
  emit('update:modelValue', props.modelValue.map(item => ({ ...item })))
}

function remove(index) {
  emit('update:modelValue', props.modelValue.filter((_, idx) => idx !== index))
}

watch(() => props.crop, value => {
  query.crop = value || ''
  if (mapVisible.value) load()
})
</script>

<style scoped lang="scss">
.plot-picker { display: flex; flex-direction: column; gap: 8px; }
.picked-head { display: flex; align-items: center; gap: 10px; }
.picked-head .el-button { margin-left: auto; }
.picked-summary { font-size: 12px; color: #5b6b7c; }
.picked-summary b { color: #1d7f6e; font-size: 13px; }
.picked-summary b.over, .map-summary b.over { color: #e0403c; }
.picked-table { border-radius: 8px; }
.cell-sub { display: block; font-size: 11px; color: #9aa6b2; margin-top: 2px; }
.picker-tip { font-size: 11px; color: #9aa6b2; margin: 0; line-height: 1.5; }

.map-filter { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
.map-filter .el-select { width: 150px; flex: none; }
.map-filter .el-input { flex: 1; min-width: 0; }
.map-body { display: flex; gap: 10px; height: 420px; }
.map-canvas { position: relative; flex: 1; min-width: 0; border: 1px solid #e6edf6; border-radius: 8px; overflow: hidden; }
.map-hint { position: absolute; left: 8px; bottom: 8px; z-index: 400; background: rgba(255, 255, 255, 0.86); font-size: 11px; color: #5d6b7a; padding: 2px 6px; border-radius: 4px; }
.map-list { width: 320px; flex: none; overflow: auto; border: 1px solid #e6edf6; border-radius: 8px; padding: 6px; display: flex; flex-direction: column; gap: 6px; }
.plot-item { padding: 8px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
.plot-item:hover { background: #f5f8fc; }
.plot-item.picked { border-color: #f0b429; background: #fffaf0; }
.plot-item.full { opacity: 0.62; cursor: not-allowed; }
.plot-main { display: flex; align-items: baseline; gap: 4px 8px; flex-wrap: wrap; font-size: 13px; }
.plot-main b { color: #1f2d3d; }
.plot-main span { font-size: 12px; color: #7a8797; }
.plot-meta { font-size: 12px; color: #5d6b7a; margin-top: 3px; }
.plot-tags { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.map-summary { margin-right: auto; font-size: 12px; color: #5b6b7c; white-space: nowrap; }
.map-summary b { color: #1d7f6e; font-size: 13px; }

/* ===== 移动端 ===== */
.plot-picker.mobile .picked-summary { font-size: 12.5px; }
.plot-picker.mobile .picked-cards { display: flex; flex-direction: column; gap: 8px; }
.plot-picker.mobile .picked-empty { font-size: 12.5px; color: #9aa6b2; border: 1px dashed #e3eaf3; border-radius: 12px; padding: 14px 12px; text-align: center; line-height: 1.6; }
.plot-picker.mobile .picked-card { border: 1px solid #e6edf6; border-radius: 12px; padding: 10px 12px; background: #fff; }
.plot-picker.mobile .picked-card-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 13.5px; }
.plot-picker.mobile .picked-card-head span { font-size: 12px; color: #7a8797; }
.plot-picker.mobile .picked-card-meta { font-size: 12px; color: #5d6b7a; margin-top: 3px; }
.plot-picker.mobile .picked-card-foot { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.plot-picker.mobile .picked-card-foot .el-input-number { flex: 0 0 118px; width: 118px; }
.plot-picker.mobile .unit-text { font-size: 12px; color: #7a8797; }
.plot-picker.mobile .picked-card-foot .el-button { margin-left: auto; }
.plot-picker.mobile .picker-tip { font-size: 12px; }

.plot-map-dialog.mobile-sheet .map-filter { flex-wrap: nowrap; gap: 6px; margin-bottom: 10px; }
.plot-map-dialog.mobile-sheet .map-filter .el-select { width: 100px; flex: none; }
.plot-map-dialog.mobile-sheet .map-filter .el-input { flex: 1; min-width: 0; }
.plot-map-dialog.mobile-sheet .map-filter .el-button { flex: none; height: 32px; padding: 0 12px; font-size: 13px; }
.plot-map-dialog.mobile-sheet .map-body { flex-direction: column; height: auto; gap: 10px; }
.plot-map-dialog.mobile-sheet .map-canvas { flex: none; height: 220px; border-radius: 12px; }
.plot-map-dialog.mobile-sheet .map-list { width: auto; flex: none; overflow: visible; border: 0; padding: 0; gap: 8px; }
.plot-map-dialog.mobile-sheet .plot-item { border: 1px solid #e6edf6; border-radius: 12px; padding: 10px 12px; background: #fff; }
.plot-map-dialog.mobile-sheet .plot-item.picked { border-color: #f0b429; background: #fffaf0; }
.plot-map-dialog.mobile-sheet .plot-item.full { background: #f7f9fb; }
.plot-map-dialog.mobile-sheet .plot-main { font-size: 14px; }
.plot-map-dialog.mobile-sheet .plot-meta { font-size: 12.5px; line-height: 1.6; }
.plot-map-dialog.mobile-sheet .plot-tags { margin-top: 6px; }
.plot-map-dialog.mobile-sheet .map-summary { font-size: 11.5px; }
</style>
