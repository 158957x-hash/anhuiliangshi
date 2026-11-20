<template>
  <div class="mobile-page" role="main" :aria-label="isStorage ? '皖企通收储主体工作台' : '皖企通种植主体工作台'">
    <div class="brand-card">
      <div class="brand-row"><div><b>{{ isStorage ? '收储主体工作台' : '种植主体工作台' }}</b><span>皖企通</span></div><el-tag type="success" size="small">{{ userStore.regionName || '属地服务' }}</el-tag></div>
      <p>{{ isStorage ? '按图索料匹配备案地块，在线完成收储申报与备案' : '查看下发计划，按地块完成计划上报和生产进度维护' }}</p>
    </div>

    <section class="work-card">
      <div class="section-title"><b>我的生产工作</b><span class="section-note">{{ isStorage ? '收储主体' : '种植主体' }}</span></div>
      <div class="work-grid" v-if="!isStorage">
        <button class="work-item plan" @click="$router.push('/mobile/plans')"><i>计</i><strong>计划管理</strong><span>查看下发计划，按地块上报计划</span></button>
        <button class="work-item progress" @click="$router.push('/mobile/progress')"><i>进</i><strong>播种/收获进度</strong><span>维护每块地的播种和收获进度</span></button>
        <button class="work-item silage wide" @click="$router.push('/mobile/wqt-silage')"><i>贮</i><strong>青贮饲料管理</strong><span>申报种植计划、维护种植进度、受灾补充上报</span></button>
      </div>
      <div class="work-grid" v-else>
        <button class="work-item plan" @click="$router.push({ path: '/mobile/wqt-silage', query: { tab: 'storages' } })"><i>收</i><strong>收储申报</strong><span>申报计划收储的品种、价格与重量</span></button>
        <button class="work-item progress" @click="$router.push({ path: '/mobile/wqt-silage', query: { tab: 'execution' } })"><i>实</i><strong>实际收储</strong><span>登记实际重量、价格与来源地块</span></button>
        <button class="work-item silage wide" @click="$router.push({ path: '/mobile/wqt-silage', query: { tab: 'match' } })"><i>料</i><strong>按图索料</strong><span>匹配已备案地块，对接种植主体</span></button>
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
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { fetchPolicies, fetchWeatherAlerts } from '@/api/gpm'

const router = useRouter()
const userStore = useUserStore()
const isStorage = computed(() => userStore.role?.code === 'storage_subject')
const policies = ref([])
const alerts = ref([])
const goAdvisories = tab => router.push({ path: '/mobile/advisories', query: { tab } })

onMounted(async () => {
  const [policyRows, weatherRows] = await Promise.all([fetchPolicies(), fetchWeatherAlerts(userStore.role)])
  policies.value = (policyRows || []).filter(item => item.active !== false && item.status !== '已下线' && item.status !== 'offline' && (!item.status || item.status === '已发布' || item.status === 'published'))
  alerts.value = weatherRows || []
})
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-width:0;min-height:100%;box-sizing:border-box;background:#f4f7fb;padding:14px;overflow-x:hidden}.brand-card{background:linear-gradient(135deg,#176b58,#249477);color:#fff;border-radius:16px;padding:20px 18px;margin-bottom:12px}.brand-row,.section-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.brand-row b{font-size:23px}.brand-row span{opacity:.85;font-size:13px;margin-left:8px}.brand-card p{margin:12px 0 0;font-size:13px;opacity:.9}.work-card,.info-card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px}.section-title{color:#243b5a;margin-bottom:12px}.section-title button{border:0;background:none;color:#2d8c72;font-size:12px;cursor:pointer}.section-note{font-size:12px;color:#98a2b3}.work-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.work-item{border:0;border-radius:12px;padding:14px;text-align:left;color:#fff;min-height:120px;cursor:pointer}.work-item i{display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:9px;background:rgba(255,255,255,.2);font-style:normal;font-weight:700;margin-bottom:10px}.work-item strong,.work-item span{display:block}.work-item strong{font-size:14px}.work-item span{font-size:11px;line-height:1.5;opacity:.9;margin-top:5px}.work-item.plan{background:#3978bd}.work-item.progress{background:#2d8c72}.work-item.silage{background:#5c6f9c}.work-item.wide{grid-column:1/-1;min-height:auto;display:grid;grid-template-columns:30px 1fr;grid-template-rows:auto auto;column-gap:10px;align-items:center}.work-item.wide i{grid-row:1/3;margin-bottom:0}.work-item.wide strong{font-size:14px}.work-item.wide span{grid-column:2}.info-row,.policy-row{width:100%;display:flex;align-items:flex-start;gap:9px;text-align:left;background:none;border:0;border-top:1px solid #edf0f5;padding:11px 0;color:#344054;cursor:pointer}.info-row div,.policy-row div{flex:1;min-width:0}.info-row b,.policy-row b{font-size:13px}.info-row p,.policy-row p{margin:4px 0 0;color:#667085;font-size:11px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.policy-row{justify-content:space-between}.policy-row>span{color:#98a2b3;font-size:20px;line-height:1.4}
</style>
