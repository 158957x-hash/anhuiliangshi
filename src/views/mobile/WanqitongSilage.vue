<template>
  <div class="mobile-silage">
    <header><el-button link @click="router.push('/mobile/wanqitong')">‹ 返回</el-button><b>青贮饲料管理</b><span/></header>
    <nav class="mobile-tabs"><button :class="{active:tab==='records'}" @click="showRecords">我的申报</button><button :class="{active:tab==='form'}" @click="newApplication">普通收储申报</button><button :class="{active:tab==='supplement'}" @click="tab='supplement'">受灾补充</button></nav>
    <template v-if="tab==='records'">
      <div class="records-head"><div><h3>青贮饲料作物收储申报</h3><p>种植计划、地块与收储信息统一报备。</p></div><el-button type="primary" size="small" @click="newApplication">新增</el-button></div>
      <div v-loading="loading">
        <article v-for="item in records" :key="item.id" class="application-card">
          <div class="card-head"><b>{{ item.storageSubjectName || '未选择收储主体' }}</b><el-tag size="small" :type="statusType(item.status)">{{ statusName(item.status) }}</el-tag></div>
          <small>{{ item.id }}</small><p>{{ item.year }} 年 · {{ item.plotDetails?.length || 0 }} 块地 · {{ Number(item.area || 0).toFixed(1) }} 亩</p><p>预计产量 {{ Number(item.expectedYield || 0).toFixed(1) }} 吨</p><p v-if="item.filedNo">备案编号 {{ item.filedNo }}</p>
          <div class="record-actions"><el-button link type="primary" @click="edit(item)">{{ ['draft','returned'].includes(item.status) && isOrdinaryOwner(item,userStore.role) ? item.status === 'returned' ? '补正重提' : '继续填写' : '查看申报' }}</el-button><el-button v-if="item.status==='filed'" link type="primary" @click="router.push({path:'/sil/fence',query:{id:item.id}})">查看围栏</el-button></div>
        </article>
        <el-empty v-if="!loading && !records.length" description="暂无普通收储申报" :image-size="65"/>
      </div>
    </template>
    <template v-else-if="tab==='form'"><div class="form-heading"><h3>{{ editingId ? '申报详情 / 补正' : '新增普通收储申报' }}</h3><p>一次填写种植计划与收储信息，完成后统一提交。</p></div><OrdinaryApplicationForm :key="editingId || formKey" :application-id="editingId" mobile @saved="showRecords" @cancel="showRecords"/></template>
    <section v-else class="supplement-card"><h3>受灾作物补充收储上报</h3><el-alert title="受灾电子围栏经三名专家签字后，围栏内申报免再审核。" type="info" :closable="false" show-icon/><el-form label-position="top"><el-form-item label="受灾面积（亩）"><el-input-number v-model="supplement.affectedArea" :min="0"/></el-form-item><el-form-item label="损失面积（亩）"><el-input-number v-model="supplement.lostArea" :min="0"/></el-form-item><el-form-item label="补充收储面积（亩）"><el-input-number v-model="supplement.supplementArea" :min="0"/></el-form-item></el-form><el-button type="primary" plain @click="goSupplement">进入受灾围栏与专家签字</el-button></section>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchOrdinaryApplications, isOrdinaryOwner } from '@/api/silOrdinary'
import OrdinaryApplicationForm from '@/components/sil/OrdinaryApplicationForm.vue'
const route=useRoute(), router=useRouter(), userStore=useUserStore()
const tab=ref('records'), editingId=ref(''), formKey=ref(0), records=ref([]), loading=ref(false)
const supplement=reactive({affectedArea:0,lostArea:0,supplementArea:0})
const statusName=s=>({draft:'草稿',pending:'待审核',returned:'退回补正',rejected:'已驳回',filed:'已备案'}[s]||s)
const statusType=s=>({filed:'success',pending:'warning',returned:'warning',rejected:'danger'}[s]||'info')
async function showRecords(){tab.value='records';loading.value=true;try{records.value=await fetchOrdinaryApplications(userStore.role)}catch{ElMessage.error('申报记录加载失败，请重试')}finally{loading.value=false}}
function newApplication(){editingId.value='';formKey.value++;tab.value='form'}
function edit(item){editingId.value=item.id;tab.value='form'}
function goSupplement(){ElMessage.info('请在 PC 端“受灾作物补充收储上报”完成受灾围栏和三名专家签字流程')}
onMounted(()=>{if(route.query.id){editingId.value=String(route.query.id);tab.value='form'}else if(route.query.new){newApplication()}else showRecords()})
watch(()=>userStore.role?.code,()=>{editingId.value='';showRecords()})
</script>
<style scoped lang="scss">
.mobile-silage{box-sizing:border-box;min-width:0;width:100%;background:#f5f7fa;padding:0 12px 24px;overflow-x:hidden;color:#344054}.mobile-silage header{display:grid;grid-template-columns:65px minmax(0,1fr) 65px;align-items:center;height:58px;text-align:center}.mobile-silage header>b{font-size:19px;color:#243b53}.mobile-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#fff;padding:4px;border-radius:10px;margin-bottom:16px;gap:3px}.mobile-tabs button{border:0;background:transparent;padding:11px 4px;font-size:12px;color:#7a899a;line-height:1.5;word-break:break-word;border-radius:8px}.mobile-tabs button.active{color:#167e67;background:#eaf5f1;font-weight:600}.records-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin:16px 0}.records-head h3,.form-heading h3{font-size:16px;margin:0 0 7px;color:#243b53;line-height:1.5}.records-head p,.form-heading p{font-size:12px;color:#8a98a7;margin:0;line-height:1.6}.application-card{padding:15px;background:#fff;border:1px solid #e2eaf1;border-radius:10px;margin-bottom:12px}.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:9px}.card-head b{font-size:14px;line-height:1.6;word-break:break-word}.card-head .el-tag{flex-shrink:0}.application-card>small{display:block;color:#9aa6b2;font-size:11px;margin:7px 0;word-break:break-all}.application-card p{font-size:12px;color:#7a8b9e;margin:7px 0;line-height:1.5}.record-actions{display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #eef2f5;padding-top:7px;margin-top:10px}.form-heading{margin:14px 0}.supplement-card{padding:16px;background:#fff;border:1px solid #e2eaf1;border-radius:10px}.supplement-card h3{font-size:16px}.supplement-card .el-form{margin-top:15px}.supplement-card :deep(.el-input-number){width:100%}
</style>
