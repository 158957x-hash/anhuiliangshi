<template>
  <div class="mobile-page" role="main" aria-label="皖政通粮食计划">
    <div class="mobile-head"><button class="back-button" @click="$router.back()">‹</button><div><b>粮食计划</b><span>计划、进度、上报记录统一入口</span></div></div>
    <section class="summary-card"><div class="summary-icon">粮</div><div><b>{{ isTown ? '乡镇计划与进度' : '县级计划与进度' }}</b><p>先选计划，再填进度；填写和记录分开处理。</p></div></section>
    <MobileFunctionEntry title="计划管理工作台" subtitle="先确认计划，再维护进度，最后查看上报记录" :role-label="isTown ? '乡镇级' : '县级'" :items="entryItems" @select="selectEntry" />
    <nav class="main-tabs"><button :class="{active: activeTab === 'plan'}" @click="activeTab = 'plan'">计划</button><button :class="{active: activeTab === 'entry'}" @click="activeTab = 'entry'">填进度</button><button :class="{active: activeTab === 'records'}" @click="activeTab = 'records'">记录</button></nav>
    <section v-if="activeTab === 'plan'" class="tab-panel"><WanzhengtongTownPlan :embedded="true" /></section>
    <section v-else-if="activeTab === 'entry'" class="tab-panel"><WanzhengtongProgressEntry @go-records="activeTab = 'records'" /></section>
    <section v-else class="tab-panel"><WanzhengtongProgressRecords @go-entry="activeTab = 'entry'" /></section>
    <section class="scene-tip"><b>操作顺序</b><p>计划页确认本级上报计划 → 填进度页选择对应计划并保存 → 记录页点击上报 → 上级审核。</p></section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import WanzhengtongTownPlan from './WanzhengtongTownPlan.vue'
import WanzhengtongProgressEntry from './WanzhengtongProgressEntry.vue'
import WanzhengtongProgressRecords from './WanzhengtongProgressRecords.vue'
import MobileFunctionEntry from '@/components/mobile/MobileFunctionEntry.vue'
const userStore = useUserStore()
const activeTab = ref('plan')
const isTown = computed(() => userStore.role?.code === 'town')
const entryItems = [{ key: 'plan', label: '计划管理', description: '查看与维护本级计划', tone: 'blue' }, { key: 'entry', label: '进度填报', description: '维护播种、收获进度', tone: 'green' }, { key: 'records', label: '上报记录', description: '查看提交与审核状态', tone: 'orange' }]
function selectEntry(item) { activeTab.value = item.key }
</script>

<style lang="scss" scoped>
.mobile-page{width:100%;min-height:100%;box-sizing:border-box;background:#f5f7fa;padding:14px;overflow-x:hidden}.mobile-head{display:flex;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:14px 12px;color:#1f3c68}.mobile-head b{display:block;font-size:20px}.mobile-head span{display:block;color:#667085;font-size:12px;margin-top:4px}.back-button{border:0;background:none;font-size:36px;line-height:1;color:#333;padding:0 8px 4px 0}.summary-card{display:flex;align-items:center;gap:12px;margin:12px 0;background:linear-gradient(135deg,#eaf6f1,#f8fbfa);border:1px solid #d6eee5;border-radius:14px;padding:16px;color:#176b58}.summary-icon{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:13px;background:#42a85a;color:#fff;font-size:22px;font-weight:700}.summary-card b{font-size:15px}.summary-card p{margin:5px 0 0;color:#667085;font-size:12px;line-height:1.5}.main-tabs{display:flex;gap:8px;margin-bottom:12px}.main-tabs button{flex:1;border:1px solid #d9e2ec;background:#fff;border-radius:9px;padding:11px;color:#667085;font-size:14px}.main-tabs button.active{background:#eaf6f1;border-color:#2d8c72;color:#176b58;font-weight:600}.tab-panel :deep(.mobile-page){padding:0;background:transparent}.tab-panel :deep(.mobile-head){display:none}.scene-tip{background:#fff;border-radius:12px;padding:12px 14px;color:#667085;font-size:11px;line-height:1.6;margin-top:4px}.scene-tip b{color:#243b5a;font-size:12px}.scene-tip p{margin:4px 0 0}
</style>
