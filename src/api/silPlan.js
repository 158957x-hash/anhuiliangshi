// 青贮饲料管理 3.0：按招标文件“申报—备案—上图”闭环重构。
// 关键口径：种植计划（种植主体/县级代办）与收储申报（收储主体/县级代办）分离备案，分别上图与台账。
import { mockRequest } from './request'
import { GROW_SUBJECTS, PLOTS } from '@/mock/geo/plot-gen'
import { REGION_MAP } from '@/mock/common/regions'
import { CROP_MAP } from '@/mock/common/dict'
import { TASK_PATH_DETAILS } from '@/mock/gpm/plans'
import { readSilCropDict } from '@/mock/sil/crops'
import { fetchStorageSubjects, saveStorageSubject, canManageStorageSubjects, STORAGE_SUBJECT_TYPES } from './silOrdinary'

export { fetchStorageSubjects, saveStorageSubject, canManageStorageSubjects, STORAGE_SUBJECT_TYPES }

const KEYS = {
  plans: 'ah_sil_v3_plans',
  storages: 'ah_sil_v3_storages',
  disasters: 'ah_sil_v3_disasters',
  checks: 'ah_sil_v3_subject_checks'
}

const clone = value => JSON.parse(JSON.stringify(value))
const read = (key, fallback) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : clone(fallback) } catch { return clone(fallback) }
}
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const now = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
const action = fn => mockRequest(() => { try { return fn() } catch (error) { return { success: false, message: error.message } } }, 100, 220)
const num = (value, label, required = false) => {
  if (value === '' || value === null || value === undefined) {
    if (required) throw new Error(`请填写${label}`)
    return null
  }
  if (!Number.isFinite(Number(value)) || Number(value) < 0 || (required && Number(value) <= 0)) throw new Error(`${label}格式不正确`)
  return Number(value)
}

export const SIL_PLAN_STATUS = {
  draft: { name: '草稿', tag: 'info' },
  pending: { name: '待审核', tag: 'warning' },
  filed: { name: '已通过', tag: 'success' },
  rejected: { name: '已驳回', tag: 'danger' }
}
export const SIL_STORAGE_USAGE = { self: '自用', sell: '出售' }
export const SIL_DISASTER_STATUS = { pending: { name: '待县级确认', tag: 'warning' }, confirmed: { name: '已纳入补充收储', tag: 'success' } }
export const SIL_CROP_OPTIONS = () => readSilCropDict().filter(item => item.enabled)
export const silCropName = code => readSilCropDict().find(item => item.code === code)?.name || code || '—'
// 粮食计划系统作物（受灾上报地块作物来自粮食计划，不是青贮作物字典）
export const GRAIN_CROP_OPTIONS = () => ['wheat', 'rice', 'corn', 'soybean'].map(code => CROP_MAP[code]).filter(Boolean)
export const grainCropName = code => CROP_MAP[String(code || '')]?.name || code || '—'

// ===== 权限与数据范围 =====
export const canDeclarePlan = role => ['grower', 'county'].includes(role?.code)
export const canDeclareStorage = role => ['storage_subject', 'county'].includes(role?.code)
export const canReportDisaster = role => ['grower', 'county'].includes(role?.code)
export const canAuditSil = role => role?.code === 'county'
export const canViewSil = role => ['province', 'city', 'county'].includes(role?.code)
export const canMatchSil = role => ['storage_subject', 'province', 'city', 'county'].includes(role?.code)
export const canCheckSilSubject = role => ['province', 'city', 'county', 'town'].includes(role?.code)
export const isAgent = role => role?.code === 'county'

const regionPrefix = role => {
  if (!role) return ''
  if (role.code === 'province') return ''
  if (role.code === 'city') return String(role.regionCode).slice(0, 4)
  if (role.code === 'county') return String(role.regionCode).slice(0, 6)
  if (role.code === 'town') return String(role.regionCode)
  return ''
}
const inRegion = (code, role) => {
  const prefix = regionPrefix(role)
  return !prefix || String(code || '').startsWith(prefix)
}
const regionNameOf = code => REGION_MAP[String(code)]?.name || REGION_MAP[String(code).slice(0, 6)]?.name || ''
const subjectOf = id => GROW_SUBJECTS.find(item => item.id === id)
const plotsOfSubject = id => PLOTS.filter(plot => plot.subjectId === id && plot.geometry)

const planInScope = (plan, role) => {
  if (!role) return false
  if (role.code === 'grower') return plan.subjectId === role.subjectId
  if (role.code === 'storage_subject') return plan.status === 'filed' && inRegion(plan.regionCode, role)
  return inRegion(plan.regionCode, role)
}
const storageInScope = (row, role) => {
  if (!role) return false
  if (role.code === 'storage_subject') return row.storageSubjectId === role.storageSubjectId
  return inRegion(row.regionCode, role)
}
const disasterInScope = (row, role) => {
  if (!role) return false
  if (role.code === 'grower') return row.subjectId === role.subjectId
  return inRegion(row.regionCode, role)
}

// ===== 演示种子数据（按地块生成器确定性生成）=====
const detailOf = (plot, crop, variety, factor = 2.1) => ({
  plotId: plot.id,
  name: plot.name,
  areaMu: plot.areaMu,
  crop,
  variety,
  expectedYield: Math.round(plot.areaMu * factor * 10) / 10,
  geometry: plot.geometry,
  center: plot.center,
  regionCode: plot.regionCode,
  regionName: plot.regionName || regionNameOf(plot.regionCode),
  subjectId: plot.subjectId,
  subjectName: subjectOf(plot.subjectId)?.name || plot.subjectName || ''
})

const planSeeds = () => {
  const s1 = plotsOfSubject('SUB-0001')
  const s2 = plotsOfSubject('SUB-0002')
  const s4 = plotsOfSubject('SUB-0004')
  const s5 = plotsOfSubject('SUB-0005')
  const base = {
    year: 2027,
    season: '春夏季',
    source: 'self',
    attachments: [],
    promise: { content: '本人承诺申报的种植品种、面积、地块及预计产量真实准确，收割时接受属地核查。', signer: '', signedAt: '' },
    auditTrail: []
  }
  const build = (id, subject, details, status, extra = {}) => {
    const subjectInfo = subjectOf(subject)
    return {
      ...base,
      ...extra,
      id,
      subjectId: subject,
      subjectName: subjectInfo?.name || '',
      subjectType: subjectInfo?.type || '',
      owner: subjectInfo?.owner || '',
      phone: subjectInfo?.phone || '',
      regionCode: subjectInfo?.regionCode || '',
      regionName: regionNameOf(subjectInfo?.regionCode) || subjectInfo?.regionCode || '',
      plots: details,
      plotIds: details.map(item => item.plotId),
      area: Math.round(details.reduce((sum, item) => sum + Number(item.areaMu || 0), 0) * 10) / 10,
      expectedYield: Math.round(details.reduce((sum, item) => sum + Number(item.expectedYield || 0), 0) * 10) / 10,
      status,
      createdAt: '2026-11-10 09:00:00',
      submittedAt: ['draft'].includes(status) ? '' : '2026-11-11 16:10:00',
      progress: { sowingDate: '', harvestDate: '', actualArea: null, actualYield: null },
      ...extra
    }
  }
  return [
    build('QZ-PLAN-2027-0001', 'SUB-0001', [detailOf(s1[0], 'silage_corn', '豫青贮23'), detailOf(s1[1], 'silage_corn', '京科968'), detailOf(s1[3], 'silage_corn', '豫青贮23')], 'filed', {
      filedNo: '皖青贮备〔2027〕0001号',
      filedAt: '2026-11-12 10:20:00',
      submittedAt: '2026-11-11 16:10:00',
      promise: { ...base.promise, signer: '陈勇', signedAt: '2026-11-11 16:08:00' },
      auditTrail: [{ action: '审核通过并备案', time: '2026-11-12 10:20:00', user: '王芳（县级备案审核）', opinion: '地块与品种一致，同意备案。' }],
      progress: { sowingDate: '2027-04-18', harvestDate: '', actualArea: null, actualYield: null }
    }),
    build('QZ-PLAN-2027-0002', 'SUB-0001', [detailOf(s1[2], 'silage_sorghum', '辽甜1号')], 'pending', {
      submittedAt: '2026-11-18 09:40:00',
      promise: { ...base.promise, signer: '陈勇', signedAt: '2026-11-18 09:35:00' },
      auditTrail: [{ action: '提交备案', time: '2026-11-18 09:40:00', user: '陈勇（种植主体）' }]
    }),
    build('QZ-PLAN-2027-0003', 'SUB-0002', [detailOf(s2[0], 'alfalfa', '中苜3号', 2.6)], 'filed', {
      filedNo: '皖青贮备〔2027〕0002号',
      filedAt: '2026-11-13 15:05:00',
      submittedAt: '2026-11-12 14:20:00',
      promise: { ...base.promise, signer: '王建国', signedAt: '2026-11-12 14:10:00' },
      auditTrail: [{ action: '审核通过并备案', time: '2026-11-13 15:05:00', user: '王芳（县级备案审核）', opinion: '同意备案。' }],
      progress: { sowingDate: '2027-03-28', harvestDate: '2027-06-05', actualArea: s2[0].areaMu, actualYield: Math.round(s2[0].areaMu * 2.4 * 10) / 10 }
    }),
    build('QZ-PLAN-2027-0004', 'SUB-0004', [detailOf(s4[0], 'silage_corn', '豫青贮23')], 'rejected', {
      submittedAt: '2026-11-15 11:00:00',
      promise: { ...base.promise, signer: '赵多', signedAt: '2026-11-15 10:50:00' },
      auditTrail: [{ action: '驳回', time: '2026-11-16 09:20:00', user: '王芳（县级备案审核）', opinion: '请补齐品种名称并核对预计产量。' }]
    }),
    build('QZ-PLAN-2027-0005', 'SUB-0005', [detailOf(s5[0], 'oat', '青海444')], 'pending', {
      source: 'agent',
      applicant: { name: '王芳', unit: '太和县农业农村局', roleName: '县级代办' },
      submittedAt: '2026-11-19 10:30:00',
      promise: { ...base.promise, signer: '王芳（代）', signedAt: '2026-11-19 10:25:00' },
      auditTrail: [{ action: '县级代填并提交', time: '2026-11-19 10:30:00', user: '王芳（太和县农业农村局）' }]
    }),
    build('QZ-PLAN-2027-0006', 'SUB-0001', [detailOf(s1[3], 'silage_corn', '')], 'draft', {
      applicant: { name: '陈勇', unit: '太和县丰乐种植专业合作社', roleName: '种植主体' }
    })
  ].map(item => ({ ...item, applicant: item.applicant || { name: item.owner, unit: item.subjectName, roleName: '种植主体' } }))
}

const storageSeeds = () => {
  const subject = { id: 'STO-001', name: '太和县牧业发展有限公司', type: 'livestock_enterprise', owner: '周牧', phone: '13900001234', regionCode: '341222', regionName: '太和县' }
  const third = { id: 'STO-003', name: '涡阳县青禾收储服务有限公司', type: 'third_party', owner: '马丰', phone: '13700001234', regionCode: '341622', regionName: '涡阳县' }
  const household = { id: 'STO-002', name: '赵家养殖户', type: 'livestock_household', owner: '赵牧', phone: '13800001234', regionCode: '341222', regionName: '太和县' }
  const base = { year: 2027, season: '春夏季', attachments: [], contractFiles: [], auditTrail: [], execution: { actualWeight: null, actualPrice: null, actualTime: '', sources: [] } }
  const filedPlans = planSeeds().filter(plan => plan.status === 'filed')
  const cornPlan = filedPlans.find(plan => plan.id === 'QZ-PLAN-2027-0001')
  const cornSources = (cornPlan?.plots || []).slice(0, 2).map((plot, index) => ({
    planId: cornPlan.id,
    filedNo: cornPlan.filedNo,
    plotId: plot.plotId,
    plotName: plot.name,
    subjectId: cornPlan.subjectId,
    subjectName: cornPlan.subjectName,
    crop: plot.crop,
    variety: plot.variety,
    weight: index === 0 ? 900 : 750
  }))
  return [
    {
      ...base,
      id: 'QZ-STO-2027-0001',
      storageSubjectId: subject.id,
      storageSubjectName: subject.name,
      subjectType: subject.type,
      owner: subject.owner,
      phone: subject.phone,
      regionCode: subject.regionCode,
      regionName: subject.regionName,
      crop: 'silage_corn',
      variety: '豫青贮23',
      expectedWeight: 5200,
      price: 420,
      amount: 2184000,
      usage: 'self',
      status: 'filed',
      source: 'self',
      filedNo: '皖青贮收备〔2027〕0001号',
      filedAt: '2026-11-12 16:40:00',
      submittedAt: '2026-11-11 17:20:00',
      promise: { content: '本人承诺收储申报的品种、价格和重量真实，收储的青贮饲料来源于已备案种植地块。', signer: '周牧', signedAt: '2026-11-11 17:15:00' },
      applicant: { name: '周牧', unit: subject.name, roleName: '收储主体' },
      auditTrail: [{ action: '审核通过并备案', time: '2026-11-12 16:40:00', user: '王芳（县级备案审核）', opinion: '同意备案。' }]
    },
    {
      ...base,
      id: 'QZ-STO-2027-0002',
      storageSubjectId: third.id,
      storageSubjectName: third.name,
      subjectType: third.type,
      owner: third.owner,
      phone: third.phone,
      regionCode: third.regionCode,
      regionName: third.regionName,
      crop: 'silage_corn',
      variety: '京科968',
      expectedWeight: 3000,
      price: 455,
      amount: 1365000,
      usage: 'sell',
      status: 'pending',
      source: 'self',
      contractFiles: [{ name: '青贮收储意向合同（演示）.pdf', size: '286KB' }],
      submittedAt: '2026-11-18 14:10:00',
      promise: { content: '本人承诺收储申报的品种、价格和重量真实，收储的青贮饲料来源于已备案种植地块。', signer: '马丰', signedAt: '2026-11-18 14:05:00' },
      applicant: { name: '马丰', unit: third.name, roleName: '收储主体' },
      auditTrail: [{ action: '提交备案', time: '2026-11-18 14:10:00', user: '马丰（收储主体）' }]
    },
    {
      ...base,
      id: 'QZ-STO-2027-0003',
      storageSubjectId: household.id,
      storageSubjectName: household.name,
      subjectType: household.type,
      owner: household.owner,
      phone: household.phone,
      regionCode: household.regionCode,
      regionName: household.regionName,
      crop: 'alfalfa',
      variety: '中苜3号',
      expectedWeight: 800,
      price: 480,
      amount: 384000,
      usage: 'self',
      status: 'draft',
      source: 'self',
      applicant: { name: '赵牧', unit: household.name, roleName: '收储主体' },
      promise: { content: '本人承诺收储申报的品种、价格和重量真实。', signer: '', signedAt: '' }
    },
    {
      ...base,
      id: 'QZ-STO-2027-0004',
      storageSubjectId: subject.id,
      storageSubjectName: subject.name,
      subjectType: subject.type,
      owner: subject.owner,
      phone: subject.phone,
      regionCode: subject.regionCode,
      regionName: subject.regionName,
      crop: 'silage_corn',
      variety: '豫青贮23',
      expectedWeight: 1800,
      price: 400,
      amount: 720000,
      usage: 'self',
      status: 'filed',
      source: 'self',
      filedNo: '皖青贮收备〔2027〕0002号',
      filedAt: '2026-11-13 11:10:00',
      submittedAt: '2026-11-12 09:30:00',
      promise: { content: '本人承诺收储申报的品种、价格和重量真实。', signer: '周牧', signedAt: '2026-11-12 09:20:00' },
      applicant: { name: '周牧', unit: subject.name, roleName: '收储主体' },
      auditTrail: [{ action: '审核通过并备案', time: '2026-11-13 11:10:00', user: '王芳（县级备案审核）', opinion: '同意备案。' }],
      execution: { actualWeight: 1650, actualPrice: 415, actualTime: '2027-06-20', sources: cornSources }
    },
    {
      ...base,
      id: 'QZ-STO-2027-0005',
      storageSubjectId: household.id,
      storageSubjectName: household.name,
      subjectType: household.type,
      owner: household.owner,
      phone: household.phone,
      regionCode: household.regionCode,
      regionName: household.regionName,
      crop: 'silage_corn',
      variety: '豫青贮23',
      expectedWeight: 1200,
      price: 430,
      amount: 516000,
      usage: 'self',
      status: 'pending',
      source: 'self',
      submittedAt: '2026-11-19 15:20:00',
      promise: { content: '本人承诺收储申报的品种、价格和重量真实。', signer: '赵牧', signedAt: '2026-11-19 15:15:00' },
      applicant: { name: '赵牧', unit: household.name, roleName: '收储主体' },
      auditTrail: [{ action: '提交备案', time: '2026-11-19 15:20:00', user: '赵牧（收储主体）' }]
    }
  ]
}

// 受灾上报种子：按“粮食计划地块”口径（2026-11-20 主人确认：受灾申报主体是地块，粮食计划只用于筛选地块）
const disasterSeeds = () => {
  const subject = subjectOf('SUB-0001')
  const plots = plotsOfSubject('SUB-0001')
  const wheatPlan = TASK_PATH_DETAILS.find(task => task.subjectId === 'SUB-0001' && task.cropType === '小麦')
  const cornPlan = TASK_PATH_DETAILS.find(task => task.subjectId === 'SUB-0001' && task.cropType === '玉米')
  const pickPlot = plan => plots.find(plot => grainCropName(plot.crop) === plan?.cropType) || plots[0]
  const row = (id, plan, plot, ratio, reason, status, extra = {}) => {
    const area = Math.round(plot.areaMu * ratio)
    return {
      id,
      planId: plan?.id || '',
      planNo: plan?.planName || '手动填报（无粮食计划）',
      planSource: plan ? 'grain_plan' : 'manual',
      subjectId: subject.id,
      subjectName: subject.name,
      subjectType: subject.type || '',
      owner: subject.owner,
      phone: subject.phone,
      regionCode: plot.regionCode,
      regionName: plot.regionName || regionNameOf(plot.regionCode),
      plotId: plot.id,
      plotName: plot.name,
      crop: plot.crop,
      cropName: grainCropName(plot.crop),
      variety: '',
      plotArea: plot.areaMu,
      affectedArea: area,
      affectedRatio: Math.round(ratio * 100),
      reason,
      description: reason,
      attachments: [{ name: '受灾地块现场照片（演示）.jpg', size: '1.2MB' }],
      status,
      year: plan?.year || 2026,
      submittedAt: '2026-11-17 08:50:00',
      ...extra
    }
  }
  return [
    row('QZ-DIS-2027-0001', wheatPlan, pickPlot(wheatPlan), 0.45, '风雹倒伏，计划收割期前受灾', 'pending'),
    row('QZ-DIS-2027-0002', cornPlan, pickPlot(cornPlan), 0.3, '连续降雨导致霉变，不适合收粮', 'confirmed', { confirmNo: '皖青贮灾补〔2026〕0001号', confirmedAt: '2026-11-18 10:00:00', confirmedBy: '王芳（县级）' })
  ]
}

const plans = () => read(KEYS.plans, planSeeds())
const storages = () => read(KEYS.storages, storageSeeds())
const disasters = () => read(KEYS.disasters, disasterSeeds())

// ===== 种植计划申报 =====
export const fetchPlans = (filters = {}, role) => mockRequest(() => plans().filter(plan => planInScope(plan, role)).filter(plan => {
  const keyword = String(filters.keyword || '').trim()
  return (!filters.status || plan.status === filters.status) &&
    (!filters.year || Number(plan.year) === Number(filters.year)) &&
    (!keyword || `${plan.id} ${plan.filedNo || ''} ${plan.subjectName} ${plan.owner} ${(plan.plots || []).map(p => p.name).join(' ')}`.includes(keyword))
}).map(plan => ({
  ...plan,
  progress: {
    ...(plan.progress || {}),
    filled: !!(plan.progress?.sowingDate || plan.progress?.harvestDate || plan.progress?.actualArea)
  }
})).sort((a, b) => String(b.submittedAt || b.createdAt).localeCompare(String(a.submittedAt || a.createdAt))), 100, 200)

export const fetchPlan = (id, role) => mockRequest(() => {
  const plan = plans().find(item => item.id === id)
  return plan && planInScope(plan, role) ? plan : null
}, 100, 200)

export const savePlan = (data, role, submit = false) => action(() => {
  if (!canDeclarePlan(role)) throw new Error('仅种植主体或县级代办人员可填报种植计划')
  const all = plans()
  const old = all.find(item => item.id === data.id)
  if (data.id && !old) throw new Error('原申报不存在，请返回列表')
  if (old && old.status === 'filed') throw new Error('已备案计划不可修改')
  if (old && old.status === 'pending') throw new Error('待审核计划不可修改，请等待审核结果')
  if (old && role.code === 'grower' && old.subjectId !== role.subjectId) throw new Error('仅可维护本主体的种植计划')

  const subjectId = role.code === 'grower' ? role.subjectId : data.subjectId
  const subject = subjectOf(subjectId)
  if (!subject) throw new Error('请选择种植主体')
  if (role.code === 'county' && !inRegion(subject.regionCode, role)) throw new Error('县级只能代办本辖区种植主体')

  const source = role.code === 'county' ? 'agent' : 'self'
  const chosen = new Set()
  const details = (data.plots || []).map(detail => {
    if (chosen.has(detail.plotId)) throw new Error('同一份计划不能重复选择同一地块')
    chosen.add(detail.plotId)
    const plot = PLOTS.find(item => item.id === detail.plotId)
    if (!plot) throw new Error('地块档案不存在，请重新选择')
    if (plot.subjectId !== subjectId) throw new Error(`${plot.name}不属于所选种植主体`)
    if (submit && !plot.geometry) throw new Error(`${plot.name}缺少地块边界，无法上图备案`)
    if (submit && !detail.crop) throw new Error(`${plot.name}请选择种植作物`)
    if (submit && !String(detail.variety || '').trim()) throw new Error(`${plot.name}请填写品种`)
    return {
      ...detailOf(plot, detail.crop, detail.variety),
      expectedYield: num(detail.expectedYield, '预计产量', submit) ?? Math.round(plot.areaMu * 2.1 * 10) / 10
    }
  })
  if (!details.length) throw new Error('请选择至少一个种植地块')
  if (submit && !data.promiseAccepted && !(old?.promise?.signedAt)) throw new Error('请签署电子承诺书')
  if (!Number(data.year)) throw new Error('请选择计划年度')
  if (submit) {
    const duplicate = all.find(plan => plan.id !== old?.id && ['pending', 'filed'].includes(plan.status) && Number(plan.year) === Number(data.year) && (plan.plotIds || []).some(id => chosen.has(id)))
    if (duplicate) throw new Error(`重复地块：${duplicate.filedNo || duplicate.id} 已使用同一地块，请核对`)
    const counties = new Set(details.map(item => String(item.regionCode).slice(0, 6)))
    if (counties.size > 1) throw new Error('一份种植计划不能跨县选择地块，请按县分别申报')
  }
  const signedAt = data.promiseAccepted || old?.promise?.signedAt ? (old?.promise?.signedAt || now()) : ''
  const item = {
    ...(old || {}),
    ...data,
    id: old?.id || `QZ-PLAN-${Date.now()}`,
    source,
    subjectId,
    subjectName: subject.name,
    subjectType: subject.type,
    owner: subject.owner,
    phone: subject.phone,
    regionCode: subject.regionCode,
    regionName: regionNameOf(subject.regionCode) || subject.regionCode,
    plots: details,
    plotIds: details.map(item => item.plotId),
    area: Math.round(details.reduce((sum, row) => sum + Number(row.areaMu || 0), 0) * 10) / 10,
    expectedYield: Math.round(details.reduce((sum, row) => sum + Number(row.expectedYield || 0), 0) * 10) / 10,
    season: '春夏季',
    status: submit ? 'pending' : (old?.status === 'rejected' ? 'rejected' : 'draft'),
    filedNo: old?.filedNo || '',
    filedAt: old?.filedAt || '',
    promise: { ...(old?.promise || {}), content: data.promiseContent || old?.promise?.content || '本人承诺申报的种植品种、面积、地块及预计产量真实准确。', signer: signedAt ? (role.code === 'county' ? `${role.name}（代）` : role.name) : '', signedAt },
    progress: old?.progress || { sowingDate: '', harvestDate: '', actualArea: null, actualYield: null },
    applicant: old?.applicant || { name: role.name, unit: role.unit, roleName: role.code === 'county' ? '县级代办' : '种植主体' },
    attachments: data.attachments || old?.attachments || [],
    createdAt: old?.createdAt || now(),
    submittedAt: submit ? now() : (old?.submittedAt || ''),
    auditTrail: [...(old?.auditTrail || []), { action: submit ? (old?.status === 'rejected' ? '修改重报' : '提交备案') : '保存草稿', time: now(), user: `${role.name}（${role.code === 'county' ? '县级代办' : '种植主体'}）` }]
  }
  write(KEYS.plans, [item, ...all.filter(row => row.id !== item.id)])
  return { success: true, id: item.id }
})

export const auditPlan = (id, action_, opinion, role) => action(() => {
  if (!canAuditSil(role)) throw new Error('仅县级可办理种植计划备案')
  if (!['pass', 'reject'].includes(action_)) throw new Error('未知审核操作')
  const all = plans()
  const plan = all.find(item => item.id === id)
  if (!plan || !inRegion(plan.regionCode, role)) throw new Error('未找到该计划或超出本辖区范围')
  if (plan.status !== 'pending') throw new Error('仅待备案计划可办理')
  if (action_ !== 'pass' && !String(opinion || '').trim()) throw new Error('驳回请填写意见')
  if (action_ === 'pass' && (plan.plots || []).some(plot => !plot.geometry)) throw new Error('地块边界缺失，不能形成备案围栏')
  plan.status = action_ === 'pass' ? 'filed' : 'rejected'
  plan.auditTrail.push({ action: action_ === 'pass' ? '审核通过' : '驳回', time: now(), user: `${role.name}（${role.roleName || '县级'}）`, opinion: opinion || '同意备案' })
  if (action_ === 'pass') {
    plan.filedNo = `皖青贮备〔${plan.year}〕${String(all.filter(item => item.status === 'filed' && item.id !== plan.id).length + 1).padStart(4, '0')}号`
    plan.filedAt = now()
  }
  write(KEYS.plans, all)
  return { success: true, filedNo: plan.filedNo }
})

// ===== 收储申报 =====
export const fetchStorages = (filters = {}, role) => mockRequest(() => storages().filter(row => storageInScope(row, role)).filter(row => {
  const keyword = String(filters.keyword || '').trim()
  return (!filters.status || row.status === filters.status) &&
    (!keyword || `${row.id} ${row.filedNo || ''} ${row.storageSubjectName} ${row.owner} ${row.variety}`.includes(keyword))
}).map(row => ({
  ...row,
  execution: {
    actualWeight: row.execution?.actualWeight ?? null,
    actualPrice: row.execution?.actualPrice ?? null,
    actualTime: row.execution?.actualTime || '',
    sources: row.execution?.sources || [],
    sourcesWeight: Math.round((row.execution?.sources || []).reduce((sum, item) => sum + Number(item.weight || 0), 0) * 10) / 10,
    filled: row.execution?.actualWeight !== null && row.execution?.actualWeight !== undefined
  }
})).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))), 100, 200)

export const saveStorage = (data, role, submit = false) => action(() => {
  if (!canDeclareStorage(role)) throw new Error('仅收储主体或县级代办人员可填报收储申报')
  const all = storages()
  const old = all.find(item => item.id === data.id)
  if (data.id && !old) throw new Error('原申报不存在，请返回列表')
  if (old && ['filed', 'pending'].includes(old.status)) throw new Error('已提交或已备案的收储申报不可修改')
  const subject = role.code === 'storage_subject'
    ? { id: role.storageSubjectId, name: role.unit, type: role.subjectType, owner: role.name, phone: '', regionCode: role.regionCode, regionName: role.regionName }
    : data.storageSubject
  if (!subject?.id) throw new Error('请选择收储主体')
  if (role.code === 'county' && !inRegion(subject.regionCode, role)) throw new Error('县级只能代办本辖区收储主体')
  if (submit) {
    if (!data.crop) throw new Error('请选择收储作物')
    if (!String(data.variety || '').trim()) throw new Error('请填写收储品种')
    if (!data.usage || !SIL_STORAGE_USAGE[data.usage]) throw new Error('请选择收储用途（自用/出售）')
    if (data.usage === 'sell' && !(data.contractFiles || []).length) throw new Error('出售用途需上传收储合同附件')
    if (!data.promiseAccepted) throw new Error('请签署电子承诺书')
  }
  const weight = num(data.expectedWeight, '预计收储重量', submit)
  const price = num(data.price, '预计收储价格', submit)
  const item = {
    ...(old || {}),
    ...data,
    id: old?.id || `QZ-STO-${Date.now()}`,
    storageSubjectId: subject.id,
    storageSubjectName: subject.name,
    subjectType: subject.type,
    owner: subject.owner,
    phone: subject.phone || old?.phone || '',
    regionCode: subject.regionCode,
    regionName: regionNameOf(subject.regionCode) || subject.regionName || '',
    expectedWeight: weight,
    price,
    amount: weight && price ? Math.round(weight * price) : null,
    contractFiles: data.contractFiles || [],
    attachments: data.attachments || [],
    source: role.code === 'county' ? 'agent' : 'self',
    status: submit ? 'pending' : (old?.status === 'rejected' ? 'rejected' : 'draft'),
    filedNo: old?.filedNo || '',
    filedAt: old?.filedAt || '',
    promise: { ...(old?.promise || {}), content: data.promiseContent || old?.promise?.content || '本人承诺收储申报的品种、价格和重量真实。', signer: data.promiseAccepted ? (role.code === 'county' ? `${role.name}（代）` : role.name) : (old?.promise?.signer || ''), signedAt: data.promiseAccepted ? now() : (old?.promise?.signedAt || '') },
    applicant: old?.applicant || { name: role.name, unit: role.code === 'county' ? role.unit : subject.name, roleName: role.code === 'county' ? '县级代办' : '收储主体' },
    receipts: old?.receipts || [],
    createdAt: old?.createdAt || now(),
    submittedAt: submit ? now() : (old?.submittedAt || ''),
    auditTrail: [...(old?.auditTrail || []), { action: submit ? '提交备案' : '保存草稿', time: now(), user: `${role.name}（${role.code === 'county' ? '县级代办' : '收储主体'}）` }]
  }
  write(KEYS.storages, [item, ...all.filter(row => row.id !== item.id)])
  return { success: true, id: item.id }
})

export const auditStorage = (id, action_, opinion, role) => action(() => {
  if (!canAuditSil(role)) throw new Error('仅县级可办理收储备案')
  const all = storages()
  const row = all.find(item => item.id === id)
  if (!row || !inRegion(row.regionCode, role)) throw new Error('未找到该收储申报或超出本辖区范围')
  if (row.status !== 'pending') throw new Error('仅待备案申报可办理')
  if (action_ !== 'pass' && !String(opinion || '').trim()) throw new Error('驳回请填写意见')
  row.status = action_ === 'pass' ? 'filed' : 'rejected'
  row.auditTrail.push({ action: action_ === 'pass' ? '审核通过' : '驳回', time: now(), user: `${role.name}（${role.roleName || '县级'}）`, opinion: opinion || '同意备案' })
  if (action_ === 'pass') {
    row.filedNo = `皖青贮收备〔${row.year}〕${String(all.filter(item => item.status === 'filed' && item.id !== row.id).length + 1).padStart(4, '0')}号`
    row.filedAt = now()
  }
  write(KEYS.storages, all)
  return { success: true, filedNo: row.filedNo }
})

// ===== 受灾作物补充收储上报 =====
// 口径（2026-11-20 主人确认）：受灾申报主体是地块；地块来自粮食计划系统的种植计划，
// 计划可选可不选——选中后带出该计划的地块种植数据（地块名称/种植面积/作物，均可修改），
// 无粮食计划数据时允许手动填写其他地块；计划只用于筛选地块，不再要求青贮备案计划。
export const fetchGrainSubjects = (role, keyword = '') => mockRequest(() => GROW_SUBJECTS
  .filter(item => (role?.code === 'grower' ? item.id === role.subjectId : inRegion(item.regionCode, role)))
  .filter(item => !keyword || `${item.name} ${item.owner} ${item.regionCode}`.includes(keyword))
  .map(item => ({ ...item, regionName: regionNameOf(item.regionCode), plotCount: plotsOfSubject(item.id).length })), 100, 200)

export const fetchGrainPlanOptions = (role, subjectId = '') => mockRequest(() => {
  const target = subjectId || (role?.code === 'grower' ? role.subjectId : '')
  const tasks = TASK_PATH_DETAILS.filter(task => (target ? task.subjectId === target : inRegion(task.countyCode || task.townCode, role)))
  return tasks.map(task => {
    const plots = plotsOfSubject(task.subjectId)
    const matched = plots.filter(plot => grainCropName(plot.crop) === task.cropType)
    const picked = matched.length ? matched : plots
    return {
      id: task.id,
      planName: task.planName,
      year: task.year,
      quarter: task.quarter,
      cropType: task.cropType,
      subjectId: task.subjectId,
      subjectName: task.subjectName,
      owner: task.owner,
      townName: task.townName,
      areaMu: Number(task.taskArea || 0),
      plots: picked.map(plot => ({
        plotId: plot.id,
        plotName: plot.name,
        areaMu: plot.areaMu,
        crop: plot.crop,
        cropName: grainCropName(plot.crop),
        regionCode: plot.regionCode,
        regionName: plot.regionName || regionNameOf(plot.regionCode),
        subjectId: plot.subjectId,
        subjectName: subjectOf(plot.subjectId)?.name || ''
      }))
    }
  })
}, 100, 200)

export const fetchDisasters = (filters = {}, role) => mockRequest(() => disasters().filter(row => disasterInScope(row, role)).filter(row => !filters.status || row.status === filters.status).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))), 100, 200)

export const saveDisaster = (data, role) => action(() => {
  if (!canReportDisaster(role)) throw new Error('仅种植主体或县级代办可上报受灾补充收储')
  const subjectId = role.code === 'grower' ? role.subjectId : String(data.subjectId || '')
  const subject = subjectOf(subjectId)
  if (!subject) throw new Error('请选择受灾种植主体')
  if (role.code === 'grower' && subject.id !== role.subjectId) throw new Error('仅可上报本主体地块')
  const plan = data.planId ? TASK_PATH_DETAILS.find(task => task.id === data.planId) : null
  if (data.planId && !plan) throw new Error('所选粮食种植计划不存在')
  const rows = (data.plots || []).filter(row => row && (String(row.plotName || '').trim() || row.plotId))
  if (!rows.length) throw new Error('请至少选择一个受灾地块')
  if (!String(data.reason || '').trim()) throw new Error('请填写受灾原因')
  const checked = rows.map(row => {
    const plotName = String(row.plotName || '').trim()
    if (!plotName) throw new Error('请填写地块名称')
    const areaMu = num(row.areaMu, `「${plotName}」种植面积`, true)
    const affectedArea = num(row.affectedArea, `「${plotName}」受灾面积`, true)
    if (!row.crop) throw new Error(`请选择「${plotName}」的作物`)
    if (affectedArea > areaMu) throw new Error(`「${plotName}」受灾面积不能大于种植面积`)
    return { ...row, plotName, areaMu, affectedArea }
  })
  const all = disasters()
  const created = checked.map((row, index) => ({
    id: `QZ-DIS-${new Date().getFullYear()}-${String(all.length + index + 1).padStart(4, '0')}`,
    planId: plan?.id || '',
    planNo: plan?.planName || '手动填报（无粮食计划）',
    planSource: plan ? 'grain_plan' : 'manual',
    subjectId: subject.id,
    subjectName: subject.name,
    subjectType: subject.type || '',
    owner: subject.owner,
    phone: subject.phone,
    regionCode: row.regionCode || subject.regionCode,
    regionName: row.regionName || regionNameOf(row.regionCode || subject.regionCode),
    plotId: row.plotId || `MANUAL-PLOT-${Date.now()}-${index + 1}`,
    plotName: row.plotName,
    crop: row.crop,
    cropName: grainCropName(row.crop),
    variety: String(row.variety || '').trim(),
    plotArea: row.areaMu,
    affectedArea: row.affectedArea,
    affectedRatio: Math.round((row.affectedArea / row.areaMu) * 100),
    reason: data.reason,
    description: data.reason,
    attachments: data.attachments || [],
    status: 'pending',
    year: plan?.year || new Date().getFullYear(),
    submittedAt: now(),
    reporter: { name: role.name, unit: role.unit, roleName: role.code === 'county' ? '县级代办' : '种植主体' }
  }))
  write(KEYS.disasters, [...created, ...all])
  return { success: true, ids: created.map(item => item.id), count: created.length }
})

export const confirmDisaster = (id, role) => action(() => {
  if (!canAuditSil(role)) throw new Error('仅县级可确认受灾补充上报')
  const all = disasters()
  const row = all.find(item => item.id === id)
  if (!row || !inRegion(row.regionCode, role)) throw new Error('未找到该上报或超出本辖区范围')
  if (row.status !== 'pending') throw new Error('该上报已处理')
  row.status = 'confirmed'
  const year = row.year || plans().find(item => item.id === row.planId)?.year || new Date().getFullYear()
  row.confirmNo = `皖青贮灾补〔${year}〕${String(all.filter(item => item.status === 'confirmed' && item.id !== row.id).length + 1).padStart(4, '0')}号`
  row.confirmedAt = now()
  row.confirmedBy = `${role.name}（${role.roleName || '县级'}）`
  write(KEYS.disasters, all)
  return { success: true, confirmNo: row.confirmNo }
})

// ===== 养殖企业查询匹配（按图索料）=====
// 已登记收储的地块：同一地块同一季只能被一条收储登记占用。
const plotLoadMap = () => {
  const map = new Map()
  storages().forEach(row => {
    if (row.status !== 'filed') return
    ;(row.execution?.sources || []).forEach(src => {
      const key = `${src.planId}:${src.plotId}`
      const prev = map.get(key) || { weight: 0, filedNo: row.filedNo || '', subjectName: row.storageSubjectName || '' }
      map.set(key, { ...prev, weight: Math.round((prev.weight + Number(src.weight || 0)) * 10) / 10, filedNo: row.filedNo || prev.filedNo, subjectName: row.storageSubjectName || prev.subjectName })
    })
  })
  return map
}

export const matchPlanting = (params = {}, role) => mockRequest(() => {
  if (!canMatchSil(role)) return []
  const keyword = String(params.keyword || '').trim()
  const region = String(params.region || '').trim()
  const load = plotLoadMap()
  return plans()
    .filter(plan => plan.status === 'filed' && inRegion(plan.regionCode, role))
    .flatMap(plan => (plan.plots || []).map(plot => ({ plan, plot })))
    .filter(({ plan, plot }) => (!params.crop || plot.crop === params.crop) &&
      (!keyword || `${plan.subjectName} ${plan.owner} ${plot.variety} ${plot.name}`.includes(keyword)) &&
      (!region || `${plan.regionName} ${plot.regionName} ${plan.regionCode}`.includes(region)) &&
      (!params.minArea || Number(plot.areaMu) >= Number(params.minArea)))
    .map(({ plan, plot }) => ({
      planId: plan.id,
      filedNo: plan.filedNo,
      filedAt: plan.filedAt,
      subjectId: plan.subjectId,
      subjectName: plan.subjectName,
      subjectType: plan.subjectType || '',
      owner: plan.owner,
      phone: plan.phone,
      regionName: plan.regionName,
      plotId: plot.plotId,
      plotName: plot.name,
      areaMu: plot.areaMu,
      crop: plot.crop,
      cropName: silCropName(plot.crop),
      variety: plot.variety,
      expectedYield: plot.expectedYield,
      center: plot.center,
      geometry: plot.geometry,
      regionCode: plan.regionCode,
      capacity: Math.round(Number(plot.expectedYield || 0) * 10) / 10,
      received: load.get(`${plan.id}:${plot.plotId}`)?.weight || 0,
      remaining: Math.max(0, Math.round((Number(plot.expectedYield || 0) - (load.get(`${plan.id}:${plot.plotId}`)?.weight || 0)) * 10) / 10),
      occupied: load.has(`${plan.id}:${plot.plotId}`),
      occupiedBy: load.get(`${plan.id}:${plot.plotId}`)?.subjectName || '',
      occupiedFiledNo: load.get(`${plan.id}:${plot.plotId}`)?.filedNo || ''
    }))
}, 120, 260)

// ===== 生产台账 =====
export const fetchLedger = role => mockRequest(() => {
  const planting = plans().filter(plan => plan.status === 'filed' && planInScope(plan, role)).map(plan => ({
    id: plan.id,
    planId: plan.id,
    filedNo: plan.filedNo,
    year: plan.year,
    season: plan.season,
    subjectName: plan.subjectName,
    subjectId: plan.subjectId,
    regionName: plan.regionName,
    plotCount: (plan.plots || []).length,
    area: plan.area,
    expectedYield: plan.expectedYield,
    progress: {
      sowingDate: plan.progress?.sowingDate || '',
      harvestDate: plan.progress?.harvestDate || '',
      actualArea: plan.progress?.actualArea ?? null,
      actualYield: plan.progress?.actualYield ?? null,
      filled: !!(plan.progress?.sowingDate || plan.progress?.harvestDate || plan.progress?.actualArea)
    }
  }))
  const storage = storages().filter(row => row.status === 'filed' && storageInScope(row, role)).map(row => ({
    id: row.id,
    storageId: row.id,
    filedNo: row.filedNo,
    year: row.year,
    storageSubjectName: row.storageSubjectName,
    storageSubjectId: row.storageSubjectId,
    regionName: row.regionName,
    crop: row.crop,
    cropName: silCropName(row.crop),
    variety: row.variety,
    usage: row.usage,
    expectedWeight: row.expectedWeight,
    price: row.price,
    execution: {
      actualWeight: row.execution?.actualWeight ?? null,
      actualPrice: row.execution?.actualPrice ?? null,
      actualTime: row.execution?.actualTime || '',
      sources: row.execution?.sources || [],
      sourcesWeight: Math.round((row.execution?.sources || []).reduce((sum, item) => sum + Number(item.weight || 0), 0) * 10) / 10,
      filled: row.execution?.actualWeight !== null && row.execution?.actualWeight !== undefined
    }
  }))
  return { planting, storage }
}, 100, 200)

export const savePlantingProgress = (data, role) => action(() => {
  const all = plans()
  const plan = all.find(item => item.id === (data.id || data.planId))
  if (!plan || plan.status !== 'filed') throw new Error('仅已备案计划可维护生产进度')
  const owner = role.code === 'grower' && plan.subjectId === role.subjectId
  if (!owner && !canAuditSil(role)) throw new Error('仅种植主体或县级可维护该计划生产进度')
  if (data.actualArea !== undefined && data.actualArea !== null && Number(data.actualArea) > Number(plan.area)) throw new Error('实际收获面积不能大于备案面积')
  plan.progress = {
    sowingDate: data.sowingDate || '',
    harvestDate: data.harvestDate || '',
    actualArea: data.actualArea === '' ? null : Number(data.actualArea),
    actualYield: data.actualYield === '' ? null : Number(data.actualYield)
  }
  write(KEYS.plans, all)
  return { success: true }
})

export const saveStorageExecution = (data, role) => action(() => {
  const all = storages()
  const row = all.find(item => item.id === (data.id || data.storageId))
  if (!row || row.status !== 'filed') throw new Error('仅已备案收储可填报实际执行信息')
  const owner = role.code === 'storage_subject' && row.storageSubjectId === role.storageSubjectId
  if (!owner && !canAuditSil(role)) throw new Error('仅收储主体或县级可填报该收储执行信息')
  if (data.actualWeight === '' || data.actualWeight === null || data.actualWeight === undefined || Number(data.actualWeight) <= 0) throw new Error('实际收储重量必填且须大于 0')
  const actualWeight = Number(data.actualWeight)
  const plansAll = plans()
  const load = plotLoadMap()
  const seen = new Set()
  const sources = (data.sources || []).map(source => {
    const plan = plansAll.find(item => item.id === source.planId)
    if (!plan || plan.status !== 'filed') throw new Error('来源地块须为已备案种植计划')
    const plot = (plan.plots || []).find(item => item.plotId === source.plotId)
    if (!plot) throw new Error('来源地块不存在，请重新选择')
    const key = `${plan.id}:${plot.plotId}`
    if (seen.has(key)) throw new Error('来源地块不可重复登记')
    seen.add(key)
    const occupied = load.get(key)
    if (occupied && occupied.filedNo !== (row.filedNo || '')) throw new Error(`${plot.name}已由${occupied.subjectName}登记收储（${occupied.filedNo || '未编号'}），同一地块不可重复收储`)
    const weight = Number(source.weight)
    if (!weight || weight <= 0) throw new Error(`${plot.name}的实际收储重量须大于 0`)
    return {
      planId: plan.id,
      filedNo: plan.filedNo || '',
      plotId: plot.plotId,
      plotName: plot.name,
      subjectId: plan.subjectId,
      subjectName: plan.subjectName,
      crop: plot.crop,
      variety: plot.variety,
      weight: Math.round(weight * 10) / 10
    }
  })
  const sourcesWeight = Math.round(sources.reduce((sum, item) => sum + item.weight, 0) * 10) / 10
  if (sourcesWeight > actualWeight + 0.05) throw new Error(`来源地块重量合计 ${sourcesWeight} 吨，不能大于实际收储重量 ${actualWeight} 吨`)
  row.execution = { actualWeight, actualPrice: data.actualPrice === '' || data.actualPrice === undefined ? null : Number(data.actualPrice), actualTime: data.actualTime || '', sources }
  row.executionAt = now()
  write(KEYS.storages, all)
  return { success: true, sourcesWeight }
})

// ===== 种植上图 / 青贮饲料一张图 =====
export const fetchMapData = role => mockRequest(() => {
  const filed = plans().filter(plan => plan.status === 'filed' && planInScope(plan, role))
  const confirmed = disasters().filter(row => row.status === 'confirmed' && disasterInScope(row, role)).map(row => {
    const plan = filed.find(item => item.id === row.planId) || plans().find(item => item.id === row.planId)
    const plot = plan?.plots?.find(item => item.plotId === row.plotId)
    return { ...row, geometry: plot?.geometry || null }
  })
  return {
    plans: filed,
    disasters: confirmed,
    stats: {
      planCount: filed.length,
      plotCount: filed.reduce((sum, plan) => sum + (plan.plots || []).length, 0),
      area: Math.round(filed.reduce((sum, plan) => sum + Number(plan.area || 0), 0) * 10) / 10,
      expectedYield: Math.round(filed.reduce((sum, plan) => sum + Number(plan.expectedYield || 0), 0) * 10) / 10,
      disasterCount: confirmed.length,
      disasterArea: Math.round(confirmed.reduce((sum, row) => sum + Number(row.affectedArea || 0), 0) * 10) / 10
    }
  }
}, 120, 260)

export const planGeoJSON = plan => ({
  type: 'FeatureCollection',
  features: (plan.plots || []).filter(plot => plot.geometry).map(plot => ({
    type: 'Feature',
    properties: {
      planId: plan.id,
      filedNo: plan.filedNo,
      plotId: plot.plotId,
      plotName: plot.name,
      areaMu: plot.areaMu,
      expectedYield: plot.expectedYield,
      crop: plot.crop,
      variety: plot.variety,
      subjectName: plan.subjectName,
      owner: plan.owner,
      regionName: plan.regionName
    },
    geometry: clone(plot.geometry)
  }))
})

export const disasterGeoJSON = row => {
  const plan = plans().find(item => item.id === row.planId)
  const plot = plan?.plots?.find(item => item.plotId === row.plotId)
  return {
    type: 'FeatureCollection',
    features: plot?.geometry ? [{
      type: 'Feature',
      properties: { disasterId: row.id, planId: row.planId, filedNo: row.planNo, plotName: plot.name, areaMu: row.affectedArea, subjectName: row.subjectName, crop: row.crop, variety: row.variety },
      geometry: clone(plot.geometry)
    }] : []
  }
}

// 受灾地块按来源计划取地块边界
export const disasterFeatures = row => {
  const plan = plans().find(item => item.id === row.planId)
  const plot = plan?.plots?.find(item => item.plotId === row.plotId)
  if (!plot?.geometry) return []
  return [{
    type: 'Feature',
    properties: { disasterId: row.id, planId: row.planId, filedNo: plan.filedNo, plotId: plot.plotId, plotName: plot.name, areaMu: row.affectedArea, affectedRatio: row.affectedRatio, subjectName: row.subjectName, crop: row.crop, variety: row.variety, regionName: row.regionName },
    geometry: clone(plot.geometry)
  }]
}

// ===== 主体信息核查 =====
export const fetchSubjectCheck = role => mockRequest(async () => {
  const planting = GROW_SUBJECTS.filter(subject => inRegion(subject.regionCode, role)).map(subject => {
    const all = plans().filter(plan => plan.subjectId === subject.id)
    const filed = all.filter(plan => plan.status === 'filed')
    return {
      id: subject.id,
      name: subject.name,
      type: subject.type,
      owner: subject.owner,
      phone: subject.phone,
      regionCode: subject.regionCode,
      regionName: regionNameOf(subject.regionCode) || subject.regionCode,
      planCount: all.length,
      filedCount: filed.length,
      filedArea: Math.round(filed.reduce((sum, plan) => sum + Number(plan.area || 0), 0) * 10) / 10,
      filedYield: Math.round(filed.reduce((sum, plan) => sum + Number(plan.expectedYield || 0), 0) * 10) / 10,
      lastFiledAt: filed.map(plan => plan.filedAt).filter(Boolean).sort().pop() || '',
      plans: filed
    }
  })
  const subjectRows = await fetchStorageSubjects(role)
  const storage = subjectRows.filter(subject => inRegion(subject.regionCode, role)).map(subject => {
    const all = storages().filter(row => row.storageSubjectId === subject.id)
    const filed = all.filter(row => row.status === 'filed')
    return {
      id: subject.id,
      name: subject.name,
      type: STORAGE_SUBJECT_TYPES[subject.type] || subject.type || '收储主体',
      owner: subject.owner,
      phone: subject.phone,
      regionCode: subject.regionCode,
      regionName: subject.regionName || regionNameOf(subject.regionCode) || subject.regionCode,
      storageCount: all.length,
      filedCount: filed.length,
      filedWeight: Math.round(filed.reduce((sum, row) => sum + Number(row.expectedWeight || 0), 0) * 10) / 10,
      declares: filed
    }
  })
  return { planting, storage }
}, 120, 240)

// ===== 县级代办：可选主体与地块 =====
export const fetchAgentSubjects = role => mockRequest(() => GROW_SUBJECTS.filter(subject => inRegion(subject.regionCode, role)).map(subject => ({ ...subject, regionName: regionNameOf(subject.regionCode) || subject.regionCode, plots: plotsOfSubject(subject.id) })), 100, 200)

export const fetchSubjectPlots = subjectId => mockRequest(() => plotsOfSubject(subjectId).map(plot => ({ ...plot, regionName: plot.regionName || regionNameOf(plot.regionCode) })), 100, 200)
