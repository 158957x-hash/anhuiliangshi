<template>
  <div class="silage-map-page" v-loading="loading">
    <BaseMap ref="baseMapRef" />
    <div class="admin-drill"><b>{{ drillTitle }}</b><el-button v-if="drillLevel === 'county'" link size="small" @click="drillUp">返回市级</el-button><el-button v-else-if="drillLevel === 'city'" link size="small" @click="drillProvince">返回省级</el-button></div>
    <aside class="map-panel">
      <section class="summary-card"><div class="panel-head"><h2>青贮饲料一张图</h2><el-button size="small" :loading="loading" @click="load">刷新示例</el-button></div><p>普通备案与受灾补充收储地块分布</p><div class="metrics"><div><b>{{ fences.length }}</b><span>备案单</span></div><div><b>{{ totalArea.toFixed(1) }}</b><span>面积（亩）</span></div><div><b>{{ totalYield.toFixed(1) }}</b><span>预计产量（吨）</span></div></div><el-alert v-if="error" :title="error" type="error" :closable="false" /><el-alert v-if="unavailable" :title="unavailable" type="warning" :closable="false" /></section>
      <section class="list-card"><el-input v-model="keyword" placeholder="搜索收储主体、品种、地块" clearable /><button v-for="fence in filteredFences" :key="fence.id" class="fence-row" :class="{active:current?.id===fence.id}" @click="locate(fence)"><b>{{ fence.storageSubjectName || fence.subjectName }}</b><span>{{ fence.filedNo }}</span><small>{{ cropSummary(fence) }} · {{ fence.plotDetails?.length || 0 }} 块地</small></button><el-empty v-if="!loading && !filteredFences.length" description="暂无有效备案或受灾补充地块" :image-size="70" /></section>
    </aside>
    <div class="legend"><span></span> 备案 / 受灾免审地块边界</div>
    <el-drawer v-model="drawer" title="青贮备案详情" size="min(920px, 96vw)" append-to-body><template v-if="current">
      <el-descriptions :column="1" border><el-descriptions-item label="备案编号">{{ current.filedNo }}</el-descriptions-item><el-descriptions-item label="收储主体">{{ current.storageSubjectName || current.subjectName }}</el-descriptions-item><el-descriptions-item label="来源申报">{{ current.declarationId }}</el-descriptions-item></el-descriptions>
      <h3>种植地块与作物</h3><el-table :data="current.plotDetails||[]" size="small" border><el-table-column prop="name" label="地块" min-width="140" /><el-table-column prop="subjectName" label="种植主体" min-width="160" /><el-table-column label="作物 / 品种" min-width="140"><template #default="{row}">{{ cropName(row.crop) }} / {{ row.variety||'—' }}</template></el-table-column><el-table-column prop="areaMu" label="面积（亩）" width="110" /></el-table>
      <div class="drawer-actions"><el-button @click="router.push({path:'/sil/fence',query:{id:current.declarationId}})">查看精确围栏</el-button><el-button type="primary" @click="openSource">返回原申报</el-button></div><template v-if="current.source==='disaster'"><h3>受灾专家认定与免审依据</h3><p>{{ current.event?.assessment }}</p><p>受灾认定：{{ current.event?.number }}</p><SilAttachments :model-value="current.event?.files || []"/><p v-for="e in current.event?.experts || []" :key="e.name">{{ e.name }} · {{ e.unit }} · {{ e.signedAt }}</p><el-tag type="success">围栏内补充上报免再审核</el-tag></template><template v-else><h3>同一份普通收储申报</h3><OrdinaryDetail v-if="currentApplication" :application="currentApplication" /><el-empty v-else description="来源申报不存在或当前用户无权查看" :image-size="60" /></template>
    </template></el-drawer>
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
import BaseMap from '@/components/map/BaseMap.vue'
import OrdinaryDetail from '@/components/sil/OrdinaryDetail.vue'
import { fetchOrdinaryFences, fetchOrdinaryApplications, ordinaryFenceGeoJSON } from '@/api/silOrdinary'
import { fetchDisasterFences } from '@/api/silDisaster'
import SilAttachments from '@/components/sil/SilAttachments.vue'
import { readSilCropDict } from '@/mock/sil/crops'
import { useUserStore } from '@/stores/user'
import adminGeo from '@/assets/geo/anhui-admin.json'
import cityGeo from '@/mock/geo/anhui-city.json'
const route=useRoute(),router=useRouter(),userStore=useUserStore()
const baseMapRef=ref(null),fences=ref([]),applications=ref([]),keyword=ref(''),loading=ref(false),error=ref(''),unavailable=ref(''),current=ref(null),drawer=ref(false)
const drillLevel=ref('province'), drillCity=ref(null), drillCounty=ref(null)
const drillTitle=computed(()=>drillCounty.value?.name || drillCity.value?.name || '安徽省')
const renderAdmin=()=>{const map=baseMapRef.value;if(!map)return;map.removeLayer('adminBoundary');const source=drillLevel.value==='province'?cityGeo:{type:'FeatureCollection',features:adminGeo.features.filter(f=>f.properties.level==='county'&&String(f.properties.cityAdcode)===String(drillCity.value?.adcode))};map.addGeoJSON('adminBoundary',source,{style:{color:'#4d7ea8',weight:1.2,fillOpacity:.08},onEachFeature:(feature,layer)=>{layer.bindTooltip(feature.properties.name);layer.on('click',()=>{if(drillLevel.value==='province'){drillCity.value=feature.properties;drillLevel.value='city';renderAdmin()}else{drillCounty.value=feature.properties;drillLevel.value='county'}})}})}
const drillUp=()=>{drillCounty.value=null;drillLevel.value='city';renderAdmin()}
const drillProvince=()=>{drillCounty.value=null;drillCity.value=null;drillLevel.value='province';renderAdmin();baseMapRef.value?.flyTo([32.3,117.2],7)}
const cropName=code=>readSilCropDict().find(item=>item.code===code)?.name||code||'—'
const cropSummary=fence=>[...new Set((fence.plotDetails||[]).map(plot=>`${cropName(plot.crop)}${plot.variety?' / '+plot.variety:''}`))].join('、')||'未记录品种'
const filteredFences=computed(()=>fences.value.filter(item=>!keyword.value||`${item.storageSubjectName||item.subjectName} ${item.filedNo||item.number} ${cropSummary(item)} ${(item.plotDetails||[]).map(plot=>`${plot.name} ${plot.subjectName}`).join(' ')}`.includes(keyword.value)))
const totalArea=computed(()=>fences.value.reduce((sum,item)=>sum+(item.plotDetails||[]).reduce((area,plot)=>area+Number(plot.areaMu||0),0),0))
const totalYield=computed(()=>fences.value.reduce((sum,item)=>sum+(item.plotDetails||[]).reduce((value,plot)=>value+Number(plot.expectedYield||0),0),0))
const currentApplication=computed(()=>applications.value.find(item=>item.id===current.value?.declarationId))
const openSource=()=>{drawer.value=false;router.push(current.value?.source==='disaster'?{path:'/sil/supplement',query:{disasterId:current.value.declarationId}}:{path:'/sil/declare',query:{id:current.value?.declarationId}})}
const fit=geo=>{const bounds=L.geoJSON(geo).getBounds();if(bounds.isValid())baseMapRef.value?.fitBounds(bounds,[40,40])}
const geoFor=fence=>fence.source==='disaster'?{type:'FeatureCollection',features:(fence.plotDetails||[]).filter(p=>p.geometry).map(p=>({type:'Feature',properties:{fenceId:fence.id,plotName:p.name,plotId:p.plotId,areaMu:p.areaMu},geometry:p.geometry}))}:ordinaryFenceGeoJSON(fence)
const locate=fence=>{if(!fence)return;current.value=fence;drawer.value=true;fit(geoFor(fence));if(route.query.id!==fence.declarationId)router.replace({query:{...route.query,id:fence.declarationId,type:fence.source==='disaster'?'disaster':'ordinary'}})}
const locateQuery=()=>{unavailable.value='';if(!route.query.id)return;const fence=fences.value.find(item=>item.declarationId===String(route.query.id));if(fence)locate(fence);else{current.value=null;drawer.value=false;unavailable.value='该申报尚未备案、没有可用地块边界，或当前用户无权查看。'}}
const load=async()=>{loading.value=true;error.value='';try{renderAdmin();const[nextOrdinary,nextApplications,nextDisaster]=await Promise.all([fetchOrdinaryFences(userStore.role),fetchOrdinaryApplications(userStore.role),fetchDisasterFences(userStore.role)]);fences.value=[...nextOrdinary,...nextDisaster];applications.value=nextApplications;const features=fences.value.flatMap(item=>geoFor(item).features||[]);baseMapRef.value?.addGeoJSON('ordinaryFences',{type:'FeatureCollection',features},{style:{color:'#168c86',weight:2,fillColor:'#26a69a',fillOpacity:.32},onEachFeature:(feature,layer)=>{const tip=document.createElement('span');tip.textContent=`${feature.properties.plotName||feature.properties.plotId} · ${feature.properties.areaMu||0}亩`;layer.bindTooltip(tip);layer.on('click',()=>locate(fences.value.find(item=>item.id===feature.properties.fenceId)))}});if(route.query.id)locateQuery();else if(!current.value)fit({type:'FeatureCollection',features})}catch(err){fences.value=[];applications.value=[];current.value=null;drawer.value=false;baseMapRef.value?.removeLayer('ordinaryFences');error.value=err?.message||'地图数据读取失败，请刷新重试。'}finally{loading.value=false}}
onMounted(load)
watch(()=>route.query.id,()=>{if(!loading.value)locateQuery()})
watch(()=>userStore.role,load)
</script>
<style scoped lang="scss">
.silage-map-page{position:relative;height:100%;min-height:560px;overflow:hidden;background:#e5edf2}.map-panel{position:absolute;z-index:500;top:16px;left:16px;width:min(330px,calc(100% - 32px));max-height:calc(100% - 32px);overflow:auto}.summary-card,.list-card{padding:14px;background:rgba(255,255,255,.96);border:1px solid #dce6f0;border-radius:10px;margin-bottom:12px;box-shadow:0 4px 16px #2846641c}.panel-head{display:flex;gap:8px;align-items:center;justify-content:space-between}.panel-head h2{font-size:16px;color:#24476c;margin:0}.summary-card p{font-size:12px;color:#728398}.metrics{display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:8px}.metrics b,.metrics span{display:block}.metrics b{font-size:21px;color:#168c86}.metrics span{font-size:11px;color:#7b8794;margin:5px 0 10px}.fence-row{display:block;width:100%;border:0;border-bottom:1px solid #edf1f5;background:transparent;text-align:left;padding:12px 4px;cursor:pointer;overflow-wrap:anywhere}.fence-row.active{background:#eaf7f5}.fence-row b,.fence-row span,.fence-row small{display:block}.fence-row b{font-size:13px;color:#24476c}.fence-row span{font-size:12px;color:#168c86;margin:5px 0}.fence-row small{font-size:11px;color:#8493a5}.legend{position:absolute;right:16px;bottom:40px;z-index:400;background:#fffffff2;padding:10px;border-radius:8px;font-size:12px;color:#49637d}.legend span{display:inline-block;width:15px;height:10px;background:#26a69a66;border:2px solid #168c86;vertical-align:middle;margin-right:5px}.drawer-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.drawer-actions .el-button{margin:0}h3{font-size:15px;color:#24476c;margin:20px 0 10px}@media(max-width:600px){.silage-map-page{min-height:600px}.map-panel{top:10px;left:10px;width:calc(100% - 60px);max-height:46%}.summary-card,.list-card{padding:10px}.legend{font-size:11px;bottom:14px;left:10px;right:auto}}
.admin-drill{position:absolute;z-index:600;top:16px;right:16px;background:#fff;padding:8px 12px;border-radius:8px;box-shadow:0 2px 10px #28466426}.admin-drill .el-button{margin-left:8px}
</style>



