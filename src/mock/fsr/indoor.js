// 内业智能核查 Mock：受控安全环境套合比对批次（演示场景，省级角色承载）
// 对应数据模型 E13；需求 SAF-R03；评审 DEMO-P0-01 缺口补齐
export const INDOOR_BATCHES = [
  {
    id: 'IB-2026-01',
    batchNo: 'NH-2026-001',
    planYear: '2026',
    planDataRef: 'GPM种植计划下达数据 2026年秋种（版本 v2026.10.01）',
    regionScope: '阜阳市（太和县、涡阳县重点）',
    cropScope: '小麦',
    baseLayerVersions: [
      { layerCode: 'gedi', name: '耕地（2024年度）', version: 'v2024.12' },
      { layerCode: 'jbnt', name: '永久基本农田（2024年度）', version: 'v2024.12' },
      { layerCode: 'gbznt', name: '高标准农田（2025年度）', version: 'v2025.06' }
    ],
    ruleParams: '最小图斑面积5亩 / 套合容差2m / 计划落实比对窗口90天（演示规则，待业务确认）',
    suspectCount: 3,
    outputSpots: [
      { spotId: 'SP-IB01-01', regionCode: '341222', regionName: '太和县', center: [115.622, 33.16], areaMu: 85, desc: '计划种植小麦但影像显示无耕种迹象，疑似计划未落实' },
      { spotId: 'SP-IB01-02', regionCode: '341622', regionName: '涡阳县', center: [116.216, 33.493], areaMu: 120, desc: '永久基本农田上疑似种植苗木（非粮化）' },
      { spotId: 'SP-IB01-03', regionCode: '341222', regionName: '太和县', center: [115.701, 33.201], areaMu: 45, desc: '疑似撂荒，连续两季无作物' }
    ],
    verifyStatus: '通过',
    verifier: '孙敏（演示）',
    verifyAt: '2026-10-20 10:30',
    declassifyStatus: '已脱密',
    importStatus: '已导入',
    importFailReason: '',
    status: 'imported',
    demoScenario: 'success',
    operator: '孙敏（演示）',
    logs: [
      { time: '2026-10-22 09:15', action: '导入成功', user: '孙敏（演示）', extra: '生成监管事件 2 条' },
      { time: '2026-10-21 16:00', action: '脱密完成', user: '孙敏（演示）', extra: '坐标脱密处理完成' },
      { time: '2026-10-20 10:30', action: '人工核验通过', user: '孙敏（演示）', extra: '疑似图斑3个进入脱密环节' },
      { time: '2026-10-19 14:00', action: '套合完成', user: '系统（套合引擎演示）', extra: '产出疑似图斑3个，待人工核验' },
      { time: '2026-10-18 09:00', action: '批次创建', user: '孙敏（演示）', extra: '计划年度2026，底图版本 v2024.12 / v2025.06' }
    ]
  },
  {
    id: 'IB-2026-02',
    batchNo: 'NH-2026-002',
    planYear: '2026',
    planDataRef: 'GPM种植计划下达数据 2026年秋种（版本 v2026.10.01）',
    regionScope: '亳州市涡阳县',
    cropScope: '玉米',
    baseLayerVersions: [
      { layerCode: 'gedi', name: '耕地（2024年度）', version: 'v2024.06' },
      { layerCode: 'jbnt', name: '永久基本农田（涉密图层）', version: 'v2024.06-密' }
    ],
    ruleParams: '最小图斑面积10亩 / 套合容差3m（演示规则，待业务确认）',
    suspectCount: 2,
    outputSpots: [
      { spotId: 'SP-IB02-01', regionCode: '341622', regionName: '涡阳县', center: [116.25, 33.52], areaMu: 60, desc: '疑似计划未落实' },
      { spotId: 'SP-IB02-02', regionCode: '341622', regionName: '涡阳县', center: [116.18, 33.45], areaMu: 95, desc: '疑似非粮化' }
    ],
    verifyStatus: '通过',
    verifier: '孙敏（演示）',
    verifyAt: '2026-10-23 11:20',
    declassifyStatus: '待脱密',
    importStatus: '',
    importFailReason: '',
    status: 'verified',
    demoScenario: 'declassify_fail',
    operator: '',
    logs: [
      { time: '2026-10-23 11:20', action: '人工核验通过', user: '孙敏（演示）', extra: '疑似图斑2个进入脱密环节' },
      { time: '2026-10-22 15:00', action: '套合完成', user: '系统（套合引擎演示）', extra: '产出疑似图斑2个' },
      { time: '2026-10-22 10:00', action: '批次创建', user: '孙敏（演示）', extra: '含涉密底图图层，脱密要求高' }
    ]
  },
  {
    id: 'IB-2026-03',
    batchNo: 'NH-2026-003',
    planYear: '2026',
    planDataRef: 'GPM种植计划下达数据 2026年秋种（版本 v2026.09.20）',
    regionScope: '合肥市肥西县',
    cropScope: '水稻',
    baseLayerVersions: [
      { layerCode: 'gedi', name: '耕地（2024年度）', version: 'v2024.12' },
      { layerCode: 'gbznt', name: '高标准农田（2025年度）', version: 'v2025.06' }
    ],
    ruleParams: '最小图斑面积5亩 / 套合容差2m（演示规则，待业务确认）',
    suspectCount: 1,
    outputSpots: [
      { spotId: 'SP-IB03-01', regionCode: '340123', regionName: '肥西县', center: [116.854, 31.708], areaMu: 70, desc: '疑似计划未落实' }
    ],
    verifyStatus: '通过',
    verifier: '孙敏（演示）',
    verifyAt: '2026-10-25 09:40',
    declassifyStatus: '已脱密',
    importStatus: '失败',
    importFailReason: '',
    status: 'import_failed',
    demoScenario: 'import_fail',
    operator: '孙敏（演示）',
    logs: [
      { time: '2026-10-25 14:00', action: '导入失败', user: '孙敏（演示）', extra: '接口超时：省平台交换服务无响应（演示场景）' },
      { time: '2026-10-25 11:00', action: '脱密完成', user: '孙敏（演示）' },
      { time: '2026-10-25 09:40', action: '人工核验通过', user: '孙敏（演示）' },
      { time: '2026-10-24 16:00', action: '套合完成', user: '系统（套合引擎演示）', extra: '产出疑似图斑1个' }
    ]
  },
  {
    id: 'IB-2026-04',
    batchNo: 'NH-2026-001',
    planYear: '2026',
    planDataRef: 'GPM种植计划下达数据 2026年秋种（版本 v2026.10.01）',
    regionScope: '阜阳市（太和县、涡阳县重点）',
    cropScope: '小麦',
    baseLayerVersions: [
      { layerCode: 'gedi', name: '耕地（2024年度）', version: 'v2024.12' }
    ],
    ruleParams: '与批次 NH-2026-001 相同（演示重复导入场景）',
    suspectCount: 3,
    outputSpots: [
      { spotId: 'SP-IB04-01', regionCode: '341222', regionName: '太和县', center: [115.622, 33.16], areaMu: 85, desc: '与批次001重复的疑似图斑' }
    ],
    verifyStatus: '通过',
    verifier: '孙敏（演示）',
    verifyAt: '2026-10-26 10:00',
    declassifyStatus: '已脱密',
    importStatus: '重复导入',
    importFailReason: '',
    status: 'import_duplicated',
    demoScenario: 'import_duplicated',
    operator: '孙敏（演示）',
    logs: [
      { time: '2026-10-26 10:30', action: '重复导入拦截', user: '孙敏（演示）', extra: '检测到同批次号已导入，幂等拦截，未重复创建事件（演示场景）' },
      { time: '2026-10-26 10:10', action: '脱密完成', user: '孙敏（演示）' },
      { time: '2026-10-26 10:00', action: '人工核验通过', user: '孙敏（演示）' }
    ]
  },
  {
    id: 'IB-2026-05',
    batchNo: 'NH-2026-004',
    planYear: '2026',
    planDataRef: 'GPM种植计划下达数据 2026年秋种（版本 v2026.11.01）',
    regionScope: '宿州市埇桥区',
    cropScope: '小麦',
    baseLayerVersions: [
      { layerCode: 'gedi', name: '耕地（2024年度）', version: 'v2024.12' },
      { layerCode: 'jbnt', name: '永久基本农田（2024年度）', version: 'v2024.12' }
    ],
    ruleParams: '最小图斑面积5亩 / 套合容差2m（演示规则，待业务确认）',
    suspectCount: 2,
    outputSpots: [
      { spotId: 'SP-IB05-01', regionCode: '341302', regionName: '埇桥区', center: [117.02, 33.63], areaMu: 110, desc: '计划种植小麦但影像显示无耕种迹象，疑似计划未落实' },
      { spotId: 'SP-IB05-02', regionCode: '341302', regionName: '埇桥区', center: [117.08, 33.58], areaMu: 55, desc: '疑似非粮化，影像显示连片苗木' }
    ],
    verifyStatus: '待核验',
    verifier: '',
    verifyAt: '',
    declassifyStatus: '待脱密',
    importStatus: '',
    importFailReason: '',
    status: 'fused',
    demoScenario: 'success',
    operator: '',
    logs: [
      { time: '2026-11-10 15:00', action: '套合完成', user: '系统（套合引擎演示）', extra: '产出疑似图斑2个，待人工核验' },
      { time: '2026-11-10 09:00', action: '批次创建', user: '孙敏（演示）', extra: '计划年度2026，底图版本 v2024.12' }
    ]
  }
]
