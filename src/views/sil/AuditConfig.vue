<template>
  <div class="page-container sil-page">
    <header class="page-head"><h2>审核流程配置</h2><p>种植计划和收储信息统一审核；退回补正后重新提交，审核期限重新计算。</p></header>
    <section class="panel config-panel">
      <el-form :model="config" label-position="top" class="config-form">
        <el-form-item label="普通收储申报审核期限（天）"><el-input-number v-model="config.storageDays" :min="1" :max="365" :step="1" :precision="0" /><div class="field-hint">适用于整份青贮饲料作物收储申报。</div></el-form-item>
        <el-form-item label="首次计时起点"><el-tag>整单发起时间</el-tag></el-form-item>
        <el-form-item label="补正重提计时"><el-tag type="warning">以本次重新提交时间重新计算</el-tag></el-form-item>
        <el-form-item label="受灾作物补充收储上报"><el-tag type="success">保留三名专家签字后的免审流程</el-tag></el-form-item>
      </el-form>
      <div class="actions"><el-button @click="reset">恢复默认</el-button><el-button type="primary" @click="save">保存配置</el-button></div>
    </section>
  </div>
</template>
<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
const KEY = 'ah_sil_audit_config'
const defaults = { storageDays: 10 }
const read = () => { try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); return { storageDays: Number(saved.storageDays) || defaults.storageDays } } catch { return { ...defaults } } }
const config = reactive(read())
const save = () => { if (!Number.isInteger(config.storageDays) || config.storageDays < 1 || config.storageDays > 365) return ElMessage.warning('审核期限请输入1至365之间的整数'); localStorage.setItem(KEY, JSON.stringify({ storageDays: config.storageDays })); ElMessage.success('普通申报审核期限已保存') }
const reset = () => { Object.assign(config, defaults); save() }
</script>
<style scoped lang="scss">.sil-page{overflow:auto}.page-head{margin-bottom:16px}.page-head h2{margin:4px 0 8px;color:var(--ah-text);font-size:22px}.page-head p{color:var(--ah-text-secondary);font-size:13px;line-height:1.7}.config-panel{max-width:780px}.config-form{max-width:580px}.config-form :deep(.el-form-item){margin-bottom:24px}.field-hint{margin-left:12px;color:#8492a6;font-size:12px}.actions{display:flex;justify-content:flex-end;gap:8px}@media(max-width:600px){.field-hint{width:100%;margin-left:0;margin-top:6px}}</style>
