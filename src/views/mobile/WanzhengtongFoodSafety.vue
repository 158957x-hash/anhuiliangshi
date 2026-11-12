<template>
  <div class="mobile-page">
    <header class="mobile-header"><button class="back-button" @click="$router.back()">‹</button><div><b>粮食安全综合监管</b><span>{{ userStore.role?.roleName || roleLevel }} · {{ online ? '在线' : '离线' }}</span></div><button class="refresh-button" @click="load">刷新</button></header>
    <p class="demo-note">环节时限与风险规则为演示规则，待业务确认</p>

    <nav class="tab-nav"><button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</button></nav>

    <template v-if="activeTab === 'overview'">
      <section class="panel"><div class="section-title"><i></i><b>系统态势总览</b><span class="count">{{ events.length }} 条任务</span></div><div class="overview-grid"><button v-for="item in overview" :key="item.key" @click="goTaskFilter(item.key)"><strong>{{ item.count }}</strong><span>{{ item.label }}</span></button></div><p v-if="reminder" class="notice">任务提醒：{{ reminder }}</p></section>
      <section class="panel"><div class="section-title"><i></i><b>风险分布</b></div><div class="risk-bars"><div v-for="item in riskDistribution" :key="item.label"><span>{{ item.label }}</span><b><i :style="{ width: `${item.percent}%` }"></i></b><em>{{ item.count }}</em></div></div></section>
      <section class="panel"><div class="section-title"><i></i><b>任务提醒</b></div><div class="reminder-box"><strong>{{ pendingCount }}</strong><span>条任务等待处理</span><el-button link type="primary" @click="activeTab = 'tasks'">立即处理</el-button></div></section>
      <section class="panel"><div class="section-title"><i></i><b>最近任务</b><span class="count">{{ recentTasks.length }} 条</span></div><div v-for="event in recentTasks" :key="event.id" class="task-card" :class="`task-${event.status}`" @click="selectTask(event); activeTab = 'tasks'"><div class="task-head"><b>{{ event.code }}</b><el-tag size="small" :type="statusType(event.status)">{{ statusName(event.status) }}</el-tag></div><p>{{ event.regionName }} · {{ event.subjectName || '待核实主体' }}</p><div class="task-foot"><span>{{ event.deadline || '截止时间待定' }}</span><span>{{ riskName(event.risk) }} ›</span></div></div><el-empty v-if="!recentTasks.length" description="暂无最近任务" /></section>
      <section class="panel"><div class="section-title"><i></i><b>快速入口</b></div><div class="quick-entry"><button @click="activeTab = 'tasks'">核查任务<span>现场核查与提交</span></button><button @click="patrolVisible = true">巡查上报<span>发现问题线索直报</span></button><button @click="activeTab = 'offline'">离线中心<span>缓存与批量上传</span></button><button @click="activeTab = 'audit'">审核抽查<span>审核与随机抽查</span></button></div></section>
    </template>

    <template v-if="activeTab === 'tasks'"><section ref="taskSection" class="panel"><div class="section-title"><i></i><b>核查任务</b><span class="count">{{ filteredTasks.length }} 条</span></div><div class="filter-tabs"><button v-for="filter in statusTabs" :key="filter.key" :class="{ active: taskFilter === filter.key }" @click="taskFilter = filter.key">{{ filter.label }}</button></div><div v-for="event in filteredTasks" :key="event.id" class="task-card rich-task" :class="`task-${event.status}`" @click="selectTask(event)"><div class="task-head"><b>{{ event.code }}</b><el-tag size="small" :type="statusType(event.status)">{{ statusName(event.status) }}</el-tag></div><p v-if="event.conflictFlag" class="conflict-tip">该任务在其他设备已修改，上传前需合并（演示占位）</p><div class="task-meta"><span>问题：{{ event.desc || '待核实问题' }}</span><span>位置：{{ event.regionName }}</span><span>面积：{{ event.spot?.areaMu || 0 }} 亩</span><span>风险：{{ riskName(event.risk) }}</span><span>截止：{{ event.deadline || '待定' }}</span><span>责任人：{{ event.assignee || event.owner || '待分派' }}</span></div><div class="task-foot"><span>点击进入详情/现场核查</span><span>›</span></div></div><el-empty v-if="!filteredTasks.length" description="暂无符合条件的任务" /></section></template>

    <section v-if="activeTask" class="panel">
      <div class="section-title"><i></i><b>任务详情与现场核查</b><el-button link type="primary" @click="activeTask = null">收起</el-button></div>
      <div v-if="activeTask.conflictFlag" class="conflict-tip">该任务在其他设备已修改，上传前需合并（演示占位）</div>
      <div class="spot-info"><p><b>任务编号：</b>{{ activeTask.code }}</p><p><b>图斑位置：</b>{{ activeTask.regionName }}</p><p><b>面积：</b>{{ activeTask.spot?.areaMu || 0 }} 亩　<b>风险：</b>{{ riskName(activeTask.risk) }}</p><p><b>责任人：</b>{{ activeTask.assignee || activeTask.owner || '待分派' }}</p><p><b>中心坐标：</b>{{ centerText(activeTask) }}</p><el-button size="small" @click="navigate(activeTask)">地图导航</el-button></div>
      <div v-if="canCheck(activeTask)" class="check-form">
        <el-form label-position="top">
          <el-form-item label="核查结论"><el-radio-group v-model="checkForm.conclusion"><el-radio label="问题属实">问题属实</el-radio><el-radio label="部分属实">部分属实</el-radio><el-radio label="问题不属实">问题不属实</el-radio></el-radio-group></el-form-item>
          <el-form-item label="核查情况描述（必填）"><el-input v-model="checkForm.desc" type="textarea" :rows="3" placeholder="请填写现场核查情况" /></el-form-item>
          <div class="two-col"><el-form-item label="经度"><el-input v-model="checkForm.longitude" placeholder="可自动定位" /></el-form-item><el-form-item label="纬度"><el-input v-model="checkForm.latitude" placeholder="可自动定位" /></el-form-item></div>
          <div class="locate-row"><el-button size="small" type="primary" plain @click="autoLocate">自动定位（优先）</el-button><span class="locate-tip">自动定位优先，可手动修正经纬度</span></div>
          <el-form-item label="现场证据（至少1项）">
            <div class="upload-row"><button type="button" class="sim-btn" @click="addEvidence('photo')">模拟拍照</button><button type="button" class="sim-btn" @click="addEvidence('video')">模拟录像</button></div>
            <div v-for="(item, idx) in checkForm.attachments" :key="item.name" class="evidence-row">
              <el-tag size="small" :type="item.type === 'photo' ? 'success' : 'warning'">{{ item.type === 'photo' ? '照片' : '视频' }}</el-tag>
              <span class="ev-name">{{ item.name }}</span>
              <el-button link type="primary" size="small" @click="viewEvidence(item)">查看</el-button>
              <el-button link type="danger" size="small" @click="removeEvidence(idx)">删除</el-button>
            </div>
            <p v-if="checkForm.attachments.length" class="upload-state">上传状态：已上传</p>
          </el-form-item>
          <p class="watermark-tip">现场证据自动添加“时间 + 位置”水印（演示记录）</p>
        </el-form>
        <div class="form-actions"><el-button :disabled="submitting" @click="saveOffline">离线保存</el-button><el-button type="primary" :loading="submitting" @click="submitCheck">提交核查结果</el-button></div>
      </div>
      <div v-else class="detail-box">核查结论：{{ activeTask.checkReport?.conclusion || '待核查' }}<br>核查情况描述：{{ activeTask.checkReport?.desc || '暂无' }}<br>现场证据：{{ (activeTask.checkReport?.attachments || []).length }} 项{{ evidenceNames(activeTask) }}<br>上传状态：{{ activeTask.checkReport ? (activeTask.checkReport.uploadStatus || '已上传') : '—' }}</div>
    </section>

    <template v-if="activeTab === 'offline'"><section class="panel"><div class="section-title"><i></i><b>待下载任务</b><span class="count">{{ cachedTasks.length }} 条缓存</span></div><div class="offline-card"><p>将待核查任务下载到本地，无网络也可填写</p><small>最近缓存：{{ cacheTime(cachedTasks) }}</small><el-button size="small" type="primary" @click="downloadTemplates">下载待填报任务</el-button></div></section><section class="panel"><div class="section-title"><i></i><b>离线填报</b><span class="count">{{ cachedReports.length }} 条待上传</span></div><div class="offline-card"><p>已保存的现场核查记录（含现场证据附件）</p><small>上传状态：{{ cachedReports.length ? '待联网批量上传' : '暂无待上传记录' }}</small><div><el-button size="small" @click="openOffline">继续填报</el-button><el-button size="small" type="primary" :loading="uploading" @click="uploadCache">批量上传</el-button></div></div><div v-for="item in cachedReports" :key="item.id" class="cache-row"><span>{{ item.code }} · {{ cacheDate(item.savedAt) }}</span><small>{{ item.uploaded ? '已上传' : '待上传' }} · {{ item.report?.attachments?.length || 0 }}项证据</small></div></section><section class="panel"><div class="section-title"><i></i><b>历史记录</b><el-button link type="primary" @click="historyVisible = true">查看全部</el-button></div><p class="cache-tip">已完成 {{ history.length }} 条现场填报记录</p><div v-for="item in history.slice(0, 3)" :key="item.id + item.time" class="cache-row"><span>{{ item.code }}</span><small>{{ item.time }}</small></div></section></template>

    <template v-if="activeTab === 'audit'">
      <section v-if="canAudit" class="panel"><div class="section-title"><i></i><b>市级待审核列表</b><span class="count">{{ reviewingTasks.length }} 条</span></div><div v-for="event in reviewingTasks" :key="event.id" class="audit-row"><div><b>{{ event.code }}</b><span>{{ event.regionName }} · {{ event.subjectName || '待核实主体' }}</span></div><div><el-button size="small" type="success" @click="doAudit(event, 'pass')">审核通过</el-button><el-button size="small" type="danger" plain @click="doAudit(event, 'reject')">打回重核</el-button></div></div><el-empty v-if="!reviewingTasks.length" description="暂无待审核任务" /></section>
      <section v-if="canAudit" class="panel"><div class="section-title"><i></i><b>市级需复查列表</b><span class="count">{{ recheckTasks.length }} 条</span></div><div v-for="event in recheckTasks" :key="event.id" class="audit-row"><div><b>{{ event.code }}</b><span>{{ event.regionName }} · {{ event.subjectName || '待核实主体' }}</span></div><div><el-button size="small" type="success" @click="doRecheck(event, 'pass')">复核通过</el-button><el-button size="small" type="danger" plain @click="doRecheck(event, 'reject')">复核退回整改</el-button></div></div><el-empty v-if="!recheckTasks.length" description="暂无需复查任务" /></section>
      <section v-else-if="isProvince" class="panel"><div class="section-title"><i></i><b>省级随机抽查</b></div><p class="audit-tip">从权限范围内任务随机抽取现场核查记录，形成抽查闭环。</p><el-button type="warning" @click="randomInspect">随机抽查</el-button><div v-if="randomTask" class="random-form"><p><b>{{ randomTask.code }} · {{ randomTask.regionName }}</b></p><el-form label-position="top"><el-form-item label="抽查结论"><el-select v-model="randomForm.conclusion" style="width:100%"><el-option label="通过" value="通过" /><el-option label="发现问题" value="发现问题" /><el-option label="需补充材料" value="需补充材料" /></el-select></el-form-item><el-form-item label="问题描述"><el-input v-model="randomForm.desc" type="textarea" /></el-form-item><div class="two-col"><el-form-item label="经度"><el-input v-model="randomForm.longitude" /></el-form-item><el-form-item label="纬度"><el-input v-model="randomForm.latitude" /></el-form-item></div></el-form><el-button type="primary" @click="saveInspection">保存抽查记录</el-button></div><div v-for="item in inspections" :key="item.time" class="history-row"><b>{{ item.code }}</b><span>{{ item.conclusion }}</span><small>{{ item.time }}</small></div></section>
      <section v-else class="panel"><div class="section-title"><i></i><b>核查上报</b></div><p class="audit-tip">当前角色请通过核查任务完成现场填报并上报，提交后由市级统一审核。</p><el-button type="primary" @click="activeTab = 'tasks'">进入核查任务</el-button></section>
    </template>

    <el-dialog v-model="historyVisible" title="历史填报记录" width="92%"><div v-for="item in history" :key="item.id + item.time" class="dialog-history"><b>{{ item.code }} · {{ item.conclusion }}</b><p>{{ item.desc || '暂无描述' }}</p><small>{{ item.time }} · 现场证据 {{ (item.attachments || []).length }} 项</small></div><el-empty v-if="!history.length" description="暂无历史填报记录" /></el-dialog>

    <el-dialog v-model="evidenceVisible" title="现场证据详情" width="88%">
      <template v-if="activeEvidence">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="文件名">{{ activeEvidence.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ activeEvidence.type === 'photo' ? '照片' : '视频' }}</el-descriptions-item>
          <el-descriptions-item label="采集时间">{{ activeEvidence.time }}</el-descriptions-item>
          <el-descriptions-item label="采集位置">{{ activeEvidence.location }}</el-descriptions-item>
          <el-descriptions-item label="水印状态">{{ activeEvidence.watermark }}</el-descriptions-item>
        </el-descriptions>
        <p class="watermark-tip">原型为模拟证据元数据，不含真实影像文件（演示数据）</p>
      </template>
    </el-dialog>

    <!-- 网格巡查上报（可研 5.5.3.9.2：基层干部巡查发现毁麦毁粮/撂荒等问题，必须关联地块） -->
    <el-dialog v-model="patrolVisible" title="粮食安全巡查上报" width="92%">
      <el-alert type="info" :closable="false" style="margin-bottom: 10px" title="巡查上报必须选择对应地块（可研'按图选地'口径）；线索提交后进入省粮食安全综合监管系统，由省级研判是否转入核查。" />
      <el-form label-width="80px">
        <el-form-item label="问题类型" required>
          <el-radio-group v-model="patrolForm.type">
            <el-radio v-for="t in EVENT_TYPES" :key="t.code" :value="t.code">{{ t.name }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="关联地块" required>
          <el-input v-model="patrolForm.plotName" placeholder="按图选地或输入地块名称（如：税镇镇张楼村东地块）" />
        </el-form-item>
        <el-form-item label="情况描述" required>
          <el-input v-model="patrolForm.desc" type="textarea" :rows="3" placeholder="描述现场情况（毁麦毁粮/撂荒/非粮化等）" />
        </el-form-item>
        <el-form-item label="现场证据">
          <el-button size="small" plain @click="patrolForm.evidence++">＋ 拍照/录像取证（{{ patrolForm.evidence }}项）</el-button>
          <span class="watermark-tip" style="margin-left: 8px">自动附时间水印与GPS定位（演示）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="patrolVisible = false">取消</el-button>
        <el-button type="primary" :loading="patrolSubmitting" @click="submitPatrol">提交线索</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { auditEvent, closeEvent, fetchEvent, fetchEvents, submitCheckReport, submitPatrolReport } from '@/api/fsr'
import { EVENT_STATUS, EVENT_STATUS_FLOW, EVENT_TYPES } from '@/mock/common/dict'

const userStore = useUserStore()
const events = ref([]); const activeTask = ref(null); const taskSection = ref(null)
// 网格巡查上报（线索 → 待省级研判）
const patrolVisible = ref(false); const patrolSubmitting = ref(false)
const patrolForm = reactive({ type: 'piaohuang', plotName: '', desc: '', evidence: 0 })
async function submitPatrol() {
  if (!patrolForm.plotName.trim()) return ElMessage.warning('巡查上报必须关联地块')
  if (!patrolForm.desc.trim()) return ElMessage.warning('请填写情况描述')
  patrolSubmitting.value = true
  try {
    const r = await submitPatrolReport({ ...patrolForm, regionCode: userStore.role?.regionCode || '', regionName: userStore.role?.regionName || '', reporter: userStore.role?.name || '网格员' })
    if (!r.success) return ElMessage.error(r.message || '上报失败')
    ElMessageBox.alert(`线索已上报（${r.code}），进入省系统待省级研判，研判通过后将下发核查任务。`, '上报成功', { type: 'success', confirmButtonText: '知道了' })
    patrolVisible.value = false
    patrolForm.plotName = ''; patrolForm.desc = ''; patrolForm.evidence = 0
    load()
  } finally {
    patrolSubmitting.value = false
  }
}
const online = ref(navigator.onLine); const historyVisible = ref(false)
const activeTab = ref('overview'); const taskFilter = ref('all')
const tabs = [{ key: 'overview', label: '态势总览' }, { key: 'tasks', label: '核查任务' }, { key: 'offline', label: '离线中心' }, { key: 'audit', label: '审核抽查' }]
// 状态页签与七状态字典统一（EVENT_STATUS：待派发/待核查/已上报/待审核/已审核（整改中）/需复查/已结案）
const statusTabs = [{ key: 'all', label: '全部' }, ...EVENT_STATUS_FLOW.map((k) => ({ key: k, label: EVENT_STATUS[k].name }))]
const cachedTasks = ref(read('wzt-food-tasks')); const cachedReports = ref(read('wzt-food-reports')); const history = ref(read('wzt-food-history')); const inspections = ref(read('wzt-food-inspections')); const randomTask = ref(null)
const emptyCheckForm = () => ({ conclusion: '问题属实', desc: '', longitude: '', latitude: '', attachments: [] })
const checkForm = reactive(emptyCheckForm())
const randomForm = reactive({ conclusion: '通过', desc: '', longitude: '', latitude: '' })
const submitting = ref(false); const uploading = ref(false)
const evidenceVisible = ref(false); const activeEvidence = ref(null)

const roleLevel = computed(() => { const r = userStore.role || {}; const raw = `${r.role || ''}${r.code || ''}${r.roleName || ''}`.toLowerCase(); if (r.regionCode === '340000' || raw.includes('province') || raw.includes('省')) return '省级'; if (raw.includes('city') || raw.includes('市')) return '市级'; if (raw.includes('town') || raw.includes('township') || raw.includes('乡') || raw.includes('镇')) return '乡镇'; return '县级' })
const isProvince = computed(() => roleLevel.value === '省级'); const canAudit = computed(() => roleLevel.value === '市级'); const canReceive = computed(() => ['县级', '乡镇'].includes(roleLevel.value))
const reviewingTasks = computed(() => events.value.filter((e) => e.status === 'reviewing'))
const recheckTasks = computed(() => events.value.filter((e) => e.status === 'recheck'))
const overview = computed(() => EVENT_STATUS_FLOW.map((k) => ({ key: k, label: EVENT_STATUS[k].name, count: events.value.filter((e) => e.status === k).length })))
const filteredTasks = computed(() => taskFilter.value === 'all' ? events.value : events.value.filter((e) => e.status === taskFilter.value))
const recentTasks = computed(() => events.value.slice(0, 3)); const pendingCount = computed(() => events.value.filter((e) => ['checking', 'reviewing', 'recheck'].includes(e.status)).length)
const riskDistribution = computed(() => { const total = events.value.length || 1; return [{ label: '高风险', key: 'high', color: '#e85d75' }, { label: '中风险', key: 'medium', color: '#e6a23c' }, { label: '低风险', key: 'low', color: '#2f8c76' }].map((i) => ({ ...i, count: events.value.filter((e) => e.risk === i.key).length, percent: Math.round(events.value.filter((e) => e.risk === i.key).length / total * 100) })) })
const reminder = computed(() => { const n = pendingCount.value; return n ? `您有 ${n} 条任务需要处理` : '' })
// 状态命名统一走 EVENT_STATUS 字典
const statusName = (s) => EVENT_STATUS[s]?.name || '未知状态'
const statusType = (s) => EVENT_STATUS[s]?.tag || 'info'
const riskName = (r) => ({ high: '高风险', medium: '中风险', low: '低风险' }[r] || '待评估')
const evidenceNames = (e) => { const list = e?.checkReport?.attachments || []; return list.length ? '（' + list.map((a) => a.name).join('、') + '）' : '' }

function read(key) { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
const centerText = (e) => e?.spot?.center?.join?.(', ') || e?.checkReport?.gps || '暂无坐标'
const canCheck = (e) => ['checking', 'recheck'].includes(e?.status) && canReceive.value

async function load() {
  const result = await fetchEvents(userStore.role, {})
  events.value = Array.isArray(result) ? result : []
  // 演示占位：模拟任务在其他设备被修改产生的离线冲突标记（真实多端同步待接入）
  const conflictDemo = events.value.find((e) => e.status === 'checking')
  if (conflictDemo) conflictDemo.conflictFlag = true
  if (activeTask.value) activeTask.value = await fetchEvent(activeTask.value.id)
}

async function selectTask(e) {
  activeTask.value = await fetchEvent(e.id)
  Object.assign(checkForm, emptyCheckForm())
  const draft = cachedReports.value.find((i) => i.id === e.id)
  if (draft?.report) Object.assign(checkForm, draft.report, { attachments: draft.report.attachments || [] })
}

function goTaskFilter(status) { activeTab.value = 'tasks'; taskFilter.value = status; taskSection.value?.scrollIntoView({ behavior: 'smooth' }) }
function cacheDate(value) { return value ? new Date(value).toLocaleString('zh-CN') : '暂无时间' }
function cacheTime(list) { return list.length ? cacheDate(Math.max(...list.map((item) => item.downloadedAt || 0))) : '暂无缓存' }
function navigate(e) { const c = e?.spot?.center; if (!c?.length) return ElMessage.warning('暂无图斑坐标'); window.open(`https://uri.amap.com/marker?position=${c[0]},${c[1]}&name=${encodeURIComponent(e.regionName || '图斑位置')}`, '_blank') }

// 现场定位：自动定位优先（取图斑中心坐标演示），保留手动输入
function autoLocate() {
  const c = activeTask.value?.spot?.center
  if (!c?.length) return ElMessage.warning('暂无图斑坐标，请手动输入经纬度')
  checkForm.longitude = Number(c[0]).toFixed(6)
  checkForm.latitude = Number(c[1]).toFixed(6)
  ElMessage.success('已按图斑坐标自动定位（演示），可手动修正')
}

// 现场证据：模拟拍照/录像，生成附件元数据（名称/类型/采集时间/采集位置/水印）
function fmtStamp() { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}` }
function addEvidence(type) {
  if (checkForm.attachments.length >= 9) return ElMessage.warning('现场证据最多9项')
  const isPhoto = type === 'photo'
  checkForm.attachments.push({
    name: isPhoto ? `IMG_${fmtStamp()}.jpg` : `VID_${fmtStamp()}.mp4`,
    type,
    time: new Date().toLocaleString('zh-CN'),
    location: checkForm.longitude && checkForm.latitude ? `${checkForm.longitude}, ${checkForm.latitude}` : '未定位',
    watermark: '已加水印（时间+位置）'
  })
  ElMessage.success(isPhoto ? '照片已添加，自动添加时间+位置水印' : '视频已添加，自动添加时间+位置水印')
}
function removeEvidence(idx) { checkForm.attachments.splice(idx, 1) }
function viewEvidence(item) { activeEvidence.value = item; evidenceVisible.value = true }

function saveOffline() {
  if (!activeTask.value) return
  const item = { id: activeTask.value.id, code: activeTask.value.code, report: { ...checkForm, attachments: checkForm.attachments.map((a) => ({ ...a })) }, uploaded: false, savedAt: Date.now() }
  cachedReports.value = [...cachedReports.value.filter((i) => i.id !== item.id), item]
  save('wzt-food-reports', cachedReports.value)
  ElMessage.success('已保存离线记录（含现场证据附件）')
}

async function submitCheck() {
  if (!activeTask.value) return ElMessage.warning('请先选择任务')
  if (!checkForm.desc.trim()) return ElMessage.warning('请填写核查情况描述')
  if (!checkForm.longitude || !checkForm.latitude) return ElMessage.warning('请完成现场定位（经纬度）')
  if (!checkForm.attachments.length) return ElMessage.warning('至少添加1项现场证据（拍照/录像）')
  if (submitting.value) return
  submitting.value = true
  try {
    if (!online.value) { saveOffline(); return }
    const report = { ...checkForm, gps: `${checkForm.longitude}, ${checkForm.latitude}`, checker: userStore.role?.name, uploadStatus: '已上传', attachments: checkForm.attachments.map((a) => ({ ...a })) }
    const result = await submitCheckReport(activeTask.value.id, report)
    if (!result?.success) return ElMessage.error(result?.message || '提交失败')
    saveHistory(activeTask.value, report)
    cachedReports.value = cachedReports.value.filter((i) => i.id !== activeTask.value.id)
    save('wzt-food-reports', cachedReports.value)
    ElMessage.success('核查结果已提交，等待市级审核')
    activeTask.value = null
    load()
  } finally { submitting.value = false }
}

function saveHistory(e, report) { history.value.unshift({ id: e.id, code: e.code, ...report, time: new Date().toLocaleString('zh-CN') }); history.value = history.value.slice(0, 30); save('wzt-food-history', history.value) }
function downloadTemplates() { cachedTasks.value = events.value.filter((e) => ['checking', 'recheck'].includes(e.status)).map((e) => ({ id: e.id, code: e.code, regionName: e.regionName, spot: e.spot, downloadedAt: Date.now() })); save('wzt-food-tasks', cachedTasks.value); ElMessage.success(`已缓存 ${cachedTasks.value.length} 条待填报任务`) }
function openOffline() { const task = cachedTasks.value.find((t) => events.value.some((e) => e.id === t.id && ['checking', 'recheck'].includes(e.status))); if (!task) return ElMessage.info('请先下载待填报任务'); selectTask(events.value.find((e) => e.id === task.id)) }

async function uploadCache() {
  if (!online.value) return ElMessage.warning('当前离线')
  if (uploading.value) return
  uploading.value = true
  try {
    for (const item of [...cachedReports.value]) {
      if (item.uploaded) continue
      const report = { ...item.report, gps: `${item.report.longitude}, ${item.report.latitude}`, checker: userStore.role?.name, uploadStatus: '已上传', attachments: item.report.attachments || [] }
      const result = await submitCheckReport(item.id, report)
      if (result?.success) { const e = events.value.find((x) => x.id === item.id); if (e) saveHistory(e, report); cachedReports.value = cachedReports.value.filter((x) => x.id !== item.id) }
      else ElMessage.error(`${item.code} 上传失败：${result?.message || '未知原因'}`)
    }
    save('wzt-food-reports', cachedReports.value)
    ElMessage.success('缓存数据上传完成')
    load()
  } finally { uploading.value = false }
}

// 市级审核：待审核 → 审核通过 / 打回重核（意见必填）
async function doAudit(e, action) {
  const label = action === 'pass' ? '审核通过' : '打回重核'
  try {
    const { value } = await ElMessageBox.prompt(`请填写“${label}”的审核意见（必填）`, label, {
      inputValidator: (v) => (v && v.trim()) ? true : '审核意见不能为空',
      confirmButtonText: '确认', cancelButtonText: '取消'
    })
    const result = await auditEvent(e.id, action, value.trim(), userStore.role?.name)
    if (!result?.success) return ElMessage.error(result?.message || '审核失败')
    ElMessage.success(action === 'pass' ? '审核通过，事件转入整改' : '已打回重核，请重新核查')
    load()
  } catch { /* 用户取消 */ }
}

// 市级复核：需复查 → 复核通过（结案）/ 复核退回整改（意见必填）
async function doRecheck(e, action) {
  const label = action === 'pass' ? '复核通过' : '复核退回整改'
  try {
    const { value } = await ElMessageBox.prompt(`请填写“${label}”的复核意见（必填）`, label, {
      inputValidator: (v) => (v && v.trim()) ? true : '复核意见不能为空',
      confirmButtonText: '确认', cancelButtonText: '取消'
    })
    const result = await closeEvent(e.id, action, value.trim(), userStore.role?.name)
    if (!result?.success) return ElMessage.error(result?.message || '复核失败')
    ElMessage.success(action === 'pass' ? `复核通过，事件已结案${result.closeNo ? '（' + result.closeNo + '）' : ''}` : '已复核退回整改')
    load()
  } catch { /* 用户取消 */ }
}

function randomInspect() { if (!events.value.length) return ElMessage.info('暂无可抽查事件'); randomTask.value = events.value[Math.floor(Math.random() * events.value.length)]; const c = centerText(randomTask.value).split(','); Object.assign(randomForm, { conclusion: '通过', desc: '', longitude: String(c[0] || '').trim(), latitude: String(c[1] || '').trim() }) }
function saveInspection() { if (!randomTask.value) return; inspections.value.unshift({ eventId: randomTask.value.id, code: randomTask.value.code, ...randomForm, inspector: userStore.role?.name, time: new Date().toLocaleString('zh-CN') }); save('wzt-food-inspections', inspections.value.slice(0, 30)); randomTask.value = null; ElMessage.success('抽查记录已保存') }
function syncOnline() { online.value = navigator.onLine }
onMounted(() => { addEventListener('online', syncOnline); addEventListener('offline', syncOnline); load() })
onUnmounted(() => { removeEventListener('online', syncOnline); removeEventListener('offline', syncOnline) })
</script>

<style lang="scss" scoped>
.mobile-page{min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:12px 12px 30px;color:#243b5a}
.mobile-header{height:54px;display:grid;grid-template-columns:38px 1fr 48px;align-items:center;text-align:center}
.mobile-header b{display:block;font-size:18px}
.mobile-header span{display:block;color:#8a96a8;font-size:11px;margin-top:3px}
.back-button,.refresh-button{border:0;background:none;color:#315f93}
.back-button{font-size:36px;text-align:left;line-height:1}
.refresh-button{font-size:12px}
.demo-note{color:#98a2b3;font-size:11px;margin:0 0 8px;text-align:center}
.panel{background:#fff;border-radius:13px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(31,52,73,.04)}
.section-title{display:flex;align-items:center;gap:8px;margin-bottom:13px}
.section-title i{width:5px;height:19px;background:#2f8c76;border-radius:3px}
.count{margin-left:auto;color:#98a2b3;font-size:12px}
.tab-nav{display:flex;gap:4px;overflow:auto;background:#eaf2f4;border-radius:10px;padding:4px;margin-bottom:12px}
.tab-nav button,.filter-tabs button{border:0;background:transparent;color:#64748b;white-space:nowrap;border-radius:8px;padding:9px 12px;font-size:12px}
.tab-nav button.active,.filter-tabs button.active{background:#fff;color:#2f8c76;box-shadow:0 2px 6px rgba(31,52,73,.08);font-weight:600}
.overview-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.overview-grid button{border:0;border-radius:8px;background:#f3f8f7;padding:9px 2px;color:#345}
.overview-grid strong{display:block;font-size:21px;color:#2f8c76}
.overview-grid span{font-size:11px}
.notice{color:#d97706;font-size:12px;background:#fff8e8;padding:8px;border-radius:6px}
.risk-bars>div{display:flex;align-items:center;gap:8px;margin:10px 0;font-size:12px}
.risk-bars span{width:48px}
.risk-bars b{height:8px;flex:1;background:#edf1f4;border-radius:5px;overflow:hidden}
.risk-bars i{display:block;height:100%;background:#2f8c76;border-radius:5px}
.risk-bars em{width:24px;text-align:right;font-style:normal;color:#64748b}
.reminder-box{display:flex;align-items:center;gap:8px;background:#fff8e8;padding:12px;border-radius:8px}
.reminder-box strong{font-size:24px;color:#d97706}
.reminder-box span{font-size:12px;color:#64748b;flex:1}
.quick-entry{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.quick-entry button{border:1px solid #d9e8f4;background:#f7fbff;color:#35678f;border-radius:8px;padding:11px 4px;font-size:12px}
.quick-entry span{display:block;color:#98a2b3;font-size:10px;margin-top:4px}
.filter-tabs{display:flex;gap:4px;overflow:auto;margin-bottom:8px}
.rich-task{padding-bottom:12px}
.task-meta{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:8px 0;color:#667085;font-size:11px}
.offline-card{background:#f7fafc;border-radius:8px;padding:12px;font-size:12px}
.offline-card p{margin:0 0 6px}
.offline-card small,.audit-tip{display:block;color:#98a2b3;margin-bottom:10px}
.task-card{border-left:4px solid #f0ad4e;padding:10px 8px;border-bottom:1px solid #eef1f5;cursor:pointer}
.task-reviewing{border-left-color:#409eff}
.task-reported{border-left-color:#e6a23c}
.task-audited{border-left-color:#9b59b6}
.task-recheck{border-left-color:#e85d75}
.task-closed{border-left-color:#67c23a}
.task-head,.task-foot,.audit-row,.history-row{display:flex;justify-content:space-between;align-items:center}
.task-card p{font-size:12px;color:#667085;margin:6px 0}
.task-card .conflict-tip{margin:6px 0}
.desc{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.task-foot,.cache-tip,.watermark-tip{font-size:11px;color:#98a2b3}
.conflict-tip{color:#d97706;background:#fff8e8;border:1px solid #f5c98a;padding:7px 9px;border-radius:6px;font-size:11px;line-height:1.5}
.spot-info,.detail-box{background:#f7fafc;border-radius:8px;padding:10px;font-size:12px;line-height:1.7}
.spot-info p{margin:2px 0}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.locate-row{display:flex;align-items:center;gap:8px;margin-bottom:11px}
.locate-tip{color:#98a2b3;font-size:11px}
.form-actions{display:flex;justify-content:flex-end;gap:8px}
.offline-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.upload-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px}
.sim-btn{border:1px solid #d9e8f4;background:#f7fbff;color:#35678f;border-radius:8px;padding:11px 4px;font-size:12px;cursor:pointer}
.evidence-row{display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px dashed #eef1f5;font-size:12px}
.ev-name{flex:1;min-width:0;color:#667085;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.upload-state{margin:6px 0 0;color:#2f8c76;font-size:11px}
.cache-row,.audit-row,.history-row{padding:8px 0;border-bottom:1px solid #eef1f5;font-size:12px}
.cache-row small{float:right;color:#2f8c76}
.audit-row span{display:block;color:#98a2b3;margin-top:4px}
.random-form{margin-top:12px;border-top:1px solid #edf0f5;padding-top:10px}
.dialog-history{padding:10px 0;border-bottom:1px solid #eee;font-size:12px}
.dialog-history p{color:#667085}
.mobile-page :deep(.el-form-item){margin-bottom:11px}
.mobile-page :deep(.el-input-number){width:100%}
</style>
