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

      // 计划编制、任务分解和逐级上报分离
      { title: '种植计划制定', route: '/gpm/plan', icon: 'EditPen', section: '计划编制与下达', roles: ['province', 'city', 'county'] },
      { title: '上报计划', route: '/gpm/plan-report', icon: 'Upload', section: '计划上报与审核', roles: ['city', 'county'] },
      { title: '上报计划审核', route: '/gpm/audit', icon: 'Stamp', section: '计划上报与审核', roles: ['province', 'city', 'county'] },
      { title: '作物维护', route: '/gpm/crops', icon: 'Collection', section: '基础数据', roles: ['province'] },

      // 计划落实与调度：落实 → 进度 → 监督 → 排名
      { title: '播种进度调度', route: '/gpm/progress', icon: 'DataLine', section: '计划落实与调度', roles: ['province', 'city', 'county'] },
      { title: '收获进度调度', route: '/gpm/harvest-progress', icon: 'TrendCharts', section: '计划落实与调度', roles: ['province', 'city', 'county'] },
      { title: '进度审核', route: '/gpm/progress-audit', icon: 'Stamp', section: '计划落实与调度', roles: ['province', 'city'] },
      { title: '种植统计分析', route: '/gpm/stats', icon: 'DataAnalysis', section: '计划落实与调度', roles: ['province'] },

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
      // 申报备案：种植主体、收储主体分别申报，县级代办与备案审核
      { title: '种植计划申报', route: '/sil/plan', icon: 'EditPen', section: '申报与备案', roles: ['grower', 'county'] },
      { title: '青贮饲料作物收储申报', route: '/sil/storage-declare', icon: 'Tickets', section: '申报与备案', roles: ['storage_subject', 'county'] },
      { title: '受灾作物补充收储上报', route: '/sil/disaster', icon: 'Warning', section: '申报与备案', roles: ['grower', 'county'] },
      { title: '备案审核', route: '/sil/audit', icon: 'Stamp', section: '申报与备案', roles: ['county'] },

      // 备案后监管：一张图、主体核查、生产台账、按图索料
      { title: '种植上图', route: '/sil/map', icon: 'Picture', section: '备案后监管', roles: ['province', 'city', 'county'] },
      { title: '主体信息核查', route: '/sil/subjects', icon: 'User', section: '备案后监管', roles: ['province', 'city', 'county'] },
      { title: '青贮饲料生产台账', route: '/sil/ledger', icon: 'Notebook', section: '备案后监管', roles: ['province', 'city', 'county'] },

      // 基础配置：省级维护收储主体档案
      { title: '收储主体管理', route: '/sil/storage-subjects', icon: 'OfficeBuilding', section: '基础配置', roles: ['province'] },

      // 乡镇只在皖政通使用：一张图查看与主体信息核查
      { title: '青贮一张图与主体核查', route: '/mobile/wzt-silage', icon: 'DataBoard', section: '移动端', roles: ['town'] }
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
      { title: '皖企通·青贮饲料管理', route: '/mobile/wqt-silage', icon: 'Wheat', roles: ['grower', 'storage_subject'], system: 'sil', section: '青贮饲料管理' },
      { title: '皖政通·粮食安全核查', route: '/mobile/wzt-food-safety', icon: 'Position', roles: ['county', 'city', 'province'], system: 'fsr', section: '粮食安全综合监管' },
      { title: '皖政通·粮食计划', route: '/mobile/wzt-gpm', icon: 'DataAnalysis', roles: ['county', 'town'], system: 'gpm', section: '粮食计划管理' },
      { title: '皖企通·主体工作台', route: '/mobile/wanqitong', icon: 'HomeFilled', roles: ['grower', 'storage_subject'], system: 'portal', section: '移动端首页' },
      { title: '皖企通·计划列表', route: '/mobile/plans', icon: 'Tickets', roles: ['grower'], system: 'gpm', section: '种植主体' },
      { title: '皖企通·播种与收获', route: '/mobile/progress', icon: 'DataAnalysis', roles: ['grower'], system: 'gpm', section: '种植主体' },
      { title: '皖企通·预警与政策', route: '/mobile/advisories', icon: 'Bell', roles: ['grower'], system: 'gpm', section: '种植主体' },
      { title: '皖政通·青贮饲料管理', route: '/mobile/wzt-silage', icon: 'Iphone', roles: ['county', 'town'], system: 'sil', section: '青贮饲料管理' },
      { title: '皖事通·随手拍', route: '/mobile/snapshot', icon: 'Camera', roles: ['grower', 'storage_subject'], system: 'fsr', section: '粮食安全综合监管' }
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
