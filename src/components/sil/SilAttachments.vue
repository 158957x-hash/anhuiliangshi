<template>
  <div class="attachments">
    <label v-if="editable" class="file-add">＋ 选择附件<input type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx" @change="add"/></label>
    <small v-if="editable">原型本地预览，单个文件不超过8MB。</small>
    <div v-for="(file,index) in modelValue" :key="index" class="file-row"><span>{{ file.name }}</span><el-button link type="primary" @click="preview(file)">查看</el-button><a v-if="file.dataUrl" :href="file.dataUrl" :download="file.name">下载</a><el-button v-if="editable" link type="danger" @click="$emit('update:modelValue',modelValue.filter((_,i)=>i!==index))">移除</el-button></div>
    <span v-if="!modelValue.length" class="empty-text">暂无附件</span>
    <el-dialog v-model="visible" :title="current?.name || '附件'" width="min(850px,95vw)" append-to-body destroy-on-close><img v-if="current?.type?.startsWith('image/') || current?.dataUrl?.startsWith('data:image/')" :src="current.dataUrl" class="preview-image"/><iframe v-else-if="current?.type==='application/pdf'" :src="current.dataUrl" title="PDF附件" class="preview-pdf"/><pre v-else-if="textPreview">{{ textPreview }}</pre><el-alert v-else title="该格式请下载后查看。" type="info" :closable="false"/></el-dialog>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { disasterFiles } from '@/api/silDisaster'
const props=defineProps({modelValue:{type:Array,default:()=>[]},editable:Boolean})
const emit=defineEmits(['update:modelValue'])
const current=ref(null),visible=ref(false),textPreview=ref('')
async function preview(file){current.value=file;visible.value=true;textPreview.value='';if(file?.dataUrl?.startsWith('data:text/')){try{textPreview.value=await (await fetch(file.dataUrl)).text()}catch{ElMessage.error('附件预览失败，请下载查看')}}}
async function add(e){try{const files=await disasterFiles(e.target.files||[]);emit('update:modelValue',[...props.modelValue,...files])}catch(error){ElMessage.error(error.message)}e.target.value=''}
</script>
<style scoped>.attachments{width:100%;min-width:0}.file-add{display:inline-block;padding:8px 12px;border:1px solid #cfdce6;border-radius:6px;color:#167a68;cursor:pointer}.file-add input{display:none}.attachments small{display:block;color:#8996a5;margin:7px 0}.file-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #edf0f3;flex-wrap:wrap}.file-row>span{flex:1;min-width:80px;overflow-wrap:anywhere;font-size:13px}.file-row a{font-size:13px;color:#168b76}.empty-text{font-size:12px;color:#8996a5}.preview-image{display:block;max-width:100%;max-height:65vh;margin:auto}.preview-pdf{width:100%;height:65vh;border:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8}</style>
