<template>
  <div class="mobile-page" role="main" aria-label="气象预警与惠农政策">
    <div class="mobile-head">
      <button class="back-button" @click="$router.back()">‹</button>
      <div><b>预警与政策</b><span>只展示与当前主体属地相关的公开信息</span></div>
    </div>

    <div class="tabs">
      <button :class="{ active: activeTab === 'weather' }" @click="activeTab = 'weather'">气象预警 <em>{{ alerts.length }}</em></button>
      <button :class="{ active: activeTab === 'policy' }" @click="activeTab = 'policy'">惠农政策 <em>{{ policies.length }}</em></button>
    </div>

    <section v-if="activeTab === 'weather'" class="content-card">
      <div v-for="item in alerts" :key="item.id" class="alert-row">
        <el-tag size="small" :type="item.level === '红色' ? 'danger' : item.level === '橙色' ? 'warning' : 'info'">{{ item.level || '提醒' }}</el-tag>
        <div class="row-main"><b>{{ item.type }} · {{ item.regionName }}</b><p>{{ item.content }}</p><small>{{ item.publishTime || item.date || '近期发布' }}</small></div>
      </div>
      <el-empty v-if="!alerts.length" description="当前暂无气象预警" :image-size="55" />
    </section>

    <section v-else class="content-card">
      <article v-for="item in policies" :key="item.id" class="policy-row">
        <div class="policy-meta"><el-tag size="small" type="success">{{ item.category || '惠农政策' }}</el-tag><span>{{ item.publishDate || '近期发布' }}</span></div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.summary || item.content }}</p>
        <div v-if="item.content && item.content !== item.summary" class="policy-content" v-html="item.content" />
      </article>
      <el-empty v-if="!policies.length" description="当前暂无已发布政策" :image-size="55" />
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchPolicies, fetchWeatherAlerts } from '@/api/gpm'

const route = useRoute()
const activeTab = ref(route.query.tab === 'policy' ? 'policy' : 'weather')
const alerts = ref([])
const policies = ref([])

onMounted(async () => {
  const [weatherRows, policyRows] = await Promise.all([fetchWeatherAlerts(), fetchPolicies()])
  alerts.value = weatherRows || []
  policies.value = (policyRows || []).filter(item => item.active !== false && item.status !== '已下线' && item.status !== 'offline' && (!item.status || item.status === '已发布' || item.status === 'published'))
})
</script>

<style lang="scss" scoped>
.mobile-page{min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.content-card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;gap:8px;color:#1f3c68}.mobile-head b{display:block;font-size:20px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;color:#333;padding:0 8px 4px 0}.tabs{display:flex;gap:8px;margin-bottom:12px}.tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:9px;padding:10px;color:#667085}.tabs button.active{border-color:#2d8c72;background:#eaf6f1;color:#176b58;font-weight:600}.tabs em{font-style:normal;font-size:11px;margin-left:3px}.alert-row{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid #edf0f5}.alert-row:last-child,.policy-row:last-child{border-bottom:0}.row-main{flex:1;min-width:0}.row-main b{color:#243b5a;font-size:14px}.row-main p{margin:5px 0;color:#667085;font-size:12px;line-height:1.5}.row-main small{color:#98a2b3;font-size:11px}.policy-row{padding:12px 0;border-bottom:1px solid #edf0f5}.policy-meta{display:flex;justify-content:space-between;align-items:center;color:#98a2b3;font-size:11px}.policy-row h3{color:#243b5a;font-size:16px;line-height:1.5;margin:10px 0 5px}.policy-row>p,.policy-content{color:#667085;font-size:13px;line-height:1.65;margin:0}.policy-content{border-top:1px solid #edf0f5;margin-top:10px;padding-top:10px}.policy-content :deep(p){margin:0 0 8px}
</style>
