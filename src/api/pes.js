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

// 新增台账记录（入库/出库/购买）：录入即提交，进入待核验由县级核验
export const addFlow = (data) =>
  mockRequest(() => {
    PES_FLOWS.unshift({ id: `FLW-${String(PES_FLOWS.length + 1).padStart(4, '0')}`, date: new Date().toISOString().slice(0, 10), status: 'pending', checker: '', checkTime: '', checkOpinion: '', ...data })
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

// ===== 生产台账（E5，C-05 周期；统一核验流程：主体提交即待核验 → 县级核验一次 → 市级/省级只读）=====
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

// 企业录入即提交（取消草稿态）：进入待核验，由县级核验
export const addProduceLedger = (data) =>
  mockRequest(() => {
    PES_PRODUCE_LEDGERS.unshift({ id: `LED-${String(2700 + PES_PRODUCE_LEDGERS.length)}`, status: 'pending', version: 1, submitTime: new Date().toISOString().slice(0, 16).replace('T', ' '), checker: '', checkTime: '', checkOpinion: '', remark: '', ...data })
    return { success: true }
  })

// 待核验/核验不通过时可修改；修改后重新提交回到待核验（version 留痕）；核验通过后只读
export const updateProduceLedger = (id, data) =>
  mockRequest(() => {
    const rec = PES_PRODUCE_LEDGERS.find((l) => l.id === id)
    if (!rec) return { success: false, msg: '台账不存在' }
    if (rec.status === 'passed') return { success: false, msg: '核验通过的台账只读，不能修改' }
    const wasRejected = rec.status === 'rejected'
    Object.assign(rec, data)
    rec.version += 1
    rec.status = 'pending'
    rec.submitTime = new Date().toISOString().slice(0, 16).replace('T', ' ')
    if (wasRejected) rec.remark = `核验不通过后修改重报（原意见：${rec.checkOpinion || '无'}）`
    return { success: true }
  })

// ===== 四台账统一核验（2026-11-12 客户确认：主体提交，县级核验一次，市级/省级只读）=====
// type: produce 生产台账 / trade 经营流水 / usage 使用记录 / recycle 回收记录
export const checkPesRecord = (type, id, { action, opinion = '', checker = '' }) =>
  mockRequest(() => {
    const pools = { produce: PES_PRODUCE_LEDGERS, trade: PES_FLOWS, usage: PES_USAGES, recycle: PES_RECYCLES }
    const list = pools[type]
    if (!list) return { success: false, msg: '未知的台账类型' }
    const rec = list.find((x) => x.id === id)
    if (!rec) return { success: false, msg: '记录不存在' }
    if (rec.status !== 'pending') return { success: false, msg: '该记录已完成核验，不能重复操作' }
    if (!['pass', 'reject'].includes(action)) return { success: false, msg: '核验动作非法' }
    if (action === 'reject' && !String(opinion).trim()) return { success: false, msg: '核验不通过须填写原因' }
    rec.status = action === 'pass' ? 'passed' : 'rejected'
    rec.checker = checker
    rec.checkTime = new Date().toISOString().slice(0, 16).replace('T', ' ')
    rec.checkOpinion = opinion
    return { success: true }
  })

// 生产台账批量导入：逐行校验后入库（CSV 行对象数组）
export const importProduceLedgers = (rows) =>
  mockRequest(() => {
    const results = rows.map((r, i) => {
      const batch = PES_BATCHES.find((b) => b.batchNo === String(r.batchNo || '').trim() || b.id === String(r.batchId || '').trim())
      const num = (v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v))
      const errs = []
      if (!batch) errs.push('批次号不存在')
      const produceQty = num(r.produceQty); const salesQty = num(r.salesQty)
      const salesAmount = num(r.salesAmount); const inventoryQty = num(r.inventoryQty)
      if (produceQty === null || produceQty < 0) errs.push('产量非法')
      if (salesQty === null || salesQty < 0) errs.push('销量非法')
      if (salesAmount === null || salesAmount < 0) errs.push('销售额非法')
      if (inventoryQty === null || inventoryQty < 0) errs.push('库存非法')
      const periodType = ['day', 'month', 'year'].includes(r.periodType) ? r.periodType : ''
      if (!periodType) errs.push('周期类型须为 day/month/year')
      if (!String(r.period || '').trim()) errs.push('周期为空')
      if (errs.length) return { row: i + 2, status: '失败', msg: errs.join('；'), data: r }
      PES_PRODUCE_LEDGERS.unshift({
        id: `LED-${String(2700 + PES_PRODUCE_LEDGERS.length)}`,
        subjectId: r.subjectId, subjectName: r.subjectName,
        periodType, period: String(r.period).trim(),
        batchId: batch.id, productId: batch.productId,
        productName: PES_PRODUCT_MAP[batch.productId]?.name || '',
        produceQty, salesQty, salesAmount, inventoryQty,
        status: 'pending', submitTime: new Date().toISOString().slice(0, 16).replace('T', ' '), checker: '', checkTime: '', checkOpinion: '', remark: '批量导入', version: 1
      })
      return { row: i + 2, status: '成功', msg: '', data: r }
    })
    return { total: rows.length, success: results.filter((x) => x.status === '成功').length, failed: results.filter((x) => x.status === '失败').length, items: results }
  })

// ===== 主体批量导入（C-11：主体由省级主管部门维护；标书 1.1 主体信息管理）=====
export const importPesSubjects = (rows) =>
  mockRequest(() => {
    const typeMap = { 生产企业: 'produce', 经营企业: 'operate', 使用主体: 'use', 回收主体: 'recycle' }
    const results = rows.map((r, i) => {
      const errs = []
      const name = String(r.name || '').trim()
      const creditCode = String(r.creditCode || '').trim()
      const type = typeMap[String(r.type || '').trim()]
      const regionCode = String(r.regionCode || '').trim()
      if (!name) errs.push('主体名称为空')
      else if (PES_SUBJECTS.some((s) => s.name === name)) errs.push('主体名称已存在（唯一性冲突）')
      if (!/^[0-9A-Z]{18}$/.test(creditCode)) errs.push('统一社会信用代码须为18位')
      if (!type) errs.push('主体类型须为 生产企业/经营企业/使用主体/回收主体')
      if (!/^\d{6}$/.test(regionCode)) errs.push('区划代码须为6位')
      if (errs.length) return { row: i + 2, status: '失败', msg: errs.join('；'), data: r }
      PES_SUBJECTS.push({
        id: `IMP-${String(PES_SUBJECTS.length + 1).padStart(4, '0')}`,
        name, creditCode, type, regionCode,
        legal: String(r.legalPerson || '').trim(),
        address: String(r.address || '').trim(),
        license: String(r.license || '').trim(),
        status: '正常', source: '批量导入'
      })
      PES_UNCONFIRMED_SUBJECTS.push(`IMP-${String(PES_SUBJECTS.length).padStart(4, '0')}`)
      return { row: i + 2, status: '成功', msg: '', data: r }
    })
    return { total: rows.length, success: results.filter((x) => x.status === '成功').length, failed: results.filter((x) => x.status === '失败').length, items: results }
  })

// ===== 经营台账批量导入（PES-R06 手工兜底通道；校验规则与手工录入一致）=====
export const importTradeFlows = (rows, subjectId) =>
  mockRequest(() => {
    const results = rows.map((r, i) => {
      const errs = []
      const batch = PES_BATCHES.find((b) => b.batchNo === String(r.batchNo || '').trim() || b.id === String(r.batchId || '').trim())
      if (!batch) errs.push('批次号不存在')
      const qty = Number(r.qty)
      if (!qty || qty <= 0 || isNaN(qty)) errs.push('数量须大于0')
      const typeMap = { 采购入库: 'purchase', 销售出库: 'sale', 退货: 'return' }
      const type = typeMap[String(r.flowType || '').trim()]
      if (!type) errs.push('业务类型须为 采购入库/销售出库/退货')
      const buyerName = String(r.buyerName || '').trim()
      if (type === 'sale' && !buyerName) errs.push('销售出库购买方必填（C-07）')
      const date = String(r.date || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errs.push('日期格式须为 YYYY-MM-DD')
      if (errs.length) return { row: i + 2, status: '失败', msg: errs.join('；'), data: r }
      PES_FLOWS.unshift({
        id: `FLW-${String(PES_FLOWS.length + 1).padStart(4, '0')}`,
        batchId: batch.id, type, date, qty,
        from: type === 'sale' ? subjectId : null,
        to: type === 'sale' ? null : subjectId,
        buyerName: type === 'sale' ? buyerName : '',
        realName: type === 'sale',
        breakPoint: false,
        status: 'pending', checker: '', checkTime: '', checkOpinion: '',
        remark: '批量导入'
      })
      return { row: i + 2, status: '成功', msg: '', data: r }
    })
    return { total: rows.length, success: results.filter((x) => x.status === '成功').length, failed: results.filter((x) => x.status === '失败').length, items: results }
  })

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

// 省级代录使用记录（C-13，design_proposal：正式以皖企通移动端为主）；提交后进入待核验
export const addUsage = (data) =>
  mockRequest(() => {
    PES_USAGES.unshift({ id: `USG-${String(PES_USAGES.length + 1).padStart(4, '0')}`, dataSource: '县级部门录入', status: 'pending', checker: '', checkTime: '', checkOpinion: '', ...data })
    return { success: true }
  })

// ===== 接口日志（E12）=====
export const fetchApiLogs = () => mockRequest(() => PES_API_LOGS)

// ===== 知识库（公众端展示口径：仅已发布文章）=====
export const fetchKb = (category, keyword) =>
  mockRequest(() => PES_KB.filter((k) => {
    if (k.status !== 'published') return false
    if (category && k.category !== category) return false
    if (keyword && !k.title.includes(keyword) && !k.content.some((p) => p.includes(keyword))) return false
    return true
  }))
export const fetchKbCategories = () => mockRequest(() => PES_KB_CATEGORIES)

// ===== 内容发布（省级管理员维护公众服务内容池：新增/编辑/发布/下架）=====
export const fetchKbArticles = ({ status } = {}) =>
  mockRequest(() => PES_KB.filter((a) => (status ? a.status === status : true)))

export const saveKbArticle = (data) =>
  mockRequest(() => {
    if (data.id) {
      const rec = PES_KB.find((a) => a.id === data.id)
      if (!rec) return { success: false, msg: '文章不存在' }
      Object.assign(rec, { ...data, date: new Date().toISOString().slice(0, 10) })
    } else {
      PES_KB.unshift({ id: `KB-${String(PES_KB.length + 1).padStart(3, '0')}`, views: 0, status: 'draft', publishTime: '', date: new Date().toISOString().slice(0, 10), ...data })
    }
    return { success: true }
  })

export const publishKbArticle = (id, action) =>
  mockRequest(() => {
    const rec = PES_KB.find((a) => a.id === id)
    if (!rec) return { success: false, msg: '文章不存在' }
    if (!['publish', 'unpublish'].includes(action)) return { success: false, msg: '操作非法' }
    if (action === 'publish') {
      rec.status = 'published'
      rec.publishTime = new Date().toISOString().slice(0, 16).replace('T', ' ')
      rec.date = rec.publishTime.slice(0, 10)
    } else {
      rec.status = 'paused'
      rec.publishTime = ''
    }
    return { success: true }
  })

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
