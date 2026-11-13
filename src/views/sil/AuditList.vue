<template>
  <div class="page-container audit-page"><header><div><h2>收储审核处理</h2><p>普通收储按整单审核；种植信息和收储信息一次备案。</p></div><el-button @click="load">刷新</el-button></header>
    <div class="panel"><el-tabs v-model="tab"><el-tab-pane label="青贮饲料作物收储申报" name="ordinary"/><el-tab-pane label="受灾作物补充收储上报" name="supplement"/></el-tabs>
      <el-alert v-if="tab === 'supplement'" title="受灾补充上报已引用三名专家会签结果，免再审核；本页只提供记录查看。" type="success" :closable="false" show-icon />
      <el-form inline class="filters"><el-form-item label="状态"><el-select v-model="status" style="width:150px" clearable><el-option v-for="(label,value) in labels" :key="value" :value="value" :label="label"/></el-select></el-form-item><el-form-item label="关键词"><el-input v-model="keyword" placeholder="收储主体、申报单位、编号" clearable/></el-form-item></el-form>
      <el-table :data="filtered" border><el-table-column prop="id" label="申报编号" min-width="185"/><el-table-column label="收储主体/受灾主体" min-width="210"><template #default="{row}">{{ row.storageSubjectName || row.subjectName }}</template></el-table-column><el-table-column label="申报单位" min-width="190"><template #default="{row}">{{ row.applicant?.unit || '—' }}</template></el-table-column><el-table-column label="面积（亩）" width="125"><template #default="{row}">{{ Number(row.area ?? row.supplementArea ?? 0).toFixed(1) }}</template></el-table-column><el-table-column label="发起时间" width="170"><template #default="{row}">{{ row.submittedAt || row.createdAt }}</template></el-table-column><el-table-column label="审核期限" min-width="180"><template #default="{row}">{{ tab === 'ordinary' ? ordinaryDeadline(row) || '未开始' : row.exemptAudit ? '免再审核' : '待专家确认' }}</template></el-table-column><el-table-column label="状态" width="110"><template #default="{row}"><el-tag>{{ labels[row.status] || row.status }}</el-tag></template></el-table-column><el-table-column label="操作" width="100" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open(row)">{{ canProcess(row) ? '审核处理' : '查看详情' }}</el-button></template></el-table-column></el-table>
    </div>
    <el-dialog v-model="visible" :title="tab === 'ordinary' ? '整单申报审核详情' : '受灾补充收储详情'" width="min(1100px, 95vw)" top="4vh" destroy-on-close>
      <OrdinaryDetail v-if="current && tab === 'ordinary'" :application="current"/>
      <template v-else-if="current"><el-descriptions :column="1" border><el-descriptions-item label="受灾主体">{{ current.subjectName }}</el-descriptions-item><el-descriptions-item label="受灾面积">{{ current.affectedArea ?? '未填写' }} 亩</el-descriptions-item><el-descriptions-item label="损失面积">{{ current.lostArea ?? '未填写' }} 亩</el-descriptions-item><el-descriptions-item label="补充收储面积">{{ current.area ?? '未填写' }} 亩</el-descriptions-item><el-descriptions-item label="预计收储重量">{{ current.estimatedWeight ?? '未填' }} 吨</el-descriptions-item></el-descriptions><el-alert v-if="current.exemptAudit" title="三名专家会签后免再审核；本页仅查看，不提供审核操作。" type="success" :closable="false"/><el-button v-if="current" type="primary" link @click="router.push({path:'/sil/supplement',query:{disasterId:current.id}})">查看完整上报、专家材料与围栏</el-button></template>
      <div v-if="canProcess(current)" class="opinion"><b>审核意见</b><el-input v-model="opinion" type="textarea" :rows="3" placeholder="退回或驳回请填写具体原因"/></div>
      <template #footer><el-button @click="visible=false">关闭</el-button><template v-if="canProcess(current)"><el-button :disabled="processing" type="warning" @click="audit('return')">退回补正</el-button><el-button :disabled="processing" type="danger" @click="audit('reject')">驳回</el-button><el-button :loading="processing" type="primary" @click="audit('pass')">通过并备案</el-button></template></template>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchOrdinaryApplications, auditOrdinaryApplication, canAuditOrdinary, ordinaryDeadline } from '@/api/silOrdinary'
import { fetchDisasterWorkspace } from '@/api/silDisaster'
import OrdinaryDetail from '@/components/sil/OrdinaryDetail.vue'
const router = useRouter(); const userStore = useUserStore(); const tab = ref('ordinary'); const status = ref('pending'); const keyword = ref(''); const rows = ref([]); const current = ref(null); const visible = ref(false); const opinion = ref(''); const processing = ref(false)
const labels = computed(() => tab.value === 'ordinary' ? { pending: '待审核', filed: '已备案', returned: '退回补正', rejected: '已驳回' } : { effective: '免审已生效' })
const filtered = computed(() => rows.value.filter(row => row.status !== 'draft' && (!status.value || row.status === status.value) && (!keyword.value || `${row.id} ${row.storageSubjectName || row.subjectName} ${row.applicant?.unit || ''}`.includes(keyword.value))))
const load = async () => {
  if (tab.value === 'ordinary') {
    rows.value = await fetchOrdinaryApplications(userStore.role)
    return
  }
  // 受灾补充上报在三名专家会签后免再审核；这里仅提供已生效记录的只读查看。
  const workspace = await fetchDisasterWorkspace(userStore.role)
  rows.value = workspace.reports.map(row => ({
    ...row,
    status: row.status || 'effective',
    submittedAt: row.createdAt,
    affectedArea: workspace.events.find(event => event.id === row.eventId)?.affectedArea,
    lostArea: workspace.events.find(event => event.id === row.eventId)?.lostArea,
  }))
}
const open = row => { current.value = row; opinion.value = ''; visible.value = true }
const canProcess = row => tab.value === 'ordinary' && !!row && row.status === 'pending' && !row.exemptAudit && canAuditOrdinary(userStore.role) && !(row.applicant?.name === userStore.role?.name && row.applicant?.unit === userStore.role?.unit)
const audit = async action => {
  if (!canProcess(current.value) || processing.value) return
  if (action !== 'pass' && !opinion.value.trim()) return ElMessage.warning('请填写退回或驳回原因')
  try { await ElMessageBox.confirm(`确认${action === 'pass' ? '通过整单申报并备案' : action === 'return' ? '退回补正' : '驳回该申报'}？`, '审核确认') } catch { return }
  processing.value = true
  try { const result = await auditOrdinaryApplication(current.value.id, action, opinion.value, userStore.role); if (!result.success) return ElMessage.error(result.message); ElMessage.success('审核结果已保存'); visible.value = false; await load() } catch { ElMessage.error('审核失败，请重试') } finally { processing.value = false }
}
watch(tab, () => { status.value = tab.value === 'ordinary' ? 'pending' : ''; visible.value = false; current.value = null; load() }); watch(() => userStore.role?.code, () => {visible.value=false;current.value=null;rows.value=[];load()}); onMounted(load)
</script>
<style scoped>.audit-page{overflow:auto;gap:16px}header{display:flex;justify-content:space-between;align-items:center}h2{font-size:22px;margin:0}header p{color:#667085;font-size:13px}.filters{display:flex;flex-wrap:wrap;gap:8px}.opinion{margin-top:22px}.opinion b{display:block;margin-bottom:10px}.audit-page :deep(.el-dialog__body){max-height:72vh;overflow:auto}.audit-page :deep(.el-dialog__footer){display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}</style>

