<template>
  <div class="page-container sil-page"><div class="page-head"><div><h2>作物字典维护</h2><p>项目内维护青贮作物字典；正式内容以二包共享字典确认为准。</p></div><el-tag type="info">项目字典</el-tag></div><div class="panel"><el-table :data="rows" border stripe><el-table-column prop="code" label="编码" width="180"/><el-table-column prop="name" label="作物名称" width="220"/><el-table-column prop="source" label="来源说明"/><el-table-column label="启用状态" width="120"><template #default="{row}"><el-switch v-model="row.enabled" /></template></el-table-column></el-table><div class="actions"><el-button type="primary" @click="save">保存字典</el-button></div></div></div>
</template>
<script setup>
import { ref } from 'vue'; import { ElMessage } from 'element-plus'; import { readSilCropDict, writeSilCropDict } from '@/mock/sil/crops'
const rows=ref(readSilCropDict()); const save=()=>{ writeSilCropDict(rows.value); ElMessage.success('作物字典已保存') }
</script>
<style scoped lang="scss">.sil-page{overflow:auto}.page-head{display:flex;justify-content:space-between;margin-bottom:14px}.page-head h2{margin:4px 0;color:var(--ah-text);font-size:22px}.page-head p{color:var(--ah-text-secondary);font-size:13px}.actions{display:flex;justify-content:flex-end;margin-top:16px}</style>
