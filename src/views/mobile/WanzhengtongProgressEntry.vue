<template>
  <div class="entry-page">
    <section class="context-card">
      <div class="context-title"><b>进度填报</b><el-tag size="small" type="warning">填写页</el-tag></div>
      <p>先选择本级已上报计划，再填写对应的播种或收获进度。</p>
    </section>

    <section class="form-card">
      <el-form label-position="top">
        <el-form-item label="上报计划">
          <el-select v-model="form.planKey" style="width:100%" placeholder="请选择本级已上报计划" @change="selectPlan">
            <el-option v-for="item in planOptions" :key="item.id" :label="`${item.year}年${item.quarter} · ${item.cropName || item.crop} · ${item.planName}`" :value="item.id" />
          </el-select>
        </el-form-item>
        <template v-if="selectedPlan">
          <div class="plan-context">
            <div><span>计划</span><b>{{ selectedPlan.planName }}</b></div>
            <div><span>作物</span><b>{{ selectedPlan.cropName || selectedPlan.crop }}</b></div>
            <div><span>计划面积</span><b>{{ Number(selectedPlan.planArea || 0).toLocaleString() }} 亩</b></div>
            <div><span>计划状态</span><el-tag size="small" type="success">{{ selectedPlan.reportStatus || '已上报' }}</el-tag></div>
          </div>
          <el-form-item label="填报类型">
            <div class="type-switch"><button :class="{active: form.type === 'sow'}" @click.prevent="form.type = 'sow'">播种</button><button :class="{active: form.type === 'harvest'}" @click.prevent="form.type = 'harvest'">收获</button></div>
          </el-form-item>
          <el-form-item :label="form.type === 'sow' ? '已播面积（亩）' : '已收获面积（亩）'">
            <el-input-number v-model="form.doneArea" :min="0" :max="Number(selectedPlan.planArea || 0)" :precision="1" controls-position="right" style="width:100%" />
          </el-form-item>
          <div class="limit-tip">最多不能超过该计划面积：{{ Number(selectedPlan.planArea || 0).toLocaleString() }} 亩</div>
          <el-button type="primary" class="full-button" :loading="saving" @click="save">保存</el-button>
        </template>
        <el-empty v-else description="暂无可填报的本级上报计划，请先完成计划上报" :image-size="60" />
      </el-form>
    </section>

    <button class="record-link" @click="$emit('go-records')">查看上报记录</button>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchProgressPlanOptions, saveSowingProgress, saveHarvestProgress } from '@/api/gpm'

const emit = defineEmits(['go-records'])
const userStore = useUserStore()
const year = 2026
const quarter = '第三季度'
const planOptions = ref([])
const saving = ref(false)
const form = reactive({ planKey: '', type: 'sow', doneArea: 0 })
const selectedPlan = computed(() => planOptions.value.find(item => item.id === form.planKey) || null)

const load = async () => {
  planOptions.value = await fetchProgressPlanOptions(userStore.role, { year, quarter, type: form.type })
  if (!selectedPlan.value) form.planKey = planOptions.value[0]?.id || ''
  if (selectedPlan.value) form.doneArea = Number(selectedPlan.value.doneArea || 0)
}
const selectPlan = () => { form.doneArea = Number(selectedPlan.value?.doneArea || 0) }
const save = async () => {
  if (!selectedPlan.value) return ElMessage.warning('请先选择本级已上报计划')
  const doneArea = Number(form.doneArea || 0)
  const planArea = Number(selectedPlan.value.planArea || 0)
  if (doneArea < 0 || doneArea > planArea) return ElMessage.warning('填报面积不能超过计划面积')
  saving.value = true
  const payload = {
    planId: selectedPlan.value.planId,
    planName: selectedPlan.value.planName,
    regionCode: selectedPlan.value.regionCode,
    regionName: selectedPlan.value.regionName,
    crop: selectedPlan.value.crop || selectedPlan.value.cropName,
    cropName: selectedPlan.value.cropName || selectedPlan.value.crop,
    planArea,
    year: selectedPlan.value.year,
    quarter: selectedPlan.value.quarter,
    ...(form.type === 'sow' ? { sownArea: doneArea } : { harvestedArea: doneArea })
  }
  const result = form.type === 'sow' ? await saveSowingProgress(payload, userStore.role) : await saveHarvestProgress(payload, userStore.role)
  saving.value = false
  if (!result.success) return ElMessage.error(result.message || '保存失败')
  ElMessage.success('进度已保存，可到上报记录提交')
  await load()
}
watch(() => form.type, load)
onMounted(load)
</script>

<style lang="scss" scoped>
.entry-page{padding:0 2px}.context-card,.form-card{background:#fff;border-radius:14px;padding:15px;margin-bottom:12px}.context-card{border:1px solid #d6eee5;background:#f8fcfa}.context-title{display:flex;align-items:center;justify-content:space-between;color:#176b58}.context-card p{margin:7px 0 0;color:#667085;font-size:12px;line-height:1.5}.form-card :deep(.el-form-item){margin-bottom:15px}.plan-context{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:11px;margin-bottom:15px;background:#f4f8fb;border-radius:10px}.plan-context div{min-width:0}.plan-context span,.plan-context b{display:block}.plan-context span{color:#98a2b3;font-size:11px}.plan-context b{margin-top:3px;color:#243b5a;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.type-switch{display:flex;gap:8px;width:100%}.type-switch button{flex:1;border:1px solid #d9e2ec;border-radius:8px;background:#fff;color:#667085;padding:10px}.type-switch button.active{border-color:#2d8c72;background:#eaf6f1;color:#176b58;font-weight:600}.limit-tip{margin:-5px 0 12px;color:#98a2b3;font-size:11px}.full-button{width:100%}.record-link{width:100%;border:0;background:#fff;border-radius:12px;padding:12px;color:#2d8c72;font-size:13px}
</style>
