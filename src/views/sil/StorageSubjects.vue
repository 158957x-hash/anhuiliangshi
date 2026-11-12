<template>
  <div class="page-container storage-subjects">
    <header class="page-head"><div><h2>收储主体维护</h2><p>维护实际参与青贮收储的养殖户、养殖企业及第三方收储机构，与种植主体档案分别管理。</p></div><el-button v-if="canManage" type="primary" @click="openEdit()">新增收储主体</el-button></header>
    <section class="panel">
      <el-form :inline="true" class="filters" @submit.prevent="load">
        <el-form-item label="关键词"><el-input v-model="filters.keyword" placeholder="名称、编号、负责人" clearable @keyup.enter="load" /></el-form-item>
        <el-form-item label="主体类型"><el-select v-model="filters.type" clearable placeholder="全部类型" style="width:165px"><el-option v-for="(label,value) in typeLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        <el-form-item label="业务状态"><el-select v-model="filters.status" clearable placeholder="全部状态" style="width:120px"><el-option label="启用" value="启用" /><el-option label="停用" value="停用" /></el-select></el-form-item>
        <el-button type="primary" :loading="loading" @click="load">查询</el-button><el-button @click="resetFilters">重置</el-button>
      </el-form>
      <el-alert v-if="loadError" type="error" :closable="false" :title="loadError" show-icon />
      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="id" label="收储主体编号" min-width="155" show-overflow-tooltip />
        <el-table-column prop="name" label="收储主体名称" min-width="225" show-overflow-tooltip />
        <el-table-column label="主体类型" width="150"><template #default="{ row }">{{ typeLabels[row.type] || row.type }}</template></el-table-column>
        <el-table-column prop="owner" label="负责人" width="110" />
        <el-table-column prop="phone" label="联系方式" width="145" />
        <el-table-column label="所属区域" min-width="150"><template #default="{ row }">{{ row.regionName || row.regionCode || '—' }}</template></el-table-column>
        <el-table-column prop="address" label="详细地址" min-width="190" show-overflow-tooltip />
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === '停用' ? 'info' : 'success'" size="small">{{ row.status || '启用' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="125" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button><el-button v-if="canEditSubject(row)" link type="primary" @click="openEdit(row)">编辑</el-button></template></el-table-column>
        <template #empty><el-empty description="暂无匹配的收储主体" /></template>
      </el-table>
    </section>
    <el-dialog v-model="editVisible" :title="form.id ? '编辑收储主体' : '新增收储主体'" width="min(760px, 96vw)" destroy-on-close>
      <div class="dialog-scroll"><el-form :model="form" label-position="top" class="subject-form">
        <el-form-item label="主体名称" required><el-input v-model="form.name" maxlength="80" placeholder="请输入收储主体名称" /></el-form-item>
        <el-form-item label="主体类型" required><el-select v-model="form.type"><el-option v-for="(label,value) in typeLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        <el-form-item label="负责人" required><el-input v-model="form.owner" maxlength="30" /></el-form-item>
        <el-form-item label="联系方式" required><el-input v-model="form.phone" maxlength="30" /></el-form-item>
        <el-form-item label="所属区域名称" required><el-input v-model="form.regionName" placeholder="例如：阜阳市太和县" /></el-form-item>
        <el-form-item label="行政区划代码" required><el-input v-model="form.regionCode" placeholder="例如：341222" /></el-form-item>
        <el-form-item :label="form.type === 'livestock_household' ? '证件信息（选填）' : '统一社会信用代码（选填）'"><el-input v-model="form.credential" maxlength="30" /></el-form-item>
        <el-form-item label="业务状态"><el-select v-model="form.status"><el-option label="启用" value="启用" /><el-option label="停用" value="停用" /></el-select></el-form-item>
        <el-form-item label="详细地址" required class="full-width"><el-input v-model="form.address" type="textarea" :rows="2" maxlength="200" /></el-form-item>
      </el-form></div>
      <template #footer><el-button @click="editVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="detailVisible" title="收储主体档案" width="min(700px, 96vw)">
      <el-descriptions v-if="current" :column="1" border class="subject-detail"><el-descriptions-item label="主体编号">{{ current.id }}</el-descriptions-item><el-descriptions-item label="主体名称">{{ current.name }}</el-descriptions-item><el-descriptions-item label="主体类型">{{ typeLabels[current.type] || current.type }}</el-descriptions-item><el-descriptions-item label="负责人">{{ current.owner }}</el-descriptions-item><el-descriptions-item label="联系方式">{{ current.phone }}</el-descriptions-item><el-descriptions-item label="所属区域">{{ current.regionName || current.regionCode }}</el-descriptions-item><el-descriptions-item label="行政区划代码">{{ current.regionCode || '—' }}</el-descriptions-item><el-descriptions-item label="详细地址">{{ current.address || '未填' }}</el-descriptions-item><el-descriptions-item label="证件/信用代码">{{ current.credential || '未填' }}</el-descriptions-item><el-descriptions-item label="状态">{{ current.status || '启用' }}</el-descriptions-item><el-descriptions-item label="创建时间">{{ current.createdAt || '—' }}</el-descriptions-item><el-descriptions-item label="更新时间">{{ current.updatedAt || current.createdAt || '—' }}</el-descriptions-item></el-descriptions>
      <template #footer><el-button @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchStorageSubjects, saveStorageSubject, canManageStorageSubjects } from '@/api/silOrdinary'
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()
const typeLabels = { livestock_household: '养殖户', livestock_enterprise: '养殖企业', third_party: '第三方收储机构' }
const canManage = computed(() => canManageStorageSubjects(userStore.role))
const canEditSubject = row => canManage.value && (userStore.role?.code !== 'county' || String(row.regionCode || '').startsWith(String(userStore.role.regionCode)))
const sourceRows = ref([])
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const editVisible = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const filters = reactive({ keyword: '', type: '', status: '' })
const emptyForm = () => ({ id: '', name: '', type: 'livestock_enterprise', owner: '', phone: '', regionCode: userStore.role?.regionCode || '', regionName: userStore.role?.regionName || '', address: '', credential: '', status: '启用' })
const form = reactive(emptyForm())
const rows = computed(() => sourceRows.value.filter(row => (!filters.keyword || `${row.id} ${row.name} ${row.owner}`.includes(filters.keyword.trim())) && (!filters.type || row.type === filters.type) && (!filters.status || (row.status || '启用') === filters.status)))
const load = async () => { loading.value = true; loadError.value = ''; try { sourceRows.value = await fetchStorageSubjects(userStore.role) } catch { loadError.value = '收储主体加载失败，请重新查询。' } finally { loading.value = false } }
const resetFilters = () => { Object.assign(filters, { keyword: '', type: '', status: '' }); load() }
const openDetail = row => { current.value = row; detailVisible.value = true }
const openEdit = row => { if (!canManage.value || (row && !canEditSubject(row))) return; Object.assign(form, emptyForm(), row || {}); editVisible.value = true }
const save = async () => {
  if (!canManage.value) return ElMessage.warning('当前身份无权维护收储主体')
  if (![form.name, form.type, form.owner, form.phone, form.regionCode, form.regionName, form.address].every(value => String(value || '').trim())) return ElMessage.warning('请填写名称、类型、负责人、联系方式、所属区域和详细地址')
  saving.value = true
  try { const result = await saveStorageSubject({ ...form }, userStore.role); if (!result.success) return ElMessage.error(result.message || '保存失败'); ElMessage.success('收储主体档案已保存'); editVisible.value = false; await load() } catch { ElMessage.error('保存失败，请重试') } finally { saving.value = false }
}
onMounted(load)
</script>
<style scoped lang="scss">
.storage-subjects{overflow:auto;min-width:0}.page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}.page-head h2{margin:4px 0 8px;font-size:22px;color:var(--ah-text)}.page-head p{font-size:13px;color:var(--ah-text-secondary);margin:0;line-height:1.7}.pending-alert{margin-bottom:16px}.filters{display:flex;gap:0 12px;flex-wrap:wrap;align-items:flex-start}.filters :deep(.el-form-item){margin:0 0 12px}.subject-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px}.subject-form .full-width{grid-column:1/-1}.subject-form :deep(.el-select){width:100%}.dialog-scroll{max-height:65vh;overflow:auto;padding-right:4px}.subject-detail{max-height:65vh;overflow:auto}.subject-detail :deep(.el-descriptions__content){word-break:break-word}@media(max-width:650px){.page-head{flex-wrap:wrap}.subject-form{grid-template-columns:minmax(0,1fr)}.filters :deep(.el-form-item){width:100%}.filters :deep(.el-form-item__content){flex:1;min-width:0}}
</style>
