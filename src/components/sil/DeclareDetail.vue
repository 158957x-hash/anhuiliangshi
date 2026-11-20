<template>
  <div class="declare-detail" :class="{ compact }">
    <section class="dd-block">
      <h4>申报主体</h4>
      <div class="dd-grid">
        <div class="dd-item"><span>主体名称</span><b>{{ row.subjectName || row.storageSubjectName || '—' }}</b></div>
        <div class="dd-item"><span>主体类型</span><b>{{ typeName }}</b></div>
        <div class="dd-item"><span>属地</span><b>{{ row.regionName || '—' }}</b></div>
        <div class="dd-item"><span>联系人</span><b>{{ row.owner || '—' }}<template v-if="row.phone"> · {{ row.phone }}</template></b></div>
      </div>
    </section>

    <section class="dd-block">
      <h4>{{ isPlan ? '种植计划信息' : '收储申报信息' }}</h4>
      <div class="dd-grid">
        <template v-if="isPlan">
          <div class="dd-item"><span>计划年度</span><b>{{ row.year }} 年 {{ row.season }}</b></div>
          <div class="dd-item"><span>申报方式</span><b>{{ row.source === 'agent' ? '县级代办' : '主体自主申报' }}</b></div>
          <div class="dd-item"><span>地块 / 面积</span><b>{{ (row.plots || []).length }} 块 · {{ fmt(row.area) }} 亩</b></div>
          <div class="dd-item"><span>预计产量</span><b>{{ fmt(row.expectedYield) }} 吨</b></div>
        </template>
        <template v-else>
          <div class="dd-item"><span>收储作物 / 品种</span><b>{{ silCropName(row.crop) }} / {{ row.variety }}</b></div>
          <div class="dd-item"><span>预计收储重量</span><b>{{ fmt(row.expectedWeight) }} 吨</b></div>
          <div class="dd-item"><span>预计单价</span><b>{{ fmt(row.price) }} 元/吨</b></div>
          <div class="dd-item"><span>预计金额</span><b>{{ Number(row.amount || 0).toLocaleString() }} 元</b></div>
          <div class="dd-item"><span>收储用途</span><b>{{ SIL_STORAGE_USAGE[row.usage] || row.usage || '—' }}</b></div>
          <div class="dd-item"><span>收储合同</span><b>{{ (row.contractFiles || []).length ? `${row.contractFiles.length} 份已上传` : '未上传' }}</b></div>
        </template>
        <div class="dd-item"><span>提交时间</span><b>{{ row.submittedAt || row.createdAt || '—' }}</b></div>
      </div>
    </section>

    <section v-if="isPlan && (row.plots || []).length" class="dd-block">
      <h4>地块明细（{{ row.plots.length }} 块）</h4>
      <div class="dd-rows">
        <div v-for="(plot, index) in row.plots" :key="plot.plotId || index" class="dd-row">
          <div class="dd-row-head"><b>{{ index + 1 }}. {{ plot.name }}</b><span>{{ fmt(plot.areaMu) }} 亩</span></div>
          <p>{{ silCropName(plot.crop) }} / {{ plot.variety || '待补' }} · 预计 {{ fmt(plot.expectedYield) }} 吨</p>
        </div>
      </div>
    </section>

    <section v-if="isPlan && row.progress && row.progress.filled" class="dd-block">
      <h4>种植进度</h4>
      <div class="dd-grid">
        <div class="dd-item"><span>播种时间</span><b>{{ row.progress.sowingDate || '—' }}</b></div>
        <div class="dd-item"><span>收割时间</span><b>{{ row.progress.harvestDate || '—' }}</b></div>
        <div class="dd-item"><span>实际面积</span><b>{{ row.progress.actualArea ?? '—' }} 亩</b></div>
        <div class="dd-item"><span>实际产量</span><b>{{ row.progress.actualYield ?? '—' }} 吨</b></div>
      </div>
    </section>

    <section v-if="!isPlan && execution && execution.filled" class="dd-block">
      <h4>实际收储</h4>
      <div class="dd-grid">
        <div class="dd-item"><span>实际重量</span><b>{{ fmt(execution.actualWeight) }} 吨</b></div>
        <div class="dd-item"><span>实际单价</span><b>{{ fmt(execution.actualPrice) }} 元/吨</b></div>
        <div class="dd-item"><span>收储时间</span><b>{{ execution.actualTime || '—' }}</b></div>
        <div class="dd-item"><span>来源地块</span><b>{{ (execution.sources || []).length }} 块 · {{ fmt(execution.sourcesWeight) }} 吨</b></div>
      </div>
      <div v-if="(execution.sources || []).length" class="dd-rows">
        <div v-for="(source, index) in execution.sources" :key="`${source.planId}-${source.plotId}-${index}`" class="dd-row">
          <div class="dd-row-head"><b>{{ source.plotName }}</b><span>{{ fmt(source.weight) }} 吨</span></div>
          <p>{{ source.subjectName }} · {{ source.filedNo }}</p>
        </div>
      </div>
    </section>

    <section class="dd-block">
      <h4>电子承诺书</h4>
      <p class="dd-text">{{ row.promise?.content || '—' }}</p>
      <p class="dd-note">
        <template v-if="row.promise?.signedAt">已签署 · {{ row.promise.signer || '申报人' }} · {{ row.promise.signedAt }}</template>
        <template v-else>未签署</template>
      </p>
    </section>

    <section class="dd-block">
      <h4>办理结果</h4>
      <div class="dd-result">
        <el-tag size="small" :type="SIL_PLAN_STATUS[row.status]?.tag">{{ SIL_PLAN_STATUS[row.status]?.name || row.status }}</el-tag>
        <span v-if="row.filedNo">{{ row.filedNo }}</span>
        <span v-if="row.filedAt">备案时间 {{ row.filedAt }}</span>
      </div>
      <div v-if="(row.auditTrail || []).length" class="dd-rows">
        <div v-for="(trail, index) in row.auditTrail" :key="index" class="dd-row">
          <div class="dd-row-head"><b>{{ trail.action }}</b><span>{{ trail.time }}</span></div>
          <p>{{ trail.user }}<template v-if="trail.opinion"> · {{ trail.opinion }}</template></p>
        </div>
      </div>
      <p v-else class="dd-note">暂无审核记录</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { SIL_PLAN_STATUS, SIL_STORAGE_USAGE, silCropName } from '@/api/silPlan'

const props = defineProps({
  row: { type: Object, default: () => ({}) },
  type: { type: String, default: 'plan' },
  compact: { type: Boolean, default: false }
})

const isPlan = computed(() => props.type === 'plan')
const execution = computed(() => props.row?.execution || null)
const typeName = computed(() => {
  const map = {
    cooperative: '合作社',
    family_farm: '家庭农场',
    enterprise: '农业企业',
    livestock_enterprise: '养殖企业',
    livestock_household: '养殖户',
    third_party: '第三方收储服务组织'
  }
  return map[props.row?.subjectType] || props.row?.subjectType || '—'
})
const fmt = value => (value === null || value === undefined || value === '' ? '—' : Number(value).toFixed(1))
</script>

<style scoped lang="scss">
.declare-detail { display: flex; flex-direction: column; gap: 10px; }
.dd-block { background: #f7f9fc; border-radius: 8px; padding: 10px 12px; }
.declare-detail.compact .dd-block { background: #fff; border: 1px solid #e8eef5; }
.dd-block h4 { margin: 0 0 8px; font-size: 13px; color: #243b53; }
.dd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 10px; }
.dd-item span { display: block; font-size: 11px; color: #8a98a7; }
.dd-item b { display: block; font-size: 12px; color: #33475f; margin-top: 3px; line-height: 1.5; word-break: break-word; }
.dd-rows { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.dd-row { background: #fff; border: 1px solid #e8eef5; border-radius: 6px; padding: 7px 9px; }
.dd-block .dd-rows .dd-row:first-child { margin-top: 0; }
.dd-row-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.dd-row-head b { font-size: 12px; color: #33475f; }
.dd-row-head span { font-size: 11px; color: #2d7a63; white-space: nowrap; }
.dd-row p { margin: 4px 0 0; font-size: 11px; color: #7a8b9e; line-height: 1.5; }
.dd-text { margin: 0; font-size: 12px; color: #5b6b7c; line-height: 1.6; }
.dd-note { margin: 6px 0 0; font-size: 11px; color: #9aa6b2; }
.dd-result { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11px; color: #7a8b9e; }
</style>
