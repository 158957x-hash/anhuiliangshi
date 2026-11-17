<template>
  <div class="compat-page"><el-empty description="进度入口已合并到“皖政通·粮食计划”" /><el-button type="primary" @click="$router.replace('/mobile/wzt-gpm')">进入粮食计划</el-button></div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
onMounted(() => router.replace('/mobile/wzt-gpm'))
</script>

<style scoped>
.compat-page{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#f5f7fa;padding:24px}
</style>
