<template>
  <div class="page-container">
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">包装废弃物回收（E9 · C-14）</span>
        <div class="title-extra">
          <el-button v-if="isRecycler" type="primary" icon="Plus" @click="openRegister">回收登记</el-button>
          <el-button icon="Refresh" @click="load">刷新</el-button>
        </div>
      </div>

      <el-form inline class="filter-bar">
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 140px">
            <el-option v-for="s in RECYCLE_STATUS" :key="s" :label="s" :value="s" />
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
        <el-table-column prop="stationName" label="回收站点" min-width="180" show-overflow-tooltip />
        <el-table-column prop="fromName" label="交回主体" min-width="180" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="90" align="center" />
        <el-table-column prop="count" label="数量（个）" width="110" align="right" />
        <el-table-column prop="weight" label="重量（kg）" width="105" align="right" />
        <el-table-column prop="handle" label="处置方式" width="140" />
        <el-table-column label="状态" width="95" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="STATUS_TAG[row.status] || 'info'" disable-transitions>{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isRegulator" label="操作" fixed="right" width="110">
          <template #default="{ row }">
            <el-button v-if="row.status === '待核验'" link type="primary" @click="advance(row)">核验通过</el-button>
            <el-button v-else-if="row.status === '运输中'" link type="success" @click="advance(row)">完成核验</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-alert type="info" :closable="false" show-icon style="margin-top: 12px"
        title="C-14：回收数据由回收主体维护；状态推进（待核验→运输中→已完成）由监管核验触发（design_proposal）。" />
    </div>

    <div class="panel">
      <div class="panel-title"><span class="title-text">各地市回收重量统计（kg）</span></div>
      <BaseChart :option="cityChartOption" height="280px" />
    </div>

    <!-- 回收登记 -->
    <el-dialog v-model="registerVisible" title="回收登记（C-14）" width="560px" :close-on-click-modal="false">
      <el-form ref="regFormRef" :model="regForm" :rules="regRules" label-width="110px">
        <el-form-item label="凭证号" prop="voucher">
          <el-input v-model="regForm.voucher" placeholder="唯一凭证号，如 HZ-2026-1101" />
        </el-form-item>
        <el-form-item label="回收日期" prop="date">
          <el-date-picker v-model="regForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="交回主体" prop="fromSubject">
          <el-select v-model="regForm.fromSubject" filterable style="width: 100%">
            <el-option v-for="s in operateSubjects" :key="s.id" :label="s.name" :value="s.id" />
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchRecycles } from '@/api/pes'
import { PES_RECYCLES, PES_SUBJECTS } from '@/mock/pes/data'
import BaseChart from '@/components/charts/BaseChart.vue'

const RECYCLE_STATUS = ['待核验', '运输中', '已完成']
const STATUS_TAG = { 待核验: 'warning', 运输中: 'primary', 已完成: 'success' }

const userStore = useUserStore()
const isRecycler = computed(() => userStore.role?.code === 'pes_recycler')
const isRegulator = computed(() => ['province', 'city', 'county'].includes(userStore.role?.code))

const filters = reactive({ status: '', type: '' })
const rows = ref([])
const registerVisible = ref(false)
const regFormRef = ref()
const saving = ref(false)
const regForm = reactive({ voucher: '', date: '', fromSubject: '', type: '农药瓶', count: 100, weight: 50, handle: '无害化焚烧处置' })
const regRules = {
  voucher: [
    { required: true, message: '请填写凭证号', trigger: 'blur' },
    { validator: (r, v, cb) => (rows.value.some((x) => x.voucher === v) ? cb(new Error('凭证号已存在，必须唯一')) : cb()), trigger: 'blur' }
  ],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  fromSubject: [{ required: true, message: '请选择交回主体', trigger: 'change' }]
}

const operateSubjects = computed(() => PES_SUBJECTS.filter((s) => s.type === 'operate'))

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
  Object.assign(regForm, { voucher: `HZ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`, date: new Date().toISOString().slice(0, 10), fromSubject: '', type: '农药瓶', count: 100, weight: 50, handle: '无害化焚烧处置' })
  registerVisible.value = true
}

const saveRegister = () => {
  regFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      const from = operateSubjects.value.find((s) => s.id === regForm.fromSubject)
      PES_RECYCLES.unshift({
        id: `RC-${String(PES_RECYCLES.length + 1).padStart(4, '0')}`,
        stationId: userStore.role?.subjectId, stationName: userStore.role?.unit,
        regionCode: userStore.role?.regionCode, ...regForm,
        fromName: from?.name || '', status: '待核验'
      })
      ElMessage.success('回收登记已保存，状态：待核验')
      registerVisible.value = false
      await load()
    } finally { saving.value = false }
  })
}

const advance = (row) => {
  const next = { 待核验: '运输中', 运输中: '已完成' }[row.status]
  if (!next) return
  row.status = next
  ElMessage.success(`凭证 ${row.voucher} 状态推进为「${next}」（演示）`)
}

onMounted(load)
</script>

<style lang="scss" scoped>
.filter-bar { margin-bottom: 4px; }
</style>
