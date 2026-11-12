<template>
  <div class="page-container fsr-page">
    <div class="page-head">
      <div>
        <h2>内业智能核查</h2>
        <p>受控安全环境下的计划落实套合比对、人工核验、脱密与省平台导入。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="load">刷新批次</el-button>
    </div>

    <el-alert
      type="warning" show-icon :closable="false" class="mb-12"
      title="本页面为受控内业安全环境功能演示，涉及涉密数据处理流程；脱密方法与涉密等级待业务确认"
    />

    <div class="panel">
      <div class="panel-title">
        <span class="title-text">套合比对批次列表</span>
        <span class="title-extra text-secondary">共 {{ rows.length }} 个批次</span>
      </div>

      <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" class="mb-12">
        <el-button size="small" type="primary" plain @click="load">重试加载</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="rows" stripe border empty-text="暂无套合比对批次">
        <el-table-column prop="batchNo" label="批次号" width="120" />
        <el-table-column prop="planYear" label="计划年度" width="80" />
        <el-table-column prop="planDataRef" label="计划落实数据引用" min-width="220" show-overflow-tooltip />
        <el-table-column label="区域/作物范围" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row.regionScope }} / {{ row.cropScope }}</template>
        </el-table-column>
        <el-table-column label="底图图层版本" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">{{ layerText(row) }}</template>
        </el-table-column>
        <el-table-column prop="suspectCount" label="疑似图斑数" width="90" align="center" />
        <el-table-column label="人工核验" width="160">
          <template #default="{ row }">
            <div>{{ row.verifyStatus || '待核验' }}</div>
            <div class="cell-sub">{{ row.verifier || '—' }} {{ row.verifyAt || '' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="脱密状态" width="85">
          <template #default="{ row }">{{ row.declassifyStatus || '—' }}</template>
        </el-table-column>
        <el-table-column label="导入状态" width="150">
          <template #default="{ row }">
            <div>{{ row.importStatus || '—' }}</div>
            <div v-if="row.importFailReason" class="fail-reason">{{ row.importFailReason }}</div>
          </template>
        </el-table-column>
        <el-table-column label="批次状态" width="130">
          <template #default="{ row }">
            <StatusTag :dict="INDOOR_BATCH_STATUS" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'fused'" link type="warning" @click="openVerify(row)">核验</el-button>
            <el-button
              v-if="row.status === 'verified'" link type="primary"
              :loading="acting === row.id && actingType === 'declassify'" @click="doDeclassify(row)"
            >脱密</el-button>
            <el-button
              v-if="row.status === 'declassified'" link type="success"
              :loading="acting === row.id && actingType === 'import'" @click="doImport(row)"
            >导入</el-button>
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <p class="flow-note">流程说明：核验（套合完成待核验）→ 脱密（人工核验通过）→ 导入省平台（已脱密）；失败与重复导入按拦截原因展示。</p>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" :title="current ? `批次详情 ${current.batchNo}` : '批次详情'" size="640px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="批次号">{{ current.batchNo }}</el-descriptions-item>
          <el-descriptions-item label="计划年度">{{ current.planYear }}</el-descriptions-item>
          <el-descriptions-item label="计划落实数据引用" :span="2">{{ current.planDataRef }}</el-descriptions-item>
          <el-descriptions-item label="区域范围">{{ current.regionScope }}</el-descriptions-item>
          <el-descriptions-item label="作物范围">{{ current.cropScope }}</el-descriptions-item>
          <el-descriptions-item label="疑似图斑数">{{ current.suspectCount }} 个</el-descriptions-item>
          <el-descriptions-item label="批次状态">{{ statusName(current.status) }}</el-descriptions-item>
          <el-descriptions-item label="人工核验">
            {{ current.verifyStatus || '待核验' }} / {{ current.verifier || '—' }} {{ current.verifyAt || '' }}
          </el-descriptions-item>
          <el-descriptions-item label="脱密状态">{{ current.declassifyStatus || '—' }}</el-descriptions-item>
          <el-descriptions-item label="导入状态">{{ current.importStatus || '—' }}</el-descriptions-item>
          <el-descriptions-item label="套合规则参数" :span="2">
            <el-tag size="small" type="warning" class="mr-4">演示规则</el-tag>{{ current.ruleParams }}
          </el-descriptions-item>
        </el-descriptions>
        <el-alert
          v-if="current.importFailReason" type="error" show-icon :closable="false" class="mt-12"
          :title="'导入未成功原因'" :description="current.importFailReason"
        />

        <div class="drawer-sec">底图图层版本明细</div>
        <el-table :data="current.baseLayerVersions" border size="small">
          <el-table-column prop="name" label="图层名称" min-width="180" />
          <el-table-column prop="layerCode" label="图层编码" width="110" />
          <el-table-column prop="version" label="版本" width="130" />
        </el-table>

        <div class="drawer-sec">产出疑似图斑列表</div>
        <el-table :data="current.outputSpots" border size="small">
          <el-table-column prop="spotId" label="图斑号" width="110" />
          <el-table-column prop="regionName" label="区域" width="90" />
          <el-table-column label="面积（亩）" width="90" align="center">
            <template #default="{ row }">{{ row.areaMu }}</template>
          </el-table-column>
          <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip />
        </el-table>

        <div class="drawer-sec">批次日志（时间倒序）</div>
        <el-timeline>
          <el-timeline-item v-for="(log, i) in current.logs" :key="i" :timestamp="log.time" placement="top">
            <div>{{ log.action }}（{{ log.user }}）</div>
            <div v-if="log.extra" class="cell-sub">{{ log.extra }}</div>
          </el-timeline-item>
        </el-timeline>
      </template>
    </el-drawer>

    <!-- 人工核验弹窗 -->
    <el-dialog v-model="verifyVisible" title="人工核验" width="440px">
      <p class="mb-12">批次号：<strong>{{ verifyBatch?.batchNo }}</strong>（疑似图斑 {{ verifyBatch?.suspectCount }} 个）</p>
      <el-radio-group v-model="verifyAction">
        <el-radio value="pass">核验通过</el-radio>
        <el-radio value="return">核验退回</el-radio>
      </el-radio-group>
      <p class="verify-tip">核验通过后批次进入脱密环节；退回批次需重新套合比对（演示）。</p>
      <template #footer>
        <el-button @click="verifyVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitVerify">确认核验</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchIndoorBatches, verifyIndoorBatch, declassifyBatch, importBatch } from '@/api/fsr'
import { INDOOR_BATCH_STATUS } from '@/mock/common/dict'
import StatusTag from '@/components/common/StatusTag.vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const rows = ref([])
const loading = ref(false)
const error = ref('')
const detailVisible = ref(false)
const verifyVisible = ref(false)
const verifyBatch = ref(null)
const verifyAction = ref('pass')
const submitting = ref(false)
const current = ref(null)
// 行级动作防重复提交：acting 记录批次ID，actingType 记录动作类型
const acting = ref('')
const actingType = ref('')

const statusName = (v) => INDOOR_BATCH_STATUS[v]?.name || v || '—'
const layerText = (row) => (row.baseLayerVersions || []).map((v) => `${v.name} ${v.version}`).join('；') || '—'
const operatorName = () => (userStore.role?.name ? `${userStore.role.name}（演示）` : '内业人员（演示）')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    rows.value = await fetchIndoorBatches()
  } catch (e) {
    error.value = '批次加载失败：' + (e?.message || '网络异常，请重试')
  } finally {
    loading.value = false
  }
}

const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

const openVerify = (row) => {
  verifyBatch.value = row
  verifyAction.value = 'pass'
  verifyVisible.value = true
}

const submitVerify = async () => {
  submitting.value = true
  try {
    const r = await verifyIndoorBatch(verifyBatch.value.id, verifyAction.value, operatorName())
    if (!r.success) return ElMessage.error(r.message || '人工核验失败')
    ElMessage.success(verifyAction.value === 'pass' ? '核验通过，批次进入脱密环节' : '批次已退回，需重新套合比对')
    verifyVisible.value = false
    load()
  } finally {
    submitting.value = false
  }
}

const doDeclassify = async (row) => {
  try {
    await ElMessageBox.confirm('确认对该批次执行坐标脱密？脱密完成后方可导入省平台。', '脱密确认', { type: 'warning' })
  } catch (e) { return }
  acting.value = row.id
  actingType.value = 'declassify'
  try {
    const r = await declassifyBatch(row.id, operatorName())
    if (!r.success) return ElMessage.error({ message: r.message || '脱密失败', duration: 6000 })
    ElMessage.success('脱密完成，批次可进入导入环节')
    load()
  } finally {
    acting.value = ''
    actingType.value = ''
  }
}

const doImport = async (row) => {
  try {
    await ElMessageBox.confirm('确认将该批次脱密成果导入省平台？导入成功后将自动生成监管事件。', '导入确认', { type: 'warning' })
  } catch (e) { return }
  acting.value = row.id
  actingType.value = 'import'
  try {
    const r = await importBatch(row.id, operatorName())
    if (!r.success) {
      // 失败/重复导入：展示接口返回 message 与原因，批次状态已同步更新
      ElMessage.error({ message: r.message || '导入失败', duration: 6000 })
      load()
      return
    }
    const created = (r.createdEvents || []).join('、')
    try {
      await ElMessageBox.confirm(
        `导入成功，已生成监管事件：${created || '（无新增事件）'}。是否立即前往事件库处理？`,
        '导入成功', { confirmButtonText: '前往事件库', cancelButtonText: '留在本页', type: 'success' }
      )
      router.push('/fsr/events')
    } catch (e) { /* 留在本页 */ }
    load()
  } finally {
    acting.value = ''
    actingType.value = ''
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.fsr-page { overflow: auto; }
.page-head { display: flex; justify-content: space-between; margin-bottom: 14px; }
.page-head h2 { margin: 4px 0; font-size: 20px; font-weight: 600; }
.page-head p { margin: 0; color: var(--ah-text-secondary); font-size: 13px; }
.cell-sub { color: var(--ah-text-muted); font-size: 12px; }
.fail-reason { color: var(--ah-danger); font-size: 12px; margin-top: 2px; }
.flow-note { margin: 10px 0 0; color: var(--ah-text-muted); font-size: 12px; }
.drawer-sec { margin: 16px 0 10px; font-size: 15px; font-weight: 500; color: var(--ah-text); }
.verify-tip { margin: 10px 0 0; color: var(--ah-text-muted); font-size: 12px; }
.mr-4 { margin-right: 4px; }
</style>
