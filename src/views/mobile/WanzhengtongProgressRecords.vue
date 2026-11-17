<template>
  <div class="records-page">
    <section class="head-card"><div><b>上报记录</b><span>查看本级播种、收获进度上报状态</span></div><el-button link type="primary" @click="$emit('go-entry')">去填写</el-button></section>
    <div class="type-tabs"><button :class="{active: type === 'sow'}" @click="type = 'sow'">播种</button><button :class="{active: type === 'harvest'}" @click="type = 'harvest'">收获</button></div>

    <section class="record-section">
      <div class="section-title"><b>本级上报</b><el-tag size="small" type="info">{{ ownOrders.length }} 条</el-tag></div>
      <div v-for="item in ownOrders" :key="item.id" class="record-card">
        <div class="record-main"><b>{{ item.year }}年{{ item.quarter }}{{ type === 'sow' ? '播种' : '收获' }}</b><el-tag size="small" :type="statusType(item.status)">{{ item.status }}</el-tag></div>
        <p>{{ item.planName || `${item.year}年${item.quarter}本级上报计划` }}</p>
        <div class="record-data"><span>计划 {{ Number(item.summary?.planArea || 0).toLocaleString() }} 亩</span><strong>{{ type === 'sow' ? '累计已播' : '累计已收获' }} {{ Number(item.summary?.doneArea || 0).toLocaleString() }} 亩</strong></div>
        <small>本次新增 {{ Number(item.incrementArea || item.summary?.incrementArea || 0).toLocaleString() }} 亩 · {{ item.updatedAt || item.reportedAt || '尚未填报' }}</small><small>上报至{{ item.auditLevelName || '本级留痕' }} · {{ item.reportedAt || '尚未上报' }}</small>
        <div class="record-actions"><el-button v-if="item.status === '已驳回'" link type="primary" @click="resubmit(item)">重提</el-button><el-button link type="primary" @click="showDetail(item)">详情</el-button></div>
      </div>
      <el-empty v-if="!ownOrders.length" description="暂无本级上报记录" :image-size="60" />
    </section>

    <section v-if="savedRows.length" class="record-section saved-section">
      <div class="section-title"><b>已保存待上报</b><el-tag size="small" type="warning">{{ savedRows.length }} 条</el-tag></div>
      <div v-for="item in savedRows" :key="item.id" class="saved-card"><div><b>{{ item.planName }}</b><p>{{ item.cropName || item.crop }} · 计划 {{ Number(item.planArea || 0).toLocaleString() }} 亩</p></div><span>{{ type === 'sow' ? Number(item.sownArea || 0) : Number(item.harvestedArea || 0) }} 亩</span><el-button link type="primary" @click="submitSaved(item)">上报</el-button></div>
      <p class="saved-tip">请返回“去填写”修改数据，保存后再上报。</p>
    </section>

    <section v-if="isCounty" class="record-section">
      <div class="section-title"><b>待审核乡镇上报</b><el-tag size="small" type="warning">{{ auditOrders.length }} 条</el-tag></div>
      <div v-for="item in auditOrders" :key="item.id" class="record-card">
        <div class="record-main"><b>{{ item.regionName }}</b><el-tag size="small" type="warning">待审核</el-tag></div>
        <p>{{ item.year }}年{{ item.quarter }}{{ type === 'sow' ? '播种' : '收获' }} · {{ Number(item.summary?.doneArea || 0).toLocaleString() }} 亩</p>
        <div class="record-actions"><el-button link type="success" @click="audit(item, true)">通过</el-button><el-button link type="danger" @click="audit(item, false)">退回</el-button></div>
      </div>
      <el-empty v-if="!auditOrders.length" description="暂无待审核乡镇上报" :image-size="50" />
    </section>

    <el-dialog v-model="detailVisible" title="上报详情" width="92%"><template v-if="current"><el-descriptions :column="1" border><el-descriptions-item label="周期">{{ current.year }}年{{ current.quarter }}</el-descriptions-item><el-descriptions-item label="类型">{{ type === 'sow' ? '播种进度' : '收获进度' }}</el-descriptions-item><el-descriptions-item label="状态"><el-tag size="small" :type="statusType(current.status)">{{ current.status }}</el-tag></el-descriptions-item><el-descriptions-item label="汇总">计划 {{ current.summary?.planArea || 0 }} 亩，累计完成 {{ current.summary?.doneArea || 0 }} 亩</el-descriptions-item><el-descriptions-item label="本次新增">{{ current.incrementArea || current.summary?.incrementArea || 0 }} 亩</el-descriptions-item><el-descriptions-item label="填报时间">{{ current.updatedAt || current.reportedAt || '—' }}</el-descriptions-item><el-descriptions-item label="上报时间">{{ current.reportedAt || '—' }}</el-descriptions-item><el-descriptions-item label="审核意见">{{ current.auditOpinion || '—' }}</el-descriptions-item></el-descriptions></template><template #footer><el-button @click="detailVisible = false">关闭</el-button></template></el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchProgressReportOrders, fetchProgressReportRows, submitProgressReport, auditProgressReport } from '@/api/gpm'

defineEmits(['go-entry'])
const userStore = useUserStore()
const type = ref('sow')
const orders = ref([])
const rows = ref([])
const detailVisible = ref(false)
const current = ref(null)
const isCounty = computed(() => userStore.role?.code === 'county')
const roleCode = computed(() => userStore.role?.code || '')
const ownOrders = computed(() => orders.value.filter(item => item.level === roleCode.value && item.regionCode === userStore.role?.regionCode))
const auditOrders = computed(() => orders.value.filter(item => item.level === 'town' && item.status === '待审核'))
const savedRows = computed(() => rows.value.filter(item => item.level === roleCode.value && item.isDraft))
const statusType = status => ({ 待审核: 'warning', 审核通过: 'success', 已驳回: 'danger' }[status] || 'info')
const load = async () => {
  orders.value = await fetchProgressReportOrders(userStore.role, { type: type.value, year: 2026, quarter: '第三季度' })
  rows.value = await fetchProgressReportRows(userStore.role, { type: type.value, year: 2026, quarter: '第三季度' })
}
const resubmit = async item => {
  const result = await submitProgressReport(userStore.role, { type: type.value, year: item.year, quarter: item.quarter, planId: item.planId })
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success('已重新上报')
  await load()
}
const submitSaved = async item => {
  const result = await submitProgressReport(userStore.role, { type: type.value, year: item.year, quarter: item.quarter, planId: item.planId })
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success('已上报')
  await load()
}
const showDetail = item => { current.value = item; detailVisible.value = true }
const audit = async (item, approved) => {
  let opinion = ''
  try {
    if (approved) await ElMessageBox.confirm(`确认通过${item.regionName}的上报吗？`, '审核确认')
    else opinion = (await ElMessageBox.prompt('请填写退回意见', '退回上报', { inputType: 'textarea' })).value
  } catch { return }
  const result = await auditProgressReport(item.id, { approved, opinion }, userStore.role)
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success(approved ? '已通过' : '已退回')
  await load()
}
watch(type, load)
onMounted(load)
</script>

<style lang="scss" scoped>
.records-page{padding:0 2px}.head-card,.record-section{background:#fff;border-radius:14px;padding:15px;margin-bottom:12px}.head-card{display:flex;align-items:center;justify-content:space-between}.head-card b{display:block;color:#243b5a;font-size:18px}.head-card span{display:block;color:#667085;font-size:12px;margin-top:4px}.type-tabs{display:flex;gap:8px;margin-bottom:12px}.type-tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:8px;padding:10px;color:#667085}.type-tabs button.active{border-color:#2d8c72;background:#eaf6f1;color:#176b58;font-weight:600}.section-title,.record-main,.record-data,.record-actions{display:flex;align-items:center;justify-content:space-between;gap:8px}.section-title{color:#243b5a;margin-bottom:8px}.record-card{position:relative;border-top:1px solid #edf0f5;padding:12px 0}.record-main b{color:#243b5a;font-size:14px}.record-card p{margin:7px 0;color:#667085;font-size:12px}.record-data{padding:9px;background:#f4f8fb;border-radius:8px;color:#667085;font-size:12px}.record-data strong{color:#176b58}.record-card small{display:block;color:#98a2b3;font-size:11px;margin-top:8px}.record-actions{justify-content:flex-end;margin-top:4px}.saved-card{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #edf0f5;padding:11px 0}.saved-card b{color:#243b5a;font-size:13px}.saved-card p{margin:4px 0 0;color:#667085;font-size:11px}.saved-card>span{color:#176b58;font-weight:600}.saved-tip{color:#98a2b3;font-size:11px;margin:8px 0 0}
</style>
