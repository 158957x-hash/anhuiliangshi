<template>
  <div class="page-container">
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">包装废弃物回收</span>
        <div class="title-extra">
          <el-button v-if="isRecycler || isCounty" type="primary" icon="Plus" @click="openRegister">回收登记</el-button>
          <el-button icon="Refresh" @click="load">刷新</el-button>
        </div>
      </div>

      <el-form inline class="filter-bar">
        <el-form-item label="核验状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 140px">
            <el-option v-for="(v, k) in PES_CHECK_STATUS" :key="k" :label="v.name" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" clearable placeholder="全部" style="width: 140px">
            <el-option label="农药瓶" value="农药瓶" />
            <el-option label="农药袋" value="农药袋" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="filtered" border stripe>
        <el-table-column prop="voucher" label="凭证号" width="140">
          <template #default="{ row }">
            <el-tooltip content="凭证号唯一，可在台账中检索" placement="top"><span>{{ row.voucher }}</span></el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="回收日期" width="110" />
        <el-table-column label="农药批次" width="120" align="center">
          <template #default="{ row }">
            <template v-if="row.batchNo">{{ row.batchNo }}</template>
            <el-tag v-else size="small" type="info" effect="plain" disable-transitions>未关联</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stationName" label="回收站点" min-width="180" show-overflow-tooltip />
        <el-table-column prop="fromName" label="交回主体" min-width="180" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="90" align="center" />
        <el-table-column prop="count" label="数量（个）" width="110" align="right" />
        <el-table-column prop="weight" label="重量（kg）" width="105" align="right" />
        <el-table-column prop="handle" label="处置方式" width="140" />
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

    <div class="panel">
      <div class="panel-title"><span class="title-text">各地市回收重量统计（kg）</span></div>
      <BaseChart :option="cityChartOption" height="280px" />
    </div>

    <!-- 回收登记 -->
    <el-dialog v-model="registerVisible" title="回收登记" width="560px" :close-on-click-modal="false">
      <el-form ref="regFormRef" :model="regForm" :rules="regRules" label-width="110px">
        <el-form-item label="凭证号" prop="voucher">
          <el-input v-model="regForm.voucher" placeholder="唯一凭证号，如 HZ-2026-1101" />
        </el-form-item>
        <el-form-item label="回收日期" prop="date">
          <el-date-picker v-model="regForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="isCounty" label="回收站点" prop="stationId">
          <el-select v-model="regForm.stationId" filterable style="width: 100%" placeholder="选择代录的回收站点">
            <el-option v-for="s in recyclerSubjects" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="交回主体" prop="fromSubject">
          <el-select v-model="regForm.fromSubject" filterable style="width: 100%">
            <el-option v-for="s in operateSubjects" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="农药批次">
          <el-select v-model="regForm.batchNo" filterable allow-create clearable style="width: 100%" placeholder="扫包装二维码带出；散装交回可留空">
            <el-option v-for="b in batchOptions" :key="b.id" :label="b.batchNo" :value="b.batchNo" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="regForm.type" style="width: 100%">
            <el-option label="农药瓶" value="农药瓶" />
            <el-option label="农药袋" value="农药袋" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量（个）" prop="count"><el-input-number v-model="regForm.count" :min="1" style="width: 100%" /></el-form-item>
        <el-form-item label="重量（kg）" prop="weight"><el-input-number v-model="regForm.weight" :min="1" style="width: 100%" /></el-form-item>
        <el-form-item label="处置方式" prop="handle">
          <el-select v-model="regForm.handle" style="width: 100%">
            <el-option label="无害化焚烧处置" value="无害化焚烧处置" />
            <el-option label="资源化利用" value="资源化利用" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRegister">保存</el-button>
      </template>
    </el-dialog>

    <!-- 县级核验 -->
    <AuditDialog
      v-model="auditVisible"
      title="回收记录核验（县级）"
      :actions="CHECK_ACTIONS"
      default-action="pass"
      reject-reason-required
      tip="核验通过后记录只读；核验不通过须填写原因，回收主体可修改后重新提交。"
      placeholder="核验不通过时必填，如：数量与交回凭证不符"
      @confirm="doCheck"
    />
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchRecycles, checkPesRecord } from '@/api/pes'
import { PES_RECYCLES, PES_SUBJECTS, PES_CHECK_STATUS, PES_BATCHES } from '@/mock/pes/data'
import BaseChart from '@/components/charts/BaseChart.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import AuditDialog from '@/components/common/AuditDialog.vue'

const CHECK_ACTIONS = [
  { value: 'pass', label: '核验通过' },
  { value: 'reject', label: '核验不通过' }
]

const userStore = useUserStore()
const isRecycler = computed(() => userStore.role?.code === 'pes_recycler')
const isCounty = computed(() => userStore.role?.code === 'county')

const filters = reactive({ status: '', type: '' })
const rows = ref([])
const registerVisible = ref(false)
const regFormRef = ref()
const saving = ref(false)
const auditVisible = ref(false)
const auditRow = ref(null)
const regForm = reactive({ voucher: '', date: '', stationId: '', fromSubject: '', batchNo: '', type: '农药瓶', count: 100, weight: 50, handle: '无害化焚烧处置' })
const regRules = {
  voucher: [
    { required: true, message: '请填写凭证号', trigger: 'blur' },
    { validator: (r, v, cb) => (rows.value.some((x) => x.voucher === v) ? cb(new Error('凭证号已存在，必须唯一')) : cb()), trigger: 'blur' }
  ],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  stationId: [{ required: true, message: '县级代录须选择回收站点', trigger: 'change' }],
  fromSubject: [{ required: true, message: '请选择交回主体', trigger: 'change' }]
}

const operateSubjects = computed(() => PES_SUBJECTS.filter((s) => s.type === 'operate'))
const recyclerSubjects = computed(() => PES_SUBJECTS.filter((s) => s.type === 'recycle'))
const batchOptions = PES_BATCHES

const filtered = computed(() =>
  rows.value.filter((r) => {
    if (filters.status && r.status !== filters.status) return false
    if (filters.type && r.type !== filters.type) return false
    return true
  })
)

const cityChartOption = computed(() => {
  const cityMap = {}
  rows.value.forEach((r) => {
    const city = String(r.regionCode).slice(0, 4)
    cityMap[city] = (cityMap[city] || 0) + (r.weight || 0)
  })
  return {
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: Object.keys(cityMap).map((c) => c + '区划') },
    yAxis: { type: 'value', name: 'kg' },
    tooltip: { trigger: 'axis' },
    series: [{ type: 'bar', data: Object.values(cityMap), itemStyle: { color: '#2f8f83', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 42 }]
  }
})

const load = async () => { rows.value = await fetchRecycles(userStore.role) }

const openRegister = () => {
  Object.assign(regForm, { voucher: `HZ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`, date: new Date().toISOString().slice(0, 10), stationId: '', fromSubject: '', batchNo: '', type: '农药瓶', count: 100, weight: 50, handle: '无害化焚烧处置' })
  registerVisible.value = true
}

const saveRegister = () => {
  regFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      const from = operateSubjects.value.find((s) => s.id === regForm.fromSubject)
      const stationId = isCounty.value ? regForm.stationId : (userStore.role?.subjectId || '')
      const station = recyclerSubjects.value.find((s) => s.id === stationId)
      const { stationId: _omit, batchNo, ...rest } = regForm
      PES_RECYCLES.unshift({
        id: `RC-${String(PES_RECYCLES.length + 1).padStart(4, '0')}`,
        stationId, stationName: isCounty.value ? (station?.name || '县级行政代录') : userStore.role?.unit,
        regionCode: isCounty.value ? (station?.regionCode || userStore.role?.regionCode) : userStore.role?.regionCode,
        ...rest, batchNo: batchNo || '',
        fromName: from?.name || '', status: 'pending', checker: '', checkTime: '', checkOpinion: ''
      })
      ElMessage.success('回收登记已提交，状态：待核验（由县级核验）')
      registerVisible.value = false
      await load()
    } finally { saving.value = false }
  })
}

// 县级核验（统一核验流程）
const openCheck = (row) => { auditRow.value = row; auditVisible.value = true }
const doCheck = async ({ action, opinion }) => {
  const res = await checkPesRecord('recycle', auditRow.value.id, {
    action,
    opinion,
    checker: `${userStore.role?.name || ''}（${userStore.role?.unit || ''}）`
  })
  if (res.success) {
    ElMessage.success(action === 'pass' ? '核验通过' : '已核验不通过，回收主体可修改后重新提交')
  } else {
    ElMessage.error(res.msg)
  }
  await load()
}

onMounted(load)
// KeepAlive 二次进入时按当前角色刷新数据范围
onActivated(load)
</script>

<style lang="scss" scoped>
.filter-bar { margin-bottom: 4px; }
</style>
