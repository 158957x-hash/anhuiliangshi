// 原型 2.0 普通一体化申报：与旧演示数据隔离，不迁移或删除旧记录。
import { mockRequest } from './request'
import { GROW_SUBJECTS, PLOTS } from '@/mock/geo/plot-gen'
import { REGION_MAP } from '@/mock/common/regions'

const KEYS = { subjects: 'ah_sil_v2_storage_subjects', applications: 'ah_sil_v2_applications', ledgers: 'ah_sil_v2_execution' }
const clone = value => JSON.parse(JSON.stringify(value))
const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : clone(fallback) } catch { return clone(fallback) } }
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const now = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
const result = fn => mockRequest(() => { try { return fn() } catch (error) { return { success: false, message: error.message } } }, 100, 200)
const number = (value, label, required = false) => {
  if (value === '' || value === null || value === undefined) { if (required) throw new Error(`请填写${label}`); return null }
  if (!Number.isFinite(Number(value)) || Number(value) < 0 || (required && Number(value) === 0)) throw new Error(`${label}格式不正确`)
  return Number(value)
}
export const canSubmitOrdinary = role => ['grower', 'storage_subject', 'county'].includes(role?.code)
export const canAuditOrdinary = role => ['county'].includes(role?.code)
// 用户确认：省级、县级管理人员维护收储主体。
export const storageMaintenancePending = false
export const canManageStorageSubjects = role => ['province', 'county'].includes(role?.code)
export const STORAGE_SUBJECT_TYPES = { livestock_household: '养殖户', livestock_enterprise: '养殖企业', third_party: '第三方收储机构' }
const subjectSeeds = [
  { id: 'STO-001', name: '太和县牧业发展有限公司', type: 'livestock_enterprise', owner: '周牧', phone: '13900001234', regionCode: '341222', regionName: '太和县', address: '太和县牧业示范园（演示）', credential: '', status: '启用', createdAt: '2026-11-10 09:00:00', updatedAt: '2026-11-10 09:00:00' },
  { id: 'STO-002', name: '赵家养殖户', type: 'livestock_household', owner: '赵牧', phone: '13800001234', regionCode: '341222', regionName: '太和县', address: '太和县养殖示范区（演示）', credential: '', status: '启用', createdAt: '2026-11-10 09:00:00', updatedAt: '2026-11-10 09:00:00' },
  { id: 'STO-003', name: '涡阳县青禾收储服务有限公司', type: 'third_party', owner: '马丰', phone: '13700001234', regionCode: '341622', regionName: '涡阳县', address: '涡阳县收储服务园（演示）', credential: '', status: '启用', createdAt: '2026-11-10 09:00:00', updatedAt: '2026-11-10 09:00:00' }
]
const storageSubjects = () => read(KEYS.subjects, subjectSeeds)
export const fetchStorageSubjects = role => mockRequest(() => role ? storageSubjects() : [], 100, 200)
export const saveStorageSubject = (data, role) => result(() => {
  if (!canManageStorageSubjects(role)) throw new Error('仅省级、县级管理人员可维护收储主体')
  if (!data.name || !STORAGE_SUBJECT_TYPES[data.type] || !data.owner || !data.phone || !data.regionCode || !data.address) throw new Error('请补齐收储主体基础信息')
  const all = storageSubjects(); const old = all.find(item => item.id === data.id)
  if (role.code === 'county' && (!String(data.regionCode).startsWith(role.regionCode) || (old && !String(old.regionCode).startsWith(role.regionCode)))) throw new Error('县级只能维护本辖区收储主体')
  const item = { ...data, id: old?.id || `STO-${Date.now()}`, createdAt: old?.createdAt || now(), updatedAt: now() }
  write(KEYS.subjects, [item, ...all.filter(row => row.id !== item.id)])
  return { success: true, id: item.id }
})
const allGrowers = () => read('ah_sil_growers', GROW_SUBJECTS)
const allPlots = () => read('ah_sil_plots', PLOTS)
export const searchPlantingSubjects = (keyword, role) => mockRequest(() => {
  const query = String(keyword || '').trim()
  if (!role || !query) return []
  return allGrowers().filter(item => `${item.id} ${item.name} ${item.owner}`.includes(query))
}, 100, 200)
export const fetchPlantingSubjects = (filters = {}, role) => mockRequest(() => {
  if (!role) return []
  const keyword = String(filters.keyword || '').trim()
  const owner = String(filters.owner || '').trim()
  const region = String(filters.region || '').trim()
  const type = String(filters.type || '').trim()
  const status = String(filters.status || '').trim()
  return allGrowers().filter(item => {
    const regionName = item.regionName || REGION_MAP[item.regionCode]?.name || ''
    return (!keyword || `${item.id} ${item.name} ${item.owner}`.includes(keyword)) &&
      (!owner || String(item.owner || '').includes(owner)) &&
      (!region || `${regionName} ${item.regionCode || ''}`.includes(region)) &&
      (!type || item.type === type) && (!status || (item.status || '启用') === status)
  }).map(item => ({ ...item, regionName: item.regionName || REGION_MAP[item.regionCode]?.name || item.regionCode }))
}, 100, 200)
export const searchOrdinaryPlots = (subjectIds, role) => mockRequest(() => {
  if (!role || !subjectIds?.length) return []
  const ids = new Set(subjectIds)
  return allPlots().filter(plot => ids.has(plot.subjectId)).map(plot => ({ ...plot, subjectName: allGrowers().find(subject => subject.id === plot.subjectId)?.name || plot.subjectName || '未登记主体', location: plot.location || (plot.center ? `${plot.center[0].toFixed(5)}, ${plot.center[1].toFixed(5)}` : '') }))
}, 100, 200)
const makeDetail = (plot, index = 0) => ({ plotId: plot.id, name: plot.name, subjectId: plot.subjectId, subjectName: GROW_SUBJECTS.find(s => s.id === plot.subjectId)?.name, areaMu: plot.areaMu, location: plot.location || '', center: plot.center, regionCode: plot.regionCode, geometry: plot.geometry, crop: index % 2 ? 'barley' : 'oat', variety: index % 2 ? '大麦演示品种' : '燕麦演示品种', expectedYield: Math.round(plot.areaMu * 2), expectedPrice: null, expectedWeight: null })
const seeds = () => {
  const chosen = PLOTS.filter(plot => plot.subjectId === 'SUB-0001' && plot.geometry)
  const roles = [ ['grower', '陈勇', '太和县丰乐种植专业合作社'], ['storage_subject', '周牧', '太和县牧业发展有限公司'], ['county', '刘敏', '太和县农业农村局'] ]
  return ['filed', 'pending', 'returned', 'draft'].map((status, index) => {
    const role = roles[index === 1 ? 1 : index === 2 ? 2 : 0]
    // 四份不同状态示例使用互不重复的地块，不暗设跨单重复覆盖规则。
    const plotDetails = [makeDetail(chosen[index], index)]
    const applicant = { code: role[0], name: role[1], unit: role[2], roleName: role[0] === 'county' ? '县级农业农村部门用户' : role[0] === 'grower' ? '种植主体' : '收储主体' }
    return { id: `QZ-YT-DEMO-00${index + 1}`, declarationType: 'ordinary', storageSubjectId: 'STO-001', storageSubjectName: subjectSeeds[0].name, storageSubject: subjectSeeds[0], applicant, applicantContact: role[1], applicantPhone: '13900001234', year: 2027, season: '春夏季', implementationTime: '2027-04', usage: 'self', plotDetails, plotIds: plotDetails.map(p => p.plotId), regionCodes: ['341222'], area: plotDetails[0].areaMu, expectedYield: plotDetails[0].expectedYield, weight: null, expectedAmount: null, attachments: [], promise: { content: '本人承诺本次申报材料真实，所列地块、种植和收储计划准确。', version: 'V1.0', signer: role[1], signedAt: status === 'draft' ? '' : '2026-11-10 09:00:00' }, status, filedNo: status === 'filed' ? '皖青贮备〔2027〕示例0001号' : '', createdAt: '2026-11-10 09:00:00', submittedAt: status === 'draft' ? '' : '2026-11-10 10:00:00', auditTrail: status === 'returned' ? [{ action: '退回补正', time: '2026-11-10 11:00:00', user: '王芳（县级审核）', opinion: '请补充品种信息并核对地块预计产量。' }] : status === 'filed' ? [{ action: '审核通过并备案', time: '2026-11-10 11:00:00', user: '王芳（县级审核）', opinion: '同意备案。' }] : [] }
  })
}
const applications = () => read(KEYS.applications, seeds())
export const isOrdinaryOwner = (app, role) => !!role && app.applicant?.code === role.code && app.applicant?.name === role.name
const inScope = (app, role) => {
  if (!role) return false
  if (role.code === 'province') return true
  if (['city', 'county'].includes(role.code)) { const prefix = role.code === 'city' ? String(role.regionCode).slice(0, 4) : String(role.regionCode); return (app.regionCodes || []).some(code => String(code).startsWith(prefix)) || isOrdinaryOwner(app, role) }
  return isOrdinaryOwner(app, role) || (role.storageSubjectId && role.storageSubjectId === app.storageSubjectId) || (['grower'].includes(role.code) && app.plotDetails?.some(plot => plot.subjectId === role.subjectId))
}
export const fetchOrdinaryApplications = role => mockRequest(() => applications().filter(app => inScope(app, role)), 100, 200)
export const fetchOrdinaryApplication = (id, role) => mockRequest(() => applications().find(app => app.id === id && inScope(app, role)) || null, 100, 200)
export const saveOrdinaryApplication = (data, role, submit = false) => result(() => {
  if (!canSubmitOrdinary(role)) throw new Error('当前身份不能填报普通收储申报')
  const all = applications(); const old = all.find(app => app.id === data.id)
  if (data.id && !old) throw new Error('原申报不存在，请返回申报列表')
  if (old && (!isOrdinaryOwner(old, role) || !['draft', 'returned'].includes(old.status))) throw new Error('仅申报人可修改草稿或退回单据')
  const storageSubject = storageSubjects().find(item => item.id === data.storageSubjectId)
  const detailIds = new Set(); const plotDetails = (data.plotDetails || []).map(detail => {
    if (detailIds.has(detail.plotId)) throw new Error('同一份申报不能重复选择同一地块')
    detailIds.add(detail.plotId)
    const plot = allPlots().find(item => item.id === detail.plotId)
    if (!plot) throw new Error('地块档案不存在，请重新选择')
    if (submit && !plot.geometry) throw new Error(`${plot.name}缺少边界，无法形成精确备案范围`)
    if (submit && (!detail.crop || !String(detail.variety || '').trim())) throw new Error(`${plot.name}请补齐作物和品种`)
    return { ...detail, plotId: plot.id, name: plot.name, areaMu: plot.areaMu, location: plot.location || '', center: plot.center, geometry: plot.geometry, subjectId: plot.subjectId, subjectName: allGrowers().find(s => s.id === plot.subjectId)?.name || detail.subjectName, regionCode: plot.regionCode, expectedYield: number(detail.expectedYield, '地块预计产量', submit), expectedPrice: number(detail.expectedPrice, '预计收储价格'), expectedWeight: number(detail.expectedWeight, '预计收储重量') }
  })
  if (submit) {
    if (!storageSubject || storageSubject.status !== '启用') throw new Error('请选择启用的收储主体')
    if (!data.applicantContact || !data.applicantPhone) throw new Error('请填写申报联系人和联系方式')
    if (!data.year || data.season !== '春夏季') throw new Error('普通申报应填写计划年度，收储范围固定为春夏季')
    if (!plotDetails.length) throw new Error('请按图选择至少一个地块')
    if (!['self', 'sell'].includes(data.usage)) throw new Error('请选择收储用途')
    if (data.usage === 'sell' && !data.attachments?.length) throw new Error('出售用途请上传订单或合同')
    if (!data.promise?.signedAt || !data.promise?.content || !data.promise?.signer) throw new Error('请签署电子承诺书')
    const duplicate = all.find(app => app.id !== old?.id && ['pending', 'filed'].includes(app.status) && Number(app.year) === Number(data.year) && app.plotDetails.some(other => plotDetails.some(detail => detail.plotId === other.plotId)))
    if (duplicate) throw new Error(`重复地块：同一计划年度已存在待审或已备案申报 ${duplicate.id}，请核对原申报；退回补正请修改原单`)
    const counties = new Set(plotDetails.map(plot => String(plot.regionCode).slice(0, 6)))
    if (counties.size > 1) throw new Error('一份普通申报不能包含不同县的地块，请按县分别申报')
  }
  const applicant = old?.applicant || { code: role.code, name: role.name, unit: role.unit, roleName: role.roleName }
  const filledWeights = plotDetails.filter(p => p.expectedWeight !== null)
  const amountDetails = plotDetails.filter(p => p.expectedWeight !== null && p.expectedPrice !== null)
  const item = { ...data, id: old?.id || `QZ-YT-${Date.now()}`, declarationType: 'ordinary', applicant, storageSubjectId: storageSubject?.id || '', storageSubjectName: storageSubject?.name || '', storageSubject: storageSubject || null, plotDetails, plotIds: [...detailIds], regionCodes: [...new Set(plotDetails.map(p => p.regionCode))], area: plotDetails.reduce((s,p) => s + Number(p.areaMu), 0), expectedYield: plotDetails.reduce((s,p) => s + Number(p.expectedYield || 0), 0), weight: filledWeights.length ? filledWeights.reduce((s,p) => s + p.expectedWeight, 0) : null, weightIncomplete: filledWeights.length < plotDetails.length, expectedAmount: amountDetails.length ? amountDetails.reduce((s,p) => s + p.expectedPrice * p.expectedWeight, 0) : null, status: submit ? 'pending' : old?.status === 'returned' ? 'returned' : 'draft', filedNo: '', attachments: data.usage === 'sell' ? data.attachments || [] : [], createdAt: old?.createdAt || now(), submittedAt: submit ? now() : old?.submittedAt || '', auditTrail: [...(old?.auditTrail || []), { action: submit ? old?.status === 'returned' ? '补正重提（审核期限重新计算）' : '提交整单申报' : '保存草稿', time: now(), user: `${role.name}（${role.roleName}）` }] }
  write(KEYS.applications, [item, ...all.filter(app => app.id !== item.id)])
  return { success: true, id: item.id }
})
export const auditOrdinaryApplication = (id, action, opinion, role) => result(() => {
  if (!canAuditOrdinary(role)) throw new Error('仅县级审核身份可处理普通收储申报')
  if (!['pass', 'return', 'reject'].includes(action)) throw new Error('未知审核操作')
  const all = applications(); const app = all.find(row => row.id === id)
  if (!app || !inScope(app, role) || app.status !== 'pending') throw new Error('申报状态或权限不允许审核')
  if (!(app.regionCodes || []).every(code => String(code).startsWith(String(role.regionCode).slice(0, 6)))) throw new Error('整单包含非本县地块，跨县审核归属待确认')
  if (app.applicant?.name === role.name && app.applicant?.unit === role.unit) throw new Error('不能审核本人代办的申报')
  if (action !== 'pass' && !String(opinion || '').trim()) throw new Error('退回或驳回请填写意见')
  if (action === 'pass' && app.plotDetails.some(plot => !plot.geometry)) throw new Error('地块边界缺失，不能形成备案围栏')
  app.status = action === 'pass' ? 'filed' : action === 'return' ? 'returned' : 'rejected'
  app.auditTrail.push({ action: action === 'pass' ? '审核通过并备案' : action === 'return' ? '退回补正' : '驳回', time: now(), user: `${role.name}（${role.roleName}）`, opinion: opinion || '同意备案' })
  if (action === 'pass') { app.filedNo = `皖青贮备〔${app.year}〕${Date.now()}号`; app.filedAt = now() }
  write(KEYS.applications, all)
  return { success: true, filedNo: app.filedNo }
})
export const fetchOrdinaryFences = role => mockRequest(() => applications().filter(app => app.status === 'filed' && inScope(app, role)).map(app => ({ ...app, id: `ORD-FENCE-${app.id}`, declarationId: app.id, subjectId: app.storageSubjectId, subjectName: app.storageSubjectName, createdAt: app.filedAt || app.createdAt })), 100, 200)
export const ordinaryFenceGeoJSON = fence => ({ type: 'FeatureCollection', features: (fence.plotDetails || []).filter(plot => plot.geometry).map(plot => ({ type: 'Feature', properties: { fenceId: fence.id, filedNo: fence.filedNo, plotId: plot.plotId, plotName: plot.name, areaMu: plot.areaMu, subjectName: fence.storageSubjectName, plantingSubjectName: plot.subjectName }, geometry: clone(plot.geometry) })) })
export const ordinaryDeadline = app => {
  let days = 10
  try { days = Number(JSON.parse(localStorage.getItem('ah_sil_audit_config') || '{}').storageDays) || 10 } catch { /* defaults */ }
  if (!app.submittedAt) return ''
  const start = new Date(app.submittedAt.replace(' ', 'T') + '+08:00')
  return Number.isNaN(start.getTime()) ? '' : new Date(start.getTime() + days * 86400000).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
}
export const fetchOrdinaryLedgers = role => mockRequest(() => {
  const visible = new Set(applications().filter(app => inScope(app, role)).map(app => app.id))
  return read(KEYS.ledgers, []).filter(item => visible.has(item.declarationId))
}, 100, 200)
export const saveOrdinaryLedger = (data, role) => result(() => {
  const app = applications().find(item => item.id === data.declarationId && item.status === 'filed' && inScope(item, role))
  if (!app || !canSubmitOrdinary(role) || !(isOrdinaryOwner(app, role) || (role.storageSubjectId && role.storageSubjectId === app.storageSubjectId))) throw new Error('仅申报人或绑定收储主体的用户可填报该单实际执行信息')
  if (data.submit && (data.weight === '' || data.weight === null || data.weight === undefined || Number(data.weight) <= 0)) throw new Error('提交执行信息时实际收储重量必填且须大于0')
  const row = { ...data, actualArea: number(data.actualArea, '实际面积'), actualYield: number(data.actualYield, '实际产量'), weight: number(data.weight, '实际收储重量', !!data.submit), price: number(data.price, '实际收储价格'), declarationId: app.id, filedNo: app.filedNo, storageSubjectName: app.storageSubjectName, updatedAt: now(), status: data.submit ? '已填报' : '草稿', operator: role.name }
  const all = read(KEYS.ledgers, []); write(KEYS.ledgers, [row, ...all.filter(item => item.declarationId !== app.id)])
  return { success: true }
})

