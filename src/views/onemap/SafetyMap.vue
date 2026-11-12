<template>
  <div class="map-dark-page">
    <BaseMap ref="baseMapRef" />

    <DrillBreadcrumb code="340000" />

    <LayerControl :layers="layers" @toggle="toggleLayer" />

    <!-- 图层属性入口 + 属性面板（演示元数据） -->
    <button class="layer-meta-trigger" @click="layerPanelVisible = !layerPanelVisible">图层属性</button>
    <div v-if="layerPanelVisible" class="layer-meta-panel">
      <div class="lmp-head">
        <span>图层属性</span>
        <span class="lmp-tag">演示元数据</span>
        <button class="lmp-close" @click="layerPanelVisible = false">×</button>
      </div>
      <div class="lmp-tabs">
        <button v-for="l in layers" :key="l.id" :class="{ active: metaLayerId === l.id }" @click="metaLayerId = l.id">{{ l.name }}</button>
      </div>
      <div v-if="metaLayer" class="lmp-body">
        <div class="lmp-row"><span>图层名称</span><b>{{ metaLayer.name }}</b></div>
        <div class="lmp-row"><span>图层类型</span><b>{{ metaLayer.meta.type }}</b></div>
        <div class="lmp-row"><span>数据来源</span><b>{{ metaLayer.meta.source }}</b></div>
        <div class="lmp-row"><span>年度/时相</span><b>{{ metaLayer.meta.year }}</b></div>
        <div class="lmp-row"><span>更新时间</span><b>{{ metaLayer.meta.updated }}</b></div>
        <div class="lmp-row"><span>脱密标识</span><b :class="{ secret: metaLayer.meta.secret }">{{ metaLayer.meta.security }}</b></div>
      </div>
    </div>

    <!-- 左侧面板：全局态势 -->
    <div class="left-panel">
      <div class="lp-card">
        <div class="lp-title">全省粮食安全态势<span class="demo-note">演示数据</span></div>
        <div class="lp-stats">
          <div class="lp-stat"><div class="map-stat-value num" style="color:#d3e5ff">{{ stats.total }}</div><div class="lp-label">事件总数</div></div>
          <div class="lp-stat"><div class="map-stat-value num" style="color:#FF4C4C">{{ stats.pending }}</div><div class="lp-label">待处置</div></div>
          <div class="lp-stat"><div class="map-stat-value num" style="color:#F97D47">{{ stats.doing }}</div><div class="lp-label">处置中</div></div>
          <div class="lp-stat"><div class="map-stat-value num" style="color:#3EE8FF">{{ stats.rate }}%</div><div class="lp-label">办结率</div></div>
        </div>
      </div>

      <div class="lp-card">
        <div class="lp-title">智能预警<span class="demo-note">演示数据</span></div>
        <div class="alert-row" v-for="a in alerts" :key="a.label">
          <span class="al-dot" :style="{ background: a.color }" />
          <span class="al-label">{{ a.label }}</span>
          <span class="al-count num">{{ a.count }}</span>
        </div>
      </div>

      <div class="lp-card">
        <div class="lp-title">事件列表</div>
        <el-select v-model="statusFilter" size="small" style="width:100%; margin-bottom:8px" placeholder="按状态筛选">
          <el-option label="全部状态" value="" />
          <el-option v-for="(v, k) in EVENT_STATUS" :key="k" :label="v.name" :value="k" />
        </el-select>
        <div class="evt-scroll">
          <div v-for="e in filteredEvents" :key="e.id" class="evt-row" @click="locateEvent(e)">
            <StatusTag :dict="EVENT_STATUS" :value="e.status" />
            <div class="er-info">
              <div class="er-code num">{{ e.code }}</div>
              <div class="er-desc">{{ e.regionName }} · {{ EVENT_TYPE_MAP[e.type]?.name }} · {{ e.spot.areaMu }}亩</div>
            </div>
            <el-icon v-if="e.overdue" color="#FF4C4C" :size="14"><AlarmClock /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例（六图层，暗色图例规范） -->
    <div class="legend-card">
      <div class="lg-title">图层图例</div>
      <div class="lg-row"><span class="lg-color lg-line" style="border-color:#3A8AE6" />行政区划</div>
      <div class="lg-row"><span class="lg-color" style="background:#38D191" />耕地</div>
      <div class="lg-row"><span class="lg-color" style="background:#3EE8FF" />永久基本农田</div>
      <div class="lg-row"><span class="lg-color" style="background:#3A8AE6" />高标准农田</div>
      <div class="lg-row"><span class="lg-color" style="background:#FF4C4C" />变化图斑（按事件状态着色）</div>
      <div class="lg-row"><span class="lg-color" style="background:#F97D47" />长势偏差区域</div>
    </div>

    <!-- 图斑穿透抽屉（与事件中心同编号串联） -->
    <el-drawer v-model="eventDrawer" :title="curEvent?.code + ' 事件详情'" size="440px" append-to-body>
      <template v-if="curEvent">
        <div class="ev-head">
          <StatusTag :dict="EVENT_STATUS" :value="curEvent.status" solid />
          <StatusTag :dict="RISK_MAP" :value="curEvent.risk" />
          <el-tag size="small" effect="plain">{{ EVENT_TYPE_MAP[curEvent.type]?.name }}</el-tag>
          <el-tag size="small" type="info" effect="plain">{{ EVENT_SOURCE_MAP[curEvent.source]?.name }}</el-tag>
          <el-tag v-if="curEvent.overdue" size="small" type="danger" effect="dark">已超期</el-tag>
        </div>
        <el-descriptions :column="1" border size="small" style="margin-top: 12px">
          <el-descriptions-item label="所在区域">{{ curEvent.regionName }}</el-descriptions-item>
          <el-descriptions-item label="涉及主体">{{ curEvent.subjectName }}</el-descriptions-item>
          <el-descriptions-item label="图斑面积">{{ curEvent.spot.areaMu }} 亩</el-descriptions-item>
          <el-descriptions-item label="发现时间">{{ curEvent.foundTime }}</el-descriptions-item>
          <el-descriptions-item label="处置时限">{{ curEvent.deadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="当前环节">{{ EVENT_STATUS[curEvent.status]?.name }}{{ curEvent.assignee ? ' · ' + curEvent.assignee : '' }}</el-descriptions-item>
          <el-descriptions-item label="事件描述" :span="1">{{ curEvent.desc }}</el-descriptions-item>
        </el-descriptions>

        <div class="sub-title">处置轨迹</div>
        <FlowSteps :steps="curEvent.trail" />

        <div class="drawer-actions">
          <el-button type="primary" size="small" @click="$router.push('/fsr/events')">进入事件中心处置</el-button>
          <el-button size="small" @click="$router.push('/fsr/task')">查看任务跟踪</el-button>
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
import StatusTag from '@/components/common/StatusTag.vue'
import FlowSteps from '@/components/common/FlowSteps.vue'
import { FSR_EVENTS } from '@/mock/fsr/events'
import { EVENT_STATUS, EVENT_TYPE_MAP, EVENT_SOURCE_MAP, RISK_MAP } from '@/mock/common/dict'
import anhuiCityGeo from '@/mock/geo/anhui-city.json'
import { PLOTS } from '@/mock/geo/plot-gen'
import { circlePolygon, offsetPoint } from '@/map/geoUtils'

const baseMapRef = ref(null)
const eventDrawer = ref(false)
const curEvent = ref(null)
const statusFilter = ref('')

// 六个图层（全部可开关）+ 演示元数据
const layers = reactive([
  {
    id: 'cityBoundary', name: '行政区划', color: '#3A8AE6', visible: true,
    meta: { type: '矢量面图层（行政界线）', source: '数智基座公共图层服务（演示）', year: '2025年度', updated: '2026-06-30', security: '已脱密（演示）', secret: false }
  },
  {
    id: 'farmland', name: '耕地', color: '#38D191', visible: true,
    meta: { type: '矢量面图层', source: '数智基座公共图层服务（演示）', year: '2024年度国土变更调查（演示）', updated: '2026-05-12', security: '已脱密（演示）', secret: false }
  },
  {
    id: 'basicFarm', name: '永久基本农田', color: '#3EE8FF', visible: true,
    meta: { type: '矢量面图层', source: '数智基座公共图层服务（演示）', year: '2024年度划定成果（演示）', updated: '2026-05-12', security: '涉密-仅内业环境可见（原型以脱密示意数据展示）', secret: true }
  },
  {
    id: 'hiStandard', name: '高标准农田', color: '#3A8AE6', visible: true,
    meta: { type: '矢量面图层', source: '数智基座公共图层服务（演示）', year: '2025年度建成入库（演示）', updated: '2026-06-18', security: '已脱密（演示）', secret: false }
  },
  {
    id: 'spots', name: '变化图斑', color: '#FF4C4C', visible: true,
    meta: { type: '矢量面图层（监管事件图斑）', source: '本系统（第3包遥感成果）', year: '2026年 · 时相2026-09', updated: '实时（随事件更新）', security: '已脱密（演示）', secret: false }
  },
  {
    id: 'longTerm', name: '长势偏差区域', color: '#F97D47', visible: true,
    meta: { type: '专题分析面图层', source: '本系统（长势专题产品）', year: '2026年 · 时相2026-09', updated: '2026-09-30', security: '已脱密（演示）', secret: false }
  }
])

const layerPanelVisible = ref(false)
const metaLayerId = ref('cityBoundary')
const metaLayer = computed(() => layers.find((l) => l.id === metaLayerId.value))

const stats = computed(() => {
  const total = FSR_EVENTS.length
  const pending = FSR_EVENTS.filter((e) => ['pending', 'checking'].includes(e.status)).length
  const doing = FSR_EVENTS.filter((e) => ['reported', 'reviewing', 'audited', 'recheck'].includes(e.status)).length
  const closed = FSR_EVENTS.filter((e) => e.status === 'closed').length
  return { total, pending, doing, rate: Math.round((closed / total) * 100) }
})

const alerts = computed(() => [
  { label: '新增疑似图斑（近7日）', count: FSR_EVENTS.filter((e) => e.foundTime >= '2026-09-22').length, color: '#FF4C4C' },
  { label: '超期未处置', count: FSR_EVENTS.filter((e) => e.overdue).length, color: '#F97D47' },
  { label: '高风险事件', count: FSR_EVENTS.filter((e) => e.risk === 'high' && e.status !== 'closed').length, color: '#FF4C4C' },
  { label: '长势明显偏差区域', count: FSR_EVENTS.filter((e) => e.type === 'zhangshi').length, color: '#F97D47' }
])

const filteredEvents = computed(() =>
  statusFilter.value ? FSR_EVENTS.filter((e) => e.status === statusFilter.value) : FSR_EVENTS
)

const statusColor = (s) => EVENT_STATUS[s]?.color || '#999'

// 由现有地块数据派生三类农田覆盖示意面（同一地块中心缩放/偏移生成，仅演示）
const landPlots = PLOTS.filter((p) => p.geometry)
const farmlandFeatures = landPlots.map((p) => ({ type: 'Feature', properties: { name: p.name }, geometry: p.geometry }))
const basicFarmFeatures = landPlots
  .filter((_, i) => i % 2 === 0)
  .map((p) => ({ type: 'Feature', properties: { name: p.name }, geometry: { type: 'Polygon', coordinates: [circlePolygon(p.center, 0.9, 7)] } }))
const hiStandardFeatures = landPlots
  .filter((_, i) => i % 3 === 0)
  .map((p) => ({ type: 'Feature', properties: { name: `${p.name}（高标准示意）` }, geometry: { type: 'Polygon', coordinates: [circlePolygon(offsetPoint(p.center, 0.7, 0.7), 0.7, 7)] } }))

onMounted(() => {
  // 行政区划
  baseMapRef.value.addGeoJSON('cityBoundary', anhuiCityGeo, {
    style: { color: '#3A8AE6', weight: 1, fillColor: '#173a5e', fillOpacity: 0.3 },
    onEachFeature: (feature, layer) => layer.bindTooltip(feature.properties.name, { direction: 'center' })
  })

  // 耕地（示意覆盖层：由地块数据生成）
  baseMapRef.value.addGeoJSON('farmland', {
    type: 'FeatureCollection',
    features: farmlandFeatures
  }, {
    style: { color: '#38D191', weight: 1, fillColor: '#38D191', fillOpacity: 0.16 },
    onEachFeature: (feature, layer) => layer.bindTooltip(`耕地（示意）：${feature.properties.name}`, { sticky: true })
  })

  // 永久基本农田（耕地图斑内缩小示意，青色）
  baseMapRef.value.addGeoJSON('basicFarm', {
    type: 'FeatureCollection',
    features: basicFarmFeatures
  }, {
    style: { color: '#3EE8FF', weight: 1, fillColor: '#3EE8FF', fillOpacity: 0.22 },
    onEachFeature: (feature, layer) => layer.bindTooltip(`永久基本农田（示意）：${feature.properties.name}`, { sticky: true })
  })

  // 高标准农田（地块中心偏移示意，辅助蓝）
  baseMapRef.value.addGeoJSON('hiStandard', {
    type: 'FeatureCollection',
    features: hiStandardFeatures
  }, {
    style: { color: '#3A8AE6', weight: 1, fillColor: '#3A8AE6', fillOpacity: 0.22 },
    onEachFeature: (feature, layer) => layer.bindTooltip(`高标准农田（示意）：${feature.properties.name}`, { sticky: true })
  })

  // 长势偏差区域（橙色半透明固定演示面：取长势异常事件图斑）
  const zhangshi = FSR_EVENTS.filter((e) => e.type === 'zhangshi')
  baseMapRef.value.addGeoJSON('longTerm', {
    type: 'FeatureCollection',
    features: zhangshi.map((e) => ({ type: 'Feature', properties: {}, geometry: e.spot.geometry }))
  }, {
    style: { color: '#F97D47', weight: 3, fillColor: '#F97D47', fillOpacity: 0.15, dashArray: '8 6' }
  })

  // 变化图斑（事件图层最后注册，保持点位点击/弹窗/穿透在最上层）
  baseMapRef.value.addGeoJSON('spots', {
    type: 'FeatureCollection',
    features: FSR_EVENTS.map((e) => ({
      type: 'Feature',
      properties: { id: e.id, code: e.code, status: e.status, risk: e.risk, overdue: e.overdue },
      geometry: e.spot.geometry
    }))
  }, {
    style: (f) => ({
      color: statusColor(f.properties.status),
      weight: f.properties.risk === 'high' ? 2 : 1.2,
      fillColor: statusColor(f.properties.status),
      fillOpacity: f.properties.status === 'closed' ? 0.25 : 0.55,
      dashArray: f.properties.overdue ? '5 4' : null
    }),
    onEachFeature: (feature, layer) => {
      const ev = FSR_EVENTS.find((e) => e.id === feature.properties.id)
      layer.bindTooltip(`<b>${ev.code}</b><br/>${ev.regionName} · ${EVENT_TYPE_MAP[ev.type]?.name}<br/>状态：${EVENT_STATUS[ev.status]?.name}${ev.overdue ? '（已超期）' : ''}`, { sticky: true })
      layer.on('click', () => openEvent(ev))
    }
  })
})

const openEvent = (ev) => {
  curEvent.value = ev
  eventDrawer.value = true
}

const locateEvent = (ev) => {
  const [lng, lat] = ev.spot.center
  baseMapRef.value.flyTo([lat, lng], 11)
  setTimeout(() => openEvent(ev), 600)
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
  background: rgba(10, 17, 23, 0.9); border: 1px solid rgba(62, 232, 255, 0.35);
  border-radius: 10px; padding: 12px 14px; backdrop-filter: blur(6px);
}
.lp-title {
  display: flex; align-items: center;
  font-size: 13.5px; font-weight: 600; color: #eaf2fc; margin-bottom: 10px;
  padding-left: 8px; border-left: 3px solid #3EE8FF;
}
.demo-note { margin-left: auto; font-size: 11px; font-weight: 400; color: #90A6CA; }
.lp-stats { display: flex; justify-content: space-between; text-align: center;
  .map-stat-value { font-size: 19px; font-weight: 700; }
  .lp-label { font-size: 11px; color: #90A6CA; margin-top: 2px; }
}
.alert-row { display: flex; align-items: center; gap: 8px; padding: 5px 0;
  .al-dot { width: 8px; height: 8px; border-radius: 50%; }
  .al-label { flex: 1; font-size: 12.5px; color: #d3e5ff; }
  .al-count { font-size: 15px; font-weight: 700; color: #fff; }
}
.evt-scroll { max-height: 320px; overflow: auto; }
.evt-row {
  display: flex; align-items: center; gap: 8px; padding: 7px 4px;
  border-bottom: 1px dashed rgba(62, 232, 255, 0.25); cursor: pointer;
  &:hover { background: rgba(62, 232, 255, 0.08); }
  .er-info { flex: 1; min-width: 0; }
  .er-code { font-size: 12px; color: #9fc0e8; }
  .er-desc { font-size: 11.5px; color: #90A6CA; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

/* 图层属性面板（演示元数据） */
.layer-meta-trigger {
  position: absolute; top: 12px; right: 212px; z-index: 500;
  background: rgba(10, 17, 23, 0.9); border: 1px solid rgba(62, 232, 255, 0.45);
  color: #3EE8FF; font-size: 12.5px; padding: 7px 12px; border-radius: 8px; cursor: pointer;
  &:hover { background: rgba(62, 232, 255, 0.12); }
}
.layer-meta-panel {
  position: absolute; top: 50px; right: 212px; z-index: 500; width: 262px;
  background: rgba(10, 17, 23, 0.92); border: 1px solid rgba(62, 232, 255, 0.35);
  border-radius: 10px; backdrop-filter: blur(6px); overflow: hidden;
}
.lmp-head {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
  border-bottom: 1px solid rgba(62, 232, 255, 0.2);
  color: #d3e5ff; font-size: 13px; font-weight: 600;
  .lmp-tag { margin-left: auto; font-size: 10.5px; font-weight: 400; color: #90A6CA; border: 1px solid rgba(144, 166, 202, 0.4); border-radius: 4px; padding: 1px 5px; }
  .lmp-close { background: none; border: none; color: #90A6CA; font-size: 16px; cursor: pointer; padding: 0 2px; }
}
.lmp-tabs {
  display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 10px 0;
  button { border: 1px solid rgba(144, 166, 202, 0.35); background: transparent; color: #90A6CA; font-size: 11.5px; padding: 3px 8px; border-radius: 4px; cursor: pointer;
    &.active { color: #3EE8FF; border-color: rgba(62, 232, 255, 0.6); background: rgba(62, 232, 255, 0.1); } }
}
.lmp-body { padding: 10px 12px 12px;
  .lmp-row { display: flex; gap: 8px; padding: 3px 0; font-size: 12px;
    span { width: 62px; flex-shrink: 0; color: #90A6CA; }
    b { flex: 1; color: #d3e5ff; font-weight: 500; line-height: 1.5;
      &.secret { color: #F97D47; } } }
}

/* 图例（暗色图例规范：底 #000@50%、文字≥12px #90A6CA、内边距15px） */
.legend-card {
  position: absolute; bottom: 16px; right: 12px; z-index: 400;
  background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(62, 232, 255, 0.35);
  border-radius: 8px; padding: 15px;
  .lg-title { font-size: 12.5px; font-weight: 600; color: #d3e5ff; margin-bottom: 8px; }
  .lg-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #90A6CA; padding: 3px 0;
    .lg-color { width: 14px; height: 9px; border-radius: 2px; flex-shrink: 0; opacity: 0.85; }
    .lg-line { background: transparent; border-top: 2px solid; height: 2px; } }
}
.ev-head { display: flex; flex-wrap: wrap; gap: 6px; }
.sub-title {
  font-size: 13.5px; font-weight: 600; margin: 16px 0 10px;
  padding-left: 8px; border-left: 3px solid var(--ah-primary);
}
.drawer-actions { margin-top: 14px; display: flex; gap: 8px; }
</style>
