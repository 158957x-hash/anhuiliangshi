<template>
  <div class="cockpit">
    <div class="cp-header">
      <div class="cp-time">{{ nowText }}</div>
      <h2>安徽省农药数字监督管理 · 3D 监管驾驶舱</h2>
    </div>

    <div class="cp-body">
      <!-- 左栏 -->
      <div class="cp-col left">
        <div class="cp-card">
          <h3>核心指标轮播</h3>
          <div class="kpi-carousel">
            <transition name="kfade" mode="out-in">
              <div class="kc-item" :key="carouselIdx">
                <div class="kc-num" :style="{ color: carouselItems[carouselIdx].color }">{{ carouselItems[carouselIdx].value }}<span class="kc-unit">{{ carouselItems[carouselIdx].unit }}</span></div>
                <div class="kc-label">{{ carouselItems[carouselIdx].label }}</div>
              </div>
            </transition>
            <div class="kc-dots">
              <span v-for="(it, i) in carouselItems" :key="i" class="kc-dot" :class="{ on: i === carouselIdx }"></span>
            </div>
          </div>
        </div>
        <div class="cp-card">
          <h3>监管总览</h3>
          <div class="kpi-list">
            <div class="kpi"><span class="k-num">{{ subjects.length }}</span><span class="k-label">在档主体</span></div>
            <div class="kpi"><span class="k-num">{{ batches.length }}</span><span class="k-label">追溯批次</span></div>
            <div class="kpi"><span class="k-num">{{ flows.length }}</span><span class="k-label">台账流水</span></div>
            <div class="kpi warn"><span class="k-num">{{ abnormalCount }}</span><span class="k-label">异常预警</span></div>
          </div>
        </div>
        <div class="cp-card">
          <h3>月度产销趋势（吨）</h3>
          <BaseChart :option="trendOption" height="200px" dark />
        </div>
        <div class="cp-card">
          <h3>追溯断点率</h3>
          <div class="gauge-wrap">
            <BaseChart :option="gaugeOption" height="170px" dark />
            <div class="gauge-tip">断点链路灰显不中断，移交属地核查</div>
          </div>
        </div>
      </div>

      <!-- 中栏：伪3D 主体分布 -->
      <div class="cp-col center">
        <div class="cp-card center-card">
          <h3>各地市在档主体数（3D 视图）</h3>
          <div class="scene3d">
            <div class="scene-floor"></div>
            <div v-for="c in cityStats" :key="c.code" class="bar3d" :style="{ height: c.height + 'px' }">
              <span class="bar-val">{{ c.count }}</span>
              <span class="bar-name">{{ c.name }}</span>
            </div>
          </div>
          <div class="scene-tip">柱高 = 在档主体数（生产+经营+使用+回收）· 悬停色块提示</div>
        </div>
        <div class="cp-card">
          <h3>主体类型构成</h3>
          <BaseChart :option="pieOption" height="180px" dark />
        </div>
      </div>

      <!-- 右栏 -->
      <div class="cp-col right">
        <div class="cp-card">
          <h3>包装废弃物回收（kg）</h3>
          <BaseChart :option="recycleOption" height="200px" dark />
        </div>
        <div class="cp-card">
          <h3>接口上报动态</h3>
          <div class="api-list">
            <div v-for="log in apiLogs" :key="log.id" class="api-item">
              <div class="api-row">
                <span class="api-src">{{ log.sourceSystem }}</span>
                <el-tag size="small" :type="log.failed ? 'warning' : 'success'" effect="dark" disable-transitions>{{ log.status }}</el-tag>
              </div>
              <div class="api-meta">{{ log.time }} · {{ log.total }} 条 · 成功 {{ log.success }} / 失败 {{ log.failed }}</div>
            </div>
          </div>
        </div>
        <div class="cp-card">
          <h3>滚动播报</h3>
          <div class="marquee">
            <div class="marquee-inner">
              <span v-for="(m, i) in marqueeItems" :key="i" class="mq-item">{{ m }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  PES_SUBJECTS, PES_BATCHES, PES_FLOWS, PES_RECYCLES, PES_MONTHLY_STATS, PES_API_LOGS
} from '@/mock/pes/data'
import BaseChart from '@/components/charts/BaseChart.vue'

// 核心指标轮播（design_proposal：指标口径待 C-25）
const carouselIdx = ref(0)
let carouselTimer = null
const carouselItems = computed(() => [
  { label: '在档主体（家）', value: subjects.length, unit: '', color: '#6db3ff' },
  { label: '追溯批次（个）', value: batches.length, unit: '', color: '#35d0a5' },
  { label: '台账流水（条）', value: flows.length, unit: '', color: '#ffd66b' },
  { label: '异常预警（待核查/断点）', value: abnormalCount.value, unit: '', color: '#ff8f5e' },
  { label: '累计回收重量', value: PES_RECYCLES.reduce((s, r) => s + (r.weight || 0), 0), unit: 'kg', color: '#b48fff' }
])

const CITY_NAMES = {
  3401: '合肥', 3402: '芜湖', 3403: '蚌埠', 3404: '淮南', 3405: '马鞍山', 3406: '淮北',
  3407: '铜陵', 3408: '安庆', 3410: '黄山', 3411: '滁州', 3412: '阜阳', 3413: '宿州',
  3415: '六安', 3416: '亳州', 3417: '池州', 3418: '宣城'
}

const nowText = ref('')
let timer = null
const tick = () => { nowText.value = new Date().toLocaleString('zh-CN', { hour12: false }) }

const subjects = PES_SUBJECTS
const batches = PES_BATCHES
const flows = PES_FLOWS
const apiLogs = PES_API_LOGS

// 异常预警 = 待核查库存(负库存主体) + 断点流水数（与一张图口径一致）
const abnormalCount = computed(() => {
  const breakpoint = flows.filter((f) => f.breakPoint).length
  const negStock = new Set()
  flows.forEach((f) => {
    if (f.type === 'sale' && f.from && f.qty) negStock.add(f.from + f.batchId)
  })
  return breakpoint + Math.min(negStock.size, 2)
})

const cityStats = computed(() => {
  const counts = {}
  subjects.forEach((s) => {
    const c = String(s.regionCode).slice(0, 4)
    counts[c] = (counts[c] || 0) + 1
  })
  const list = Object.entries(CITY_NAMES).map(([code, name]) => ({ code, name, count: counts[code] || 0 }))
  const max = Math.max(...list.map((i) => i.count), 1)
  return list.map((i) => ({ ...i, height: Math.max(24, Math.round((i.count / max) * 120)) }))
})

const marqueeItems = computed(() => [
  `追溯断点 ${flows.filter((f) => f.breakPoint).length} 条已移交属地核查`,
  `回收待核验 ${PES_RECYCLES.filter((r) => r.status === 'pending').length} 单`,
  `主体未确认 3 家，阻断上报`,
  `接口失败明细 ${PES_API_LOGS[0]?.failed || 0} 条待处理`
])

const trendOption = computed(() => ({
  grid: { left: 40, right: 16, top: 26, bottom: 24 },
  tooltip: { trigger: 'axis' },
  legend: { data: ['产量', '销量'], top: 0, textStyle: { color: '#9fb3cf' } },
  xAxis: { type: 'category', data: PES_MONTHLY_STATS.map((m) => m.month.slice(5) + '月'), axisLine: { lineStyle: { color: '#2a3b55' } }, axisLabel: { color: '#9fb3cf' } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1c2942' } }, axisLabel: { color: '#9fb3cf' } },
  series: [
    { name: '产量', type: 'line', smooth: true, data: PES_MONTHLY_STATS.map((m) => m.output), lineStyle: { color: '#3d8bff' }, itemStyle: { color: '#3d8bff' }, areaStyle: { color: 'rgba(61,139,255,.18)' } },
    { name: '销量', type: 'line', smooth: true, data: PES_MONTHLY_STATS.map((m) => m.sales), lineStyle: { color: '#35d0a5' }, itemStyle: { color: '#35d0a5' }, areaStyle: { color: 'rgba(53,208,165,.15)' } }
  ]
}))

const gaugeOption = computed(() => {
  const bp = flows.filter((f) => f.breakPoint).length
  const rate = Math.round((bp / Math.max(flows.length, 1)) * 1000) / 10
  return {
    series: [{
      type: 'gauge', startAngle: 200, endAngle: -20, min: 0, max: 100,
      progress: { show: true, width: 10, itemStyle: { color: '#ffb14d' } },
      axisLine: { lineStyle: { width: 10, color: [[1, '#22314d']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false }, detail: {
        valueAnimation: true, formatter: '{value}%', color: '#ffb14d', fontSize: 22, offsetCenter: [0, '10%']
      },
      data: [{ value: rate }]
    }]
  }
})

const pieOption = computed(() => {
  const nameMap = { produce: '生产', operate: '经营', use: '使用', recycle: '回收' }
  const cnt = {}
  subjects.forEach((s) => { cnt[s.type] = (cnt[s.type] || 0) + 1 })
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#9fb3cf' }, itemWidth: 10 },
    series: [{
      type: 'pie', radius: ['42%', '62%'], center: ['50%', '42%'],
      label: { show: false },
      data: Object.entries(cnt).map(([k, v]) => ({ name: nameMap[k] || k, value: v }))
    }]
  }
})

const recycleOption = computed(() => {
  const cityMap = {}
  PES_RECYCLES.forEach((r) => {
    const c = String(r.regionCode).slice(0, 4)
    cityMap[c] = (cityMap[c] || 0) + (r.weight || 0)
  })
  return {
    grid: { left: 46, right: 16, top: 20, bottom: 26 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: Object.keys(cityMap).map((c) => CITY_NAMES[c] || c), axisLine: { lineStyle: { color: '#2a3b55' } }, axisLabel: { color: '#9fb3cf' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1c2942' } }, axisLabel: { color: '#9fb3cf' } },
    series: [{ type: 'bar', data: Object.values(cityMap), itemStyle: { color: '#35d0a5', borderRadius: [3, 3, 0, 0] }, barMaxWidth: 22 }]
  }
})

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
  carouselTimer = setInterval(() => { carouselIdx.value = (carouselIdx.value + 1) % carouselItems.value.length }, 3000)
})
onUnmounted(() => { clearInterval(timer); clearInterval(carouselTimer) })
</script>

<style lang="scss" scoped>
.cockpit {
  background: radial-gradient(1200px 500px at 50% -100px, #10233f 0%, #0a1526 55%, #081120 100%);
  border-radius: 12px;
  padding: 18px 20px 22px;
  color: #d8e4f5;
  min-height: calc(100vh - 130px);
}

.cp-header {
  text-align: center;
  position: relative;
  margin-bottom: 16px;
  h2 {
    margin: 0; font-size: 26px; letter-spacing: 4px;
    background: linear-gradient(180deg, #eaf3ff, #7fb0ff);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .cp-time { position: absolute; left: 4px; top: 4px; font-size: 13px; color: #7f96b8; font-variant-numeric: tabular-nums; }
  .cp-note { position: absolute; right: 4px; top: 4px; font-size: 12px; color: #7f96b8; }
}

.cp-body {
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 14px;
  align-items: start;
}
.cp-col { display: flex; flex-direction: column; gap: 14px; }

.cp-card {
  background: rgba(16, 34, 60, 0.72);
  border: 1px solid #22375a;
  border-radius: 10px;
  padding: 12px 14px;
  h3 { margin: 0 0 10px; font-size: 14px; color: #a8c6ee; font-weight: 600; }
}

.kpi-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.kpi-carousel {
  text-align: center;
  padding: 6px 0 2px;
  .kc-item { min-height: 92px; }
  .kc-num { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
  .kc-unit { font-size: 14px; font-weight: 400; margin-left: 4px; color: #8ea6c8; }
  .kc-label { font-size: 12.5px; color: #8ea6c8; margin-top: 6px; }
  .kc-dots { display: flex; justify-content: center; gap: 6px; margin-top: 10px; }
  .kc-dot { width: 6px; height: 6px; border-radius: 50%; background: #2a3b55; transition: background .3s, width .3s;
    &.on { background: #3d8bff; width: 14px; border-radius: 3px; }
  }
}
.kfade-enter-active, .kfade-leave-active { transition: opacity .35s, transform .35s; }
.kfade-enter-from { opacity: 0; transform: translateY(8px); }
.kfade-leave-to { opacity: 0; transform: translateY(-8px); }
.kpi {
  background: rgba(61, 139, 255, 0.08);
  border: 1px solid #24406b;
  border-radius: 8px;
  padding: 10px 12px;
  .k-num { display: block; font-size: 24px; font-weight: 700; color: #6db3ff; font-variant-numeric: tabular-nums; }
  .k-label { font-size: 12px; color: #8ea6c8; }
  &.warn .k-num { color: #ffb14d; }
}

.api-list { display: flex; flex-direction: column; gap: 8px; }
.api-item {
  background: rgba(61, 139, 255, 0.05);
  border: 1px solid #24406b; border-radius: 8px; padding: 8px 10px;
  .api-row { display: flex; justify-content: space-between; align-items: center; }
  .api-src { font-size: 13px; color: #d8e4f5; }
  .api-meta { font-size: 12px; color: #8ea6c8; margin-top: 4px; }
}

.marquee { overflow: hidden; height: 118px; }
.marquee-inner { display: flex; flex-direction: column; gap: 8px; animation: mq 12s linear infinite; }
.mq-item {
  font-size: 12.5px; color: #b8ccec; background: rgba(255, 177, 77, 0.08);
  border-left: 2px solid #ffb14d; padding: 6px 8px; border-radius: 4px;
}
@keyframes mq {
  0%, 24% { transform: translateY(0); }
  33%, 57% { transform: translateY(-34px); }
  66%, 90% { transform: translateY(-68px); }
  100% { transform: translateY(-102px); }
}

// ===== 伪3D 场景 =====
.center-card { min-height: 380px; }
.scene3d {
  perspective: 900px;
  height: 260px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 14px;
  padding: 0 10px;
  transform-style: preserve-3d;
  position: relative;
}
.scene-floor {
  position: absolute; left: 6%; right: 6%; bottom: 6px; height: 46px;
  background: linear-gradient(180deg, rgba(61,139,255,.14), rgba(61,139,255,.02));
  transform: rotateX(58deg);
  transform-origin: bottom center;
  border: 1px solid rgba(61,139,255,.25);
  border-radius: 6px;
}
.bar3d {
  position: relative;
  width: 30px;
  background: linear-gradient(180deg, #3d8bff 0%, #1c4fa0 60%, #12335f 100%);
  border-radius: 4px 4px 0 0;
  transform: rotateX(18deg);
  transform-origin: bottom center;
  box-shadow: -6px 8px 0 rgba(18, 51, 95, 0.85);
  transition: transform .25s;
  display: flex; flex-direction: column; justify-content: flex-start; align-items: center;
  padding-top: 4px;
  &:hover { transform: rotateX(18deg) translateZ(10px); filter: brightness(1.25); }
  .bar-val { font-size: 12px; font-weight: 700; color: #eaf3ff; }
  .bar-name {
    position: absolute; bottom: -22px; font-size: 12px; color: #9fb3cf; white-space: nowrap;
    transform: rotateX(-18deg);
  }
}
.scene-tip { text-align: center; font-size: 12px; color: #7f96b8; margin-top: 30px; }

.gauge-wrap { position: relative;
  .gauge-tip { position: absolute; bottom: 2px; width: 100%; text-align: center; font-size: 12px; color: #7f96b8; }
}

@media (max-width: 1200px) {
  .cp-body { grid-template-columns: 1fr; }
}
</style>
