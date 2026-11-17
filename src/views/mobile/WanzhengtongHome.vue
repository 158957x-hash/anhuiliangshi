<template>
  <div class="mobile-page" role="main" aria-label="皖政通业务系统首页">
    <div class="mobile-header">
      <button class="back-button" @click="$router.back()">‹</button>
      <b>皖政通</b>
      <span></span>
    </div>

    <section class="system-panel">
      <div class="section-title"><i></i><b>业务子系统</b></div>
      <div class="quick-grid">
        <button class="quick-item plan" @click="$router.push('/mobile/wzt-gpm')">
          <strong>粮食计划管理</strong>
        </button>
        <button v-if="isCounty" class="quick-item system" @click="$router.push('/mobile/wzt-silage')">
          <strong>青贮饲料管理</strong>
        </button>
        <button v-if="isCounty" class="quick-item system" @click="$router.push('/mobile/wzt-food-safety')">
          <strong>粮食安全综合监管</strong>
        </button>
        <button v-if="isCounty" class="quick-item system" @click="showUnavailable('农药数字监督管理')">
          <strong>农药数字监督管理</strong>
        </button>
      </div>
    </section>
    <section class="info-list"><div class="section-title"><i></i><b>省级惠农政策</b><button @click="$router.push('/mobile/wzt-policies')">查看全部</button></div><div v-for="item in policies.slice(0,2)" :key="item.id" class="info-row" @click="$router.push('/mobile/wzt-policies')"><div><b>{{ item.title }}</b><p>{{ item.summary || item.content }}</p></div><span>›</span></div><el-empty v-if="!policies.length" description="暂无省级政策" :image-size="40" /></section>
    <section class="info-list"><div class="section-title"><i></i><b>省级气象预警</b><button @click="$router.push('/mobile/wzt-food-safety')">查看详情</button></div><div v-for="item in alerts.slice(0,2)" :key="item.id" class="info-row"><div><b>{{ item.type }} · {{ item.regionName }}</b><p>{{ item.content }}</p></div><el-tag size="small" type="warning">{{ item.level || '提醒' }}</el-tag></div><el-empty v-if="!alerts.length" description="暂无省级预警" :image-size="40" /></section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { onMounted, ref } from 'vue'
import { fetchPolicies, fetchWeatherAlerts } from '@/api/gpm'

const userStore = useUserStore()
const policies = ref([]); const alerts = ref([])

const isCounty = computed(() => userStore.role?.code === 'county')
const isTown = computed(() => userStore.role?.code === 'town')
const showUnavailable = name => ElMessage.info(`${name}移动端功能待接入`)
onMounted(async () => { policies.value = (await fetchPolicies()).filter(item => item.status === '已发布' || item.status === 'published' || item.active !== false); alerts.value = await fetchWeatherAlerts({ regionCode: '340000' }) })
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-width:0;min-height:100%;box-sizing:border-box;background:#f5f6f8;padding:0 10px 30px;overflow-x:hidden}.mobile-header{height:58px;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;text-align:center;color:#222;font-size:23px}.back-button{border:0;background:none;font-size:38px;line-height:1;color:#333;text-align:left;padding:0 0 5px 7px}.system-panel{background:#fff;border-radius:18px;padding:25px 18px 28px;box-shadow:0 1px 5px rgba(31,52,73,.04)}.section-title{display:flex;align-items:center;gap:10px;color:#222;font-size:22px;margin-bottom:28px}.section-title i{width:6px;height:23px;background:#ff9914;border-radius:4px}.quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px 16px}.quick-item{border:0;background:none;padding:0;color:#222;min-width:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:flex-start}.quick-item strong{display:block;font-size:15px;line-height:1.35;margin-top:12px;word-break:break-word;text-wrap:balance}.quick-item::before{content:'✓';display:flex;width:76px;height:76px;margin:0 auto;border-radius:22px;align-items:center;justify-content:center;color:#fff;font-size:35px;font-weight:700;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 5px 10px rgba(0,0,0,.08)}.quick-item.plan::before{content:'▦';background:linear-gradient(145deg,#58b96b,#42a85a)}.quick-item.system:nth-child(2)::before{content:'♜';background:linear-gradient(145deg,#9bd24a,#78bc36)}.quick-item.system:nth-child(3)::before{content:'✓';background:linear-gradient(145deg,#ff7373,#ee5059)}.quick-item.system:nth-child(4)::before{content:'♟';background:linear-gradient(145deg,#ffb33a,#ff9411)}.info-list{background:#fff;border-radius:14px;margin-top:12px;padding:14px}.info-list .section-title{display:flex;align-items:center;justify-content:space-between;font-size:15px;margin-bottom:8px}.info-list .section-title i{width:5px;height:18px;background:#ff9914;border-radius:3px}.info-list button{border:0;background:none;color:#2d8c72}.info-row{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #edf0f5;padding:10px 0;color:#243b5a}.info-row p{margin:4px 0 0;color:#667085;font-size:11px;line-height:1.4}.info-row>span{font-size:20px;color:#98a2b3}
</style>
