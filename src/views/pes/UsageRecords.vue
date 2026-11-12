<template>
  <div class="page-container">
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">使用记录</span>
        <div class="title-extra">
          <el-button v-if="isCounty" type="primary" icon="EditPen" @click="openAgent">代录入</el-button>
          <el-button icon="Refresh" @click="load">刷新</el-button>
        </div>
      </div>

      <el-form inline class="filter-bar">
        <el-form-item label="使用主体">
          <el-select v-model="filters.subjectId" clearable filterable placeholder="全部" style="width: 240px" @change="load">
            <el-option v-for="s in useSubjects" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="作物">
          <el-select v-model="filters.crop" clearable placeholder="全部" style="width: 150px" @change="load">
            <el-option v-for="c in cropOptions" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始" end-placeholder="结束" style="width: 240px" @change="load" />
        </el-form-item>
      </el-form>

      <el-table :data="filtered" border stripe>
        <el-table-column prop="usageDate" label="使用日期" width="110" />
        <el-table-column prop="subjectName" label="使用主体" min-width="200" show-overflow-tooltip />
        <el-table-column prop="crop" label="作物" width="110" />
        <el-table-column prop="pestTarget" label="防治对象" width="110" />
        <el-table-column prop="productName" label="农药产品" min-width="170" show-overflow-tooltip />
        <el-table-column label="批次" width="110" align="center">
          <template #default="{ row }">
            <template v-if="row.batchId">{{ row.batchId }}</template>
            <el-tooltip v-else content="购买批次未关联，追溯断点" placement="top">
              <el-tag size="small" type="info" effect="plain" disable-transitions>断点</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="用量" width="110" align="right">
          <template #default="{ row }">{{ row.dosage }} {{ row.unit }}</template>
        </el-table-column>
        <el-table-column prop="areaMu" label="面积（亩）" width="100" align="right" />
        <el-table-column prop="dataSource" label="数据来源" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.dataSource === '皖企通' ? 'success' : 'primary'" effect="plain" disable-transitions>{{ row.dataSource }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="核验状态" width="105" align="center">
          <template #default="{ row }">
            <StatusTag :dict="PES_CHECK_STATUS" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column v-if="isCounty" label="操作" fixed="right" width="90">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" link type="warning" @click="openCheck(row)">核验</el-button>
            <span v-else style="color: var(--ah-text-secondary)">已核验</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 县级代录 -->
    <el-dialog v-model="agentVisible" title="代录使用记录（兜底通道）" width="560px" :close-on-click-modal="false">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 12px"
        title="常规路径为使用主体经皖企通上报；县级代录仅用于线下补救场景。" />
      <el-form ref="agentFormRef" :model="agentForm" :rules="agentRules" label-width="100px">
        <el-form-item label="使用主体" prop="subjectId">
          <el-select v-model="agentForm.subjectId" filterable style="width: 100%">
            <el-option v-for="s in useSubjects" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="使用日期" prop="usageDate">
          <el-date-picker v-model="agentForm.usageDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="作物" prop="crop"><el-input v-model="agentForm.crop" /></el-form-item>
        <el-form-item label="防治对象" prop="pestTarget"><el-input v-model="agentForm.pestTarget" /></el-form-item>
        <el-form-item label="产品" prop="productId">
          <el-select v-model="agentForm.productId" style="width: 100%" @change="onProductChange">
            <el-option v-for="p in products" :key="p.id" :label="`${p.name}（${p.regNo}）`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="批次" prop="batchId">
          <el-select v-model="agentForm.batchId" clearable style="width: 100%" placeholder="关联购买批次（不选=断点演示）">
            <el-option v-for="b in batches" :key="b.id" :label="`${b.id} · ${b.batchNo}`" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="用量" prop="dosage">
          <el-input-number v-model="agentForm.dosage" :min="0" style="width: 45%" />
          <span style="margin-left: 8px">公斤</span>
        </el-form-item>
        <el-form-item label="面积（亩）" prop="areaMu"><el-input-number v-model="agentForm.areaMu" :min="0" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="agentVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveAgent">保存</el-button>
      </template>
    </el-dialog>

    <!-- 县级核验 -->
    <AuditDialog
      v-model="auditVisible"
      title="使用记录核验（县级）"
      :actions="CHECK_ACTIONS"
      default-action="pass"
      reject-reason-required
      tip="核验通过后记录只读；核验不通过须填写原因，通知上报主体核实更正。"
      placeholder="核验不通过时必填，如：用药日期与购买记录不符"
      @confirm="doCheck"
    />
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchUsages, addUsage, fetchBatches, fetchProducts, checkPesRecord } from '@/api/pes'
import { PES_SUBJECTS, PES_PRODUCT_MAP, PES_CHECK_STATUS } from '@/mock/pes/data'
import StatusTag from '@/components/common/StatusTag.vue'
import AuditDialog from '@/components/common/AuditDialog.vue'

const CHECK_ACTIONS = [
  { value: 'pass', label: '核验通过' },
  { value: 'reject', label: '核验不通过' }
]

const userStore = useUserStore()
const isCounty = computed(() => userStore.role?.code === 'county')

const filters = reactive({ subjectId: '', crop: '' })
const dateRange = ref(null)
const rows = ref([])
const batches = ref([])
const products = ref([])
const agentVisible = ref(false)
const agentFormRef = ref()
const saving = ref(false)
const auditVisible = ref(false)
const auditRow = ref(null)
const agentForm = reactive({ subjectId: '', usageDate: '', crop: '', pestTarget: '', productId: '', batchId: '', productName: '', dosage: 1, areaMu: 0 })
const agentRules = {
  subjectId: [{ required: true, message: '请选择使用主体', trigger: 'change' }],
  usageDate: [{ required: true, message: '请选择使用日期', trigger: 'change' }],
  crop: [{ required: true, message: '请填写作物', trigger: 'blur' }],
  productId: [{ required: true, message: '请选择产品', trigger: 'change' }]
}

const useSubjects = computed(() => PES_SUBJECTS.filter((s) => s.type === 'use'))
const cropOptions = computed(() => [...new Set(rows.value.map((r) => r.crop))])

const filtered = computed(() =>
  rows.value.filter((u) => {
    if (filters.subjectId && u.subjectId !== filters.subjectId) return false
    if (filters.crop && u.crop !== filters.crop) return false
    if (dateRange.value?.length === 2 && (u.usageDate < dateRange.value[0] || u.usageDate > dateRange.value[1])) return false
    return true
  })
)

const onProductChange = (pid) => { agentForm.productName = PES_PRODUCT_MAP[pid]?.name || '' }

const load = async () => {
  rows.value = await fetchUsages(userStore.role, {})
}

const openAgent = () => {
  Object.assign(agentForm, { subjectId: '', usageDate: new Date().toISOString().slice(0, 10), crop: '', pestTarget: '', productId: '', batchId: '', productName: '', dosage: 1, areaMu: 0 })
  agentVisible.value = true
}

const saveAgent = () => {
  agentFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      await addUsage({
        subjectId: agentForm.subjectId, subjectName: useSubjects.value.find((s) => s.id === agentForm.subjectId)?.name || '',
        usageDate: agentForm.usageDate, crop: agentForm.crop, pestTarget: agentForm.pestTarget,
        productId: agentForm.productId, productName: agentForm.productName, batchId: agentForm.batchId || '',
        dosage: agentForm.dosage, areaMu: agentForm.areaMu,
        breakPoint: !agentForm.batchId, remark: agentForm.batchId ? '' : '代录未关联批次，追溯断点'
      })
      ElMessage.success('使用记录已代录提交，状态：待核验（由县级核验）')
      agentVisible.value = false
      await load()
    } finally { saving.value = false }
  })
}

// 县级核验（统一核验流程）
const openCheck = (row) => { auditRow.value = row; auditVisible.value = true }
const doCheck = async ({ action, opinion }) => {
  const res = await checkPesRecord('usage', auditRow.value.id, {
    action,
    opinion,
    checker: `${userStore.role?.name || ''}（${userStore.role?.unit || ''}）`
  })
  if (res.success) {
    ElMessage.success(action === 'pass' ? '核验通过' : '已核验不通过，须通知上报主体核实更正')
  } else {
    ElMessage.error(res.msg)
  }
  await load()
}

onMounted(async () => {
  [batches.value, products.value] = await Promise.all([fetchBatches(), fetchProducts()])
  await load()
})
// KeepAlive 二次进入时按当前角色刷新数据范围
onActivated(load)
</script>

<style lang="scss" scoped>
.filter-bar { margin-bottom: 4px; }
.corner-note { font-size: 12px; color: var(--ah-text-secondary); margin-top: 10px; }
</style>
