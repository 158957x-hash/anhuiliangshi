<template>
  <WztShell>
    <div class="entry-scroll">
      <!-- 面包屑 + 页签 -->
      <div class="crumb">首页 <span>/</span> 应用超市</div>
      <div class="tabbar">
        <div class="tab active">首页</div>
        <div class="tab" @click="onMyTab">我的</div>
        <el-input v-model="keyword" class="tab-search" placeholder="请搜索" clearable>
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </div>

      <!-- 粮食安全栏目：四大业务系统 -->
      <section v-if="filteredSystems.length">
        <div class="cat-title">粮食安全<span class="cat-count">{{ filteredSystems.length }} 个系统</span></div>
        <div class="app-grid">
          <div
            v-for="s in filteredSystems"
            :key="s.group"
            class="app-item"
            :class="{ disabled: !s.available }"
            @click="enter(s)"
          >
            <div class="app-icon" :style="{ background: s.color }">
              <el-icon :size="26"><component :is="s.icon" /></el-icon>
            </div>
            <div class="app-name" :title="s.name">{{ s.name }}</div>
          </div>
        </div>
      </section>

      <el-empty v-if="keyword && searchEmpty" description="未找到匹配的应用" :image-size="80" />

      <footer class="foot">演示原型 · 数据为模拟数据 · 皖政通风格应用超市 · 各系统独立后台建设中</footer>
    </div>

    <!-- C-11 企业主体确认引导：未确认主体进入工作台时弹出 -->
    <el-dialog v-model="guideVisible" title="主体信息确认提醒（C-11）" width="480px" :close-on-click-modal="false">
      <el-alert type="warning" show-icon :closable="false"
        title="您所在的主体信息尚未确认" style="margin-bottom: 14px" />
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="主体名称">{{ userStore.role?.unit }}</el-descriptions-item>
        <el-descriptions-item label="您的角色">{{ userStore.role?.roleName }}</el-descriptions-item>
        <el-descriptions-item label="影响范围">确认主体信息前，生产/经营台账无法新增与提交</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="guideVisible = false">稍后处理</el-button>
        <el-button type="primary" @click="goConfirm">立即去确认</el-button>
      </template>
    </el-dialog>
  </WztShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import WztShell from '@/components/layout/WztShell.vue'
import { useUserStore } from '@/stores/user'
import { getMenusForRole } from '@/router/menu'
import { fetchConfirms } from '@/api/pes'

const router = useRouter()
const userStore = useUserStore()
const keyword = ref('')
const guideVisible = ref(false)

// 菜单按当前角色过滤，入口页自动只显示可访问的功能
const menus = computed(() => getMenusForRole())
const groupByTitle = (title) => menus.value.find((g) => g.title === title)

// 四大业务系统定义：group 与侧栏菜单分组一致
const SYSTEM_DEFS = [
  { group: '粮食计划管理', name: '粮食计划管理系统', icon: 'DataAnalysis', color: '#1668DC' },
  { group: '青贮饲料管理', name: '青贮饲料管理系统', icon: 'Wheat', color: '#26a69a' },
  { group: '粮食安全综合监管', name: '粮食安全综合监管系统', icon: 'Warning', color: '#e64545' },
  { group: '农药数字监督管理', name: '农药数字监督管理系统', icon: 'Aim', color: '#c2571a' }
]
const systems = computed(() => SYSTEM_DEFS.map((def) => {
  const children = groupByTitle(def.group)?.children || []
  return { ...def, features: children.map((c) => c.title), entry: children[0]?.route, available: children.length > 0 }
}))

// 搜索：按名称/功能过滤系统应用
const matchKeyword = (item) => {
  const kw = keyword.value.trim()
  if (!kw) return true
  return `${item.name}${item.features.join('')}`.includes(kw)
}
const filteredSystems = computed(() => systems.value.filter(matchKeyword))
const searchEmpty = computed(() => !filteredSystems.value.length)

const onMyTab = () => ElMessage.info('「我的」为皖政通端演示入口，暂未接入')

const enter = (s) => { if (s.entry) router.push(s.entry) }

const goConfirm = () => {
  guideVisible.value = false
  router.push('/pes/confirm')
}

// C-11：企业角色进入应用超市时检查本主体确认状态，未确认弹引导
onMounted(async () => {
  const r = userStore.role
  if (!r?.subjectId || !['pes_producer', 'pes_operator', 'pes_recycler'].includes(r.code)) return
  const cs = await fetchConfirms(r)
  if (!cs.some((c) => c.subjectId === r.subjectId && c.status === '已确认')) guideVisible.value = true
})
</script>

<style lang="scss" scoped>
$accent: #1668DC;

.entry-scroll {
  flex: 1;
  overflow: auto;
  padding: 14px 22px 6px;
}

.crumb {
  font-size: 12px;
  color: #8598b3;
  margin-bottom: 8px;

  span { margin: 0 4px; }
}

/* 页签行 */
.tabbar {
  display: flex;
  align-items: center;
  gap: 26px;
  border-bottom: 1px solid #e8edf3;
  padding: 2px 2px 0;
}

.tab {
  position: relative;
  font-size: 14px;
  color: #5a6d85;
  padding: 8px 2px 10px;
  cursor: pointer;

  &.active {
    color: $accent;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2.5px;
      border-radius: 2px;
      background: $accent;
    }
  }
}

.tab-search {
  margin-left: auto;
  width: 220px;
  margin-bottom: 8px;

  :deep(.el-input__wrapper) { border-radius: 15px; background: #fff; box-shadow: 0 0 0 1px #dde4ee inset; }
}

/* 栏目标题 */
.cat-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
  margin: 24px 0 14px;

  .cat-count { font-size: 12px; font-weight: 400; color: #8598b3; }
}

/* 应用宫格 */
.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(106px, 1fr));
  gap: 18px 14px;
}

.app-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 8px 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s;

  &:hover { background: #fff; box-shadow: 0 4px 14px rgba(16, 49, 95, 0.1); transform: translateY(-2px); }
  &.disabled { opacity: 0.5; cursor: not-allowed; &:hover { transform: none; box-shadow: none; } }
}

.app-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 3px 8px rgba(16, 49, 95, 0.16);
}

.app-name {
  font-size: 13px;
  color: #1f2d3d;
  text-align: center;
  line-height: 1.35;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.foot {
  text-align: center;
  color: #8598b3;
  font-size: 12px;
  padding: 30px 0 16px;
}

@media (max-width: 860px) {
  .tab-search { display: none; }
}
</style>
