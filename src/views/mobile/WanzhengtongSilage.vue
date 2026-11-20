<template>
  <div class="mobile-silage" v-loading="loading">
    <header><el-button link @click="goBack">‹ 返回</el-button><b>青贮饲料管理</b><el-button link @click="load">刷新</el-button></header>

    <section class="hero">
      <b>{{ roleLabel }}</b>
      <p>{{ role.regionName }} · {{ isCounty ? '态势总览、主体信息查询与备案审核' : isTown ? '一张图查看与主体信息查询' : '辖区青贮备案态势与主体信息查询' }}</p>
    </section>

    <nav class="mobile-tabs" :class="{ two: !isCounty }">
      <button v-for="item in tabs" :key="item.key" :class="{ active: tab === item.key }" @click="tab = item.key">{{ item.label }}</button>
    </nav>

    <!-- 一张图 -->
    <template v-if="tab === 'map'">
      <div class="metrics">
        <div><b>{{ stats.plans }}</b><span>备案计划</span></div>
        <div><b>{{ stats.plots }}</b><span>地块数</span></div>
        <div><b>{{ stats.area.toFixed(0) }}</b><span>备案面积（亩）</span></div>
        <div><b>{{ stats.yield.toFixed(0) }}</b><span>预计产量（吨）</span></div>
      </div>
      <div class="mini-map"><BaseMap ref="mapRef" :center="[32.9, 115.8]" :zoom="8" /><span class="map-tip">已备案地块 · 点击查看主体</span></div>
      <section class="card">
        <div class="card-title">备案地块清单</div>
        <article v-for="plan in plans" :key="plan.id" class="row" @click="selectPlan(plan)">
          <div class="row-title"><b>{{ plan.subjectName }}</b><el-tag size="small" effect="plain">{{ plan.regionName }}</el-tag></div>
          <small>{{ plan.filedNo }}</small>
          <p>{{ plan.plots.length }} 块 · {{ Number(plan.area).toFixed(1) }} 亩 · {{ Number(plan.expectedYield).toFixed(1) }} 吨</p>
          <div class="chips"><span v-for="crop in cropNames(plan)" :key="crop">{{ crop }}</span></div>
        </article>
        <el-empty v-if="!plans.length" description="暂无备案地块" :image-size="55" />
      </section>
    </template>

    <!-- 主体信息查询 -->
    <template v-else-if="tab === 'subject'">
      <section class="card">
        <div class="card-title">种植主体（{{ planting.length }}）</div>
        <article v-for="item in planting" :key="item.id" class="row">
          <div class="row-title"><b>{{ item.name }}</b><el-tag size="small" effect="plain">{{ item.regionName }}</el-tag></div>
          <p>{{ item.type }} · {{ item.owner }} · {{ item.phone }}</p>
          <p class="muted">已备案 {{ item.filedCount }} 份 · {{ item.filedArea.toFixed(1) }} 亩 · 预计 {{ item.filedYield.toFixed(1) }} 吨</p>
          <div class="row-actions"><el-button link type="primary" @click="toggleSubject(`p-${item.id}`)">{{ expandedSubject === `p-${item.id}` ? '收起备案信息' : '查看备案信息' }}</el-button></div>
          <div v-if="expandedSubject === `p-${item.id}`" class="detail-list">
            <div v-for="plan in item.plans" :key="plan.id" class="detail-row">
              <b>{{ plan.filedNo || '未备案' }}</b>
              <span>{{ plan.year }} {{ plan.season }} · {{ plan.plots.length }} 块 · {{ plan.area }} 亩 · {{ plan.expectedYield }} 吨</span>
            </div>
            <p v-if="!item.plans.length" class="muted">暂无备案记录</p>
          </div>
        </article>
        <el-empty v-if="!planting.length" description="属地暂无种植主体" :image-size="55" />
      </section>
      <section class="card">
        <div class="card-title">收储主体（{{ storage.length }}）</div>
        <article v-for="item in storage" :key="item.id" class="row">
          <div class="row-title"><b>{{ item.name }}</b><el-tag size="small" effect="plain">{{ item.regionName }}</el-tag></div>
          <p>{{ item.type }} · {{ item.owner }} · {{ item.phone }}</p>
          <p class="muted">已备案 {{ item.filedCount }} 份 · {{ item.filedWeight.toFixed(1) }} 吨</p>
          <div class="row-actions"><el-button link type="primary" @click="toggleSubject(`s-${item.id}`)">{{ expandedSubject === `s-${item.id}` ? '收起备案信息' : '查看备案信息' }}</el-button></div>
          <div v-if="expandedSubject === `s-${item.id}`" class="detail-list">
            <div v-for="row in item.declares" :key="row.id" class="detail-row">
              <b>{{ row.filedNo || '未备案' }}</b>
              <span>{{ silCropName(row.crop) }} / {{ row.variety }} · {{ row.expectedWeight }} 吨 · {{ row.price }} 元/吨 · {{ SIL_PLAN_STATUS[row.status]?.name || row.status }}</span>
            </div>
            <p v-if="!item.declares.length" class="muted">暂无备案记录</p>
          </div>
        </article>
        <el-empty v-if="!storage.length" description="属地暂无收储主体" :image-size="55" />
      </section>
    </template>

    <!-- 备案审核 -->
    <template v-else>
      <div class="status-chips">
        <button v-for="item in statusOptions" :key="item.key" :class="{ active: auditStatus === item.key }" @click="auditStatus = item.key">
          {{ item.label }}（{{ item.count }}）
        </button>
      </div>

      <section class="card">
        <div class="card-title">种植计划</div>
        <article v-for="item in auditPlanRows" :key="item.id" class="row">
          <div class="row-title"><b>{{ item.subjectName }}</b><el-tag size="small" :type="SIL_PLAN_STATUS[item.status]?.tag" effect="plain">{{ SIL_PLAN_STATUS[item.status]?.name }}</el-tag></div>
          <small>{{ item.id }}<template v-if="item.filedNo"> · {{ item.filedNo }}</template></small>
          <p>{{ item.plots.length }} 块 · {{ Number(item.area).toFixed(1) }} 亩 · {{ Number(item.expectedYield).toFixed(1) }} 吨</p>
          <div class="row-actions">
            <el-button v-if="item.status === 'pending'" link type="primary" @click="openAudit(item, 'plan')">去审核</el-button>
            <el-button v-else link type="primary" @click="toggleAudit(`p-${item.id}`)">{{ expandedAudit === `p-${item.id}` ? '收起' : '查看详情' }}</el-button>
          </div>
          <div v-if="expandedAudit === `p-${item.id}`" class="detail-list">
            <div class="detail-row"><b>办理结果</b><span>{{ auditSummary(item) }}</span></div>
            <div v-for="(trail, index) in item.auditTrail" :key="index" class="detail-row"><b>{{ trail.action }}</b><span>{{ trail.time }} · {{ trail.user }}<template v-if="trail.opinion"> · {{ trail.opinion }}</template></span></div>
          </div>
        </article>
        <el-empty v-if="!auditPlanRows.length" :description="`暂无${statusName}的种植计划`" :image-size="55" />
      </section>

      <section class="card">
        <div class="card-title">收储申报</div>
        <article v-for="item in auditStorageRows" :key="item.id" class="row">
          <div class="row-title"><b>{{ item.storageSubjectName }}</b><el-tag size="small" :type="SIL_PLAN_STATUS[item.status]?.tag" effect="plain">{{ SIL_PLAN_STATUS[item.status]?.name }}</el-tag></div>
          <small>{{ item.id }}<template v-if="item.filedNo"> · {{ item.filedNo }}</template></small>
          <p>{{ silCropName(item.crop) }} / {{ item.variety }} · {{ item.expectedWeight }} 吨 · {{ item.price }} 元/吨</p>
          <div class="row-actions">
            <el-button v-if="item.status === 'pending'" link type="primary" @click="openAudit(item, 'storage')">去审核</el-button>
            <el-button v-else link type="primary" @click="toggleAudit(`s-${item.id}`)">{{ expandedAudit === `s-${item.id}` ? '收起' : '查看详情' }}</el-button>
          </div>
          <div v-if="expandedAudit === `s-${item.id}`" class="detail-list">
            <div class="detail-row"><b>办理结果</b><span>{{ auditSummary(item) }}</span></div>
            <div v-for="(trail, index) in item.auditTrail" :key="index" class="detail-row"><b>{{ trail.action }}</b><span>{{ trail.time }} · {{ trail.user }}<template v-if="trail.opinion"> · {{ trail.opinion }}</template></span></div>
          </div>
        </article>
        <el-empty v-if="!auditStorageRows.length" :description="`暂无${statusName}的收储申报`" :image-size="55" />
      </section>
    </template>

    <el-dialog class="mobile-sheet" v-model="auditVisible" :title="auditType === 'plan' ? '种植计划备案审核' : '收储备案审核'" width="92%">
      <div class="audit-target"><b>{{ auditType === 'plan' ? auditRow?.subjectName : auditRow?.storageSubjectName }}</b><span>{{ auditType === 'plan' ? `${auditRow?.area} 亩 · ${auditRow?.year} ${auditRow?.season}` : `${auditRow?.expectedWeight} 吨 · ${auditRow?.price} 元/吨` }}</span></div>
      <el-radio-group v-model="auditAction" class="audit-actions"><el-radio label="pass">审核通过</el-radio><el-radio label="reject">驳回</el-radio></el-radio-group>
      <el-input v-model="auditOpinion" type="textarea" :rows="3" :placeholder="auditAction === 'pass' ? '审核意见（选填）' : '请填写驳回原因'" />
      <template #footer><el-button @click="auditVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitAudit">提交</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import BaseMap from '@/components/map/BaseMap.vue'
import { useUserStore } from '@/stores/user'
import {
  SIL_PLAN_STATUS, silCropName,
  fetchMapData, fetchSubjectCheck, fetchPlans, fetchStorages, auditPlan, auditStorage
} from '@/api/silPlan'

const router = useRouter()
const userStore = useUserStore()
const role = computed(() => userStore.role || {})
const isCounty = computed(() => role.value.code === 'county')
const isTown = computed(() => role.value.code === 'town')
const roleLabel = computed(() => (isCounty.value ? '县级青贮监管' : isTown.value ? '乡镇青贮查询' : '青贮饲料态势总览'))
const tabs = computed(() => isCounty.value
  ? [{ key: 'map', label: '一张图' }, { key: 'subject', label: '主体信息' }, { key: 'audit', label: '备案审核' }]
  : [{ key: 'map', label: '一张图' }, { key: 'subject', label: '主体信息' }])
const tab = ref('map')
const loading = ref(false)
const saving = ref(false)
const plans = ref([])
const planting = ref([])
const storage = ref([])
const auditPlans = ref([])
const auditStorages = ref([])
const auditStatus = ref('pending')
const expandedSubject = ref('')
const expandedAudit = ref('')
const stats = reactive({ plans: 0, plots: 0, area: 0, yield: 0 })
const mapRef = ref(null)
const auditVisible = ref(false)
const auditType = ref('plan')
const auditRow = ref(null)
const auditAction = ref('pass')
const auditOpinion = ref('')

const statusOptions = computed(() => [
  { key: 'pending', label: '待审核', count: auditPlans.value.filter(row => row.status === 'pending').length + auditStorages.value.filter(row => row.status === 'pending').length },
  { key: 'filed', label: '已通过', count: auditPlans.value.filter(row => row.status === 'filed').length + auditStorages.value.filter(row => row.status === 'filed').length },
  { key: 'rejected', label: '已驳回', count: auditPlans.value.filter(row => row.status === 'rejected').length + auditStorages.value.filter(row => row.status === 'rejected').length }
])
const statusName = computed(() => SIL_PLAN_STATUS[auditStatus.value]?.name || '')
const auditPlanRows = computed(() => auditPlans.value.filter(row => row.status === auditStatus.value))
const auditStorageRows = computed(() => auditStorages.value.filter(row => row.status === auditStatus.value))

watch(tab, async value => {
  if (value === 'map') { await nextTick(); renderMap() }
})

const cropNames = plan => [...new Set(plan.plots.map(plot => `${silCropName(plot.crop)}/${plot.variety || '待补'}`))]

function auditSummary(row) {
  if (row.status === 'filed') return `已通过 · ${row.filedNo || ''}`
  if (row.status === 'rejected') return '已驳回'
  return '待审核'
}

function toggleSubject(key) { expandedSubject.value = expandedSubject.value === key ? '' : key }
function toggleAudit(key) { expandedAudit.value = expandedAudit.value === key ? '' : key }

async function load() {
  loading.value = true
  try {
    const [mapData, subjectData] = await Promise.all([fetchMapData(role.value), fetchSubjectCheck(role.value)])
    plans.value = mapData.plans
    planting.value = subjectData.planting
    storage.value = subjectData.storage
    stats.plans = plans.value.length
    stats.plots = plans.value.reduce((sum, plan) => sum + plan.plots.length, 0)
    stats.area = plans.value.reduce((sum, plan) => sum + Number(plan.area || 0), 0)
    stats.yield = plans.value.reduce((sum, plan) => sum + Number(plan.expectedYield || 0), 0)
    if (isCounty.value) {
      const [planRows, storageRows] = await Promise.all([fetchPlans({}, role.value), fetchStorages({}, role.value)])
      auditPlans.value = planRows
      auditStorages.value = storageRows
    }
    await nextTick()
    renderMap()
  } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}

function renderMap() {
  const map = mapRef.value
  if (!map) return
  map.removeLayer('filedPlots')
  const features = []
  plans.value.forEach(plan => plan.plots.forEach(plot => {
    if (!plot.geometry) return
    features.push({ type: 'Feature', properties: { planId: plan.id }, geometry: plot.geometry })
  }))
  map.addGeoJSON('filedPlots', { type: 'FeatureCollection', features }, {
    style: { color: '#1d7f6e', weight: 2, fillColor: '#34a08a', fillOpacity: 0.35 },
    onEachFeature: (feature, layer) => layer.on('click', () => { const plan = plans.value.find(item => item.id === feature.properties.planId); if (plan) selectPlan(plan) })
  })
  if (features.length) {
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
    map.fitBounds([[minLat, minLng], [maxLat, maxLng]], [20, 20])
  }
}

function selectPlan(plan) {
  const centers = plan.plots.map(plot => plot.center).filter(Boolean)
  if (!centers.length) return
  const lats = centers.map(center => center[0])
  const lngs = centers.map(center => center[1])
  mapRef.value?.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], [40, 40])
  ElMessage.info(`${plan.subjectName} · ${plan.plots.length} 块 · ${plan.area} 亩 · 预计 ${plan.expectedYield} 吨`)
}

function openAudit(row, type) { auditType.value = type; auditRow.value = row; auditAction.value = 'pass'; auditOpinion.value = ''; auditVisible.value = true }
async function submitAudit() {
  if (auditAction.value === 'reject' && !auditOpinion.value.trim()) return ElMessage.warning('驳回请填写原因')
  saving.value = true
  try {
    const result = auditType.value === 'plan'
      ? await auditPlan(auditRow.value.id, auditAction.value, auditOpinion.value, role.value)
      : await auditStorage(auditRow.value.id, auditAction.value, auditOpinion.value, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success(auditAction.value === 'pass' ? `审核通过：${result.filedNo}` : '已驳回')
    auditVisible.value = false
    auditStatus.value = auditAction.value === 'pass' ? 'filed' : 'rejected'
    load()
  } finally { saving.value = false }
}

function goBack() {
  router.push(isCounty.value || isTown.value ? '/mobile/wzt-home' : '/entry')
}

onMounted(load)
watch(() => role.value.code, () => { tab.value = 'map'; auditStatus.value = 'pending'; load() })
</script>

<style scoped lang="scss">
.mobile-silage { box-sizing: border-box; width: 100%; min-width: 0; background: #f5f7fa; padding: 0 12px 24px; overflow-x: hidden; color: #344054; }
.mobile-silage header { display: grid; grid-template-columns: 65px minmax(0, 1fr) 65px; align-items: center; height: 58px; text-align: center; }
.mobile-silage header b { font-size: 19px; color: #243b53; }
.hero { background: linear-gradient(135deg, #1f5f8b, #2f86b8); color: #fff; border-radius: 14px; padding: 16px; }
.hero b { font-size: 17px; }
.hero p { margin: 8px 0 0; font-size: 12px; opacity: 0.9; }
.mobile-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: #fff; padding: 4px; border-radius: 10px; margin: 12px 0 4px; gap: 3px; }
.mobile-tabs.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.mobile-tabs button { border: 0; background: transparent; padding: 11px 4px; font-size: 12px; color: #7a899a; border-radius: 8px; }
.mobile-tabs button.active { color: #1f5f8b; background: #eaf2f8; font-weight: 600; }
.metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 12px 0; }
.metrics div { background: #fff; border-radius: 12px; padding: 13px 10px; }
.metrics b, .metrics span { display: block; }
.metrics b { font-size: 21px; color: #1f6f9e; }
.metrics span { font-size: 12px; color: #7e899a; margin-top: 5px; }
.mini-map { position: relative; height: 240px; border-radius: 12px; overflow: hidden; border: 1px solid #dbe6f0; margin-bottom: 12px; background: #d8e4ee; }
.map-tip { position: absolute; z-index: 500; left: 10px; top: 10px; background: rgba(255, 255, 255, 0.94); border-radius: 6px; padding: 5px 8px; font-size: 11px; color: #5b6b7c; }
.card { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.card-title { font-weight: 700; color: #243b5a; margin-bottom: 8px; font-size: 14px; }
.row { border-top: 1px solid #edf0f5; padding: 12px 0; }
.row:first-of-type { border-top: 0; }
.row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.row-title b { font-size: 14px; color: #243b5a; }
.row small { display: block; font-size: 11px; color: #9aa6b2; margin-top: 6px; word-break: break-all; }
.row p { font-size: 12px; color: #7a8b9e; margin: 6px 0 0; line-height: 1.5; }
.row p.muted { color: #9aa6b2; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.chips span { background: #f1f7f5; color: #2d7a63; border-radius: 5px; padding: 3px 7px; font-size: 11px; }
.row-actions { display: flex; justify-content: flex-end; margin-top: 6px; }
.detail-list { background: #f7f9fc; border-radius: 8px; padding: 8px 10px; margin-top: 8px; }
.detail-row { padding: 5px 0; border-top: 1px dashed #e4e9f0; }
.detail-row:first-child { border-top: 0; }
.detail-row b { display: block; font-size: 12px; color: #33475f; }
.detail-row span { display: block; font-size: 11px; color: #7a8b9e; margin-top: 3px; line-height: 1.5; }
.status-chips { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 12px 0; }
.status-chips button { border: 1px solid #dbe6f0; background: #fff; border-radius: 8px; padding: 9px 4px; font-size: 12px; color: #5b6b7c; }
.status-chips button.active { border-color: #1f6f9e; color: #1f6f9e; background: #eaf2f8; font-weight: 600; }
.audit-target { background: #f5f8fc; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
.audit-target b, .audit-target span { display: block; }
.audit-target span { font-size: 12px; color: #7a8b9e; margin-top: 4px; }
.audit-actions { display: flex; gap: 14px; margin-bottom: 10px; }
</style>
