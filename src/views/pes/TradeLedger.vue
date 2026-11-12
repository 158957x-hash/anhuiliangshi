<template>
  <div class="page-container">
    <!-- C-11 未确认主体阻断条（仅经营企业角色） -->
    <el-alert
      v-if="isOperator && !operatorConfirmed"
      type="warning"
      show-icon
      :closable="false"
      title="主体信息未确认（C-11）：确认主体信息前不可录入销售出库"
      style="margin-bottom: 12px"
    >
      <el-button size="small" type="primary" link @click="$router.push('/pes/confirm')">去确认</el-button>
    </el-alert>

    <div class="panel">
      <div class="panel-title">
        <span class="title-text">经营台账（E6 · C-07 实名购买）</span>
        <div class="title-extra">
          <el-button v-if="isOperator && operatorConfirmed" type="primary" icon="Plus" @click="openSale">销售出库录入</el-button>
          <el-button icon="Connection" @click="apiVisible = true">接口上报记录</el-button>
          <el-button icon="Refresh" @click="load">刷新</el-button>
        </div>
      </div>

      <el-form inline class="filter-bar">
        <el-form-item label="类型">
          <el-select v-model="filters.type" clearable placeholder="全部" style="width: 160px" @change="load">
            <el-option label="生产入库" value="produce" />
            <el-option label="采购入库" value="purchase" />
            <el-option label="销售出库" value="sale" />
            <el-option label="购买" value="buy" />
            <el-option label="退货" value="return" />
          </el-select>
        </el-form-item>
        <el-form-item label="批次">
          <el-select v-model="filters.batchId" clearable placeholder="全部批次" style="width: 180px" @change="load">
            <el-option v-for="b in batches" :key="b.id" :label="`${b.id} · ${b.batchNo}`" :value="b.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="rows" border stripe>
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="FLOW_TAG[row.type] || 'info'" disable-transitions>{{ FLOW_NAME[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="batchId" label="批次" width="100" />
        <el-table-column label="产品" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ productName(row.batchId) }}</template>
        </el-table-column>
        <el-table-column label="流出方" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ subjectName(row.from) }}</template></el-table-column>
        <el-table-column label="流入方" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.to ? subjectName(row.to) : (row.buyerName || '信息缺失') }}
          </template>
        </el-table-column>
        <el-table-column label="数量（吨）" width="100" align="right"><template #default="{ row }">{{ row.qty }}</template></el-table-column>
        <el-table-column label="实名购买" width="95" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.realName" size="small" type="success" disable-transitions>已实名</el-tag>
            <el-tag v-else size="small" type="danger" disable-transitions>缺购买方</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="95" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.breakPoint" size="small" type="warning" disable-transitions>断点</el-tag>
            <el-tag v-else size="small" type="success" disable-transitions>正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.remark || '—' }}</template></el-table-column>
      </el-table>
      <div class="corner-note">购买方证件号/电话字段集待 C-07 确认，演示中脱敏显示：证件 3412**********\*\*\*\* · 电话 138\*\*\*\*5678</div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <span class="title-text">本主体库存（M-05 口径）
          <el-tooltip content="库存 = 入库 − 出库 + 退货 − 损耗 ± 盘点；损耗/盘点调整项为设计建议，口径待客户确认（C-08）。负库存置「待核查」不阻断业务。">
            <el-icon style="margin-left: 4px; vertical-align: -2px"><QuestionFilled /></el-icon>
          </el-tooltip>
        </span>
        <span class="corner-note">库存口径待客户确认（C-08）</span>
      </div>
      <el-table :data="inventory" border size="small">
        <el-table-column prop="batchId" label="批次" width="110" />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="productName" label="产品" min-width="180" />
        <el-table-column label="结存（吨）" width="110" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.stock < 0 ? '#c2571a' : 'inherit', fontWeight: row.stock < 0 ? 700 : 400 }">{{ row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column label="核查状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.checkStatus === '待核查'" size="small" type="warning" disable-transitions>待核查</el-tag>
            <el-tag v-else size="small" type="success" disable-transitions>正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="追溯" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.breakPoint" size="small" type="danger" disable-transitions>断点</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 接口上报记录（R07：既有平台互联互通演示） -->
    <el-drawer v-model="apiVisible" title="接口上报记录（E12 · R07 互联互通）" size="560px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 12px"
        title="经营软件/服务商按对接标准批量上报：幂等接收、逐条结果、失败可定位重试。正式接口协议待确认（Q-PES-05）。" />
      <div v-for="log in apiLogs" :key="log.id" class="api-log-card">
        <div class="al-head">
          <b>{{ log.sourceSystem }}</b>
          <el-tag size="small" :type="log.failed ? 'warning' : 'success'" disable-transitions>{{ log.status }}</el-tag>
        </div>
        <div class="al-meta">{{ log.time }} · 共 {{ log.total }} 条 · 成功 {{ log.success }} · 失败 {{ log.failed }}</div>
        <el-table v-if="log.items?.length" :data="log.items" size="small" border style="margin-top: 8px">
          <el-table-column prop="seq" label="#" width="50" />
          <el-table-column prop="voucher" label="流水号" width="130" />
          <el-table-column prop="status" label="结果" width="80" align="center" />
          <el-table-column prop="errorCode" label="错误码" width="100" />
          <el-table-column prop="msg" label="说明" min-width="140" />
        </el-table>
      </div>
    </el-drawer>

    <!-- 销售出库录入 -->
    <el-dialog v-model="saleVisible" :title="saleForm.flowType === 'sale' ? '销售出库录入（C-07 实名购买）' : saleForm.flowType === 'purchase' ? '采购入库录入' : '退货录入'" width="560px" :close-on-click-modal="false">
      <el-alert v-if="saleForm.flowType === 'sale'" type="info" :closable="false" show-icon style="margin-bottom: 12px"
        title="销售出库必填购买方名称（C-07）；证件号/电话字段集待确认，先行脱敏采集。" />
      <el-form ref="saleFormRef" :model="saleForm" :rules="saleRules" label-width="110px">
        <el-form-item label="业务类型" prop="flowType">
          <el-radio-group v-model="saleForm.flowType">
            <el-radio-button value="sale">销售出库</el-radio-button>
            <el-radio-button value="purchase">采购入库</el-radio-button>
            <el-radio-button value="return">退货</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="saleForm.flowType === 'purchase' ? '供货方' : saleForm.flowType === 'return' ? '退货方' : '购买方名称'" prop="party">
          <el-input v-if="saleForm.flowType === 'sale'" v-model="saleForm.buyerName" placeholder="必填：企业/合作社/个人姓名" />
          <el-select v-else v-model="saleForm.partySubjectId" filterable clearable style="width: 100%" placeholder="选择经营/生产企业">
            <el-option v-for="s in partnerSubjects" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="批次" prop="batchId">
          <el-select v-model="saleForm.batchId" style="width: 100%">
            <el-option v-for="b in batches" :key="b.id" :label="`${b.id} · ${b.batchNo} · ${productName(b.id)}`" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="saleForm.flowType === 'sale'" label="证件号">
          <el-input v-model="saleForm.idMasked" placeholder="3412**********（脱敏展示）" />
        </el-form-item>
        <el-form-item v-if="saleForm.flowType === 'sale'" label="联系电话">
          <el-input v-model="saleForm.phoneMasked" placeholder="138****5678（脱敏展示）" />
        </el-form-item>
        <el-form-item v-if="saleForm.flowType === 'return'" label="退货原因">
          <el-input v-model="saleForm.remark" placeholder="如 包装破损退货" />
        </el-form-item>
        <el-form-item label="数量（吨）" prop="qty"><el-input-number v-model="saleForm.qty" :min="0.5" :step="0.5" style="width: 100%" /></el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="saleForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveSale">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchFlows, addFlow, fetchBatches, fetchConfirms, computeInventory, fetchApiLogs } from '@/api/pes'
import { PES_SUBJECTS, PES_SUBJECT_MAP, PES_PRODUCT_MAP } from '@/mock/pes/data'

const FLOW_NAME = { produce: '生产入库', purchase: '采购入库', sale: '销售出库', buy: '购买', return: '退货' }
const FLOW_TAG = { produce: 'primary', purchase: 'primary', sale: 'warning', buy: 'success', return: 'info' }

const userStore = useUserStore()
const isOperator = computed(() => userStore.role?.code === 'pes_operator')
const filters = reactive({ type: '', batchId: '' })
const rows = ref([])
const batches = ref([])
const inventory = ref([])
const operatorConfirmed = ref(true)
const apiVisible = ref(false)
const apiLogs = ref([])
const saleVisible = ref(false)
const saleFormRef = ref()
const saving = ref(false)
const saleForm = reactive({ flowType: 'sale', batchId: '', buyerName: '', partySubjectId: '', idMasked: '', phoneMasked: '', remark: '', qty: 1, date: new Date().toISOString().slice(0, 10) })
const saleRules = {
  batchId: [{ required: true, message: '请选择批次', trigger: 'change' }],
  buyerName: [{
    validator: (r, v, cb) => {
      if (saleForm.flowType !== 'sale') return cb()
      if (!v || !String(v).trim()) return cb(new Error('购买方名称必填（C-07）'))
      cb()
    }, trigger: 'blur'
  }],
  party: [{
    validator: (r, v, cb) => {
      if (saleForm.flowType === 'sale') return cb()
      if (!saleForm.partySubjectId) return cb(new Error(saleForm.flowType === 'purchase' ? '请选择供货方' : '请选择退货方'))
      cb()
    }, trigger: 'change'
  }],
  qty: [{ required: true, message: '请填写数量', trigger: 'blur' }]
}

const partnerSubjects = computed(() => PES_SUBJECTS.filter((s) => ['operate', 'produce'].includes(s.type) && s.id !== userStore.role?.subjectId))

const productName = (batchId) => {
  const b = batches.value.find((x) => x.id === batchId)
  return b ? (PES_PRODUCT_MAP[b.productId]?.name || '') : ''
}
const subjectName = (sid) => PES_SUBJECT_MAP[sid]?.name || sid || '—'

const load = async () => {
  const [flows, inv] = await Promise.all([
    fetchFlows(userStore.role, { ...filters }),
    computeInventory(userStore.role?.subjectId || '')
  ])
  rows.value = flows
  inventory.value = inv
  if (isOperator.value) {
    const cs = await fetchConfirms(userStore.role)
    operatorConfirmed.value = cs.some((c) => c.subjectId === userStore.role?.subjectId && c.status === '已确认')
  }
}

const openSale = () => {
  Object.assign(saleForm, { flowType: 'sale', batchId: '', buyerName: '', partySubjectId: '', idMasked: '', phoneMasked: '', remark: '', qty: 1, date: new Date().toISOString().slice(0, 10) })
  saleVisible.value = true
}

const saveSale = () => {
  saleFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      const me = userStore.role?.subjectId
      const ft = saleForm.flowType
      // 出库：本主体流出；采购入库/退货：对方流向本主体
      const payload = ft === 'sale'
        ? { batchId: saleForm.batchId, type: 'sale', from: me, to: null, qty: saleForm.qty, date: saleForm.date, buyerName: saleForm.buyerName, realName: true }
        : ft === 'purchase'
          ? { batchId: saleForm.batchId, type: 'purchase', from: saleForm.partySubjectId, to: me, qty: saleForm.qty, date: saleForm.date, realName: false, remark: '采购入库录入' }
          : { batchId: saleForm.batchId, type: 'return', from: saleForm.partySubjectId, to: me, qty: saleForm.qty, date: saleForm.date, realName: false, remark: saleForm.remark || '退货录入' }
      await addFlow(payload)
      ElMessage.success({ sale: '销售出库已登记（购买方已实名）', purchase: '采购入库已登记', return: '退货已登记' }[ft])
      saleVisible.value = false
      await load()
    } finally { saving.value = false }
  })
}

onMounted(async () => {
  batches.value = await fetchBatches()
  apiLogs.value = await fetchApiLogs()
  await load()
})
</script>

<style lang="scss" scoped>
.filter-bar { margin-bottom: 4px; }
.corner-note { font-size: 12px; color: var(--ah-text-secondary); }
.panel .panel-title .corner-note { margin-left: auto; }
.api-log-card {
  background: #fbfcfe; border: 1px solid #eef1f6; border-radius: 10px;
  padding: 12px 14px; margin-bottom: 12px;
  .al-head { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
  .al-meta { font-size: 12.5px; color: var(--ah-text-secondary); margin-top: 4px; }
}
</style>
