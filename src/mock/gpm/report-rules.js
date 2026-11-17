import { getRegion } from '@/mock/common/regions'
import { getReportDetail, REPORT_TARGET_BY_ROLE, REPORT_REVIEWER_BY_ROLE } from './reports'

export const ownsReport = (report, role) => !!report && report.reporterRole === role?.code && report.reporterRegionCode === role?.regionCode && (role.code !== 'grower' || (!!role.subjectId && report.reporterSubjectId === role.subjectId))
export const canReviewReport = (report, role) => {
  if (!report || REPORT_REVIEWER_BY_ROLE[report.reporterRole] !== role?.code) return false
  const region = getRegion(role.regionCode)
  return !!region?.children?.some(child => child.code === report.reporterRegionCode) || (report.reporterRole === 'grower' && role.code === 'town' && report.reporterRegionCode === role.regionCode)
}
export const editableReport = report => !report || ['草稿', '已驳回'].includes(report.status)
export const validateReportRows = (planId, rows, role, complete = false) => {
  if (!REPORT_TARGET_BY_ROLE[role?.code] || (role.code === 'grower' && !role.subjectId)) return '当前角色无计划上报权限'
  const expected = getReportDetail('', role, planId)
  if (!expected.plan) return '关联粮食计划不存在'
  if (!Array.isArray(rows) || !expected.details.length) return '缺少可填报的下一级对象'
  const wanted = new Set(expected.details.map(row => row.childId))
  const actual = new Set(rows.map(row => row.childId))
  if (actual.size !== rows.length || rows.length !== wanted.size || rows.some(row => !wanted.has(row.childId) || row.childType !== REPORT_TARGET_BY_ROLE[role.code])) return '明细必须逐一覆盖当前辖区的所有下一级对象，且不能重复或越界'
  if (rows.some(row => row.planArea !== null && row.planArea !== undefined && row.planArea !== '' && (!Number.isFinite(Number(row.planArea)) || Number(row.planArea) < 0))) return '计划面积必须为有效非负数'
  if (complete && rows.some(row => row.planArea === null || row.planArea === undefined || row.planArea === '' || !Number.isFinite(Number(row.planArea)) || Number(row.planArea) <= 0 || !row.cropId || !row.cropName)) return '提交前必须逐项填写有效作物和大于0的计划面积'
  return ''
}
