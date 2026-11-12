<template>
  <div class="page-container">
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">流向追溯</span>
        <div class="title-extra">
          <el-select v-model="batchId" filterable placeholder="请选择批次" style="width: 300px" @change="loadTrace">
            <el-option v-for="b in batches" :key="b.id" :label="`${b.id} · ${b.batchNo} · ${productName(b.productId)}`" :value="b.id" />
          </el-select>
        </div>
      </div>

      <el-empty v-if="!trace" description="请选择批次查看追溯链路" />

      <template v-else>
        <el-descriptions :column="4" border size="small" style="margin-bottom: 18px">
          <el-descriptions-item label="批次号">{{ trace.batch.batchNo }}</el-descriptions-item>
          <el-descriptions-item label="产品">{{ trace.product?.name }}</el-descriptions-item>
          <el-descriptions-item label="生产企业">{{ trace.product?.producerName }}</el-descriptions-item>
          <el-descriptions-item label="生产日期">{{ trace.batch.produceDate }}</el-descriptions-item>
        </el-descriptions>

        <!-- 链路图：生产企业 → 批次 → 经营 → 购买方 → 使用 → 回收 -->
        <div class="trace-chain">
          <template v-for="(node, i) in chainNodes" :key="i">
            <div
              class="chain-node"
              :class="[node.kind, { broken: node.broken, clickable: !!node.detail }]"
              @click="node.detail && openNode(node)"
            >
              <div class="cn-icon"><el-icon :size="18"><component :is="node.icon" /></el-icon></div>
              <div class="cn-name" :class="{ dim: node.broken }">{{ node.name }}</div>
              <div class="cn-sub" :class="{ dim: node.broken }">{{ node.sub }}</div>
              <el-tag v-if="node.broken" size="small" type="info" effect="plain" disable-transitions>断点</el-tag>
            </div>
            <div v-if="i < chainNodes.length - 1" class="chain-arrow" :class="{ broken: node.broken || chainNodes[i + 1].broken }">
              <span class="arrow-line"></span>
              <span class="arrow-head">▶</span>
            </div>
          </template>
        </div>
        <div class="legend">
          <span class="lg-item"><span class="lg-dot ok"></span>正常节点</span>
          <span class="lg-item"><span class="lg-dot dim"></span>断点/信息缺失</span>
          <span class="lg-item">点击节点查看明细与留痕</span>
        </div>

        <el-divider />

        <h4 style="margin: 4px 0 10px">批次流水明细</h4>
        <el-table :data="trace.links" border size="small">
          <el-table-column prop="date" label="日期" width="110" />
          <el-table-column label="类型" width="100" align="center">
            <template #default="{ row }">{{ FLOW_NAME[row.type] || row.type }}</template>
          </el-table-column>
          <el-table-column label="流出方" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ nodeName(row.from) }}</template></el-table-column>
          <el-table-column label="流入方" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.to ? nodeName(row.to) : (row.realName || '信息缺失') }}</template>
          </el-table-column>
          <el-table-column prop="qty" label="数量（吨）" width="100" align="right" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.breakPoint" size="small" type="warning" disable-transitions>断点</el-tag>
              <el-tag v-else size="small" type="success" disable-transitions>正常</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </div>

    <!-- 节点详情 -->
    <el-drawer v-model="nodeVisible" :title="nodeDetail?.name || '节点详情'" size="440px">
      <template v-if="nodeDetail">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="节点">{{ nodeDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ nodeDetail.kindName }}</el-descriptions-item>
          <el-descriptions-item v-if="nodeDetail.license" label="许可证">{{ nodeDetail.license }}</el-descriptions-item>
          <el-descriptions-item v-if="nodeDetail.status" label="状态">{{ nodeDetail.status }}</el-descriptions-item>
        </el-descriptions>
        <h4 class="drawer-sub-title">留痕</h4>
        <FlowSteps :steps="nodeDetail.steps" />
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchTraceFlow, fetchBatches } from '@/api/pes'
import { PES_SUBJECT_MAP, PES_PRODUCT_MAP } from '@/mock/pes/data'
import FlowSteps from '@/components/common/FlowSteps.vue'

const route = useRoute()

const FLOW_NAME = { produce: '生产入库', purchase: '采购入库', sale: '销售出库', buy: '购买', return: '退货' }
const KIND_NAME = { produce: '生产企业', operate: '经营企业', use: '使用主体', recycle: '回收主体', unknown: '购买方' }
const ICONS = { produce: 'OfficeBuilding', operate: 'Shop', use: 'User', recycle: 'Delete', unknown: 'User' }

const batches = ref([])
const batchId = ref('')
const trace = ref(null)
const nodeVisible = ref(false)
const nodeDetail = ref(null)

const productName = (pid) => PES_PRODUCT_MAP[pid]?.name || ''
const nodeName = (id) => PES_SUBJECT_MAP[id]?.name || (id === 'UNKNOWN' ? '信息缺失' : id)

// 依据 links 构建链路节点序列（去重、保序）
const chainNodes = ref([])

const buildChain = () => {
  const t = trace.value
  const nodes = []
  const seen = new Set()
  const push = (n) => { const k = n.name + n.kind; if (!seen.has(k)) { seen.add(k); nodes.push(n) } }
  // 起点固定生产企业
  push({ name: t.product?.producerName || '生产企业', sub: `生产入库 ${t.batch.produceDate}`, kind: 'produce', icon: 'OfficeBuilding', broken: false })
  t.links.forEach((lk) => {
    if (lk.type === 'produce') return
    const fromNode = PES_SUBJECT_MAP[lk.from]
    push({
      name: fromNode?.name || nodeName(lk.from),
      sub: `${FLOW_NAME[lk.type] || lk.type} ${lk.date}`,
      kind: fromNode?.type || 'unknown', icon: ICONS[fromNode?.type || 'unknown'], broken: false,
      detail: fromNode
    })
    const toNode = lk.to ? PES_SUBJECT_MAP[lk.to] : null
    push({
      name: toNode?.name || lk.realName || '购买方信息缺失',
      sub: toNode ? (KIND_NAME[toNode.type] || '') + (lk.qty ? ` · ${lk.qty}吨` : '') : '信息缺失',
      kind: toNode?.type || 'unknown', icon: ICONS[toNode?.type || 'unknown'],
      broken: !toNode || lk.breakPoint,
      detail: toNode
    })
  })
  chainNodes.value = nodes
}

const openNode = (node) => {
  const s = node.detail
  nodeDetail.value = {
    name: node.name,
    kindName: KIND_NAME[s?.type || 'unknown'],
    license: s?.license || '',
    status: s?.status || '',
    steps: [
      { time: '', action: '主体建档', user: '安徽省农业农村厅', extra: `编号 ${s?.id || '—'}` },
      { time: '', action: '本批次流向', user: node.sub }
    ]
  }
  nodeVisible.value = true
}

const loadTrace = async () => {
  if (!batchId.value) { trace.value = null; return }
  trace.value = await fetchTraceFlow(batchId.value)
  buildChain()
}

onMounted(async () => {
  batches.value = await fetchBatches()
  batchId.value = route.query.batch || 'BAT-2601'
  await loadTrace()
})
</script>

<style lang="scss" scoped>
.trace-chain {
  display: flex;
  align-items: stretch;
  gap: 6px;
  overflow-x: auto;
  padding: 10px 2px 14px;

  .chain-node {
    min-width: 150px;
    max-width: 190px;
    border: 1px solid #d9dee7;
    border-radius: 10px;
    padding: 12px 10px;
    text-align: center;
    background: #f8fafd;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;

    &.clickable { cursor: pointer; transition: box-shadow .2s; }
    &.clickable:hover { box-shadow: 0 2px 10px rgba(15, 94, 181, 0.15); }
    &.broken { background: #f4f5f7; border-style: dashed; }
    .cn-icon {
      width: 36px; height: 36px; border-radius: 50%;
      background: #e8f1fc; color: #0f5eb5;
      display: flex; align-items: center; justify-content: center;
    }
    &.broken .cn-icon { background: #e3e5e8; color: #98a2b3; }
    .cn-name { font-size: 13px; font-weight: 600; color: var(--ah-text); }
    .cn-sub { font-size: 12px; color: var(--ah-text-secondary); }
    .dim { color: #98a2b3 !important; }
  }

  .chain-arrow {
    display: flex; align-items: center; flex-shrink: 0;
    .arrow-line { width: 22px; height: 2px; background: #0f5eb5; }
    .arrow-head { color: #0f5eb5; font-size: 10px; margin-left: -2px; }
    &.broken .arrow-line { background: linear-gradient(90deg, #c0c6cf 60%, transparent 60%); background-size: 8px 2px; }
    &.broken .arrow-head { color: #c0c6cf; }
  }
}

.legend {
  display: flex; gap: 18px; align-items: center;
  font-size: 12px; color: var(--ah-text-secondary);
  .lg-item { display: inline-flex; align-items: center; gap: 5px; }
  .lg-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block;
    &.ok { background: #0f5eb5; }
    &.dim { background: #c0c6cf; }
  }
}

.drawer-sub-title { margin: 18px 0 10px; font-size: 14px; color: var(--ah-text); }
</style>
