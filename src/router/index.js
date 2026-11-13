import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Layout from '@/components/layout/Layout.vue'

// 路由模块：全部静态注册 + meta.roles 过滤菜单
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'),
    meta: { title: '登录' }
  },
  // ===== 统一入口（独立全屏页，不套系统后台布局）=====
  {
    path: '/entry',
    name: 'Entry',
    component: () => import('@/views/entry/Entry.vue'),
    meta: { title: '统一入口' }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/entry',
    children: [
      // ===== 专项一张图 =====
      {
        path: 'onemap',
        meta: { subsystem: 'onemap' },
        children: [
          { path: 'safety', name: 'OnemapSafety', component: () => import('@/views/onemap/SafetyMap.vue'), meta: { title: '粮食安全监测一张图' } },
          { path: 'silage', name: 'OnemapSilage', component: () => import('@/views/onemap/SilageMap.vue'), meta: { title: '青贮饲料一张图' } },
          { path: 'pesticide', name: 'OnemapPesticide', component: () => import('@/views/onemap/PesticideMap.vue'), meta: { title: '农药监管一张图' } },
        ]
      },

      // ===== 粮食计划管理 =====
      {
        path: 'gpm',
        meta: { subsystem: 'gpm' },
        children: [
          { path: 'plan', name: 'GpmPlan', component: () => import('@/views/gpm/PlanMake.vue'), meta: { title: '种植计划制定', roles: ['province', 'city', 'county'] } },
          { path: 'subjects', name: 'GpmSubjects', component: () => import('@/views/gpm/Subjects.vue'), meta: { title: '种植主体管理', roles: ['province'] } },
          { path: 'plots', name: 'GpmPlots', component: () => import('@/views/gpm/Plots.vue'), meta: { title: '地块管理', roles: ['province'] } },
          { path: 'audit', name: 'GpmAudit', component: () => import('@/views/gpm/Audit.vue'), meta: { title: '种植计划审核', roles: ['province', 'city'] } },
          { path: 'supervise', name: 'GpmSupervise', component: () => import('@/views/gpm/Stats.vue'), meta: { title: '种植统计分析', roles: ['province'] } },
          { path: 'decompose', name: 'GpmDecompose', component: () => import('@/views/gpm/PlanDecompose.vue'), meta: { title: '种植计划下达', roles: ['province', 'city', 'county', 'grower'] } },
          { path: 'progress', name: 'GpmProgress', component: () => import('@/views/gpm/Progress.vue'), meta: { title: '播种进度调度', roles: ['province', 'city', 'county'] } },
          { path: 'harvest-progress', name: 'GpmHarvestProgress', component: () => import('@/views/gpm/HarvestProgress.vue'), meta: { title: '收获进度调度', roles: ['province', 'city', 'county'] } },
          { path: 'disaster', name: 'GpmDisaster', component: () => import('@/views/gpm/Disaster.vue'), meta: { title: '气象预警' } },
          { path: 'disaster-archive', name: 'GpmDisasterArchive', component: () => import('@/views/gpm/DisasterArchive.vue'), meta: { title: '灾情档案' } },
          { path: 'policy', name: 'GpmPolicy', component: () => import('@/views/gpm/Policy.vue'), meta: { title: '惠农政策' } }
        ]
      },

      // ===== 青贮饲料管理 =====
      {
        path: 'sil',
        meta: { subsystem: 'sil' },
        children: [
          { path: 'growers', name: 'SilGrowers', component: () => import('@/views/sil/Growers.vue'), meta: { title: '种植主体列表', roles: ['province'] } },
          { path: 'plots', name: 'SilPlots', component: () => import('@/views/sil/Plots.vue'), meta: { title: '种植地块列表', roles: ['province'] } },
          { path: 'storage-subjects', name: 'SilStorageSubjects', component: () => import('@/views/sil/StorageSubjects.vue'), meta: { title: '收储主体维护', roles: ['province', 'county'] } },
          { path: 'declare', name: 'SilDeclare', component: () => import('@/views/sil/DeclareList.vue'), meta: { title: '青贮饲料作物收储申报', roles: ['province', 'city', 'county', 'grower', 'storage_subject'] } },
          { path: 'storage', name: 'SilStorage', component: () => import('@/views/sil/StorageDeclare.vue'), meta: { title: '青贮饲料作物收储申报', roles: ['county', 'grower', 'storage_subject'] } },
          { path: 'supplement', name: 'SilSupplement', component: () => import('@/views/sil/Supplement.vue'), meta: { title: '受灾作物补充收储上报', roles: ['province', 'city', 'county', 'grower', 'storage_subject'] } },
          { path: 'audit', name: 'SilAudit', component: () => import('@/views/sil/AuditList.vue'), meta: { title: '收储审核处理', roles: ['province', 'city', 'county'] } },
          { path: 'fence', name: 'SilFence', component: () => import('@/views/sil/FenceMap.vue'), meta: { title: '种植上图·数字围栏', roles: ['province', 'city', 'county', 'grower', 'storage_subject'] } },
          { path: 'ledger', name: 'SilLedger', component: () => import('@/views/sil/Ledger.vue'), meta: { title: '收储台账', roles: ['province', 'city', 'county', 'grower', 'storage_subject'] } },
          { path: 'audit-config', name: 'SilAuditConfig', component: () => import('@/views/sil/AuditConfig.vue'), meta: { title: '审核流程配置', roles: ['province', 'city', 'county'] } },
          { path: 'crops', name: 'SilCrops', component: () => import('@/views/sil/CropDict.vue'), meta: { title: '作物字典维护', roles: ['province', 'city', 'county'] } }
        ]
      },

      // ===== 粮食安全综合监管 =====
      {
        path: 'fsr',
        meta: { subsystem: 'fsr' },
        children: [
          { path: 'stats', name: 'FsrStats', component: () => import('@/views/fsr/ReviewStats.vue'), meta: { title: '长势对比库', roles: ['province', 'city'] } },
          { path: 'events', name: 'FsrEvents', component: () => import('@/views/fsr/EventCenter.vue'), meta: { title: '变化图斑库' } },
          { path: 'task', name: 'FsrTask', component: () => import('@/views/fsr/TaskDispatch.vue'), meta: { title: '任务流程库' } },
          { path: 'indoor', name: 'FsrIndoor', component: () => import('@/views/fsr/IndoorCheck.vue'), meta: { title: '内业智能核查（安全环境演示）', roles: ['province'] } },
          { path: 'reports', name: 'FsrReports', component: () => import('@/views/fsr/ReportCenter.vue'), meta: { title: '事件简报与排名', roles: ['province', 'city'] } },
          { path: 'config', name: 'FsrConfig', component: () => import('@/views/fsr/BizConfig.vue'), meta: { title: '业务配置', roles: ['province'] } }
        ]
      },

      // ===== 农药数字监督管理 =====
      {
        path: 'pes',
        meta: { subsystem: 'pes' },
        children: [
          { path: 'subjects', name: 'PesSubjects', component: () => import('@/views/pes/SubjectArchives.vue'), meta: { title: '主体档案' } },
          { path: 'confirm', name: 'PesConfirm', component: () => import('@/views/pes/SubjectConfirm.vue'), meta: { title: '主体确认' } },
          { path: 'products', name: 'PesProducts', component: () => import('@/views/pes/ProductCatalog.vue'), meta: { title: '产品与批次库' } },
          { path: 'produce-ledger', name: 'PesProduceLedger', component: () => import('@/views/pes/ProduceLedger.vue'), meta: { title: '生产台账', roles: ['province', 'city', 'county', 'pes_producer'] } },
          { path: 'trade-ledger', name: 'PesTradeLedger', component: () => import('@/views/pes/TradeLedger.vue'), meta: { title: '经营台账', roles: ['province', 'city', 'county', 'pes_operator'] } },
          { path: 'usage', name: 'PesUsage', component: () => import('@/views/pes/UsageRecords.vue'), meta: { title: '使用记录', roles: ['province', 'city', 'county'] } },
          { path: 'trace', name: 'PesTrace', component: () => import('@/views/pes/TraceFlow.vue'), meta: { title: '流向追溯' } },
          { path: 'recycle', name: 'PesRecycle', component: () => import('@/views/pes/Recycle.vue'), meta: { title: '包装废弃物回收', roles: ['province', 'city', 'county', 'pes_recycler'] } },
          { path: 'stats', name: 'PesStats', component: () => import('@/views/pes/Stats.vue'), meta: { title: '统计报表', roles: ['province', 'city', 'county'] } },
          { path: 'cockpit', name: 'PesCockpit', component: () => import('@/views/pes/Cockpit.vue'), meta: { title: '3D监管驾驶舱', roles: ['province', 'city', 'county'] } },
          { path: 'public', name: 'PesPublic', component: () => import('@/views/pes/PublicService.vue'), meta: { title: '公众服务' } },
          { path: 'publish', name: 'PesPublish', component: () => import('@/views/pes/ContentPublish.vue'), meta: { title: '内容发布', roles: ['province'] } },
          {
            path: 'mobile',
            component: () => import('@/components/layout/MobileLayout.vue'),
            meta: { title: '皖企通移动端演示' },
            children: [
              { path: '', name: 'PesMobile', component: () => import('@/views/mobile/WanqitongPesticide.vue'), meta: { title: '皖企通 · 农药服务' } }
            ]
          }
        ]
      },

      { path: '403', name: 'Forbidden', component: () => import('@/views/common/403.vue'), meta: { title: '无权访问' } }
    ]
  },
  // ===== 移动端演示（独立手机壳布局，不走 Layout）=====
  {
    path: '/mobile',
    component: () => import('@/components/layout/MobileLayout.vue'),
    children: [
      { path: 'wanqitong', name: 'MobileWanqitong', component: () => import('@/views/mobile/WanqitongHome.vue'), meta: { title: '皖企通', roles: ['grower', 'storage_subject'] } },
      { path: 'wanzhengtong', name: 'MobileWanzhengtong', component: () => import('@/views/mobile/WanzhengtongHome.vue'), meta: { title: '皖政通', roles: ['county'] } },
      { path: 'wzt-gpm', name: 'MobileWztGpm', component: () => import('@/views/mobile/WanzhengtongGpm.vue'), meta: { title: '皖政通·粮食计划管理', roles: ['county'] } },
      { path: 'wzt-progress', name: 'MobileWztProgress', component: () => import('@/views/mobile/WanzhengtongProgress.vue'), meta: { title: '皖政通·进度填报', roles: ['county'] } },
      { path: 'wzt-policies', name: 'MobileWztPolicies', component: () => import('@/views/mobile/WanzhengtongPolicies.vue'), meta: { title: '皖政通·惠农政策', roles: ['county'] } },
      { path: 'wzt-disaster', name: 'MobileWztDisaster', component: () => import('@/views/mobile/WanzhengtongDisaster.vue'), meta: { title: '皖政通·灾情上报', roles: ['county'] } },
      { path: 'wzt-silage', name: 'MobileWztSilage', component: () => import('@/views/mobile/WanzhengtongSilage.vue'), meta: { title: '皖政通·青贮饲料管理', roles: ['county'] } },
      { path: 'wzt-safety', name: 'MobileWztSafety', component: () => import('@/views/mobile/WanzhengtongSafety.vue'), meta: { title: '皖政通·粮食安全综合监管', roles: ['county'] } },
      { path: 'wzt-food-safety', name: 'MobileWztFoodSafety', component: () => import('@/views/mobile/WanzhengtongFoodSafety.vue'), meta: { title: '皖政通·粮食安全综合监管', roles: ['county', 'city', 'province'] } },
      { path: 'gpm', name: 'MobileGpm', component: () => import('@/views/mobile/GpmMobileHome.vue'), meta: { title: '粮食计划管理' } },
      { path: 'wqt-silage', name: 'MobileWqtSilage', component: () => import('@/views/mobile/WanqitongSilage.vue'), meta: { title: '皖企通·青贮饲料管理', roles: ['grower', 'storage_subject'] } },
      { path: 'plans', name: 'MobilePlans', component: () => import('@/views/mobile/PlanList.vue'), meta: { title: '计划列表', roles: ['grower', 'storage_subject'] } },
      { path: 'progress', name: 'MobileProgress', component: () => import('@/views/mobile/ProgressList.vue'), meta: { title: '播种与收获', roles: ['grower', 'storage_subject'] } },
      { path: 'policies', name: 'MobilePolicies', component: () => import('@/views/mobile/PolicyList.vue'), meta: { title: '惠农政策', roles: ['grower', 'storage_subject'] } },
      { path: 'snapshot', name: 'MobileSnapshot', component: () => import('@/views/mobile/SnapReport.vue'), meta: { title: '皖事通·随手拍', roles: ['grower', 'storage_subject'] } },
      { path: 'check/list', name: 'MobileCheckList', component: () => import('@/views/mobile/CheckTask.vue'), meta: { title: '皖政通·计划管理任务', roles: ['county'] } },
      { path: 'declare', name: 'MobileDeclare', component: () => import('@/views/mobile/DeclareForm.vue'), meta: { title: '皖企通·主体填报', roles: ['grower', 'storage_subject'] } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/entry' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  document.title = to.meta.title ? `${to.meta.title} - 安徽省粮食生产安全监测监管平台` : '安徽省粮食生产安全监测监管平台'

  if (to.path !== '/login' && !userStore.isLoggedIn) {
    return next('/login')
  }
  if (to.path === '/login' && userStore.isLoggedIn) {
    return next('/entry')
  }
  // 角色权限校验
  if (to.meta.roles && !userStore.hasRole(to.meta.roles)) {
    return next('/403')
  }
  next()
})

export default router
