<template>
  <div class="mobile-page" v-loading="loading">
    <header class="mobile-header"><button aria-label="返回" @click="router.back()">‹</button><b>青贮饲料管理</b><el-button link @click="load">刷新</el-button></header>
    <el-tabs v-model="businessTab"><el-tab-pane label="普通收储" name="ordinary"/><el-tab-pane label="受灾补充" name="disaster"/></el-tabs>
    <DisasterWorkspace v-if="businessTab==='disaster'" mobile/>
    <template v-else>
    <section class="hero"><b>普通收储申报总览</b><span>查看辖区内整单备案与执行情况</span></section>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-alert v-if="unavailable" :title="unavailable" type="warning" :closable="false" show-icon />
    <div class="metrics"><div><b>{{ applications.length }}</b><span>普通申报单</span></div><div><b>{{ filed.length }}</b><span>已备案</span></div><div><b>{{ totalArea.toFixed(1) }}</b><span>申报面积（亩）</span></div><div><b>{{ totalYield.toFixed(1) }}</b><span>预计产量（吨）</span></div></div>
    <section class="card"><div class="card-title">普通收储申报与备案</div><el-input v-model="keyword" placeholder="搜索申报编号、收储或种植主体" clearable /><el-select v-model="status" placeholder="全部状态" clearable class="status-filter"><el-option v-for="(value,key) in SIL_STATUS" :key="key" :label="value.name" :value="key" /></el-select>
      <button v-for="item in filteredApplications" :key="item.id" class="application-row" @click="openApplication(item)"><div class="row-title"><b>{{ item.storageSubjectName || item.subjectName || '未选择收储主体' }}</b><el-tag size="small" :type="SIL_STATUS[item.status]?.tag||'info'">{{ SIL_STATUS[item.status]?.name||item.status }}</el-tag></div><span>{{ item.filedNo || item.id }}</span><small>{{ item.plotDetails?.length||0 }} 块地 · {{ Number(item.area||0).toFixed(1) }} 亩 · 预计产量 {{ Number(item.expectedYield||0).toFixed(1) }} 吨</small><small>申报人：{{ item.applicant?.name || item.applicant?.userName || '—' }} · 种植主体：{{ plantingNames(item) }}</small><div class="execution-line">执行：{{ executionSummary(item) }}</div></button>
      <el-empty v-if="!loading&&!filteredApplications.length" description="暂无匹配的普通申报" :image-size="60" />
    </section>
    </template>
    <el-drawer v-model="drawer" title="普通收储申报详情" size="96%" append-to-body><template v-if="current">
      <OrdinaryDetail :application="current" />
      <section class="execution-card"><h3>实际执行摘要</h3><el-descriptions v-if="ledgerFor(current)" :column="1" border size="small"><el-descriptions-item label="执行状态">{{ ledgerFor(current).status || '已填报' }}</el-descriptions-item><el-descriptions-item label="实际面积">{{ showValue(ledgerFor(current).actualArea,'亩') }}</el-descriptions-item><el-descriptions-item label="实际产量">{{ showValue(ledgerFor(current).actualYield,'吨') }}</el-descriptions-item><el-descriptions-item label="实际收储重量">{{ showValue(ledgerFor(current).weight,'吨') }}</el-descriptions-item><el-descriptions-item label="实际收储价格">{{ showValue(ledgerFor(current).price,'元/吨') }}</el-descriptions-item></el-descriptions><el-empty v-else description="尚未填报执行台账" :image-size="50" /></section>
      <div class="drawer-actions"><el-button v-if="current.status==='filed'" @click="router.push({path:'/onemap/silage',query:{id:current.id}})">查看备案一张图</el-button><el-button v-if="current.status==='filed'" @click="router.push({path:'/sil/fence',query:{id:current.id}})">查看精确围栏</el-button></div>
    </template></el-drawer>
  </div>
</template>
<script setup>
import { computed,onMounted,ref,watch } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import OrdinaryDetail from '@/components/sil/OrdinaryDetail.vue'
import DisasterWorkspace from '@/components/sil/DisasterWorkspace.vue'
import { fetchOrdinaryApplications,fetchOrdinaryLedgers } from '@/api/silOrdinary'
import { SIL_STATUS } from '@/mock/common/dict'
import { useUserStore } from '@/stores/user'
const userStore=useUserStore(),route=useRoute(),router=useRouter()
const businessTab=ref('ordinary')
const applications=ref([]),ledgers=ref([]),keyword=ref(''),status=ref(''),loading=ref(false),error=ref(''),unavailable=ref(''),current=ref(null),drawer=ref(false)
const filed=computed(()=>applications.value.filter(item=>item.status==='filed'))
const totalArea=computed(()=>applications.value.reduce((sum,item)=>sum+Number(item.area||0),0))
const totalYield=computed(()=>applications.value.reduce((sum,item)=>sum+Number(item.expectedYield||0),0))
const plantingNames=item=>[...new Set((item.plotDetails||[]).map(plot=>plot.subjectName).filter(Boolean))].join('、')||'—'
const filteredApplications=computed(()=>applications.value.filter(item=>(!status.value||item.status===status.value)&&(!keyword.value||`${item.id} ${item.filedNo||''} ${item.storageSubjectName||''} ${plantingNames(item)}`.includes(keyword.value))))
const ledgerFor=item=>ledgers.value.find(ledger=>ledger.declarationId===item.id)
const showValue=(value,unit)=>value===undefined||value===null||value===''?'待填报':`${value} ${unit}`
const executionSummary=item=>{const ledger=ledgerFor(item);return ledger?`${ledger.status||'已填报'} · 实际收储 ${showValue(ledger.weight,'吨')}`:'待填报'}
const openApplication=item=>{current.value=item;drawer.value=true;if(route.query.id!==item.id)router.replace({query:{...route.query,id:item.id}})}
const openQuery=()=>{unavailable.value='';if(!route.query.id)return;const item=applications.value.find(row=>row.id===String(route.query.id));if(item)openApplication(item);else{current.value=null;drawer.value=false;unavailable.value='该申报不存在或当前用户无权查看。'}}
const load=async()=>{loading.value=true;error.value='';try{const[nextApplications,nextLedgers]=await Promise.all([fetchOrdinaryApplications(userStore.role),fetchOrdinaryLedgers(userStore.role)]);applications.value=nextApplications;ledgers.value=nextLedgers;if(route.query.id)openQuery()}catch(err){applications.value=[];ledgers.value=[];current.value=null;drawer.value=false;error.value=err?.message||'读取失败，请刷新重试。'}finally{loading.value=false}}
onMounted(load)
watch(()=>route.query.id,()=>{if(!loading.value)openQuery()})
watch(()=>userStore.role,load)
</script>
<style scoped lang="scss">
.mobile-page{background:#f5f6f8;padding:0 12px 24px;min-width:0}.mobile-header{height:58px;display:grid;grid-template-columns:40px minmax(0,1fr) 44px;align-items:center;text-align:center;font-size:19px}.mobile-header>button{border:0;background:none;font-size:36px;cursor:pointer}.hero,.card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px}.hero{background:linear-gradient(135deg,#258c60,#70b84e);color:#fff}.hero b,.hero span{display:block}.hero span{font-size:12px;margin-top:6px;opacity:.9}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.metrics div{background:#fff;border-radius:12px;padding:13px 10px}.metrics b,.metrics span{display:block}.metrics b{font-size:21px;color:#258651;overflow-wrap:anywhere}.metrics span{font-size:12px;color:#7e899a;margin-top:5px}.card-title{font-weight:700;color:#243b5a;margin-bottom:12px}.status-filter{width:100%;margin:8px 0}.application-row{display:block;width:100%;border:0;border-top:1px solid #edf0f5;background:transparent;text-align:left;padding:14px 0;cursor:pointer;overflow-wrap:anywhere}.row-title{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.row-title b{font-size:14px;color:#243b5a}.row-title .el-tag{flex:none}.application-row>span,.application-row>small{display:block;font-size:12px;color:#7e899a;margin-top:7px;line-height:1.55}.execution-line{font-size:12px;padding:8px;background:#f3f8f4;color:#397a52;border-radius:6px;margin-top:8px}.execution-card{margin-top:20px}.execution-card h3{font-size:15px;color:#24476c}.drawer-actions{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}.drawer-actions .el-button{margin:0}
</style>
