<template>
  <div class="mobile-page" role="main" aria-label="皖政通粮食计划工作台">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>粮食计划</b><span>皖政通工作台</span></div></div>
    <section class="summary-card"><div class="summary-icon">粮</div><div><b>{{ isTown ? '乡镇计划与进度工作台' : '县级计划与进度工作台' }}</b><p>从工作台进入计划管理或进度填报，不在首页直接铺开业务表单。</p></div></section>
    <MobileFunctionEntry title="计划管理工作台" subtitle="选择要办理的业务" :role-label="isTown ? '乡镇级' : '县级'" :items="entryItems" />
    <section class="scene-tip"><b>业务路径</b><p>{{ isTown ? '计划管理：查看乡镇上报计划列表 → 新增或编辑本级上报；进度填报：选择已通过计划 → 填写本次新增进度 → 查看上报记录。' : '计划管理：查看县级计划 → 发起或查看本级上报；进度填报：查看已通过计划 → 填写本次新增进度 → 查看上报记录。' }}</p></section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import MobileFunctionEntry from '@/components/mobile/MobileFunctionEntry.vue'
const userStore = useUserStore()
const isTown = computed(() => userStore.role?.code === 'town')
const entryItems = computed(() => {
  if (isTown.value) return [
    { key: 'decompose', to: '/mobile/wzt-town-plan?tab=plan', label: '计划分解', description: '查看县级计划并分解到种植主体', tone: 'blue' },
    { key: 'report', to: '/mobile/wzt-town-plan?tab=report', label: '上报计划', description: '填写乡镇本级计划并提交审核', tone: 'green' },
    { key: 'progress', to: '/mobile/wzt-progress', label: '进度填报', description: '填写主体进度并查看下级明细', tone: 'purple' },
    { key: 'policies', to: '/mobile/wzt-policies', label: '惠农政策', description: '查看最新惠农政策和申报指南', tone: 'green' },
    { key: 'weather', to: '/mobile/wzt-weather', label: '气象预警', description: '查看区域气象风险和预警信息', tone: 'orange' }
  ]
  return [
    { key: 'plan', to: '/mobile/wzt-county-plan', label: '县级计划管理', description: '查看市级下达计划并分解到乡镇', tone: 'blue' },
    { key: 'report', to: '/mobile/wzt-county-report', label: '上报计划', description: '在皖政通移动端填写县级计划并提交', tone: 'green' },
    { key: 'audit', to: '/mobile/wzt-county-audit', label: '上报计划审核', description: '审核本县乡镇提交的计划', tone: 'orange' },
    { key: 'progress', to: '/mobile/wzt-progress', label: '进度填报', description: '填写乡镇进度并查看乡镇明细', tone: 'purple' },
    { key: 'policies', to: '/mobile/wzt-policies', label: '惠农政策', description: '查看最新惠农政策和申报指南', tone: 'green' },
    { key: 'weather', to: '/mobile/wzt-weather', label: '气象预警', description: '查看区域气象风险和预警信息', tone: 'orange' }
  ]
})
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px;overflow-x:hidden}.mobile-head{display:flex;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:14px 12px;color:#1f3c68}.mobile-head b{display:block;font-size:20px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;color:#333;padding:0 8px 4px 0}.summary-card{display:flex;align-items:center;gap:12px;margin:12px 0;background:linear-gradient(135deg,#eaf6f1,#f8fbfa);border:1px solid #d6eee5;border-radius:14px;padding:16px;color:#176b58}.summary-icon{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:13px;background:#42a85a;color:#fff;font-size:22px;font-weight:700}.summary-card b{font-size:15px}.summary-card p{margin:5px 0 0;color:#667085;font-size:12px;line-height:1.5}.scene-tip{background:#fff;border-radius:12px;padding:14px;color:#667085;font-size:12px;line-height:1.6;margin-top:12px}.scene-tip b{color:#243b5a;font-size:13px}.scene-tip p{margin:5px 0 0}
</style>