<template>
  <div class="page-container">
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">主体档案</span>
        <div class="title-extra">
          <el-button v-if="isProvince" type="primary" icon="Plus" @click="openCreate">新增主体</el-button>
          <el-button v-if="isProvince" icon="Upload" @click="openImport">批量导入</el-button>
          <el-button icon="Refresh" @click="load">刷新</el-button>
        </div>
      </div>

      <el-form inline class="filter-bar">
        <el-form-item label="主体类型">
          <el-select v-model="filters.type" clearable placeholder="全部" style="width: 150px">
            <el-option label="生产企业" value="produce" />
            <el-option label="经营企业" value="operate" />
            <el-option label="使用主体" value="use" />
            <el-option label="回收主体" value="recycle" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 150px">
            <el-option v-for="s in STATUS_OPTIONS" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="主体名称 / 法定代表人" style="width: 220px" />
        </el-form-item>
        <el-form-item label="区划">
          <el-select v-model="filters.city" clearable placeholder="全部地市" style="width: 160px">
            <el-option v-for="c in cityOptions" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="rows" border stripe>
        <el-table-column prop="id" label="主体编号" width="120" />
        <el-table-column prop="name" label="主体名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="TYPE_TAG[row.type]" disable-transitions>{{ TYPE_NAME[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="legal" label="法定代表人/负责人" width="140" />
        <el-table-column prop="license" label="许可证号" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row.license || '—' }}</template>
        </el-table-column>
        <el-table-column prop="regionCode" label="区划代码" width="100" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === '正常' ? 'success' : row.status === '注销' ? 'info' : 'warning'" disable-transitions>{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="确认状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="unconfirmedSet.has(row.id)" size="small" type="danger" disable-transitions>未确认</el-tag>
            <el-tag v-else size="small" type="success" disable-transitions>已确认</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="100">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="主体档案详情" size="520px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="主体编号">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="主体名称">{{ current.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ TYPE_NAME[current.type] }}</el-descriptions-item>
          <el-descriptions-item label="法定代表人/负责人">{{ current.legal || '—' }}</el-descriptions-item>
          <el-descriptions-item label="许可证号">{{ current.license || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="current.capacity" label="产能">{{ current.capacity }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ current.address || '—' }}</el-descriptions-item>
          <el-descriptions-item label="区划代码">{{ current.regionCode }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ current.status }}</el-descriptions-item>
        </el-descriptions>

        <h4 class="drawer-sub-title">确认状态</h4>
        <el-tag v-if="unconfirmedSet.has(current.id)" type="danger">未确认 — 企业须先确认主体信息才能上报台账</el-tag>
        <el-tag v-else type="success">已确认</el-tag>

        <h4 class="drawer-sub-title">流转留痕</h4>
        <FlowSteps :steps="currentSteps" />
      </template>
    </el-drawer>

    <!-- 新增主体（省级，design_proposal：状态枚举待业务确认） -->
    <el-dialog v-model="createVisible" title="新增主体" width="560px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <el-form-item label="主体名称" prop="name"><el-input v-model="createForm.name" /></el-form-item>
        <el-form-item label="主体类型" prop="type">
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option v-for="(n, k) in TYPE_NAME" :key="k" :label="n" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="法定代表人" prop="legal"><el-input v-model="createForm.legal" /></el-form-item>
        <el-form-item label="许可证号" prop="license"><el-input v-model="createForm.license" placeholder="农药生许字/经许字编号" /></el-form-item>
        <el-form-item label="区划代码" prop="regionCode"><el-input v-model="createForm.regionCode" placeholder="6位行政区划代码，如 341222" /></el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="createForm.status" style="width: 100%">
            <el-option v-for="s in STATUS_OPTIONS" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入（省级，C-11） -->
    <ImportDialog
      ref="importRef"
      title="主体档案批量导入"
      :columns="importColumns"
      :do-import="runImport"
      @success="load"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchPesSubjects, fetchConfirms, importPesSubjects } from '@/api/pes'
import { PES_SUBJECTS } from '@/mock/pes/data'
import FlowSteps from '@/components/common/FlowSteps.vue'
import ImportDialog from '@/components/common/ImportDialog.vue'

const TYPE_NAME = { produce: '生产企业', operate: '经营企业', use: '使用主体', recycle: '回收主体' }
const TYPE_TAG = { produce: 'primary', operate: 'success', use: 'warning', recycle: 'danger' }
// design_proposal：状态枚举待客户确认
const STATUS_OPTIONS = ['正常', '停产整改', '责令整改', '注销']

const userStore = useUserStore()
const isProvince = computed(() => userStore.role?.regionCode === '340000' && !userStore.role?.subjectId)

const filters = reactive({ type: '', status: '', keyword: '', city: '' })
const list = ref([])
const unconfirmedSet = ref(new Set())
const detailVisible = ref(false)
const current = ref(null)
const createVisible = ref(false)
const createFormRef = ref()
const createForm = reactive({ name: '', type: '', legal: '', license: '', regionCode: '', status: '正常' })
const createRules = {
  name: [{ required: true, message: '请输入主体名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择主体类型', trigger: 'change' }],
  regionCode: [{ required: true, message: '请输入区划代码', trigger: 'blur' }]
}
const importRef = ref()
const importColumns = [
  { key: 'name', label: '主体名称', required: true, hint: '全称，唯一（重复行校验失败）', example: '太和县裕丰农资经营部' },
  { key: 'creditCode', label: '统一社会信用代码', required: true, hint: '18位数字或大写字母', example: '91341222MA2PLQ0X7K' },
  { key: 'type', label: '主体类型', required: true, hint: '生产企业 / 经营企业 / 使用主体 / 回收主体', example: '经营企业' },
  { key: 'regionCode', label: '区划代码', required: true, hint: '6位行政区划代码', example: '341222' },
  { key: 'legalPerson', label: '法定代表人', required: false, hint: '可空', example: '李建国' },
  { key: 'license', label: '许可证号', required: false, hint: '农药经许字/生许字编号，可空', example: '农药经许(皖)第099号' },
  { key: 'address', label: '地址', required: false, hint: '可空', example: '阜阳市太和县城关镇' }
]
const runImport = (rowsIn) => importPesSubjects(rowsIn)
const openImport = () => importRef.value?.open()

const cityOptions = computed(() => [...new Set(PES_SUBJECTS.map((s) => String(s.regionCode).slice(0, 4)))].sort())

const rows = computed(() =>
  list.value.filter((s) => {
    if (filters.type && s.type !== filters.type) return false
    if (filters.status && s.status !== filters.status) return false
    if (filters.city && !String(s.regionCode).startsWith(filters.city)) return false
    if (filters.keyword && !`${s.name} ${s.legal || ''}`.includes(filters.keyword)) return false
    return true
  })
)

const currentSteps = computed(() => {
  if (!current.value) return []
  const steps = [{ time: current.value.id.slice(0, 4) === 'PES-' ? '省级建档' : '系统建档', action: '主体建档', user: '安徽省农业农村厅', extra: `状态：${current.value.status}` }]
  if (!unconfirmedSet.value.has(current.value.id)) {
    steps.push({ time: '', action: '主体信息确认', user: current.value.legal || '企业经办人', opinion: '经核对营业执照与许可证信息无误', type: 'success' })
  }
  if (current.value.status !== '正常') {
    steps.push({ time: '', action: '状态变更', user: '属地监管部门', opinion: `${current.value.status}（演示留痕）`, type: 'warning' })
  }
  return steps
})

const load = async () => {
  const [subjects, confirms] = await Promise.all([fetchPesSubjects(userStore.role), fetchConfirms(userStore.role)])
  list.value = subjects
  const un = new Set()
  subjects.forEach((s) => { if (!confirms.some((c) => c.subjectId === s.id && c.status === '已确认')) un.add(s.id) })
  // 仅企业/监管演示口径：使用主体演示数据未全部建确认记录，与 PES_UNCONFIRMED_SUBJECTS 保持一致
  unconfirmedSet.value = un
}

const openDetail = (row) => { current.value = row; detailVisible.value = true }

const openCreate = () => {
  Object.assign(createForm, { name: '', type: '', legal: '', license: '', regionCode: '', status: '正常' })
  createVisible.value = true
}

const submitCreate = () => {
  createFormRef.value?.validate((ok) => {
    if (!ok) return
    if (createForm.status === '注销') {
      ElMessage.warning('注销为软删除：档案保留、停止业务流转（演示提示）')
    }
    PES_SUBJECTS.push({ id: `PES-N-${String(PES_SUBJECTS.length + 1).padStart(4, '0')}`, ...createForm, address: '安徽省（演示新增）', center: [117.2, 32.1] })
    ElMessage.success('主体已新增（演示内存）')
    createVisible.value = false
    load()
  })
}

onMounted(load)
</script>

<style lang="scss" scoped>
.filter-bar { margin-bottom: 4px; }
.drawer-sub-title { margin: 18px 0 10px; font-size: 14px; color: var(--ah-text); }
</style>
