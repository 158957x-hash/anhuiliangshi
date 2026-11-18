<template>
  <div class="mobile-page" role="main" aria-label="皖企通种植主体工作台">
    <div class="brand-card">
      <div class="brand-row"><div><b>种植主体工作台</b><span>皖企通</span></div><el-tag type="success" size="small">{{ userStore.regionName || '属地服务' }}</el-tag></div>
      <p>围绕“看计划 → 报计划 → 填进度”，集中办理种植生产事项</p>
    </div>

    <section class="task-card">
      <div class="section-title"><b>本年度计划任务</b><button @click="$router.push('/mobile/plans')">查看全部 ›</button></div>
      <template v-if="currentTask">
        <div class="task-title"><b>{{ currentTask.planName }}</b><el-tag size="small" type="warning">上级下达</el-tag></div>
        <p class="task-path">{{ currentTask.cityName }} · {{ currentTask.countyName }} · {{ currentTask.townName }}</p>
        <div class="task-metrics"><div><strong>{{ Number(currentTask.taskAreaMu || 0).toLocaleString() }}</strong><span>参考面积（亩）</span></div><div><strong>{{ currentTask.cropType }}</strong><span>计划作物</span></div><div><strong>{{ currentTask.progress || 0 }}%</strong><span>落实进度</span></div></div>
        <el-button type="primary" class="full-button" @click="$router.push('/mobile/plans')">查看计划并上报</el-button>
      </template>
      <el-empty v-else description="暂无本年度计划任务" :image-size="45" />
    </section>

    <section class="work-card">
      <div class="section-title"><b>我的生产工作</b><span class="section-note">按地块维护</span></div>
      <div class="work-grid">
        <button class="work-item plan" @click="$router.push('/mobile/declare')"><i>报</i><strong>上报种植计划</strong><span>选择地块，填写作物和面积</span></button>
        <button class="work-item progress" @click="$router.push('/mobile/progress')"><i>进</i><strong>维护播种/收获</strong><span>记录本次进度和历史记录</span></button>
      </div>
    </section>

    <section class="info-card weather-card">
      <div class="section-title"><b>气象预警</b><button @click="goAdvisories('weather')">{{ alerts.length }} 条 ›</button></div>
      <button v-for="item in alerts.slice(0, 2)" :key="item.id" class="info-row" @click="goAdvisories('weather')"><el-tag size="small" :type="item.level === '红色' ? 'danger' : 'warning'">{{ item.level || '提醒' }}</el-tag><div><b>{{ item.type }} · {{ item.regionName }}</b><p>{{ item.content }}</p></div></button>
      <el-empty v-if="!alerts.length" description="暂无气象预警" :image-size="42" />
    </section>

    <section class="info-card">
      <div class="section-title"><b>惠农政策</b><button @click="goAdvisories('policy')">查看全部 ›</button></div>
      <button v-for="item in policies.slice(0, 2)" :key="item.id" class="policy-row" @click="goAdvisories('policy')"><div><b>{{ item.title }}</b><p>{{ item.summary || item.content }}</p></div><span>›</span></button>
      <el-empty v-if="!policies.length" description="暂无惠农政策" :image-size="42" />
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { fetchPolicies, fetchWeatherAlerts, fetchSubjectPlanTasks } from '@/api/gpm'

const router = useRouter()
const userStore = useUserStore()
const policies = ref([])
const alerts = ref([])
const currentTask = ref(null)

const goAdvisories = (tab) => router.push({ path: '/mobile/advisories', query: { tab } })

onMounted(async () => {
  const [policyRows, weatherRows, taskRows] = await Promise.all([
    fetchPolicies(),
    fetchWeatherAlerts(userStore.role),
    fetchSubjectPlanTasks(userStore.role)
  ])
  policies.value = (policyRows || []).filter(item => item.active !== false && item.status !== '已下线' && item.status !== 'offline' && (!item.status || item.status === '已发布' || item.status === 'published'))
  alerts.value = weatherRows || []
  const currentYearTasks = (taskRows || []).filter(item => Number(item.year) === 2026)
  const order = { '第一季度': 1, '第二季度': 2, '第三季度': 3, '第四季度': 4, '全年': 5 }
  currentTask.value = [...currentYearTasks].sort((a, b) => (order[b.quarter] || 0) - (order[a.quarter] || 0))[0] || null
})
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-width:0;min-height:100%;box-sizing:border-box;background:#f4f7fb;padding:14px;overflow-x:hidden}.brand-card{background:linear-gradient(135deg,#176b58,#249477);color:#fff;border-radius:16px;padding:20px 18px;margin-bottom:12px}.brand-row,.section-title,.task-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.brand-row b{font-size:23px}.brand-row span{opacity:.85;font-size:13px;margin-left:8px}.brand-card p{margin:12px 0 0;font-size:13px;opacity:.9}.task-card,.work-card,.info-card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px}.task-card{border:1px solid #d6eee5;background:#fbfefc}.section-title{color:#243b5a;margin-bottom:12px}.section-title button{border:0;background:none;color:#2d8c72;font-size:12px;cursor:pointer}.section-note{font-size:12px;color:#98a2b3}.task-title b{color:#176b58;font-size:15px}.task-path{margin:6px 0 12px;color:#667085;font-size:12px}.task-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.task-metrics div{background:#f4f8fb;border-radius:8px;text-align:center;padding:9px 3px}.task-metrics strong,.task-metrics span{display:block}.task-metrics strong{color:#176b58;font-size:16px}.task-metrics span{color:#98a2b3;font-size:11px;margin-top:3px}.full-button{width:100%;margin-top:12px}.work-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.work-item{border:0;border-radius:12px;padding:14px;text-align:left;color:#fff;min-height:116px;cursor:pointer}.work-item i{display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:9px;background:rgba(255,255,255,.2);font-style:normal;font-weight:700;margin-bottom:10px}.work-item strong,.work-item span{display:block}.work-item strong{font-size:14px}.work-item span{font-size:11px;line-height:1.5;opacity:.9;margin-top:5px}.work-item.plan{background:#3978bd}.work-item.progress{background:#2d8c72}.info-row,.policy-row{width:100%;display:flex;align-items:flex-start;gap:9px;text-align:left;background:none;border:0;border-top:1px solid #edf0f5;padding:11px 0;color:#344054;cursor:pointer}.info-row div,.policy-row div{flex:1;min-width:0}.info-row b,.policy-row b{font-size:13px}.info-row p,.policy-row p{margin:4px 0 0;color:#667085;font-size:11px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.policy-row{justify-content:space-between}.policy-row>span{color:#98a2b3;font-size:20px;line-height:1.4}
</style>
