// 农药监管 Mock：主体、产品批次、流向记录
import { offsetPoint } from '@/map/geoUtils'

// ===== 主体（生产4 / 经营25 / 使用30 / 回收5）=====
const buildPesSubjects = () => {
  const subjects = []
  // 生产企业
  const producers = [
    { id: 'PES-P-0001', name: '安徽华星化工有限公司', city: '合肥市', regionCode: '340123', center: [116.854, 31.708], license: '农药生许字(皖)第001号', capacity: '20000吨/年', status: '正常' },
    { id: 'PES-P-0002', name: '安徽久易农业股份有限公司', city: '合肥市', regionCode: '340121', center: [117.167, 32.479], license: '农药生许字(皖)第002号', capacity: '15000吨/年', status: '正常' },
    { id: 'PES-P-0003', name: '安徽广信农化股份有限公司', city: '宣城市', regionCode: '341822', center: [118.42, 30.63], license: '农药生许字(皖)第003号', capacity: '30000吨/年', status: '正常' },
    { id: 'PES-P-0004', name: '安徽中山化工有限公司', city: '池州市', regionCode: '341721', center: [117.49, 30.66], license: '农药生许字(皖)第004号', capacity: '12000吨/年', status: '停产整改' },
    { id: 'PES-P-0005', name: '太和县恒力化工有限公司', city: '阜阳市', regionCode: '341222', center: [115.62, 33.28], license: '农药生许字(皖)第005号', capacity: '8000吨/年', status: '正常' }
  ]
  producers.forEach((p) => subjects.push({ ...p, type: 'produce', legal: '张某某', address: `安徽省${p.city}经济开发区` }))

  // 经营网点（含演示主角刘敏的门店）
  const shops = [
    { id: 'PES-S-0012', name: '太和县皖丰农资经营部', regionCode: '341222', center: [115.622, 33.16], owner: '刘敏' },
    { id: 'PES-S-0001', name: '合肥丰乐农资连锁总店', regionCode: '340104', center: [117.26, 31.85], owner: '王某' },
    { id: 'PES-S-0002', name: '肥西县农资放心店（上派镇）', regionCode: '340123', center: [116.86, 31.72], owner: '李某' },
    { id: 'PES-S-0003', name: '长丰县下塘农资店', regionCode: '340121', center: [117.17, 32.47], owner: '赵某' },
    { id: 'PES-S-0004', name: '涡阳县雉河农资经营部', regionCode: '341622', center: [116.21, 33.49], owner: '马某' },
    { id: 'PES-S-0005', name: '阜阳颍州农资大市场三店', regionCode: '341202', center: [115.8, 32.88], owner: '周某' },
    { id: 'PES-S-0006', name: '蒙城县庄周农资店', regionCode: '341621', center: [116.56, 33.26], owner: '陈某' },
    { id: 'PES-S-0007', name: '亳州谯城农资连锁店', regionCode: '341602', center: [115.78, 33.85], owner: '吴某' },
    { id: 'PES-S-0008', name: '宿州埇桥农资经营部', regionCode: '341302', center: [116.96, 33.64], owner: '郑某' },
    { id: 'PES-S-0009', name: '蚌埠淮上农资店', regionCode: '340311', center: [117.39, 32.95], owner: '冯某' },
    { id: 'PES-S-0010', name: '淮南田家庵农资店', regionCode: '340403', center: [117.02, 32.64], owner: '褚某' },
    { id: 'PES-S-0011', name: '滁州南谯农资经营部', regionCode: '341103', center: [118.34, 32.3], owner: '卫某' }
  ]
  shops.forEach((s, i) => subjects.push({
    ...s, type: 'operate', legal: s.owner, address: `安徽省${s.name.slice(0, 4)}`,
    license: `农药经许(皖)第${String(i + 1).padStart(3, '0')}号`, status: i === 8 ? '责令整改' : '正常'
  }))

  // 使用主体（规模种植主体）
  const users = [
    { id: 'SUB-0001', name: '太和县丰乐种植专业合作社', regionCode: '341222', center: [115.62, 33.17] },
    { id: 'SUB-0002', name: '太和县绿源家庭农场', regionCode: '341222', center: [115.6, 33.15] },
    { id: 'SUB-0007', name: '涡阳县丰收种植合作社', regionCode: '341622', center: [116.2, 33.5] },
    { id: 'SUB-0009', name: '肥西县三河现代农业公司', regionCode: '340123', center: [116.85, 31.71] },
    { id: 'SUB-0011', name: '长丰县下塘龙虾稻田农场', regionCode: '340121', center: [117.16, 32.48] },
    { id: 'SUB-0006', name: '太和县税镇镇兴农合作社', regionCode: '341222', center: [115.45, 33.2] }
  ]
  users.forEach((u) => subjects.push({ ...u, type: 'use', crops: '小麦、玉米、水稻', status: '正常' }))

  // 回收处理主体
  const recyclers = [
    { id: 'PES-R-0001', name: '合肥绿源包装废弃物回收中心', regionCode: '340111', center: [117.15, 31.78], capacity: '500吨/年' },
    { id: 'PES-R-0002', name: '阜阳农资包装回收站', regionCode: '341202', center: [115.79, 32.87], capacity: '300吨/年' },
    { id: 'PES-R-0003', name: '亳州利农回收处理公司', regionCode: '341602', center: [115.77, 33.84], capacity: '400吨/年' }
  ]
  recyclers.forEach((r) => subjects.push({ ...r, type: 'recycle', legal: '钱某某', status: '正常' }))

  return subjects
}

export const PES_SUBJECTS = buildPesSubjects()
export const PES_SUBJECT_MAP = Object.fromEntries(PES_SUBJECTS.map((s) => [s.id, s]))

// 主体点位 GeoJSON
export const pesSubjectsGeoJSON = (types) => ({
  type: 'FeatureCollection',
  features: PES_SUBJECTS.filter((s) => types.includes(s.type)).map((s) => ({
    type: 'Feature',
    properties: { id: s.id, name: s.name, type: s.type, status: s.status, license: s.license || '' },
    geometry: { type: 'Point', coordinates: s.center }
  }))
})

// ===== 产品与批次 =====
export const PES_PRODUCTS = [
  { id: 'PRD-0001', regNo: 'PD20140236', name: '草甘膦异丙胺盐水剂', toxA: 'low', toxAName: '低毒', formulation: '水剂', content: '30%', trademark: '农达', brand: '除草剂', producer: 'PES-P-0001', producerName: '安徽华星化工有限公司', crops: '非耕地', targets: '杂草' },
  { id: 'PRD-0002', regNo: 'PD20181052', name: '吡虫啉悬浮剂', toxA: 'low', toxAName: '低毒', formulation: '悬浮剂', content: '20%', trademark: '大功臣', brand: '杀虫剂', producer: 'PES-P-0002', producerName: '安徽久易农业股份有限公司', crops: '小麦、水稻', targets: '蚜虫、飞虱' },
  { id: 'PRD-0003', regNo: 'PD20200641', name: '阿维菌素乳油', toxA: 'medium', toxAName: '中等毒', formulation: '乳油', content: '1.8%', trademark: '虫螨克', brand: '杀虫剂', producer: 'PES-P-0003', producerName: '安徽广信农化股份有限公司', crops: '玉米、蔬菜', targets: '玉米螟、红蜘蛛' },
  { id: 'PRD-0004', regNo: 'PD20150918', name: '多菌灵可湿性粉剂', toxA: 'low', toxAName: '低毒', formulation: '可湿性粉剂', content: '50%', trademark: '霉灵', brand: '杀菌剂', producer: 'PES-P-0001', producerName: '安徽华星化工有限公司', crops: '小麦', targets: '赤霉病、白粉病' },
  { id: 'PRD-0005', regNo: 'PD20172306', name: '高效氯氟氰菊酯水乳剂', toxA: 'medium', toxAName: '中等毒', formulation: '水乳剂', content: '2.5%', trademark: '锐宁', brand: '杀虫剂', producer: 'PES-P-0002', producerName: '安徽久易农业股份有限公司', crops: '小麦、玉米', targets: '蚜虫、粘虫', restricted: true },
  { id: 'PRD-0006', regNo: 'PD20191472', name: '戊唑醇悬浮剂', toxA: 'low', toxAName: '低毒', formulation: '悬浮剂', content: '43%', trademark: '立克秀', brand: '杀菌剂', producer: 'PES-P-0003', producerName: '安徽广信农化股份有限公司', crops: '小麦', targets: '纹枯病、锈病' },
  { id: 'PRD-0007', regNo: 'PD20160385', name: '敌敌畏乳油', toxA: 'high', toxAName: '高毒', formulation: '乳油', content: '77.5%', trademark: '必歼', brand: '杀虫剂', producer: 'PES-P-0004', producerName: '安徽中山化工有限公司', crops: '仓储害虫', targets: '多种害虫', restricted: true },
  { id: 'PRD-0008', regNo: 'PD20210884', name: '噻虫嗪种子处理悬浮剂', toxA: 'low', toxAName: '低毒', formulation: '种衣剂', content: '30%', trademark: '锐胜', brand: '杀虫剂', producer: 'PES-P-0002', producerName: '安徽久易农业股份有限公司', crops: '小麦、玉米', targets: '地下害虫' },
  { id: 'PRD-0009', regNo: 'PD20220677', name: '苯醚甲环唑悬浮剂', toxA: 'low', toxAName: '低毒', formulation: '悬浮剂', content: '30%', trademark: '恒力洁', brand: '杀菌剂', producer: 'PES-P-0005', producerName: '太和县恒力化工有限公司', crops: '小麦', targets: '白粉病、锈病' }
]

// 批次
export const PES_BATCHES = [
  { id: 'BAT-2601', productId: 'PRD-0001', batchNo: 'HG20260301A', produceDate: '2026-03-01', qty: 800, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/HG20260301A' },
  { id: 'BAT-2602', productId: 'PRD-0002', batchNo: 'JY20260412B', produceDate: '2026-04-12', qty: 500, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/JY20260412B' },
  { id: 'BAT-2603', productId: 'PRD-0003', batchNo: 'GX20260420C', produceDate: '2026-04-20', qty: 320, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/GX20260420C' },
  { id: 'BAT-2604', productId: 'PRD-0004', batchNo: 'HG20260505A', produceDate: '2026-05-05', qty: 600, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/HG20260505A' },
  { id: 'BAT-2605', productId: 'PRD-0005', batchNo: 'JY20260618B', produceDate: '2026-06-18', qty: 280, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/JY20260618B' },
  { id: 'BAT-2606', productId: 'PRD-0006', batchNo: 'GX20260702C', produceDate: '2026-07-02', qty: 450, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/GX20260702C' },
  { id: 'BAT-2607', productId: 'PRD-0002', batchNo: 'JY20260815D', produceDate: '2026-08-15', qty: 420, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/JY20260815D' },
  { id: 'BAT-2608', productId: 'PRD-0008', batchNo: 'JY20260901E', produceDate: '2026-09-01', qty: 260, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/JY20260901E' },
  { id: 'BAT-2609', productId: 'PRD-0009', batchNo: 'HL20261012F', produceDate: '2026-10-12', qty: 150, unit: '吨', qr: 'https://pms.ah.gov.cn/qr/HL20261012F' }
]

export const PES_PRODUCT_MAP = Object.fromEntries(PES_PRODUCTS.map((p) => [p.id, p]))
export const PES_BATCH_MAP = Object.fromEntries(PES_BATCHES.map((b) => [b.id, b]))

// ===== 流向记录 =====
// type: produce 生产入库 / purchase 采购入库 / sale 销售出库 / buy 购买 / return 退货
// from/to: 主体id
const buildFlows = () => {
  const flows = []
  let id = 1
  // 经营台账流水统一核验状态（与生产/使用/回收共用 PES_CHECK_STATUS）：企业录入即 pending，县级核验一次
  const add = (batchId, type, from, to, qty, date, extra = {}) => {
    flows.push({ id: `FLW-${String(id++).padStart(4, '0')}`, batchId, type, from, to, qty, unit: '吨', date, regionCode: '340000', status: 'pending', ...extra })
  }

  // 链路1：草甘膦（完整链 + 断点）
  add('BAT-2601', 'produce', 'PES-P-0001', 'PES-P-0001', 800, '2026-03-05', { status: 'passed', checker: '李强（肥东县农业农村局）', checkTime: '2026-03-07 09:15', checkOpinion: '与生产计划一致' })
  add('BAT-2601', 'sale', 'PES-P-0001', 'PES-S-0012', 120, '2026-03-20')
  add('BAT-2601', 'sale', 'PES-P-0001', 'PES-S-0002', 200, '2026-03-22')
  add('BAT-2601', 'sale', 'PES-P-0001', 'PES-S-0004', 150, '2026-03-25')
  add('BAT-2601', 'buy', 'PES-S-0012', 'SUB-0001', 8, '2026-04-02', { buyerName: '太和县丰乐种植专业合作社', realName: true })
  add('BAT-2601', 'buy', 'PES-S-0012', 'SUB-0002', 5, '2026-04-05', { buyerName: '太和县绿源家庭农场', realName: true })
  add('BAT-2601', 'buy', 'PES-S-0002', 'SUB-0009', 40, '2026-04-10', { buyerName: '肥西县三河现代农业公司', realName: true })
  // 断点链：涡阳店售出但购买方缺失
  add('BAT-2601', 'sale', 'PES-P-0001', 'PES-S-0004', 150, '2026-03-25', { breakPoint: true })
  add('BAT-2601', 'sale', 'PES-S-0004', null, 60, '2026-04-18', { buyerName: null, realName: false, breakPoint: true, remark: '购买方信息缺失' })

  // 链路2：吡虫啉（完整链）
  add('BAT-2602', 'produce', 'PES-P-0002', 'PES-P-0002', 500, '2026-04-15')
  add('BAT-2602', 'sale', 'PES-P-0002', 'PES-S-0012', 80, '2026-04-28')
  add('BAT-2602', 'sale', 'PES-P-0002', 'PES-S-0005', 100, '2026-04-30')
  add('BAT-2602', 'buy', 'PES-S-0012', 'SUB-0001', 6, '2026-05-06', { buyerName: '太和县丰乐种植专业合作社', realName: true })
  add('BAT-2602', 'buy', 'PES-S-0012', 'SUB-0006', 4, '2026-05-08', { buyerName: '太和县税镇镇兴农合作社', realName: true })
  add('BAT-2602', 'buy', 'PES-S-0005', 'SUB-0007', 12, '2026-05-12', { buyerName: '涡阳县丰收种植合作社', realName: true })
  add('BAT-2602', 'return', 'SUB-0007', 'PES-S-0005', 2, '2026-05-20', { remark: '包装破损退货' })

  // 链路3：阿维菌素
  add('BAT-2603', 'produce', 'PES-P-0003', 'PES-P-0003', 320, '2026-04-25')
  add('BAT-2603', 'sale', 'PES-P-0003', 'PES-S-0006', 60, '2026-05-10')
  add('BAT-2603', 'sale', 'PES-P-0003', 'PES-S-0011', 45, '2026-05-12')
  add('BAT-2603', 'buy', 'PES-S-0006', 'SUB-0007', 5, '2026-05-25', { buyerName: '涡阳县丰收种植合作社', realName: true })
  add('BAT-2603', 'buy', 'PES-S-0011', 'SUB-0001', 3, '2026-05-28', { buyerName: '太和县丰乐种植专业合作社', realName: true })

  // 链路4：多菌灵
  add('BAT-2604', 'produce', 'PES-P-0001', 'PES-P-0001', 600, '2026-05-08')
  add('BAT-2604', 'sale', 'PES-P-0001', 'PES-S-0012', 90, '2026-05-20')
  add('BAT-2604', 'buy', 'PES-S-0012', 'SUB-0004', 2, '2026-05-26', { buyerName: '旧县镇赵多种植大户', realName: true })
  add('BAT-2604', 'buy', 'PES-S-0012', 'SUB-0005', 1.5, '2026-05-27', { buyerName: '旧县镇田乐家庭农场', realName: true })

  // 链路4.5：高效氯氟氰菊酯（限用药，实名购买演示）
  add('BAT-2605', 'produce', 'PES-P-0002', 'PES-P-0002', 280, '2026-06-20')
  add('BAT-2605', 'sale', 'PES-P-0002', 'PES-S-0012', 60, '2026-07-01')
  add('BAT-2605', 'buy', 'PES-S-0012', 'SUB-0006', 3, '2026-07-08', { buyerName: '太和县税镇镇兴农合作社', realName: true })

  // 链路5：戊唑醇
  add('BAT-2606', 'produce', 'PES-P-0003', 'PES-P-0003', 450, '2026-07-05')
  add('BAT-2606', 'sale', 'PES-P-0003', 'PES-S-0012', 70, '2026-07-18')
  add('BAT-2606', 'buy', 'PES-S-0012', 'SUB-0002', 3, '2026-07-22', { buyerName: '太和县绿源家庭农场', realName: true })

  // 链路6.5：吡虫啉第二批次
  add('BAT-2607', 'produce', 'PES-P-0002', 'PES-P-0002', 420, '2026-08-18')
  add('BAT-2607', 'sale', 'PES-P-0002', 'PES-S-0005', 40, '2026-08-28')
  add('BAT-2607', 'buy', 'PES-S-0005', 'SUB-0007', 4, '2026-09-02', { buyerName: '涡阳县丰收种植合作社', realName: true })

  // 链路6：噻虫嗪
  add('BAT-2608', 'produce', 'PES-P-0002', 'PES-P-0002', 260, '2026-09-03')
  add('BAT-2608', 'sale', 'PES-P-0002', 'PES-S-0003', 50, '2026-09-15')
  add('BAT-2608', 'buy', 'PES-S-0003', 'SUB-0011', 2, '2026-09-20', { buyerName: '长丰县下塘龙虾稻田农场', realName: true })

  // 库存调整：退货回流
  add('BAT-2602', 'return', 'SUB-0007', 'PES-S-0005', 2, '2026-05-20', { remark: '包装破损退货' })

  // 待核查样本：滁州南谯店出库量(50)超出其入库量(45)，且购买方缺失 → 库存为负 + 断点（C-08/C-12 演示）
  add('BAT-2603', 'sale', 'PES-S-0011', null, 50, '2026-05-30', { buyerName: null, realName: false, breakPoint: true, remark: '超出库存出库，系统置待核查' })

  // 待核查样本：太和皖丰店超库存销售（购买方实名，仅触发 C-08 待核查，不构成断点）
  add('BAT-2602', 'sale', 'PES-S-0012', 'SUB-0003', 100, '2026-06-02', { buyerName: '太和县城关镇农技推广站', realName: true, remark: '出库量大于结存，库存置待核查（C-08）' })

  return flows
}

export const PES_FLOWS = buildFlows()

// ===== 包装废弃物回收 =====
// status 统一三态：pending 待核验 / passed 核验通过 / rejected 核验不通过（与生产/经营/使用台账共用字典）
export const PES_RECYCLES = [
  { id: 'RC-0001', stationId: 'PES-R-0002', stationName: '阜阳农资包装回收站', regionCode: '341202', date: '2026-09-20', fromSubject: 'PES-S-0012', fromName: '太和县皖丰农资经营部', type: '农药瓶', count: 4200, weight: 210, handle: '无害化焚烧处置', voucher: 'HZ-2026-0920', batchNo: 'HG20260301A', status: 'passed', checker: '李强（太和县农业农村局）', checkTime: '2026-09-22 10:05', checkOpinion: '数量与交回凭证一致' },
  { id: 'RC-0002', stationId: 'PES-R-0001', stationName: '合肥绿源包装废弃物回收中心', regionCode: '340111', date: '2026-09-18', fromSubject: 'PES-S-0001', fromName: '合肥丰乐农资连锁总店', type: '农药袋', count: 8600, weight: 172, handle: '资源化利用', voucher: 'HZ-2026-0918', batchNo: 'GX20260420C', status: 'passed', checker: '陈明（蜀山区农业农村局）', checkTime: '2026-09-20 15:30', checkOpinion: '' },
  { id: 'RC-0003', stationId: 'PES-R-0003', stationName: '亳州利农回收处理公司', regionCode: '341602', date: '2026-09-25', fromSubject: 'PES-S-0006', fromName: '蒙城县庄周农资店', type: '农药瓶', count: 3100, weight: 155, handle: '无害化焚烧处置', voucher: 'HZ-2026-0925', batchNo: '', status: 'pending', checker: '', checkTime: '', checkOpinion: '' },
  { id: 'RC-0004', stationId: 'PES-R-0001', stationName: '合肥绿源包装废弃物回收中心', regionCode: '340111', date: '2026-10-12', fromSubject: 'PES-S-0002', fromName: '肥西县农资放心店（上派镇）', type: '农药瓶', count: 2600, weight: 130, handle: '无害化焚烧处置', voucher: 'HZ-2026-1012', batchNo: 'HG20260301A', status: 'rejected', checker: '陈明（蜀山区农业农村局）', checkTime: '2026-10-14 11:20', checkOpinion: '数量与交回凭证不符，请核对后重新提交' },
  { id: 'RC-0005', stationId: 'PES-R-0002', stationName: '阜阳农资包装回收站', regionCode: '341202', date: '2026-10-18', fromSubject: 'PES-S-0012', fromName: '太和县皖丰农资经营部', type: '农药袋', count: 5200, weight: 104, handle: '资源化利用', voucher: 'HZ-2026-1018', batchNo: 'JY20260412B', status: 'pending', checker: '', checkTime: '', checkOpinion: '' }
]

// ===== 主体确认记录（E2，C-11：用户上报台账前须确认主体信息）=====
export const PES_CONFIRMS = [
  { id: 'CFM-0001', subjectId: 'PES-P-0001', userName: '陈新华', confirmTime: '2026-09-28 09:12', status: '已确认', valid: true, remark: '经核对营业执照与许可证信息无误' },
  { id: 'CFM-0002', subjectId: 'PES-R-0002', userName: '钱进', confirmTime: '2026-10-09 15:40', status: '已确认', valid: true, remark: '' },
  { id: 'CFM-0003', subjectId: 'PES-S-0012', userName: '刘敏', confirmTime: '', status: '未确认', valid: false, remark: '主体信息待核对' }
]

// 未确认主体集合（演示阻断逻辑用）
export const PES_UNCONFIRMED_SUBJECTS = ['PES-S-0012', 'PES-S-0006', 'SUB-0007']

// ===== 生产台账（E5，C-05 周期；主体提交→县级核验一次→市级/省级只读，四台账统一核验流程）=====
// status 统一三态：pending 待核验 / passed 核验通过 / rejected 核验不通过；rejected 后企业可修改重新提交（version 留痕）
export const PES_PRODUCE_LEDGERS = [
  { id: 'LED-2601', subjectId: 'PES-P-0001', subjectName: '安徽华星化工有限公司', periodType: 'month', period: '2026-09', batchId: 'BAT-2601', productId: 'PRD-0001', productName: '草甘膦异丙胺盐水剂', produceQty: 800, salesQty: 470, salesAmount: 1410, inventoryQty: 330, status: 'passed', submitTime: '2026-10-08 10:20', checker: '李强（肥东县农业农村局）', checkTime: '2026-10-10 09:40', checkOpinion: '与经营流水一致', remark: '', version: 1 },
  { id: 'LED-2602', subjectId: 'PES-P-0001', subjectName: '安徽华星化工有限公司', periodType: 'month', period: '2026-10', batchId: 'BAT-2604', productId: 'PRD-0004', productName: '多菌灵可湿性粉剂', produceQty: 600, salesQty: 92, salesAmount: 276, inventoryQty: 508, status: 'pending', submitTime: '2026-11-02 09:31', checker: '', checkTime: '', checkOpinion: '', remark: '', version: 1 },
  { id: 'LED-2603', subjectId: 'PES-P-0001', subjectName: '安徽华星化工有限公司', periodType: 'month', period: '2026-11', batchId: 'BAT-2601', productId: 'PRD-0001', productName: '草甘膦异丙胺盐水剂', produceQty: 420, salesQty: 380, salesAmount: 1140, inventoryQty: 40, status: 'rejected', submitTime: '2026-11-06 15:10', checker: '李强（肥东县农业农村局）', checkTime: '2026-11-08 10:25', checkOpinion: '销售量与经营流水不一致，请核对后重新提交', remark: '', version: 2 },
  { id: 'LED-2604', subjectId: 'PES-P-0001', subjectName: '安徽华星化工有限公司', periodType: 'day', period: '2026-11-10', batchId: 'BAT-2604', productId: 'PRD-0004', productName: '多菌灵可湿性粉剂', produceQty: 35, salesQty: 12, salesAmount: 36, inventoryQty: 23, status: 'pending', submitTime: '2026-11-11 08:45', checker: '', checkTime: '', checkOpinion: '', remark: '', version: 1 },
  { id: 'LED-2605', subjectId: 'PES-P-0001', subjectName: '安徽华星化工有限公司', periodType: 'year', period: '2025', batchId: 'BAT-2601', productId: 'PRD-0001', productName: '草甘膦异丙胺盐水剂', produceQty: 9600, salesQty: 9100, salesAmount: 27300, inventoryQty: 500, status: 'passed', submitTime: '2026-01-15 11:00', checker: '李强（肥东县农业农村局）', checkTime: '2026-01-20 14:00', checkOpinion: '', remark: '', version: 1 },
  { id: 'LED-2606', subjectId: 'PES-P-0002', subjectName: '安徽久易农业股份有限公司', periodType: 'month', period: '2026-09', batchId: 'BAT-2608', productId: 'PRD-0008', productName: '噻虫嗪种子处理悬浮剂', produceQty: 260, salesQty: 52, salesAmount: 208, inventoryQty: 208, status: 'pending', submitTime: '2026-10-05 14:22', checker: '', checkTime: '', checkOpinion: '', remark: '', version: 1 },
  { id: 'LED-2607', subjectId: 'PES-P-0005', subjectName: '太和县恒力化工有限公司', periodType: 'month', period: '2026-10', batchId: 'BAT-2609', productId: 'PRD-0009', productName: '苯醚甲环唑悬浮剂', produceQty: 150, salesQty: 60, salesAmount: 240, inventoryQty: 90, status: 'pending', submitTime: '2026-11-01 10:00', checker: '', checkTime: '', checkOpinion: '', remark: '', version: 1 },
  { id: 'LED-2608', subjectId: 'PES-P-0005', subjectName: '太和县恒力化工有限公司', periodType: 'month', period: '2026-09', batchId: 'BAT-2609', productId: 'PRD-0009', productName: '苯醚甲环唑悬浮剂', produceQty: 130, salesQty: 55, salesAmount: 220, inventoryQty: 75, status: 'passed', submitTime: '2026-10-03 09:15', checker: '王芳（太和县农业农村局）', checkTime: '2026-10-06 11:30', checkOpinion: '', remark: '', version: 1 }
]

// ===== 四台账统一核验状态字典（生产 E5 / 经营流水 E6 / 使用记录 E8 / 回收记录 E9 共用）=====
// 主体提交即 pending → 县级核验一次（通过 passed / 不通过 rejected）→ 市级、省级只读
export const PES_CHECK_STATUS = {
  pending: { name: '待核验', tag: 'warning' },
  passed: { name: '核验通过', tag: 'success' },
  rejected: { name: '核验不通过', tag: 'danger' }
}

// ===== 使用记录（E8：使用主体经皖企通上报，县级部门可代录；提交后由县级核验）=====
export const PES_USAGES = [
  { id: 'USG-0001', subjectId: 'SUB-0001', subjectName: '太和县丰乐种植专业合作社', usageDate: '2026-04-05', crop: '小麦', pestTarget: '蚜虫', productId: 'PRD-0002', batchId: 'BAT-2602', productName: '吡虫啉悬浮剂', dosage: 6, unit: '公斤', areaMu: 1200, dataSource: '皖企通', status: 'passed', checker: '李强（太和县农业农村局）', checkTime: '2026-04-08 09:30', checkOpinion: '' },
  { id: 'USG-0002', subjectId: 'SUB-0002', subjectName: '太和县绿源家庭农场', usageDate: '2026-04-08', crop: '小麦', pestTarget: '赤霉病', productId: 'PRD-0004', batchId: 'BAT-2604', productName: '多菌灵可湿性粉剂', dosage: 2, unit: '公斤', areaMu: 500, dataSource: '皖企通', status: 'pending', checker: '', checkTime: '', checkOpinion: '' },
  { id: 'USG-0003', subjectId: 'SUB-0009', subjectName: '肥西县三河现代农业公司', usageDate: '2026-04-12', crop: '水稻', pestTarget: '纹枯病', productId: 'PRD-0006', batchId: 'BAT-2606', productName: '戊唑醇悬浮剂', dosage: 3, unit: '公斤', areaMu: 800, dataSource: '县级部门录入', status: 'pending', checker: '', checkTime: '', checkOpinion: '' },
  { id: 'USG-0004', subjectId: 'SUB-0007', subjectName: '涡阳县丰收种植合作社', usageDate: '2026-05-15', crop: '玉米', pestTarget: '玉米螟', productId: 'PRD-0003', batchId: '', productName: '阿维菌素乳油', dosage: 5, unit: '公斤', areaMu: 600, dataSource: '皖企通', status: 'pending', checker: '', checkTime: '', checkOpinion: '', breakPoint: true, remark: '购买批次未关联，追溯断点' },
  { id: 'USG-0005', subjectId: 'SUB-0011', subjectName: '长丰县下塘龙虾稻田农场', usageDate: '2026-09-22', crop: '小麦（拌种）', pestTarget: '地下害虫', productId: 'PRD-0008', batchId: 'BAT-2608', productName: '噻虫嗪种子处理悬浮剂', dosage: 2, unit: '公斤', areaMu: 300, dataSource: '县级部门录入', status: 'pending', checker: '', checkTime: '', checkOpinion: '' }
]

// ===== 接口上报日志（E12，PES-R07 幂等/失败原因演示）=====
export const PES_API_LOGS = [
  { id: 'API-2601', apiBatchNo: 'IFB-20261108-001', sourceSystem: '皖农资宝', version: 'v1.2', total: 120, success: 117, failed: 3, time: '2026-11-08 03:00', status: '部分失败', items: [{ serial: 'SN-00101', code: 'OK' }, { serial: 'SN-00102', code: 'BATCH_NOT_FOUND', msg: '批次不存在' }, { serial: 'SN-00103', code: 'OK' }, { serial: 'SN-00104', code: 'DUPLICATE', msg: '流水号重复，幂等跳过' }, { serial: 'SN-00105', code: 'QTY_INVALID', msg: '数量非法' }] },
  { id: 'API-2602', apiBatchNo: 'IFB-20261109-001', sourceSystem: '农资通ERP', version: 'v1.0', total: 86, success: 86, failed: 0, time: '2026-11-09 03:00', status: '成功', items: [{ serial: 'SN-00201', code: 'OK' }, { serial: 'SN-00202', code: 'OK' }] }
]

// ===== 知识库/资讯内容（公众服务内容池：省级管理员在后台"内容发布"维护，发布后皖企通/公众端可见）=====
// status: draft 草稿 / published 已发布 / paused 已下架
export const PES_KB = [
  { id: 'KB-001', category: '法规政策', title: '《农药管理条例》经营许可要点解读', date: '2026-08-12', source: '安徽省农业农村厅', views: 1520, status: 'published', publishTime: '2026-08-12 10:00', content: ['农药经营者应当取得农药经营许可证，在许可范围内开展经营活动。', '经营限制使用农药的，应当实行专柜销售、实名购买、台账记录，并配备相应的安全防护设施。', '采购农药时应当查验产品包装、标签、质量检验合格证以及有关许可证明文件，建立采购台账。', '违反台账管理规定的，由主管部门责令改正；情节严重的，依法吊销农药经营许可证。'] },
  { id: 'KB-002', category: '科学用药', title: '小麦赤霉病防治科学用药指南', date: '2026-03-20', source: '省植保总站', views: 2310, status: 'published', publishTime: '2026-03-20 09:30', content: ['小麦赤霉病防治关键在于抽穗扬花期主动预防，坚持"见花打药"。', '推荐选用戊唑醇、氰烯菌酯等对路药剂，注意轮换用药以延缓抗药性。', '采用自走式喷杆喷雾机或无人机统防统治，保证亩用水量，提高防治效果。', '施药后 4 小时内遇降雨应及时补治；严禁使用高毒高风险农药。'] },
  { id: 'KB-003', category: '科学用药', title: '农药限量使用目录与安全间隔期', date: '2026-05-06', source: '农业农村部', views: 1890, status: 'published', publishTime: '2026-05-06 14:00', content: ['限制使用农药应当在标签标注限制使用范围，经营者不得向不具备条件的购买者出售。', '严格按照标签标注的安全间隔期施药，间隔期内不得采收。', '布鲁辛、敌敌畏等高毒农药不得用于蔬菜、果树、茶叶、中草药材上。'] },
  { id: 'KB-004', category: '废弃物回收', title: '农药包装废弃物回收处置流程', date: '2026-09-01', source: '省农业农村厅', views: 980, status: 'published', publishTime: '2026-09-01 11:20', content: ['农药使用者应当交回农药包装废弃物，交由回收站点统一贮存、运输、处置。', '回收站点应当建立回收台账，如实记录回收数量、去向等信息，凭证号唯一可查。', '运输过程应当采取防遗撒、防渗漏措施；处置优先采用资源化利用或无害化焚烧。'] },
  { id: 'KB-005', category: '真伪鉴别', title: '三步辨别农药真伪：查证号、看标签、扫追溯码', date: '2026-10-15', source: '省农药管理站', views: 3450, status: 'published', publishTime: '2026-10-15 15:00', content: ['第一步查证号：在国家农药登记数据中核对登记证号（PD 开头）是否有效。', '第二步看标签：正规产品标签含产品名称、含量、剂型、毒性标识、生产日期、保质期。', '第三步扫追溯码：通过包装上的追溯二维码扫码查询批次流向，核对生产企业与批次号。', '发现假冒伪劣产品请拨打 12316 投诉举报。'] },
  { id: 'KB-006', category: '法规政策', title: '农药台账管理专项检查通报（第 3 期）', date: '2026-11-10', source: '省农业农村厅', views: 0, status: 'draft', publishTime: '', content: ['本期专项检查覆盖全省 16 个地市 89 个县区，重点核查生产、经营台账完整性。', '检查发现部分经营主体存在出库未记录购买方信息、超范围经营限制使用农药等问题。', '被通报主体应于 15 个工作日内完成整改并提交书面报告。'] }
]

// ===== 知识库分类 =====
export const PES_KB_CATEGORIES = ['法规政策', '科学用药', '废弃物回收', '真伪鉴别']

// ===== 生产月度统计（演示）=====
export const PES_MONTHLY_STATS = [
  { month: '2026-04', output: 820, sales: 780, salesAmount: 2350, export: 120 },
  { month: '2026-05', output: 910, sales: 860, salesAmount: 2610, export: 150 },
  { month: '2026-06', output: 780, sales: 800, salesAmount: 2420, export: 90 },
  { month: '2026-07', output: 850, sales: 820, salesAmount: 2500, export: 110 },
  { month: '2026-08', output: 900, sales: 870, salesAmount: 2680, export: 160 },
  { month: '2026-09', output: 880, sales: 840, salesAmount: 2590, export: 140 }
]
