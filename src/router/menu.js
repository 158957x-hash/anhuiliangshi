// 菜单配置：与路由 meta 对应，侧栏 = 菜单 ∩ 当前角色
// 每个子系统独立后台，仅保留本系统相关功能；门户工作台展示跨系统导航
import { useUserStore } from '@/stores/user'

export const MENU_CONFIG = [
  {
    title: '粮食计划管理',
    icon: 'DataAnalysis',
    system: 'gpm',
    children: [
      // 基础数据：主体档案与地块台账分开管理
      { title: '种植主体管理', route: '/gpm/subjects', icon: 'OfficeBuilding', section: '基础数据', roles: ['province'] },
      { title: '地块管理', route: '/gpm/plots', icon: 'Grid', section: '基础数据', roles: ['province'] },

      // 计划编制与下达：制定 → 审核 → 下达
      { title: '种植计划制定', route: '/gpm/plan', icon: 'EditPen', section: '计划编制与下达', roles: ['province', 'city', 'county'] },
      { title: '种植计划审核', route: '/gpm/audit', icon: 'Stamp', section: '计划编制与下达', roles: ['province', 'city'] },
      { title: '种植计划下达', route: '/gpm/decompose', icon: 'Share', section: '计划编制与下达', roles: ['province', 'city', 'county', 'grower'] },

      // 计划落实与调度：落实 → 进度 → 监督 → 排名
      { title: '播种进度调度', route: '/gpm/progress', icon: 'DataLine', section: '计划落实与调度', roles: ['province', 'city', 'county'] },
      { title: '收获进度调度', route: '/gpm/harvest-progress', icon: 'TrendCharts', section: '计划落实与调度', roles: ['province', 'city', 'county'] },
      { title: '种植统计分析', route: '/gpm/supervise', icon: 'DataAnalysis', section: '计划落实与调度', roles: ['province'] },

      // 服务保障
      { title: '惠农政策', route: '/gpm/policy', icon: 'Reading', section: '服务保障' },
      { title: '气象预警', route: '/gpm/disaster', icon: 'Umbrella', section: '服务保障' },
      { title: '灾情档案', route: '/gpm/disaster-archive', icon: 'Document', section: '服务保障' },

      // 统计分析与一张图
    ]
  },
  {
    title: '青贮饲料管理',
    icon: 'Wheat',
    system: 'sil',
    children: [
      { title: '种植主体列表', route: '/sil/growers', icon: 'User', roles: ['province'] },
      { title: '种植地块列表', route: '/sil/plots', icon: 'Grid', roles: ['province'] },
      { title: '收储主体维护', route: '/sil/storage-subjects', icon: 'OfficeBuilding', roles: ['province', 'county'] },
      { title: '青贮饲料作物收储申报', route: '/sil/declare', icon: 'Tickets', roles: ['province', 'city', 'county', 'grower', 'storage_subject'] },
      { title: '受灾作物补充收储上报', route: '/sil/supplement', icon: 'Warning', roles: ['county', 'grower', 'storage_subject'] },
      { title: '青贮作物收储', route: '/sil/audit', icon: 'Stamp', roles: ['province', 'city', 'county'] },
      { title: '种植上图·数字围栏', route: '/sil/fence', icon: 'Grid' },
      { title: '收储台账', route: '/sil/ledger', icon: 'Notebook' },
      { title: '青贮饲料一张图', route: '/onemap/silage', icon: 'Picture' }
    ]
  },
  {
    title: '粮食安全综合监管',
    icon: 'Warning',
    system: 'fsr',
    children: [
      { title: '长势对比库', route: '/fsr/stats', icon: 'PieChart', roles: ['province', 'city'] },
      { title: '变化图斑库', route: '/fsr/events', icon: 'MessageBox' },
      { title: '任务流程库', route: '/fsr/task', icon: 'Position' },
      { title: '内业智能核查', route: '/fsr/indoor', icon: 'Monitor', roles: ['province'], note: '内业安全环境演示' },
      { title: '事件简报与排名', route: '/fsr/reports', icon: 'Document', roles: ['province', 'city'] },
      { title: '业务配置', route: '/fsr/config', icon: 'Setting', roles: ['province'] },
      { title: '粮食安全监测一张图', route: '/onemap/safety', icon: 'DataBoard' }
    ]
  },
  {
    title: '农药数字监督管理',
    icon: 'Aim',
    system: 'pes',
    children: [
      { title: '主体档案', route: '/pes/subjects', icon: 'OfficeBuilding' },
      { title: '主体确认', route: '/pes/confirm', icon: 'CircleCheck' },
      { title: '产品与批次库', route: '/pes/products', icon: 'Box' },
      { title: '生产台账', route: '/pes/produce-ledger', icon: 'Notebook', roles: ['province', 'city', 'county', 'pes_producer'] },
      { title: '经营台账', route: '/pes/trade-ledger', icon: 'DocumentCopy', roles: ['province', 'city', 'county', 'pes_operator'] },
      { title: '使用记录', route: '/pes/usage', icon: 'SetUp', roles: ['province', 'city', 'county'] },
      { title: '流向追溯', route: '/pes/trace', icon: 'Connection' },
      { title: '包装废弃物回收', route: '/pes/recycle', icon: 'Delete', roles: ['province', 'city', 'county', 'pes_recycler'] },
      { title: '统计报表', route: '/pes/stats', icon: 'TrendCharts', roles: ['province', 'city', 'county'] },
      { title: '3D监管驾驶舱', route: '/pes/cockpit', icon: 'Monitor', roles: ['province', 'city', 'county'] },
      { title: '公众服务', route: '/pes/public', icon: 'Search' },
      { title: '内容发布', route: '/pes/publish', icon: 'Promotion', roles: ['province'] },
      { title: '皖企通移动端演示', route: '/pes/mobile', icon: 'Iphone' },
      { title: '农药监管一张图', route: '/onemap/pesticide', icon: 'View' }
    ]
  },
  {
    title: '移动端演示',
    icon: 'Iphone',
    system: 'mobile',
    children: [
      { title: '皖企通首页', route: '/mobile/wanqitong', icon: 'HomeFilled', roles: ['grower', 'storage_subject'] },
      { title: '皖政通·计划管理任务', route: '/mobile/check/list', icon: 'Iphone', roles: ['county'] },
      { title: '皖政通·粮食安全核查', route: '/mobile/wzt-food-safety', icon: 'Position', roles: ['county', 'province'] },
      { title: '皖企通·主体填报', route: '/mobile/declare', icon: 'Tickets', roles: ['grower', 'storage_subject'] },
      { title: '皖事通·随手拍', route: '/mobile/snapshot', icon: 'Camera', roles: ['grower', 'storage_subject'] }
    ]
  }
]

// 按角色过滤菜单
export function getMenusForRole() {
  const userStore = useUserStore()
  return MENU_CONFIG.map((group) => {
    if (!group.children) {
      return userStore.hasRole(group.roles) ? group : null
    }
    const children = group.children.filter((c) => userStore.hasRole(c.roles))
    return children.length ? { ...group, children } : null
  }).filter(Boolean)
}

// 按子系统获取菜单（独立后台仅展示本系统功能）
export function getMenusForSystem(system) {
  const userStore = useUserStore()
  const group = MENU_CONFIG.find((g) => g.system === system)
  if (!group || !group.children) return []
  const children = group.children.filter((c) => userStore.hasRole(c.roles))
  return children.length ? [{ ...group, children }] : []
}

// 根据路由判断当前所在子系统（一张图按业务归属返回对应系统）
export function getSystemForRoute(path) {
  for (const group of MENU_CONFIG) {
    if (group.route === path) return group.system
    if (group.children?.some((c) => c.route === path)) return group.system
  }
  if (path.startsWith('/gpm/')) return 'gpm'
  if (path.startsWith('/sil/')) return 'sil'
  if (path.startsWith('/fsr/')) return 'fsr'
  if (path.startsWith('/pes/')) return 'pes'
  if (path.startsWith('/onemap/silage')) return 'sil'
  if (path.startsWith('/onemap/safety')) return 'fsr'
  if (path.startsWith('/onemap/pesticide')) return 'pes'
  if (path.startsWith('/mobile/')) return 'mobile'
  return 'gpm'
}

// 子系统显示名称（供头部标识等使用）
export const SYSTEM_NAMES = {
  gpm: '粮食计划管理系统',
  sil: '青贮饲料管理系统',
  fsr: '粮食安全综合监管系统',
  pes: '农药数字监督管理系统'
}
