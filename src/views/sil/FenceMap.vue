<template>
  <div class="fence-page" v-loading="loading">
    <BaseMap ref="baseMapRef" />
    <aside class="fence-panel">
      <section class="panel-card">
        <div class="panel-head"><h2>青贮收储数字围栏</h2><el-button size="small" :loading="loading" @click="load">刷新示例</el-button></div>
        <p class="hint">展示普通备案和受灾免审上报所选整块地的精确边界。</p>
        <div class="stats"><div><b>{{ fences.length }}</b><span>备案单</span></div><div><b>{{ plotCount }}</b><span>关联地块</span></div><div><b>{{ totalArea.toFixed(1) }}</b><span>面积（亩）</span></div></div>
        <el-button class="list-link" @click="router.push('/sil/declare')">查看普通申报列表</el-button>
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
        <el-alert v-if="unavailable" :title="unavailable" type="warning" :closable="false" show-icon />
      </section>
      <section class="panel-card">
        <el-input v-model="keyword" placeholder="备案编号 / 收储主体 / 地块" clearable />
        <button v-for="fence in filteredFences" :key="fence.id" class="fence-item" :class="{active:current?.id===fence.id}" @click="locate(fence)"><b>{{ fence.filedNo }}</b><span>{{ fence.storageSubjectName || fence.subjectName }}</span><small>{{ fence.plotDetails?.length || 0 }} 块地 · {{ fence.createdAt || '—' }}</small></button>
        <el-empty v-if="!loading && !filteredFences.length" description="暂无有效备案或受灾免审围栏" :image-size="66" />
      </section>
    </aside>
    <el-drawer v-model="drawerVisible" title="备案围栏与来源申报" size="min(920px, 96vw)" append-to-body>
      <template v-if="current">
        <el-descriptions :column="1" border><el-descriptions-item label="备案编号">{{ current.filedNo }}</el-descriptions-item><el-descriptions-item label="来源申报">{{ current.declarationId }}</el-descriptions-item><el-descriptions-item label="收储主体">{{ current.storageSubjectName || current.subjectName }}</el-descriptions-item><el-descriptions-item label="备案日期">{{ current.createdAt || '—' }}</el-descriptions-item><el-descriptions-item label="边界记录">{{ currentGeo.features.length }} / {{ current.plotDetails?.length || 0 }} 块地</el-descriptions-item></el-descriptions>
        <el-alert v-if="currentGeo.features.length !== (current.plotDetails?.length || 0)" class="boundary-alert" title="部分地块边界缺失，未生成替代图形，请核对来源申报。" type="warning" :closable="false" />
        <h3>备案地块明细</h3>
        <el-table :data="current.plotDetails || []" border size="small"><el-table-column prop="name" label="地块" min-width="140" /><el-table-column prop="subjectName" label="种植主体" min-width="150" /><el-table-column label="作物 / 品种" min-width="150"><template #default="{row}">{{ cropName(row.crop) }} / {{ row.variety || '—' }}</template></el-table-column><el-table-column prop="areaMu" label="面积（亩）" width="110" /><el-table-column prop="expectedYield" label="预计产量（吨）" width="135" /></el-table>
        <div class="drawer-actions"><el-button @click="locate(current,false)">定位全部地块</el-button><el-button @click="router.push({path:'/onemap/silage',query:{id:current.declarationId}})">在一张图查看</el-button><el-button type="primary" @click="openSource">返回原申报</el-button></div>
        <template v-if="current.source==='disaster'"><h3>受灾专家认定与免审依据</h3><p>{{ current.event?.assessment }}</p><SilAttachments :model-value="current.event?.files || []"/><p>受灾认定：{{ current.event?.number }}</p><p v-for="e in current.event?.experts || []" :key="e.name">{{ e.name }} · {{ e.unit }} · {{ e.signedAt }}</p><el-tag type="success">受灾围栏内补充上报免再审核</el-tag></template><template v-else><h3>同一份普通收储申报</h3><OrdinaryDetail v-if="currentApplication" :application="currentApplication" /><el-empty v-else description="来源申报不存在或当前用户无权查看，请刷新后重试" :image-size="60" /></template>
      </template>
    </el-drawer>
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
import BaseMap from '@/components/map/BaseMap.vue'
import OrdinaryDetail from '@/components/sil/OrdinaryDetail.vue'
import SilAttachments from '@/components/sil/SilAttachments.vue'
import { fetchOrdinaryFences, fetchOrdinaryApplications, ordinaryFenceGeoJSON } from '@/api/silOrdinary'
import { fetchDisasterFences } from '@/api/silDisaster'
import { readSilCropDict } from '@/mock/sil/crops'
import { useUserStore } from '@/stores/user'
const userStore=useUserStore(), route=useRoute(), router=useRouter()
const baseMapRef=ref(null), fences=ref([]), applications=ref([]), current=ref(null), drawerVisible=ref(false), keyword=ref(''), loading=ref(false), error=ref(''), unavailable=ref('')
const geoFor=fence=>fence.source==='disaster'?{type:'FeatureCollection',features:(fence.plotDetails||[]).filter(p=>p.geometry).map(p=>({type:'Feature',properties:{fenceId:fence.id,plotName:p.name,plotId:p.plotId,areaMu:p.areaMu},geometry:p.geometry}))}:ordinaryFenceGeoJSON(fence)
const currentGeo=computed(()=>current.value?geoFor(current.value):{type:'FeatureCollection',features:[]})
const currentApplication=computed(()=>applications.value.find(item=>item.id===current.value?.declarationId))
const filteredFences=computed(()=>fences.value.filter(item=>!keyword.value||`${item.filedNo} ${item.storageSubjectName||item.subjectName} ${(item.plotDetails||[]).map(plot=>plot.name).join(' ')}`.includes(keyword.value)))
const plotCount=computed(()=>new Set(fences.value.flatMap(item=>item.plotIds||[])).size)
const totalArea=computed(()=>fences.value.reduce((sum,item)=>sum+(item.plotDetails||[]).reduce((area,plot)=>area+Number(plot.areaMu||0),0),0))
const cropName=code=>readSilCropDict().find(item=>item.code===code)?.name||code||'—'
const openSource=()=>{drawerVisible.value=false;router.push(current.value?.source==='disaster'?{path:'/sil/supplement',query:{disasterId:current.value.declarationId}}:{path:'/sil/declare',query:{id:current.value?.declarationId}})}
const fit=geo=>{const bounds=L.geoJSON(geo).getBounds();if(bounds.isValid())baseMapRef.value?.fitBounds(bounds,[40,40])}
const locate=(fence,open=true)=>{if(!fence)return;current.value=fence;if(open)drawerVisible.value=true;fit(geoFor(fence));if(route.query.id!==fence.declarationId)router.replace({query:{...route.query,id:fence.declarationId}})}
const locateQuery=()=>{unavailable.value='';if(!route.query.id)return;const fence=fences.value.find(item=>item.declarationId===String(route.query.id));if(fence)locate(fence);else{current.value=null;drawerVisible.value=false;unavailable.value='该申报尚未备案、没有可用地块边界，或当前用户无权查看围栏。'}}
const load=async()=>{loading.value=true;error.value='';try{const [nextFences,nextApplications,disasterFences]=await Promise.all([fetchOrdinaryFences(userStore.role),fetchOrdinaryApplications(userStore.role),fetchDisasterFences(userStore.role)]);fences.value=[...nextFences,...disasterFences];applications.value=nextApplications;const features=fences.value.flatMap(item=>geoFor(item).features||[]);baseMapRef.value?.addGeoJSON('ordinaryFences',{type:'FeatureCollection',features},{style:{color:'#168c86',weight:2,fillColor:'#26a69a',fillOpacity:.28},onEachFeature:(feature,layer)=>{const tip=document.createElement('span');tip.textContent=`${feature.properties.plotName||feature.properties.plotId} · ${feature.properties.areaMu||0}亩`;layer.bindTooltip(tip);layer.on('click',()=>locate(fences.value.find(item=>item.id===feature.properties.fenceId)))}});if(route.query.id)locateQuery();else if(!current.value)fit({type:'FeatureCollection',features})}catch(err){fences.value=[];applications.value=[];current.value=null;drawerVisible.value=false;baseMapRef.value?.removeLayer('ordinaryFences');error.value=err?.message||'围栏读取失败，请刷新重试。'}finally{loading.value=false}}
onMounted(load)
watch(()=>route.query.id,()=>{if(!loading.value)locateQuery()})
watch(()=>userStore.role,load)
</script>
<style scoped lang="scss">
.fence-page{position:relative;height:100%;min-height:560px;overflow:hidden}.fence-panel{position:absolute;z-index:500;top:16px;left:16px;width:min(350px,calc(100% - 32px));max-height:calc(100% - 32px);overflow:auto}.panel-card{margin-bottom:12px;padding:14px;background:rgba(255,255,255,.96);border:1px solid #dce6f0;border-radius:10px;box-shadow:0 4px 16px #2846641c}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.panel-head h2{font-size:16px;margin:0;color:#24476c}.hint{font-size:12px;line-height:1.6;color:#728398}.stats{display:flex;justify-content:space-between;text-align:center}.stats b{display:block;color:#168c86;font-size:22px}.stats span{font-size:11px;color:#7b8794}.list-link{width:100%;margin:12px 0}.fence-item{display:block;width:100%;text-align:left;background:transparent;border:0;border-top:1px solid #edf1f5;padding:12px 4px;cursor:pointer;overflow-wrap:anywhere}.fence-item.active{background:#eaf7f5}.fence-item b,.fence-item span,.fence-item small{display:block}.fence-item b{font-size:12px;color:#168c86}.fence-item span{margin:5px 0;font-size:13px;color:#354b63}.fence-item small{color:#8391a2}.drawer-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.drawer-actions .el-button{margin:0}h3{font-size:15px;margin:20px 0 10px;color:#24476c}.boundary-alert{margin-top:12px}@media(max-width:600px){.fence-page{min-height:600px}.fence-panel{top:10px;left:10px;width:calc(100% - 60px);max-height:46%}.panel-card{padding:10px}.panel-head h2{font-size:14px}.stats b{font-size:18px}}
</style>

