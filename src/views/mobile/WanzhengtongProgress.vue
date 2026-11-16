<template>
  <div class="mobile-page">
    <div class="mobile-head">
      <button class="back-button" @click="$router.back()">‹</button>
      <div><b>进度上报</b><span>{{ isTown ? '查看辖区数据，并可向县级上报' : isCounty ? '按县级上报计划填报并向市级上报' : '查看皖企通种植主体自报的播种与收获进度' }}</span></div>
    </div>

    <div class="filters">
      <label>年份</label>
      <select v-model="year">
        <option v-for="item in years" :key="item" :value="item">{{ item }}年</option>
      </select>
      <label>周期</label>
      <select v-model="quarter">
        <option v-for="item in quarters" :key="item" :value="item">{{ item }}</option>
      </select>
    </div>

    <div class="tabs">
      <button :class="{ active: type === 'sow' }" @click="type = 'sow'">播种进度</button>
      <button :class="{ active: type === 'harvest' }" @click="type = 'harvest'">收获进度</button>
    </div>

    <!-- 乡镇角色：向县级上报 -->
    <section v-if="isTown || isCounty" class="report-action-card">
      <div class="summary-head">
        <b>{{ isTown ? '向县级' : '向市级' }}上报 {{ year }}年{{ quarter }}{{ type === 'sow' ? '播种' : '收获' }}进度</b>
        <el-tag size="small" type="warning">{{ myOrderStatus }}</el-tag>
      </div>
      <div class="summary-number"><strong>{{ summary.reportedArea.toFixed(1) }}</strong><span> / {{ summary.planArea.toFixed(1) }} 亩</span></div>
      <el-progress :percentage="summary.progress" :show-text="false" />
      <p class="report-hint">{{ isCounty ? '县级按已审核通过的县级上报计划填报；乡镇和主体数据有则查看，无则不影响县级上报。' : '乡镇上报为可选数据，提交后由县级审核。' }}</p>
      <button class="report-button" @click="submit">{{ isTown ? '向县级上报' : '向市级上报' }}</button>
      <div v-if="myOrderOpinion" class="audit-opinion">审核意见：{{ myOrderOpinion }}</div>
    </section>

    <!-- 县级角色：待审核的乡镇上报单 -->
    <section v-if="isCounty" class="audit-card">
      <div class="summary-head"><b>待审核的乡镇上报单</b><el-tag size="small" type="info">{{ auditOrders.length }} 张</el-tag></div>
      <div v-for="order in auditOrders" :key="order.id" class="audit-item">
        <div class="audit-item-head">
          <b>{{ order.regionName }}</b>
          <el-tag size="small" :type="orderStatusType(order.status)">{{ order.status }}</el-tag>
        </div>
        <p>{{ order.quarter }} · 计划 {{ order.summary.planArea.toFixed(1) }} 亩 · {{ type === 'sow' ? '已播' : '已收获' }} {{ order.summary.doneArea.toFixed(1) }} 亩（{{ order.summary.progress }}%）</p>
        <div v-if="order.canAudit" class="audit-actions">
          <button class="pass" @click="audit(order, true)">通过</button>
          <button class="reject" @click="audit(order, false)">驳回</button>
        </div>
      </div>
      <el-empty v-if="!auditOrders.length" description="暂无乡镇上报单" :image-size="60" />
    </section>

    <section class="summary-card">
      <div class="summary-head">
        <b>{{ type === 'sow' ? '播种' : '收获' }}进度汇总</b>
        <el-tag size="small" :type="type === 'sow' ? 'warning' : 'success'">本级及可选下级数据</el-tag>
      </div>
      <div class="summary-number"><strong>{{ summary.reportedArea.toFixed(1) }}</strong><span> / {{ summary.planArea.toFixed(1) }} 亩</span></div>
      <el-progress :percentage="summary.progress" :status="type === 'harvest' ? 'success' : undefined" :show-text="false" />
      <div class="summary-foot"><span>已上报面积 / 计划面积</span><b>{{ summary.progress }}%</b></div>
    </section>

    <section v-for="item in visibleRows" :key="item.id" class="progress-card">
      <div class="card-top"><el-tag size="small" type="info">上报数据</el-tag><span>{{ item.updatedAt || '待更新' }}</span></div>
      <b>{{ item.subjectName || '种植主体' }}</b>
      <p>{{ item.planName }} · {{ item.cropName || item.crop }} · {{ item.regionName }}</p>
      <div class="data-line"><span>计划面积 {{ Number(item.planArea || 0).toFixed(1) }} 亩</span><strong>{{ Number(item.reportedArea || 0).toFixed(1) }} 亩</strong></div>
      <div class="report-source">数据来源：本级正式上报数据；乡镇和主体数据仅作参考</div>
    </section>
    <el-empty v-if="!visibleRows.length" :description="`暂无${type === 'sow' ? '播种' : '收获'}进度上报数据`" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchProgressReportRows, fetchProgressReportOrders, submitProgressReport, auditProgressReport } from '@/api/gpm'

const userStore = useUserStore()
const type = ref('sow')
const year = ref(2026)
const quarter = ref('第三季度')
const years = [2026, 2025, 2024]
const quarters = ['全年', '第一季度', '第二季度', '第三季度', '第四季度']
const rows = ref([])
const orders = ref([])

const roleCode = computed(() => userStore.role?.code || '')
const isTown = computed(() => roleCode.value === 'town')
const isCounty = computed(() => roleCode.value === 'county')
const orderStatusType = (status) => ({ 待审核: 'warning', 审核通过: 'success', 已驳回: 'danger' }[status] || 'info')

const quarterMatch = (item) => quarter.value === '全年' || item.quarter === quarter.value
const scopedRows = computed(() => rows.value.filter((item) => Number(item.year) === Number(year.value) && quarterMatch(item)))
const visibleRows = computed(() => scopedRows.value.filter(item => item.level === 'subject' && item.subjectId).map(item => ({
  ...item,
  status: item.status || '待审核',
  reportedArea: type.value === 'sow' ? Number(item.sownArea || 0) : Number(item.harvestedArea || 0)
})))
const summary = computed(() => {
  const planArea = scopedRows.value.reduce((sum, item) => sum + Number(item.planArea || 0), 0)
  const reportedArea = scopedRows.value.reduce((sum, item) => sum + Number((type.value === 'sow' ? item.sownArea : item.harvestedArea) || 0), 0)
  return { planArea, reportedArea, progress: planArea ? Number(Math.min(100, reportedArea / planArea * 100).toFixed(1)) : 0 }
})

const myOrder = computed(() => orders.value.find((item) => item.regionCode === userStore.role?.regionCode && item.level === roleCode.value))
const myOrderStatus = computed(() => myOrder.value?.status || '未上报')
const myOrderOpinion = computed(() => myOrder.value?.auditOpinion || '')
const auditOrders = computed(() => orders.value.filter((item) => item.level === 'town'))

const load = async () => {
  rows.value = await fetchProgressReportRows(userStore.role, { type: type.value, year: year.value })
  orders.value = await fetchProgressReportOrders(userStore.role, { type: type.value, year: year.value, quarter: quarter.value })
}

const submit = async () => {
  try {
  const targetName = isTown.value ? '县级' : '市级'
  await ElMessageBox.confirm(`确认将 ${year.value}年${quarter.value} ${type.value === 'sow' ? '播种' : '收获'}进度向${targetName}上报吗？`, '上报确认', { type: 'warning' })
  } catch { return }
  const result = await submitProgressReport(userStore.role, { type: type.value, year: year.value, quarter: quarter.value })
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success(`已向${targetName}上报，等待审核`)
  await load()
}

const audit = async (order, approved) => {
  let opinion = ''
  try {
    if (approved) {
      await ElMessageBox.confirm(`确认通过「${order.regionName}」的上报单吗？`, '审核确认', { type: 'warning' })
    } else {
      const input = await ElMessageBox.prompt('请填写驳回意见（必填）', '驳回原因', { inputType: 'textarea', inputValidator: (v) => (v && v.trim() ? true : '驳回意见不能为空') })
      opinion = input.value
    }
  } catch { return }
  const result = await auditProgressReport(order.id, { approved, opinion }, userStore.role)
  if (!result.success) return ElMessage.error(result.message)
  ElMessage.success(approved ? '已审核通过' : '已驳回')
  await load()
}

watch([type, year, quarter], load)
onMounted(load)
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.summary-card,.progress-card,.report-action-card,.audit-card{background:#fff;border-radius:12px;padding:14px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;gap:8px;color:#1f3c68}.mobile-head b{display:block;font-size:19px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;padding:0 8px 4px 0}.filters{display:flex;align-items:center;gap:8px;background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:12px;color:#667085;font-size:13px}.filters select{flex:1;border:1px solid #d9e2ec;border-radius:8px;background:#fff;padding:7px 10px;color:#243b5a}.tabs{display:flex;gap:8px;margin-bottom:12px}.tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:8px;padding:9px;color:#667085}.tabs button.active{background:#eaf6f1;border-color:#2d8c72;color:#176b58;font-weight:600}.summary-card{background:linear-gradient(135deg,#eaf6f1,#f8fbfa);border:1px solid #d6eee5}.summary-head,.summary-foot,.card-top,.data-line,.audit-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.summary-head{color:#176b58}.summary-number{margin:14px 0 10px;color:#667085}.summary-number strong{font-size:30px;color:#176b58}.summary-number span{font-size:14px}.summary-foot{font-size:12px;color:#667085;margin-top:8px}.summary-foot b{color:#176b58;font-size:16px}.card-top{color:#98a2b3;font-size:11px}.progress-card>b{display:block;color:#243b5a;font-size:15px;margin:11px 0 5px}.progress-card p{font-size:12px;color:#667085;margin:0 0 12px}.data-line{padding:10px;background:#f4f8fb;border-radius:8px;color:#667085;font-size:12px}.data-line strong{font-size:16px;color:#176b58}.report-source{color:#98a2b3;font-size:11px;margin-top:9px}.report-action-card{border:1px solid #f3d9a4;background:linear-gradient(135deg,#fff9ec,#fffcf5)}.report-action-card .summary-head{color:#8a5b00}.report-hint{color:#98a2b3;font-size:11px;margin:10px 0}.report-button{width:100%;border:0;border-radius:10px;padding:12px;background:linear-gradient(135deg,#2d8c72,#1f7a5f);color:#fff;font-size:15px;font-weight:600}.audit-opinion{margin-top:10px;padding:9px 11px;border-radius:8px;background:#fdf1f0;color:#b03a3a;font-size:12px}.audit-card{border:1px solid #e3ecf5}.audit-card .summary-head{color:#1f3c68}.audit-item{padding:12px;border:1px solid #e8eef5;border-radius:10px;margin-top:10px}.audit-item p{font-size:12px;color:#667085;margin:8px 0}.audit-actions{display:flex;gap:8px}.audit-actions button{flex:1;border:0;border-radius:8px;padding:9px;font-size:13px;font-weight:600}.audit-actions .pass{background:#eaf6f1;color:#176b58}.audit-actions .reject{background:#fdf1f0;color:#b03a3a}
</style>
