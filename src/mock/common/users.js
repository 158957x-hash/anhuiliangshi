// 演示角色：业务角色与主体类型、登录端入口分离，避免同一业务身份重复展示。
export const DEMO_ROLES = [
  { code: 'province', name: '张明', unit: '安徽省农业农村厅', roleName: '省级管理人员', regionCode: '340000', regionName: '安徽省', subjectId: null, homeRoute: '/entry', avatarColor: '#b03a3a', channel: '后台' },
  { code: 'city', name: '李强', unit: '阜阳市农业农村局', roleName: '市级管理人员', regionCode: '341200', regionName: '阜阳市', subjectId: null, homeRoute: '/entry', avatarColor: '#8a6d3b', channel: '后台' },
  { code: 'county', name: '王芳', unit: '太和县农业农村局', roleName: '县级农业农村部门用户', regionCode: '341222', regionName: '太和县', subjectId: null, homeRoute: '/entry', avatarColor: '#0f5eb5', channel: '后台/皖政通', canAgent: true, canAudit: true },
  { code: 'grower', name: '陈勇', unit: '太和县丰乐种植专业合作社', roleName: '种植主体', subjectType: '合作社', regionCode: '341222', regionName: '太和县', subjectId: 'SUB-0001', homeRoute: '/mobile/wanqitong', avatarColor: '#6a4fa3', channel: '皖企通' },
  { code: 'storage_subject', name: '周牧', unit: '太和县牧业发展有限公司', roleName: '收储主体', subjectType: '养殖企业', storageSubjectId: 'STO-001', regionCode: '341222', regionName: '太和县', homeRoute: '/mobile/wanqitong', avatarColor: '#2f8f83', channel: '皖企通' },
  { code: 'pes_producer', name: '陈新华', unit: '安徽华星化工有限公司', roleName: '生产企业', subjectId: 'PES-P-0001', regionCode: '340123', regionName: '合肥市', homeRoute: '/entry', avatarColor: '#1e6b52', channel: '后台' },
  { code: 'pes_operator', name: '刘敏', unit: '太和县皖丰农资经营部', roleName: '经营企业', subjectId: 'PES-S-0012', regionCode: '341222', regionName: '太和县', homeRoute: '/entry', avatarColor: '#c2571a', channel: '后台' },
  { code: 'pes_recycler', name: '钱进', unit: '阜阳农资包装回收站', roleName: '回收主体', subjectId: 'PES-R-0002', regionCode: '341202', regionName: '阜阳市', homeRoute: '/entry', avatarColor: '#7e57c2', channel: '后台' }
]

export const ROLE_SYSTEM_GROUPS = [
  { code: 'gpm', name: '粮食计划管理系统', roles: ['province', 'city', 'county', 'grower'] },
  { code: 'sil', name: '青贮饲料管理系统', roles: ['province', 'city', 'county', 'grower', 'storage_subject'] },
  // fsr 含 grower：种植主体演示账号模拟社会公众，经皖事通随手拍上报粮食安全线索（可研 5.5.3.9.3：随手拍为皖事通专属社会监督应用）
  { code: 'fsr', name: '粮食安全综合监管系统', roles: ['province', 'city', 'county', 'grower'] },
  { code: 'pes', name: '农药数字监督管理系统', roles: ['province', 'city', 'county', 'pes_producer', 'pes_operator', 'pes_recycler'] }
].map((group) => ({ ...group, roleList: group.roles.map((code) => DEMO_ROLES.find((role) => role.code === code)).filter(Boolean) }))

export const findRole = (code) => DEMO_ROLES.find((r) => r.code === code)
