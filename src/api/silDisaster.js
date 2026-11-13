// 原型2.0受灾流程；用户2026-11-12确认：认定/三名会签→补充上报免审→需求发布→承接/实际收储。
// 与历史受灾演示数据隔离。仅浏览器演示，不代表真实电子签署或生产接口。
import { mockRequest } from './request'
import { GROW_SUBJECTS, PLOTS } from '@/mock/geo/plot-gen'
import { REGION_MAP } from '@/mock/common/regions'
const KEY = 'ah_sil_v2_disaster_workflow'
const clone = value => JSON.parse(JSON.stringify(value))
const now = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
const uid = prefix => prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || clone(fallback) } catch { return clone(fallback) } }
const allPlots = () => read('ah_sil_plots', PLOTS)
const allSubjects = () => read('ah_sil_growers', GROW_SUBJECTS)
const area = plots => Number(plots.reduce((sum, plot) => sum + Number(plot.areaMu || 0), 0).toFixed(2))
const trail = (action, role) => ({ action, time: now(), user: role.name + '（' + role.roleName + '）' })
const result = fn => mockRequest(() => { try { return fn() } catch (error) { return { success: false, message: error.message } } }, 80)
const seeds = () => {
  const subject = GROW_SUBJECTS.find(row => row.id === 'SUB-0001')
  const plots = PLOTS.filter(row => row.subjectId === subject.id && row.geometry).slice(-3)
  const expert = ['张海', '李蓉', '王磊'].map((name, index) => ({ name, unit: '农业技术专家组（演示）', field: '作物栽培', signedAt: '2026-11-10 09:0' + index + ':00' }))
  const event = { id: 'DZ-DEMO-01', number: '受灾认定-示例01', subjectId: subject.id, subjectName: subject.name, regionCode: subject.regionCode.slice(0, 6), year: 2026, disasterType: '渍涝', occurredAt: '2026-11-09', plots, plotIds: plots.map(row => row.id), affectedArea: area(plots), lostArea: area(plots), assessment: '受灾作物经专家评估，不适合收获为粮食，可补充青贮收储。', files: [{name:'专家评估意见-演示.txt', dataUrl:'data:text/plain;charset=utf-8,' + encodeURIComponent('演示专家评估意见：所列受灾地块作物不适合收获为粮食。此材料仅用于原型演示。')}], experts: expert, status: 'confirmed', createdAt:'2026-11-10 09:00:00', auditTrail:[] }
  const report = { id:'DZ-REPORT-DEMO-01', number:'补充上报-示例01', eventId:event.id, eventNumber:event.number, subjectId:subject.id, subjectName:subject.name, regionCode:event.regionCode, year:2026, plots:[plots[0]], plotIds:[plots[0].id], area:area([plots[0]]), estimatedWeight:100, crop:'玉米', variety:'演示品种', contact:'陈勇', phone:'13900001234', files:[], promise:null, applicant:{code:'grower',name:'陈勇',unit:subject.name,roleName:'种植主体'}, status:'effective', exemptAudit:true, createdAt:'2026-11-10 10:00:00', auditTrail:[] }
  const demand = {id:'DZ-DEMAND-DEMO-01', number:'临时需求-示例01', reportId:report.id, eventId:event.id, subjectName:subject.name, regionCode:event.regionCode, crop:report.crop, area:report.area, estimatedWeight:100, contact:'王芳', phone:'13900005678', description:'受灾玉米临时收储，请有需求的养殖主体联系。', status:'published', publisher:'太和县农业农村局', publishedAt:'2026-11-10 11:00:00', auditTrail:[]}
  return { events:[event], reports:[report], demands:[demand], acceptances:[], executions:[] }
}
const db = () => read(KEY, seeds())
const write = data => localStorage.setItem(KEY, JSON.stringify(data))
export const canReportDisaster = role => ['county','grower'].includes(role?.code)
const managerScope = (record, role) => role?.code === 'province' || (['city','county'].includes(role?.code) && String(record.regionCode).startsWith(String(role.regionCode).slice(0, role.code === 'city' ? 4 : 6)))
const own = (record, role) => role?.code === 'grower' && record.subjectId === role.subjectId
const inScope = (record, role) => managerScope(record, role) || own(record, role)
const canSeeReport = (record, role, data) => inScope(record,role) || (role?.code === 'storage_subject' && data.acceptances.some(row=>row.storageSubjectId===role.storageSubjectId && row.reportId===record.id))
const requireCounty = (record, role) => { if (role?.code !== 'county' || !managerScope(record,role)) throw new Error('仅所属县级农业农村部门用户可操作') }
const num = (value, label, required=false) => {
  if (value === null || value === undefined || value === '') {if(required) throw new Error(label + '必填'); return null}
  if (!Number.isFinite(Number(value)) || Number(value)<0 || (required && Number(value)<=0)) throw new Error(label + '须为' + (required?'正数':'非负数'))
  return Number(value)
}
export const fetchDisasterWorkspace = role => mockRequest(() => {
  const data = db()
  return {
    events: data.events.filter(row=>inScope(row,role)||(role?.code==='storage_subject'&&data.acceptances.some(a=>a.eventId===row.id&&a.storageSubjectId===role.storageSubjectId))),
    reports: data.reports.filter(row=>canSeeReport(row,role,data)),
    demands: role?.code === 'storage_subject' ? data.demands.filter(row=>row.status==='published') : data.demands.filter(row=>inScope(row,role)),
    acceptances: data.acceptances.filter(row=>managerScope(row,role)||own(row,role)||(role?.code==='storage_subject'&&row.storageSubjectId===role.storageSubjectId)),
    executions: data.executions.filter(row=>canSeeReport(data.reports.find(report=>report.id===row.reportId)||{},role,data)),
  }
},80)
export const fetchDisasterSubjects = role => mockRequest(()=>allSubjects().filter(row=>managerScope(row,role)||own(row,role)),80)
export const fetchDisasterPlots = (subjectId, role) => mockRequest(()=>{
  const subject = allSubjects().find(row=>row.id===subjectId)
  return subject && inScope(subject,role) ? allPlots().filter(row=>row.subjectId===subjectId) : []
},80)
export const saveDisasterEvent = (input, role) => result(()=>{
  const subject=allSubjects().find(row=>row.id===input.subjectId)
  if(!subject) throw new Error('请选择受灾种植主体')
  requireCounty(subject,role)
  if(!input.disasterType || !input.occurredAt || !String(input.assessment||'').trim()) throw new Error('请填写灾情类型、发生日期和专家评估结论')
  if(!input.files?.length) throw new Error('请上传专家评估材料')
  const ids=[...new Set(input.plotIds||[])], plots=allPlots().filter(row=>ids.includes(row.id))
  if(!ids.length || plots.length!==ids.length || plots.some(row=>row.subjectId!==subject.id || !row.geometry)) throw new Error('请选择该种植主体有边界的整块受灾地块')
  const experts=(input.experts||[]).map(row=>({name:String(row.name||'').trim(),unit:String(row.unit||'').trim(),field:String(row.field||'').trim(),signedAt:''}))
  if(experts.length!==3 || experts.some(row=>!row.name||!row.unit||!row.field) || new Set(experts.map(row=>row.name)).size!==3) throw new Error('请填写三名不同专家的姓名、单位和领域')
  const data=db(), event={id:uid('DZ'),number:uid('受灾认定'),subjectId:subject.id,subjectName:subject.name,regionCode:String(subject.regionCode).slice(0,6),year:Number(input.year),disasterType:input.disasterType,occurredAt:input.occurredAt,plots:clone(plots),plotIds:ids,affectedArea:area(plots),lostArea:num(input.lostArea,'损失面积'),assessment:input.assessment,files:input.files,experts,status:'signing',createdAt:now(),auditTrail:[trail('登记受灾范围及专家评估材料',role)]}
  if(event.lostArea!==null && event.lostArea>event.affectedArea) throw new Error('损失面积不能超过受灾地块总面积')
  data.events.unshift(event);write(data);return{success:true,id:event.id}
})
export const signDisasterEvent = (id, index, role) => result(()=>{
  const data=db(), event=data.events.find(row=>row.id===id)
  if(!event) throw new Error('受灾认定不存在')
  requireCounty(event,role)
  const expert=event.experts[index]
  if(!expert||expert.signedAt||event.status!=='signing') throw new Error('当前专家已签字或记录不可会签')
  expert.signedAt=now();event.auditTrail.push(trail('演示专家会签：'+expert.name,role))
  if(event.experts.every(row=>row.signedAt)){event.status='confirmed';event.confirmedAt=now()}
  write(data);return{success:true}
})
export const submitDisasterReport = (input, role) => result(()=>{
  const data=db(),event=data.events.find(row=>row.id===input.eventId)
  if(!canReportDisaster(role)||!event||!inScope(event,role)) throw new Error('仅本人种植主体或所属县级用户可补充上报')
  if(event.status!=='confirmed'||!event.experts.every(row=>row.signedAt)) throw new Error('受灾范围尚未完成三名专家会签')
  const ids=[...new Set(input.plotIds||[])],plots=event.plots.filter(row=>ids.includes(row.id))
  if(!ids.length||plots.length!==ids.length) throw new Error('请从已会签受灾围栏内选择整块地')
  const duplicate=data.reports.find(row=>row.eventId===event.id&&row.plotIds.some(id=>ids.includes(id)))
  if(duplicate) throw new Error('同一受灾认定下地块已上报：'+duplicate.number+'，请核对原记录')
  if(!input.crop||!String(input.contact||'').trim()||!String(input.phone||'').trim()) throw new Error('请填写作物、联系人和联系方式')
  const report={id:uid('DZ-REPORT'),number:uid('补充上报'),eventId:event.id,eventNumber:event.number,subjectId:event.subjectId,subjectName:event.subjectName,regionCode:event.regionCode,year:event.year,plots:clone(plots),plotIds:ids,area:area(plots),estimatedWeight:num(input.estimatedWeight,'预计收储重量'),crop:input.crop,variety:input.variety||'',contact:input.contact,phone:input.phone,files:input.files||[],promise:input.promise||null,applicant:{code:role.code,name:role.name,unit:role.unit,roleName:role.roleName},status:'effective',exemptAudit:true,createdAt:now(),auditTrail:[trail('提交补充上报，引用三名专家会签结果，免再审核生效',role)]}
  data.reports.unshift(report);write(data);return{success:true,id:report.id}
})
export const publishDisasterDemand = (input, role) => result(()=>{
  const data=db(),report=data.reports.find(row=>row.id===input.reportId)
  if(!report) throw new Error('请先完成受灾主体补充上报')
  requireCounty(report,role)
  if(data.demands.some(row=>row.reportId===report.id)) throw new Error('该补充上报已发布需求，请查看原需求')
  if(!String(input.contact||'').trim()||!String(input.phone||'').trim()) throw new Error('请填写需求联系人和联系方式')
  const demand={id:uid('DZ-DEMAND'),number:uid('临时需求'),reportId:report.id,eventId:report.eventId,subjectId:report.subjectId,subjectName:report.subjectName,regionCode:report.regionCode,crop:report.crop,area:report.area,estimatedWeight:report.estimatedWeight,contact:input.contact,phone:input.phone,description:input.description||'',status:'published',publisher:role.unit,publishedAt:now(),auditTrail:[trail('发布临时收储需求',role)]}
  data.demands.unshift(demand);write(data);return{success:true,id:demand.id}
})
export const registerDisasterAcceptance = (input, role) => result(()=>{
  const data=db(),demand=data.demands.find(row=>row.id===input.demandId&&row.status==='published')
  if(role?.code!=='storage_subject'||!role.storageSubjectId) throw new Error('仅绑定收储主体的用户可登记承接')
  if(!demand) throw new Error('临时需求不存在')
  if(!input.contact||!input.phone) throw new Error('请填写承接联系人和联系方式')
  // 登记联系意向，不分配或锁定地块份额，不暗设独家承接规则。
  if(data.acceptances.some(row=>row.demandId===demand.id&&row.storageSubjectId===role.storageSubjectId)) throw new Error('本主体已登记联系意向，请查看承接记录')
  const report=data.reports.find(row=>row.id===demand.reportId)
  const record={id:uid('DZ-ACCEPT'),demandId:demand.id,reportId:report.id,eventId:report.eventId,subjectId:report.subjectId,subjectName:report.subjectName,regionCode:report.regionCode,storageSubjectId:role.storageSubjectId,storageSubjectName:role.unit,contact:input.contact,phone:input.phone,note:input.note||'',status:'registered',registeredAt:now(),auditTrail:[trail('登记承接联系意向',role)]}
  data.acceptances.unshift(record);write(data);return{success:true,id:record.id}
})
export const saveDisasterExecution = (input, role) => result(()=>{
  const data=db(),acceptance=data.acceptances.find(row=>row.id===input.acceptanceId)
  if(role?.code!=='storage_subject'||!acceptance||acceptance.storageSubjectId!==role.storageSubjectId) throw new Error('仅承接收储主体可填报实际收储')
  const weight=num(input.weight,'实际收储重量',!!input.submit)
  const row={...input,id:input.acceptanceId,reportId:acceptance.reportId,weight,price:num(input.price,'实际收储价格'),actualYield:num(input.actualYield,'实际产量'),storageTime:input.storageTime||'',status:input.submit?'已填报':'草稿',updatedAt:now(),operator:role.name,auditTrail:[...(data.executions.find(row=>row.id===input.acceptanceId)?.auditTrail||[]),trail(input.submit?'填报实际收储':'保存实际收储草稿',role)]}
  data.executions=[row,...data.executions.filter(item=>item.id!==row.id)];write(data);return{success:true}
})
export const fetchDisasterFences = role => mockRequest(()=>{
  const data=db()
  return data.reports.filter(row=>canSeeReport(row,role,data)).map(row=>({...row,id:'DIS-FENCE-'+row.id,declarationId:row.id,filedNo:row.number,storageSubjectName:'受灾补充：'+row.subjectName,plotDetails:row.plots.map(plot=>({...plot,plotId:plot.id,subjectName:row.subjectName,crop:row.crop,variety:row.variety})),createdAt:row.createdAt,source:'disaster',event:data.events.find(event=>event.id===row.eventId)}))
},80)
export const regionName = code => REGION_MAP[code]?.name || code
export const disasterFiles = async files => Promise.all(Array.from(files).map(file=>new Promise((resolve,reject)=>{
  if(file.size>8*1024*1024) return reject(new Error('单个附件限8MB，请选择较小文件'))
  const reader=new FileReader();reader.onload=()=>resolve({name:file.name,size:file.size,type:file.type,dataUrl:reader.result});reader.onerror=()=>reject(new Error('文件读取失败，请重试'));reader.readAsDataURL(file)
})))

