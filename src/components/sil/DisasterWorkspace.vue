<template>
  <div class="disaster-workspace" :class="{mobile}" v-loading="loading">
    <div class="workspace-head"><div><h2>受灾作物补充收储上报</h2><p>受灾认定与三名会签 → 补充上报免审 → 发布临时需求 → 联系承接与实际收储</p></div><el-button size="small" @click="load">刷新</el-button></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
    <div class="role-note">{{ roleNote }}</div>
    <el-tabs v-model="tab" class="disaster-tabs">
      <el-tab-pane label="受灾认定" name="events"/>
      <el-tab-pane label="补充上报" name="reports"/>
      <el-tab-pane label="临时需求" name="demands"/>
      <el-tab-pane label="承接与台账" name="executions"/>
    </el-tabs>
    <div class="list-head"><el-input v-model="keyword" placeholder="编号、种植主体、灾情或作物" clearable aria-label="受灾记录查询"/><el-button v-if="tab==='events' && isCounty" type="primary" @click="newEvent">新增受灾认定</el-button><el-button v-if="tab==='reports' && canReport" type="primary" :disabled="!confirmedEvents.length" @click="newReport()">新增补充上报</el-button></div>

    <div v-if="tab==='events'" class="record-list">
      <article v-for="event in filtered(data.events)" :key="event.id" class="record-card">
        <div class="record-title"><b>{{ event.subjectName }}</b><el-tag :type="event.status==='confirmed'?'success':'warning'">{{ event.status==='confirmed'?'会签已生效':'待专家会签' }}</el-tag></div>
        <small>{{ event.number }}</small><p>{{ regionName(event.regionCode) }} · {{ event.disasterType }} · {{ event.plots.length }} 块地 · 受灾 {{ event.affectedArea }} 亩</p><p>三名专家已签 {{ event.experts.filter(e=>e.signedAt).length }}/3</p>
        <div class="record-actions"><el-button link type="primary" @click="view(event,'event')">查看认定与材料</el-button><el-button v-if="isCounty && event.status==='signing'" link type="warning" @click="openSign(event)">专家会签</el-button><el-button v-if="canReport && event.status==='confirmed'" link type="success" @click="newReport(event.id)">{{ isCounty?'代受灾主体上报':'补充上报' }}</el-button></div>
      </article><el-empty v-if="!filtered(data.events).length" description="暂无可查看的受灾认定" :image-size="65"/>
    </div>
    <div v-else-if="tab==='reports'" class="record-list">
      <article v-for="report in filtered(data.reports)" :key="report.id" class="record-card">
        <div class="record-title"><b>{{ report.subjectName }}</b><el-tag type="success">免审已生效</el-tag></div><small>{{ report.number }}</small><p>{{ report.crop }} · {{ report.plots.length }} 块地 · 补充面积 {{ report.area }} 亩</p><p>申报单位：{{ report.applicant.unit }} · {{ report.applicant.name }}</p>
        <div class="record-actions"><el-button link type="primary" @click="view(report,'report')">查看上报详情</el-button><el-button link type="primary" @click="mapLink(report)">查看围栏 / 一张图</el-button><el-button v-if="isCounty" link type="success" :disabled="data.demands.some(d=>d.reportId===report.id)" @click="newDemand(report)">{{ data.demands.some(d=>d.reportId===report.id)?'已发布需求':'发布临时需求' }}</el-button></div>
      </article><el-empty v-if="!filtered(data.reports).length" description="暂无补充上报；请先完成受灾范围专家会签" :image-size="65"/>
    </div>
    <div v-else-if="tab==='demands'" class="record-list">
      <article v-for="demand in filtered(data.demands)" :key="demand.id" class="record-card">
        <div class="record-title"><b>{{ demand.subjectName }}</b><el-tag type="warning">临时收储需求</el-tag></div><small>{{ demand.number }}</small><p>{{ regionName(demand.regionCode) }} · {{ demand.crop }} · {{ demand.area }}亩 · 预计重量 {{ demand.estimatedWeight ?? '未填' }} 吨</p><p>发布单位：{{ demand.publisher }} · {{ demand.publishedAt }}</p><p>{{ demand.description || '请联系发布单位了解收储安排。' }}</p>
        <div class="record-actions"><el-button link type="primary" @click="view(demand,'demand')">需求详情 / 联系方式</el-button><el-button v-if="isStorage" link type="success" :disabled="hasAcceptance(demand.id)" @click="newAcceptance(demand)">{{ hasAcceptance(demand.id)?'本主体已登记':'登记联系承接' }}</el-button></div>
      </article><el-empty v-if="!filtered(data.demands).length" description="暂无临时收储需求；由县级在补充上报生效后发布" :image-size="65"/>
    </div>
    <div v-else class="record-list">
      <article v-for="acceptance in filtered(data.acceptances)" :key="acceptance.id" class="record-card">
        <div class="record-title"><b>{{ acceptance.storageSubjectName }}</b><el-tag :type="execution(acceptance.id)?.status==='已填报'?'success':'info'">{{ execution(acceptance.id)?.status || '已登记联系' }}</el-tag></div><small>{{ acceptance.id }}</small><p>受灾种植主体：{{ acceptance.subjectName }} · {{ acceptance.registeredAt }}</p><p>实际收储重量：{{ execution(acceptance.id)?.weight ?? '待填报' }} 吨</p>
        <div class="record-actions"><el-button link type="primary" @click="view(acceptance,'acceptance')">承接详情</el-button><el-button v-if="isStorage" link type="primary" @click="editExecution(acceptance)">填报实际收储</el-button><el-button v-else link @click="editExecution(acceptance)">查看实际收储</el-button></div>
      </article><el-empty v-if="!filtered(data.acceptances).length" description="暂无承接登记与实际收储台账" :image-size="65"/>
    </div>

    <el-dialog v-model="formVisible" :title="formType==='event'?'新增受灾认定':formType==='report'?'受灾作物补充收储上报':formType==='demand'?'发布临时收储需求':formType==='acceptance'?'登记联系承接':'实际收储填报'" class="disaster-dialog" width="min(1080px,96vw)" top="3vh" append-to-body destroy-on-close>
      <template v-if="formType==='event' || formType==='report'">
        <div class="step-nav"><span v-for="(label,i) in formType==='event'?['受灾信息','地图选地','材料与专家']:['确认主体','批量选地','附件与预览']" :key="i" :class="{active:step===i+1}">{{ i+1 }} {{ label }}</span></div>
        <div v-if="step===1" class="form-grid">
          <template v-if="formType==='event'">
            <el-form label-position="top"><el-form-item label="受灾种植主体" required><el-select v-model="eventForm.subjectId" filterable aria-label="受灾种植主体"><el-option v-for="s in subjects" :key="s.id" :value="s.id" :label="s.name"/></el-select></el-form-item><el-form-item label="灾情类型" required><el-input v-model="eventForm.disasterType" placeholder="如：渍涝、风雹、干旱"/></el-form-item><el-form-item label="灾害发生日期" required><el-date-picker v-model="eventForm.occurredAt" type="date" value-format="YYYY-MM-DD"/></el-form-item><el-form-item label="作物年度" required><el-date-picker v-model="eventForm.year" type="year" value-format="YYYY"/></el-form-item></el-form>
            <div class="help-box"><h4>受灾范围与会签</h4><p>选择受灾种植主体后，在下一步选择该主体的整块受灾地块，面积由地块汇总。</p><p>第三步录入三名专家及评估材料；专家会签完成后，该范围内的补充收储上报免再审核。</p></div>
          </template>
          <template v-else>
            <el-form label-position="top"><el-form-item label="申报单位"><el-input :model-value="userStore.role?.unit" disabled/></el-form-item><el-form-item label="申报人"><el-input :model-value="userStore.role?.name" disabled/></el-form-item><el-form-item label="已会签受灾认定" required><el-select v-model="reportForm.eventId" aria-label="已会签受灾认定"><el-option v-for="e in confirmedEvents" :key="e.id" :value="e.id" :label="e.number+' · '+e.subjectName"/></el-select></el-form-item><el-form-item label="受灾种植主体"><el-input :model-value="selectedEvent?.subjectName || ''" disabled/></el-form-item><el-form-item label="联系人" required><el-input v-model="reportForm.contact"/></el-form-item><el-form-item label="联系方式" required><el-input v-model="reportForm.phone"/></el-form-item></el-form>
            <div class="help-box"><h4>先上报，再发布临时需求</h4><p>本次补充上报不要求预先确定收储主体。</p><p>已会签范围内批量选择整块地，提交后免再审核；县级根据生效记录发布临时收储需求。</p><p>收储主体后续登记联系承接并填报实际收储重量。</p></div>
          </template>
        </div>
        <template v-else-if="step===2">
          <DisasterPlotMap v-if="formType==='event'" :plots="candidatePlots" v-model="eventForm.plotIds"/>
          <DisasterPlotMap v-else :plots="selectedEvent?.plots || []" v-model="reportForm.plotIds" :excluded="reportedPlotIds"/>
          <el-form label-position="top" class="compact-fields"><template v-if="formType==='event'"><el-form-item label="损失面积（亩，选填）"><el-input-number v-model="eventForm.lostArea" :min="0" :controls="false"/></el-form-item></template><template v-else><el-form-item label="受灾作物" required><el-input v-model="reportForm.crop" placeholder="填写作物名称"/></el-form-item><el-form-item label="品种（选填）"><el-input v-model="reportForm.variety"/></el-form-item><el-form-item label="预计收储重量（吨，选填）"><el-input-number v-model="reportForm.estimatedWeight" :min="0" :controls="false"/></el-form-item></template></el-form>
        </template>
        <template v-else>
          <template v-if="formType==='event'">
            <el-form label-position="top"><el-form-item label="专家评估结论" required><el-input v-model="eventForm.assessment" type="textarea" :rows="3" placeholder="说明受灾作物不适合收获为粮食的评估结论"/></el-form-item><el-form-item label="专家评估材料" required><SilAttachments v-model="eventForm.files" editable/></el-form-item></el-form>
            <h4>三名相关领域专家</h4><div v-for="(expert,i) in eventForm.experts" :key="i" class="expert-input"><span>{{ i+1 }}</span><el-input v-model="expert.name" placeholder="姓名"/><el-input v-model="expert.unit" placeholder="单位"/><el-input v-model="expert.field" placeholder="专业领域"/></div>
          </template>
          <template v-else>
            <div class="preview-box"><b>提交预览</b><p>{{ selectedEvent?.subjectName }} · {{ reportForm.crop }} · 已选 {{ reportForm.plotIds.length }} 块 · {{ reportArea.toFixed(1) }}亩</p><p>申报单位：{{ userStore.role?.unit }} · 联系人：{{ reportForm.contact }}</p><p>引用三名专家已签字认定：{{ selectedEvent?.number }}</p></div>
            <h4>关联专家评估材料</h4><SilAttachments :model-value="selectedEvent?.files || []"/>
            <h4>合同 / 订单（选填）</h4><SilAttachments v-model="reportForm.files" editable/>
            <h4>电子承诺书（选填）</h4><el-checkbox v-model="promiseChecked">自愿签署电子承诺书</el-checkbox><el-input v-if="promiseChecked" v-model="promiseText" type="textarea" :rows="3"/><small v-if="promiseChecked" class="muted">演示签署人：{{ userStore.role?.name }}，随本次提交记录文档版本与时间。</small>
          </template>
        </template>
      </template>
      <el-form v-else-if="formType==='demand'" label-position="top" class="single-form"><el-alert :title="'来源：'+current?.number+' · '+current?.subjectName" type="success" :closable="false"/><p>{{ current?.crop }} · {{ current?.area }}亩 · 预计重量 {{ current?.estimatedWeight ?? '未填' }}吨</p><el-form-item label="需求联系人" required><el-input v-model="demandForm.contact"/></el-form-item><el-form-item label="联系方式" required><el-input v-model="demandForm.phone"/></el-form-item><el-form-item label="需求说明（选填）"><el-input v-model="demandForm.description" type="textarea" :rows="3"/></el-form-item></el-form>
      <el-form v-else-if="formType==='acceptance'" label-position="top" class="single-form"><el-alert title="登记联系意向，具体收储安排由双方联系确定。" type="info" :closable="false"/><p>收储主体：{{ userStore.role?.unit }}</p><el-form-item label="承接联系人" required><el-input v-model="acceptanceForm.contact"/></el-form-item><el-form-item label="联系方式" required><el-input v-model="acceptanceForm.phone"/></el-form-item><el-form-item label="联系说明（选填）"><el-input v-model="acceptanceForm.note" type="textarea"/></el-form-item></el-form>
      <el-form v-else label-position="top" :disabled="!isStorage" class="compact-fields"><el-form-item label="实际收储重量（吨）" required><el-input-number v-model="executionForm.weight" :min="0" :controls="false"/></el-form-item><el-form-item label="实际收储价格（元/吨，选填）"><el-input-number v-model="executionForm.price" :min="0" :controls="false"/></el-form-item><el-form-item label="实际产量（吨，选填）"><el-input-number v-model="executionForm.actualYield" :min="0" :controls="false"/></el-form-item><el-form-item label="实际收储日期（选填）"><el-date-picker v-model="executionForm.storageTime" type="date" value-format="YYYY-MM-DD"/></el-form-item></el-form>
      <template #footer><div class="dialog-footer"><el-button :disabled="saving" @click="formVisible=false">取消</el-button><el-button v-if="step>1 && ['event','report'].includes(formType)" @click="step--">上一步</el-button><el-button v-if="step<3 && ['event','report'].includes(formType)" type="primary" @click="nextStep">下一步</el-button><template v-else-if="formType!=='execution'||isStorage"><el-button v-if="formType==='execution'" :disabled="saving" @click="save(false)">保存草稿</el-button><el-button type="primary" :loading="saving" @click="save(true)">{{ formType==='event'?'保存并进入专家会签':formType==='report'?'提交上报并免审生效':formType==='demand'?'发布临时需求':formType==='acceptance'?'登记联系承接':'保存实际收储' }}</el-button></template></div></template>
    </el-dialog>

    <el-dialog v-model="signVisible" title="三名专家会签（演示）" width="min(800px,96vw)" append-to-body destroy-on-close>
      <el-alert title="原型模拟签字操作；逐人签字后保留专家、单位、领域和时间。三人签字完成后受灾范围生效。" type="info" :closable="false"/>
      <div v-for="(expert,i) in current?.experts || []" :key="i" class="expert-sign"><div><b>{{ expert.name }}</b><small>{{ expert.unit }} · {{ expert.field }}</small><small>{{ expert.signedAt || '待签字' }}</small></div><el-tag v-if="expert.signedAt" type="success">已签字</el-tag><el-button v-else type="primary" :loading="saving" @click="sign(i)">模拟 {{ expert.name }} 签字</el-button></div>
      <template #footer><el-button @click="signVisible=false">关闭</el-button><el-button v-if="current?.status==='confirmed' && canReport" type="primary" @click="signVisible=false;newReport(current.id)">进入补充上报</el-button></template>
    </el-dialog>

    <el-dialog v-model="detailVisible" :title="detailTitle" width="min(1000px,96vw)" class="disaster-dialog" top="3vh" append-to-body destroy-on-close>
      <div v-if="current" class="detail-block">
        <el-descriptions :column="mobile?1:2" border><el-descriptions-item label="业务编号">{{ current.number || current.id }}</el-descriptions-item><el-descriptions-item label="种植主体">{{ current.subjectName }}</el-descriptions-item><el-descriptions-item label="行政区">{{ regionName(current.regionCode) }}</el-descriptions-item><el-descriptions-item label="关联受灾认定">{{ linkedEvent?.number || current.eventNumber || '—' }}</el-descriptions-item><el-descriptions-item v-if="current.crop" label="作物">{{ current.crop }} {{ current.variety || '' }}</el-descriptions-item><el-descriptions-item v-if="current.area" label="补充面积">{{ current.area }}亩</el-descriptions-item><el-descriptions-item v-if="current.applicant" label="申报单位">{{ current.applicant.unit }} · {{ current.applicant.name }}</el-descriptions-item><el-descriptions-item v-if="current.publisher" label="发布单位">{{ current.publisher }}</el-descriptions-item><el-descriptions-item v-if="current.storageSubjectName" label="承接收储主体">{{ current.storageSubjectName }}</el-descriptions-item><el-descriptions-item v-if="current.contact" label="联系人">{{ current.contact }} · {{ current.phone }}</el-descriptions-item><el-descriptions-item v-if="current.exemptAudit" label="免审依据">三名专家已会签，围栏内上报免再审核</el-descriptions-item></el-descriptions>
        <template v-if="linkedEvent"><h4>专家评估结论</h4><p>{{ linkedEvent.assessment }}</p><h4>专家评估材料</h4><SilAttachments :model-value="linkedEvent.files"/><div v-for="e in linkedEvent.experts" :key="e.name" class="expert-proof">{{ e.name }} · {{ e.unit }} · {{ e.field }} · {{ e.signedAt || '待签字' }}</div></template>
        <template v-if="detailPlots.length"><h4>整块地范围</h4><DisasterPlotMap :plots="detailPlots" :model-value="detailPlots.map(p=>p.id)" readonly/></template>
        <template v-if="current.files?.length"><h4>本单附件</h4><SilAttachments :model-value="current.files"/></template>
        <template v-if="current.promise"><h4>电子承诺书</h4><p>{{ current.promise.content }}</p><small>{{ current.promise.signer }} · {{ current.promise.signedAt }} · {{ current.promise.version }}</small></template>
        <h4>操作记录</h4><div v-for="(item,i) in current.auditTrail || []" :key="i" class="trail">{{ item.time }} · {{ item.user }} · {{ item.action }}</div><el-empty v-if="!current.auditTrail?.length" description="预置演示记录" :image-size="45"/>
      </div>
      <template #footer><el-button @click="detailVisible=false">关闭</el-button><el-button v-if="detailType==='report'" type="primary" @click="mapLink(current)">查看围栏与一张图</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed,onMounted,reactive,ref,watch } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchDisasterWorkspace,fetchDisasterSubjects,fetchDisasterPlots,saveDisasterEvent,signDisasterEvent,submitDisasterReport,publishDisasterDemand,registerDisasterAcceptance,saveDisasterExecution,canReportDisaster,regionName } from '@/api/silDisaster'
import DisasterPlotMap from './DisasterPlotMap.vue'
import SilAttachments from './SilAttachments.vue'
const props=defineProps({mobile:Boolean,initialTab:{type:String,default:''}})
const router=useRouter(),route=useRoute(),userStore=useUserStore()
const isCounty=computed(()=>userStore.role?.code==='county'),isStorage=computed(()=>userStore.role?.code==='storage_subject'),canReport=computed(()=>canReportDisaster(userStore.role))
const roleNote=computed(()=>isCounty.value?'县级：认定范围、组织会签、代受灾主体上报、发布临时需求。':isStorage.value?'收储主体：查看已发布需求、登记联系承接、填报实际收储。':userStore.role?.code==='grower'?'种植主体：查看本人受灾认定，在已会签范围内补充上报。':'省市管理人员：按辖区查看受灾认定、补充上报、需求与执行情况。')
const tab=ref(props.initialTab || (isStorage.value?'demands':'events')),keyword=ref(''),data=reactive({events:[],reports:[],demands:[],acceptances:[],executions:[]}),loading=ref(false),error=ref('')
const subjects=ref([]),candidatePlots=ref([]),formVisible=ref(false),formType=ref('event'),step=ref(1),saving=ref(false),signVisible=ref(false),detailVisible=ref(false),detailType=ref(''),current=ref(null)
const eventForm=reactive({}),reportForm=reactive({}),demandForm=reactive({}),acceptanceForm=reactive({}),executionForm=reactive({})
const promiseChecked=ref(false),promiseText=ref('本人承诺本次受灾补充收储上报材料真实，所列地块和作物情况准确。')
const confirmedEvents=computed(()=>data.events.filter(row=>row.status==='confirmed'))
const selectedEvent=computed(()=>data.events.find(row=>row.id===reportForm.eventId))
const reportedPlotIds=computed(()=>data.reports.filter(row=>row.eventId===reportForm.eventId).flatMap(row=>row.plotIds))
const reportArea=computed(()=>selectedEvent.value?.plots.filter(p=>reportForm.plotIds?.includes(p.id)).reduce((sum,p)=>sum+Number(p.areaMu),0)||0)
const linkedEvent=computed(()=>detailType.value==='event'?current.value:data.events.find(e=>e.id===current.value?.eventId)||null)
const detailPlots=computed(()=>current.value?.plots||linkedEvent.value?.plots||[])
const detailTitle=computed(()=>({event:'受灾认定与专家评估',report:'补充上报详情',demand:'临时收储需求详情',acceptance:'承接联系详情'}[detailType.value]||'详情'))
const execution=id=>data.executions.find(row=>row.id===id)
const hasAcceptance=id=>data.acceptances.some(row=>row.demandId===id&&row.storageSubjectId===userStore.role?.storageSubjectId)
const filtered=rows=>rows.filter(row=>!keyword.value||(row.id+' '+(row.number||'')+' '+row.subjectName+' '+(row.storageSubjectName||'')+' '+(row.disasterType||'')+' '+(row.crop||'')).includes(keyword.value.trim()))
async function load(){loading.value=true;error.value='';try{const [workspace,subjectRows]=await Promise.all([fetchDisasterWorkspace(userStore.role),fetchDisasterSubjects(userStore.role)]);Object.assign(data,workspace);subjects.value=subjectRows;if(route.query.disasterId){const report=data.reports.find(r=>r.id===route.query.disasterId);if(report)view(report,'report')}}catch(e){error.value='受灾数据加载失败，请刷新重试。'}finally{loading.value=false}}
function resetForm(type){formType.value=type;step.value=1;formVisible.value=true;current.value=null}
function newEvent(){resetForm('event');Object.assign(eventForm,{subjectId:'',disasterType:'',occurredAt:'',year:String(new Date().getFullYear()),plotIds:[],lostArea:null,assessment:'',files:[],experts:Array.from({length:3},()=>({name:'',unit:'',field:''}))})}
function newReport(eventId){resetForm('report');Object.assign(reportForm,{eventId:eventId||confirmedEvents.value[0]?.id||'',plotIds:[],crop:'',variety:'',estimatedWeight:null,contact:userStore.role?.name||'',phone:'',files:[]});promiseChecked.value=false;tab.value='reports'}
function newDemand(report){resetForm('demand');current.value=report;Object.assign(demandForm,{reportId:report.id,contact:userStore.role?.name||'',phone:'',description:''})}
function newAcceptance(demand){resetForm('acceptance');current.value=demand;Object.assign(acceptanceForm,{demandId:demand.id,contact:userStore.role?.name||'',phone:'',note:''})}
function editExecution(acceptance){resetForm('execution');current.value=acceptance;Object.assign(executionForm,{acceptanceId:acceptance.id,weight:null,price:null,actualYield:null,storageTime:''},execution(acceptance.id)||{})}
function nextStep(){
  if(step.value===1){if(formType.value==='event'&&(!eventForm.subjectId||!eventForm.disasterType||!eventForm.occurredAt))return ElMessage.warning('请填写受灾主体、灾情类型与发生日期');if(formType.value==='report'&&(!reportForm.eventId||!reportForm.contact||!reportForm.phone))return ElMessage.warning('请确认受灾认定、联系人和联系方式')}
  if(step.value===2){const ids=formType.value==='event'?eventForm.plotIds:reportForm.plotIds;if(!ids?.length)return ElMessage.warning('请在地图或列表选择至少一个整块地');if(formType.value==='report'&&!reportForm.crop)return ElMessage.warning('请填写受灾作物')}
  step.value++
}
async function save(submit){
  if(saving.value)return;saving.value=true
  try{
    let result
    if(formType.value==='event')result=await saveDisasterEvent({...eventForm},userStore.role)
    else if(formType.value==='report')result=await submitDisasterReport({...reportForm,promise:promiseChecked.value?{content:promiseText.value,signer:userStore.role.name,signedAt:new Date().toLocaleString('sv-SE'),version:'演示V1.0'}:null},userStore.role)
    else if(formType.value==='demand')result=await publishDisasterDemand({...demandForm},userStore.role)
    else if(formType.value==='acceptance')result=await registerDisasterAcceptance({...acceptanceForm},userStore.role)
    else result=await saveDisasterExecution({...executionForm,submit},userStore.role)
    if(!result.success)return ElMessage.error(result.message)
    formVisible.value=false;ElMessage.success(formType.value==='report'?'补充上报已免审生效，可由县级发布临时需求':'保存成功')
    await load()
    if(formType.value==='event'){tab.value='events';openSign(data.events.find(row=>row.id===result.id))}
    else tab.value=formType.value==='report'?'reports':formType.value==='demand'?'demands':'executions'
  }catch(e){ElMessage.error(e.message||'操作失败，请重试')}finally{saving.value=false}
}
function openSign(event){current.value=event;signVisible.value=true}
async function sign(index){if(saving.value)return;saving.value=true;try{const result=await signDisasterEvent(current.value.id,index,userStore.role);if(!result.success)return ElMessage.error(result.message);const id=current.value.id;await load();current.value=data.events.find(e=>e.id===id);ElMessage.success(current.value.status==='confirmed'?'三名专家会签完成，受灾范围已生效':'专家签字已记录')}catch(e){ElMessage.error(e.message)}finally{saving.value=false}}
function view(record,type){current.value=record;detailType.value=type;detailVisible.value=true}
function mapLink(report){detailVisible.value=false;router.push({path:'/onemap/silage',query:{id:report.id,type:'disaster'}})}
let plotRequest=0
watch(()=>eventForm.subjectId,async id=>{eventForm.plotIds=[];candidatePlots.value=[];const token=++plotRequest;if(id){try{const rows=await fetchDisasterPlots(id,userStore.role);if(token===plotRequest)candidatePlots.value=rows}catch{ElMessage.error('地块加载失败，请重新选择主体')}}})
watch(()=>reportForm.eventId,()=>{reportForm.plotIds=[]})
watch(()=>userStore.role?.code,()=>{formVisible.value=false;detailVisible.value=false;signVisible.value=false;tab.value=props.initialTab || (isStorage.value?'demands':'events');load()})
onMounted(load)
</script>
<style scoped>
.disaster-workspace{min-width:0;color:#344054}.workspace-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}.workspace-head h2{margin:0;font-size:22px;color:#253e59}.workspace-head p{font-size:13px;color:#7a8a9c;line-height:1.8;margin:8px 0}.role-note{border-left:3px solid #269a7f;padding:9px 12px;background:#f0f8f5;font-size:12px;line-height:1.7;margin:12px 0}.list-head{display:flex;gap:12px;margin:10px 0 16px}.list-head>.el-input{max-width:440px}.record-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.record-card{padding:17px;border:1px solid #dfe8ef;border-radius:10px;background:#fff;min-width:0}.record-title{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.record-title b{font-size:15px;line-height:1.7}.record-title .el-tag{flex-shrink:0}.record-card>small{display:block;overflow-wrap:anywhere;color:#99a5b3;font-size:11px;margin:8px 0}.record-card p{font-size:12px;line-height:1.8;color:#74869a;margin:6px 0}.record-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px;padding-top:8px;border-top:1px solid #eff2f5}.record-actions .el-button{margin:0;font-size:12px}.mobile .workspace-head h2{font-size:16px}.mobile .workspace-head p{font-size:11px}.mobile .record-list{grid-template-columns:minmax(0,1fr)}.mobile .list-head{flex-wrap:wrap}.mobile .list-head>.el-input{max-width:none}.mobile :deep(.el-tabs__item){padding:0 11px;font-size:12px}.step-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-bottom:22px}.step-nav span{padding:10px;background:#f1f4f7;font-size:13px;text-align:center;color:#8b99a8;border-radius:6px}.step-nav .active{background:#eaf6f1;color:#16856d;font-weight:600}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:25px}.form-grid :deep(.el-select),.form-grid :deep(.el-date-editor){width:100%}.help-box{background:#f5f8fb;border:1px solid #e1e8ef;border-radius:9px;padding:18px;line-height:1.9;color:#6b8094;font-size:13px}.help-box h4{margin:0;color:#294861}.compact-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px;margin-top:20px}.compact-fields :deep(.el-input-number),.compact-fields :deep(.el-date-editor){width:100%}.expert-input{display:grid;grid-template-columns:20px 1fr 1.5fr 1fr;gap:10px;margin-bottom:12px;align-items:center}.expert-sign{display:flex;align-items:center;gap:12px;padding:18px 0;border-bottom:1px solid #e8eef3}.expert-sign>div{flex:1}.expert-sign small{display:block;color:#8996a5;font-size:12px;margin-top:7px}.preview-box{padding:15px;background:#eff8f4;border-radius:8px;font-size:13px;line-height:1.8}.muted{display:block;color:#96a1ac;font-size:11px;margin-top:7px}.dialog-footer{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.dialog-footer .el-button{margin:0}.detail-block{line-height:1.8}.detail-block h4{margin:20px 0 10px;color:#2c4966}.detail-block p{font-size:13px}.trail,.expert-proof{font-size:12px;color:#75869a;padding:6px;border-bottom:1px solid #edf2f5}.single-form{max-width:700px;margin:auto}@media(max-width:750px){.record-list{grid-template-columns:minmax(0,1fr)}.workspace-head h2{font-size:18px}.form-grid{grid-template-columns:minmax(0,1fr)}.help-box{padding:12px;font-size:12px}.expert-input{grid-template-columns:20px minmax(0,1fr);gap:6px}.expert-input .el-input:nth-child(n+3){grid-column:2}.compact-fields{grid-template-columns:minmax(0,1fr)}.list-head{flex-wrap:wrap}.step-nav span{font-size:11px;padding:9px 2px}.expert-sign{flex-wrap:wrap}.record-card{padding:13px}}
</style>
<style>.disaster-dialog .el-dialog__body{max-height:calc(94vh - 155px);overflow-y:auto}.disaster-dialog .el-dialog__footer{border-top:1px solid #e8eef3;padding-top:12px}.disaster-dialog .el-descriptions__content{word-break:break-word}@media(max-width:650px){.disaster-dialog{padding:12px}}</style>

