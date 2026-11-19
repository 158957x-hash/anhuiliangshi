import { PLANTING_PLAN_LIST } from './plans'
import { getRegion, listTowns } from '@/mock/common/regions'
import { GROW_SUBJECTS, PLOTS } from '@/mock/geo/plot-gen'

export const REPORT_TARGET_BY_ROLE = { city: 'county', county: 'town', town: 'subject', grower: 'plot' }
export const REPORT_REVIEWER_BY_ROLE = { city: 'province', county: 'city', town: 'county', grower: 'town' }
export const REPORTS = [
  { id: 'RPT-2026-CITY-001', planId: 'PLANT-2026-Q3', reporterRole: 'city', reporterRegionCode: '341200', reporterRegionName: '阜阳市', targetLevel: 'county', status: '待审核', submittedAt: '2026-11-15', reviewedAt: '', reviewComment: '', totalArea: 3276 },
  { id: 'RPT-2026-CITY-002', planId: 'PLANT-2026-Q2', reporterRole: 'city', reporterRegionCode: '340100', reporterRegionName: '合肥市', targetLevel: 'county', status: '已通过', submittedAt: '2026-11-08', reviewedAt: '2026-11-09', reviewComment: '县级明细已核对', totalArea: 2180 },
  { id: 'RPT-2026-CITY-003', planId: 'PLANT-2026-Q1', reporterRole: 'city', reporterRegionCode: '341600', reporterRegionName: '亳州市', targetLevel: 'county', status: '已驳回', submittedAt: '2026-11-02', reviewedAt: '2026-11-03', reviewComment: '请补充县级明细依据', totalArea: 1960 },
  { id: 'RPT-2026-COUNTY-001', planId: 'PLANT-2026-Q3', reporterRole: 'county', reporterRegionCode: '341222', reporterRegionName: '太和县', targetLevel: 'town', status: '待审核', submittedAt: '2026-11-12', reviewedAt: '', reviewComment: '', totalArea: 302 },
  { id: 'RPT-2026-COUNTY-002', planId: 'PLANT-2026-Q2', reporterRole: 'county', reporterRegionCode: '341226', reporterRegionName: '颍上县', targetLevel: 'town', status: '已通过', submittedAt: '2026-11-06', reviewedAt: '2026-11-07', reviewComment: '乡镇明细已核对', totalArea: 300 },
  { id: 'RPT-2026-COUNTY-003', planId: 'PLANT-2026-Q1', reporterRole: 'county', reporterRegionCode: '341221', reporterRegionName: '临泉县', targetLevel: 'town', status: '已驳回', submittedAt: '2026-11-01', reviewedAt: '2026-11-02', reviewComment: '请补填乡镇明细', totalArea: 290 },
  // 乡镇种植计划上报演示数据：县级审核页使用 reporterRole=town 的记录。
  { id: 'RPT-2026-TOWN-007', planId: 'PLANT-2026-Q3', reporterRole: 'town', reporterRegionCode: '341222104', reporterRegionName: '旧县镇', targetLevel: 'subject', status: '待审核', submittedAt: '2026-11-18', reviewedAt: '', reviewComment: '', totalArea: 6.20 },
  { id: 'RPT-2026-TOWN-005', planId: 'PLANT-2026-Q3', reporterRole: 'town', reporterRegionCode: '341222112', reporterRegionName: '皮条孙镇', targetLevel: 'subject', status: '待审核', submittedAt: '2026-11-17', reviewedAt: '', reviewComment: '', totalArea: 4.80 },
  { id: 'RPT-2026-TOWN-006', planId: 'PLANT-2026-Q3', reporterRole: 'town', reporterRegionCode: '341222113', reporterRegionName: '原墙镇', targetLevel: 'subject', status: '待审核', submittedAt: '2026-11-18', reviewedAt: '', reviewComment: '', totalArea: 4.35 },
  { id: 'RPT-2026-TOWN-002', planId: 'PLANT-2026-Q2', reporterRole: 'town', reporterRegionCode: '341222104', reporterRegionName: '旧县镇', targetLevel: 'subject', status: '已通过', submittedAt: '2026-11-10', reviewedAt: '2026-11-11', reviewComment: '主体计划明细已核对', totalArea: 5.40 },
  { id: 'RPT-2026-TOWN-003', planId: 'PLANT-2026-Q4', reporterRole: 'town', reporterRegionCode: '341222108', reporterRegionName: '税镇镇', targetLevel: 'subject', status: '已驳回', submittedAt: '2026-11-08', reviewedAt: '2026-11-09', reviewComment: '请重新核对主体分配面积', totalArea: 5.20 },
  { id: 'RPT-2026-TOWN-004', planId: 'PLANT-2026-Q1', reporterRole: 'town', reporterRegionCode: '341222112', reporterRegionName: '皮条孙镇', targetLevel: 'subject', status: '草稿', submittedAt: '', reviewedAt: '', reviewComment: '', totalArea: 4.80 }
]
export const REPORT_DETAILS = [
  { id: 'RPD-001', reportId: 'RPT-2026-CITY-001', childType: 'town', childId: '341222103', childName: '大新镇', countyStatus: '已填报', auditStatus: '已通过', cropId: 'wheat', cropName: '小麦', planArea: 302, sourceRecordId: '', editable: true, remark: '市级核实填报' },
  { id: 'RPD-002', reportId: 'RPT-2026-CITY-001', childType: 'town', childId: '341222104', childName: '旧县镇', countyStatus: '部分填报', auditStatus: '待审核', cropId: 'wheat', cropName: '小麦', planArea: 290, sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-003', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222104', childName: '旧县镇', cropId: 'wheat', cropName: '小麦', planArea: 70, sourceRecordId: 'TOWN-PLAN-PLANT-2026-Q3-341222104', editable: true, remark: '同步后可修改' },
  { id: 'RPD-004', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222103', childName: '大新镇', cropId: 'corn', cropName: '玉米', planArea: 62, sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-005', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222108', childName: '税镇镇', cropId: 'corn', cropName: '玉米', planArea: 58, sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-006', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222112', childName: '皮条孙镇', cropId: 'wheat', cropName: '小麦', planArea: 54, sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-007', reportId: 'RPT-2026-COUNTY-001', childType: 'town', childId: '341222113', childName: '原墙镇', cropId: 'wheat', cropName: '小麦', planArea: 58, sourceRecordId: '', editable: true, remark: '未接入系统，县级补填' },
  { id: 'RPD-TOWN-009', reportId: 'RPT-2026-TOWN-007', childType: 'subject', childId: 'SUB-0004', childName: '旧县镇赵多种植大户', cropId: 'corn', cropName: '玉米', planArea: 3.10, sourceRecordId: '', editable: true, remark: '乡镇主体计划填报示例' },
  { id: 'RPD-TOWN-010', reportId: 'RPT-2026-TOWN-007', childType: 'subject', childId: 'SUB-0005', childName: '旧县镇田乐家庭农场', cropId: 'corn', cropName: '玉米', planArea: 3.10, sourceRecordId: '', editable: true, remark: '乡镇主体计划填报示例' },
  { id: 'RPD-TOWN-001', reportId: 'RPT-2026-TOWN-001', childType: 'subject', childId: 'SUB-0001', childName: '太和县丰收种植专业合作社', cropId: 'corn', cropName: '玉米', planArea: 2.80, sourceRecordId: 'TOWN-PLAN-PLANT-2026-Q3-341222103', editable: true, remark: '主体地块信息已同步' },
  { id: 'RPD-TOWN-002', reportId: 'RPT-2026-TOWN-001', childType: 'subject', childId: 'SUB-0002', childName: '大新镇绿源家庭农场', cropId: 'corn', cropName: '玉米', planArea: 3.10, sourceRecordId: '', editable: true, remark: '乡镇补充主体' },
  { id: 'RPD-TOWN-007', reportId: 'RPT-2026-TOWN-005', childType: 'subject', childId: 'SUB-0005', childName: '皮条孙镇丰田家庭农场', cropId: 'corn', cropName: '玉米', planArea: 4.80, sourceRecordId: '', editable: true, remark: '待县级审核示例' },
  { id: 'RPD-TOWN-008', reportId: 'RPT-2026-TOWN-006', childType: 'subject', childId: 'SUB-0006', childName: '原墙镇丰收种植合作社', cropId: 'corn', cropName: '玉米', planArea: 4.35, sourceRecordId: '', editable: true, remark: '待县级审核示例' },
  { id: 'RPD-TOWN-003', reportId: 'RPT-2026-TOWN-002', childType: 'subject', childId: 'SUB-0001', childName: '太和县丰收种植专业合作社', cropId: 'rice', cropName: '水稻', planArea: 2.60, sourceRecordId: 'TOWN-PLAN-PLANT-2026-Q2-341222104', editable: true, remark: '审核通过示例' },
  { id: 'RPD-TOWN-004', reportId: 'RPT-2026-TOWN-002', childType: 'subject', childId: 'SUB-0003', childName: '旧县镇金穗家庭农场', cropId: 'rice', cropName: '水稻', planArea: 2.80, sourceRecordId: '', editable: true, remark: '' },
  { id: 'RPD-TOWN-005', reportId: 'RPT-2026-TOWN-003', childType: 'subject', childId: 'SUB-0004', childName: '税镇镇希望种植合作社', cropId: 'wheat', cropName: '小麦', planArea: 5.20, sourceRecordId: '', editable: true, remark: '主体面积与计划不一致' },
  { id: 'RPD-TOWN-006', reportId: 'RPT-2026-TOWN-004', childType: 'subject', childId: 'SUB-0005', childName: '皮条孙镇丰田家庭农场', cropId: 'wheat', cropName: '小麦', planArea: 4.80, sourceRecordId: '', editable: true, remark: '草稿，尚未提交审核' },
  { id: 'RPD-CITY-003', reportId: 'RPT-2026-CITY-002', childType: 'county', childId: '340123', childName: '肥西县', cropId: 'rice', cropName: '水稻', planArea: 1120, editable: false, remark: '市级上报县级明细' },
  { id: 'RPD-CITY-004', reportId: 'RPT-2026-CITY-002', childType: 'county', childId: '340121', childName: '长丰县', cropId: 'rice', cropName: '水稻', planArea: 1060, editable: false, remark: '市级上报县级明细' },
  { id: 'RPD-CITY-005', reportId: 'RPT-2026-CITY-003', childType: 'county', childId: '341622', childName: '涡阳县', cropId: 'corn', cropName: '玉米', planArea: 1960, editable: false, remark: '请补充县级明细依据' },
  { id: 'RPD-COUNTY-008', reportId: 'RPT-2026-COUNTY-002', childType: 'subject', childId: 'SUB-0021', childName: '颍上县润河合作社', cropId: 'rice', cropName: '水稻', planArea: 160, editable: false, remark: '县级上报乡镇明细' },
  { id: 'RPD-COUNTY-009', reportId: 'RPT-2026-COUNTY-002', childType: 'subject', childId: 'SUB-0022', childName: '颍上县江口家庭农场', cropId: 'rice', cropName: '水稻', planArea: 140, editable: false, remark: '县级上报乡镇明细' },
  { id: 'RPD-COUNTY-010', reportId: 'RPT-2026-COUNTY-003', childType: 'subject', childId: 'SUB-0023', childName: '临泉县丰源家庭农场', cropId: 'wheat', cropName: '小麦', planArea: 290, editable: false, remark: '请补填乡镇明细' }
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
    return { id: `draft-${plan.id}-${target}-${id}`, reportId: '', childType: target, childId: id, childName: childName(item), cropId: plan.cropType === '小麦' ? 'wheat' : plan.cropType === '水稻' ? 'rice' : plan.cropType === '玉米' ? 'corn' : 'soybean', cropName: plan.cropType, planArea: area, sourceRecordId: '', editable: true, remark: '' }
  })
}
export const reportPlanList = (role) => PLANTING_PLAN_LIST.filter((p) => ['待分解', '已分解'].includes(p.status) && (!role?.subjectId || role.code === 'grower'))
export const getReportDetail = (reportId, role, planId) => {
  const report = REPORTS.find((item) => item.id === reportId) || REPORTS.find((item) => !reportId && item.planId === planId && item.reporterRole === role?.code && item.reporterRegionCode === role?.regionCode)
  const plan = PLANTING_PLAN_LIST.find((item) => item.id === (report?.planId || planId))
  if (!plan) return { report: null, plan: null, details: [] }
  const sourceDetails = report ? REPORT_DETAILS.filter((item) => item.reportId === report.id).map((item) => ({ ...item })) : makeRows(role, plan)
  // 县级审核乡镇上报单：乡镇是单据主体，明细仍逐条展示乡镇填报的种植主体。
  // targetLevel 表示单据主体；details.childType 表示明细对象，二者不能混用。
  const auditReport = report
    ? { ...report, ...(role?.code === 'county' && report.reporterRole === 'town' ? { targetLevel: 'town' } : {}) }
    : null
  return { report: auditReport, plan: { ...plan }, details: sourceDetails }
}
export const reportTotal = (details) => Number(details.reduce((sum, item) => sum + Number(item.planArea || 0), 0).toFixed(2))
export const reportReviewer = (report) => REPORT_REVIEWER_BY_ROLE[report?.reporterRole]
