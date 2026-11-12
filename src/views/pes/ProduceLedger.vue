<template>
  <div class="page-container">
    <!-- C-11 未确认主体阻断条（仅生产企业角色） -->
    <el-alert
      v-if="isProducer && !producerConfirmed"
      type="warning"
      show-icon
      :closable="false"
      title="主体信息未确认（C-11）：确认主体信息前不可新增/提交生产台账"
      style="margin-bottom: 12px"
    >
      <el-button size="small" type="primary" link @click="$router.push('/pes/confirm')">去确认</el-button>
    </el-alert>

    <div class="panel">
      <div class="panel-title">
        <span class="title-text">生产台账（E5 · C-05 周期 / C-06 审核 / C-09 审核前可改）</span>
        <div class="title-extra">
          <el-button v-if="isProducer && producerConfirmed" type="primary" icon="Plus" @click="openCreate">新增台账</el-button>
          <el-button icon="Refresh" @click="load">刷新</el-button>
        </div>
      </div>

      <el-form inline class="filter-bar">
        <el-form-item label="统计周期">
          <el-radio-group v-model="filters.periodType" @change="load">
            <el-radio-button value="day">日</el-radio-button>
            <el-radio-button value="month">月</el-radio-button>
            <el-radio-button value="year">年</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 140px" @change="load">
            <el-option v-for="(v, k) in PES_LEDGER_STATUS" :key="k" :label="v.name" :value="k" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="rows" border stripe>
        <el-table-column prop="period" label="周期" width="110" />
        <el-table-column label="周期类型" width="90" align="center">
          <template #default="{ row }">{{ { day: '日', month: '月', year: '年' }[row.periodType] }}</template>
        </el-table-column>
        <el-table-column prop="productName" label="产品" min-width="170" show-overflow-tooltip />
        <el-table-column prop="batchId" label="批次" width="100" />
        <el-table-column label="产量" width="90" align="right"><template #default="{ row }">{{ row.produceQty }}</template></el-table-column>
        <el-table-column label="销量" width="90" align="right"><template #default="{ row }">{{ row.salesQty }}</template></el-table-column>
        <el-table-column label="销售额（万元）" width="130" align="right"><template #default="{ row }">{{ row.salesAmount }}</template></el-table-column>
        <el-table-column label="库存" width="90" align="right"><template #default="{ row }">{{ row.inventoryQty }}</template></el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <StatusTag :dict="PES_LEDGER_STATUS" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160"><template #default="{ row }">{{ row.submitTime || '—' }}</template></el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="canSubmit(row)" link type="success" @click="doSubmit(row)">提交</el-button>
            <el-button v-if="canEdit(row)" link @click="openEdit(row)">修改</el-button>
            <el-button v-if="canAudit(row)" link type="warning" @click="openAudit(row)">审核</el-button>
            <el-button v-if="row.status === 'approved'" link type="danger" @click="openReversal(row)">冲正申请</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-alert type="info" :closable="false" show-icon style="margin-top: 12px"
        title="C-06：台账须监管审核后生效；C-09：审核前可修改，已审核只读、可通过冲正申请调整（冲正流程为设计建议，待客户确认）。" />
    </div>

    <!-- 新增/修改台账 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '修改台账（审核前可改 · C-09）' : '新增生产台账'" width="620px" :close-on-click-modal="false">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="110px">
        <el-form-item label="周期类型" prop="periodType">
          <el-radio-group v-model="editForm.periodType">
            <el-radio-button value="day">日</el-radio-button>
            <el-radio-button value="month">月</el-radio-button>
            <el-radio-button value="year">年</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="周期" prop="period">
          <el-input v-model="editForm.period" :placeholder="periodPlaceholder" />
        </el-form-item>
        <el-form-item label="批次" prop="batchId">
          <el-select v-model="editForm.batchId" style="width: 100%" @change="onBatchChange">
            <el-option v-for="b in batches" :key="b.id" :label="`${b.id} · ${b.batchNo}`" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="产量（吨）" prop="produceQty"><el-input-number v-model="editForm.produceQty" :min="0" style="width: 100%" /></el-form-item>
        <el-form-item label="销量（吨）" prop="salesQty"><el-input-number v-model="editForm.salesQty" :min="0" style="width: 100%" /></el-form-item>
        <el-form-item label="销售额（万元）" prop="salesAmount"><el-input-number v-model="editForm.salesAmount" :min="0" style="width: 100%" /></el-form-item>
        <el-form-item label="库存（吨）" prop="inventoryQty"><el-input-number v-model="editForm.inventoryQty" :min="0" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveLedger">保存</el-button>
      </template>
    </el-dialog>

    <!-- 审核对话框 -->
    <AuditDialog
      v-model="auditVisible"
      title="生产台账审核（C-06）"
      :actions="[{ value: 'pass', label: '审核通过' }, { value: 'return', label: '退回' }]"
      default-action="pass"
      tip="审核通过与退回均写入审核留痕；退回后企业可修改重新提交。"
      placeholder="请填写审核意见（退回必填）"
      @confirm="doAudit"
    />

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="台账详情与审核留痕" size="480px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="台账编号">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="主体">{{ current.subjectName }}</el-descriptions-item>
          <el-descriptions-item label="周期">{{ current.period }}（{{ { day: '日', month: '月', year: '年' }[current.periodType] }}报）</el-descriptions-item>
          <el-descriptions-item label="产品/批次">{{ current.productName }} / {{ current.batchId }}</el-descriptions-item>
          <el-descriptions-item label="产量/销量/库存">{{ current.produceQty }} / {{ current.salesQty }} / {{ current.inventoryQty }} 吨</el-descriptions-item>
          <el-descriptions-item label="销售额">{{ current.salesAmount }} 万元</el-descriptions-item>
          <el-descriptions-item label="版本">v{{ current.version }}</el-descriptions-item>
        </el-descriptions>
        <h4 class="drawer-sub-title">流转留痕</h4>
        <FlowSteps :steps="currentSteps" />
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  fetchProduceLedgers, addProduceLedger, submitLedger, auditLedger,
  fetchBatches, fetchConfirms
} from '@/api/pes'
import { PES_LEDGER_STATUS, PES_PRODUCT_MAP } from '@/mock/pes/data'
import StatusTag from '@/components/common/StatusTag.vue'
import FlowSteps from '@/components/common/FlowSteps.vue'
import AuditDialog from '@/components/common/AuditDialog.vue'

const userStore = useUserStore()
const isProducer = computed(() => userStore.role?.code === 'pes_producer')
const canAudit = (row) => ['province', 'city', 'county'].includes(userStore.role?.code) && row.status === 'submitted'
const canSubmit = (row) => isProducer.value && ['draft', 'returned'].includes(row.status)
const canEdit = (row) => isProducer.value && ['draft', 'returned'].includes(row.status)

const filters = reactive({ periodType: 'month', status: '' })
const rows = ref([])
const batches = ref([])
const producerConfirmed = ref(true)
const editVisible = ref(false)
const editFormRef = ref()
const saving = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const auditVisible = ref(false)
const auditTarget = ref(null)
const editForm = reactive({ id: '', periodType: 'month', period: '', batchId: '', productId: '', productName: '', produceQty: 0, salesQty: 0, salesAmount: 0, inventoryQty: 0 })
const editRules = {
  period: [{ required: true, message: '请填写周期', trigger: 'blur' }],
  batchId: [{ required: true, message: '请选择批次', trigger: 'change' }]
}
const periodPlaceholder = computed(() => ({ day: '如 2026-11-11', month: '如 2026-11', year: '如 2026' }[editForm.periodType]))

const currentSteps = computed(() => {
  if (!current.value) return []
  const s = [{ time: '', action: '台账创建', user: current.value.subjectName, extra: `版本 v1 · ${current.value.periodType === 'day' ? '日报' : current.value.periodType === 'month' ? '月报' : '年报'}` }]
  if (current.value.submitTime) s.push({ time: current.value.submitTime, action: '提交审核', user: current.value.subjectName })
  if (current.value.auditTime) s.push({
    time: current.value.auditTime, action: current.value.status === 'approved' ? '审核通过' : '审核退回',
    user: current.value.auditor, opinion: current.value.auditOpinion, type: current.value.status === 'approved' ? 'success' : 'warning'
  })
  if (current.value.version > 1 && current.value.status !== 'approved') s.push({ time: '', action: `修改重报（当前 v${current.value.version}）`, user: current.value.subjectName })
  return s
})

const load = async () => {
  rows.value = await fetchProduceLedgers(userStore.role, { ...filters })
  if (isProducer.value) {
    const cs = await fetchConfirms(userStore.role)
    producerConfirmed.value = cs.some((c) => c.subjectId === userStore.role?.subjectId && c.status === '已确认')
  }
}

const openCreate = () => {
  Object.assign(editForm, { id: '', periodType: filters.periodType, period: '', batchId: '', productId: '', productName: '', produceQty: 0, salesQty: 0, salesAmount: 0, inventoryQty: 0 })
  editVisible.value = true
}
const openEdit = (row) => {
  Object.assign(editForm, {
    id: row.id, periodType: row.periodType, period: row.period, batchId: row.batchId,
    productId: row.productId, productName: row.productName, produceQty: row.produceQty,
    salesQty: row.salesQty, salesAmount: row.salesAmount, inventoryQty: row.inventoryQty
  })
  editVisible.value = true
}
const onBatchChange = (bid) => {
  const b = batches.value.find((x) => x.id === bid)
  if (!b) return
  const p = PES_PRODUCT_MAP[b.productId]
  editForm.productId = b.productId
  editForm.productName = p?.name || ''
}

const saveLedger = () => {
  editFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      if (editForm.id) {
        const rec = rows.value.find((r) => r.id === editForm.id)
        if (rec) {
          Object.assign(rec, { ...editForm })
          rec.version += 1
        }
        ElMessage.success('台账已修改（审核前可改，C-09）')
      } else {
        await addProduceLedger({
          subjectId: userStore.role?.subjectId, subjectName: userStore.role?.unit,
          periodType: editForm.periodType, period: editForm.period, batchId: editForm.batchId,
          productId: editForm.productId, productName: editForm.productName,
          produceQty: editForm.produceQty, salesQty: editForm.salesQty,
          salesAmount: editForm.salesAmount, inventoryQty: editForm.inventoryQty
        })
        ElMessage.success('台账已保存为草稿')
      }
      editVisible.value = false
      await load()
    } finally { saving.value = false }
  })
}

const doSubmit = async (row) => {
  const res = await submitLedger(row.id)
  res.success ? ElMessage.success('已提交待监管审核') : ElMessage.error(res.msg)
  await load()
}

const openAudit = (row) => { auditTarget.value = row; auditVisible.value = true }
const doAudit = async ({ action, opinion }) => {
  if (action === 'return' && !opinion) { ElMessage.warning('退回必须填写审核意见'); return }
  const res = await auditLedger(auditTarget.value.id, { action, opinion, auditor: `${userStore.role?.name}（${userStore.role?.unit}）` })
  res.success ? ElMessage.success(action === 'pass' ? '审核通过' : '已退回企业补正') : ElMessage.error(res.msg)
  await load()
}

const openReversal = (row) => {
  current.value = row
  detailVisible.value = true
  ElMessage.info('冲正申请为设计建议（C-09）：正式流程待客户确认，此处仅演示入口')
}

const openDetail = (row) => { current.value = row; detailVisible.value = true }

onMounted(async () => {
  batches.value = await fetchBatches()
  await load()
})
</script>

<style lang="scss" scoped>
.filter-bar { margin-bottom: 4px; }
.drawer-sub-title { margin: 18px 0 10px; font-size: 14px; color: var(--ah-text); }
</style>
