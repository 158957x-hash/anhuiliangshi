<template>
  <div class="mobile-page" role="main" aria-label="皖政通粮食计划工作台">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>粮食计划</b><span>皖政通工作台</span></div></div>
    <section class="summary-card"><div class="summary-icon">粮</div><div><b>{{ isTown ? '乡镇计划与进度工作台' : '县级计划与进度工作台' }}</b><p>从工作台进入计划管理或进度填报，不在首页直接铺开业务表单。</p></div></section>
    <MobileFunctionEntry title="计划管理工作台" subtitle="选择要办理的业务" :role-label="isTown ? '乡镇级' : '县级'" :items="entryItems" />
    <section class="scene-tip"><b>业务路径</b><p>计划管理：查看县级分解计划 → 发起或查看本级上报；进度填报：查看已通过计划 → 填写本次新增进度 → 在计划详情查看留痕。</p></section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import MobileFunctionEntry from '@/components/mobile/MobileFunctionEntry.vue'
const userStore = useUserStore()
const isTown = computed(() => userStore.role?.code === 'town')
const entryItems = [
  { key: 'plan', to: '/mobile/wzt-town-plan', label: '计划管理', description: '查看县级分解计划和本级上报状态', tone: 'blue' },
  { key: 'progress', to: '/mobile/wzt-progress', label: '进度填报', description: '选择已通过计划填写本次新增进度', tone: 'green' }
]
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px;overflow-x:hidden}.mobile-head{display:flex;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:14px 12px;color:#1f3c68}.mobile-head b{display:block;font-size:20px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;color:#333;padding:0 8px 4px 0}.summary-card{display:flex;align-items:center;gap:12px;margin:12px 0;background:linear-gradient(135deg,#eaf6f1,#f8fbfa);border:1px solid #d6eee5;border-radius:14px;padding:16px;color:#176b58}.summary-icon{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:13px;background:#42a85a;color:#fff;font-size:22px;font-weight:700}.summary-card b{font-size:15px}.summary-card p{margin:5px 0 0;color:#667085;font-size:12px;line-height:1.5}.scene-tip{background:#fff;border-radius:12px;padding:14px;color:#667085;font-size:12px;line-height:1.6;margin-top:12px}.scene-tip b{color:#243b5a;font-size:13px}.scene-tip p{margin:5px 0 0}
</style>
