// 粮食计划管理 API（模拟）
import { mockRequest } from './request'
import { CITY_PLANS, COUNTY_PLANS, TOWN_PLANS, PLAN_PLOTS, PROGRESS_RECORDS, SOWING_PROGRESS_ROWS, HARVEST_PROGRESS_ROWS, POLICIES, WEATHER_ALERTS, DISASTERS, DISASTER_ARCHIVES, RESCUE_ACTIONS, PROVINCE_PLAN, PLANTING_PLAN_LIST, PLANTING_PLAN_CITY_TASKS, QUARTERLY_PLAN_TARGETS, CITY_QUARTER_ALLOCATIONS, PLAN_HISTORY, TASK_HISTORY, TASK_PATH_DETAILS, PLAN_SUBJECTS, SUBJECT_PLOT_RELATIONS, PLAN_AUDITS, PLAN_SUPERVISE, PLAN_STATS, PROGRESS_REPORT_ORDERS } from '@/mock/gpm/plans'
import { getRegion, listCities, listTowns } from '@/mock/common/regions'
import { PLOTS, SUBJECT_MAP } from '@/mock/geo/plot-gen'
import { CROP_MAP } from '@/mock/common/dict'
import { FARM_SERVICES, OFFLINE_REPORTS, SMART_REFERENCES } from '@/mock/gpm/extra'
import { CROP_LIST } from '@/mock/gpm/crops'
import { REPORTS, REPORT_DETAILS, REPORT_TARGET_BY_ROLE, REPORT_REVIEWER_BY_ROLE, reportPlanList, getReportDetail, reportTotal } from '@/mock/gpm/reports'

const PLANTING_PLAN_VERSIONS = []
const PLANTING_PLAN_SUBJECT_TASKS = []
const PROGRESS_ENTRY_HISTORY = []
const TOWN_PLAN_REPORTS = [
  { id: 'TOWN-PLAN-PLANT-2026-Q1-341222104', planId: 'PLANT-2026-Q1', year: 2026, quarter: '第一季度', cropType: '小麦', area: 4.2, countyCode: '341222', countyName: '太和县', townCode: '341222104', townName: '旧县镇', subjectReferenceArea: 4.05, remark: '乡镇计划草稿演示', status: '草稿', submittedAt: '', submitter: '旧县镇人民政府', auditor: '', auditedAt: '', auditOpinion: '' },
  { id: 'TOWN-PLAN-PLANT-2026-Q2-341222104', planId: 'PLANT-2026-Q2', year: 2026, quarter: '第二季度', cropType: '水稻', area: 5.4, countyCode: '341222', countyName: '太和县', townCode: '341222104', townName: '旧县镇', subjectReferenceArea: 5.12, remark: '已提交县级审核，等待处理', status: '待县级审核', submittedAt: '2026-11-15', submitter: '旧县镇人民政府', auditor: '', auditedAt: '', auditOpinion: '' },
  { id: 'TOWN-PLAN-PLANT-2026-Q3-341222104', planId: 'PLANT-2026-Q3', year: 2026, quarter: '第三季度', cropType: '玉米', area: 6.8, countyCode: '341222', countyName: '太和县', townCode: '341222104', townName: '旧县镇', subjectReferenceArea: 6.42, remark: '按乡镇实际安排填报', status: '审核通过', submittedAt: '2026-10-08', submitter: '旧县镇人民政府', auditor: '太和县农业农村局', auditedAt: '2026-10-09', auditOpinion: '' },
  { id: 'TOWN-PLAN-PLANT-2026-Q4-341222104', planId: 'PLANT-2026-Q4', year: 2026, quarter: '第四季度', cropType: '小麦', area: 3.6, countyCode: '341222', countyName: '太和县', townCode: '341222104', townName: '旧县镇', subjectReferenceArea: 3.42, remark: '县级审核退回，需重新核对面积', status: '已驳回', submittedAt: '2026-11-08', submitter: '旧县镇人民政府', auditor: '太和县农业农村局', auditedAt: '2026-11-09', auditOpinion: '请重新核对乡镇计划面积后提交' },
  { id: 'TOWN-PLAN-PLANT-2026-Q3-341222103', planId: 'PLANT-2026-Q3', year: 2026, quarter: '第三季度', cropType: '玉米', area: 5.9, countyCode: '341222', countyName: '太和县', townCode: '341222103', townName: '大新镇', subjectReferenceArea: 5.55, remark: '', status: '待县级审核', submittedAt: '2026-11-12', submitter: '大新镇人民政府', auditor: '', auditedAt: '', auditOpinion: '' },
  { id: 'TOWN-PLAN-PLANT-2026-Q3-341222108', planId: 'PLANT-2026-Q3', year: 2026, quarter: '第三季度', cropType: '玉米', area: 5.2, countyCode: '341222', countyName: '太和县', townCode: '341222108', townName: '税镇镇', subjectReferenceArea: 5.35, remark: '主体分配面积仅作参考', status: '已驳回', submittedAt: '2026-11-08', submitter: '税镇镇人民政府', auditor: '太和县农业农村局', auditedAt: '2026-11-09', auditOpinion: '请按乡镇实际计划重新核对面积后提交' },
  { id: 'TOWN-PLAN-PLANT-2026-Q3-341222112', planId: 'PLANT-2026-Q3', year: 2026, quarter: '第三季度', cropType: '玉米', area: 4.8, countyCode: '341222', countyName: '太和县', townCode: '341222112', townName: '皮条孙镇', subjectReferenceArea: 4.8, remark: '', status: '草稿', submittedAt: '', submitter: '', auditor: '', auditedAt: '', auditOpinion: '' }
]

const inRoleScope = (item, role, field = 'regionCode') => {
  if (!role) return false
  if (role.subjectId) return item.subjectId === role.subjectId
  if (!role.regionCode || role.regionCode === '340000') return true
  return String(item[field] || '').startsWith(String(role.regionCode))
}
const failed = (message) => ({ success: false, message })
const success = (data = {}) => ({ success: true, ...data })
const planListByRole = (role) => {
  if (role?.subjectId) return []
  if (role?.code === 'province' || !role) return CITY_PLANS
  if (role?.code === 'city') return COUNTY_PLANS.filter((item) => item.cityCode === role.regionCode)
  if (role?.code === 'county') return TOWN_PLANS.filter((item) => item.countyCode === role.regionCode)
  return TOWN_PLANS.filter((item) => item.townCode === role?.regionCode)
}
export const fetchCrops = (filters = {}) => mockRequest(() => CROP_LIST.filter((item) => (filters.enabled === null || filters.enabled === '' || item.enabled === filters.enabled) && (!filters.keyword || `${item.code}${item.name}`.includes(filters.keyword))).sort((a, b) => a.sort - b.sort))
export const saveCrop = (data) => mockRequest(() => {
  if (!data.code || !data.name || !data.category || !data.unit) return failed('请完整填写作物编码、名称、类别和计量单位')
  if (!data.id && CROP_LIST.some((item) => item.code === data.code)) return failed('作物编码已存在')
  const item = data.id ? CROP_LIST.find((row) => row.id === data.id) : null
  if (item) Object.assign(item, data)
  else CROP_LIST.push({ ...data, id: `CROP-${Date.now()}`, enabled: true })
  return success({ item: item || CROP_LIST.at(-1) })
})
export const toggleCrop = (id) => mockRequest(() => {
  const item = CROP_LIST.find((row) => row.id === id)
  if (!item) return failed('作物不存在')
  item.enabled = !item.enabled
  return success({ item })
})
const progressPlanId = (task) => PLANTING_PLAN_LIST.find((plan) => task.planName === `${plan.year}年${plan.quarter}${plan.cropType}种植计划`)?.id || task.planId || ''
const progressTaskRows = (role) => TASK_PATH_DETAILS.filter((task) => {
  if (role?.subjectId) return task.subjectId === role.subjectId
  if (!role?.regionCode || role.regionCode === '340000') return true
  return String(task.countyCode || '').startsWith(String(role.regionCode)) || String(task.townCode || '').startsWith(String(role.regionCode))
}).map((task) => {
  const records = PROGRESS_RECORDS.filter((record) => record.taskId === task.id)
  const sowArea = records.filter((record) => record.type === 'sow').reduce((sum, record) => sum + Number(record.area || 0), 0)
  const harvestArea = records.filter((record) => record.type === 'harvest').reduce((sum, record) => sum + Number(record.area || 0), 0)
  const taskAreaMu = Number(task.taskArea || 0)
  return {
    ...task,
    planId: progressPlanId(task),
    taskId: task.id,
    planName: task.planName,
    taskAreaMu,
    sowArea,
    harvestArea,
    progress: taskAreaMu ? Number((Math.max(sowArea, harvestArea) / taskAreaMu * 100).toFixed(1)) : 0,
    status: task.status || '已下达'
  }
})
const planTarget = (level) => level === 'city' ? CITY_PLANS : level === 'county' ? COUNTY_PLANS : level === 'town' ? TOWN_PLANS : null
const roleLevel = (role) => role?.code === 'province' ? 'province' : role?.code === 'city' ? 'city' : role?.code === 'county' ? 'county' : role?.code === 'town' ? 'town' : 'subject'
const childLevel = (role) => roleLevel(role) === 'province' ? 'city' : roleLevel(role) === 'city' ? 'county' : roleLevel(role) === 'county' ? 'town' : null
const childRowsByRole = (role) => {
  const level = childLevel(role)
  if (level === 'city') return CITY_PLANS
  if (level === 'county') return COUNTY_PLANS.filter((item) => item.cityCode === role.regionCode)
  if (level === 'town') return TOWN_PLANS.filter((item) => item.countyCode === role.regionCode)
  return []
}
const parentPlanByRole = (role) => {
  if (roleLevel(role) === 'province') return PROVINCE_PLAN
  if (roleLevel(role) === 'city') return CITY_PLANS.find((item) => item.cityCode === role.regionCode)
  if (roleLevel(role) === 'county') return COUNTY_PLANS.find((item) => item.countyCode === role.regionCode)
  return null
}
const validatePlanAreas = (plan) => {
  const area = Number(plan.area ?? plan.totalArea ?? 0)
  const crop = String(plan.cropType || plan.crop || '').trim()
  return area > 0 && Boolean(crop) && !/[、,，/]/.test(crop)
}
const saveRows = (level, rows, status = 'drafting') => {
  const target = planTarget(level)
  if (!target) return failed('不支持的计划层级')
  if (!Array.isArray(rows) || !rows.length) return failed('计划数据不能为空')
  for (const row of rows) {
    const found = target.find((item) => item.id === row.id)
    if (!found) return failed(`未找到计划 ${row.id}`)
    const next = { ...found, ...row }
    if (!validatePlanAreas(next)) return failed(`计划 ${row.id} 必须填写一个作物和大于0的计划面积`)
  }
  rows.forEach((row) => Object.assign(target.find((item) => item.id === row.id), row, { status }))
  return success({ items: rows })
}

const historyFiltered = (items, filters = {}) => items.filter((item) => {
  const keyword = String(filters.keyword || '').trim()
  return (!filters.year || String(item.year) === String(filters.year)) && (!filters.status || item.status === filters.status) && (!keyword || `${item.name || ''}${item.regionName || ''}${item.levelName || ''}`.includes(keyword))
})
export const fetchPlanHistory = (filters = {}) => mockRequest(() => historyFiltered(PLAN_HISTORY, filters))
export const fetchTaskHistory = (role, filters = {}) => mockRequest(() => historyFiltered(TASK_HISTORY.filter((item) => {
  const level = roleLevel(role)
  const visibleLevel = childLevel(role)
  if (level === 'province') return item.level === 'city'
  if (level === 'city') return item.level === 'county' && String(item.regionCode).startsWith(String(role?.regionCode || ''))
  if (level === 'county') return item.level === 'town' && String(item.regionCode).startsWith(String(role?.regionCode || ''))
  return false
}), filters))
export const fetchPlanHistoryDetail = (id) => mockRequest(() => PLAN_HISTORY.find((item) => item.id === id) || null)
export const fetchTaskHistoryDetail = (id) => mockRequest(() => TASK_HISTORY.find((item) => item.id === id) || null)
export const fetchTaskPathDetails = (filters = {}) => mockRequest(() => TASK_PATH_DETAILS.filter((item) => (!filters.year || item.year === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.cityCode || item.cityCode === filters.cityCode) && (!filters.countyCode || item.countyCode === filters.countyCode) && (!filters.keyword || `${item.cityName}${item.countyName}${item.townName}${item.subjectName}${item.planName}`.includes(filters.keyword))))
export const fetchCountyTaskDetails = (filters = {}) => mockRequest(() => {
  const subjectTaskRows = filters.planId && filters.countyCode
    ? PLANTING_PLAN_SUBJECT_TASKS
        .filter((item) => item.planId === filters.planId && item.regionCode === filters.countyCode)
        .map((item) => {
          const task = TASK_PATH_DETAILS.find((row) => row.planId === item.planId && row.subjectId === item.subjectId && row.countyCode === item.regionCode)
          return {
            ...task,
            id: task?.id || item.id,
            planId: item.planId,
            year: task?.year,
            quarter: task?.quarter,
            cropType: item.cropType || task?.cropType,
            countyCode: item.regionCode,
            countyName: filters.countyName || task?.countyName,
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            owner: item.owner,
            taskArea: Number(item.targetArea || 0),
            plotRows: item.plotRows || [],
            status: task?.status || '已分解',
            progress: task?.progress || 0
          }
        })
    : []
  let sourceRows = subjectTaskRows.length
    ? subjectTaskRows
    : TASK_PATH_DETAILS.filter((item) => (!filters.countyName || item.countyName === filters.countyName) && (!filters.year || item.year === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.cropType || item.cropType === filters.cropType))
  if (filters.countyCode === '340123' && sourceRows.length === 1) {
    const base = sourceRows[0]
    sourceRows = [0, 1, 2].map((index) => index === 0 ? base : ({ ...base, id: `${base.id}-${index + 1}`, subjectId: `SUB-340123-00${index + 1}`, subjectName: `肥西县丰收种植专业合作社${index + 1}`, owner: ['李丰', '王成'][index - 1], taskArea: Number((Number(base.taskArea) * (index === 1 ? 0.86 : 0.94)).toFixed(1)), actualArea: Number((Number(base.actualArea) * (index === 1 ? 0.86 : 0.94)).toFixed(1)), plots: [] }))
  }
  const rows = sourceRows.map((item) => {
    const plots = PLOTS.filter((plot) => plot.subjectId === item.subjectId)
    const assignedPlots = item.plotRows?.length
      ? item.plotRows.map((assigned) => ({
          ...PLOTS.find((plot) => plot.id === assigned.plotId),
          id: assigned.plotId,
          name: assigned.plotName,
          areaMu: Number(assigned.targetArea || 0),
          sourceAreaMu: Number(assigned.areaMu || 0),
          targetArea: Number(assigned.targetArea || 0),
          townCode: assigned.townCode,
          townName: assigned.townName,
          villageName: assigned.villageName
        }))
      : plots
    const assignedArea = item.plotRows?.length
      ? item.plotRows.reduce((sum, plot) => sum + Number(plot.targetArea || 0), 0)
      : null
    return {
      ...item,
      actualArea: assignedArea ?? item.actualArea ?? Number((item.taskArea * item.progress / 100).toFixed(2)),
      villageName: item.villageName || taskVillageName(item.townCode),
      plots: assignedPlots.length ? assignedPlots : [{ id: `${item.id}-plot`, name: '示范地块', areaMu: item.taskArea }]
    }
  })
  if (rows.length) return rows

  const countyName = filters.countyName || '示范县'
  const cityName = filters.cityName || '所属市'
  const totalMu = Number(filters.area || 10) * 10000
  const townNames = [`${countyName.slice(0, 2)}镇`, `${countyName.slice(0, 2)}乡`]
  const ratios = [0.28, 0.24, 0.26, 0.22]
  return ratios.map((ratio, index) => {
    const townIndex = Math.floor(index / 2)
    const taskArea = Number((totalMu * ratio).toFixed(2))
    const subjectName = `${countyName}${index % 2 ? '丰收家庭农场' : '粮丰种植专业合作社'}${index + 1}`
    return {
      id: `GENERATED-${countyName}-${index + 1}`,
      planName: `${filters.year || 2026}年${filters.quarter || '第一季度'}${filters.cropType || '粮食'}种植计划`,
      year: Number(filters.year || 2026),
      quarter: filters.quarter || '第一季度',
      cropType: filters.cropType || '粮食',
      cityName,
      countyName,
      townCode: `GENERATED-TOWN-${townIndex + 1}`,
      townName: townNames[townIndex],
      villageName: `${townNames[townIndex]}${index % 2 ? '东村' : '西村'}`,
      subjectId: `GENERATED-SUBJECT-${countyName}-${index + 1}`,
      subjectName,
      owner: ['张明', '李丰', '王成', '赵新'][index],
      taskArea,
      actualArea: Number((taskArea * [1, 0.86, 0.72, 0.45][index]).toFixed(2)),
      issuedAt: `2026-0${townIndex + 3}-${String(12 + index).padStart(2, '0')}`,
      status: index === 0 ? '已落实' : index === 3 ? '已下达' : '落实中',
      progress: [100, 86, 72, 45][index],
      plots: [1, 2].map((plotIndex) => ({
        id: `GENERATED-PLOT-${countyName}-${index + 1}-${plotIndex}`,
        name: `${subjectName}${plotIndex}号地块`,
        areaMu: Number((taskArea / 2).toFixed(2))
      }))
    }
  })
})

const taskVillageName = (townCode) => ({
  '341222104': '旧县村',
  '341222103': '大新村',
  '341226106': '润河村',
  '341622105': '义门村',
  '340123101': '三河村'
}[townCode] || '中心村')

export const fetchTaskHierarchy = (filters = {}) => mockRequest(() => {
  const role = filters.role
  const sourceRows = TASK_PATH_DETAILS.filter((item) => {
    const plots = PLOTS.filter((plot) => plot.subjectId === item.subjectId)
    const subjectType = item.subjectName.includes('合作社') ? '合作社' : item.subjectName.includes('家庭农场') ? '家庭农场' : '种植大户'
    const roleVisible = !role || role.code === 'province' || (role.subjectId ? item.subjectId === role.subjectId : !role.regionCode || String(item[role.code === 'city' ? 'cityCode' : role.code === 'county' ? 'countyCode' : 'townCode'] || '').startsWith(String(role.regionCode)))
    return roleVisible && (!filters.year || item.year === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.region || `${item.cityName}${item.countyName}${item.townName}`.includes(filters.region)) && (!filters.cropType || item.cropType === filters.cropType) && (!filters.subjectType || subjectType === filters.subjectType) && (!filters.plotRange || (filters.plotRange === 'linked' ? plots.length > 0 : plots.length === 0)) && (!filters.cityCode || item.cityCode === filters.cityCode) && (!filters.countyCode || item.countyCode === filters.countyCode) && (!filters.keyword || `${item.cityName}${item.countyName}${item.townName}${item.subjectName}${item.planName}`.includes(filters.keyword))
  })
  const plans = []
  const addNode = (parent, id, level, name, unit, source, area) => {
    let node = parent.children.find((item) => item.id === id)
    if (!node) {
      node = { id, level, name, unit, area: 0, taskCount: 0, status: source.status, children: [] }
      parent.children.push(node)
    }
    node.area += area
    node.taskCount += 1
    if (source.status === '落实中') node.status = '落实中'
    return node
  }
  sourceRows.forEach((item) => {
    const plots = PLOTS.filter((plot) => plot.subjectId === item.subjectId)
    const plotArea = plots.length ? item.taskArea / plots.length : item.taskArea
    let plan = plans.find((row) => row.id === `plan-${item.year}-${item.quarter}-${item.cropType}`)
    if (!plan) {
      plan = { id: `plan-${item.year}-${item.quarter}-${item.cropType}`, level: 'province', name: item.planName, unit: '安徽省农业农村厅', year: item.year, quarter: item.quarter, cropType: item.cropType, area: 0, taskCount: 0, status: '已分解', children: [] }
      plans.push(plan)
    }
    plan.area += item.taskArea
    plan.taskCount += 1
    if (item.status === '落实中') plan.status = '落实中'
    const city = addNode(plan, `city-${item.cityCode}`, 'city', item.cityName, `${item.cityName}农业农村局`, item, item.taskArea)
    const county = addNode(city, `county-${item.countyCode}`, 'county', item.countyName, `${item.countyName}农业农村局`, item, item.taskArea)
    const town = addNode(county, `town-${item.townCode}`, 'town', item.townName, `${item.townName}人民政府`, item, item.taskArea)
    const villageName = taskVillageName(item.townCode)
    const village = addNode(town, `village-${item.townCode}`, 'village', villageName, `${villageName}村委会`, item, item.taskArea)
    const subject = addNode(village, `subject-${item.subjectId}`, 'subject', item.subjectName, item.owner, item, item.taskArea)
    const plotRows = plots.length ? plots : [{ id: `${item.id}-plot`, name: '未关联地块', areaMu: plotArea }]
    plotRows.forEach((plot) => {
      const plotNode = addNode(subject, `plot-${item.id}-${plot.id}`, 'plot', plot.name, `${Number(plot.areaMu || plotArea).toFixed(1)}亩`, item, plotArea)
      plotNode.detailId = item.id
      plotNode.plotId = plot.id
    })
  })
  const normalize = (node) => {
    node.area = Number(node.area.toFixed(2))
    node.childrenCount = node.children.length
    node.children.forEach(normalize)
    return node
  }
  return plans.map(normalize)
})

export const fetchTaskPathDetail = (id) => mockRequest(() => {
  const item = TASK_PATH_DETAILS.find((row) => row.id === id)
  if (!item) return null
  const villageName = taskVillageName(item.townCode)
  const plots = PLOTS.filter((plot) => plot.subjectId === item.subjectId).map((plot) => ({ ...plot, taskArea: Number((item.taskArea / Math.max(PLOTS.filter((row) => row.subjectId === item.subjectId).length, 1)).toFixed(2)) }))
  return {
    ...item,
    villageName,
    plots,
    nodes: [
      { level: '省级', name: '安徽省', unit: '省农业农村厅', status: '已分解' },
      { level: '市级', name: item.cityName, unit: `${item.cityName}农业农村局`, status: '已分解' },
      { level: '县级', name: item.countyName, unit: `${item.countyName}农业农村局`, status: '已分解' },
      { level: '乡镇', name: item.townName, unit: `${item.townName}人民政府`, status: '已分解' },
      { level: '主体', name: item.subjectName, unit: item.owner, status: item.status }
    ]
  }
})

const planVersionForRole = (planId, role) => PLANTING_PLAN_VERSIONS.find((item) => item.planId === planId && item.roleCode === role?.code && item.regionCode === role?.regionCode)
const visiblePlantingPlans = (role) => {
  if (role?.subjectId) return []
  const versions = PLANTING_PLAN_VERSIONS.filter((item) => item.roleCode === role?.code && item.regionCode === role?.regionCode)
  if (role?.code === 'province' || !role) return PLANTING_PLAN_LIST
  return PLANTING_PLAN_LIST.filter((plan) => versions.some((item) => item.planId === plan.id) || ['已分解', '待分解'].includes(plan.status))
}
export const fetchPlantingPlans = (role, filters = {}) => mockRequest(() => visiblePlantingPlans(role).filter((item) => (!filters.year || item.year === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.keyword || `${item.cropType}${item.description}`.includes(filters.keyword))).map((item) => planVersionForRole(item.id, role) ? { ...item, ...planVersionForRole(item.id, role), id: item.id } : item))
export const fetchIssuedPlantingPlans = (role, filters = {}) => mockRequest(() => visiblePlantingPlans(role).filter((item) => role?.code === 'town' ? ['已分解', '待分解'].includes(item.status) : ['已分解'].includes(item.status)).filter((item) => (!filters.year || item.year === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.keyword || `${item.cropType}${item.description}`.includes(filters.keyword))).map((item) => ({ ...item, readonly: true, issueStatus: '已分解任务', issuedAt: item.issuedAt || '' })))
export const savePlantingPlan = (data, role) => mockRequest(() => {
  if (!role || !['province', 'city', 'county'].includes(role.code)) return failed('当前角色无权维护种植计划')
  if (role.code !== 'province' && !data.id) return failed('市级和县级只能修改省级发布的种植计划')
  if (!data.year || !data.quarter || Number(data.area) <= 0 || !data.cropType || !data.description) return failed('请完整填写年份、季度、计划面积、作物和计划说明')
  if (/[、,，/]/.test(String(data.cropType))) return failed('一条计划只能选择一种作物，请拆分后分别保存')
  const sourcePlan = data.id ? PLANTING_PLAN_LIST.find((row) => row.id === data.id) : null
  if (data.id && !sourcePlan) return failed('种植计划不存在')
  const status = role.code === 'province' ? (data.status || '待分解') : role.code === 'city' ? '市级上报草稿' : '县级上报草稿'
  const item = { ...data, planId: sourcePlan?.id, roleCode: role.code, regionCode: role.regionCode, area: Number(data.area), status, updatedBy: role.name || role.regionName, updatedAt: new Date().toISOString().slice(0, 10) }
  if (role.code === 'province') {
    const plan = sourcePlan || { id: data.id || `PLANT-${data.year}-${Date.now()}` }
    Object.assign(plan, { ...data, id: plan.id, area: Number(data.area), status })
    if (!sourcePlan) PLANTING_PLAN_LIST.unshift(plan)
    return success({ item: plan })
  }
  const existing = planVersionForRole(sourcePlan.id, role)
  if (existing) Object.assign(existing, item)
  else PLANTING_PLAN_VERSIONS.push({ ...item, id: `${sourcePlan.id}-${role.code}-${role.regionCode}` })
  return success({ item: existing || PLANTING_PLAN_VERSIONS.at(-1) })
})
export const fetchPlantingPlanDetail = (id, role) => mockRequest(() => {
  const plan = PLANTING_PLAN_LIST.find((item) => item.id === id)
  const version = planVersionForRole(id, role)
  return plan ? (version ? { ...plan, ...version, id: plan.id } : plan) : null
})
export const deletePlantingPlan = (id) => mockRequest(() => {
  const index = PLANTING_PLAN_LIST.findIndex((item) => item.id === id)
  if (index === -1) return failed('种植计划不存在')
  PLANTING_PLAN_LIST.splice(index, 1)
  const tasks = PLANTING_PLAN_CITY_TASKS.filter((item) => item.planId !== id)
  PLANTING_PLAN_CITY_TASKS.splice(0, PLANTING_PLAN_CITY_TASKS.length, ...tasks)
  return success()
})
const withPlanFactors = (item) => item
export const fetchPlantingPlanCityTasks = (planId, role) => mockRequest(() => {
  const plan = PLANTING_PLAN_LIST.find((item) => item.id === planId)
  if (!plan) return []
  const saved = PLANTING_PLAN_CITY_TASKS.filter((item) => item.planId === planId && (!role || (item.roleCode === role.code && item.regionCode === role.regionCode)))
  if (saved.length) {
    const provinceTask = PLANTING_PLAN_CITY_TASKS.find((item) => item.planId === planId && item.roleCode === 'province' && item.cityCode === role?.regionCode)
    return saved.map((item) => withPlanFactors({ ...item, provinceActualArea: provinceTask?.actualArea ?? provinceTask?.targetArea }, plan))
  }

  const level = roleLevel(role)
  const source = level === 'city'
    ? COUNTY_PLANS.filter((item) => item.cityCode === role.regionCode)
    : level === 'county'
      ? listTowns(role.regionCode)
      : listCities()
  const version = planVersionForRole(planId, role)
  const provinceTask = PLANTING_PLAN_CITY_TASKS.find((item) => item.planId === planId && item.roleCode === 'province' && item.cityCode === role?.regionCode)
  const area = roleLevel(role) === 'city'
    ? Number(provinceTask?.actualArea ?? provinceTask?.targetArea ?? version?.area ?? plan.area)
    : Number(version?.area || plan.area)
  const average = Number((area / Math.max(source.length, 1)).toFixed(0))
  return source.map((item, index) => {
    const code = item.code || item.cityCode || item.countyCode || item.townCode
    const name = item.name || item.cityName || item.countyName || item.townName
    const targetArea = index === source.length - 1 ? Number((area - average * (source.length - 1)).toFixed(2)) : average
    return withPlanFactors({
      id: `${planId}-${level}-${code}`,
      planId,
      [level === 'province' ? 'cityCode' : `${level}Code`]: code,
      cityCode: item.cityCode,
      countyCode: item.countyCode,
      townCode: item.townCode,
      cityName: level === 'province' ? name : item.cityName,
      countyName: level === 'city' ? name : item.countyName,
      townName: level === 'county' ? name : item.townName,
      targetArea,
      provinceActualArea: provinceTask?.actualArea ?? provinceTask?.targetArea,
      cropType: planVersionForRole(planId, role)?.cropType || plan.cropType,
      status: '待分解',
      issuedAt: ''
    }, plan)
  })
})
export const generatePlanInfluencingFactors = (planId, rows = []) => mockRequest(() => rows)
export const fetchPlantingPlanSubjectTasks = (planId, role) => mockRequest(() => {
  if (!['county', 'town'].includes(role?.code)) return []
  const saved = PLANTING_PLAN_SUBJECT_TASKS.filter((item) => item.planId === planId && item.regionCode === role.regionCode)
  if (saved.length) return saved.map((item) => ({ ...item, plots: PLOTS.filter((plot) => item.plotIds?.includes(plot.id)).map((plot) => ({ ...plot, townName: getRegion(plot.regionCode)?.name || plot.regionName || plot.regionCode, villageName: taskVillageName(plot.regionCode) })) }))
  // 县级：取市级下达的县级任务；乡镇：取县级下达的乡镇任务
  let sourceTasks = role.code === 'county'
    ? PLANTING_PLAN_CITY_TASKS.filter((item) => item.planId === planId && item.roleCode === 'city' && item.countyCode === role.regionCode)
    : PLANTING_PLAN_CITY_TASKS.filter((item) => item.planId === planId && item.roleCode === 'county' && item.townCode === role.regionCode)
  if (!sourceTasks.length) {
    const countyCode = String(role.regionCode || '').slice(0, 6)
    const countyTask = COUNTY_PLANS.find((item) => item.countyCode === countyCode)
    if (countyTask) {
      sourceTasks = [{
        id: `${planId}-${role.code === 'county' ? 'city' : 'county'}-${countyTask.countyCode}`,
        planId,
        roleCode: role.code === 'county' ? 'city' : 'county',
        cityCode: countyTask.cityCode,
        cityName: listCities().find((item) => item.code === countyTask.cityCode)?.name || countyTask.cityCode,
        countyCode: countyTask.countyCode,
        countyName: countyTask.countyName,
        townCode: role.code === 'town' ? role.regionCode : '',
        townName: role.code === 'town' ? role.regionName : '',
        targetArea: role.code === 'town' ? Number((Number(countyTask.totalArea || 0) / Math.max(listTowns(countyCode).length, 1)).toFixed(2)) : Number(countyTask.totalArea || 0),
        actualArea: Number(countyTask.totalArea || 0),
        cropType: PLANTING_PLAN_LIST.find((item) => item.id === planId)?.cropType || '粮食作物'
      }]
    }
  }
  const subjects = PLAN_SUBJECTS.filter((item) => String(item.regionCode || '').startsWith(String(role.regionCode)) && item.status !== '停用')
  const rows = []
  sourceTasks.forEach((source) => {
    const eligible = subjects.filter((subject) => PLOTS.some((plot) => plot.subjectId === subject.id && String(plot.regionCode || '').startsWith(String(role.regionCode))))
    const average = Number((Number(source.targetArea || source.actualArea || 0) * 10000 / Math.max(eligible.length, 1)).toFixed(1))
    eligible.forEach((subject, index) => {
      const plots = PLOTS.filter((plot) => plot.subjectId === subject.id && String(plot.regionCode || '').startsWith(String(role.regionCode)))
      const subjectArea = index === eligible.length - 1 ? Number((Number(source.targetArea || source.actualArea || 0) * 10000 - average * (eligible.length - 1)).toFixed(1)) : average
      const plotAreaTotal = plots.reduce((sum, plot) => sum + Number(plot.areaMu || 0), 0)
      const plotRows = plots.map((plot, plotIndex) => {
        const plotTarget = plotIndex === plots.length - 1
          ? Number((subjectArea - plots.slice(0, -1).reduce((sum, item) => sum + Number((subjectArea * Number(item.areaMu || 0) / Math.max(plotAreaTotal, 1)).toFixed(1)), 0)).toFixed(1))
          : Number((subjectArea * Number(plot.areaMu || 0) / Math.max(plotAreaTotal, 1)).toFixed(1))
        const region = getRegion(plot.regionCode)
        return {
          plotId: plot.id,
          plotName: plot.name,
          townCode: plot.regionCode,
          townName: region?.name || plot.regionName || plot.regionCode,
          villageName: taskVillageName(plot.regionCode),
          areaMu: Number(Number(plot.areaMu || 0).toFixed(1)),
          targetArea: plotTarget
        }
      })
      rows.push({
        id: `${planId}-subject-${subject.id}`,
        planId,
        sourceTaskId: source.id,
        regionCode: role.regionCode,
        countyCode: role.regionCode,
        subjectId: subject.id,
        subjectName: subject.name,
        owner: subject.owner,
        plotIds: plots.map((plot) => plot.id),
        plots: plots.map((plot) => ({ ...plot, townName: getRegion(plot.regionCode)?.name || plot.regionName || plot.regionCode, villageName: taskVillageName(plot.regionCode) })),
        plotCount: plots.length,
        plotRows,
        targetArea: subjectArea,
        townName: plotRows[0]?.townName || '',
        villageName: plotRows[0]?.villageName || '',
        cropType: source.cropType,
        status: '待分解'
      })
    })
  })
  return rows
})
export const fetchPlantingPlanIssueRows = (planId, level, role, parent = null) => mockRequest(async () => {
  if (level === 'subject') {
    const subjectRole = {
      ...role,
      code: parent?.townCode ? 'town' : 'county',
      regionCode: parent?.townCode || parent?.countyCode || role?.regionCode,
      regionName: parent?.townName || parent?.countyName || role?.regionName
    }
    return fetchPlantingPlanSubjectTasks(planId, subjectRole)
  }

  const plan = PLANTING_PLAN_LIST.find((item) => item.id === planId)
  if (!plan) return []
  const version = planVersionForRole(planId, role)
  // 县级下钻乡镇：优先取县级已保存的分解任务，未分解时展示区划乡镇待分解
  if (level === 'town') {
    const countyCode = parent?.countyCode || role?.regionCode
    const saved = PLANTING_PLAN_CITY_TASKS.filter((item) => item.planId === planId && item.roleCode === 'county' && item.regionCode === countyCode)
    const source = saved.length ? saved : listTowns(countyCode).map((town) => ({ townCode: town.code, townName: town.name, targetArea: 0 }))
    return source.map((item) => withPlanFactors({
      id: `${planId}-town-${item.townCode}`,
      planId,
      level: 'town',
      cityCode: item.cityCode || parent?.cityCode || '',
      cityName: item.cityName || parent?.cityName || '',
      countyCode,
      countyName: item.countyName || parent?.countyName || getRegion(countyCode)?.name || '',
      townCode: item.townCode,
      townName: item.townName,
      targetArea: Number(item.targetArea || 0),
      cropType: version?.cropType || plan.cropType,
      issuedAt: item.issuedAt || item.updatedAt || '',
      hasChildren: true
    }, plan))
  }
  const source = level === 'city'
    ? listCities()
    : COUNTY_PLANS.filter((item) => item.cityCode === (parent?.cityCode || role?.regionCode))
  const area = Number(version?.area || plan.area)
  const average = Number((area / Math.max(source.length, 1)).toFixed(2))
  return source
    .filter((item) => level !== 'city' || role?.code !== 'city' || item.code === role.regionCode)
    .map((item, index, visibleSource) => {
    const code = level === 'city' ? item.code : item.countyCode
    const name = level === 'city' ? item.name : item.countyName
    const targetArea = level === 'city'
      ? index === visibleSource.length - 1 ? Number((area - average * (visibleSource.length - 1)).toFixed(2)) : average
      : Number(item.totalArea || item.targetArea || 0)
    return withPlanFactors({
      id: `${planId}-${level}-${code}`,
      planId,
      level,
      cityCode: level === 'city' ? code : item.cityCode,
      cityName: level === 'city' ? name : item.cityName,
      countyCode: level === 'county' ? code : '',
      countyName: level === 'county' ? name : '',
      targetArea,
      cropType: version?.cropType || plan.cropType,
      issuedAt: item.issuedAt || '',
      hasChildren: true
    }, plan)
  })
})
export const savePlantingPlanSubjectTasks = (planId, rows, role) => mockRequest(() => {
  if (!['county', 'town'].includes(role?.code)) return failed('只有县级或乡镇级管理员可以分解到种植主体和地块')
  const validRows = rows.filter((item) => item.subjectId && Number(item.targetArea) > 0)
  if (!validRows.length) return failed('请至少配置一个种植主体及落实面积')
  for (const row of validRows) {
    const subject = PLAN_SUBJECTS.find((item) => item.id === row.subjectId)
    const plots = PLOTS.filter((plot) => (row.plotIds || []).includes(plot.id) && String(plot.regionCode || '').startsWith(String(role.regionCode)) && plot.subjectId === row.subjectId)
    if (!subject || !String(subject.regionCode || '').startsWith(String(role.regionCode))) return failed('包含无权限的种植主体')
  }
  const retained = PLANTING_PLAN_SUBJECT_TASKS.filter((item) => item.planId !== planId || item.regionCode !== role.regionCode)
  const nextRows = validRows.map((row) => ({ ...row, planId, regionCode: role.regionCode, plotIds: row.plotIds || [], plotRows: (row.plotRows || []).filter((item) => (row.plotIds || []).includes(item.plotId)), status: '已分解', updatedBy: role.name || role.regionName, updatedAt: new Date().toISOString().slice(0, 10) }))
  PLANTING_PLAN_SUBJECT_TASKS.splice(0, PLANTING_PLAN_SUBJECT_TASKS.length, ...retained, ...nextRows)
  nextRows.forEach((row) => {
    const task = TASK_PATH_DETAILS.find((item) => item.id === row.sourceTaskId && item.subjectId === row.subjectId)
    const source = PLANTING_PLAN_CITY_TASKS.find((item) => item.id === row.sourceTaskId)
    const taskCountyCode = role.code === 'town' ? String(role.regionCode).slice(0, 6) : role.regionCode
    const data = { id: task?.id || `TASK-${planId}-${row.subjectId}`, planId, planName: `${PLANTING_PLAN_LIST.find((item) => item.id === planId)?.year || ''}年${PLANTING_PLAN_LIST.find((item) => item.id === planId)?.quarter || ''}${row.cropType}种植计划`, year: PLANTING_PLAN_LIST.find((item) => item.id === planId)?.year, quarter: PLANTING_PLAN_LIST.find((item) => item.id === planId)?.quarter, cropType: row.cropType, cityCode: source?.cityCode, cityName: source?.cityName, countyCode: taskCountyCode, countyName: getRegion(taskCountyCode)?.name || role.regionName, townCode: role.code === 'town' ? role.regionCode : row.plotRows?.[0]?.townCode || '', townName: role.code === 'town' ? role.regionName : row.plotRows?.[0]?.townName || '', subjectId: row.subjectId, subjectName: row.subjectName, owner: row.owner, taskArea: Number(row.targetArea), issuedAt: '', status: '已分解', progress: 0, plotIds: row.plotIds, plotRows: row.plotRows }
    if (task) Object.assign(task, data)
    else TASK_PATH_DETAILS.push(data)
  })
  return success({ rows: nextRows.map((row) => ({ ...row, plots: PLOTS.filter((plot) => row.plotIds.includes(plot.id)) })) })
})
export const savePlantingPlanCityTasks = (planId, rows, role) => mockRequest(() => {
  const plan = PLANTING_PLAN_LIST.find((item) => item.id === planId)
  if (!role || !['province', 'city', 'county'].includes(role.code)) return failed('当前角色无权分解种植计划')
  if (!plan) return failed('种植计划不存在')
  let version = role.code === 'province' ? plan : planVersionForRole(planId, role)
  // 市/县级首次分解时自动确认接收计划并生成版本，避免“请先保存当前角色的计划修改”流程断点
  if (role.code !== 'province' && !version) {
    version = { id: `${planId}-${role.code}-${role.regionCode}`, planId, roleCode: role.code, regionCode: role.regionCode, year: plan.year, quarter: plan.quarter, area: Number(plan.area), cropType: plan.cropType, description: plan.description, status: '未上报', updatedBy: role.name || role.regionName, updatedAt: new Date().toISOString().slice(0, 10) }
    PLANTING_PLAN_VERSIONS.push(version)
  }
  // 分解/下达只维护下级参考目标，不改变本级正式上报状态，也不生成审核记录。
  const nextStatus = '已分解'
  const nextRows = rows.map((item) => ({ ...item, planId, status: nextStatus, issuedAt: '', updatedBy: role.name || role.regionName, updatedAt: new Date().toISOString().slice(0, 10) }))
  const retained = PLANTING_PLAN_CITY_TASKS.filter((item) => item.planId !== planId || item.roleCode !== role.code || item.regionCode !== role.regionCode)
  PLANTING_PLAN_CITY_TASKS.splice(0, PLANTING_PLAN_CITY_TASKS.length, ...retained, ...nextRows.map((item) => ({ ...item, roleCode: role.code, regionCode: role.regionCode })))
  Object.assign(version, { ...(role.code === 'province' ? { status: nextStatus } : {}), currentLevel: role.code, lastOperator: role.name || role.regionName, updatedAt: new Date().toISOString().slice(0, 10) })
  return success({ rows: nextRows })
})
export const submitPlantingPlan = (id, role) => mockRequest(() => {
  const plan = PLANTING_PLAN_LIST.find((item) => item.id === id)
  if (!plan) return failed('种植计划不存在')
  if (!role || !['province', 'city', 'county'].includes(role.code)) return failed('当前角色无权提交种植计划')
  const version = role.code === 'province' ? null : planVersionForRole(id, role)
  if (role.code !== 'province' && !version) return failed('请先保存当前角色的计划修改')
  if (role.code !== 'province' && version.status === '未上报') return failed('请先编制并保存本级上报计划，再提交上报')
  const status = role.code === 'province' ? '已分解' : '待审核'
  const target = version || plan
  Object.assign(target, { status, currentLevel: role.code, submittedAt: new Date().toISOString().slice(0, 10), submitter: role.name || role.regionName })
  if (role.code === 'county') {
    const townTasks = PLANTING_PLAN_CITY_TASKS.filter((item) => item.planId === id && item.roleCode === 'county' && item.regionCode === role.regionCode)
    const townArea = townTasks.reduce((sum, item) => sum + Number(item.targetArea || 0), 0)
    const reportedArea = Number(target.area || plan.area || 0)
    const countyPlan = {
      id: `${id}-${role.regionCode}`,
      countyCode: role.regionCode,
      countyName: role.regionName,
      area: Number((reportedArea || townArea).toFixed(2)),
      actualArea: Number((reportedArea || townArea).toFixed(2)),
      cropType: target.cropType,
      description: target.description,
      townCount: townTasks.length,
      townNames: townTasks.map((item) => item.townName).filter(Boolean),
      status: '待市级审核',
      cityAuditStatus: 'pending',
      cityAuditor: '',
      cityAuditedAt: '',
      cityAuditOpinion: ''
    }
    const existingAudit = PLAN_AUDITS.find((item) => item.targetId === id && item.regionCode === role.regionCode && item.auditLevel === '市级审核')
    const audit = existingAudit || {
      id: `AUDIT-COUNTY-${id}-${role.regionCode}`,
      type: '县级计划提交市级审核',
      targetId: id,
      targetName: `${role.regionName}${plan.year}年${plan.quarter}种植任务分解`,
      planYear: plan.year,
      quarter: plan.quarter,
      cropType: target.cropType,
      planDescription: target.description,
      regionCode: role.regionCode,
      regionName: role.regionName,
      submitter: role.name || role.regionName,
      submittedAt: target.submittedAt,
      totalArea: countyPlan.area,
      actualArea: countyPlan.actualArea,
      countyCount: 1,
      countyPlans: [countyPlan],
      status: 'pending',
      auditLevel: '市级审核',
      auditTrail: []
    }
    if (existingAudit) Object.assign(existingAudit, { status: 'pending', submittedAt: target.submittedAt, submitter: target.submitter, totalArea: countyPlan.area, actualArea: countyPlan.actualArea, countyPlans: [countyPlan] })
    else PLAN_AUDITS.unshift(audit)
  }
  if (role.code === 'city') {
    const existingAudit = PLAN_AUDITS.find((item) => item.type === '市级计划提交省级审核' && item.targetId === id && item.regionCode === role.regionCode)
    const audit = existingAudit || {
      id: `AUDIT-CITY-REPORT-${id}-${role.regionCode}`,
      type: '市级计划提交省级审核',
      targetId: id,
      targetName: `${role.regionName}${plan.year}年${plan.quarter}市级上报计划`,
      planYear: plan.year,
      quarter: plan.quarter,
      cropType: target.cropType,
      planDescription: target.description,
      regionCode: role.regionCode,
      regionName: role.regionName,
      submitter: role.name || role.regionName,
      submittedAt: target.submittedAt,
      totalArea: Number(target.area || plan.area || 0),
      actualArea: Number(target.area || plan.area || 0),
      countyCount: 0,
      countyPlans: [],
      status: 'pending',
      auditLevel: '省级审核',
      auditTrail: []
    }
    if (existingAudit) Object.assign(existingAudit, { status: 'pending', submittedAt: target.submittedAt, submitter: target.submitter, totalArea: Number(target.area || plan.area || 0), actualArea: Number(target.area || plan.area || 0) })
    else PLAN_AUDITS.unshift(audit)
  }
  if (role.code === 'province') {
    plan.issuedAt = target.submittedAt
    plan.auditLevel = '省级终审'
  }
  return success({ item: { ...plan, ...target, id } })
})
// 乡镇上报计划独立维护：主体分配面积仅作参考，不自动汇总为乡镇上报面积。
export const fetchTownPlanReports = (role) => mockRequest(() => TOWN_PLAN_REPORTS.filter((item) => {
  if (role?.code === 'town') return item.townCode === role.regionCode
  if (role?.code === 'county') return String(item.countyCode || '').startsWith(String(role.regionCode || ''))
  return false
}))
export const saveTownPlanReport = (data, role) => mockRequest(() => {
  if (!['town'].includes(role?.code)) return failed('只有乡镇可以维护乡镇上报计划')
  if (!data.planId || !data.cropType || !data.year || !data.quarter) return failed('计划、年度、季度和作物不能为空')
  if (/[、,，/]/.test(String(data.cropType))) return failed('乡镇上报计划只能选择一种作物')
  const sourcePlan = PLANTING_PLAN_LIST.find((item) => item.id === data.planId)
  if (sourcePlan && sourcePlan.cropType !== data.cropType) return failed(`该上级计划对应作物为${sourcePlan.cropType}`)
  if (!Number.isFinite(Number(data.area)) || Number(data.area) < 0) return failed('乡镇上报面积必须为不小于0的数字')
  const existing = data.id ? TOWN_PLAN_REPORTS.find((item) => item.id === data.id && item.townCode === role.regionCode) : null
  const item = {
    ...(existing || {}),
    id: existing?.id || `TOWN-PLAN-${data.planId}-${role.regionCode}`,
    planId: data.planId,
    year: Number(data.year),
    quarter: data.quarter,
    cropType: data.cropType,
    area: Number(data.area),
    countyCode: String(role.regionCode || '').slice(0, 6),
    countyName: getRegion(String(role.regionCode || '').slice(0, 6))?.name || '',
    townCode: role.regionCode,
    townName: role.regionName,
    subjectReferenceArea: Number(data.subjectReferenceArea || 0),
    subjectId: data.subjectId || '',
    subjectName: data.subjectName || '',
    subjectRows: Array.isArray(data.subjectRows) ? data.subjectRows.map(row => ({ subjectId: row.subjectId || '', subjectName: row.subjectName || '', targetArea: Number(row.targetArea || 0), owner: row.owner || '', plotIds: row.plotIds || [] })) : (existing?.subjectRows || []),
    remark: data.remark || '',
    status: existing?.status === '已驳回' ? '草稿' : (existing?.status || '草稿'),
    updatedBy: role.name || role.regionName,
    updatedAt: new Date().toISOString().slice(0, 10)
  }
  if (existing) Object.assign(existing, item)
  else TOWN_PLAN_REPORTS.unshift(item)
  return success({ item: existing || item })
})
export const submitTownPlanReport = (id, role) => mockRequest(() => {
  const item = TOWN_PLAN_REPORTS.find((row) => row.id === id && row.townCode === role?.regionCode)
  if (!item) return failed('乡镇上报计划不存在')
  if (Number(item.area) <= 0) return failed('乡镇上报面积必须大于0')
  if (item.status === '待县级审核') return failed('当前计划已提交，请等待县级审核')
  Object.assign(item, { status: '待县级审核', submittedAt: new Date().toISOString().slice(0, 10), submitter: role.name || role.regionName, auditOpinion: '' })
  return success({ item })
})
export const auditTownPlanReport = (id, approved, opinion = '', role) => mockRequest(() => {
  if (role?.code !== 'county') return failed('只有县级可以审核乡镇上报计划')
  const item = TOWN_PLAN_REPORTS.find((row) => row.id === id && String(row.countyCode || '').startsWith(String(role.regionCode || '')))
  if (!item) return failed('乡镇上报计划不存在')
  if (item.status !== '待县级审核') return failed('当前乡镇上报计划已处理')
  if (!approved && !String(opinion || '').trim()) return failed('退回时必须填写审核意见')
  Object.assign(item, { status: approved ? '审核通过' : '已驳回', auditor: role.name || role.regionName, auditedAt: new Date().toISOString().slice(0, 10), auditOpinion: String(opinion || '').trim() })
  return success({ item })
})
export const fetchProvincePlan = () => mockRequest(() => PROVINCE_PLAN)
export const fetchQuarterlyPlanTargets = (year = PROVINCE_PLAN.year) => mockRequest(() => QUARTERLY_PLAN_TARGETS.filter((item) => item.year === Number(year)))
export const fetchCityQuarterAllocations = (year = PROVINCE_PLAN.year, quarter = 'Q1') => mockRequest(() => CITY_QUARTER_ALLOCATIONS.filter((item) => item.year === Number(year) && item.quarter === quarter))
export const saveProvincePlan = (plan, { allowIssued = false } = {}) => mockRequest(() => {
  if (PROVINCE_PLAN.status === 'issued' && !allowIssued) return failed('省级计划已下达，请先发起调整')
  const next = { ...PROVINCE_PLAN, ...plan }
  if (!validatePlanAreas(next)) return failed('省级计划只能填写一种作物，且计划面积必须大于0')
  Object.assign(PROVINCE_PLAN, plan)
  return success({ item: PROVINCE_PLAN })
}, 300)
export const adjustProvincePlan = () => mockRequest(() => {
  if (!PROVINCE_PLAN.id) return failed('计划不存在')
  if (PROVINCE_PLAN.status !== 'issued') return failed('当前计划无需发起调整')
  PROVINCE_PLAN.status = 'drafting'
  PROVINCE_PLAN.adjusting = true
  return success({ item: PROVINCE_PLAN })
})
export const issueProvincePlan = (plan) => saveProvincePlan({ ...plan, status: 'issued', adjusting: false, issuedAt: new Date().toISOString().slice(0, 10) }, { allowIssued: true })

export const fetchCityPlans = (role) => mockRequest(() => {
  if (!role || role.regionCode === '340000') return CITY_PLANS
  const cityCode = role.code === 'city' ? role.regionCode : String(role.regionCode || '').slice(0, 4) + '00'
  return CITY_PLANS.filter((item) => item.cityCode === cityCode)
})
export const fetchCountyPlans = (cityCode) => mockRequest(() => COUNTY_PLANS.filter((item) => !cityCode || item.cityCode === cityCode))
export const fetchCountyPlanIssueList = (role, filters = {}) => mockRequest(() => {
  const countyPlan = role?.code === 'county'
    ? COUNTY_PLANS.find((item) => item.countyCode === role.regionCode)
    : null

  if (countyPlan) {
    const planRows = visiblePlantingPlans(role).filter((item) =>
      (!filters.year || item.year === Number(filters.year)) &&
      (!filters.quarter || item.quarter === filters.quarter) &&
      (!filters.keyword || `${item.cropType}${item.description}`.includes(filters.keyword))
    )
    return planRows.map((item) => ({
      ...item,
      readonly: true,
      countyPlans: []
    }))
  }

  return visiblePlantingPlans(role)
    .filter((item) => ['已分解'].includes(item.status))
    .map((item) => ({
      id: item.id,
      year: item.year,
      quarter: item.quarter,
      cityName: item.cityName || '',
      cropType: item.cropType,
      countyCount: 0,
      plannedArea: item.area,
      actualArea: item.area,
      submitUnit: '上级下达单位',
      issuedAt: item.issuedAt || '',
      countyPlans: []
    }))
    .filter((item) => (!filters.year || item.year === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.keyword || `${item.cityName}${item.cropType}${item.submitUnit}`.includes(filters.keyword)))
})
export const fetchTownPlans = (countyCode) => mockRequest(() => TOWN_PLANS.filter((item) => !countyCode || item.countyCode === countyCode))

export const savePlanRows = (level, rows) => mockRequest(() => saveRows(level, rows))
export const issuePlanRows = (level, ids) => mockRequest(() => {
  const target = planTarget(level)
  if (!target || !Array.isArray(ids) || !ids.length) return failed('请选择需要下达的计划')
  const missing = ids.find((id) => !target.some((item) => item.id === id))
  if (missing) return failed(`未找到计划 ${missing}`)
  ids.forEach((id) => { target.find((item) => item.id === id).status = 'issued' })
  return success()
})
export const updatePlan = (level, id, data) => mockRequest(() => {
  const target = planTarget(level)
  const found = target?.find((item) => item.id === id)
  if (!found) return failed('计划记录不存在')
  if (found.status === 'issued') return failed('计划已下达，请先进入调整流程')
  const next = { ...found, ...data }
  if (!validatePlanAreas(next)) return failed('计划总面积必须等于各作物面积合计且面积均大于 0')
  Object.assign(found, data)
  return success({ item: found })
})
export const saveDecomposedPlans = (level, rows) => savePlanRows(level, rows)
export const issueDecomposedPlans = (level, ids) => issuePlanRows(level, ids)
export const fetchDecomposeData = (role) => mockRequest(() => {
  const parent = parentPlanByRole(role)
  const rows = childRowsByRole(role)
  if (roleLevel(role) === 'subject') return failed('当前主体角色无行政区划分解权限')
  if (!parent) return failed('上级计划不存在')
  return success({ parent: { ...parent, area: Number(parent.area || parent.totalArea || 0), cropType: parent.cropType || '小麦' }, childLevel: childLevel(role), rows })
})
export const saveDecomposeData = (role, rows) => mockRequest(() => {
  const level = childLevel(role)
  if (!level) return failed('当前角色无分解权限')
  return saveRows(level, rows)
})
export const issueDecomposeData = (role, ids, remark = '') => mockRequest(() => {
  const level = childLevel(role)
  if (!level) return failed('当前角色无下达权限')
  const target = planTarget(level)
  if (!Array.isArray(ids) || !ids.length) return failed('请选择需要下达的计划')
  const missing = ids.find((id) => !target.some((item) => item.id === id))
  if (missing) return failed(`未找到计划 ${missing}`)

  const issuedAt = new Date().toISOString().slice(0, 10)
  const issuer = role?.regionName || (roleLevel(role) === 'province' ? '安徽省农业农村厅' : '本级农业农村部门')

  ids.forEach((id) => {
    const item = target.find((row) => row.id === id)
    item.status = 'issued'

    TASK_HISTORY.unshift({
      id: `TASK-${Date.now()}-${id}`,
      year: item.year || new Date().getFullYear(),
      level,
      levelName: level === 'city' ? '市级' : level === 'county' ? '县级' : '乡镇',
      regionCode: item.cityCode || item.countyCode || item.townCode,
      regionName: item.cityName || item.countyName || item.townName,
      parentPlanId: parentPlanByRole(role)?.id || '',
      parentPlanName: `${issuer}${item.year || new Date().getFullYear()}年粮食生产计划`,
      totalArea: item.totalArea,
      area: Number(item.area || item.totalArea || 0),
      cropType: item.cropType,
      status: 'completed',
      issuedAt,
      issuer,
      remark,
      issueRecords: [{
        time: new Date().toLocaleString('zh-CN', { hour12: false }),
        issuer,
        action: remark ? `下达至${item.cityName || item.countyName || item.townName}：${remark}` : `下达至${item.cityName || item.countyName || item.townName}`
      }]
    })
  })

  return success({ ids })
})
export const batchIssuePlans = (level, ids) => issuePlanRows(level, ids)
export const updatePlanStatus = (level, id, status) => mockRequest(() => {
  const target = planTarget(level)
  const found = target?.find((item) => item.id === id)
  if (!found) return failed('计划不存在')
  found.status = status
  return success({ item: found })
})
export const saveCountyPlans = (rows) => savePlanRows('county', rows)
export const issueCountyPlans = (ids) => issuePlanRows('county', ids)
export const saveTownPlans = (rows) => savePlanRows('town', rows)
export const issueTownPlans = (ids) => issuePlanRows('town', ids)

const findParentPlan = (planId) => CITY_PLANS.find((item) => item.id === planId) || COUNTY_PLANS.find((item) => item.id === planId)
export const issueCityPlan = (planId) => mockRequest(() => {
  const plan = findParentPlan(planId)
  if (!plan) return failed('计划不存在')
  plan.status = 'issued'
  return success()
})
export const decomposeCityPlan = (planId, data) => mockRequest(() => {
  const plan = findParentPlan(planId)
  if (!plan) return failed('计划不存在')
  const next = { ...plan, ...data }
  if (!validatePlanAreas(next)) return failed('计划总面积必须等于各作物面积合计且面积均大于 0')
  Object.assign(plan, data)
  return success()
})

export const fetchPlanPlots = (role) => mockRequest(() => PLOTS.filter((plot) => inRoleScope(plot, role)).map((plot) => {
  const assignment = PLAN_PLOTS.find((item) => item.plotId === plot.id)
  return {
    ...plot,
    area: Number(plot.areaMu.toFixed(1)),
    cropName: CROP_MAP[assignment?.crop || plot.crop]?.name || '其他',
    crop: assignment?.crop || plot.crop,
    nameColor: plot.nameColor || '#409eff',
    unitName: plot.unitName || plot.regionName || plot.regionCode,
    manager: plot.manager || SUBJECT_MAP[plot.subjectId]?.owner || '',
    variety: plot.variety || '',
    purpose: plot.purpose || '粮食种植',
    plotType: plot.plotType || (plot.source ? `${plot.source}地块` : '确权地块'),
    boundary: plot.boundary || '',
    subjectName: SUBJECT_MAP[plot.subjectId]?.name || '未知主体',
    status: assignment ? 'implemented' : 'pending',
    implementedAt: assignment?.implementedAt || ''
  }
}))
export const implementPlanPlots = ({ plotIds, crop, role, status = 'implemented', reason = '' }) => mockRequest(() => {
  const selected = PLOTS.filter((plot) => plotIds.includes(plot.id) && inRoleScope(plot, role))
  if (selected.length !== plotIds.length) return failed('包含不存在或无权限的地块')
  selected.forEach((plot) => {
    const existing = PLAN_PLOTS.find((item) => item.plotId === plot.id)
    if (status === 'cancelled') {
      if (existing) {
        existing.cancelledAt = new Date().toISOString().slice(0, 10)
        existing.cancelledReason = reason || '人工反向标注'
        PLAN_PLOTS.splice(PLAN_PLOTS.indexOf(existing), 1)
      }
      return
    }
    const data = { planId: `PLAN-2026-${role?.regionCode || plot.regionCode}`, regionCode: plot.regionCode, regionName: role?.regionName || plot.regionCode, subjectId: plot.subjectId, subjectName: SUBJECT_MAP[plot.subjectId]?.name || '', crop, cropName: CROP_MAP[crop]?.name || '', area: Number(plot.areaMu.toFixed(1)), status: 'implemented', implementedAt: new Date().toISOString().slice(0, 10) }
    if (existing) Object.assign(existing, data)
    else PLAN_PLOTS.push({ id: `PLOT-PLAN-${String(PLAN_PLOTS.length + 1).padStart(3, '0')}`, plotId: plot.id, ...data })
  })
  return success({ count: selected.length })
})

const issuedPlanProgressRows = (role, type) => {
  const rows = TASK_PATH_DETAILS.flatMap((task) => {
    const crop = Object.entries(CROP_MAP).find(([, item]) => item.name === task.cropType)?.[0] || task.cropType
    const records = PROGRESS_RECORDS.filter((record) => record.subjectId === task.subjectId && record.cropName === task.cropType)
    const reportedArea = records
      .filter((record) => type === 'sow' ? ['sow', 'planting'].includes(record.type) : record.type === 'harvest')
      .reduce((sum, record) => sum + Number(record.area || 0), 0)
    const base = {
      year: task.year,
      quarter: task.quarter || ['第一季度', '第二季度', '第三季度', '第四季度'].find((q) => String(task.planName || '').includes(q)) || '第一季度',
      planId: progressPlanId(task),
      taskId: task.id,
      planName: task.planName,
      crop,
      cropName: task.cropType,
      planArea: Number(task.taskArea || 0),
      regionCode: task.townCode,
      regionName: task.townName,
      cityCode: task.cityCode,
      cityName: task.cityName,
      countyCode: task.countyCode,
      countyName: task.countyName,
      townCode: task.townCode,
      townName: task.townName,
      reportedArea,
      sownArea: type === 'sow' ? reportedArea : 0,
      harvestedArea: type === 'harvest' ? reportedArea : 0,
      updatedAt: task.issuedAt
    }
    const hasOrder = (level, regionCode) => PROGRESS_REPORT_ORDERS.some((order) => order.type === type && order.level === level && Number(order.year) === Number(task.year) && order.quarter === base.quarter && order.regionCode === regionCode)
    const result = [{ ...base, id: `${type}-${task.id}-subject`, level: 'subject', subjectId: task.subjectId, subjectName: task.subjectName, owner: task.owner }]
    // 乡镇不上报时不生成“已报进度”；有乡镇上报单时才进入参考明细。
    if (hasOrder('town', task.townCode)) {
      const townInputs = ALL_PROGRESS_ROWS(type).filter((item) => item.level === 'town' && item.regionCode === task.townCode && Number(item.year) === Number(task.year) && quarterMatched(item.quarter, base.quarter))
      const townPlanArea = townInputs.reduce((sum, item) => sum + Number(item.planArea || 0), 0) || base.planArea
      const townDoneArea = townInputs.reduce((sum, item) => sum + Number((type === 'sow' ? item.sownArea : item.harvestedArea) || 0), 0)
      result.push({ ...base, id: `${type}-${task.id}-town`, level: 'town', planArea: townPlanArea, reportedArea: townDoneArea, sownArea: type === 'sow' ? townDoneArea : 0, harvestedArea: type === 'harvest' ? townDoneArea : 0 })
    }
    // 县、市只要形成上报单就展示记录；是否进入正式口径由审核状态单独判断。
    if (hasOrder('county', task.countyCode)) result.push({ ...base, id: `${type}-${task.id}-county`, level: 'county', regionCode: task.countyCode, regionName: task.countyName })
    if (hasOrder('city', task.cityCode)) result.push({ ...base, id: `${type}-${task.id}-city`, level: 'city', regionCode: task.cityCode, regionName: task.cityName })
    return result
  })

  return rows.filter((item) => {
    if (!role || role.code === 'province' || role.regionCode === '340000') return true
    if (role.subjectId) return item.subjectId === role.subjectId
    return String(item.regionCode || '').startsWith(String(role.regionCode || '')) || String(item.countyCode || '').startsWith(String(role.regionCode || '')) || String(item.townCode || '').startsWith(String(role.regionCode || ''))
  })
}

const sowingRowsForRole = (role) => {
  const issuedRows = issuedPlanProgressRows(role, 'sow')
  if (issuedRows.length) return issuedRows
  if (!role || role.code === 'province' || role.regionCode === '340000') return []
  const regionCode = String(role.regionCode || '')
  return SOWING_PROGRESS_ROWS.filter((item) => {
    if (role.code === 'city') {
      return String(item.cityCode || '').startsWith(regionCode)
    }
    if (role.code === 'county') {
      return String(item.countyCode || item.regionCode || '').startsWith(regionCode)
    }
    if (role.code === 'town') {
      return String(item.townCode || item.regionCode || '').startsWith(regionCode)
    }
    if (role.subjectId) return item.subjectId === role.subjectId
    return String(item.regionCode || '').startsWith(regionCode)
  })
}
const sowingProgress = (row) => row.planArea > 0 ? Number((row.sownArea / row.planArea * 100).toFixed(1)) : 0
const harvestProgress = (row) => row.planArea > 0 ? Number((row.harvestedArea / row.planArea * 100).toFixed(1)) : 0
const progressSummary = (rows, areaField, rateField) => {
  const planArea = rows.reduce((sum, item) => sum + Number(item.planArea || 0), 0)
  const area = rows.reduce((sum, item) => sum + Number(item[areaField] || 0), 0)
  return {
    planArea,
    [areaField]: area,
    [rateField]: planArea ? Number((area / planArea * 100).toFixed(1)) : 0
  }
}
const harvestRowsForRole = (role) => {
  const issuedRows = issuedPlanProgressRows(role, 'harvest')
  if (issuedRows.length) return issuedRows
  if (!role || role.code === 'province' || role.regionCode === '340000') return []
  const regionCode = String(role.regionCode || '')
  return HARVEST_PROGRESS_ROWS.filter((item) => {
    if (role.code === 'city') return String(item.cityCode || '').startsWith(regionCode)
    if (role.code === 'county') return String(item.countyCode || item.regionCode || '').startsWith(regionCode)
    if (role.code === 'town') return String(item.townCode || item.regionCode || '').startsWith(regionCode)
    if (role.subjectId) return item.subjectId === role.subjectId
    return String(item.regionCode || '').startsWith(regionCode)
  })
}
const progressPlanOverview = (role, type) => {
  const sourceRows = type === 'sow' ? SOWING_PROGRESS_ROWS : HARVEST_PROGRESS_ROWS
  const plans = PLANTING_PLAN_LIST.filter((plan) => Number(plan.year) === 2026)
  return plans.map((plan, index) => {
    const planRows = sourceRows.filter((row) => row.planId === plan.id || String(row.planName || '').includes(`${plan.year}年${plan.quarter}`))
    const scoped = planRows.filter((row) => {
      if (!role || role.regionCode === '340000') return true
      if (role.code === 'city') return String(row.cityCode || '').startsWith(String(role.regionCode))
      if (role.code === 'county') return String(row.countyCode || row.regionCode || '').startsWith(String(role.regionCode))
      if (role.code === 'town') return String(row.townCode || row.regionCode || '').startsWith(String(role.regionCode))
      return row.subjectId === role.subjectId
    })
    const planArea = Number(plan.area || 0)
    const rawDoneArea = scoped.reduce((sum, row) => sum + Number((type === 'sow' ? row.sownArea : row.harvestedArea) || 0), 0)
    const doneArea = Math.min(planArea * 0.96, rawDoneArea || Number((planArea * (0.18 + ((index + (role?.code === 'city' ? 1 : 0)) % 5) * 0.11)).toFixed(1)))
    return { id: `PROGRESS-PLAN-${type}-${plan.id}-${role?.regionCode || '340000'}`, code: plan.id, planId: plan.id, name: `${plan.year}年${plan.quarter}${plan.cropType}计划`, planName: `${plan.year}年${plan.quarter}${plan.cropType}计划`, year: plan.year, quarter: plan.quarter, cropName: plan.cropType, planArea, doneArea, sownArea: type === 'sow' ? doneArea : 0, harvestedArea: type === 'harvest' ? doneArea : 0, sowProgress: type === 'sow' ? Number((doneArea / planArea * 100).toFixed(1)) : 0, harvestProgress: type === 'harvest' ? Number((doneArea / planArea * 100).toFixed(1)) : 0, progress: Number((doneArea / planArea * 100).toFixed(1)), level: 'plan', regionCode: role?.regionCode || '340000', regionName: role?.regionName || '安徽省' }
  })
}
export const fetchProgressPlanOverview = (role, type = 'sow') => mockRequest(() => progressPlanOverview(role, type))
export const fetchSowingProgress = (role, filters = {}) => mockRequest(() => sowingRowsForRole(role).filter((item) => (!filters.year || Number(item.year) === Number(filters.year)) && (!filters.keyword || `${item.regionName}${item.crop}`.includes(filters.keyword)) && (!filters.crop || item.crop === filters.crop)).map((item) => ({ ...item, sowProgress: sowingProgress(item) })))
export const fetchHarvestProgress = (role, filters = {}) => mockRequest(() => harvestRowsForRole(role).filter((item) => (!filters.year || Number(item.year) === Number(filters.year)) && (!filters.keyword || `${item.regionName}${item.crop}`.includes(filters.keyword)) && (!filters.crop || item.crop === filters.crop)).map((item) => ({ ...item, harvestProgress: harvestProgress(item) })))
export const saveSowingProgress = (data, role) => mockRequest(() => {
  if (!data.regionCode || !data.regionName || !data.crop) return failed('地区和作物不能为空')
  if (!inRoleScope({ regionCode: data.regionCode }, role)) return failed('当前角色无权填报该地区')
  const planArea = Number(data.planArea)
  const sownArea = Number(data.sownArea)
  if (!Number.isFinite(planArea) || planArea <= 0) return failed('计划面积必须大于0')
  if (!Number.isFinite(sownArea) || sownArea < 0) return failed('已播面积不能小于0')
  if (sownArea > planArea) return failed('已播面积不能超过计划面积')
  const next = { ...data, year: Number(data.year || 2026), quarter: data.quarter || '第三季度', planArea, sownArea, incrementArea: Number(data.progressIncrement ?? data.sownArea ?? 0), level: role?.code || 'region', updatedAt: new Date().toISOString().slice(0, 10) }
  // 每次填报单独保留历史快照，当前进度记录只保存最新累计值。
  const existing = SOWING_PROGRESS_ROWS.find((item) => item.regionCode === data.regionCode && item.crop === data.crop && Number(item.year) === next.year && item.quarter === next.quarter && (data.planId ? item.planId === data.planId : !item.planId))
  PROGRESS_ENTRY_HISTORY.unshift({ ...next, id: `SOW-HISTORY-${Date.now()}`, type: 'sow', sownArea: Number(existing?.sownArea || 0) + Number(next.incrementArea || 0), recordedAt: new Date().toISOString() })
  // 进度必须归属于当前选择的本级上报计划；有计划编号时禁止跨计划复用旧记录。
  if (existing) Object.assign(existing, next)
  else SOWING_PROGRESS_ROWS.unshift({ id: `SOW-${Date.now()}`, level: role?.code || 'region', ...next })
  return success({ item: { ...(existing || next), sowProgress: sowingProgress(existing || next) } })
})
export const saveHarvestProgress = (data, role) => mockRequest(() => {
  if (!data.regionCode || !data.regionName || !data.crop) return failed('地区和作物不能为空')
  if (!inRoleScope({ regionCode: data.regionCode }, role)) return failed('当前角色无权填报该地区')
  const planArea = Number(data.planArea)
  const harvestedArea = Number(data.harvestedArea)
  if (!Number.isFinite(planArea) || planArea <= 0) return failed('计划面积必须大于0')
  if (!Number.isFinite(harvestedArea) || harvestedArea < 0) return failed('已收获面积不能小于0')
  if (harvestedArea > planArea) return failed('已收获面积不能超过计划面积')
  const next = { ...data, year: Number(data.year || 2026), quarter: data.quarter || '第三季度', harvestedArea, planArea, incrementArea: Number(data.progressIncrement ?? data.harvestedArea ?? 0), level: role?.code || 'region', updatedAt: new Date().toISOString().slice(0, 10) }
  const existing = HARVEST_PROGRESS_ROWS.find((item) => item.regionCode === data.regionCode && item.crop === data.crop && Number(item.year) === next.year && item.quarter === next.quarter && (data.planId ? item.planId === data.planId : !item.planId))
  PROGRESS_ENTRY_HISTORY.unshift({ ...next, id: `HARVEST-HISTORY-${Date.now()}`, type: 'harvest', harvestedArea: Number(existing?.harvestedArea || 0) + Number(next.incrementArea || 0), recordedAt: new Date().toISOString() })
  // 进度必须归属于当前选择的本级上报计划；有计划编号时禁止跨计划复用旧记录。
  if (existing) Object.assign(existing, next)
  else HARVEST_PROGRESS_ROWS.unshift({ id: `HARVEST-${Date.now()}`, level: role?.code || 'region', ...next })
  return success({ item: { ...(existing || next), harvestProgress: harvestProgress(existing || next) } })
})
export const fetchProgressEntryHistory = (role, filters = {}) => mockRequest(() => PROGRESS_ENTRY_HISTORY.filter((item) => (!role?.regionCode || role.regionCode === '340000' || String(item.regionCode || '').startsWith(String(role.regionCode))) && (!filters.planId || item.planId === filters.planId) && (!filters.year || Number(item.year) === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.type || item.type === filters.type)).sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt))))

export const fetchTownProgressDraft = (role, filters = {}) => mockRequest(() => {
  if (role?.code !== 'town') return []
  return ALL_PROGRESS_ROWS(filters.type || 'sow').filter((item) => item.level === 'town' && item.regionCode === role.regionCode && (!filters.year || Number(item.year) === Number(filters.year)) && quarterMatched(item.quarter, filters.quarter)).map((item) => ({ ...item, doneArea: Number((filters.type || 'sow') === 'sow' ? item.sownArea || 0 : item.harvestedArea || 0) }))
})
export const fetchSowingSummary = (role) => mockRequest(() => progressSummary(sowingRowsForRole(role), 'sownArea', 'sowProgress'))
export const fetchHarvestSummary = (role) => mockRequest(() => progressSummary(harvestRowsForRole(role), 'harvestedArea', 'harvestProgress'))
export const fetchSowingRankData = (role) => mockRequest(() => {
  const rows = sowingRowsForRole(role)
  const grouped = Object.values(rows.reduce((result, item) => {
    const current = result[item.regionCode] || { code: item.regionCode, name: item.regionName, planArea: 0, sownArea: 0 }
    current.planArea += Number(item.planArea || 0)
    current.sownArea += Number(item.sownArea || 0)
    result[item.regionCode] = current
    return result
  }, {}))
  return grouped.map((item) => ({ ...item, sowProgress: item.planArea ? Number((item.sownArea / item.planArea * 100).toFixed(1)) : 0 }))
})

// ===== 播种/收获进度上报（县级、市级正式上报；乡镇数据可选）=====
const ALL_PROGRESS_ROWS = (type) => type === 'sow' ? SOWING_PROGRESS_ROWS : HARVEST_PROGRESS_ROWS
// 周期匹配：全年 = 汇总各季度
const quarterMatched = (rowQuarter, quarter) => !quarter || quarter === '全年' || rowQuarter === quarter
const progressRowsInScope = (type, { year, quarter, regionCode } = {}) => ALL_PROGRESS_ROWS(type).filter((row) =>
  (!year || Number(row.year) === Number(year)) && quarterMatched(row.quarter, quarter) && (!regionCode || String(row.regionCode || '').startsWith(String(regionCode)))
)
const aggregateProgressRows = (rows, type) => {
  const planArea = rows.reduce((sum, item) => sum + Number(item.planArea || 0), 0)
  const doneArea = rows.reduce((sum, item) => sum + Number((type === 'sow' ? item.sownArea : item.harvestedArea) || 0), 0)
  return { planArea: Number(planArea.toFixed(1)), doneArea: Number(doneArea.toFixed(1)), progress: planArea ? Number((doneArea / planArea * 100).toFixed(1)) : 0 }
}
const progressOrderFor = (type, year, quarter, level, regionCode, planId = '') => PROGRESS_REPORT_ORDERS.find(item => item.type === type && Number(item.year) === Number(year) && item.quarter === quarter && item.level === level && String(item.regionCode) === String(regionCode) && (!planId || !item.planId || item.planId === planId))
const approvedProgressRows = (rows, type) => rows.filter(row => {
  const order = progressOrderFor(type, row.year, row.quarter, row.level, row.regionCode, row.planId)
  return order?.status === '审核通过'
})
const ORDER_AUDIT_LEVEL = { town: 'county', county: 'city', city: 'province' }
const ORDER_LEVEL_NAME = { town: '乡镇', county: '县级', city: '市级' }
const progressPlanIdByQuarter = (year, quarter) => ({ '第一季度': `PLANT-${year}-Q1`, '第二季度': `PLANT-${year}-Q2`, '第三季度': `PLANT-${year}-Q3`, '第四季度': `PLANT-${year}-Q4` }[quarter] || `PLANT-${year}-FULL`)
const hasApprovedReportedPlan = (role, year, quarter) => {
  if (!role || !['county', 'city'].includes(role.code)) return false
  const auditType = role.code === 'county' ? '县级计划提交市级审核' : '市级计划提交省级审核'
  return PLAN_AUDITS.some((item) => item.type === auditType && item.status === 'approved' && Number(item.planYear) === Number(year) && item.quarter === quarter && String(item.regionCode || '') === String(role.regionCode || ''))
}
// 上报与审核面板数据源：与上报单汇总口径一致（静态进度行按角色区域过滤）
export const fetchProgressReportRows = (role, filters = {}) => mockRequest(() => {
  const { type = 'sow', year = '', quarter = '' } = filters
  const scope = !role?.regionCode || role.regionCode === '340000' ? '' : String(role.regionCode)
  const level = ['town', 'county', 'city'].includes(role?.code) ? role.code : ''
  const issued = issuedPlanProgressRows({ code: role?.code || 'province', regionCode: role?.regionCode || '340000' }, type).filter((row) => (!year || Number(row.year) === Number(year)) && quarterMatched(row.quarter, quarter) && (!scope || String(row.regionCode || '').startsWith(scope)))
  if (!level) return issued
  // 本级在首次上报前也必须能维护数据；下级/主体数据仍按已有上报单展示为参考。
  const ownRows = progressRowsInScope(type, { year, quarter, regionCode: role.regionCode }).filter((row) => row.level === level).map((row) => {
    const order = PROGRESS_REPORT_ORDERS.find((item) => item.type === type && Number(item.year) === Number(row.year) && quarterMatched(item.quarter, row.quarter || quarter) && item.level === level && item.regionCode === row.regionCode && (!row.planId || !item.planId || item.planId === row.planId))
    return ({
    ...row,
    planName: row.planName || `${row.year}年${row.quarter || quarter || ''}${row.cropName || row.crop || ''}计划`,
    planArea: Number(row.planArea || 0),
    sownArea: type === 'sow' ? Number(row.sownArea || 0) : 0,
    harvestedArea: type === 'harvest' ? Number(row.harvestedArea || 0) : 0,
    reportedArea: type === 'sow' ? Number(row.sownArea || 0) : Number(row.harvestedArea || 0),
    updatedAt: row.updatedAt || row.date || '',
    // 是否展示记录只看本级是否形成上报单；审核状态仅用于正式统计口径。
    // 计划审核不是进度记录的前置条件，避免已上报记录被错误隐藏。
    isDraft: !order,
    // 已上报记录进入跟进口径；被退回记录保留展示，但不计入汇总。
    isFormal: Boolean(order && order.status !== '已驳回'),
    reportStatus: order?.status || '未上报',
    reportId: order?.id || ''
  })
  })
  const childAndReference = issued.filter((row) => row.level !== level)
  return [...ownRows, ...childAndReference]
})

// 移动端进度填报选项：只能选择当前角色已经形成的本级上报计划，计划面积由计划记录带出。
export const fetchProgressPlanOptions = (role, filters = {}) => mockRequest(() => {
  const type = filters.type || 'sow'
  const year = filters.year || ''
  const quarter = filters.quarter || ''
  if (!['town', 'county', 'city'].includes(role?.code)) return []

  if (role.code === 'town') {
    const rows = ALL_PROGRESS_ROWS(type)
    return TOWN_PLAN_REPORTS
      .filter((item) => item.townCode === role.regionCode && ['待县级审核', '审核通过'].includes(item.status))
      .filter((item) => (!year || Number(item.year) === Number(year)) && quarterMatched(item.quarter, quarter))
      .map((item) => {
        const progress = rows.find(row => row.level === 'town' && row.regionCode === item.townCode && Number(row.year) === Number(item.year) && row.quarter === item.quarter && (row.planId === item.planId || !row.planId))
        return ({
        id: `${item.id}-${type}`,
        planId: item.planId,
        reportId: item.id,
        year: item.year,
        quarter: item.quarter,
        crop: item.cropType,
        cropName: item.cropType,
        planName: `${item.year}年${item.quarter}${item.cropType}乡镇上报计划`,
        planArea: Number(item.area || 0) * 10000,
        regionCode: item.townCode,
        regionName: item.townName,
        reportStatus: item.status,
        subjectReferenceArea: Number(item.subjectReferenceArea || 0) * 10000,
        doneArea: type === 'sow' ? Number(progress?.sownArea || 0) : Number(progress?.harvestedArea || 0)
      })
      })
  }

  const planAuditType = role.code === 'county' ? '县级计划提交市级审核' : '市级计划提交省级审核'
  // 进度填报入口必须从“本级已上报计划”进入。计划被退回后不再作为可填报计划，待审核和已通过均可继续维护进度。
  const submittedPlans = PLAN_AUDITS
    .filter((item) => item.type === planAuditType && item.regionCode === role.regionCode && item.status !== 'rejected' && (!year || Number(item.planYear) === Number(year)) && quarterMatched(item.quarter, quarter))
  const orders = PROGRESS_REPORT_ORDERS.filter((item) => item.type === type && item.level === role.code && item.regionCode === role.regionCode && item.status !== '已驳回' && (!year || Number(item.year) === Number(year)) && quarterMatched(item.quarter, quarter))
  const rows = progressRowsInScope(type, { year, quarter, regionCode: role.regionCode }).filter((item) => item.level === role.code)
  return submittedPlans.map((plan) => {
    const planId = plan.targetId || plan.id
    const planRows = rows.filter((item) => item.planId === planId)
    const order = orders.find((item) => item.planId === planId)
    const firstRow = planRows[0]
    const approvedRows = approvedProgressRows(planRows, type)
    const planArea = planRows.reduce((sum, item) => sum + Number(item.planArea || 0), 0) || Number(plan.actualArea || plan.totalArea || 0)
    return {
      id: `${planId}-${type}-${role.regionCode}`,
      planId,
      reportId: order?.id || '',
      year: Number(plan.planYear),
      quarter: plan.quarter,
      crop: firstRow?.crop || plan.cropType,
      cropName: firstRow?.cropName || plan.cropType,
      planName: plan.targetName || `${plan.planYear}年${plan.quarter}${plan.cropType || ''}本级上报计划`,
      planArea,
      regionCode: role.regionCode,
      regionName: role.regionName,
      reportStatus: order?.status || '未上报',
      doneArea: approvedRows.reduce((sum, item) => sum + Number((type === 'sow' ? item.sownArea : item.harvestedArea) || 0), 0)
    }
  })
})
export const fetchProgressReportOrders = (role, filters = {}) => mockRequest(() => {
  const { type = 'sow', year = '', quarter = '' } = filters
  return PROGRESS_REPORT_ORDERS
    .filter((item) => item.type === type && (!year || Number(item.year) === Number(year)) && (!quarter || item.quarter === quarter))
    .filter((item) => !role?.regionCode || role.regionCode === '340000' || String(item.regionCode || '').startsWith(String(role.regionCode)))
    .filter((item) => !role?.code || ORDER_AUDIT_LEVEL[item.level] === role.code)
    .map((item) => {
      const issuedRows = issuedPlanProgressRows({ code: 'province', regionCode: '340000' }, item.type).filter((row) => Number(row.year) === Number(item.year) && quarterMatched(row.quarter, item.quarter) && String(row.regionCode || '').startsWith(String(item.regionCode || '')))
      const ownRows = progressRowsInScope(item.type, { year: item.year, quarter: item.quarter, regionCode: item.regionCode }).filter((row) => row.level === item.level && (!item.planId || !row.planId || row.planId === item.planId))
      const rows = [...issuedRows.filter((row) => row.level !== item.level), ...ownRows]
      const officialRows = approvedProgressRows(rows.filter((row) => row.level === item.level), item.type)
      const subjectRows = rows.filter((row) => row.level === 'subject')
      const townRows = rows.filter((row) => row.level === 'town')
      const areaField = item.type === 'sow' ? 'sownArea' : 'harvestedArea'
      const currentRows = rows.filter(row => row.level === item.level)
      const childRowsForOrder = item.level === 'county' ? townRows : item.level === 'city' ? rows.filter(row => row.level === 'county') : subjectRows
      const summarize = list => ({ planArea: Number(list.reduce((sum, row) => sum + Number(row.planArea || 0), 0).toFixed(1)), cumulative: Number(list.reduce((sum, row) => sum + Number(row[areaField] || 0), 0).toFixed(1)), increment: Number(list.reduce((sum, row) => sum + Number(row.incrementArea || 0), 0).toFixed(1)) })
      return {
        ...item,
        planId: item.planId || progressPlanIdByQuarter(item.year, item.quarter),
        submittedSummary: item.submittedSummary || summarize(currentRows),
        childSummary: item.childSummary || summarize(childRowsForOrder),
        summary: aggregateProgressRows(officialRows, item.type),
        auditRole: ORDER_AUDIT_LEVEL[item.level],
        details: [...currentRows, ...childRowsForOrder].map(row => ({ name: row.townName || row.subjectName || row.regionName, area: Number((item.type === 'sow' ? row.sownArea : row.harvestedArea) || 0), increment: Number(row.incrementArea || 0), cumulative: Number((item.type === 'sow' ? row.sownArea : row.harvestedArea) || 0), planArea: Number(row.planArea || 0), level: row.level })),
        subjectCount: new Set(subjectRows.map((row) => row.subjectId || row.subjectName)).size,
        townCount: new Set(townRows.map((row) => row.regionCode)).size,
        auditLevelName: { county: '县级', city: '市级', province: '省级' }[ORDER_AUDIT_LEVEL[item.level]],
        canAudit: ORDER_AUDIT_LEVEL[item.level] === role?.code && item.status === '待审核'
      }
    })
})
export const submitProgressReport = (role, payload = {}) => mockRequest(() => {
  const level = { town: 'town', county: 'county', city: 'city' }[role?.code]
  if (!level) return failed('当前角色无正式进度上报权限')
  const { type = 'sow', year = new Date().getFullYear(), quarter = '第一季度', planId = '' } = payload
  const rows = progressRowsInScope(type, { year, quarter, regionCode: role.regionCode }).filter((item) => item.level === level && (!planId || item.planId === planId))
  if (!rows.length) return failed('当前周期暂无可上报的进度数据')
  const existing = PROGRESS_REPORT_ORDERS.find((item) => item.type === type && Number(item.year) === Number(year) && item.quarter === quarter && item.level === level && item.regionCode === role.regionCode && (!planId || !item.planId || item.planId === planId))
  const dateStr = new Date().toISOString().slice(0, 10)
  const timeStr = new Date().toLocaleString('zh-CN', { hour12: false })
  const operator = role.unit || role.regionName
  const parentName = level === 'town' ? '县级' : level === 'county' ? '市级' : '省级'
  const childLevel = level === 'county' ? 'town' : level === 'city' ? 'county' : 'subject'
  const action = `${existing ? '重新' : ''}向${parentName}上报${year}年${quarter}${type === 'sow' ? '播种' : '收获'}进度`
  if (existing && existing.status === '待审核') return failed('当前周期已上报，请等待上级审核')
  if (existing) {
    Object.assign(existing, { status: '待审核', reporter: operator, reportedAt: dateStr, auditor: '', auditedAt: '', auditOpinion: '', timeline: [...(existing.timeline || []), { time: timeStr, operator, action }] })
    return success({ item: existing })
  }
  const cityCode = level === 'city' ? role.regionCode : String(role.regionCode).slice(0, 4) + '00'
  const countyCode = level === 'city' ? '' : String(role.regionCode).slice(0, 6)
  const ownRows = rows.filter(row => row.level === level)
  const childRows = progressRowsInScope(type, { year, quarter, regionCode: role.regionCode }).filter(row => row.level === childLevel)
  const areaField = type === 'sow' ? 'sownArea' : 'harvestedArea'
  const summarize = list => ({ planArea: Number(list.reduce((sum, row) => sum + Number(row.planArea || 0), 0).toFixed(1)), cumulative: Number(list.reduce((sum, row) => sum + Number(row[areaField] || 0), 0).toFixed(1)), increment: Number(list.reduce((sum, row) => sum + Number(row.incrementArea || 0), 0).toFixed(1)) })
  const order = {
    id: `PRO-${type.toUpperCase()}-${year}-${quarter}-${role.regionCode}-${Date.now()}`,
    year: Number(year), quarter, type, level, planId,
    regionCode: role.regionCode, regionName: role.regionName,
    cityCode, cityName: getRegion(cityCode)?.name || '',
    countyCode, countyName: countyCode ? getRegion(countyCode)?.name || '' : '',
    townCode: level === 'town' ? role.regionCode : '', townName: level === 'town' ? role.regionName : '',
    status: '待审核', reporter: operator, reportedAt: dateStr,
    auditor: '', auditedAt: '', auditOpinion: '',
    submittedSummary: summarize(ownRows),
    childSummary: summarize(childRows),
    details: childRows.map(row => ({ name: row.townName || row.subjectName || row.regionName, area: Number(row[areaField] || 0), cumulative: Number(row[areaField] || 0), increment: Number(row.incrementArea || 0), planArea: Number(row.planArea || 0), level: row.level })),
    timeline: [{ time: timeStr, operator, action }]
  }
  PROGRESS_REPORT_ORDERS.push(order)
  return success({ item: order })
})
export const auditProgressReport = (orderId, { approved, opinion = '' }, role) => mockRequest(() => {
  const order = PROGRESS_REPORT_ORDERS.find((item) => item.id === orderId)
  if (!order) return failed('上报单不存在')
  if (order.status !== '待审核') return failed('该上报单已处理')
  if (ORDER_AUDIT_LEVEL[order.level] !== role?.code) return failed('当前角色无权审核该上报单')
  if (!approved && !String(opinion || '').trim()) return failed('驳回时必须填写审核意见')
  const dateStr = new Date().toISOString().slice(0, 10)
  const timeStr = new Date().toLocaleString('zh-CN', { hour12: false })
  const operator = role.unit || role.regionName
  order.status = approved ? '审核通过' : '已驳回'
  order.auditor = operator
  order.auditLevel = role.code
  order.nextAuditLevel = approved ? ({ county: 'city', city: 'province' }[order.level] || '') : ''
  order.auditedAt = dateStr
  order.auditOpinion = String(opinion || '').trim()
  order.timeline = [...(order.timeline || []), { time: timeStr, operator, action: approved ? `审核通过${order.auditOpinion ? '：' + order.auditOpinion : ''}` : `审核驳回：${order.auditOpinion}` }]
  if (approved && ['county', 'city'].includes(order.level)) {
    const nextLevel = order.level === 'county' ? 'city' : 'province'
    const nextCode = nextLevel === 'city' ? order.cityCode : '340000'
    const existsNext = PROGRESS_REPORT_ORDERS.find(item => item.type === order.type && Number(item.year) === Number(order.year) && item.quarter === order.quarter && item.level === nextLevel && String(item.regionCode) === String(nextCode) && item.planId === order.planId)
    if (!existsNext) {
      PROGRESS_REPORT_ORDERS.push({ id: `PRO-${order.type.toUpperCase()}-${order.year}-${order.quarter}-${nextCode}-${Date.now()}`, year: order.year, quarter: order.quarter, type: order.type, level: nextLevel, planId: order.planId, regionCode: nextCode, regionName: nextLevel === 'province' ? '安徽省' : getRegion(nextCode)?.name || '', cityCode: nextLevel === 'city' ? nextCode : '', cityName: nextLevel === 'city' ? getRegion(nextCode)?.name || '' : '', countyCode: '', countyName: '', status: '待审核', reporter: operator, reportedAt: dateStr, auditor: '', auditedAt: '', auditOpinion: '', details: order.details || [], timeline: [{ time: timeStr, operator, action: `${order.regionName}审核通过，提交${nextLevel === 'city' ? '市级' : '省级'}审核` }] })
    }
  }
  return success({ item: order })
})
export const fetchProgressRecords = (role) => mockRequest(() => PROGRESS_RECORDS.filter((item) => inRoleScope(item, role)))
export const fetchSubjectPlanTasks = (role) => mockRequest(() => progressTaskRows(role))
export const addProgressRecord = (record) => mockRequest(() => {
  if (!record.regionCode || !record.subjectId || !record.planId || !record.taskId) return failed('地区、经营主体、关联计划和落实任务不能为空')
  const role = record.role
  if (role?.subjectId && record.subjectId !== role.subjectId) return failed('主体角色只能填报自身数据')
  const task = TASK_PATH_DETAILS.find((item) => item.id === record.taskId && item.subjectId === record.subjectId)
  if (!task || progressPlanId(task) !== record.planId) return failed('关联的种植计划或落实任务无效')
  if (record.cropName && record.cropName !== task.cropType) return failed(`当前落实任务对应作物为${task.cropType}`)
  if (!PLOTS.some((plot) => plot.id === record.plotId && plot.subjectId === record.subjectId)) return failed('只能填报本主体已关联的地块')
  if (!['sow', 'harvest'].includes(record.type)) return failed('作业环节只能选择播种或收获')
  if (Number(record.area) <= 0) return failed('填报面积必须大于0')
  PROGRESS_RECORDS.unshift({ id: `PR-${String(PROGRESS_RECORDS.length + 1).padStart(4, '0')}`, ...record, planName: record.planName || task.planName })
  return success()
})
export const fetchProgressSummary = (role) => mockRequest(() => {
  if (role?.subjectId) {
    const plots = PLOTS.filter((item) => item.subjectId === role.subjectId)
    const planArea = Math.round(plots.reduce((sum, item) => sum + Number(item.areaMu || 0), 0))
    const implemented = PLAN_PLOTS.filter((item) => item.subjectId === role.subjectId).reduce((sum, item) => sum + Number(item.area || 0), 0)
    const records = PROGRESS_RECORDS.filter((item) => item.subjectId === role.subjectId)
    const areaByType = (type) => records.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.area || 0), 0)
    const rate = (area) => planArea ? Math.min(100, Math.round(area / planArea * 100)) : 0
    return { planArea, implementRate: rate(implemented), sowRate: rate(areaByType('sow')), harvestRate: rate(areaByType('harvest')) }
  }
  const plans = planListByRole(role)
  const total = plans.reduce((sum, item) => sum + Number(item.totalArea || 0), 0)
  const weighted = (field) => total ? Math.round(plans.reduce((sum, item) => sum + Number(item.totalArea || 0) * Number(item[field] || 0), 0) / total) : 0
  return { planArea: total, implementRate: weighted('implementRate'), sowRate: weighted('sowRate'), harvestRate: weighted('harvestRate') }
})

export const fetchPolicies = () => mockRequest(() => POLICIES)
export const addPolicy = (record) => mockRequest(() => {
  if (!record.title || !record.category || !record.dept || !record.summary || !record.content) return failed('政策标题、类别、部门、摘要和内容不能为空')
  const item = { ...record, id: `POL-${String(POLICIES.length + 1).padStart(3, '0')}`, publishDate: new Date().toISOString().slice(0, 10), effectiveDate: `${new Date().toISOString().slice(0, 10)} 起`, process: [], materials: '' }
  POLICIES.unshift(item)
  return success({ item })
})
export const updatePolicy = (record) => mockRequest(() => {
  const index = POLICIES.findIndex(item => item.id === record.id)
  if (index < 0) return failed('政策不存在')
  POLICIES[index] = { ...POLICIES[index], ...record }
  return success({ item: POLICIES[index] })
})
export const deletePolicy = (id) => mockRequest(() => {
  const index = POLICIES.findIndex(item => item.id === id)
  if (index < 0) return failed('政策不存在')
  POLICIES.splice(index, 1)
  return success()
})
export const fetchWeatherAlerts = (role) => mockRequest(() => WEATHER_ALERTS.filter((item) => item.regionCode === '340000' || inRoleScope(item, role)))
export const addWeatherAlert = (record) => mockRequest(() => {
  if (!record.regionCode || !record.type || !record.content) return failed('区域、天气类型和信息内容不能为空')
  const item = { ...record, id: `WA-${String(WEATHER_ALERTS.length + 1).padStart(3, '0')}` }
  WEATHER_ALERTS.unshift(item)
  return success({ item })
})
export const updateWeatherAlert = (record) => mockRequest(() => {
  const index = WEATHER_ALERTS.findIndex(item => item.id === record.id)
  if (index < 0) return failed('气象信息不存在')
  WEATHER_ALERTS[index] = { ...WEATHER_ALERTS[index], ...record }
  return success({ item: WEATHER_ALERTS[index] })
})
export const deleteWeatherAlert = (id) => mockRequest(() => {
  const index = WEATHER_ALERTS.findIndex(item => item.id === id)
  if (index < 0) return failed('气象信息不存在')
  WEATHER_ALERTS.splice(index, 1)
  return success()
})
export const fetchDisasters = (role) => mockRequest(() => DISASTERS.filter((item) => inRoleScope(item, role)))
export const fetchRescueActions = (disasterId) => mockRequest(() => RESCUE_ACTIONS.filter((item) => item.disasterId === disasterId))
export const addDisaster = (record) => mockRequest(() => {
  if (!record.regionCode || !record.type) return failed('灾害类型和地区不能为空')
  const item = { id: `DIS-${String(DISASTERS.length + 1).padStart(3, '0')}`, materials: 0, status: '待核实', ...record }
  DISASTERS.unshift(item)
  return success({ item })
})
export const addRescueAction = (disasterId, action) => mockRequest(() => {
  if (!DISASTERS.some((item) => item.id === disasterId)) return failed('灾情记录不存在')
  if (!action?.action || !action?.unit) return failed('救助行动和执行单位不能为空')
  const item = { id: `RA-${String(RESCUE_ACTIONS.length + 1).padStart(3, '0')}`, disasterId, ...action }
  RESCUE_ACTIONS.push(item)
  return success({ item })
})
export const updateDisasterStatus = (id, status, action) => mockRequest(() => {
  const item = DISASTERS.find((row) => row.id === id)
  if (!item) return failed('灾情记录不存在')
  item.status = status
  if (action) RESCUE_ACTIONS.push({ id: `RA-${String(RESCUE_ACTIONS.length + 1).padStart(3, '0')}`, disasterId: id, ...action })
  return success({ item })
})
export const fetchDisasterArchives = () => mockRequest(() => DISASTER_ARCHIVES.map((item) => {
  const plot = PLOTS.find((row) => row.id === item.plotId)
  return {
    ...item,
    subjectId: item.subjectId || plot?.subjectId || '',
    regionCode: item.regionCode || plot?.regionCode || ''
  }
}))
export const addDisasterArchive = (record) => mockRequest(() => {
  if (!record.occurrenceTime || !record.plotId || !record.regionCode || !record.disasterType || !record.crop) return failed('发生时间、关联地块、灾害类型和受灾作物不能为空')
  if (Number(record.disasterArea) > Number(record.affectedArea) || Number(record.lostArea) > Number(record.disasterArea)) return failed('灾情面积数据不符合逻辑')
  const item = { ...record, id: `DA-${String(DISASTER_ARCHIVES.length + 1).padStart(3, '0')}` }
  DISASTER_ARCHIVES.unshift(item)
  return success({ item })
})
export const updateDisasterArchive = (record) => mockRequest(() => {
  const index = DISASTER_ARCHIVES.findIndex((item) => item.id === record.id)
  if (index < 0) return failed('灾情档案不存在')
  if (Number(record.disasterArea) > Number(record.affectedArea) || Number(record.lostArea) > Number(record.disasterArea)) return failed('灾情面积数据不符合逻辑')
  DISASTER_ARCHIVES[index] = { ...DISASTER_ARCHIVES[index], ...record }
  return success({ item: DISASTER_ARCHIVES[index] })
})
export const deleteDisasterArchive = (id) => mockRequest(() => {
  const index = DISASTER_ARCHIVES.findIndex((item) => item.id === id)
  if (index < 0) return failed('灾情档案不存在')
  DISASTER_ARCHIVES.splice(index, 1)
  return success()
})

const scopedRows = (rows, role) => rows.filter((item) => inRoleScope(item, role))
const updateById = (rows, id, data) => {
  const item = rows.find((row) => row.id === id)
  if (!item) return failed('记录不存在')
  Object.assign(item, data)
  return success({ item })
}
export const fetchPlanSubjects = (role, filters = {}) => mockRequest(() => scopedRows(PLAN_SUBJECTS, role).map((item) => ({
  ...item,
  status: item.status || '启用',
  auditStatus: item.auditStatus || '已审核',
  plotCount: SUBJECT_PLOT_RELATIONS.filter((relation) => relation.subjectId === item.id && relation.relationStatus === '已关联').length
})).filter((item) => {
  const selectedRegion = Array.isArray(filters.regionCode) ? filters.regionCode.at(-1) : filters.regionCode
  return (!filters.keyword || `${item.name}${item.owner}${item.id}`.includes(filters.keyword)) && (!filters.type || item.type === filters.type) && (!filters.status || item.status === filters.status) && (!filters.primaryCrop || item.primaryCrop === filters.primaryCrop) && (!selectedRegion || String(item.regionCode || '').startsWith(String(selectedRegion)))
}))
export const savePlanSubject = (data, role) => mockRequest(() => {
  if (!data.name || !data.owner || !data.regionCode || !data.primaryCrop || !data.phone) return failed('主体名称、负责人、所属行政区划、主要作物和联系手机不能为空')
  if (role?.code === 'city' && !String(data.regionCode).startsWith(String(role.regionCode))) return failed('市级管理员只能维护本市及以下行政区划的主体')
  if (role?.code === 'county' && !String(data.regionCode).startsWith(String(role.regionCode))) return failed('县级管理员只能维护本县及以下行政区划的主体')
  if (Number(data.muInvestment) < 0 || Number(data.muNetIncome) < 0) return failed('亩投入和亩纯收益不能小于0')
  const subjectData = { ...data }
  subjectData.status = data.status || '启用'
  subjectData.auditStatus = role?.code === 'city' || role?.code === 'county' ? '待省级审核' : (data.auditStatus || '已审核')
  subjectData.auditTrail = data.auditTrail || []
  const item = { id: subjectData.id || `SUB-${String(PLAN_SUBJECTS.length + 1).padStart(4, '0')}`, area: 0, plotCount: 0, ...subjectData, muInvestment: Number(subjectData.muInvestment || 0), muNetIncome: Number(subjectData.muNetIncome || 0) }
  const existing = PLAN_SUBJECTS.find((row) => row.id === item.id)
  if (existing) Object.assign(existing, item)
  else PLAN_SUBJECTS.unshift(item)
  return success({ item: existing || item })
})
export const auditPlanSubject = (id, status, opinion = '', role) => mockRequest(() => {
  if (role?.code !== 'province') return failed('只有省级管理员可以审核种植主体')
  const subject = PLAN_SUBJECTS.find((item) => item.id === id)
  if (!subject) return failed('种植主体不存在')
  if (!['已审核', '已退回'].includes(status)) return failed('不支持的审核状态')
  if (status === '已退回' && !opinion.trim()) return failed('退回时必须填写审核意见')
  const auditedAt = new Date().toISOString().slice(0, 10)
  subject.auditStatus = status
  subject.auditOpinion = opinion
  subject.auditor = role.name || role.regionName
  subject.auditedAt = auditedAt
  subject.auditTrail = [...(subject.auditTrail || []), { status, opinion, auditor: subject.auditor, auditedAt }]
  return success({ item: subject })
})
export const setPlanSubjectStatus = (id, status, role) => mockRequest(() => {
  const subject = PLAN_SUBJECTS.find((item) => item.id === id)
  if (!subject) return failed('种植主体不存在')
  if (!inRoleScope(subject, role)) return failed('当前角色无权操作该主体')
  if (subject.auditStatus === '待省级审核' && role?.code !== 'province') return failed('主体待省级审核期间不能变更状态')
  subject.status = status
  return success({ item: subject })
})
export const deletePlanSubject = (id, role) => mockRequest(() => {
  const index = PLAN_SUBJECTS.findIndex((item) => item.id === id)
  if (index < 0) return failed('种植主体不存在')
  if (!inRoleScope(PLAN_SUBJECTS[index], role)) return failed('当前角色无权删除该主体')
  if (PLAN_SUBJECTS[index].auditStatus === '待省级审核' && role?.code !== 'province') return failed('主体待省级审核期间不能删除')
  if (PLOTS.some((item) => item.subjectId === id) || SUBJECT_PLOT_RELATIONS.some((item) => item.subjectId === id && item.relationStatus !== '已解除')) return failed('该主体已关联地块，请先解除地块关联')
  PLAN_SUBJECTS.splice(index, 1)
  return success()
})
export const fetchSubjectPlotRelations = (role, filters = {}) => mockRequest(() => scopedRows(SUBJECT_PLOT_RELATIONS, role).filter((item) => { const selectedRegion = Array.isArray(filters.regionCode) ? filters.regionCode.at(-1) : filters.regionCode; return (!filters.subjectId || item.subjectId === filters.subjectId) && (!filters.keyword || `${item.plotName}${item.subjectName}${item.plotId}`.includes(filters.keyword)) && (!filters.status || item.relationStatus === filters.status) && (!selectedRegion || String(item.regionCode || '').startsWith(String(selectedRegion))) }))
export const fetchAvailablePlanPlots = (role, filters = {}) => mockRequest(() => {
  const plots = PLOTS.filter((plot) => inRoleScope(plot, role)).map((plot) => {
    const assignment = PLAN_PLOTS.find((item) => item.plotId === plot.id)
    return {
      ...plot,
      area: Number(plot.areaMu.toFixed(1)),
      cropName: CROP_MAP[assignment?.crop || plot.crop]?.name || '其他',
      unitName: plot.unitName || plot.regionName || plot.regionCode
    }
  })
  return plots.filter((item) => {
    const selectedRegion = Array.isArray(filters.regionCode) ? filters.regionCode.at(-1) : filters.regionCode
    return (!filters.keyword || `${item.id}${item.name}${item.unitName}`.includes(filters.keyword)) && (!filters.source || item.source === filters.source) && (!selectedRegion || String(item.regionCode || '').startsWith(String(selectedRegion))) && !SUBJECT_PLOT_RELATIONS.some((relation) => relation.plotId === item.id && relation.relationStatus === '已关联')
  })
})
export const bindSubjectPlots = (subjectId, plotIds, role) => mockRequest(() => {
  const subject = PLAN_SUBJECTS.find((item) => item.id === subjectId)
  if (!subject) return failed('种植主体不存在')
  if ((subject.status || '启用') !== '启用') return failed('停用主体不能关联地块')
  const plots = PLOTS.filter((plot) => plotIds.includes(plot.id) && inRoleScope(plot, role))
  if (plots.length !== plotIds.length) return failed('包含不存在或无权限的地块')
  plots.forEach((plot) => {
    const relation = SUBJECT_PLOT_RELATIONS.find((item) => item.plotId === plot.id)
    const data = { plotId: plot.id, plotName: plot.name, subjectId: subject.id, subjectName: subject.name, regionCode: plot.regionCode, regionName: plot.regionName || subject.regionCode, area: Number(plot.areaMu.toFixed(1)), crop: plot.crop, relationStatus: '已关联', updatedAt: new Date().toISOString().slice(0, 10) }
    if (relation) Object.assign(relation, data)
    else SUBJECT_PLOT_RELATIONS.unshift({ id: `REL-${String(SUBJECT_PLOT_RELATIONS.length + 1).padStart(4, '0')}`, ...data })
    plot.subjectId = subject.id
    plot.manager = subject.owner
  })
  return success({ count: plots.length })
})
export const savePlanPlot = (data) => mockRequest(() => {
  if (!data.name || !data.regionName || !data.location || Number(data.area) <= 0) return failed('地块名称、所属区域、位置和面积不能为空')
  const existing = data.id ? PLOTS.find((item) => item.id === data.id) : null
  if (data.role && !inRoleScope({ regionCode: data.regionCode || existing?.regionCode }, data.role)) return failed('无权维护当前区域地块')
  const item = existing || {
    id: `PL-${String(PLOTS.length + 1).padStart(4, '0')}`,
    center: [117.2849, 31.8612],
    geometry: null,
    crop: data.crop || 'wheat',
    implemented: false
  }

  Object.assign(item, {
    name: data.name,
    regionCode: data.regionCode || existing?.regionCode || data.role?.regionCode,
    regionName: data.regionName || data.unitName,
    location: data.location,
    areaMu: Number(data.area),
    source: data.source || (data.plotType === '流转地块' ? '流转' : '确权'),
    nameColor: data.nameColor || '#409eff',
    unitName: data.unitName,
    manager: data.manager || item.manager || '',
    crop: data.crop || item.crop || 'wheat',
    variety: data.variety || '',
    purpose: data.purpose || '粮食种植',
    plotType: data.plotType || '确权地块',
    boundary: data.boundary || '',
    updatedAt: new Date().toISOString().slice(0, 10)
  })

  if (!existing) PLOTS.unshift(item)

  return success({ item })
})
export const createSubjectPlotRelation = (data) => mockRequest(() => {
  if (!data.plotId || !data.subjectId) return failed('地块和经营主体不能为空')
  if (SUBJECT_PLOT_RELATIONS.some((item) => item.plotId === data.plotId)) return failed('当前地块已存在关联记录')
  const subject = PLAN_SUBJECTS.find((item) => item.id === data.subjectId)
  const plot = PLOTS.find((item) => item.id === data.plotId)
  if (!subject || !plot) return failed('地块或经营主体不存在')
  plot.subjectId = subject.id
  const item = {
    id: `REL-${String(SUBJECT_PLOT_RELATIONS.length + 1).padStart(4, '0')}`,
    plotId: plot.id,
    plotName: plot.name,
    subjectId: subject.id,
    subjectName: subject.name,
    regionCode: plot.regionCode,
    regionName: data.regionName || plot.regionName || plot.regionCode,
    area: Number(plot.areaMu.toFixed(1)),
    crop: plot.crop,
    relationStatus: data.relationStatus || '已关联',
    updatedAt: new Date().toISOString().slice(0, 10)
  }
  SUBJECT_PLOT_RELATIONS.unshift(item)
  return success({ item })
})
export const updateSubjectPlotRelation = (id, data) => mockRequest(() => {
  const relation = SUBJECT_PLOT_RELATIONS.find((item) => item.id === id)
  if (!relation) return failed('主体地块关联记录不存在')
  const subject = data.subjectId ? PLAN_SUBJECTS.find((item) => item.id === data.subjectId) : PLAN_SUBJECTS.find((item) => item.id === relation.subjectId)
  const plot = PLOTS.find((item) => item.id === relation.plotId)
  if (!subject || !plot) return failed('地块或经营主体不存在')
  Object.assign(relation, data, {
    subjectId: subject.id,
    subjectName: subject.name,
    relationStatus: data.relationStatus || '已关联',
    updatedAt: data.updatedAt || new Date().toISOString().slice(0, 10)
  })
  plot.subjectId = subject.id
  plot.manager = subject.owner
  return success({ item: relation })
})
export const unbindSubjectPlotRelation = (id, data = {}) => mockRequest(() => {
  const relation = SUBJECT_PLOT_RELATIONS.find((item) => item.id === id)
  if (!relation) return failed('主体地块关联记录不存在')
  const plot = PLOTS.find((item) => item.id === relation.plotId)
  if (plot) plot.subjectId = ''
  Object.assign(relation, {
    relationStatus: '已解除',
    unboundAt: new Date().toISOString().slice(0, 10),
    unboundBy: data.operator || '当前操作人',
    unboundReason: data.reason || '人工解除关联',
    updatedAt: new Date().toISOString().slice(0, 10)
  })
  return success({ item: relation })
})
export const fetchPlanAudits = (role, filters = {}) => mockRequest(() => {
  const sourceItems = role?.code === 'city'
    ? PLAN_AUDITS.filter((item) => item.type === '县级计划提交市级审核')
    : role?.code === 'province'
      ? PLAN_AUDITS.filter((item) => item.type === '市级计划提交省级审核')
      : PLAN_AUDITS.filter((item) => ['县级计划提交市级审核', '市级计划提交省级审核'].includes(item.type))
  return sourceItems.filter((item) => {
  if (!role || role.code === 'province') return true
  if (role.code === 'city') return item.type === '县级计划提交市级审核' && String(item.regionCode || '').startsWith(String(role.regionCode || '')) && (item.auditLevel || '市级审核') === '市级审核'
  if (role.code === 'province') return item.type === '市级计划提交省级审核' && (item.auditLevel || '省级审核') === '省级审核'
  if (role.code === 'county') return String(item.regionCode || '').startsWith(String(role.regionCode || ''))
  return false
}).map((item) => {
  const actualArea = item.actualArea ?? item.totalArea
  const countyPlans = (item.countyPlans || []).map((plan) => {
    const planActualArea = plan.actualArea ?? plan.area
    return {
      ...plan,
      actualArea: planActualArea,
      progress: plan.area ? Math.round((planActualArea / plan.area) * 100) : 0
    }
  })
  return {
    ...item,
    issuedAt: item.issuedAt || item.submittedAt,
    actualArea,
    progress: item.totalArea ? Math.round((actualArea / item.totalArea) * 100) : 0,
    countyPlans
  }
}).filter((item) => {
  const countyText = (item.countyPlans || []).map((plan) => plan.countyName).join('')
  return (!filters.view || filters.view === 'city-county' || item.type === '县级计划提交市级审核') && (!filters.keyword || `${item.targetName}${item.regionName}${countyText}`.includes(filters.keyword)) && (!filters.year || item.planYear === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.status || (filters.status === 'history' ? item.status !== 'pending' : item.status === filters.status))
})
})
export const savePlanActualArea = (id, actualArea, countyPlans = []) => mockRequest(() => {
  const item = PLAN_AUDITS.find((row) => row.id === id) || PLAN_AUDITS.find((row) => row.id === String(id).split('::')[0])
  if (!item) return failed('审核记录不存在')
  const total = Number(actualArea)
  if (!Number.isFinite(total) || total < 0) return failed('上报计划面积必须为不小于0的数字')
  if (countyPlans.some((row) => !Number.isFinite(Number(row.actualArea)) || Number(row.actualArea) < 0)) return failed('县级上报计划面积必须为不小于0的数字')
  item.actualArea = total
  item.countyPlans = item.countyPlans.map((row, index) => ({ ...row, actualArea: Number(countyPlans[index]?.actualArea ?? row.actualArea ?? row.area) }))
  const provinceTask = PLANTING_PLAN_CITY_TASKS.find((task) => task.planId === item.targetId && task.roleCode === 'province' && task.cityCode === item.regionCode)
  if (provinceTask) provinceTask.actualArea = total
  return success({ item })
})
export const auditPlan = (id, status, opinion = '', operator = '', role) => mockRequest(() => {
  const sourceId = String(id).includes('::') ? String(id).split('::')[0] : ''
  const sourceItem = sourceId ? PLAN_AUDITS.find((row) => row.id === sourceId) : null
  const item = sourceItem || PLAN_AUDITS.find((row) => row.id === id)
  const countyId = sourceItem ? String(id).split('::')[1] : ''
  const countyPlan = sourceItem?.countyPlans?.find((row) => row.id === countyId)
  if (!item) return failed('审核记录不存在')
  if (!['县级计划提交市级审核', '市级计划提交省级审核'].includes(item.type)) return failed('计划分解/下达不进入审核流程')
  if (countyPlan && role?.code === 'city') {
    if (countyPlan.cityAuditStatus && countyPlan.cityAuditStatus !== 'pending') return failed('当前县级任务已完成审核，不能重复操作')
    if (status === 'rejected' && !opinion.trim()) return failed('退回时必须填写审核意见')
    const auditDate = new Date().toISOString().slice(0, 10)
    const auditor = operator || role?.name || role?.regionName || '当前审核人'
    Object.assign(countyPlan, { cityAuditStatus: status, cityAuditor: auditor, cityAuditedAt: auditDate, cityAuditOpinion: opinion, status })
    const countyVersion = planVersionForRole(item.targetId, { code: 'county', regionCode: countyPlan.countyCode || item.regionCode })
    if (countyVersion) Object.assign(countyVersion, { status: status === 'approved' ? '县级上报已通过' : '县级上报已退回', auditOpinion: opinion, auditedAt: auditDate, auditor })
    if (!sourceItem) item.status = status
    item.auditTrail = [...(item.auditTrail || []), { status, opinion, auditor, auditedAt: auditDate, level: '市级审核', countyName: countyPlan.countyName }]
    return success({ item: { ...item, id } })
  }
  if (item.status !== 'pending') return failed('当前记录已完成审核，不能重复操作')
  if (status === 'rejected' && !opinion.trim()) return failed('退回时必须填写审核意见')
  if (role?.code === 'city' && (item.type !== '县级计划提交市级审核' || (item.auditLevel || '市级审核') !== '市级审核')) return failed('当前记录不属于市级上报计划审核范围')
  if (role?.code === 'province' && item.type !== '市级计划提交省级审核') return failed('当前记录不属于市级上报计划审核范围')
  if (role?.code === 'province' && item.auditLevel && item.auditLevel !== '省级审核') return failed('当前记录不属于省级审核范围')
  const auditDate = new Date().toISOString().slice(0, 10)
  const auditor = operator || role?.name || role?.regionName || '当前审核人'
  const level = item.auditLevel || (role?.code === 'city' ? '市级审核' : '省级审核')
  Object.assign(item, {
    status,
    opinion,
    auditedAt: auditDate,
    auditor,
    auditLevel: level,
    auditTrail: [...(item.auditTrail || []), { status, opinion, auditor, auditedAt: auditDate, level }]
  })
  if (status === 'approved' && role?.code === 'province') {
    const plan = PLANTING_PLAN_LIST.find((row) => row.id === item.targetId)
    if (plan) {
      Object.assign(plan, { status: '已分解', issuedAt: '', auditLevel: '省级终审', submittedAt: auditDate })
      PLANTING_PLAN_VERSIONS.filter((version) => version.planId === plan.id).forEach((version) => Object.assign(version, { status: '已分解', issuedAt: '', auditLevel: '省级终审' }))
      PLANTING_PLAN_CITY_TASKS.filter((task) => task.planId === plan.id).forEach((task) => Object.assign(task, { status: '已分解', issuedAt: '' }))
      item.issuedAt = ''
    }
  }
  if (role?.code === 'province' && item.type === '市级计划提交省级审核') {
    const cityVersion = planVersionForRole(item.targetId, { code: 'city', regionCode: item.regionCode })
    if (cityVersion) Object.assign(cityVersion, { status: status === 'approved' ? '市级上报已通过' : '市级上报已退回', auditOpinion: opinion, auditedAt: auditDate, auditor })
  }
  return success({ item })
})
const SUPERVISION_EVALUATION_DATE = '2026-10-21'
const SUPERVISION_DEFAULTS = { areaDeviationThreshold: 0.2, staleDaysThreshold: 30 }
const normalizeProgressStage = (value) => ['sow', 'sowing', 'planting'].includes(value) ? 'sowing' : value === 'harvest' ? 'harvest' : value
const roundArea = (value) => Number(Number(value || 0).toFixed(2))
const progressRate = (area, plannedArea) => plannedArea ? Number((Number(area || 0) / plannedArea * 100).toFixed(1)) : 0
const deviationRate = (area, plannedArea) => plannedArea ? Number((Math.abs(Number(area || 0) - plannedArea) / plannedArea * 100).toFixed(1)) : 0
const daysSince = (date) => date ? Math.max(0, Math.floor((new Date(SUPERVISION_EVALUATION_DATE).getTime() - new Date(date).getTime()) / 86400000)) : null
const latestDate = (records) => records.reduce((latest, item) => String(item.date || '') > latest ? String(item.date || '') : latest, '')
const taskRegionName = (task) => [task.cityName, task.countyName, task.townName].filter(Boolean).join(' / ')
const supervisionTasks = (role) => TASK_PATH_DETAILS.filter((task) => {
  if (role?.subjectId) return task.subjectId === role.subjectId
  if (!role?.regionCode || role.regionCode === '340000') return true
  return [task.cityCode, task.countyCode, task.townCode].some((code) => String(code || '').startsWith(String(role.regionCode)))
})
const recordsForTask = (task) => PROGRESS_RECORDS.filter((record) => {
  if (record.taskId) return record.taskId === task.id
  return record.subjectId === task.subjectId && record.planId === progressPlanId(task)
}).map((record) => ({ ...record, taskId: task.id, stage: normalizeProgressStage(record.stage || record.type), type: normalizeProgressStage(record.stage || record.type) }))
const createSupervisionAlert = (task, type, stage, message) => ({
  id: `${type}-${task.id}`,
  type,
  planId: progressPlanId(task),
  planName: task.planName,
  taskId: task.id,
  subjectId: task.subjectId,
  subjectName: task.subjectName,
  regionName: taskRegionName(task),
  stage,
  message
})
const buildTaskSupervision = (task, options = SUPERVISION_DEFAULTS) => {
  const plannedAreaMu = roundArea(task.taskArea)
  const reportingRecords = recordsForTask(task)
  const sowingRecords = reportingRecords.filter((record) => record.stage === 'sowing')
  const harvestRecords = reportingRecords.filter((record) => record.stage === 'harvest')
  const sowingReportedAreaMu = roundArea(sowingRecords.reduce((sum, item) => sum + Number(item.area || 0), 0))
  const harvestReportedAreaMu = roundArea(harvestRecords.reduce((sum, item) => sum + Number(item.area || 0), 0))
  const sowingAreaDeviationRate = deviationRate(sowingReportedAreaMu, plannedAreaMu)
  const harvestAreaDeviationRate = deviationRate(harvestReportedAreaMu, plannedAreaMu)
  const latestSowingReportAt = latestDate(sowingRecords)
  const latestHarvestReportAt = latestDate(harvestRecords)
  const latestReportAt = latestDate(reportingRecords)
  const alerts = []
  if (!sowingRecords.length) alerts.push(createSupervisionAlert(task, 'NO_SOWING_REPORT', 'sowing', '该主体尚未填报播种进度及面积'))
  if (!harvestRecords.length) alerts.push(createSupervisionAlert(task, 'NO_HARVEST_REPORT', 'harvest', '该主体尚未填报收获进度及面积'))
  if (latestSowingReportAt && daysSince(latestSowingReportAt) >= options.staleDaysThreshold) alerts.push(createSupervisionAlert(task, 'STALE_SOWING_REPORT', 'sowing', `距最近一次播种填报已 ${daysSince(latestSowingReportAt)} 天`))
  if (latestHarvestReportAt && daysSince(latestHarvestReportAt) >= options.staleDaysThreshold) alerts.push(createSupervisionAlert(task, 'STALE_HARVEST_REPORT', 'harvest', `距最近一次收获填报已 ${daysSince(latestHarvestReportAt)} 天`))
  if (sowingRecords.length && sowingAreaDeviationRate > options.areaDeviationThreshold * 100) alerts.push(createSupervisionAlert(task, 'SOWING_AREA_DEVIATION', 'sowing', `播种上报面积与任务面积偏差 ${sowingAreaDeviationRate}%`))
  if (harvestRecords.length && harvestAreaDeviationRate > options.areaDeviationThreshold * 100) alerts.push(createSupervisionAlert(task, 'HARVEST_AREA_DEVIATION', 'harvest', `收获上报面积与任务面积偏差 ${harvestAreaDeviationRate}%`))
  if (harvestReportedAreaMu > sowingReportedAreaMu) alerts.push(createSupervisionAlert(task, 'HARVEST_EXCEEDS_SOWING', 'harvest', '收获上报面积大于播种上报面积，存在数据逻辑异常'))
  return {
    ...task,
    planId: progressPlanId(task),
    taskId: task.id,
    regionName: taskRegionName(task),
    plannedAreaMu,
    sowingReportedAreaMu,
    harvestReportedAreaMu,
    sowingProgressRate: progressRate(sowingReportedAreaMu, plannedAreaMu),
    harvestProgressRate: progressRate(harvestReportedAreaMu, plannedAreaMu),
    sowingAreaDeviationRate,
    harvestAreaDeviationRate,
    sowingUnreported: !sowingRecords.length,
    harvestUnreported: !harvestRecords.length,
    latestSowingReportAt,
    latestHarvestReportAt,
    latestReportAt,
    completionStatus: harvestReportedAreaMu >= plannedAreaMu ? 'COMPLETED' : 'IN_PROGRESS',
    supervisionStatus: alerts.length ? 'ALERT' : harvestReportedAreaMu >= plannedAreaMu ? 'COMPLETED' : 'NORMAL',
    alertCount: alerts.length,
    alerts,
    reportingRecords
  }
}
const buildSupervisionData = (role, filters = {}) => {
  const options = {
    areaDeviationThreshold: Number(filters.areaDeviationThreshold ?? SUPERVISION_DEFAULTS.areaDeviationThreshold),
    staleDaysThreshold: Number(filters.staleDaysThreshold ?? SUPERVISION_DEFAULTS.staleDaysThreshold)
  }
  const tasks = supervisionTasks(role).map((task) => buildTaskSupervision(task, options))
  const groups = new Map()
  tasks.forEach((task) => {
    if (!groups.has(task.planId)) groups.set(task.planId, [])
    groups.get(task.planId).push(task)
  })
  const plans = [...groups.entries()].map(([planId, planTasks]) => {
    const source = PLANTING_PLAN_LIST.find((item) => item.id === planId)
    const plannedAreaMu = roundArea(planTasks.reduce((sum, item) => sum + item.plannedAreaMu, 0))
    const sowingReportedAreaMu = roundArea(planTasks.reduce((sum, item) => sum + item.sowingReportedAreaMu, 0))
    const harvestReportedAreaMu = roundArea(planTasks.reduce((sum, item) => sum + item.harvestReportedAreaMu, 0))
    const alerts = planTasks.flatMap((item) => item.alerts)
    const regionNames = [...new Set(planTasks.map((item) => item.cityName).filter(Boolean))]
    const completionStatus = harvestReportedAreaMu >= plannedAreaMu ? 'COMPLETED' : 'IN_PROGRESS'
    return {
    planId,
    planName: rows[0]?.planName || `${year}年${quarter}${type === 'sow' ? '播种' : '收获'}进度`,
      planName: source ? `${source.year}年${source.quarter}${source.cropType}种植计划` : planTasks[0].planName,
      planYear: source?.year || planTasks[0].year,
      quarter: source?.quarter || planTasks[0].quarter,
      cropType: source?.cropType || planTasks[0].cropType,
      regionName: regionNames.length === 1 ? regionNames[0] : `${regionNames.length}个地市`,
      plannedAreaMu,
      subjectCount: new Set(planTasks.map((item) => item.subjectId)).size,
      taskCount: planTasks.length,
      sowingReportedAreaMu,
      harvestReportedAreaMu,
      sowingProgressRate: progressRate(sowingReportedAreaMu, plannedAreaMu),
      harvestProgressRate: progressRate(harvestReportedAreaMu, plannedAreaMu),
      sowingAreaDeviationRate: deviationRate(sowingReportedAreaMu, plannedAreaMu),
      harvestAreaDeviationRate: deviationRate(harvestReportedAreaMu, plannedAreaMu),
      sowingUnreportedSubjects: planTasks.filter((item) => item.sowingUnreported).length,
      harvestUnreportedSubjects: planTasks.filter((item) => item.harvestUnreported).length,
      latestSowingReportAt: latestDate(planTasks.map((item) => ({ date: item.latestSowingReportAt }))),
      latestHarvestReportAt: latestDate(planTasks.map((item) => ({ date: item.latestHarvestReportAt }))),
      latestReportAt: latestDate(planTasks.map((item) => ({ date: item.latestReportAt }))),
      completionStatus,
      supervisionStatus: alerts.length ? 'ALERT' : completionStatus === 'COMPLETED' ? 'COMPLETED' : 'NORMAL',
      alertCount: alerts.length,
      alerts,
      tasks: planTasks
    }
  })
  const keyword = String(filters.keyword || '').trim()
  const filteredPlans = plans.filter((item) => (!keyword || `${item.planName}${item.regionName}${item.cropType}`.includes(keyword)) && (!filters.status || item.completionStatus === filters.status || item.supervisionStatus === filters.status) && (!filters.alertType || item.alerts.some((alert) => alert.type === filters.alertType)))
  return { plans: filteredPlans, allPlans: plans, tasks, alerts: tasks.flatMap((item) => item.alerts) }
}
export const fetchSupervisionPlans = (role, filters = {}) => mockRequest(() => buildSupervisionData(role, filters).plans)
export const fetchSupervisionPlanDetail = (planId, role) => mockRequest(() => {
  const plan = buildSupervisionData(role).allPlans.find((item) => item.planId === planId)
  if (!plan) return null
  return { ...plan, reportingRecords: plan.tasks.flatMap((task) => task.reportingRecords).sort((a, b) => String(b.date).localeCompare(String(a.date))) }
})
export const fetchSupervisionAlerts = (role, filters = {}) => mockRequest(() => {
  const keyword = String(filters.keyword || '').trim()
  return buildSupervisionData(role, filters).alerts.filter((item) => (!filters.type || item.type === filters.type) && (!filters.stage || item.stage === filters.stage) && (!filters.planId || item.planId === filters.planId) && (!keyword || `${item.planName}${item.subjectName}${item.regionName}${item.message}`.includes(keyword)))
})
export const fetchPlanSupervise = fetchSupervisionPlans
export const createPlanSupervise = (data) => mockRequest(() => {
  if (!data?.target?.code || !data.requirement || !data.deadline) return failed('督办对象、督办要求和反馈期限不能为空')
  const item = {
    id: `SUP-${String(PLAN_SUPERVISE.length + 1).padStart(3, '0')}`,
    targetId: data.target.targetId || data.target.code,
    targetName: data.target.name,
    regionCode: data.target.code,
    regionName: data.target.name,
    supervisor: data.supervisor || '当前管理部门',
    deadline: data.deadline,
    progress: Number(data.target[data.metric] || 0),
    status: '监督中',
    issue: data.requirement,
    requirement: data.requirement,
    metric: data.metric,
    metricName: data.metricName,
    followUps: [],
    createdAt: new Date().toISOString().slice(0, 10),
    lastFollowUp: ''
  }
  PLAN_SUPERVISE.unshift(item)
  return success({ item })
})
export const followUpPlan = (id, data) => mockRequest(() => {
  const item = PLAN_SUPERVISE.find((row) => row.id === id)
  if (!item) return failed('督办记录不存在')
  const followUp = { ...data, time: new Date().toISOString().slice(0, 16).replace('T', ' '), operator: data.operator || '当前操作人' }
  item.followUps = [...(item.followUps || []), followUp]
  Object.assign(item, { progress: data.progress, status: data.status, lastFollowUp: followUp.time, followUpRemark: data.remark || '' })
  return success({ item })
})
export const fetchPlanStats = (role, regionCode = '') => mockRequest(() => { const code = regionCode || role?.regionCode || ''; if (!code || code === '340000') return PLAN_STATS; const plans = CITY_PLANS.filter(item => String(item.cityCode).startsWith(String(code))).concat(COUNTY_PLANS.filter(item => String(item.countyCode).startsWith(String(code)))); const factor = plans.length ? Math.min(1, plans.reduce((sum, item) => sum + Number(item.totalArea || 0), 0) / Math.max(1, CITY_PLANS.reduce((sum, item) => sum + Number(item.totalArea || 0), 0))) : 0; return { overview: { ...PLAN_STATS.overview, totalArea: Math.round(PLAN_STATS.overview.totalArea * factor), totalPlots: Math.round(PLAN_STATS.overview.totalPlots * factor), totalSubjects: Math.round(PLAN_STATS.overview.totalSubjects * factor), approvedSubjects: Math.round(PLAN_STATS.overview.approvedSubjects * factor) }, crops: PLAN_STATS.crops.map(item => ({ ...item, value: Math.round(item.value * factor) })), trend: PLAN_STATS.trend.map(item => ({ ...item, planArea: Math.round(item.planArea * factor) })) } })
export const fetchSubjects = fetchPlanSubjects
export const saveSubject = savePlanSubject
export const updateSubject = (id, data) => mockRequest(() => updateById(PLAN_SUBJECTS, id, data))
export const fetchAudit = fetchPlanAudits
export const updateAudit = auditPlan
export const fetchSupervise = fetchPlanSupervise
export const updateSupervise = followUpPlan
export const fetchStats = fetchPlanStats

export const fetchFarmServices = (role, filters = {}) => mockRequest(() => FARM_SERVICES.filter((item) => {
  if (!role) return false
  if (role.subjectId) {
    return item.regionCode === '340000' || String(role.regionCode || '').startsWith(String(item.regionCode || ''))
  }
  if (!role.regionCode || role.regionCode === '340000') return true
  return String(item.regionCode || '').startsWith(String(role.regionCode)) || String(role.regionCode).startsWith(String(item.regionCode || ''))
}).filter((item) => (!filters.keyword || `${item.title}${item.regionName}${item.crop}`.includes(filters.keyword)) && (!filters.type || item.type === filters.type) && (!filters.status || item.status === filters.status)))
export const saveFarmService = (data) => mockRequest(() => {
  if (!data.title || !data.provider) return failed('服务标题和提供单位不能为空')
  const item = { id: data.id || `SERVICE-${String(FARM_SERVICES.length + 1).padStart(3, '0')}`, status: '待发布', pushCount: 0, ...data }
  const existing = FARM_SERVICES.find((row) => row.id === item.id)
  if (existing) Object.assign(existing, item)
  else FARM_SERVICES.unshift(item)
  return success({ item: existing || item })
})
export const publishFarmService = (id, status) => mockRequest(() => updateById(FARM_SERVICES, id, { status, publishDate: status === '已发布' ? new Date().toISOString().slice(0, 10) : '' }))
export const pushFarmService = (id, data) => mockRequest(() => {
  const item = FARM_SERVICES.find((row) => row.id === id)
  if (!item) return failed('服务不存在')
  if (item.status !== '已发布') return failed('服务发布后才可以定向推送')
  if (Number(data.count || 0) <= 0) return failed('推送数量必须大于0')
  item.pushCount = Number(item.pushCount || 0) + Number(data.count || 0)
  item.lastPush = { ...data, pushedAt: new Date().toISOString() }
  return success({ item })
})
export const fetchOfflineReports = (role, filters = {}) => mockRequest(() => scopedRows(OFFLINE_REPORTS, role).filter((item) => (!filters.keyword || `${item.subjectName}${item.regionName}${item.id}`.includes(filters.keyword)) && (!filters.status || item.status === filters.status)))
export const updateOfflineReport = (id, data) => mockRequest(() => updateById(OFFLINE_REPORTS, id, data))
export const validateOfflineReport = (id, role) => mockRequest(() => {
  const item = OFFLINE_REPORTS.find((row) => row.id === id)
  if (!item) return failed('离线记录不存在')
  if (!inRoleScope(item, role)) return failed('无权校验当前离线记录')
  const plot = PLOTS.find((row) => row.id === item.plotId || (row.subjectId === item.subjectId && String(row.regionCode).startsWith(String(item.regionCode))))
  if (!plot) return failed('未找到对应地块')
  if (Number(item.area) <= 0 || Number(item.area) > Number(plot.areaMu)) return failed('填报面积超过地块面积')
  const duplicate = OFFLINE_REPORTS.find((row) => row.id !== item.id && row.subjectId === item.subjectId && row.year === item.year && row.crop === item.crop && row.status === '已同步')
  if (duplicate) return failed('存在相同主体、年度和作物的已同步记录')
  Object.assign(item, { status: '待同步', validateAt: new Date().toISOString().slice(0, 16).replace('T', ' '), validateMessage: '校验通过' })
  return success({ item })
})
export const syncOfflineReports = (ids, operator = '当前操作人') => mockRequest(() => {
  const rows = OFFLINE_REPORTS.filter((item) => ids.includes(item.id))
  if (!rows.length) return failed('未找到待同步记录')
  if (rows.some((item) => item.status !== '待同步')) return failed('仅允许同步待同步记录')
  const batchNo = `SYNC-${Date.now()}`
  rows.forEach((item) => Object.assign(item, { status: '已同步', syncBatchNo: batchNo, syncedAt: new Date().toISOString().slice(0, 16).replace('T', ' '), syncedBy: operator }))
  return success({ count: rows.length, batchNo })
})
export const fetchSmartReferences = () => mockRequest(() => SMART_REFERENCES)

export const fetchReportablePlans = (role, filters = {}) => mockRequest(() => reportPlanList(role).filter((item) => (!filters.year || Number(item.year) === Number(filters.year)) && (!filters.quarter || item.quarter === filters.quarter) && (!filters.keyword || `${item.cropType}${item.description}`.includes(filters.keyword))))
export const fetchPlanReportRecords = (role, filters = {}) => mockRequest(() => REPORTS.filter((item) => (!role || item.reporterRole === role.code) && (!filters.keyword || `${item.id}${item.reporterRegionName}${item.status}`.includes(filters.keyword))))
export const fetchPlanReportDetail = (reportId, role, planId = '') => mockRequest(() => getReportDetail(reportId, role, planId))
export const createPlanReport = (data, role) => mockRequest(() => {
  if (!role || !REPORT_TARGET_BY_ROLE[role.code]) return failed('当前角色无计划上报权限')
  if (!data.planId || !Array.isArray(data.details) || !data.details.length) return failed('请选择关联计划并填写下一级明细')
  if (data.details.some((row) => !row.childId || !row.childName || Number(row.planArea) <= 0)) return failed('每个下级对象都必须填写大于0的计划面积')
  const duplicate = REPORTS.find((item) => item.planId === data.planId && item.reporterRole === role.code && item.reporterRegionCode === role.regionCode && ['草稿', '待审核', '已驳回'].includes(item.status))
  const report = duplicate || { id: `RPT-${Date.now()}`, planId: data.planId, reporterRole: role.code, reporterRegionCode: role.regionCode, reporterRegionName: role.regionName, targetLevel: REPORT_TARGET_BY_ROLE[role.code], status: '草稿', submittedAt: '', reviewedAt: '', reviewComment: '', totalArea: 0 }
  Object.assign(report, { totalArea: reportTotal(data.details) })
  if (!duplicate) REPORTS.unshift(report)
  REPORT_DETAILS.splice(0, REPORT_DETAILS.length, ...REPORT_DETAILS.filter((item) => item.reportId !== report.id), ...data.details.map((item, index) => ({ ...item, id: item.id?.startsWith('draft-') ? `RPD-${Date.now()}-${index}` : item.id, reportId: report.id })))
  return success({ report, details: REPORT_DETAILS.filter((item) => item.reportId === report.id) })
})
export const savePlanReport = createPlanReport
export const submitPlanReport = (reportId, role) => mockRequest(() => {
  const report = REPORTS.find((item) => item.id === reportId)
  const details = REPORT_DETAILS.filter((item) => item.reportId === reportId)
  if (!report) return failed('上报单不存在')
  if (report.reporterRole !== role?.code || report.reporterRegionCode !== role?.regionCode) return failed('当前角色无权提交该上报单')
  if (!details.length || details.some((item) => Number(item.planArea) <= 0)) return failed('所有下一级对象都必须有逐项明细')
  report.status = '待审核'; report.submittedAt = new Date().toISOString().slice(0, 10); report.reviewedAt = ''; report.reviewComment = ''
  return success({ report })
})
export const syncChildReportData = (reportId, role) => mockRequest(() => {
  const report = REPORTS.find((item) => item.id === reportId)
  if (!report || report.reporterRegionCode !== role?.regionCode) return failed('无权同步该上报单')
  const details = REPORT_DETAILS.filter((item) => item.reportId === reportId)
  details.forEach((item) => { if (item.source !== 'sync') item.source = 'sync'; item.editable = true })
  report.sourceType = '同步+手工'
  return success({ report, details })
})
export const fetchReportAuditList = (role, filters = {}) => mockRequest(() => REPORTS.filter((item) => REPORT_REVIEWER_BY_ROLE[item.reporterRole] === role?.code && (!filters.keyword || `${item.reporterRegionName}${item.id}`.includes(filters.keyword))))
export const reviewPlanReport = (reportId, action, comment, role) => mockRequest(() => {
  const report = REPORTS.find((item) => item.id === reportId)
  if (!report || REPORT_REVIEWER_BY_ROLE[report.reporterRole] !== role?.code) return failed('当前角色无权审核该上报单')
  if (report.status !== '待审核') return failed('当前上报单不在待审核状态')
  if (action === '已驳回' && !String(comment || '').trim()) return failed('驳回时必须填写审核意见')
  report.status = action; report.reviewedAt = new Date().toISOString().slice(0, 10); report.reviewComment = String(comment || '')
  return success({ report })
})

export const fetchRankData = (role) => mockRequest(() => planListByRole(role).map((item) => ({
  code: item.cityCode || item.countyCode || item.townCode,
  name: item.cityName || item.countyName || item.townName,
  totalArea: item.totalArea,
  implementRate: item.implementRate,
  sowRate: item.sowRate,
  harvestRate: item.harvestRate
})))

