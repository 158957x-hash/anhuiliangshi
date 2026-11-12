// 粮食安全综合监管 API（模拟）—— 七状态机（用户已确认口径 2026-11-11）
// pending 待派发 → checking 待核查 → reported 已上报 → reviewing 待审核 → audited 已审核（整改中）→ recheck 需复查 → closed 已结案
import { mockRequest } from './request'
import { FSR_EVENTS } from '@/mock/fsr/events'
import { INDOOR_BATCHES } from '@/mock/fsr/indoor'
import { GROWTH_RECORDS } from '@/mock/fsr/growth'
import { EVENT_REPORTS, CITY_RANK } from '@/mock/fsr/reports'
import { BIZ_CONFIG } from '@/mock/fsr/config'
import { CHECKERS } from '@/mock/common/checkers'
import { PLOTS } from '@/mock/geo/plot-gen'

const filterByRole = (list, role) => {
  if (!role) return []
  let result
  if (role.subjectId) result = list.filter((i) => i.subjectId === role.subjectId)
  else if (role.regionCode === '340000') result = list
  else result = list.filter((i) => String(i.regionCode || '').startsWith(String(role.regionCode || '').slice(0, 6)))
  // 状态可见性（用户确认 2026-11-12）：待研判（to_review）仅省级可见；待派发（pending）仅省/市桌面任务库可见，县级及以下不显示
  if (role.code === 'province') return result
  result = result.filter((e) => e.status !== 'to_review')
  if (role.code === 'city') return result
  return result.filter((e) => e.status !== 'pending')
}

const nowText = () => {
  const now = new Date()
  return `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
}

export const fetchEvents = (role, filters = {}) =>
  mockRequest(() =>
    filterByRole(FSR_EVENTS, role).filter((e) => {
      if (filters.status && e.status !== filters.status) return false
      if (filters.type && e.type !== filters.type) return false
      if (filters.source && e.source !== filters.source) return false
      if (filters.risk && e.risk !== filters.risk) return false
      return true
    })
  )

export const fetchEvent = (id) => mockRequest(() => FSR_EVENTS.find((e) => e.id === id))

let taskSeq = 30
// 事件研判：to_review → pending(转事件，定风险等级)/dismissed(不属实或重复，终结)（仅省级；用户确认 2026-11-12）
export const reviewEvent = (eventId, action, { risk, reason, reviewer } = {}) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    if (!ev || ev.status !== 'to_review') return { success: false, message: '仅待研判线索允许研判' }
    if (action !== 'pass' && action !== 'dismiss') return { success: false, message: '无效的研判结论' }
    if (!reason || !reason.trim()) return { success: false, message: '研判原因必须填写' }
    if (action === 'pass' && !risk) return { success: false, message: '转事件必须确定风险等级' }
    const time = nowText()
    const user = `${reviewer?.name || '省级研判人'}（演示）`
    if (action === 'pass') {
      ev.status = 'pending'; ev.risk = risk
      ev.trail.push({ time, action: '省级研判通过，转入待派发', user, opinion: reason, extra: `风险等级评定为${risk === 'high' ? '高' : risk === 'medium' ? '中' : '低'}，待任务下发` })
      return { success: true, eventId: ev.id }
    }
    ev.status = 'dismissed'; ev.dismissedAt = time; ev.dismissReason = reason
    ev.trail.push({ time, action: '省级研判终结，不转入核查', user, opinion: reason, extra: '线索归档留痕，可在已终结页签查询' })
    return { success: true, eventId: ev.id }
  }, 600)

// 网格巡查上报（皖政通·基层干部，可研 5.5.3.9.2：视频/图片/文字/语音上报，必须关联地块）→ 生成待研判线索
export const submitPatrolReport = (payload) =>
  mockRequest(() => {
    if (!payload.type || !payload.desc || !payload.plotName) return { success: false, message: '问题类型、关联地块和情况描述不能为空（巡查上报必须选择对应地块）' }
    const id = `EVT-2026-${String(FSR_EVENTS.length + 1).padStart(4, '0')}`
    const time = nowText()
    FSR_EVENTS.unshift({
      id, code: id.replace('EVT-', 'FSR-'), type: payload.type, source: 'grid', risk: null,
      regionCode: payload.regionCode || '', regionName: payload.regionName || '',
      spot: { plotId: null, geometry: null, center: payload.center || null, areaMu: payload.areaMu || 0, plotName: payload.plotName },
      subjectId: null, subjectName: payload.subjectName || '待核实',
      foundTime: time.slice(0, 10), desc: payload.desc,
      reporterName: payload.reporter || '',
      status: 'to_review', deadline: null, taskId: null,
      trail: [{ time, action: '网格巡查上报', user: `${payload.reporter || '网格员'}（皖政通）`, extra: `关联地块：${payload.plotName}，附现场证据${(payload.attachments || []).length}项，待省级研判` }]
    })
    return { success: true, id, code: id.replace('EVT-', 'FSR-') }
  }, 600)

// 属地核查人员目录（派发时按事件区域自动匹配，人工确认/改派）
export const fetchCheckers = (regionCode) =>
  mockRequest(() => {
    // 事件可能携带镇级区划码（如 341222104），按前缀匹配属地人员（县级/镇级目录）
    const rc = String(regionCode || '')
    return CHECKERS.filter((c) => rc.startsWith(String(c.regionCode)))
  }, 300)

// 派发任务：pending → checking（系统按属地自动匹配责任人，人工确认；核查截止为日期，默认按配置时限推算）
export const dispatchTask = (eventId, { checkerId, checkerName, checkerUnit, checkDeadline, requirement }) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    if (!ev || ev.status !== 'pending') return { success: false, message: '仅待派发事件允许下发' }
    if (!checkerId || !checkerName || !checkerUnit) return { success: false, message: '请从属地人员目录选择核查责任人' }
    if (!checkDeadline) return { success: false, message: '请选择核查截止日期' }
    const today = new Date().toISOString().slice(0, 10)
    if (checkDeadline < today) return { success: false, message: '核查截止日期不能早于今天' }
    const dispatchedAt = nowText()
    ev.status = 'checking'; ev.assignee = checkerName; ev.checkResponsiblePerson = checkerName; ev.checkResponsibleUnit = checkerUnit
    ev.dispatchedAt = dispatchedAt; ev.checkDeadline = checkDeadline; ev.deadline = checkDeadline; ev.taskId = `TSK-2026-${String(taskSeq++).padStart(4, '0')}`
    ev.dispatchRequirement = requirement || ''
    ev.trail.push({ time: dispatchedAt, action: '任务已派发', user: '派发人（演示）', extra: `系统按属地自动匹配，人工确认。责任人：${checkerName}（${checkerUnit}），核查截止：${checkDeadline}${requirement ? '，要求：' + requirement : ''}，任务编号${ev.taskId}` })
    return { success: true, taskId: ev.taskId }
  }, 600)

// 现场核查上报：checking/recheck → reported
export const submitCheckReport = (eventId, report) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    // 核查上报仅限"待核查"环节；"需复查"为市/省复核整改情况的环节（用户纠偏 2026-11-12，防 recheck→reported 状态倒流）
    if (!ev || ev.status !== 'checking') return { success: false, message: '当前状态不允许现场核查上报' }
    if (!report.conclusion || !report.desc || !report.longitude || !report.latitude) return { success: false, message: '核查结论、情况描述和现场定位不能为空' }
    const checkedAt = nowText()
    ev.status = 'reported'; ev.checkedAt = checkedAt; ev.reportedAt = checkedAt
    ev.checkReport = { ...report, checkedAt, checker: report.checker || ev.checkResponsiblePerson || '' }
    const evidence = (report.attachments || []).length
    ev.trail.push({
      time: checkedAt,
      action: '现场核查完成并上报', user: `${report.checker}（皖政通移动核查）`,
      extra: `核查结论：${report.conclusion}；现场证据${evidence}项、GPS定位1条，待市级接单`
    })
    return { success: true }
  }, 800)

// 市级接单前退回重核：reported → checking（用户确认保留 2026-11-12；派发后上报前发现派发错误的兜底通道）
export const returnReport = (eventId, reason, user) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    if (!ev || ev.status !== 'reported') return { success: false, message: '仅已上报（未接单）事件允许退回重核' }
    if (!reason || !reason.trim()) return { success: false, message: '退回原因必须填写' }
    const time = nowText()
    ev.status = 'checking'
    ev.trail.push({ time, action: '市级接单前退回重核', user: `${user?.name || '市级审核人'}（演示）`, opinion: reason, extra: '事件退回待核查状态，请核查责任人补充材料后重新上报' })
    return { success: true }
  })

// 随手拍处置进度（可研 5.5.3.9.3：受理后可查看处置流程和结果）
export const fetchSnapProgress = (code) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.code === code)
    if (!ev) return { success: false, message: '未找到该编号的上报记录' }
    return {
      success: true, status: ev.status, code: ev.code, trail: ev.trail || [],
      closeNo: ev.closeNo || '', closeOpinion: ev.closeOpinion || '', rating: ev.rating || null
    }
  })

// 我的上报（可研"我的上传"）：举报记录按举报人视角查询，不走主体/区域数据过滤。
// 演示口径：预置随手拍样例（涡阳毁粮收储等）视为本演示账号的历史上报，页面已标注。
export const fetchMySnapReports = () =>
  mockRequest(() => FSR_EVENTS.filter((e) => e.source === 'snapshot'), 400)

// 公众对已办结事件的评分评价（可研 5.5.3.9.3：对处置结果评分评价；一事件一评）
export const rateEvent = (code, { score, comment }) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.code === code)
    if (!ev || ev.status !== 'closed') return { success: false, message: '仅已结案事件允许评分评价' }
    if (ev.rating) return { success: false, message: '该事件已评价过' }
    if (!score) return { success: false, message: '请先评分' }
    ev.rating = { score, comment: comment || '', at: nowText() }
    ev.trail.push({ time: nowText(), action: '公众评分评价（皖事通随手拍）', user: '举报人', extra: `评分${score}星${comment ? '，评语：' + comment : ''}` })
    return { success: true }
  })

// 市级接单：reported → reviewing
export const acceptReport = (eventId, role) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    if (!ev || ev.status !== 'reported') return { success: false, message: '仅已上报事件允许接单审核' }
    if (role && !['city', 'province'].includes(role.role || role.code)) return { success: false, message: '仅市级及以上监管账户允许接单' }
    const time = nowText()
    ev.status = 'reviewing'
    ev.trail.push({ time, action: '市级接单，开始审核', user: `${role?.name || '市级审核人'}（演示）` })
    return { success: true }
  })

// 市级审核：reviewing → audited(通过) / checking(打回)
export const auditEvent = (eventId, action, opinion, auditor) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    if (!ev || ev.status !== 'reviewing') return { success: false, message: '仅待审核事件允许审核' }
    if (action === 'reject' && (!opinion || !opinion.trim())) return { success: false, message: '打回重核必须填写审核意见' }
    const time = nowText()
    ev.auditedAt = time; ev.auditOpinion = opinion || ''
    ev.auditor = auditor || '审核人'
    if (action === 'pass') {
      ev.status = 'audited'
      ev.trail.push({ time, action: '市级审核通过，转入整改', user: auditor, opinion: opinion || '核查材料完整，事实清楚，请责任单位限期整改' })
    } else {
      ev.status = 'checking'
      ev.trail.push({ time, action: '审核打回重核', user: auditor, opinion: opinion || '核查材料不充分，请重新核查' })
    }
    return { success: true }
  })

// 整改提交：audited → recheck
export const submitRectify = (eventId, note) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    if (!ev || ev.status !== 'audited') return { success: false, message: '仅已审核（整改中）事件允许提交整改' }
    const time = nowText()
    ev.status = 'recheck'; ev.rectificationResponsiblePerson = note.rectificationResponsiblePerson || ev.rectificationResponsiblePerson || ev.assignee || ''
    ev.rectifyDeadline = note.rectifyDeadline || note.deadline || ev.rectifyDeadline || ev.deadline
    ev.completionDescription = note.completionDescription || note.desc || ''
    ev.rectifyNote = { ...note, desc: note.desc || note.completionDescription || '', time: time.slice(0, 10), unit: note.rectificationResponsiblePerson || '责任单位' }
    ev.trail.push({
      time,
      action: '整改完成，申请复核', user: '责任单位（属地农业农村局）', extra: note.desc
    })
    return { success: true }
  })

// 复核结案：recheck → closed(通过，生成结案编号与事件简报) / audited(不通过)
let closeSeq = 30
export const closeEvent = (eventId, action, opinion, auditor) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    if (!ev || ev.status !== 'recheck') return { success: false, message: '仅需复查事件允许复核结案' }
    if (action === 'reject' && (!opinion || !opinion.trim())) return { success: false, message: '复核退回必须填写复核意见' }
    const time = nowText()
    if (action === 'pass') {
      ev.status = 'closed'
      ev.closedAt = time
      ev.closeNo = `FSR-JA-2026-${String(closeSeq++).padStart(4, '0')}`
      ev.closeOpinion = opinion || '整改到位，同意结案'
      ev.trail.push({ time, action: '复核通过，事件结案归档', user: auditor, opinion: ev.closeOpinion, extra: `结案编号${ev.closeNo}，事件简报已生成` })
      // 同步生成事件简报（E16），保证复核结案→简报列表可验证（评审 I-07 修正）
      const regionName = ev.regionName || '属地'
      EVENT_REPORTS.unshift({
        reportNo: `RPT-2026-${String(EVENT_REPORTS.length + 5).padStart(4, '0')}`,
        eventId: ev.id, eventCode: ev.code,
        title: `${regionName}${ev.type === 'zhangshi' ? '长势异常' : '毁麦毁粮'}事件简报`,
        statVersion: '演示口径 v1.0（待业务确认）',
        generatedAt: time,
        summary: `事件于${ev.foundTime || ''}接入，经现场核查与整改，${time}复核通过结案，结案编号${ev.closeNo}。`,
        fields: ['事件编号', '事件类型', '发现时间', '核查结论', '整改情况', '复核结论', '结案编号', '处置用时']
      })
    } else {
      ev.status = 'audited'
      ev.trail.push({ time, action: '复核不通过，退回整改', user: auditor, opinion: opinion || '整改不到位，请继续整改' })
    }
    return { success: true, closeNo: ev.closeNo }
  })

// 分级修正
export const adjustRisk = (eventId, risk, reason) =>
  mockRequest(() => {
    const ev = FSR_EVENTS.find((e) => e.id === eventId)
    if (!ev) return { success: false }
    if (ev.status === 'closed') return { success: false, message: '已结案事件不允许修正风险等级' }
    if (!reason || !reason.trim()) return { success: false, message: '修正原因必须填写' }
    const oldRisk = ev.riskFinal || ev.risk
    ev.riskAuto = ev.riskAuto || oldRisk
    ev.riskFinal = risk
    ev.riskAdjustReason = reason
    ev.risk = risk
    ev.trail.push({
      time: nowText(),
      action: `风险等级修正（${oldRisk} → ${risk}）`, user: '管理人员', extra: reason
    })
    return { success: true }
  }, 300)

// 随手拍（皖事通）：实名+匿名并存（用户已确认 2026-11-11；渠道归属可研 5.5.3.9.3）
export const createSnapshotEvent = (payload, role) =>
  mockRequest(() => {
    if (!role?.subjectId) return { success: false, message: '仅种植主体可提交农情直报' }
    if (!payload.type || !payload.desc || !payload.regionCode) return { success: false, message: '问题类型、问题描述和所在地区不能为空' }
    if (payload.reporterType === 'realname' && (!payload.reporterName || !payload.reporterPhone)) return { success: false, message: '实名举报需填写姓名和联系电话' }
    const id = `EVT-2026-${String(FSR_EVENTS.length + 1).padStart(4, '0')}`
    const time = nowText()
    const reporterLabel = payload.reporterType === 'realname' ? `${payload.reporterName}（实名，电话已脱敏）` : '匿名公众'
    FSR_EVENTS.unshift({
      id,
      code: id.replace('EVT-', 'FSR-'),
      type: payload.type,
      source: 'snapshot',
      risk: payload.risk || 'medium',
      regionCode: payload.regionCode,
      regionName: payload.regionName || role.regionName,
      spot: { plotId: payload.plotId || null, geometry: payload.geometry || null, center: payload.center || null, areaMu: Number(payload.areaMu || 0) },
      subjectId: role.subjectId,
      subjectName: role.unit,
      foundTime: time.slice(0, 10),
      desc: payload.desc,
      location: payload.location || '未定位',
      // 举报证据随事件留存（"我的上报"详情查看）；与核查证据 checkReport 分离
      reportAttachments: payload.attachments || [],
      reporterType: payload.reporterType || 'anonymous',
      reporterName: payload.reporterType === 'realname' ? payload.reporterName : '',
      reporterPhone: payload.reporterType === 'realname' ? payload.reporterPhone : '',
      status: 'to_review',
      deadline: null,
      taskId: null,
      trail: [{ time, action: '随手拍线索上报', user: `${reporterLabel}（皖事通）`, extra: `附现场证据${(payload.attachments || []).length}项，待省级研判` }]
    })
    return { success: true, id, code: id.replace('EVT-', 'FSR-') }
  }, 600)

// ===== 省级研判：确认随手拍线索归属地块 =====
// 口径（用户确认 2026-11-12）：公众端可不选地块，以拍照定位坐标落图；归属地块由省级按坐标与地块范围套合研判确认
export const assignSnapshotPlot = (eventId, plotId, role) =>
  mockRequest(() => {
    if (role?.code !== 'province') return { success: false, message: '仅省级可执行研判确认' }
    const e = FSR_EVENTS.find((x) => x.id === eventId)
    if (!e) return { success: false, message: '事件不存在' }
    if (e.source !== 'snapshot') return { success: false, message: '仅随手拍线索需要研判确认归属地块' }
    if (!plotId) return { success: false, message: '请选择归属地块' }
    const plot = PLOTS.find((p) => p.id === plotId)
    if (!plot) return { success: false, message: '地块不存在' }
    e.spot = e.spot || {}
    e.spot.plotId = plot.id
    if (plot.areaMu) e.spot.areaMu = plot.areaMu
    // 未关联时以拍照定位坐标为图斑中心；确认地块后中心以地块中心为准（演示口径）
    if (!e.spot.center && plot.center) e.spot.center = plot.center
    if (!e.subjectId && plot.subjectId) { e.subjectId = plot.subjectId; e.subjectName = plot.subjectName || e.subjectName }
    e.trail = e.trail || []
    e.trail.push({ time: nowText(), action: `省级研判：确认归属地块 ${plot.name}（${plot.areaMu}亩）`, user: role?.name || '省级研判员', extra: '依据拍照定位坐标与地块范围套合研判' })
    return { success: true }
  }, 500)

// ===== 长势对比库（独立记录，不再由事件派生）=====
export const fetchGrowthRecords = (role, filters = {}) =>
  mockRequest(() =>
    filterByRole(GROWTH_RECORDS, role).filter((g) => {
      if (filters.judgeStatus && g.judgeStatus !== filters.judgeStatus) return false
      if (filters.regionCode && !String(g.regionCode).startsWith(filters.regionCode.slice(0, 4))) return false
      return true
    })
  )

// 长势人工研判：待研判/模型失败 → 人工研判
export const judgeGrowth = (growthId, { level, trend, measure, suggestion, judgePerson }) =>
  mockRequest(() => {
    const g = GROWTH_RECORDS.find((x) => x.id === growthId)
    if (!g) return { success: false, message: '记录不存在' }
    if (!['pending', 'model_failed'].includes(g.judgeStatus)) return { success: false, message: '仅待研判或模型失败记录允许人工研判' }
    g.judgeStatus = 'manual_done'; g.growthLevel = level; g.yieldTrend = trend
    g.measure = measure || g.measure; g.suggestion = suggestion || g.suggestion
    g.judgePerson = judgePerson || '研判人（演示）'; g.judgeAt = nowText()
    return { success: true }
  }, 400)

// 长势异常预警推送（用户确认口径 2026-11-11：长势页为展示页，出口走预警推送而非直接生成核查任务；事件统一进变化图斑库待派发）
let growthEventSeq = 40
export const pushGrowthWarning = (growthId) =>
  mockRequest(() => {
    const g = GROWTH_RECORDS.find((x) => x.id === growthId)
    if (!g) return { success: false, message: '记录不存在' }
    if (g.warningPushed) return { success: false, message: '该记录已推送过预警' }
    if (!['manual_done', 'model_done'].includes(g.judgeStatus)) return { success: false, message: '仅已研判记录允许推送预警' }
    if (g.growthLevel === 'good' || g.growthLevel === 'normal') return { success: false, message: '仅长势异常（偏弱/偏差）记录允许推送预警' }
    const id = `EVT-2026-${String(FSR_EVENTS.length + 1).padStart(4, '0')}`
    const code = id.replace('EVT-', 'FSR-')
    const time = nowText()
    FSR_EVENTS.unshift({
      id, code, type: 'zhangshi', source: 'remote', risk: 'medium',
      regionCode: g.regionCode, regionName: g.regionName,
      spot: { plotId: null, geometry: null, center: g.center || null, areaMu: g.areaMu || 0 },
      subjectId: null, subjectName: '待核实',
      foundTime: time.slice(0, 10), desc: `苗情异常预警推送（遥感影像长势反演）：${g.regionName} ${g.cropName}长势偏弱（${g.monitorPeriod}），${g.measure || '需现场核实'}`,
      status: 'to_review', deadline: null, taskId: null, growthId: g.id,
      trail: [{ time, action: '长势异常预警推送', user: '研判人（演示）', extra: `来源长势记录 ${g.id}` }]
    })
    g.warningPushed = code
    g.warningPushAt = time
    return { success: true, eventId: id, code }
  }, 600)

// ===== 内业智能核查（安全环境演示，省级角色承载）=====
export const fetchIndoorBatches = () => mockRequest(() => INDOOR_BATCHES.map((b) => ({ ...b })))
export const fetchIndoorBatch = (id) => mockRequest(() => INDOOR_BATCHES.find((b) => b.id === id))

// 人工核验：fused → verified / verified_returned
export const verifyIndoorBatch = (id, action, verifier) =>
  mockRequest(() => {
    const b = INDOOR_BATCHES.find((x) => x.id === id)
    if (!b || b.status !== 'fused') return { success: false, message: '仅“套合完成待核验”批次允许人工核验' }
    b.verifyStatus = action === 'pass' ? '通过' : '退回'
    b.verifier = verifier || '核验人（演示）'
    b.verifyAt = nowText()
    b.status = action === 'pass' ? 'verified' : 'verified_returned'
    b.logs.unshift({ time: b.verifyAt, action: action === 'pass' ? '人工核验通过' : '人工核验退回', user: b.verifier, extra: action === 'pass' ? `疑似图斑${b.suspectCount}个进入脱密环节` : '套合结果存在明显误判，退回重新套合' })
    return { success: true }
  }, 500)

// 脱密：verified → declassified
export const declassifyBatch = (id, operator) =>
  mockRequest(() => {
    const b = INDOOR_BATCHES.find((x) => x.id === id)
    if (!b || !['verified', 'verified_returned'].includes(b.status)) return { success: false, message: '仅人工核验通过的批次允许脱密' }
    if (b.demoScenario === 'declassify_fail') return { success: false, message: '脱密失败：涉密图层版本不匹配，请核对底图版本后重试（演示场景）' }
    b.status = 'declassified'; b.declassifyStatus = '已脱密'; b.operator = operator || '内业人员（演示）'
    b.logs.unshift({ time: nowText(), action: '脱密完成', user: b.operator, extra: '坐标脱密处理完成，可进入导入环节' })
    return { success: true }
  }, 500)

// 导入：declassified → imported / import_failed / import_duplicated
export const importBatch = (id, operator) =>
  mockRequest(() => {
    const b = INDOOR_BATCHES.find((x) => x.id === id)
    if (!b || b.status !== 'declassified') return { success: false, message: '仅已脱密批次允许导入省平台' }
    const time = nowText()
    if (b.demoScenario === 'import_fail') {
      b.status = 'import_failed'; b.importStatus = '失败'; b.importFailReason = '接口超时：省平台交换服务无响应（演示场景）'
      b.logs.unshift({ time, action: '导入失败', user: operator || '内业人员（演示）', extra: b.importFailReason })
      return { success: false, message: b.importFailReason }
    }
    if (b.demoScenario === 'import_duplicated') {
      b.status = 'import_duplicated'; b.importStatus = '重复导入'; b.importFailReason = '检测到同批次号已导入，幂等拦截，未重复创建事件（演示场景）'
      b.logs.unshift({ time, action: '重复导入拦截', user: operator || '内业人员（演示）', extra: b.importFailReason })
      return { success: false, message: b.importFailReason }
    }
    b.status = 'imported'; b.importStatus = '已导入'
    // 成功导入：产出图斑生成 pending 监管事件
    const created = []
    b.outputSpots.slice(0, 2).forEach((s) => {
      const eid = `EVT-2026-${String(FSR_EVENTS.length + 1).padStart(4, '0')}`
      FSR_EVENTS.unshift({
        id: eid, code: eid.replace('EVT-', 'FSR-'), type: b.problemType || 'feilianghua', source: 'remote', risk: 'medium',
        regionCode: s.regionCode, regionName: s.regionName,
        spot: { plotId: null, geometry: null, center: s.center || null, areaMu: s.areaMu || 0 },
        subjectId: null, subjectName: '待核实',
        foundTime: time.slice(0, 10), desc: `内业核查批次 ${b.batchNo} 套合产出疑似图斑：${s.desc || '计划落实比对异常'}`,
        status: 'pending', deadline: null, taskId: null, indoorBatchId: b.id,
        trail: [{ time, action: '内业核查批次导入生成事件', user: operator || '内业人员（演示）', extra: `批次号${b.batchNo}` }]
      })
      created.push(eid.replace('EVT-', 'FSR-'))
    })
    b.logs.unshift({ time, action: '导入成功', user: operator || '内业人员（演示）', extra: `生成监管事件 ${created.length} 条：${created.join('、')}` })
    return { success: true, createdEvents: created }
  }, 600)

// ===== 事件简报与地市排名 =====
export const fetchEventReports = () => mockRequest(() => EVENT_REPORTS.map((r) => ({ ...r })))
export const fetchCityRank = (period, metric) =>
  mockRequest(() => ({
    period, metric,
    statVersion: '演示口径 v1.0（待业务确认）',
    // CITY_RANK[metric] 结构为 { rows: [...] }，取 rows 再 map（修复 map is not a function，用户截图反馈 2026-11-12）
    rows: (CITY_RANK[metric]?.rows || []).map((r) => ({ ...r }))
  }))

// ===== 业务配置 =====
export const fetchBizConfig = () => mockRequest(() => JSON.parse(JSON.stringify(BIZ_CONFIG)))
export const saveBizConfig = (section, value, operator) =>
  mockRequest(() => {
    const conf = BIZ_CONFIG.sections[section]
    if (!conf) return { success: false, message: '配置区块不存在' }
    conf.value = value
    conf.version += 1
    conf.effectiveAt = nowText()
    conf.updatedBy = operator || '省管理员（演示）'
    return { success: true, version: conf.version }
  }, 400)
