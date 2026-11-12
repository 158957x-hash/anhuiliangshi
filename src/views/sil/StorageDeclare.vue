<template>
  <div class="page-container ordinary-storage">
    <div class="page-head"><div><h2>青贮饲料作物收储申报</h2><p>种植计划与收储信息一次填报、统一审核，备案后形成精确地块围栏。</p></div><el-tag type="success">整单申报</el-tag></div>
    <OrdinaryApplicationForm :application-id="String(route.query.id || '')" @saved="back" @cancel="back"/>
  </div>
</template>
<script setup>
import { useRoute, useRouter } from 'vue-router'
import OrdinaryApplicationForm from '@/components/sil/OrdinaryApplicationForm.vue'
const route = useRoute(), router = useRouter()
const back = () => router.push('/sil/declare')
</script>
<style scoped>.ordinary-storage{overflow:auto;max-width:1280px;margin:0 auto;width:100%;box-sizing:border-box}.page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}.page-head h2{font-size:22px;color:var(--ah-text);margin:0 0 9px}.page-head p{font-size:13px;color:var(--ah-text-secondary);margin:0;line-height:1.7}</style>
