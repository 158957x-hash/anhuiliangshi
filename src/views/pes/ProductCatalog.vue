<template>
  <div class="page-container">
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">产品与批次库</span>
        <div class="title-extra">
          <el-button v-if="isProvince" type="primary" icon="Plus" @click="openCreate">新增产品</el-button>
          <el-button icon="Refresh" @click="load">刷新</el-button>
        </div>
      </div>

      <el-form inline class="filter-bar">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="产品名称 / 登记证号 / 商标" style="width: 240px" />
        </el-form-item>
        <el-form-item label="类别">
          <el-select v-model="filters.brand" clearable placeholder="全部" style="width: 130px">
            <el-option label="杀虫剂" value="杀虫剂" />
            <el-option label="杀菌剂" value="杀菌剂" />
            <el-option label="除草剂" value="除草剂" />
          </el-select>
        </el-form-item>
        <el-form-item label="生产企业">
          <el-select v-model="filters.producer" clearable filterable placeholder="全部" style="width: 220px">
            <el-option v-for="p in producers" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="仅看限用">
          <el-switch v-model="filters.onlyRestricted" />
        </el-form-item>
      </el-form>

      <el-table :data="filtered" border stripe>
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="batch-wrap">
              <div class="batch-head">
                <span>生产批次（{{ batchesOf(row.id).length }}）</span>
                <el-tag v-if="!batchesOf(row.id).length" size="small" type="info" effect="plain" disable-transitions>暂无批次</el-tag>
              </div>
              <el-table v-if="batchesOf(row.id).length" :data="batchesOf(row.id)" size="small" border>
                <el-table-column prop="batchNo" label="批次号" width="150" />
                <el-table-column prop="produceDate" label="生产日期" width="120" />
                <el-table-column label="产量" width="110" align="right"><template #default="{ row: b }">{{ b.qty }} {{ b.unit }}</template></el-table-column>
                <el-table-column prop="qr" label="追溯二维码" min-width="220" show-overflow-tooltip />
                <el-table-column label="操作" width="140">
                  <template #default="{ row: b }">
                    <el-button link type="primary" @click="$router.push({ path: '/pes/trace', query: { batch: b.id } })">流向追溯</el-button>
                    <el-button link @click="doQueryPublic(b.batchNo)">公众查询</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="regNo" label="登记证号" width="130" />
        <el-table-column prop="name" label="农药名称" min-width="170" show-overflow-tooltip />
        <el-table-column prop="trademark" label="商标" width="100" />
        <el-table-column prop="brand" label="类别" width="90" align="center" />
        <el-table-column label="毒性" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.toxA === 'low' ? 'success' : row.toxA === 'medium' ? 'warning' : 'danger'" disable-transitions>{{ row.toxAName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="含量/剂型" width="120" align="center">
          <template #default="{ row }">{{ row.content }} / {{ row.formulation }}</template>
        </el-table-column>
        <el-table-column prop="crops" label="使用范围" min-width="140" show-overflow-tooltip />
        <el-table-column prop="producerName" label="生产企业" min-width="180" show-overflow-tooltip />
        <el-table-column label="限用" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.restricted" size="small" type="danger" disable-transitions>限用</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增产品（省级，登记证唯一校验） -->
    <el-dialog v-model="createVisible" title="新增产品（省级维护主数据）" width="560px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="登记证号" prop="regNo"><el-input v-model="form.regNo" placeholder="如 PD20261234" /></el-form-item>
        <el-form-item label="农药名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="商标" prop="trademark"><el-input v-model="form.trademark" /></el-form-item>
        <el-form-item label="类别" prop="brand">
          <el-select v-model="form.brand" style="width: 100%">
            <el-option v-for="b in ['杀虫剂', '杀菌剂', '除草剂']" :key="b" :label="b" :value="b" />
          </el-select>
        </el-form-item>
        <el-form-item label="毒性" prop="toxAName">
          <el-select v-model="form.toxAName" style="width: 100%">
            <el-option label="低毒" value="低毒" />
            <el-option label="中等毒" value="中等毒" />
            <el-option label="高毒" value="高毒" />
          </el-select>
        </el-form-item>
        <el-form-item label="含量/剂型" prop="content">
          <el-input v-model="form.content" placeholder="如 30%" style="width: 45%" />
          <el-input v-model="form.formulation" placeholder="如 水剂" style="width: 45%; margin-left: 10%" />
        </el-form-item>
        <el-form-item label="使用范围" prop="crops"><el-input v-model="form.crops" placeholder="作物，如 小麦、水稻" /></el-form-item>
        <el-form-item label="生产企业" prop="producer">
          <el-select v-model="form.producer" filterable style="width: 100%">
            <el-option v-for="p in producers" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchProducts, fetchBatches } from '@/api/pes'
import { PES_PRODUCTS, PES_SUBJECTS } from '@/mock/pes/data'

const router = useRouter()
const userStore = useUserStore()
const isProvince = computed(() => userStore.role?.regionCode === '340000' && !userStore.role?.subjectId)

const filters = reactive({ keyword: '', brand: '', producer: '', onlyRestricted: false })
const batches = ref([])
const createVisible = ref(false)
const formRef = ref()
const saving = ref(false)
const form = reactive({})
const rules = {
  regNo: [
    { required: true, message: '请填写登记证号', trigger: 'blur' },
    { validator: (r, v, cb) => (PES_PRODUCTS.some((p) => p.regNo === v) ? cb(new Error('登记证号已存在，必须唯一')) : cb()), trigger: 'blur' }
  ],
  name: [{ required: true, message: '请填写农药名称', trigger: 'blur' }],
  producer: [{ required: true, message: '请选择生产企业', trigger: 'change' }]
}

const producers = computed(() => PES_SUBJECTS.filter((s) => s.type === 'produce'))
const filtered = computed(() =>
  PES_PRODUCTS.filter((p) => {
    if (filters.brand && p.brand !== filters.brand) return false
    if (filters.producer && p.producer !== filters.producer) return false
    if (filters.onlyRestricted && !p.restricted) return false
    if (filters.keyword && !`${p.name} ${p.regNo} ${p.trademark}`.includes(filters.keyword)) return false
    return true
  })
)

const batchesOf = (pid) => batches.value.filter((b) => b.productId === pid)

const openCreate = () => {
  Object.assign(form, { regNo: '', name: '', trademark: '', brand: '杀虫剂', toxAName: '低毒', content: '', formulation: '', crops: '', producer: '' })
  createVisible.value = true
}

const save = () => {
  formRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      const producer = producers.value.find((p) => p.id === form.producer)
      PES_PRODUCTS.push({ id: `PRD-0${String(PES_PRODUCTS.length + 1).padStart(3, '0')}`, toxA: { 低毒: 'low', 中等毒: 'medium', 高毒: 'high' }[form.toxAName], ...form, producerName: producer?.name || '', targets: '' })
      ElMessage.success('产品已保存（登记证号唯一校验通过，演示内存）')
      createVisible.value = false
    } finally { saving.value = false }
  })
}

const doQueryPublic = (batchNo) => {
  router.push({ path: '/pes/public', query: { code: batchNo } })
}

const load = async () => { batches.value = await fetchBatches() }

onMounted(load)
</script>

<style lang="scss" scoped>
.filter-bar { margin-bottom: 4px; }
.batch-wrap { padding: 6px 14px 10px 40px; background: #fbfcfe; }
.batch-head { font-size: 13px; color: var(--ah-text); margin-bottom: 8px; font-weight: 600; }
</style>
