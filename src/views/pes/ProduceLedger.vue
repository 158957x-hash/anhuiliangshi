<template>
  <div class="page-container">
    <!-- C-11 未确认主体阻断条（仅生产企业角色） -->
    <el-alert
      v-if="isProducer && !producerConfirmed"
      type="warning"
      show-icon
      :closable="false"
      title="主体信息未确认：确认主体信息前不可新增生产台账"
      style="margin-bottom: 12px"
    >
      <el-button size="small" type="primary" link @click="$router.push('/pes/confirm')">去确认</el-button>
    </el-alert>

    <div class="panel">
      <div class="panel-title">
        <span class="title-text">生产台账</span>
        <div class="title-extra">
          <el-button v-if="(isProducer && producerConfirmed) || isCounty" type="primary" icon="Plus" @click="openCreate">新增台账</el-button>
          <el-button v-if="(isProducer && producerConfirmed) || isCounty" icon="Upload" @click="openImport">批量导入</el-button>
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
        <el-form-item label="核验状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 140px" @change="load">
            <el-option v-for="(v, k) in PES_CHECK_STATUS" :key="k" :label="v.name" :value="k" />
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
        <el-table-column label="核验状态" width="110" align="center">
          <template #default="{ row }">
            <StatusTag :dict="PES_CHECK_STATUS" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160"><template #default="{ row }">{{ row.submitTime || '—' }}</template></el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="isProducer && row.status !== 'passed'" link @click="openEdit(row)">{{ row.status === 'rejected' ? '修改重报' : '修改' }}</el-button>
            <el-button v-if="isCounty && row.status === 'pending'" link type="warning" @click="openCheck(row)">核验</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/修改台账 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? (editWasRejected ? '修改重报（核验不通过后重新提交）' : '修改台账（待核验中）') : '新增生产台账（提交即进入待核验）'" width="620px" :close-on-click-modal="false">
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

    <!-- 批量导入 -->
    <ImportDialog
      ref="importRef"
      title="生产台账批量导入"
      :columns="importColumns"
      :do-import="runImport"
      @success="load"
    />

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="台账详情与流转留痕" size="480px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="台账编号">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="主体">{{ current.subjectName }}</el-descriptions-item>
          <el-descriptions-item label="周期">{{ current.period }}（{{ { day: '日', month: '月', year: '年' }[current.periodType] }}报）</el-descriptions-item>
          <el-descriptions-item label="产品/批次">{{ current.productName }} / {{ current.batchId }}</el-descriptions-item>
          <el-descriptions-item label="产量/销量/库存">{{ current.produceQty }} / {{ current.salesQty }} / {{ current.inventoryQty }} 吨</el-descriptions-item>
          <el-descriptions-item label="销售额">{{ current.salesAmount }} 万元</el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="版本">v{{ current.version }}</el-descriptions-item>
          <el-descriptions-item label="核验状态"><StatusTag :dict="PES_CHECK_STATUS" :value="current.status" /></el-descriptions-item>
          <el-descriptions-item label="核验人">{{ current.checker || '—' }}</el-descriptions-item>
          <el-descriptions-item label="核验时间">{{ current.checkTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="核验意见">{{ current.checkOpinion || '—' }}</el-descriptions-item>
        </el-descriptions>
        <h4 class="drawer-sub-title">流转留痕</h4>
        <FlowSteps :steps="currentSteps" />
      </template>
    </el-drawer>

    <!-- 县级核验 -->
    <AuditDialog
      v-model="auditVisible"
      title="生产台账核验（县级）"
      :actions="CHECK_ACTIONS"
      default-action="pass"
      reject-reason-required
      tip="核验通过后台账只读；核验不通过须填写原因，企业可修改后重新提交。"
      placeholder="核验不通过时必填，如：销售量与经营流水不一致"
      @confirm="doCheck"
    />
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  fetchProduceLedgers, addProduceLedger, updateProduceLedger, checkPesRecord,
  importProduceLedgers, fetchBatches, fetchConfirms
} from '@/api/pes'
import { PES_CHECK_STATUS, PES_PRODUCT_MAP } from '@/mock/pes/data'
import StatusTag from '@/components/common/StatusTag.vue'
import FlowSteps from '@/components/common/FlowSteps.vue'
import ImportDialog from '@/components/common/ImportDialog.vue'
import AuditDialog from '@/components/common/AuditDialog.vue'

const CHECK_ACTIONS = [
  { value: 'pass', label: '核验通过' },
  { value: 'reject', label: '核验不通过' }
]

const userStore = useUserStore()
const isProducer = computed(() => userStore.role?.code === 'pes_producer')
const isCounty = computed(() => userStore.role?.code === 'county')

const filters = reactive({ periodType: 'month', status: '' })
const rows = ref([])
const batches = ref([])
const producerConfirmed = ref(true)
const editVisible = ref(false)
const editFormRef = ref()
const saving = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const importRef = ref()
const auditVisible = ref(false)
const auditRow = ref(null)
const editWasRejected = ref(false)
const editForm = reactive({ id: '', periodType: 'month', period: '', batchId: '', productId: '', productName: '', produceQty: 0, salesQty: 0, salesAmount: 0, inventoryQty: 0 })
const editRules = {
  period: [{ required: true, message: '请填写周期', trigger: 'blur' }],
  batchId: [{ required: true, message: '请选择批次', trigger: 'change' }]
}
const periodPlaceholder = computed(() => ({ day: '如 2026-11-11', month: '如 2026-11', year: '如 2026' }[editForm.periodType]))

const importColumns = [
  { key: 'periodType', label: '周期类型', required: true, hint: 'day=日 / month=月 / year=年', example: 'month' },
  { key: 'period', label: '周期', required: true, hint: '日报如 2026-11-11，月报如 2026-11，年报如 2026', example: '2026-11' },
  { key: 'batchNo', label: '批次号', required: true, hint: '产品包装上的生产批次号', example: 'HG20260301A' },
  { key: 'produceQty', label: '产量', required: true, hint: '吨，≥0', example: '100' },
  { key: 'salesQty', label: '销量', required: true, hint: '吨，≥0', example: '60' },
  { key: 'salesAmount', label: '销售额', required: true, hint: '万元，≥0', example: '180' },
  { key: 'inventoryQty', label: '库存', required: true, hint: '吨，≥0', example: '40' }
]
const runImport = (rowsIn) =>
  importProduceLedgers(rowsIn.map((r) => ({ ...r, subjectId: userStore.role?.subjectId, subjectName: userStore.role?.unit })))

const currentSteps = computed(() => {
  if (!current.value) return []
  const s = [{ time: '', action: '台账创建', user: current.value.subjectName, extra: `版本 v1 · ${current.value.periodType === 'day' ? '日报' : current.value.periodType === 'month' ? '月报' : '年报'}` }]
  if (current.value.submitTime) s.push({ time: current.value.submitTime, action: '提交（进入待核验）', user: current.value.subjectName, type: 'success' })
  if (current.value.version > 1) s.push({ time: '', action: `修改重报（当前 v${current.value.version}）`, user: current.value.subjectName })
  if (current.value.status === 'passed' && current.value.checkTime) s.push({ time: current.value.checkTime, action: '县级核验通过', user: current.value.checker, type: 'success' })
  if (current.value.status === 'rejected' && current.value.checkTime) s.push({ time: current.value.checkTime, action: `县级核验不通过：${current.value.checkOpinion || '无意见'}`, user: current.value.checker, type: 'danger' })
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
  editWasRejected.value = row.status === 'rejected'
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
        const res = await updateProduceLedger(editForm.id, { ...editForm })
        res.success ? ElMessage.success('台账已修改并重新提交，进入待核验') : ElMessage.error(res.msg)
      } else {
        await addProduceLedger({
          subjectId: userStore.role?.subjectId, subjectName: userStore.role?.unit,
          periodType: editForm.periodType, period: editForm.period, batchId: editForm.batchId,
          productId: editForm.productId, productName: editForm.productName,
          produceQty: editForm.produceQty, salesQty: editForm.salesQty,
          salesAmount: editForm.salesAmount, inventoryQty: editForm.inventoryQty
        })
        ElMessage.success('台账已提交，状态：待核验（由县级核验）')
      }
      editVisible.value = false
      await load()
    } finally { saving.value = false }
  })
}

// 县级核验（统一核验流程：核验一次，通过/不通过）
const openCheck = (row) => { auditRow.value = row; auditVisible.value = true }
const doCheck = async ({ action, opinion }) => {
  const res = await checkPesRecord('produce', auditRow.value.id, {
    action,
    opinion,
    checker: `${userStore.role?.name || ''}（${userStore.role?.unit || ''}）`
  })
  if (res.success) {
    ElMessage.success(action === 'pass' ? '核验通过' : '已核验不通过，企业可修改后重新提交')
  } else {
    ElMessage.error(res.msg)
  }
  await load()
}

const openImport = () => importRef.value?.open()
const openDetail = (row) => { current.value = row; detailVisible.value = true }

onMounted(async () => {
  batches.value = await fetchBatches()
  await load()
})
// KeepAlive 二次进入时刷新确认状态与台账列表
onActivated(load)
</script>

<style lang="scss" scoped>
.filter-bar { margin-bottom: 4px; }
.drawer-sub-title { margin: 18px 0 10px; font-size: 14px; color: var(--ah-text); }
</style>
