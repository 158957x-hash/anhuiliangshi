<template>
  <div v-if="event" class="tdc-root">
    <!-- 详情三页签（用户确认 2026-11-12）：事件上报详情 / 任务详情 / 任务进度；未发生的环节不展示 -->
    <el-tabs v-model="tab" class="tdc-tabs">
      <!-- 页签一：事件上报详情（事件信息 + 接入来源记录 + 举报证据） -->
      <el-tab-pane label="事件上报详情" name="event">
        <el-descriptions :column="col" size="small" border>
          <el-descriptions-item label="事件编号">{{ event.code }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag size="small" :type="statusType">{{ statusName }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="问题类型">{{ typeName }}</el-descriptions-item>
          <el-descriptions-item label="风险等级"><el-tag size="small" :type="riskTagType(event.risk)">{{ riskName(event.risk) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="区域">{{ event.regionName }}</el-descriptions-item>
          <el-descriptions-item label="图斑面积">{{ event.spot?.areaMu || 0 }} 亩</el-descriptions-item>
          <el-descriptions-item label="来源">{{ sourceName(event.source) }}</el-descriptions-item>
          <el-descriptions-item label="发现时间">{{ event.foundTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="中心经纬度">{{ center }}</el-descriptions-item>
          <el-descriptions-item label="关联主体">{{ event.subjectName || '待核实' }}</el-descriptions-item>
          <el-descriptions-item v-if="event.spot?.beforeAreaMu || event.spot?.afterAreaMu" label="变化面积">前 {{ event.spot?.beforeAreaMu || event.spot?.areaMu || 0 }} 亩 → 后 {{ event.spot?.afterAreaMu || event.spot?.areaMu || 0 }} 亩{{ event.spot?.changeRate ? `（${event.spot.changeRate}）` : '' }}</el-descriptions-item>
          <el-descriptions-item label="来源描述">{{ sourceName(event.source) }}线索</el-descriptions-item>
          <el-descriptions-item label="问题描述" :span="2">{{ event.desc || '—' }}</el-descriptions-item>
          <el-descriptions-item label="风险判定" :span="2">自动{{ riskName(event.riskAuto) }} / 最终{{ riskName(event.riskFinal) }}{{ event.riskAdjustReason ? `（人工调整：${event.riskAdjustReason}）` : '' }}{{ event.riskBasis ? `；依据：${event.riskBasis}` : '' }}</el-descriptions-item>
          <el-descriptions-item v-if="event.source === 'snapshot'" label="举报身份" :span="2">{{ event.reporterType === 'realname' ? `实名（${event.reporterName || '—'}）` : '匿名举报' }}{{ event.location ? ` · ${event.location}` : '' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 接入来源记录（多来源合并时逐条展示） -->
        <template v-if="(event.sources || []).length">
          <h4 class="td-title">接入来源记录</h4>
          <el-descriptions v-for="(s, i) in event.sources" :key="i" :column="col" size="small" border class="mb-8">
            <el-descriptions-item label="来源类型">{{ s.sourceType || '—' }}</el-descriptions-item>
            <el-descriptions-item label="来源系统">{{ s.sourceSystem || '—' }}</el-descriptions-item>
            <el-descriptions-item label="接入批次号">{{ s.accessBatchNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="来源流水号">{{ s.serialNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="回执状态">{{ s.receiptStatus || '—' }}</el-descriptions-item>
            <el-descriptions-item label="回执编号">{{ s.receiptNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="原始证据" :span="3">
              <template v-if="(s.originalEvidence || []).length"><el-tag v-for="(n, j) in s.originalEvidence" :key="j" size="small" type="info" effect="plain" class="ev-tag">{{ n }}</el-tag></template>
              <span v-else>—</span>
            </el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 举报证据（随手拍：公众拍照/录像） -->
        <template v-if="(event.reportAttachments || []).length">
          <h4 class="td-title">举报证据（{{ event.reportAttachments.length }} 项）</h4>
          <EvidenceThumbs :items="event.reportAttachments" :size="56" />
        </template>
      </el-tab-pane>

      <!-- 页签二：任务详情（派发 / 核查上报 / 整改与复核，仅展示已发生的环节） -->
      <el-tab-pane label="任务详情" name="task">
        <template v-if="hasTask">
          <h4 class="td-title">任务派发</h4>
          <el-descriptions :column="col" size="small" border>
            <el-descriptions-item label="任务编号">{{ event.taskId || '—' }}</el-descriptions-item>
            <el-descriptions-item label="派发时间">{{ event.dispatchedAt || '—' }}</el-descriptions-item>
            <el-descriptions-item label="核查责任人">{{ event.checkResponsiblePerson || event.assignee || '—' }}</el-descriptions-item>
            <el-descriptions-item label="责任单位">{{ event.checkResponsibleUnit || '—' }}</el-descriptions-item>
            <el-descriptions-item label="核查截止">{{ event.checkDeadline || '—' }}</el-descriptions-item>
            <el-descriptions-item label="派发要求">{{ event.dispatchRequirement || event.requirement || '—' }}</el-descriptions-item>
          </el-descriptions>

          <!-- 核查上报（已核查才展示） -->
          <template v-if="event.checkReport">
            <h4 class="td-title">核查上报</h4>
            <el-descriptions :column="col" size="small" border>
              <el-descriptions-item label="核查结论">{{ event.checkReport.conclusion || '—' }}</el-descriptions-item>
              <el-descriptions-item label="核查人">{{ event.checkReport.checker || event.checkReport.inspector || '—' }}</el-descriptions-item>
              <el-descriptions-item label="核查时间">{{ event.checkReport.time || event.checkedAt || '—' }}</el-descriptions-item>
              <el-descriptions-item label="核查定位">{{ checkGps }}</el-descriptions-item>
              <el-descriptions-item label="上传状态">{{ event.checkReport.uploadStatus || '已上传' }}</el-descriptions-item>
              <el-descriptions-item label="核查描述" :span="2">{{ event.checkReport.desc || '—' }}</el-descriptions-item>
            </el-descriptions>
            <EvidenceThumbs v-if="(event.checkReport.attachments || []).length" :items="event.checkReport.attachments" :size="56" />
          </template>

          <!-- 整改与复核（已进入整改环节才展示） -->
          <template v-if="showRectify">
            <h4 class="td-title">整改与复核</h4>
            <el-descriptions :column="col" size="small" border>
              <el-descriptions-item label="整改责任人">{{ event.rectificationResponsiblePerson || event.rectifyNote?.unit || '—' }}</el-descriptions-item>
              <el-descriptions-item label="整改截止">{{ event.rectifyDeadline || '—' }}</el-descriptions-item>
              <el-descriptions-item label="提交时间">{{ event.rectifyNote?.time || '—' }}</el-descriptions-item>
              <el-descriptions-item label="完成情况">{{ event.completionDescription || '待提交' }}</el-descriptions-item>
              <el-descriptions-item label="整改措施" :span="2">{{ event.rectifyNote?.desc || '—' }}</el-descriptions-item>
              <el-descriptions-item label="复核结论">{{ event.closeNote?.conclusion || '—' }}</el-descriptions-item>
              <el-descriptions-item label="复核人">{{ event.closeNote?.reviewer || '—' }}</el-descriptions-item>
              <el-descriptions-item label="复核意见" :span="2">{{ event.closeNote?.desc || '—' }}</el-descriptions-item>
              <el-descriptions-item label="结案编号">{{ event.closeNo || '—' }}</el-descriptions-item>
              <el-descriptions-item label="结案时间">{{ event.closedAt || '—' }}</el-descriptions-item>
            </el-descriptions>
            <EvidenceThumbs v-if="(event.rectifyNote?.attachments || []).length" :items="event.rectifyNote.attachments" :size="56" />
          </template>
        </template>
        <p v-else class="td-empty-line">任务尚未派发（当前处于{{ statusName }}阶段）</p>
      </el-tab-pane>

      <!-- 页签三：任务进度（全环节轨迹） -->
      <el-tab-pane label="任务进度" name="progress">
        <el-timeline class="td-timeline">
          <el-timeline-item v-for="(t, i) in event.trail || []" :key="i" :timestamp="t.time" placement="top">
            <b>{{ t.action }}</b> — {{ t.user }}
            <p v-if="t.extra" class="td-trail-extra">{{ t.extra }}</p>
            <p v-if="t.opinion" class="td-trail-extra">意见：{{ t.opinion }}</p>
          </el-timeline-item>
        </el-timeline>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { EVENT_STATUS, EVENT_TYPE_MAP, RISK_LEVELS } from '@/mock/common/dict'
import EvidenceThumbs from '@/components/common/EvidenceThumbs.vue'

const props = defineProps({ event: Object, mobile: Boolean })

// 移动端（手机壳内）描述列表单列，桌面双列
const col = computed(() => (props.mobile ? 1 : 2))
const tab = ref('event')

const statusName = computed(() => EVENT_STATUS[props.event?.status]?.name || props.event?.status || '—')
const statusType = computed(() => ({ to_review: 'warning', pending: 'info', checking: 'primary', reported: 'warning', reviewing: 'warning', audited: 'primary', recheck: 'warning', closed: 'success', dismissed: 'info' }[props.event?.status] || 'info'))
const typeName = computed(() => EVENT_TYPE_MAP[props.event?.type]?.name || props.event?.typeName || props.event?.type || '—')
// 来源口径 5 类（用户确认 2026-11-12）
const sourceNames = { remote: '遥感识别', drone: '无人机识别', grid: '网格巡查', snapshot: '随手拍（皖事通）', platform: '地方平台推送' }
const sourceName = (s) => sourceNames[s] || s || '—'
const riskName = (r) => RISK_LEVELS.find((x) => x.code === r)?.name || r
const riskTagType = (r) => ({ high: 'danger', medium: 'warning', low: 'info' }[r] || 'info')
// 图斑中心：spot.center 为数组（拍照定位坐标或地块中心）
const center = computed(() => (Array.isArray(props.event?.spot?.center) && props.event.spot.center.length ? props.event.spot.center.join(', ') : '—'))
const checkGps = computed(() => props.event?.checkReport?.gps || (props.event?.checkReport?.longitude ? `${props.event.checkReport.longitude}, ${props.event.checkReport.latitude}` : center.value))
// 任务详情页签：已派发才展示；整改复核块仅已进入整改环节展示
const hasTask = computed(() => !!(props.event?.taskId || props.event?.dispatchedAt || props.event?.assignee))
const showRectify = computed(() => ['audited', 'recheck', 'closed'].includes(props.event?.status) || !!props.event?.rectifyNote || !!props.event?.closeNo)
</script>

<style scoped>
.tdc-root { padding: 0 2px; }
.tdc-tabs :deep(.el-tabs__header) { margin-bottom: 10px; }
.td-title { margin: 14px 0 8px; font-size: 13px; color: var(--el-color-primary); border-left: 3px solid var(--el-color-primary); padding-left: 8px; }
.td-timeline { margin-top: 8px; padding-left: 4px; }
.td-trail-extra { margin: 2px 0 0; font-size: 12px; color: var(--el-text-color-secondary); }
.td-empty-line { margin: 16px 0; color: var(--el-text-color-secondary); font-size: 13px; text-align: center; }
.ev-tag { margin: 0 6px 4px 0; }
.mb-8 { margin-bottom: 8px; }
</style>
