<template>
  <div class="page-container sil-page">
    <div class="page-head"><div><h2>受灾作物补充收储上报</h2><p>受灾区域先由三名专家签字，之后该电子围栏内申报免再审核。</p></div><el-tag type="warning">专家签字后免审</el-tag></div>
    <div class="panel supplement-layout">
      <el-steps :active="step" align-center finish-status="success"><el-step title="受灾信息"/><el-step title="专家签字"/><el-step title="补充收储上报"/></el-steps>
      <el-form v-if="step === 0" :model="form" label-width="130px" class="supplement-form">
        <el-form-item label="受灾主体" required><el-select v-model="form.subjectId" style="width:100%"><el-option v-for="s in subjects" :key="s.id" :label="s.name" :value="s.id" /></el-select></el-form-item>
        <el-form-item label="受灾作物" required><el-select v-model="form.crop" style="width:100%"><el-option label="小麦" value="wheat"/><el-option label="玉米" value="corn"/></el-select></el-form-item>
        <el-form-item label="受灾面积（亩）" required><el-input-number v-model="form.affectedArea" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="损失面积（亩）" required><el-input-number v-model="form.lostArea" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="补充收储面积（亩）" required><el-input-number v-model="form.supplementArea" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="受灾电子围栏" required><el-button type="primary" plain @click="goFence">手动划分受灾电子围栏</el-button><el-tag v-if="form.fenceId" type="success">已关联 {{ form.fenceId }}</el-tag></el-form-item>
        <div class="actions"><el-button type="primary" @click="step = 1">进入三名专家签字</el-button></div>
      </el-form>
      <div v-else-if="step === 1" class="expert-panel"><el-alert title="三名专家必须全部完成签字后，电子围栏内收储申报才进入免审生效。" type="info" :closable="false" show-icon /><div v-for="(expert,index) in experts" :key="expert.name" class="expert-row"><div><b>{{ index + 1 }}. {{ expert.name }}</b><span>{{ expert.unit }}</span></div><el-tag :type="expert.signed ? 'success' : 'warning'">{{ expert.signed ? `已签字 ${expert.signedAt}` : '待签字' }}</el-tag><el-button v-if="!expert.signed" size="small" @click="signExpert(index)">电子签字</el-button></div><div class="actions"><el-button @click="step = 0">返回修改</el-button><el-button type="primary" :disabled="experts.some((x) => !x.signed)" @click="step = 2">进入免审申报</el-button></div></div>
      <el-form v-else :model="form" label-width="130px" class="supplement-form"><el-alert title="已完成三名专家签字，本电子围栏内的补充收储申报无需再次审核。" type="success" :closable="false" show-icon /><el-form-item label="收储主体" required><el-select v-model="form.subjectId" style="width:100%"><el-option v-for="s in subjects" :key="s.id" :label="s.name" :value="s.id" /></el-select></el-form-item><el-form-item label="收储重量（吨）" required><el-input-number v-model="form.weight" :min="0" style="width:100%" /></el-form-item><el-form-item label="免审电子围栏" required><el-input v-model="form.fenceId" disabled /></el-form-item><div class="actions"><el-button @click="step = 1">返回专家签字</el-button><el-button type="primary" @click="submit">提交免审收储申报</el-button></div></el-form>
    </div>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchSilSubjects, submitSupplementDeclaration } from '@/api/sil'
import { useUserStore } from '@/stores/user'
const userStore = useUserStore(); const step = ref(0); const subjects = ref([]); const form = reactive({ subjectId: userStore.role?.subjectId || '', crop: 'wheat', affectedArea: 0, lostArea: 0, supplementArea: 0, fenceId: '', weight: 0 }); const experts = reactive([{ name: '张海', unit: '省农业专家组', signed: false, signedAt: '' }, { name: '李蓉', unit: '市农业专家组', signed: false, signedAt: '' }, { name: '王磊', unit: '县农业专家组', signed: false, signedAt: '' }]); const signExpert = (index) => { experts[index].signed = true; experts[index].signedAt = new Date().toLocaleString('zh-CN', { hour12: false }) }; const goFence = () => { form.fenceId = '受灾围栏-' + Date.now().toString().slice(-4); ElMessage.success('已完成受灾电子围栏圈选并生成精确围栏编号') }; const submit = async () => { if (!form.subjectId || !form.fenceId || !form.weight) return ElMessage.warning('请补齐收储主体、免审围栏和收储重量'); const result = await submitSupplementDeclaration({ ...form, exemptAudit: true, declarationType: 'supplement', year: 2026 }, userStore.role); if (!result.success) return ElMessage.error(result.message); ElMessage.success('免审补充收储已生效'); step.value = 0 }; onMounted(async () => { subjects.value = await fetchSilSubjects(userStore.role); if (!form.subjectId) form.subjectId = subjects.value[0]?.id || '' })
</script>
<style scoped lang="scss">.sil-page{overflow:auto}.page-head{display:flex;justify-content:space-between;margin-bottom:14px}.page-head h2{margin:4px 0;color:var(--ah-text);font-size:22px}.page-head p{color:var(--ah-text-secondary);font-size:13px}.supplement-layout{max-width:900px}.supplement-form{max-width:720px;margin:28px auto 0}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.expert-panel{max-width:720px;margin:28px auto}.expert-row{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #edf1f5}.expert-row>div{flex:1}.expert-row span{margin-left:10px;color:#8492a6;font-size:12px}</style>
