// 农药监管 API（模拟）
import { mockRequest } from './request'
import {
  PES_SUBJECTS, PES_PRODUCTS, PES_BATCHES, PES_FLOWS, PES_RECYCLES, PES_MONTHLY_STATS,
  PES_PRODUCT_MAP, PES_BATCH_MAP, PES_CONFIRMS, PES_UNCONFIRMED_SUBJECTS,
  PES_PRODUCE_LEDGERS, PES_USAGES, PES_API_LOGS, PES_KB, PES_KB_CATEGORIES
} from '@/mock/pes/data'

const filterByRole = (list, role) => {
  if (!role) return []
  if (role.subjectId) return list.filter((i) => i.from === role.subjectId || i.to === role.subjectId)
  if (role.regionCode === '340000') return list
  return list.filter((i) => {
    const from = PES_SUBJECTS.find((s) => s.id === i.from)
    const to = PES_SUBJECTS.find((s) => s.id === i.to)
    const rc = from?.regionCode || to?.regionCode
    return String(rc || '').startsWith(role.regionCode)
  })
}

// ===== 主体 =====
export const fetchPesSubjects = (role, type) =>
  mockRequest(() => {
    let list = PES_SUBJECTS
    if (role?.subjectId) list = list.filter((s) => s.id === role.subjectId)
    else if (role && role.regionCode !== '340000') list = list.filter((s) => s.regionCode.startsWith(role.regionCode.slice(0, 6)))
    return type ? list.filter((s) => s.type === type) : list
  })

// ===== 产品与批次 =====
export const fetchProducts = () => mockRequest(() => PES_PRODUCTS)
export const fetchBatches = () => mockRequest(() => PES_BATCHES)

// 模拟扫码：随机返回一个批次（演示）
export const scanQR = () =>
  mockRequest(() => {
    const batch = PES_BATCHES[Math.floor(Math.random() * PES_BATCHES.length)]
    const product = PES_PRODUCT_MAP[batch.productId]
    return { batch, product }
  }, 1500)

// ===== 台账（流向记录）=====
export const fetchFlows = (role, filters = {}) =>
  mockRequest(() =>
    filterByRole(PES_FLOWS, role).filter((f) => {
      if (filters.batchId && f.batchId !== filters.batchId) return false
      if (filters.type && f.type !== filters.type) return false
      return true
    })
  )

// 新增台账记录（入库/出库/购买）
export const addFlow = (data) =>
  mockRequest(() => {
    PES_FLOWS.unshift({ id: `FLW-${String(PES_FLOWS.length + 1).padStart(4, '0')}`, date: new Date().toISOString().slice(0, 10), ...data })
    return { success: true }
  })

// 库存计算（演示：生产+采购-销售）
export const calcStock = (batchId, subjectId) =>
  mockRequest(() => {
    const flows = PES_FLOWS.filter((f) => f.batchId === batchId)
    let stock = 0
    flows.forEach((f) => {
      if ((f.type === 'produce' || f.type === 'purchase') && f.to === subjectId) stock += f.qty
      if (f.type === 'sale' && f.from === subjectId) stock -= f.qty
      if (f.type === 'return' && f.to === subjectId) stock += f.qty
    })
    return { stock: Math.max(0, stock) }
  }, 400)

// ===== 流向追溯 =====
// 构建链路：以批次为线索聚合 from→to
export const fetchTraceFlow = (batchId) =>
  mockRequest(() => {
    const batch = PES_BATCH_MAP[batchId]
    if (!batch) return null
    const product = PES_PRODUCT_MAP[batch.productId]
    const flows = PES_FLOWS.filter((f) => f.batchId === batchId)
    const nodes = []
    const links = []
    const nodeMap = {}
    const ensureNode = (id) => {
      if (!id) id = 'UNKNOWN'
      if (nodeMap[id]) return id
      const subject = PES_SUBJECTS.find((s) => s.id === id)
      nodeMap[id] = true
      nodes.push({
        id,
        name: subject?.name || '未知购买方',
        type: subject?.type || 'unknown',
        status: subject?.status || ''
      })
      return id
    }
    flows.forEach((f) => {
      const from = ensureNode(f.from)
      const to = ensureNode(f.to)
      links.push({ from, to, qty: f.qty, type: f.type, date: f.date, breakPoint: f.breakPoint, realName: f.realName })
    })
    return { batch, product, nodes, links }
  })

// ===== 回收 =====
export const fetchRecycles = (role) => mockRequest(() => {
  if (role && role.regionCode !== '340000') return PES_RECYCLES.filter((r) => r.regionCode.startsWith(role.regionCode.slice(0, 4)))
  return PES_RECYCLES
})

// ===== 月度统计 =====
export const fetchMonthlyStats = () => mockRequest(() => PES_MONTHLY_STATS)

// ===== 主体确认（E2，C-11）=====
export const fetchConfirms = (role) =>
  mockRequest(() => {
    if (role?.subjectId) return PES_CONFIRMS.filter((c) => c.subjectId === role.subjectId)
    return PES_CONFIRMS
  })

// 企业确认本主体信息：写入 PES_CONFIRMS 并从未确认集合移除
export const confirmSubject = (subjectId, userName) =>
  mockRequest(() => {
    let rec = PES_CONFIRMS.find((c) => c.subjectId === subjectId)
    const now = new Date()
    const stamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
    if (rec) {
      rec.status = '已确认'
      rec.userName = userName || rec.userName
      rec.confirmTime = stamp
      rec.valid = true
      rec.remark = '企业自主核对确认'
    } else {
      rec = { id: `CFM-${String(PES_CONFIRMS.length + 1).padStart(4, '0')}`, subjectId, userName: userName || '', confirmTime: stamp, status: '已确认', valid: true, remark: '企业自主核对确认' }
      PES_CONFIRMS.unshift(rec)
    }
    const idx = PES_UNCONFIRMED_SUBJECTS.indexOf(subjectId)
    if (idx > -1) PES_UNCONFIRMED_SUBJECTS.splice(idx, 1)
    return rec
  })

// 判断主体是否已确认
export const isSubjectConfirmed = (subjectId) => mockRequest(() => !PES_UNCONFIRMED_SUBJECTS.includes(subjectId))

// ===== 生产台账（E5，C-05/C-06/C-09）=====
export const fetchProduceLedgers = (role, filters = {}) =>
  mockRequest(() => {
    let list = PES_PRODUCE_LEDGERS
    if (role?.subjectId) list = list.filter((l) => l.subjectId === role.subjectId)
    else if (role && role.regionCode !== '340000') list = list.filter((l) => PES_SUBJECTS.find((s) => s.id === l.subjectId)?.regionCode?.startsWith(role.regionCode.slice(0, 4)))
    return list.filter((l) => {
      if (filters.periodType && l.periodType !== filters.periodType) return false
      if (filters.status && l.status !== filters.status) return false
      return true
    })
  })

export const addProduceLedger = (data) =>
  mockRequest(() => {
    PES_PRODUCE_LEDGERS.unshift({ id: `LED-${String(2700 + PES_PRODUCE_LEDGERS.length)}`, status: 'draft', version: 1, submitTime: '', auditor: '', auditTime: '', auditOpinion: '', ...data })
    return { success: true }
  })

export const submitLedger = (id) =>
  mockRequest(() => {
    const rec = PES_PRODUCE_LEDGERS.find((l) => l.id === id)
    if (!rec) return { success: false, msg: '台账不存在' }
    if (rec.status === 'approved') return { success: false, msg: '已审核台账不可提交（C-09）' }
    rec.status = 'submitted'
    rec.submitTime = new Date().toISOString().slice(0, 16).replace('T', ' ')
    return { success: true }
  })

export const auditLedger = (id, { action, opinion, auditor }) =>
  mockRequest(() => {
    const rec = PES_PRODUCE_LEDGERS.find((l) => l.id === id)
    if (!rec) return { success: false, msg: '台账不存在' }
    if (rec.status !== 'submitted') return { success: false, msg: '仅已提交状态可审核（C-06）' }
    rec.status = action === 'pass' ? 'approved' : 'returned'
    rec.auditor = auditor || ''
    rec.auditTime = new Date().toISOString().slice(0, 16).replace('T', ' ')
    rec.auditOpinion = opinion || (action === 'pass' ? '审核通过' : '退回补正')
    rec.version += 1
    return { success: true }
  })

// 冲正申请（C-09，仅演示提示，design_proposal）
export const applyLedgerReversal = (id, reason) =>
  mockRequest(() => ({ success: true, msg: `冲正申请已登记（演示）：${id} - ${reason}` }), 600)

// ===== 使用记录（E8，C-13）=====
export const fetchUsages = (role, filters = {}) =>
  mockRequest(() => {
    let list = PES_USAGES
    if (role && role.regionCode !== '340000') list = list.filter((u) => PES_SUBJECTS.find((s) => s.id === u.subjectId)?.regionCode?.startsWith(role.regionCode.slice(0, 4)))
    return list.filter((u) => {
      if (filters.subjectId && u.subjectId !== filters.subjectId) return false
      if (filters.crop && u.crop !== filters.crop) return false
      return true
    })
  })

// 省级代录使用记录（C-13，design_proposal：正式以皖企通移动端为主）
export const addUsage = (data) =>
  mockRequest(() => {
    PES_USAGES.unshift({ id: `USG-${String(PES_USAGES.length + 1).padStart(4, '0')}`, dataSource: '省级部门录入', status: 'submitted', ...data })
    return { success: true }
  })

// ===== 接口日志（E12）=====
export const fetchApiLogs = () => mockRequest(() => PES_API_LOGS)

// ===== 知识库（公众服务）=====
export const fetchKb = (category, keyword) =>
  mockRequest(() => PES_KB.filter((k) => {
    if (category && k.category !== category) return false
    if (keyword && !k.title.includes(keyword) && !k.content.some((p) => p.includes(keyword))) return false
    return true
  }))
export const fetchKbCategories = () => mockRequest(() => PES_KB_CATEGORIES)

// ===== 库存计算（M-05：库存 = 入库 − 出库 + 退货 − 损耗 ± 盘点，损耗/盘点暂缺设计建议）=====
// 入库：to === subjectId 且 type ∈ produce/purchase/sale/buy/return（含销售退货回流）
// 出库：from === subjectId 且 type ∈ sale/buy
// 负库存 → checkStatus = '待核查'（C-08 口径待客户确认）
export const computeInventory = (subjectId) =>
  mockRequest(() => {
    const byBatch = {}
    PES_FLOWS.filter((f) => f.batchId).forEach((f) => {
      if (!byBatch[f.batchId]) byBatch[f.batchId] = 0
      const isInbound = f.to === subjectId && ['produce', 'purchase', 'sale', 'buy', 'return'].includes(f.type)
      const isOutbound = f.from === subjectId && ['sale', 'buy'].includes(f.type)
      if (isInbound) byBatch[f.batchId] += f.qty
      if (isOutbound) byBatch[f.batchId] -= f.qty
    })
    return Object.entries(byBatch)
      .filter(([, v]) => v !== 0)
      .map(([batchId, stock]) => {
        const batch = PES_BATCH_MAP[batchId]
        return {
          batchId,
          batchNo: batch?.batchNo || batchId,
          productName: PES_PRODUCT_MAP[batch?.productId]?.name || '',
          stock,
          unit: '吨',
          checkStatus: stock < 0 ? '待核查' : '正常',
          breakPoint: PES_FLOWS.some((f) => f.batchId === batchId && f.from === subjectId && f.breakPoint)
        }
      })
  }, 500)
