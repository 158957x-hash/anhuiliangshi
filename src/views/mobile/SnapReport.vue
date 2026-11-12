<template>
  <div class="mobile-page">
    <div class="mobile-head"><div><b>皖事通</b><span>随手拍·农情直报</span></div><el-tag size="small" type="success">直连省粮食安全综合监管系统</el-tag></div>
    <nav class="tab-nav">
      <button type="button" :class="{ active: tab === 'report' }" @click="tab = 'report'">随手拍</button>
      <button type="button" :class="{ active: tab === 'list' }" @click="tab = 'list'">我的上报{{ reports.length ? `（${reports.length}）` : '' }}</button>
    </nav>
    <div v-show="tab === 'report'" class="form-card">
      <h3>发现问题，随时上报</h3>
      <p class="confirm-note">实名/匿名举报两种方式并存（已确认）</p>
      <el-form label-position="top">
        <el-form-item label="举报身份">
          <div class="id-cards">
            <button type="button" :class="{ active: form.reporterType === 'anonymous' }" @click="form.reporterType = 'anonymous'"><b>匿名举报</b><span>不采集身份信息</span></button>
            <button type="button" :class="{ active: form.reporterType === 'realname' }" @click="form.reporterType = 'realname'"><b>实名举报</b><span>便于处理结果反馈</span></button>
          </div>
          <p v-if="form.reporterType === 'anonymous'" class="id-tip">匿名举报将不采集身份信息，处理结果不做定向反馈</p>
        </el-form-item>
        <template v-if="form.reporterType === 'realname'">
          <el-form-item label="姓名（必填）"><el-input v-model="form.reporterName" maxlength="20" placeholder="请填写真实姓名" /></el-form-item>
          <el-form-item label="联系电话（必填，11位）"><el-input v-model="form.reporterPhone" maxlength="11" placeholder="请填写11位手机号" /></el-form-item>
        </template>
        <el-form-item label="问题类型"><el-select v-model="form.type" style="width:100%"><el-option v-for="item in issueTypes" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="发生地点"><el-cascader v-model="form.region" :options="regionOptions" style="width:100%" /></el-form-item>
        <el-form-item label="关联地块（可不选）">
          <el-select v-model="form.plotId" clearable filterable style="width:100%" placeholder="可不选：由管理部门研判确认归属地块">
            <el-option v-for="plot in nearbyPlots" :key="plot.id" :label="`${plot.name}（${plot.areaMu}亩 · 距您约${plot.distance}米）`" :value="plot.id" />
            <el-option v-for="plot in localPlots" :key="plot.id" :label="`${plot.name}（${plot.areaMu}亩）`" :value="plot.id" />
          </el-select>
          <p class="id-tip">公众可不选地块：定位后自动识别附近地块供参考；未选择时线索由省级在图上研判归属地块</p>
        </el-form-item>
        <el-form-item label="现场定位"><div class="location"><el-input v-model="form.location" /><el-button @click="locate">重新定位</el-button></div><p class="id-tip" v-if="form.gps">拍照定位坐标：{{ form.gps.join(', ') }}（随线索上报，用于后台落图与地块套合研判，无需知道地块）</p></el-form-item>
        <el-form-item label="问题描述"><el-input v-model="form.description" type="textarea" :rows="4" maxlength="180" show-word-limit placeholder="请描述病虫害、干旱、洪涝等情况和影响范围" /></el-form-item>
        <el-form-item label="现场证据（拍照/录像）">
          <div class="evidence-actions"><el-button size="small" @click="addEvidence('photo')">拍照</el-button><el-button size="small" @click="addEvidence('video')">录像</el-button></div>
          <div v-for="(item, idx) in form.attachments" :key="item.name" class="evidence-row">
            <EvidenceThumbs :items="[item]" :size="56" />
            <el-button link type="danger" size="small" @click="removeEvidence(idx)">删除</el-button>
          </div>
          <p v-if="form.attachments.length" class="upload-state">上传状态：已上传</p>
          <p class="watermark-tip">证据自动添加“时间 + 位置”水印（演示记录）</p>
        </el-form-item>
      </el-form>
      <div class="actions"><el-button :disabled="submitting" @click="saveDraft">暂存草稿</el-button><el-button type="primary" :loading="submitting" @click="submit">提交农情直报</el-button></div>
    </div>
    <div v-show="tab === 'list'" class="list-card"><div class="list-title"><b>我的上报记录</b><span class="record-count">共 {{ reports.length }} 条</span></div><p class="list-tip">提交后线索进入省粮食安全综合监管系统统一研判流转，可在此跟踪处理状态（对应可研“我的上传”模块）</p><div v-for="item in reports" :key="item.id" class="report-item"><div class="report-top"><span>{{ item.time }}</span></div><b>{{ item.type }}</b><p>{{ item.regionName }} · {{ item.description }}</p><div class="report-bottom"><span>编号 {{ item.code || item.id }}</span><el-button link type="primary" @click="viewReport(item)">查看上报详情</el-button></div></div><el-empty v-if="!reports.length" description="暂无记录" /></div>
    <el-dialog v-model="detailVisible" title="农情直报详情" width="92%" class="scroll-dialog" align-center><template v-if="activeReport"><el-descriptions :column="1" border><el-descriptions-item label="问题类型">{{ activeReport.type }}</el-descriptions-item><el-descriptions-item label="所在地区">{{ activeReport.regionName }}</el-descriptions-item><el-descriptions-item label="关联地块">{{ plotText(activeReport) }}</el-descriptions-item><el-descriptions-item label="现场定位">{{ activeReport.location || '—' }}</el-descriptions-item><el-descriptions-item label="问题描述">{{ activeReport.description || '暂无描述' }}</el-descriptions-item><el-descriptions-item :label="`现场证据（${reportEvidence(activeReport).length} 项）`"><EvidenceThumbs v-if="reportEvidence(activeReport).length" :items="reportEvidence(activeReport)" :size="56" /><span v-else>未上传照片/视频</span></el-descriptions-item><el-descriptions-item label="举报身份">{{ activeReport.reporterType === 'realname' ? `实名（${activeReport.reporterName || '—'} · ${maskPhone(activeReport.reporterPhone)}）` : '匿名' }}</el-descriptions-item><el-descriptions-item label="上报时间">{{ activeReport.time || activeReport.foundTime || '—' }}</el-descriptions-item><el-descriptions-item label="当前状态">{{ progress?.statusName || activeReport.statusName }}</el-descriptions-item></el-descriptions>
      <div v-if="progress?.success" class="snap-progress">
        <b>处置进度</b>
        <div class="progress-line">
          <div v-for="(t, i) in progress.trail" :key="i" class="progress-step" :class="{ latest: i === progress.trail.length - 1 }">
            <span class="dot"></span>
            <div class="step-body"><b>{{ t.action }}</b><p>{{ t.time }} · {{ t.user }}</p><p v-if="t.opinion" class="step-opinion">{{ t.opinion }}</p></div>
          </div>
        </div>
        <div v-if="progress.closeNo" class="snap-result"><b>处置结果</b><p>结案编号 {{ progress.closeNo }}</p><p>{{ progress.closeOpinion || '整改到位，同意结案' }}</p></div>
        <div v-if="progress.status === 'closed'" class="snap-rate">
          <b>对处置结果评价</b>
          <template v-if="progress.rating">
            <el-rate :model-value="progress.rating.score" disabled />
            <p>{{ progress.rating.comment || '未填写评语' }}（{{ progress.rating.at }}）</p>
          </template>
          <template v-else>
            <el-rate v-model="rateForm.score" />
            <el-input v-model="rateForm.comment" size="small" placeholder="填写评语（可选）" style="margin: 8px 0" />
            <el-button size="small" type="primary" :loading="rateSubmitting" @click="submitRate">提交评价</el-button>
          </template>
        </div>
      </div>
    </template></el-dialog>
    <el-dialog v-model="receiptVisible" title="提交回执" width="86%" class="scroll-dialog" align-center>
      <template v-if="receipt">
        <div class="receipt-box">
          <b>事件编号：{{ receipt.code || receipt.id }}</b>
          <p>提交时间：{{ receipt.time }}</p>
          <p>举报身份：{{ receipt.reporterType === 'realname' ? '实名举报' : '匿名举报' }}</p>
          <p v-if="receipt.phone">联系电话（已脱敏）：{{ receipt.phone }}</p>
          <p class="watermark-tip">请保存事件编号，可在“我的上报记录”中查看处理进度</p>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { createSnapshotEvent, fetchMySnapReports, fetchSnapProgress, rateEvent } from '@/api/fsr'
import { PLOTS } from '@/mock/geo/plot-gen'
import { EVENT_STATUS, EVENT_TYPES } from '@/mock/common/dict'
import { EVIDENCE_IMAGES } from '@/mock/common/evidenceImages'
import EvidenceThumbs from '@/components/common/EvidenceThumbs.vue'

const userStore = useUserStore()
// 事件类型锁定粮食安全事件字典（与变化图斑库同源，可研"随手拍=粮食监管专项"口径，自查修复 2026-11-12）
const issueTypes = EVENT_TYPES.map(t => ({ label: t.name, value: t.code }))
const regionOptions = [{ value: '阜阳市', label: '阜阳市', children: [{ value: '太和县', label: '太和县', children: [{ value: '旧县镇', label: '旧县镇' }, { value: '大新镇', label: '大新镇' }] }] }]
const subjectPlots = computed(() => PLOTS.filter(item => item.subjectId === userStore.role?.subjectId))
const nearbyPlots = ref([])
// 地块定位口径（用户确认 2026-11-12）：公众未必知道系统地块、也未必站在地块内——地块改为可不选；
// 定位后按 GPS 自动推荐"附近地块"供参考（真实实现：拍照坐标与地块中心求距离），未选择时由省级研判归属
const localPlots = computed(() => PLOTS.filter(item => String(item.regionCode || '').startsWith('341222') && !nearbyPlots.value.some((n) => n.id === item.id)))
const form = reactive({ type: 'huimai', region: ['阜阳市', '太和县', '旧县镇'], plotId: '', location: '安徽省太和县（定位待更新）', gps: null, description: '', attachments: [], reporterType: 'anonymous', reporterName: '', reporterPhone: '' })
const reports = ref([])
const detailVisible = ref(false)
const activeReport = ref(null)
const receiptVisible = ref(false)
const receipt = ref(null)
const submitting = ref(false)
// 分入口：随手拍（上报）/ 我的上报（记录跟踪），对应可研“随手拍/我的上传”模块划分
const tab = ref('report')
// 处置进度与评分评价（可研 5.5.3.9.3）
const progress = ref(null)
const rateForm = reactive({ score: 0, comment: '' })
const rateSubmitting = ref(false)

const locate = () => {
  form.location = '安徽省太和县旧县镇（GPS定位已更新）'
  // 拍照定位坐标随线索上报（用户确认 2026-11-12：无需知道地块即可获取经纬度落图）；演示为太和县范围模拟值
  form.gps = [Number((115.58 + Math.random() * 0.12).toFixed(6)), Number((33.18 + Math.random() * 0.1).toFixed(6))]
  // 演示：按当前位置自动推荐附近地块（真实实现：GPS 坐标与地块中心求距离取最近 N 块）
  const pool = PLOTS.filter((p) => String(p.regionCode || '').startsWith('341222'))
  nearbyPlots.value = (pool.length ? pool : PLOTS).slice(0, 2).map((p, i) => ({ ...p, distance: 180 + i * 260 }))
  ElMessage.success(nearbyPlots.value.length ? '定位已更新，已识别附近地块供参考' : '定位已更新')
}
// 联系电话展示脱敏：138****5678
const maskPhone = (phone) => (phone && phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone)
// 详情字段补齐（用户反馈 2026-11-12）：证据=新提交的举报证据，兼容预置样例（证据在核查上报里）；地块=关联地块名称
const reportEvidence = (item) => item?.reportAttachments || item?.checkReport?.attachments || []
const plotText = (item) => { const pid = item?.spot?.plotId || item?.plotId; const plot = pid ? PLOTS.find((p) => p.id === pid) : null; return plot ? `${plot.name}（${plot.areaMu}亩）` : '未选择（由省级研判确认归属地块）' }
const fmtStamp = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}` }
// 模拟拍照/录像：生成附件元数据（名称/类型/采集时间/采集位置/水印）
const addEvidence = (type) => {
  if (form.attachments.length >= 9) return ElMessage.warning('现场证据最多9项')
  const isPhoto = type === 'photo'
  form.attachments.push({ name: isPhoto ? `IMG_${fmtStamp()}.jpg` : `VID_${fmtStamp()}.mp4`, type, time: new Date().toLocaleString('zh-CN'), location: form.location || '未定位', watermark: '已加水印（时间+位置）', url: isPhoto ? EVIDENCE_IMAGES.wheatField : EVIDENCE_IMAGES.videoCover })
  ElMessage.success(isPhoto ? '照片已添加，自动添加时间+位置水印' : '视频已添加，自动添加时间+位置水印')
}
const removeEvidence = (idx) => { form.attachments.splice(idx, 1) }
const saveDraft = () => { localStorage.setItem('wanqitong-snapshot-draft', JSON.stringify({ ...form, attachments: form.attachments.map((a) => ({ ...a })) })); ElMessage.success('已暂存农情直报草稿') }
const submit = async () => {
  if (!form.description.trim()) return ElMessage.warning('请填写问题描述')
  if (form.reporterType === 'realname') {
    if (!form.reporterName.trim()) return ElMessage.warning('实名举报需填写姓名')
    if (!/^1\d{10}$/.test(form.reporterPhone.trim())) return ElMessage.warning('请填写11位手机号码')
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const result = await createSnapshotEvent({
      type: form.type,
      regionCode: userStore.role?.regionCode,
      regionName: userStore.regionName,
      plotId: form.plotId,
      location: form.location,
      center: form.gps,
      desc: form.description,
      reporterType: form.reporterType,
      reporterName: form.reporterType === 'realname' ? form.reporterName.trim() : '',
      reporterPhone: form.reporterType === 'realname' ? form.reporterPhone.trim() : '',
      attachments: form.attachments.map((a) => ({ ...a }))
    }, userStore.role)
    if (!result.success) return ElMessage.error(result.message || '提交失败')
    // 成功回执：展示生成的事件编号
    receipt.value = { id: result.id, time: new Date().toLocaleString('zh-CN'), reporterType: form.reporterType, phone: form.reporterType === 'realname' ? maskPhone(form.reporterPhone.trim()) : '' }
    receiptVisible.value = true
    ElMessage.success('农情直报已提交，属地部门将及时处理')
    form.description = ''
    form.attachments = []
    await loadReports()
  } finally { submitting.value = false }
}
const loadReports = async () => { reports.value = (await fetchMySnapReports()).map(item => ({ ...item, type: issueTypes.find(type => type.value === item.type)?.label || item.type, regionName: item.regionName, description: item.desc, time: item.foundTime, statusName: EVENT_STATUS[item.status]?.name || item.status })) }
const viewReport = async item => {
  activeReport.value = item; detailVisible.value = true
  // 处置进度+结果+评分（可研 5.5.3.9.3：受理后查看处置流程和结果、评分评价）
  progress.value = null
  rateForm.score = 0; rateForm.comment = ''
  const r = await fetchSnapProgress(item.code || item.id)
  if (r.success) progress.value = { ...r, statusName: EVENT_STATUS[r.status]?.name || r.status }
}
const submitRate = async () => {
  if (!rateForm.score) return ElMessage.warning('请先评分')
  rateSubmitting.value = true
  try {
    const r = await rateEvent(activeReport.value.code || activeReport.value.id, rateForm)
    if (!r.success) return ElMessage.error(r.message || '评价失败')
    ElMessage.success('评价已提交，感谢您的反馈')
    const r2 = await fetchSnapProgress(activeReport.value.code || activeReport.value.id)
    if (r2.success) progress.value = { ...r2, statusName: EVENT_STATUS[r2.status]?.name || r2.status }
  } finally { rateSubmitting.value = false }
}
onMounted(async () => {
  const draft = JSON.parse(localStorage.getItem('wanqitong-snapshot-draft') || 'null')
  if (draft) {
    // 仅恢复已知草稿字段，避免旧草稿残留字段污染表单
    ;['type', 'region', 'plotId', 'location', 'description', 'reporterType', 'reporterName', 'reporterPhone'].forEach((key) => { if (draft[key] !== undefined) form[key] = draft[key] })
    if (Array.isArray(draft.attachments)) form.attachments = draft.attachments
  }
  await loadReports()
})
</script>

<style lang="scss" scoped>
/* 弹窗在手机壳内展示：宽度不超壳、内容超高滚动（用户反馈 2026-11-12） */
:deep(.scroll-dialog){max-width:calc(100% - 20px);margin-top:40px !important}
:deep(.scroll-dialog .el-dialog__body){max-height:560px;overflow-y:auto}
.mobile-page{width:100%;min-width:0;box-sizing:border-box;margin:0;min-height:100%;background:#f5f7fa;padding:14px;overflow-x:hidden}
.mobile-head,.form-card,.list-card{background:#fff;border-radius:12px;padding:16px;margin-bottom:12px}
.mobile-head{display:flex;align-items:center;justify-content:space-between;color:#1f3c68}
.mobile-head b{font-size:21px;display:block}
.mobile-head span{font-size:13px;color:#667085}
.tab-nav{display:flex;gap:8px;margin-bottom:12px}
.tab-nav button.active{border-color:#2f8c76;background:#eef7f4;color:#2f8c76;font-weight:600}
.snap-progress{margin-top:14px;background:#f7faf9;border-radius:8px;padding:12px}
.snap-progress>b,.snap-result>b,.snap-rate>b{font-size:13px;color:#1f3c68;display:block;margin-bottom:8px}
.progress-line .progress-step{position:relative;padding:0 0 14px 18px;border-left:2px solid #d9e8f4;margin-left:5px}
.progress-line .progress-step:last-child{border-left-color:transparent;padding-bottom:2px}
.progress-line .dot{position:absolute;left:-6px;top:2px;width:10px;height:10px;border-radius:50%;background:#b8c4cc}
.progress-line .progress-step.latest .dot{background:#2f8c76}
.progress-line .step-body b{font-size:13px}
.progress-line .step-body p{margin:2px 0 0;font-size:11px;color:#667085}
.progress-line .step-opinion{color:#2f8c76}
.snap-result{margin-top:10px;background:#f0f9f4;border-radius:8px;padding:10px}
.snap-result p{margin:2px 0 0;font-size:12px;color:#33475b}
.snap-rate{margin-top:10px;background:#fffbe8;border-radius:8px;padding:10px}
.snap-rate p{margin:4px 0 0;font-size:12px;color:#667085}
.tab-nav button{flex:1;border:1px solid #d9e8f4;background:#fff;border-radius:8px;padding:10px 0;font-size:14px;color:#667085;cursor:pointer}
.tab-nav button.active{border-color:#2f8c76;background:#eef7f4;color:#2f8c76;font-weight:600}
.list-tip{margin:8px 0 0;color:#98a2b3;font-size:11px;line-height:1.6}
.form-card h3{margin:0 0 6px;color:#243b5a}
.confirm-note{margin:0 0 14px;color:#2f8c76;font-size:12px}
.id-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
.id-cards button{border:1px solid #d9e8f4;background:#f7fbff;border-radius:8px;padding:10px 6px;cursor:pointer;text-align:center}
.id-cards button b{display:block;font-size:13px;color:#243b5a}
.id-cards button span{display:block;font-size:10px;color:#98a2b3;margin-top:3px}
.id-cards button.active{border-color:#2f8c76;background:#eef7f4}
.id-cards button.active b{color:#2f8c76}
.id-tip{margin:8px 0 0;color:#d97706;font-size:11px;background:#fff8e8;padding:6px 8px;border-radius:6px;line-height:1.5}
.location{display:flex;gap:8px}
.location .el-input{flex:1}
.evidence-actions{display:flex;gap:8px;margin-bottom:8px}
.evidence-row{display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px dashed #edf0f5;font-size:12px}
.ev-name{flex:1;min-width:0;color:#667085;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.upload-state{margin:6px 0 0;color:#2f8c76;font-size:11px}
.watermark-tip{margin:6px 0 0;color:#98a2b3;font-size:11px}
.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
.list-title{display:flex;align-items:center;justify-content:space-between;gap:8px}
.record-count{color:#98a2b3;font-size:12px}
.report-item{border-top:1px solid #edf0f5;padding:13px 0}
.report-top,.report-bottom{display:flex;align-items:center;justify-content:space-between;color:#98a2b3;font-size:12px}
.report-item>b{display:block;color:#243b5a;margin-top:9px}
.report-item p{color:#667085;font-size:13px;line-height:1.5;margin:6px 0}
.report-bottom span{font-size:11px}
.receipt-box b{display:block;font-size:16px;color:#243b5a;margin-bottom:8px}
.receipt-box p{margin:4px 0;color:#667085;font-size:12px}
.mobile-page :deep(.el-form-item){margin-bottom:14px}
</style>
