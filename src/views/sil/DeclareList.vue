<template>
  <div class="page-container ordinary-list">
    <header class="page-head">
      <div><h2>青贮饲料作物收储申报</h2><p>种植计划、收储主体和地块收储信息一次申报，统一审核备案。</p></div>
      <el-button v-if="canSubmitOrdinary(userStore.role)" type="primary" @click="router.push('/sil/storage')">新增收储申报</el-button>
    </header>
    <section class="panel">
      <el-form :inline="true" class="filters" @submit.prevent="load">
        <el-form-item label="关键词"><el-input v-model="filters.keyword" clearable placeholder="申报编号、收储主体、申报单位" @keyup.enter="load" /></el-form-item>
        <el-form-item label="年度"><el-select v-model="filters.year" clearable placeholder="全部年度" style="width:125px"><el-option v-for="year in years" :key="year" :label="`${year}年`" :value="year" /></el-select></el-form-item>
        <el-form-item label="申报状态"><el-select v-model="filters.status" clearable placeholder="全部状态" style="width:135px"><el-option v-for="(label, value) in statusLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        <el-button type="primary" :loading="loading" @click="load">查询</el-button><el-button @click="resetFilters">重置</el-button>
      </el-form>
      <div class="summary-grid">
        <div><span>申报记录</span><strong>{{ rows.length }}</strong><small>份</small></div>
        <div><span>申报面积</span><strong>{{ totalArea.toFixed(1) }}</strong><small>亩</small></div>
        <div><span>预计产量</span><strong>{{ totalYield.toFixed(1) }}</strong><small>吨</small></div>
        <div><span>已备案</span><strong>{{ rows.filter(row => row.status === 'filed').length }}</strong><small>份</small></div>
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="load-error"><template #default><el-button size="small" @click="load">重新加载</el-button></template></el-alert>
      <el-table v-loading="loading" :data="rows" stripe border class="application-table">
        <el-table-column prop="id" label="申报编号" min-width="195" show-overflow-tooltip />
        <el-table-column prop="storageSubjectName" label="收储主体" min-width="210" show-overflow-tooltip />
        <el-table-column label="申报单位 / 操作人" min-width="210"><template #default="{ row }"><span class="cell-main">{{ row.applicant?.unit || '—' }}</span><small class="cell-sub">{{ row.applicant?.name || row.applicantContact || '—' }}</small></template></el-table-column>
        <el-table-column prop="year" label="年度" width="85" />
        <el-table-column label="地块数" width="90" align="right"><template #default="{ row }">{{ row.plotDetails?.length || 0 }}</template></el-table-column>
        <el-table-column label="申报面积（亩）" width="135" align="right"><template #default="{ row }">{{ areaOf(row).toFixed(1) }}</template></el-table-column>
        <el-table-column label="预计产量（吨）" width="135" align="right"><template #default="{ row }">{{ yieldOf(row).toFixed(1) }}</template></el-table-column>
        <el-table-column label="预计收储重量（吨）" width="160" align="right"><template #default="{ row }">{{ row.weight === null || row.weight === undefined || row.weight === '' ? '未填' : Number(row.weight).toFixed(1) }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabels[row.status] || row.status }}</el-tag></template></el-table-column>
        <el-table-column label="提交时间" min-width="165"><template #default="{ row }">{{ row.submittedAt || '尚未提交' }}</template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">查看详情</el-button><el-button v-if="canEdit(row)" link type="primary" @click="edit(row)">{{ row.status === 'returned' ? '补正重提' : '继续填写' }}</el-button></template></el-table-column>
        <template #empty><el-empty :description="loading ? '正在加载申报记录' : '暂无匹配的收储申报'" /></template>
      </el-table>
    </section>
    <el-dialog v-model="detailVisible" title="青贮饲料作物收储申报详情" width="min(1180px, 96vw)" destroy-on-close class="ordinary-dialog">
      <div class="detail-scroll"><OrdinaryDetail v-if="current" :application="current" /></div>
      <template #footer><el-button @click="detailVisible = false">关闭</el-button><el-button v-if="current && canEdit(current)" type="primary" @click="edit(current)">{{ current.status === 'returned' ? '补正重提' : '继续填写' }}</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchOrdinaryApplications, canSubmitOrdinary } from '@/api/silOrdinary'
import { useUserStore } from '@/stores/user'
import OrdinaryDetail from '@/components/sil/OrdinaryDetail.vue'
const userStore = useUserStore()
const router = useRouter(), route = useRoute()
const sourceRows = ref([])
const loading = ref(false)
const error = ref('')
const detailVisible = ref(false)
const current = ref(null)
const filters = reactive({ keyword: '', year: '', status: '' })
const statusLabels = { draft: '草稿', pending: '待审核', returned: '退回补正', rejected: '已驳回', filed: '已备案' }
const statusType = status => ({ draft: 'info', pending: 'warning', returned: 'warning', rejected: 'danger', filed: 'success' }[status] || 'info')
const years = computed(() => [...new Set(sourceRows.value.map(row => Number(row.year)).filter(Boolean))].sort((a, b) => b - a))
const rows = computed(() => sourceRows.value.filter(row => (!filters.year || Number(row.year) === Number(filters.year)) && (!filters.status || row.status === filters.status) && (!filters.keyword || `${row.id} ${row.storageSubjectName} ${row.applicant?.unit || ''} ${row.applicant?.name || ''} ${row.filedNo || ''}`.includes(filters.keyword.trim()))))
const areaOf = row => Number(row.area ?? (row.plotDetails || []).reduce((sum, plot) => sum + Number(plot.areaMu || 0), 0))
const yieldOf = row => Number(row.expectedYield ?? (row.plotDetails || []).reduce((sum, plot) => sum + Number(plot.expectedYield || 0), 0))
const totalArea = computed(() => rows.value.reduce((sum, row) => sum + areaOf(row), 0))
const totalYield = computed(() => rows.value.reduce((sum, row) => sum + yieldOf(row), 0))
const canEdit = row => canSubmitOrdinary(userStore.role) && ['draft', 'returned'].includes(row.status) && row.applicant?.code === userStore.role?.code && row.applicant?.name === userStore.role?.name
const load = async () => { loading.value = true; error.value = ''; try { sourceRows.value = await fetchOrdinaryApplications(userStore.role); if(route.query.id){const row=sourceRows.value.find(item=>item.id===route.query.id);if(row)openDetail(row);else error.value='该申报不存在或当前身份无权查看'} } catch { error.value = '申报记录加载失败，请重试。' } finally { loading.value = false } }
const resetFilters = () => { Object.assign(filters, { keyword: '', year: '', status: '' }); load() }
const openDetail = row => { current.value = row; detailVisible.value = true }
const edit = row => router.push({ path: '/sil/storage', query: { id: row.id } })
watch(()=>route.query.id,load)
watch(()=>userStore.role?.code,()=>{detailVisible.value=false;current.value=null;sourceRows.value=[];load()})
onMounted(load)
</script>
<style scoped lang="scss">
.ordinary-list{overflow:auto;min-width:0}.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.page-head h2{font-size:22px;color:var(--ah-text);margin:4px 0 8px}.page-head p{font-size:13px;color:var(--ah-text-secondary);margin:0}.filters{display:flex;align-items:flex-start;gap:0 12px;flex-wrap:wrap}.filters :deep(.el-form-item){margin-right:0;margin-bottom:12px}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:4px 0 18px}.summary-grid>div{padding:14px 18px;border:1px solid #e2eaf1;border-radius:8px;background:#f7fafc}.summary-grid span{display:block;font-size:13px;color:#718096;margin-bottom:6px}.summary-grid strong{color:#176d62;font-size:25px}.summary-grid small{margin-left:7px;color:#718096}.cell-main{display:block;line-height:1.5}.cell-sub{display:block;color:#8b95a5;margin-top:4px}.load-error{margin-bottom:12px}.application-table{width:100%}.detail-scroll{max-height:calc(80vh - 130px);overflow:auto}@media(max-width:800px){.page-head{flex-wrap:wrap}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.filters :deep(.el-form-item){width:100%}.filters :deep(.el-form-item__content){flex:1;min-width:0}}
</style>
