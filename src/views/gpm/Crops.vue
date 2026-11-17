<template>
  <div class="page-container crop-page">
    <div class="page-head"><div><h2>作物维护</h2><p>维护粮食计划可选的作物基本信息，停用后不再出现在新计划选择项中。</p></div><el-button type="primary" @click="openCreate">新增作物</el-button></div>
    <div class="panel">
      <el-form :inline="true" class="filters"><el-form-item label="关键词"><el-input v-model="filters.keyword" clearable placeholder="作物编码或名称" @keyup.enter="load" /></el-form-item><el-form-item label="状态"><el-select v-model="filters.enabled" clearable placeholder="全部状态" style="width:130px"><el-option label="启用" :value="true"/><el-option label="停用" :value="false"/></el-select></el-form-item><el-button type="primary" @click="load">查询</el-button><el-button @click="reset">重置</el-button></el-form>
      <el-table :data="rows" border stripe><el-table-column prop="code" label="作物编码" width="160"/><el-table-column prop="name" label="作物名称" width="160"/><el-table-column prop="category" label="作物类别" width="150"/><el-table-column prop="unit" label="计量单位" width="110"/><el-table-column prop="sort" label="排序号" width="100"/><el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column><el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip/><el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openEdit(row)">编辑</el-button><el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggle(row)">{{ row.enabled ? '停用' : '启用' }}</el-button></template></el-table-column></el-table><el-empty v-if="!rows.length" description="暂无作物"/>
    </div>
    <el-dialog v-model="visible" :title="form.id ? '编辑作物' : '新增作物'" width="520px"><el-form :model="form" label-width="90px"><el-form-item label="作物编码" required><el-input v-model="form.code" :disabled="!!form.id"/></el-form-item><el-form-item label="作物名称" required><el-input v-model="form.name"/></el-form-item><el-form-item label="作物类别" required><el-input v-model="form.category"/></el-form-item><el-form-item label="计量单位" required><el-input v-model="form.unit"/></el-form-item><el-form-item label="排序号"><el-input-number v-model="form.sort" :min="1"/></el-form-item><el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3"/></el-form-item></el-form><template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template></el-dialog>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchCrops, saveCrop, toggleCrop } from '@/api/gpm'
const rows = ref([]); const visible = ref(false); const filters = reactive({ keyword: '', enabled: null }); const form = reactive({ id: '', code: '', name: '', category: '粮食作物', unit: '亩', sort: 1, remark: '', enabled: true })
const load = async () => { rows.value = await fetchCrops(filters) }
const reset = () => { Object.assign(filters, { keyword: '', enabled: null }); load() }
const openCreate = () => { Object.assign(form, { id: '', code: '', name: '', category: '粮食作物', unit: '亩', sort: 1, remark: '', enabled: true }); visible.value = true }
const openEdit = (row) => { Object.assign(form, row); visible.value = true }
const save = async () => { const result = await saveCrop({ ...form }); if (!result.success) return ElMessage.warning(result.message); visible.value = false; ElMessage.success('作物已保存'); load() }
const toggle = async (row) => { const result = await toggleCrop(row.id); if (!result.success) return ElMessage.error(result.message); ElMessage.success(result.item.enabled ? '作物已启用' : '作物已停用'); load() }
onMounted(load)
</script>
<style scoped lang="scss">.crop-page{overflow:auto}.page-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}.page-head h2{margin:4px 0 5px}.page-head p{color:var(--ah-text-secondary);font-size:13px}.filters{display:flex;align-items:center;flex-wrap:nowrap}.filters :deep(.el-form-item){margin-bottom:12px;margin-right:12px}</style>
