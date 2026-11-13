<template>
  <div class="plot-picker">
    <div class="plot-map"><BaseMap ref="mapRef" :center="[33.16,115.62]" :zoom="9"/><div class="map-caption">天地图 · 绿色候选 / 橙色已选</div></div>
    <div class="plot-options"><el-input v-model="keyword" clearable placeholder="地块编号 / 名称"/><div class="tools"><span>已选 {{ modelValue.length }} 块 · {{ selectedArea.toFixed(1) }} 亩</span><el-button v-if="!readonly" link type="primary" @click="selectAll">批量全选</el-button><el-button link @click="render(true)">定位</el-button></div>
      <div class="plot-list"><label v-for="plot in filtered" :key="plot.id" class="plot-row" :class="{selected:modelValue.includes(plot.id)}"><el-checkbox :model-value="modelValue.includes(plot.id)" :disabled="readonly || !plot.geometry || excluded.includes(plot.id)" @change="toggle(plot)"><b>{{ plot.name }}</b></el-checkbox><small>{{ plot.id }} · {{ Number(plot.areaMu).toFixed(1) }}亩</small><small v-if="excluded.includes(plot.id)" class="duplicate">同一受灾认定下已上报</small><small v-else-if="!plot.geometry">缺少地块边界</small></label><el-empty v-if="!filtered.length" description="暂无符合条件的地块" :image-size="45"/></div>
    </div>
  </div>
</template>
<script setup>
import { computed,nextTick,onMounted,ref,watch } from 'vue'
import L from 'leaflet'
import BaseMap from '@/components/map/BaseMap.vue'
const props=defineProps({plots:{type:Array,default:()=>[]},modelValue:{type:Array,default:()=>[]},excluded:{type:Array,default:()=>[]},readonly:Boolean})
const emit=defineEmits(['update:modelValue'])
const mapRef=ref(null),keyword=ref('')
const filtered=computed(()=>props.plots.filter(p=>!keyword.value || (p.name+' '+p.id).includes(keyword.value.trim())))
const selectedArea=computed(()=>props.plots.filter(p=>props.modelValue.includes(p.id)).reduce((s,p)=>s+Number(p.areaMu||0),0))
function toggle(plot){if(props.readonly||!plot.geometry||props.excluded.includes(plot.id))return;emit('update:modelValue',props.modelValue.includes(plot.id)?props.modelValue.filter(id=>id!==plot.id):[...props.modelValue,plot.id])}
function selectAll(){emit('update:modelValue',[...new Set([...props.modelValue,...filtered.value.filter(p=>p.geometry&&!props.excluded.includes(p.id)).map(p=>p.id)])])}
function render(fit=false){
  if(!mapRef.value)return
  mapRef.value.map?.invalidateSize()
  const geo={type:'FeatureCollection',features:props.plots.filter(p=>p.geometry).map(p=>({type:'Feature',properties:{id:p.id},geometry:p.geometry}))}
  mapRef.value.addGeoJSON('disaster-choice',geo,{style:f=>({color:props.excluded.includes(f.properties.id)?'#9aa6b2':props.modelValue.includes(f.properties.id)?'#df9022':'#168b76',fillOpacity:props.modelValue.includes(f.properties.id)?.5:.18,weight:2}),onEachFeature:(f,layer)=>{const p=props.plots.find(p=>p.id===f.properties.id);const tip=document.createElement('span');tip.textContent=p.name+' · '+p.areaMu+'亩';layer.bindTooltip(tip);layer.on('click',()=>toggle(p))}})
  const bounds=L.geoJSON(geo).getBounds();if(fit&&bounds.isValid())mapRef.value.fitBounds(bounds,[30,30])
}
watch(()=>props.plots,async()=>{await nextTick();render(true)},{deep:true})
watch(()=>props.modelValue,()=>render(),{deep:true})
onMounted(()=>nextTick(()=>render(true)))
</script>
<style scoped>.plot-picker{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:12px;width:100%;min-width:0}.plot-map{height:330px;position:relative;overflow:hidden;border:1px solid #dbe5ed;border-radius:9px}.map-caption{position:absolute;z-index:400;bottom:8px;left:8px;font-size:11px;padding:5px;background:#fffffff0;border-radius:4px}.plot-options{min-width:0;border:1px solid #dfe7ed;border-radius:9px;padding:10px}.tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;margin:8px 0}.plot-list{max-height:250px;overflow:auto}.plot-row{display:block;padding:8px 4px;border-bottom:1px solid #edf1f5}.plot-row.selected{background:#fff6e8}.plot-row small{display:block;color:#8290a0;margin:5px 0;font-size:11px}.plot-row .duplicate{color:#b07a28}.plot-row :deep(.el-checkbox){white-space:normal;height:auto;margin:0}.plot-row :deep(.el-checkbox__label){white-space:normal;word-break:break-word}@media(max-width:700px){.plot-picker{grid-template-columns:minmax(0,1fr)}.plot-map{height:230px}.plot-list{max-height:160px}}</style>
