import { PLANTING_PLAN_LIST } from './plans'
import { getRegion, listTowns } from '@/mock/common/regions'
import { GROW_SUBJECTS, PLOTS } from '@/mock/geo/plot-gen'

export const REPORT_TARGET_BY_ROLE = { city: 'county', county: 'town', town: 'subject', grower: 'plot' }
export const REPORT_REVIEWER_BY_ROLE = { city: 'province', county: 'city', town: 'county', grower: 'town' }
export const REPORTS = [
  { id: 'RPT-2026-CITY-001', planId: 'PLANT-2026-Q3', reporterRole: 'city', reporterRegionCode: '341200', reporterRegionName: '阜阳市', targetLevel: 'county', status: '待审核', sourceType: '手工填报', submittedAt: '2026-11-15', reviewedAt: '', reviewComment: '', totalArea: 3276 },
  { id: 'RPT-2026-COUNTY-001', planId: 'PLANT-2026-Q3', reporterRole: 'county', reporterRegionCode: '341222', reporterRegionName: '太和县', targetLevel: 'town', status: '已驳回', sourceType: '同步+手工', submittedAt: '2026-11-12', reviewedAt: '2026-11-13', reviewComment: '请补填未接入系统的乡镇明细', totalArea: 302 }
]
export const REPORT_DETAILS = [
  { id: 'RPD-001', reportId: 'RPT-2026-CITY-001', childType: 'county', childId: '341222', childName: '太和县', countyStatus: '已填报', auditStatus: '已通过', cropId: 'wheat', cropName: '小麦', planArea: 302, source: 'manual', sourceRecordId: '', editable: true, remark: '市级核实填报' },
  { id: 'RPD-002', reportId: 'RPT-2026-CITY-001', childType: 'county', childId: '341221', childName: '临泉县', countyStatus: '部分填报', auditStatus: '待审核', cropId: 'wheat', cropName: '小麦', planArea: 290, source: 'manual', sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-003', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222104', childName: '旧县镇', cropId: 'wheat', cropName: '小麦', planArea: 70, source: 'sync', sourceRecordId: 'TOWN-PLAN-PLANT-2026-Q3-341222104', editable: true, remark: '同步后可修改' },
  { id: 'RPD-004', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222103', childName: '大新镇', cropId: 'corn', cropName: '玉米', planArea: 62, source: 'manual', sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-005', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222108', childName: '税镇镇', cropId: 'corn', cropName: '玉米', planArea: 58, source: 'manual', sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-006', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222112', childName: '皮条孙镇', cropId: 'wheat', cropName: '小麦', planArea: 54, source: 'manual', sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-007', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222113', childName: '原墙镇', cropId: 'wheat', cropName: '小麦', planArea: 58, source: 'manual', sourceRecordId: '', editable: true, remark: '未接入系统，县级补填' }
]

const childName = (item) => item.name || item.countyName || item.townName || item.subjectName || item.subject?.name || item.plotName
const makeRows = (role, plan) => {
  const target = REPORT_TARGET_BY_ROLE[role.code]
  let children = []
  if (target === 'county') children = getRegion('340000')?.children?.find((city) => city.code === role.regionCode)?.children || []
  if (target === 'town') children = listTowns(role.regionCode)
  if (target === 'subject') children = GROW_SUBJECTS.filter((item) => String(item.regionCode).startsWith(String(role.regionCode)))
  if (target === 'plot') children = PLOTS.filter((item) => item.subjectId === role.subjectId)
  const base = Number(plan.area || 0) / Math.max(children.length, 1)
  return children.map((item, index) => {
    const id = item.code || item.id
    const area = index === children.length - 1 ? Number((Number(plan.area || 0) - base * (children.length - 1)).toFixed(2)) : Number(base.toFixed(2))
    return { id: `draft-${plan.id}-${target}-${id}`, reportId: '', childType: target, childId: id, childName: childName(item), cropId: plan.cropType === '小麦' ? 'wheat' : plan.cropType === '水稻' ? 'rice' : plan.cropType === '玉米' ? 'corn' : 'soybean', cropName: plan.cropType, planArea: area, source: 'manual', sourceRecordId: '', editable: true, remark: '' }
  })
}
export const reportPlanList = (role) => PLANTING_PLAN_LIST.filter((p) => ['待分解', '已分解'].includes(p.status) && (!role?.subjectId || role.code === 'grower'))
export const getReportDetail = (reportId, role, planId) => {
  const report = REPORTS.find((item) => item.id === reportId) || REPORTS.find((item) => !reportId && item.planId === planId && item.reporterRole === role?.code && item.reporterRegionCode === role?.regionCode)
  const plan = PLANTING_PLAN_LIST.find((item) => item.id === (report?.planId || planId))
  if (!plan) return { report: null, plan: null, details: [] }
  const details = report ? REPORT_DETAILS.filter((item) => item.reportId === report.id).map((item) => ({ ...item })) : makeRows(role, plan)
  return { report: report ? { ...report } : null, plan: { ...plan }, details }
}
export const reportTotal = (details) => Number(details.reduce((sum, item) => sum + Number(item.planArea || 0), 0).toFixed(2))
export const reportReviewer = (report) => REPORT_REVIEWER_BY_ROLE[report?.reporterRole]
