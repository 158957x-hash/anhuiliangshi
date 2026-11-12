// 事件简报与地市排名 Mock（演示口径，页面标注"演示规则，待业务确认"）
// 对应数据模型 E16/E17；需求 SAF-R09；评审 DEMO-P1-04 缺口补齐
export const EVENT_REPORTS = [
  {
    reportNo: 'RPT-2026-0004',
    eventId: 'EVT-2026-0002',
    eventCode: 'FSR-2026-0002',
    title: '太和县绿源家庭农场疑似毁麦收贮事件简报',
    statVersion: '演示口径 v1.0（待业务确认）',
    generatedAt: '2026-07-25 16:00',
    summary: '事件于2026-05-20接入，经现场核查属实，责任单位限期整改并复耕，2026-07-25复核通过结案。全流程15个环节留痕，处置用时66天。',
    fields: ['事件编号', '事件类型', '发现时间', '核查结论', '整改情况', '复核结论', '结案编号', '处置用时']
  },
  {
    reportNo: 'RPT-2026-0003',
    eventId: 'EVT-2026-0001',
    eventCode: 'FSR-2026-0001',
    title: '长丰县耕地疑似建养殖设施事件简报',
    statVersion: '演示口径 v1.0（待业务确认）',
    generatedAt: '2026-07-25 16:00',
    summary: '事件于2026-06-12接入，经现场核查属实，涉事设施已拆除复耕，2026-07-25复核通过结案。',
    fields: ['事件编号', '事件类型', '发现时间', '核查结论', '整改情况', '复核结论', '结案编号', '处置用时']
  },
  {
    reportNo: 'RPT-2026-0002',
    eventId: 'EVT-2026-0015',
    eventCode: 'FSR-2026-0015',
    title: '太和县旧县镇疑似撂荒（轮作休耕）事件简报',
    statVersion: '演示口径 v1.0（待业务确认）',
    generatedAt: '2026-07-25 16:00',
    summary: '经现场核查该地块为轮作休耕，事件不属实，予以销案归档。',
    fields: ['事件编号', '事件类型', '发现时间', '核查结论', '销案依据', '结案编号', '处置用时']
  }
]

// 地市排名（演示口径）：metric → rows
export const CITY_RANK = {
  total: {
    rows: [
      { rank: 1, city: '阜阳市', total: 8, closed: 3, closeRate: '37.5%', avgDays: 58 },
      { rank: 2, city: '亳州市', total: 6, closed: 2, closeRate: '33.3%', avgDays: 61 },
      { rank: 3, city: '合肥市', total: 5, closed: 2, closeRate: '40.0%', avgDays: 49 },
      { rank: 4, city: '蚌埠市', total: 3, closed: 1, closeRate: '33.3%', avgDays: 55 },
      { rank: 5, city: '宿州市', total: 2, closed: 1, closeRate: '50.0%', avgDays: 47 },
      { rank: 6, city: '淮南市', total: 1, closed: 0, closeRate: '0%', avgDays: '—' }
    ]
  },
  closeRate: {
    rows: [
      { rank: 1, city: '宿州市', total: 2, closed: 1, closeRate: '50.0%', avgDays: 47 },
      { rank: 2, city: '合肥市', total: 5, closed: 2, closeRate: '40.0%', avgDays: 49 },
      { rank: 3, city: '阜阳市', total: 8, closed: 3, closeRate: '37.5%', avgDays: 58 },
      { rank: 4, city: '亳州市', total: 6, closed: 2, closeRate: '33.3%', avgDays: 61 },
      { rank: 5, city: '蚌埠市', total: 3, closed: 1, closeRate: '33.3%', avgDays: 55 },
      { rank: 6, city: '淮南市', total: 1, closed: 0, closeRate: '0%', avgDays: '—' }
    ]
  },
  avgDays: {
    rows: [
      { rank: 1, city: '宿州市', total: 2, closed: 1, closeRate: '50.0%', avgDays: 47 },
      { rank: 2, city: '淮南市', total: 1, closed: 0, closeRate: '0%', avgDays: '—' },
      { rank: 3, city: '蚌埠市', total: 3, closed: 1, closeRate: '33.3%', avgDays: 55 },
      { rank: 4, city: '合肥市', total: 5, closed: 2, closeRate: '40.0%', avgDays: 49 },
      { rank: 5, city: '阜阳市', total: 8, closed: 3, closeRate: '37.5%', avgDays: 58 },
      { rank: 6, city: '亳州市', total: 6, closed: 2, closeRate: '33.3%', avgDays: 61 }
    ]
  }
}
