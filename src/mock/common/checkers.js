// 核查人员目录（属地核查责任人，派发时按事件区域自动匹配）
// 层级：county=县级农业农村部门 / town=乡镇农业综合服务站 / grid=村级网格核查员
export const CHECKERS = [
  { id: 'CK-001', name: '刘建国', unit: '太和县农业农村局', duty: '耕地保护股股长', level: 'county', regionCode: '341222', regionName: '太和县', phone: '139****2001', recommended: true },
  { id: 'CK-002', name: '赵四化', unit: '太和县旧县镇农业综合服务站', duty: '站长', level: 'town', regionCode: '341222', regionName: '太和县', phone: '139****2002' },
  { id: 'CK-003', name: '钱守粮', unit: '太和县大新镇农业综合服务站', duty: '网格核查员', level: 'grid', regionCode: '341222', regionName: '太和县', phone: '139****2003' },
  { id: 'CK-004', name: '孙保田', unit: '涡阳县农业农村局', duty: '耕地保护股股长', level: 'county', regionCode: '341622', regionName: '涡阳县', phone: '139****2004', recommended: true },
  { id: 'CK-005', name: '周护地', unit: '涡阳县义门镇农业综合服务站', duty: '网格核查员', level: 'grid', regionCode: '341622', regionName: '涡阳县', phone: '139****2005' },
  { id: 'CK-006', name: '吴卫耕', unit: '蒙城县农业农村局', duty: '耕保与质量股股长', level: 'county', regionCode: '341623', regionName: '蒙城县', phone: '139****2006', recommended: true }
]

export const CHECKER_LEVEL_NAMES = { county: '县级', town: '乡镇级', grid: '网格员' }
