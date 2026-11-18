<template>
  <div class="mobile-page">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>我的种植计划</b><span>先看上级任务，再按地块上报自己的计划</span></div></div>
    <section class="reference-card"><div><b>上级下达计划</b><span>仅作参考，不直接等同于主体自报计划</span></div><el-button type="primary" plain @click="scrollToReference">查看</el-button></section>
    <section class="my-plan-section"><div class="section-title"><b>我的自报计划</b><el-tag size="small" type="success">{{ myPlans.length }} 条</el-tag><el-button type="primary" size="small" @click="$router.push('/mobile/declare')">新增计划</el-button></div><div v-for="item in myPlans" :key="item.id" class="my-plan-card"><div class="my-plan-top"><b>{{ item.year }}年主体自报计划</b><el-tag size="small" type="success">{{ item.status || '已保存' }}</el-tag></div><p>{{ cropSummary(item) }}</p><div class="my-plan-data"><span>已关联地块</span><strong>{{ item.selectedPlots?.length || 0 }} 块 · {{ intentionArea(item).toLocaleString() }} 亩</strong></div><small>提交时间：{{ formatDate(item.submittedAt) }}</small></div><el-empty v-if="!myPlans.length" description="还没有主体自报计划，请先新增" :image-size="50" /></section>
    <section ref="referenceSection" class="reference-section"><div class="section-title"><b>上级下达计划</b><div class="year-tabs"><button v-for="year in years" :key="year" :class="{active: selectedYear === year}" @click="selectedYear = year">{{ year }}年</button></div></div><div v-for="task in filteredTasks" :key="task.taskId" class="plan-card"><div class="plan-top"><el-tag size="small" type="info">参考计划</el-tag><span>{{ task.issuedAt }}</span></div><h3>{{ task.planName }}</h3><p class="location">{{ task.cityName }} · {{ task.countyName }} · {{ task.townName }}</p><div class="plan-metrics"><div><b>{{ task.taskAreaMu }}</b><span>参考面积（亩）</span></div><div><b>{{ task.cropType }}</b><span>计划作物</span></div><div><b>{{ task.progress || 0 }}%</b><span>计划落实</span></div></div><el-button type="primary" plain class="detail-btn" @click="openDetail(task)">查看详情</el-button></div><el-empty v-if="!filteredTasks.length" description="暂无该年度下达计划" /></section>
    <div v-if="detailVisible" class="detail-modal" @click.self="detailVisible = false"><div class="detail-sheet"><div class="sheet-head"><b>计划详情</b><button @click="detailVisible = false">×</button></div><div class="sheet-body" v-if="activeTask"><div class="detail-summary"><b>{{ activeTask.planName }}</b><p>{{ activeTask.cropType }} · 参考面积 {{ activeTask.taskAreaMu }} 亩</p><p>{{ activeTask.cityName }} · {{ activeTask.countyName }} · {{ activeTask.townName }}</p></div><el-alert title="上级下达计划仅作参考，请按自己的地块实际情况填报主体计划。" type="info" :closable="false"/><el-button type="primary" class="submit-btn" @click="$router.push('/mobile/declare')">按地块上报计划</el-button></div></div></div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { fetchSubjectPlanTasks } from '@/api/gpm'

const userStore = useUserStore()
const years = [2026, 2025, 2024]
const selectedYear = ref(2026)
const tasks = ref([])
const myPlans = ref([])
const detailVisible = ref(false)
const activeTask = ref(null)
const referenceSection = ref(null)
const filteredTasks = computed(() => tasks.value.filter(item => Number(item.year) === selectedYear.value))
const intentionArea = item => Number(item?.area || 0) || ['wheat', 'rice', 'corn', 'soybean'].reduce((sum, crop) => sum + Number(item?.[crop] || 0), 0)
const cropNames = { wheat: '小麦', rice: '水稻', corn: '玉米', soybean: '大豆' }
const cropSummary = item => item?.crop ? `${cropNames[item.crop] || item.crop} ${intentionArea(item).toLocaleString()}亩` : ['wheat', 'rice', 'corn', 'soybean'].filter(crop => Number(item?.[crop] || 0) > 0).map(crop => `${cropNames[crop]} ${Number(item[crop]).toLocaleString()}亩`).join('、') || '未填写'
const formatDate = value => value ? String(value).replace('T', ' ').slice(0, 16) : '—'
const scrollToReference = () => referenceSection.value?.scrollIntoView({ behavior: 'smooth' })
const openDetail = task => { activeTask.value = task; detailVisible.value = true }

onMounted(async () => {
  tasks.value = await fetchSubjectPlanTasks(userStore.role)
  const records = JSON.parse(localStorage.getItem('wanqitong-intentions') || '[]')
  myPlans.value = records.filter(item => item.subjectId === userStore.role?.subjectId).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')))
})

</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px}.mobile-head,.plan-card,.reference-card{background:#fff;border-radius:12px;padding:16px;margin-bottom:12px}.mobile-head{display:flex;align-items:center;justify-content:space-between;color:#1f3c68}.mobile-head b{display:block;font-size:21px}.mobile-head span{display:block;color:#667085;font-size:13px;margin-top:4px}.reference-card{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #d6eee5;background:#f8fcfa}.reference-card b,.reference-card span{display:block}.reference-card b{color:#176b58;font-size:15px}.reference-card span{color:#667085;font-size:12px;margin-top:4px}.year-tabs{display:flex;gap:8px;margin-bottom:12px}.year-tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:8px;padding:9px;color:#667085}.year-tabs button.active{background:#eaf6f1;border-color:#2d8c72;color:#176b58;font-weight:600}.plan-top{display:flex;justify-content:space-between;color:#98a2b3;font-size:11px}.plan-card h3{font-size:16px;color:#243b5a;margin:12px 0 5px}.location{font-size:12px;color:#667085;margin:0 0 12px}.plan-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.plan-metrics div{background:#f4f8fb;border-radius:8px;text-align:center;padding:9px 3px}.plan-metrics b,.plan-metrics span{display:block}.plan-metrics b{color:#176b58;font-size:16px}.plan-metrics span{color:#98a2b3;font-size:11px;margin-top:3px}.detail-btn{width:100%;margin-top:13px}.detail-modal{position:fixed;inset:0;z-index:3000;background:#0007;display:flex;align-items:flex-end;justify-content:center}.detail-sheet{width:min(390px,100%);max-height:88%;background:#f7f9fc;border-radius:18px 18px 0 0;overflow:hidden}.sheet-head{height:52px;background:#fff;border-bottom:1px solid #edf0f5;display:flex;align-items:center;justify-content:space-between;padding:0 16px;color:#243b5a}.sheet-head button{border:0;background:#f2f4f7;border-radius:50%;width:30px;height:30px;font-size:22px;color:#667085}.sheet-body{padding:14px;overflow-y:auto;max-height:calc(88vh - 52px)}.detail-summary{background:#eaf6f1;border-radius:10px;padding:12px;color:#176b58;margin-bottom:14px}.detail-summary p{font-size:12px;margin:6px 0 0;color:#4b7d70}.submit-btn{width:100%;margin-top:4px}.mobile-page :deep(.el-form-item){margin-bottom:14px}
.my-plan-section{background:#fff;border-radius:12px;padding:16px;margin-bottom:12px}.section-title{display:flex;align-items:center;justify-content:space-between;color:#243b5a;margin-bottom:9px}.my-plan-card{border-top:1px solid #edf0f5;padding:11px 0}.my-plan-top,.my-plan-data{display:flex;align-items:center;justify-content:space-between;gap:8px}.my-plan-top b{font-size:14px;color:#243b5a}.my-plan-card p{margin:6px 0;color:#667085;font-size:12px;line-height:1.5}.my-plan-data{padding:9px;background:#f4f8fb;border-radius:8px;color:#667085;font-size:12px}.my-plan-data strong{color:#176b58}.my-plan-card small{display:block;margin-top:7px;color:#98a2b3;font-size:11px}</style>


