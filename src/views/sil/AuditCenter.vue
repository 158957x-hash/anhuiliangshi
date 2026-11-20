<template>
  <div class="page-container sil-audit">
    <header class="page-head">
      <div>
        <h2>备案审核</h2>
        <p>县级对种植计划与收储申报分别备案：通过后生成备案编号，种植地块同步进入“种植上图”和数字围栏。</p>
      </div>
      <div class="head-actions"><el-tag type="warning" effect="plain">待审核 {{ pendingPlans + pendingStorages }} 件</el-tag></div>
    </header>

    <section class="panel">
      <div class="status-switch">
        <el-radio-group v-model="statusTab">
          <el-radio-button label="pending">待审核（{{ pendingPlans + pendingStorages }}）</el-radio-button>
          <el-radio-button label="filed">已通过</el-radio-button>
          <el-radio-button label="rejected">已驳回</el-radio-button>
        </el-radio-group>
      </div>

      <el-tabs v-model="tab" class="audit-tabs">
        <el-tab-pane label="种植计划备案" name="plan">
          <el-table v-loading="loading" :data="planRows" stripe border>
            <el-table-column label="申报编号" min-width="180"><template #default="{ row }"><b>{{ row.id }}</b><small class="cell-sub">{{ row.filedNo || '待生成备案号' }}</small></template></el-table-column>
            <el-table-column label="种植主体" min-width="210"><template #default="{ row }"><b>{{ row.subjectName }}</b><small class="cell-sub">{{ row.owner }} · {{ row.regionName }} · {{ row.source === 'agent' ? '县级代办' : '主体申报' }}</small></template></el-table-column>
            <el-table-column label="地块 / 面积" width="140"><template #default="{ row }">{{ row.plots?.length }} 块 · {{ Number(row.area).toFixed(1) }} 亩</template></el-table-column>
            <el-table-column label="作物 / 品种" min-width="180"><template #default="{ row }"><span v-for="plot in row.plots" :key="plot.plotId">{{ silCropName(plot.crop) }} / {{ plot.variety || '待补' }}；</span></template></el-table-column>
            <el-table-column label="预计产量（吨）" width="130"><template #default="{ row }">{{ Number(row.expectedYield).toFixed(1) }}</template></el-table-column>
            <el-table-column label="提交时间" width="160"><template #default="{ row }">{{ row.submittedAt || '—' }}</template></el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" @click="openAudit(row, 'plan')">去审核</el-button>
                <el-button v-else link type="primary" @click="openDetail(row, 'plan')">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && !planRows.length" :description="`暂无${statusName}的种植计划`" :image-size="70" />
        </el-tab-pane>

        <el-tab-pane label="收储备案" name="storage">
          <el-table v-loading="loading" :data="storageRows" stripe border>
            <el-table-column label="申报编号" min-width="180"><template #default="{ row }"><b>{{ row.id }}</b><small class="cell-sub">{{ row.filedNo || '待生成备案号' }}</small></template></el-table-column>
            <el-table-column label="收储主体" min-width="220"><template #default="{ row }"><b>{{ row.storageSubjectName }}</b><small class="cell-sub">{{ STORAGE_SUBJECT_TYPES[row.subjectType] || '收储主体' }} · {{ row.owner }} · {{ row.regionName }}</small></template></el-table-column>
            <el-table-column label="作物 / 品种" min-width="160"><template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety }}</template></el-table-column>
            <el-table-column label="预计重量（吨）" width="130"><template #default="{ row }">{{ Number(row.expectedWeight).toFixed(1) }}</template></el-table-column>
            <el-table-column label="价格（元/吨）" width="120"><template #default="{ row }">{{ row.price ?? '—' }}</template></el-table-column>
            <el-table-column label="用途" width="90"><template #default="{ row }">{{ SIL_STORAGE_USAGE[row.usage] || '—' }}</template></el-table-column>
            <el-table-column label="合同" width="90"><template #default="{ row }">{{ (row.contractFiles || []).length ? '已上传' : '—' }}</template></el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" @click="openAudit(row, 'storage')">去审核</el-button>
                <el-button v-else link type="primary" @click="openDetail(row, 'storage')">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && !storageRows.length" :description="`暂无${statusName}的收储申报`" :image-size="70" />
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-dialog v-model="auditVisible" :title="auditType === 'plan' ? '种植计划备案审核' : '收储备案审核'" width="560px" append-to-body>
      <div class="audit-target">
        <b>{{ auditType === 'plan' ? auditRow?.subjectName : auditRow?.storageSubjectName }}</b>
        <span>{{ auditType === 'plan' ? `${auditRow?.plots?.length} 块地 · ${auditRow?.area} 亩 · ${auditRow?.year} ${auditRow?.season}` : `${silCropName(auditRow?.crop)} / ${auditRow?.variety} · ${auditRow?.expectedWeight} 吨 · ${auditRow?.price} 元/吨` }}</span>
      </div>
      <el-radio-group v-model="auditAction" class="audit-actions">
        <el-radio label="pass">审核通过</el-radio>
        <el-radio label="reject">驳回</el-radio>
      </el-radio-group>
      <el-input v-model="auditOpinion" type="textarea" :rows="3" maxlength="200" show-word-limit :placeholder="auditAction === 'pass' ? '审核意见（选填）' : '请填写驳回原因'" />
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitAudit">提交</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" :title="detailType === 'plan' ? '种植计划详情' : '收储申报详情'" size="min(820px, 96vw)" append-to-body>
      <template v-if="detailRow">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申报编号">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="备案编号">{{ detailRow.filedNo || '尚未备案' }}</el-descriptions-item>
          <el-descriptions-item :label="detailType === 'plan' ? '种植主体' : '收储主体'">{{ detailType === 'plan' ? detailRow.subjectName : detailRow.storageSubjectName }}</el-descriptions-item>
          <el-descriptions-item label="属地">{{ detailRow.regionName }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag size="small" :type="SIL_PLAN_STATUS[detailRow.status]?.tag">{{ SIL_PLAN_STATUS[detailRow.status]?.name }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ detailRow.submittedAt || '—' }}</el-descriptions-item>
          <template v-if="detailType === 'plan'">
            <el-descriptions-item label="地块 / 面积">{{ detailRow.plots?.length }} 块 · {{ detailRow.area }} 亩</el-descriptions-item>
            <el-descriptions-item label="预计产量">{{ detailRow.expectedYield }} 吨</el-descriptions-item>
          </template>
          <template v-else>
            <el-descriptions-item label="作物 / 品种">{{ silCropName(detailRow.crop) }} / {{ detailRow.variety }}</el-descriptions-item>
            <el-descriptions-item label="重量 / 价格">{{ detailRow.expectedWeight }} 吨 · {{ detailRow.price }} 元/吨</el-descriptions-item>
            <el-descriptions-item label="用途">{{ SIL_STORAGE_USAGE[detailRow.usage] }}</el-descriptions-item>
            <el-descriptions-item label="合同附件">{{ (detailRow.contractFiles || []).map(file => file.name).join('、') || '—' }}</el-descriptions-item>
          </template>
        </el-descriptions>
        <template v-if="detailType === 'plan'">
          <h3 class="block-title">备案地块</h3>
          <el-table :data="detailRow.plots" border size="small">
            <el-table-column prop="name" label="地块" min-width="160" />
            <el-table-column label="作物 / 品种" min-width="150"><template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety || '—' }}</template></el-table-column>
            <el-table-column prop="areaMu" label="面积（亩）" width="100" />
            <el-table-column prop="expectedYield" label="预计产量（吨）" width="130" />
            <el-table-column label="边界" width="80"><template #default="{ row }">{{ row.geometry ? '已上图' : '缺失' }}</template></el-table-column>
          </el-table>
        </template>
        <h3 class="block-title">办理记录</h3>
        <el-timeline>
          <el-timeline-item v-for="(item, index) in detailRow.auditTrail || []" :key="index" :timestamp="item.time"><b>{{ item.action }}</b> · {{ item.user }}<p v-if="item.opinion" class="trail-opinion">{{ item.opinion }}</p></el-timeline-item>
        </el-timeline>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  SIL_PLAN_STATUS, SIL_STORAGE_USAGE, STORAGE_SUBJECT_TYPES, silCropName,
  fetchPlans, fetchStorages, auditPlan, auditStorage
} from '@/api/silPlan'

const userStore = useUserStore()
const role = computed(() => userStore.role)
const tab = ref('plan')
const statusTab = ref('pending')
const plans = ref([])
const storages = ref([])
const loading = ref(false)
const saving = ref(false)
const auditVisible = ref(false)
const auditType = ref('plan')
const auditRow = ref(null)
const auditAction = ref('pass')
const auditOpinion = ref('')
const detailVisible = ref(false)
const detailType = ref('plan')
const detailRow = ref(null)

const pendingPlans = computed(() => plans.value.filter(row => row.status === 'pending').length)
const pendingStorages = computed(() => storages.value.filter(row => row.status === 'pending').length)
const statusName = computed(() => SIL_PLAN_STATUS[statusTab.value]?.name || '')
const planRows = computed(() => plans.value.filter(row => row.status === statusTab.value))
const storageRows = computed(() => storages.value.filter(row => row.status === statusTab.value))

async function load() {
  loading.value = true
  try {
    const [planRowsData, storageRowsData] = await Promise.all([fetchPlans({}, role.value), fetchStorages({}, role.value)])
    plans.value = planRowsData
    storages.value = storageRowsData
  } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}

function openAudit(row, type) { auditType.value = type; auditRow.value = row; auditAction.value = 'pass'; auditOpinion.value = ''; auditVisible.value = true }
function openDetail(row, type) { detailType.value = type; detailRow.value = row; detailVisible.value = true }

async function submitAudit() {
  if (auditAction.value === 'reject' && !auditOpinion.value.trim()) return ElMessage.warning('驳回请填写原因')
  saving.value = true
  try {
    const result = auditType.value === 'plan'
      ? await auditPlan(auditRow.value.id, auditAction.value, auditOpinion.value, role.value)
      : await auditStorage(auditRow.value.id, auditAction.value, auditOpinion.value, role.value)
    if (!result.success) return ElMessage.error(result.message)
    ElMessage.success(auditAction.value === 'pass' ? `审核通过，备案号：${result.filedNo}` : '已驳回')
    auditVisible.value = false
    statusTab.value = auditAction.value === 'pass' ? 'filed' : 'rejected'
    load()
  } finally { saving.value = false }
}

onMounted(load)
watch(() => role.value?.code, load)
</script>

<style scoped lang="scss">
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.page-head h2 { font-size: 18px; margin-bottom: 6px; }
.page-head p { font-size: 12px; color: var(--ah-text-muted); line-height: 1.6; max-width: 820px; }
.panel { flex: 1; min-height: 0; overflow: auto; }
.status-switch { margin-bottom: 10px; }
.cell-sub { display: block; font-size: 11px; color: var(--ah-text-muted); margin-top: 3px; }
.audit-target { background: #f5f8fc; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
.audit-target b, .audit-target span { display: block; }
.audit-target span { font-size: 12px; color: var(--ah-text-muted); margin-top: 6px; }
.audit-actions { display: flex; gap: 18px; margin-bottom: 12px; }
.block-title { font-size: 14px; margin: 18px 0 10px; }
.trail-opinion { font-size: 12px; color: var(--ah-text-secondary); margin-top: 4px; }
</style>
