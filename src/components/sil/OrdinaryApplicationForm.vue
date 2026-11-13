<template>
  <div class="application-form" :class="{ mobile }" v-loading="loading">
    <template v-if="mobile">
      <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon/>
      <el-alert v-else-if="readOnly" title="该申报仅可查看，退回补正后才能编辑。" type="info" :closable="false" show-icon />
      <el-alert v-if="loaded?.status === 'returned'" :title="'退回意见：' + returnOpinion" type="warning" :closable="false" show-icon />
      <div class="mobile-stepbar"><button v-for="item in mobileSteps" :key="item.no" :class="{active: mobileStep === item.no, done: mobileStep > item.no}" @click="jumpMobileStep(item.no)"><b>{{ item.no }}</b><span>{{ item.title }}</span></button></div>
      <section v-if="mobileStep === 1" class="form-section mobile-section">
        <div class="section-title"><span class="step-num">01</span><div><h3>确认申报主体</h3><p>申报单位固定为当前登录用户；种植主体可多选。</p></div></div>
        <div class="identity-grid"><div><span>申报单位</span><b>{{ applicant.unit }}</b></div><div><span>申报人</span><b>{{ applicant.name }}</b></div><div><span>角色</span><b>{{ applicant.roleName }}</b></div></div>
        <el-form label-position="top">
          <el-form-item label="收储主体" required><el-select v-model="form.storageSubjectId" filterable placeholder="请选择收储主体" :disabled="readOnly"><el-option v-for="s in storageSubjects" :key="s.id" :label="`${s.name}（${typeName(s.type)}）`" :value="s.id"/></el-select></el-form-item>
          <el-form-item label="种植主体（可多选）" required><div v-if="!readOnly" class="subject-filter-grid"><el-input v-model="subjectFilters.keyword" placeholder="名称/编号" clearable/><el-input v-model="subjectFilters.owner" placeholder="负责人" clearable/><el-input v-model="subjectFilters.region" placeholder="区域/区划代码" clearable/><el-select v-model="subjectFilters.type" placeholder="主体类型" clearable><el-option label="合作社" value="cooperative"/><el-option label="家庭农场" value="family_farm"/><el-option label="种植大户" value="big_household"/><el-option label="农业企业" value="enterprise"/></el-select><el-button type="primary" :loading="subjectLoading" @click="queryMobileSubjects">查询</el-button><el-button @click="resetSubjectFilters">重置条件</el-button></div><el-alert v-if="subjectError" :title="subjectError" type="error" :closable="false"/><div v-if="!readOnly" v-loading="subjectLoading" class="mobile-subject-list"><el-checkbox-group :model-value="form.plantingSubjectIds" @change="changePlantingSubjects"><el-checkbox v-for="s in plantingSubjects" :key="s.id" :label="s.id"><span>{{ s.name }}</span><small>{{ s.owner }} · {{ s.regionName || s.regionCode }}</small></el-checkbox></el-checkbox-group><el-empty v-if="!subjectLoading && !plantingSubjects.length" description="暂无匹配种植主体" :image-size="45"/></div><div class="mobile-selected-subjects"><span>已选 {{ form.plantingSubjectIds.length }} 个种植主体</span><el-tag v-for="id in form.plantingSubjectIds" :key="id" :closable="!readOnly" @close="changePlantingSubjects(form.plantingSubjectIds.filter(value => value !== id))">{{ subjectName(id) }}</el-tag></div></el-form-item>
          <el-form-item label="本次申报联系人" required><el-input v-model="form.applicantContact" :disabled="readOnly"/></el-form-item><el-form-item label="联系方式" required><el-input v-model="form.applicantPhone" :disabled="readOnly" maxlength="20"/></el-form-item>
        </el-form>
      </section>
      <section v-else-if="mobileStep === 2" class="form-section mobile-section">
        <div class="section-title"><span class="step-num">02</span><div><h3>选择收储地块</h3><p>仅显示已选种植主体名下的地块，支持地图和列表批量选择。</p></div></div>
        <el-form label-position="top" class="two-col"><el-form-item label="计划年度" required><el-date-picker v-model="form.year" type="year" value-format="YYYY" placeholder="选择计划年度" :disabled="readOnly"/></el-form-item><el-form-item label="计划季节"><el-input v-model="form.season" disabled/></el-form-item><el-form-item label="计划实施时间"><el-date-picker v-model="form.implementationTime" type="month" value-format="YYYY-MM" placeholder="选择月份" :disabled="readOnly"/></el-form-item></el-form>
        <div class="mobile-selected-subjects"><span>已选种植主体</span><el-tag v-for="id in form.plantingSubjectIds" :key="id" size="small">{{ subjectName(id) }}</el-tag></div>
        <el-button type="primary" class="mobile-map-button" :disabled="readOnly || !form.plantingSubjectIds.length" @click="picker?.open(form.plotDetails, form.plantingSubjectIds)">按图批量选择地块</el-button>
        <div v-if="form.plotDetails.length && !readOnly" class="batch-fields"><span>批量填写</span><el-select v-model="batch.crop" placeholder="作物" clearable><el-option v-for="c in crops" :key="c.code" :label="c.name" :value="c.code"/></el-select><el-input v-model="batch.variety" placeholder="品种"/><el-button @click="applyBatch">应用至已选地块</el-button></div>
        <article v-for="(p,index) in form.plotDetails" :key="p.plotId" class="plot-card"><div class="plot-card-head"><div><h4>{{ index + 1 }}. {{ p.name }}</h4><small>{{ p.plotId }} · {{ p.subjectName }} · {{ Number(p.areaMu || 0).toFixed(1) }} 亩</small></div><el-button v-if="!readOnly" link type="danger" @click="removePlot(p.plotId)">移除</el-button></div><el-form label-position="top" class="detail-grid"><el-form-item label="作物" required><el-select v-model="p.crop" :disabled="readOnly"><el-option v-for="c in crops" :key="c.code" :label="c.name" :value="c.code"/></el-select></el-form-item><el-form-item label="品种" required><el-input v-model="p.variety" :disabled="readOnly"/></el-form-item><el-form-item label="预计产量（吨）" required><el-input-number v-model="p.expectedYield" :disabled="readOnly" :min="0" :precision="2" :controls="false"/></el-form-item><el-form-item label="预计收储价格（元/吨）"><el-input-number v-model="p.expectedPrice" :disabled="readOnly" :min="0" :precision="2" :controls="false"/></el-form-item><el-form-item label="预计收储重量（吨）"><el-input-number v-model="p.expectedWeight" :disabled="readOnly" :min="0" :precision="2" :controls="false"/></el-form-item></el-form></article><el-empty v-if="!form.plotDetails.length" description="请先按图选择地块" :image-size="55"/>
      </section>
      <section v-else class="form-section mobile-section"><div class="section-title"><span class="step-num">03</span><div><h3>附件与承诺</h3><p>合同、订单和电子承诺书随整单提交。</p></div></div><el-form label-position="top"><el-form-item label="收储用途" required><el-radio-group v-model="form.usage" :disabled="readOnly"><el-radio label="self">自用</el-radio><el-radio label="sell">出售</el-radio></el-radio-group></el-form-item><el-form-item v-if="form.usage === 'sell'" label="订单/合同附件" required><el-upload v-if="!readOnly" action="#" :auto-upload="false" :show-file-list="false" :on-change="onFile"><el-button>上传合同/订单</el-button></el-upload><div v-for="(f,index) in form.attachments" :key="f.name + index" class="attachment-row"><span>{{ f.name }}</span><el-button link type="primary" @click="previewFile(f)">预览</el-button><el-button v-if="!readOnly" link type="danger" @click="removeAttachment(index)">删除</el-button></div></el-form-item></el-form><div class="promise-state"><div><b>{{ form.promise.content ? '电子承诺书' : '尚未填写承诺书' }}</b><small>{{ form.promise.signedAt ? form.promise.signer + ' · ' + form.promise.signedAt : '未签署' }}</small></div><el-tag :type="form.promise.signedAt ? 'success' : 'warning'">{{ form.promise.signedAt ? '已签署' : '待签署' }}</el-tag></div><div class="promise-actions"><el-button @click="editPromise">查看/编辑</el-button><el-button v-if="!readOnly" :disabled="!form.promise.content" @click="deletePromise">删除</el-button><el-button v-if="!readOnly" :disabled="!form.promise.content" type="primary" plain @click="signPromise">电子签名</el-button></div><div class="mobile-summary"><b>申报摘要</b><p>{{ applicant.unit }} · {{ storageSubject?.name || '未选择收储主体' }}</p><p>{{ form.plantingSubjectIds.length }} 个种植主体 · {{ form.plotDetails.length }} 块地 · {{ totals.area.toFixed(1) }} 亩</p></div></section>
      <div class="form-footer mobile-footer"><el-button @click="$emit('cancel')">返回列表</el-button><el-button v-if="mobileStep > 1" @click="setMobileStep(mobileStep - 1)">上一步</el-button><el-button v-if="!readOnly" :loading="busy" @click="save(false)">保存草稿</el-button><el-button v-if="mobileStep < 3 && !loadError" type="primary" :disabled="loading || busy" @click="nextMobileStep">下一步</el-button><el-button v-if="mobileStep === 3 && !readOnly" type="primary" :loading="busy" @click="save(true)">{{ form.id && loaded?.status === 'returned' ? '补正后重新提交' : '提交整份申报' }}</el-button></div>
    </template>
    <template v-else>
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon/>
    <el-alert v-else-if="readOnly" title="该申报仅可查看，退回补正后才能编辑。" type="info" :closable="false" show-icon />
    <el-alert v-if="loaded?.status === 'returned'" :title="'退回意见：' + returnOpinion" type="warning" :closable="false" show-icon />
    <section class="form-section">
      <div class="section-title"><span class="step-num">01</span><div><h3>申报用户与收储主体</h3><p>记录实际申报用户，收储主体从独立档案中选择。</p></div></div>
      <div class="identity-grid"><div><span>申报用户</span><b>{{ applicant.name }}</b></div><div><span>所属单位</span><b>{{ applicant.unit }}</b></div><div><span>操作身份</span><b>{{ applicant.roleName }}</b></div></div>
      <el-form label-position="top" class="two-col">
        <el-form-item label="收储主体" required class="full"><el-select v-model="form.storageSubjectId" filterable placeholder="请选择收储主体" :disabled="readOnly"><el-option v-for="s in storageSubjects" :key="s.id" :label="s.name" :value="s.id"/></el-select></el-form-item>
        <el-form-item label="本次申报联系人" required><el-input v-model="form.applicantContact" :disabled="readOnly" placeholder="填写联系人姓名"/></el-form-item>
        <el-form-item label="联系方式" required><el-input v-model="form.applicantPhone" :disabled="readOnly" placeholder="填写联系电话" maxlength="20"/></el-form-item>
      </el-form>
      <div v-if="storageSubject" class="subject-summary"><b>{{ storageSubject.name }}</b><span>{{ storageSubject.typeName || typeName(storageSubject.type) }} · {{ storageSubject.regionName || storageSubject.regionCode }}</span><span>负责人：{{ storageSubject.owner || storageSubject.contact || '—' }}　联系方式：{{ storageSubject.phone || '—' }}</span></div>
    </section>
    <section class="form-section">
      <div class="section-title"><span class="step-num">02</span><div><h3>种植计划与收储地块</h3><p>搜索种植主体后批量选地，按地块填写种植及预计收储信息。</p></div></div>
      <el-form label-position="top" class="two-col"><el-form-item label="计划年度" required><el-date-picker v-model="form.year" type="year" value-format="YYYY" placeholder="选择计划年度" :disabled="readOnly"/></el-form-item><el-form-item label="计划季节"><el-input v-model="form.season" disabled/></el-form-item><el-form-item label="计划实施时间"><el-date-picker v-model="form.implementationTime" type="month" value-format="YYYY-MM" placeholder="选择计划实施月份" :disabled="readOnly"/></el-form-item></el-form>
      <div class="plot-actions"><el-button type="primary" :disabled="readOnly" @click="picker?.open(form.plotDetails)">按图批量选择地块</el-button><span>已选 {{ form.plotDetails.length }} 块 / {{ totals.area.toFixed(1) }} 亩</span></div>
      <div v-if="form.plotDetails.length && !readOnly" class="batch-fields"><span>批量填写</span><el-select v-model="batch.crop" placeholder="作物" clearable><el-option v-for="c in crops" :key="c.code" :label="c.name" :value="c.code"/></el-select><el-input v-model="batch.variety" placeholder="品种（可留空）"/><el-button @click="applyBatch">应用至已选地块</el-button></div>
      <div class="plot-details">
        <article v-for="(p, index) in form.plotDetails" :key="p.plotId" class="plot-card">
          <div class="plot-card-head"><div><h4>{{ index + 1 }}. {{ p.name }}</h4><small>{{ p.plotId }} · {{ p.subjectName }} · {{ Number(p.areaMu || 0).toFixed(1) }} 亩</small></div><el-button v-if="!readOnly" link type="danger" @click="removePlot(p.plotId)">移除</el-button></div>
          <el-form label-position="top" class="detail-grid">
            <el-form-item label="种植作物" required><el-select v-model="p.crop" :disabled="readOnly" placeholder="选择作物"><el-option v-for="c in crops" :key="c.code" :label="c.name" :value="c.code"/></el-select></el-form-item>
            <el-form-item label="种植品种" required><el-input v-model="p.variety" :disabled="readOnly" placeholder="填写品种"/></el-form-item>
            <el-form-item label="预计产量（吨）" required><el-input-number v-model="p.expectedYield" :disabled="readOnly" :min="0" :precision="2" :controls="false" placeholder="填写产量"/></el-form-item>
            <el-form-item label="预计收储价格（元/吨）"><el-input-number v-model="p.expectedPrice" :disabled="readOnly" :min="0" :precision="2" :controls="false" placeholder="选填"/></el-form-item>
            <el-form-item label="预计收储重量（吨）"><el-input-number v-model="p.expectedWeight" :disabled="readOnly" :min="0" :precision="2" :controls="false" placeholder="选填"/></el-form-item>
          </el-form>
        </article>
        <el-empty v-if="!form.plotDetails.length" description="尚未选择地块，请先搜索种植主体并按图选地" :image-size="60"/>
      </div>
      <div class="totals"><div><b>{{ totals.area.toFixed(1) }}</b><span>计划面积（亩）</span></div><div><b>{{ totals.yield.toFixed(1) }}</b><span>预计产量（吨）</span></div><div><b>{{ totals.weightCount ? totals.weight.toFixed(1) : '—' }}</b><span>已填预计收储重量（吨）</span></div><div><b>{{ totals.amountCount ? totals.amount.toFixed(2) : '—' }}</b><span>已填预计金额（元）</span></div></div>
      <p class="field-note">预计收储价格、重量暂为选填；总量只汇总已填值，金额仅汇总同时填写价格和重量的地块。</p>
    </section>
    <section class="form-section">
      <div class="section-title"><span class="step-num">03</span><div><h3>收储用途与证明材料</h3><p>种植计划与收储信息随整份申报一起提交审核。</p></div></div>
      <el-form label-position="top"><el-form-item label="收储用途" required><el-radio-group v-model="form.usage" :disabled="readOnly"><el-radio label="self">自用</el-radio><el-radio label="sell">出售</el-radio></el-radio-group></el-form-item>
      <el-form-item v-if="form.usage === 'sell'" label="订单/合同附件" required><div class="attachment-block"><el-upload v-if="!readOnly" action="#" :auto-upload="false" :show-file-list="false" :on-change="onFile" :disabled="busy"><el-button>选择订单/合同</el-button></el-upload><div v-for="(f,index) in form.attachments" :key="f.name + '-' + index" class="attachment-row"><span>{{ f.name }}</span><div><el-button link type="primary" @click="previewFile(f)">预览</el-button><el-button v-if="!readOnly" link type="danger" @click="removeAttachment(index)">删除</el-button></div></div><p class="field-note">选中文件后可预览和删除；出售用途提交时至少保留一份订单或合同。</p></div></el-form-item></el-form>
    </section>
    <section class="form-section">
      <div class="section-title"><span class="step-num">04</span><div><h3>电子承诺书</h3><p>提交前完成电子签名，修改文档后需重新签署。</p></div></div>
      <div class="promise-state"><div><b>{{ form.promise.content ? '承诺书 ' + form.promise.version : '尚未编辑承诺书' }}</b><small>{{ form.promise.signedAt ? form.promise.signer + ' · ' + form.promise.signedAt : '未签署' }}</small></div><el-tag :type="form.promise.signedAt ? 'success' : 'warning'">{{ form.promise.signedAt ? '已签署' : '待签署' }}</el-tag></div>
      <div class="promise-actions"><el-button @click="editPromise">{{ readOnly ? '查看承诺书' : '查看/编辑' }}</el-button><el-button v-if="!readOnly" :disabled="!form.promise.content" @click="deletePromise">删除</el-button><el-button v-if="!readOnly" type="primary" plain :disabled="!form.promise.content" @click="signPromise">电子签名</el-button></div>
    </section>
    <div class="form-footer"><el-button @click="$emit('cancel')">返回列表</el-button><template v-if="!readOnly"><el-button :loading="busy" @click="save(false)">保存草稿</el-button><el-button type="primary" :loading="busy" @click="save(true)">{{ form.id && loaded?.status === 'returned' ? '补正后重新提交' : '提交整份申报' }}</el-button></template></div>
    </template>
    <OrdinaryPlotPicker ref="picker" @confirm="applyPlots"/>
    <el-dialog v-model="promiseVisible" title="电子承诺书" :width="mobile ? '95%' : '640px'" append-to-body><el-input v-model="promiseDraft" type="textarea" :rows="9" :disabled="readOnly"/><template #footer><el-button @click="promiseVisible=false">取消</el-button><el-button v-if="!readOnly" type="primary" @click="savePromise">保存文档</el-button></template></el-dialog>
    <el-dialog v-model="previewVisible" :title="preview.name" :width="mobile ? '95%' : '900px'" append-to-body><img v-if="preview.type?.startsWith('image/')" :src="preview.url" class="file-preview-image"/><iframe v-else-if="preview.type === 'application/pdf'" :src="preview.url" class="file-preview-frame" title="附件预览"/><div v-else-if="previewText" class="file-preview-text">{{ previewText }}</div><el-result v-else icon="info" title="已选择附件" :sub-title="preview.name + '，该格式暂无内嵌预览，可打开原文件查看。'"/><template #footer><el-button @click="previewVisible=false">关闭</el-button><a v-if="preview.url" :href="preview.url" :download="preview.name" class="el-button el-button--primary">下载查看</a></template></el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { enabledSilCrops } from '@/mock/sil/crops'
import { useUserStore } from '@/stores/user'
import { fetchStorageSubjects, fetchPlantingSubjects, fetchOrdinaryApplication, saveOrdinaryApplication, canSubmitOrdinary, isOrdinaryOwner } from '@/api/silOrdinary'
import OrdinaryPlotPicker from './OrdinaryPlotPicker.vue'

const props = defineProps({ applicationId: { type: String, default: '' }, mobile: Boolean, viewOnly: Boolean })
const emit = defineEmits(['saved', 'cancel'])
const userStore = useUserStore(), storageSubjects = ref([]), plantingSubjects = ref([]), loaded = ref(null), loading = ref(false), busy = ref(false), picker = ref(null), loadError = ref('')
const subjectLoading = ref(false), subjectError = ref(''), mobileStep = ref(1), subjectFilters = reactive({ keyword: '', owner: '', region: '', type: '' })
const knownSubjects = ref(new Map())
const mobileSteps = [{ no: 1, title: '主体' }, { no: 2, title: '地块' }, { no: 3, title: '附件' }]
const crops = ref(enabledSilCrops()), promiseVisible = ref(false), promiseDraft = ref(''), previewVisible = ref(false), preview = ref({}), previewText = ref('')
const clone = value => JSON.parse(JSON.stringify(value))
const empty = () => ({ id: '', storageSubjectId: '', plantingSubjectIds: [], applicantContact: userStore.role?.name || '', applicantPhone: '', year: String(new Date().getFullYear() + 1), season: '春夏季', implementationTime: '', usage: 'self', plotDetails: [], attachments: [], promise: { content: '本人承诺本次青贮饲料作物收储申报信息真实、准确，种植计划、收储信息及相关证明材料与申报内容一致，并承担相应责任。', version: 'V1.0', signedAt: '', signer: '' } })
const form = reactive(empty())
const batch = reactive({ crop: '', variety: '' })
const applicant = computed(() => loaded.value?.applicant || userStore.role || {})
const readOnly = computed(() => !!loadError.value || props.viewOnly || !canSubmitOrdinary(userStore.role) || (!!loaded.value && (!['draft', 'returned'].includes(loaded.value.status) || !isOrdinaryOwner(loaded.value, userStore.role))))
const storageSubject = computed(() => storageSubjects.value.find(s => s.id === form.storageSubjectId))
const returnOpinion = computed(() => [...(loaded.value?.auditTrail || [])].reverse().find(t => t.opinion)?.opinion || '请查看审核记录并补正原单')
const subjectName = id => knownSubjects.value.get(id)?.name || form.plotDetails.find(plot => plot.subjectId === id)?.subjectName || id
let subjectQueryVersion = 0
async function queryMobileSubjects() {
  const version = ++subjectQueryVersion
  subjectLoading.value = true; subjectError.value = ''
  try {
    const rows = await fetchPlantingSubjects({ ...subjectFilters }, userStore.role)
    if (version !== subjectQueryVersion) return
    plantingSubjects.value = rows
    rows.forEach(row => knownSubjects.value.set(row.id, row))
  } catch { if (version === subjectQueryVersion) { plantingSubjects.value = []; subjectError.value = '种植主体查询失败，请重试' } }
  finally { if (version === subjectQueryVersion) subjectLoading.value = false }
}
function resetSubjectFilters() { Object.assign(subjectFilters, { keyword: '', owner: '', region: '', type: '' }); queryMobileSubjects() }
async function changePlantingSubjects(ids) {
  if (readOnly.value) return
  const outside = form.plotDetails.filter(plot => !ids.includes(plot.subjectId))
  if (outside.length) {
    try { await ElMessageBox.confirm(`移除此种植主体后，将同时移除其 ${outside.length} 块已选地块及填写信息。是否继续？`, '调整种植主体', { confirmButtonText: '移除主体及地块', cancelButtonText: '保留原选择', type: 'warning' }) }
    catch { return }
    form.plotDetails = form.plotDetails.filter(plot => ids.includes(plot.subjectId))
  }
  form.plantingSubjectIds = [...ids]
}
function identityError() {
  if (!form.storageSubjectId) return '请选择收储主体'
  if (!form.plantingSubjectIds.length) return '请至少选择一个种植主体'
  if (!form.applicantContact.trim() || !form.applicantPhone.trim()) return '请填写联系人和联系方式'
  return ''
}
function plotsError() {
  if (!form.year) return '请选择计划年度'
  if (!form.plotDetails.length) return '请按图至少选择一块收储地块'
  if (props.mobile && form.plotDetails.some(plot => !form.plantingSubjectIds.includes(plot.subjectId))) return '所选地块不属于第一步已选种植主体，请重新选地'
  if (new Set(form.plotDetails.map(plot => String(plot.regionCode).slice(0, 6))).size > 1) return '一份申报不能包含不同县的地块，请按县分别申报'
  const bad = form.plotDetails.find(p => !p.crop || !p.variety?.trim() || !Number.isFinite(Number(p.expectedYield)) || Number(p.expectedYield) <= 0)
  return bad ? '请完善“' + bad.name + '”的作物、品种和正数预计产量' : ''
}
function setMobileStep(step) { mobileStep.value = step; nextTick(() => document.querySelector('.phone-content')?.scrollTo({ top: 0, behavior: 'smooth' })) }
function jumpMobileStep(step) { if (step <= mobileStep.value || readOnly.value) setMobileStep(step) }
function nextMobileStep() { if (readOnly.value) return setMobileStep(mobileStep.value + 1); const error = mobileStep.value === 1 ? identityError() : plotsError(); if (error) return ElMessage.warning(error); setMobileStep(mobileStep.value + 1) }
const typeName = type => ({ household: '养殖户', farm: '养殖户', livestock_household: '养殖户', aquaculture: '养殖企业', enterprise: '养殖企业', livestock_enterprise: '养殖企业', third_party: '第三方收储机构' }[type] || type || '—')
const totals = computed(() => form.plotDetails.reduce((t,p) => { t.area += Number(p.areaMu || 0); t.yield += Number(p.expectedYield || 0); if (p.expectedWeight !== undefined && p.expectedWeight !== null && p.expectedWeight !== '') { t.weightCount++; t.weight += Number(p.expectedWeight) } if (p.expectedPrice !== undefined && p.expectedPrice !== null && p.expectedPrice !== '' && p.expectedWeight !== undefined && p.expectedWeight !== null && p.expectedWeight !== '') { t.amountCount++; t.amount += Number(p.expectedPrice) * Number(p.expectedWeight) } return t }, { area:0, yield:0, weight:0, amount:0, weightCount:0, amountCount:0 }))

function applyPlots(rows) {
  const old = new Map(form.plotDetails.map(p => [p.plotId, p]))
  form.plotDetails = rows.map(p => { const id = p.plotId || p.id, existing = old.get(id); return existing || { plotId:id, name:p.name, subjectId:p.subjectId, subjectName:p.subjectName, areaMu:p.areaMu, regionCode:p.regionCode, regionName:p.regionName, geometry:clone(p.geometry), crop:'', variety:'', expectedYield:undefined, expectedPrice:undefined, expectedWeight:undefined } })
  if (!props.mobile) form.plantingSubjectIds = [...new Set(form.plotDetails.map(p => p.subjectId))]
}
function removePlot(id) { form.plotDetails = form.plotDetails.filter(p => p.plotId !== id); if (!props.mobile) form.plantingSubjectIds = [...new Set(form.plotDetails.map(p => p.subjectId))] }
function applyBatch() { if (!batch.crop && !batch.variety) return ElMessage.warning('请先选择作物或填写品种'); form.plotDetails.forEach(p => { if (batch.crop) p.crop = batch.crop; if (batch.variety) p.variety = batch.variety }); ElMessage.success('已应用至本单已选地块，各地块仍可单独调整') }
function editPromise() { promiseDraft.value = form.promise.content; promiseVisible.value = true }
function savePromise() { const changed = promiseDraft.value !== form.promise.content; form.promise.content = promiseDraft.value; if (changed) { form.promise.signedAt = ''; form.promise.signer = '' }; promiseVisible.value = false; ElMessage.success(changed ? '文档已修改，请重新电子签名' : '文档已保存') }
function deletePromise() { form.promise.content = ''; form.promise.signedAt = ''; form.promise.signer = ''; ElMessage.success('承诺书已删除，可重新编辑') }
function signPromise() { if (!form.promise.content.trim()) return ElMessage.warning('请先填写承诺书内容'); form.promise.signer = userStore.role?.name || ''; form.promise.signedAt = new Date().toLocaleString('zh-CN', { hour12:false }); ElMessage.success('已完成电子签名演示') }
async function onFile(file) {
  if (!file.raw) return
  try { const url = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file.raw) }); form.attachments.push({ name:file.name, type:file.raw.type, url }); ElMessage.success('附件已加入本次申报') }
  catch { ElMessage.error('读取附件失败，请重新选择') }
}
function removeAttachment(index) { form.attachments.splice(index, 1) }
async function previewFile(file) { preview.value = file; previewText.value = ''; if (file.type?.startsWith('text/') && file.url?.startsWith('data:')) { try { previewText.value = await (await fetch(file.url)).text() } catch { /* show download */ } }; previewVisible.value = true }
function validate() {
  if (props.mobile) { const error = identityError() || plotsError(); if (error) return error }
  if (!form.storageSubjectId) return '请选择收储主体'
  if (!form.applicantContact.trim() || !form.applicantPhone.trim()) return '请填写本次申报联系人和联系方式'
  if (!form.year) return '请选择计划年度'
  if (!form.plotDetails.length) return '请按图至少选择一块收储地块'
  const bad = form.plotDetails.find(p => !p.crop || !p.variety?.trim() || !Number(p.expectedYield) || Number(p.expectedYield) <= 0)
  if (bad) return '请完善“' + bad.name + '”的作物、品种和正数预计产量'
  if (form.usage === 'sell' && !form.attachments.length) return '出售用途请上传订单或合同附件'
  if (!form.promise.content.trim() || !form.promise.signedAt) return '请编辑并签署电子承诺书'
  return ''
}
async function save(submit) {
  if (busy.value || readOnly.value) return
  if (submit) { const error = validate(); if (error) { if (props.mobile) setMobileStep(identityError() ? 1 : plotsError() ? 2 : 3); return ElMessage.warning(error) } }
  busy.value = true
  try { const result = await saveOrdinaryApplication(clone(form), userStore.role, submit); if (!result.success) return ElMessage.error(result.message || '保存失败'); form.id = result.id; ElMessage.success(submit ? '整份青贮收储申报已提交县级审核' : '申报草稿已保存'); emit('saved', { id:result.id, submit }) }
  catch { ElMessage.error('保存失败，请重试；已填写内容保留在本页') }
  finally { busy.value = false }
}
let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true; loadError.value = ''; loaded.value = null; storageSubjects.value = []; plantingSubjects.value = []; knownSubjects.value = new Map(); subjectQueryVersion++; mobileStep.value = 1; Object.assign(form, empty()); picker.value?.close(); promiseVisible.value = false; previewVisible.value = false
  Object.assign(subjectFilters, { keyword: '', owner: '', region: '', type: '' })
  try {
    const subjects = await fetchStorageSubjects(userStore.role)
    if (version !== loadVersion) return
    storageSubjects.value = subjects
    if (props.mobile) await queryMobileSubjects()
    if (version !== loadVersion) return
    if (props.applicationId) {
      const row = await fetchOrdinaryApplication(props.applicationId, userStore.role)
      if (version !== loadVersion) return
      if (!row) { loadError.value = '未找到该申报或当前用户无权查看，不能新建或覆盖原单'; return }
      loaded.value = row
      const derivedSubjectIds = [...new Set((row.plotDetails || []).map(p => p.subjectId).filter(Boolean))]
      Object.assign(form, clone(row), { plantingSubjectIds: clone(row.plantingSubjectIds?.length ? row.plantingSubjectIds : derivedSubjectIds), promise:{ ...empty().promise, ...(row.promise || {}) }, attachments:clone(row.attachments || []), plotDetails:clone(row.plotDetails || []) })
      form.year = String(form.year)
      if (form.season === 'spring_summer') form.season = '春夏季'
    }
  }
  catch { if (version === loadVersion) loadError.value = '申报加载失败，请刷新重试' }
  finally { if (version === loadVersion) loading.value = false }
}
watch(() => props.applicationId, load)
watch(() => userStore.role?.code, load)
onMounted(load)
</script>

<style scoped lang="scss">
.application-form{min-width:0;color:#344054}.application-form>.el-alert{margin-bottom:14px}.form-section{background:#fff;border:1px solid #e3eaf0;border-radius:12px;padding:22px;margin-bottom:16px}.section-title{display:flex;align-items:flex-start;gap:10px;margin-bottom:18px}.step-num{display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex:0 0 32px;background:#e6f4f0;color:#168773;font-weight:700;border-radius:9px}.section-title h3{margin:0 0 5px;font-size:17px;color:#243b53}.section-title p{margin:0;color:#8793a2;font-size:12px;line-height:1.6}.identity-grid{display:grid;grid-template-columns:1fr 2fr 1.5fr;gap:12px;padding:14px 16px;background:#f7f9fb;border-radius:8px;margin-bottom:18px}.identity-grid span,.identity-grid b{display:block;word-break:break-word}.identity-grid span{color:#8793a2;font-size:12px;margin-bottom:7px}.identity-grid b{font-size:13px;font-weight:500;line-height:1.5}.two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px}.two-col .full{grid-column:1/-1}.application-form :deep(.el-select),.application-form :deep(.el-input-number),.application-form :deep(.el-date-editor){width:100%}.application-form :deep(.el-form-item){min-width:0;margin-bottom:16px}.application-form :deep(.el-form-item__label){line-height:1.45;height:auto;margin-bottom:7px}.subject-summary{display:flex;flex-direction:column;gap:5px;padding:12px 14px;background:#f1f8f5;border-left:3px solid #33a189;font-size:12px;color:#657d74}.subject-summary b{color:#26785f;font-size:14px}.plot-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.plot-actions span{color:#7d8c9d;font-size:12px}.batch-fields{display:flex;gap:8px;align-items:center;margin-top:14px;padding:10px;background:#f5f8fb;border-radius:8px}.batch-fields>span{white-space:nowrap;font-size:12px;color:#6d8092}.batch-fields .el-select{width:170px}.batch-fields .el-input{width:180px}.batch-fields .el-button{margin-left:auto}.plot-details{margin-top:14px}.plot-card{border:1px solid #e0e9ef;border-radius:10px;padding:16px;margin-bottom:12px}.plot-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}.plot-card h4{font-size:14px;margin:0 0 6px;color:#2a4a5e}.plot-card small{color:#8796a4;font-size:11px;line-height:1.6}.detail-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.detail-grid :deep(.el-form-item){margin-bottom:0}.detail-grid :deep(.el-form-item__label){font-size:12px}.totals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:14px;border-radius:9px;background:#f1f8f6}.totals div{text-align:center}.totals b{display:block;color:#19856e;font-size:20px;word-break:break-word}.totals span{display:block;color:#7d8d9c;font-size:11px;margin-top:5px;line-height:1.5}.field-note{font-size:12px;line-height:1.6;color:#8996a3;margin:8px 0 0}.attachment-block{width:100%}.attachment-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;margin-top:8px;background:#f5f8fb;border-radius:6px;word-break:break-word}.attachment-row>span{min-width:0;font-size:12px}.attachment-row>div{display:flex;flex-shrink:0}.promise-state{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px;background:#f6f9fc;border:1px solid #e3eaf2;border-radius:8px}.promise-state b,.promise-state small{display:block}.promise-state small{color:#8594a1;margin-top:6px;font-size:12px}.promise-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.promise-actions :deep(.el-button+.el-button){margin-left:0}.form-footer{display:flex;justify-content:flex-end;gap:8px;position:sticky;bottom:0;background:rgba(255,255,255,.97);padding:14px 18px;border:1px solid #e2e9ef;border-radius:10px;z-index:20}.form-footer :deep(.el-button+.el-button){margin-left:0}.file-preview-image{width:100%;max-height:65vh;object-fit:contain}.file-preview-frame{width:100%;height:60vh;border:0}.file-preview-text{white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:13px}
@media(max-width:1100px){.detail-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.identity-grid{grid-template-columns:1fr 1fr}}
.mobile-stepbar{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0 12px}.mobile-stepbar button{border:0;background:#edf3f5;color:#738494;border-radius:8px;padding:8px 3px;font-size:11px}.mobile-stepbar button b,.mobile-stepbar button span{display:block}.mobile-stepbar button b{font-size:16px}.mobile-stepbar button.active{background:#dff2eb;color:#168773}.mobile-stepbar button.done{background:#edf8f4;color:#2d8c72}.subject-filter-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;width:100%}.subject-filter-grid :deep(.el-button){margin:0}.mobile-subject-list{width:100%;box-sizing:border-box}.mobile-selected-subjects{width:100%}.mobile-selected-subjects :deep(.el-tag){max-width:100%;height:auto;white-space:normal;padding:4px 8px}.mobile-subject-list{max-height:235px;overflow:auto;margin-top:10px;border:1px solid #e6edf1;border-radius:8px;padding:8px}.mobile-subject-list :deep(.el-checkbox){display:flex;height:auto;margin:0;padding:8px 2px;border-bottom:1px solid #f0f3f5}.mobile-subject-list :deep(.el-checkbox__label){display:flex;flex-direction:column;gap:3px;white-space:normal}.mobile-subject-list small{color:#8a98a7;font-size:11px}.mobile-selected-subjects{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:8px 0 12px}.mobile-selected-subjects>span{width:100%;font-size:12px;color:#7d8c9d}.mobile-map-button{width:100%;margin-bottom:12px}.mobile-summary{margin-top:14px;padding:11px;background:#f1f8f5;border-radius:8px;color:#547366;font-size:12px}.mobile-summary p{margin:5px 0}.mobile .form-section{padding:16px 12px;margin-bottom:12px;border-radius:10px}.mobile .identity-grid{grid-template-columns:1fr;padding:12px}.mobile .two-col{grid-template-columns:1fr}.mobile .detail-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 10px}.mobile .detail-grid .el-form-item:first-child{grid-column:1/-1}.mobile .totals{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 8px}.mobile .batch-fields{flex-wrap:wrap}.mobile .batch-fields>span{width:100%}.mobile .batch-fields .el-select,.mobile .batch-fields .el-input{width:calc(50% - 4px)}.mobile .batch-fields .el-button{margin-left:0;width:100%}.mobile .plot-card{padding:12px 10px}.mobile .section-title h3{font-size:16px}.mobile .form-footer{padding:10px 8px;justify-content:center;flex-wrap:wrap}.mobile .form-footer .el-button{padding:9px 12px}.mobile .plot-actions{gap:8px}.mobile .promise-state small{font-size:11px;word-break:break-word}
@media(max-width:650px){.form-section{padding:14px}.two-col{grid-template-columns:1fr}.detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.identity-grid{grid-template-columns:1fr}.batch-fields{flex-wrap:wrap}.batch-fields .el-select,.batch-fields .el-input{width:100%}.batch-fields .el-button{margin-left:0;width:100%}.totals{grid-template-columns:repeat(2,minmax(0,1fr))}.section-title h3{font-size:15px}.form-footer{padding:10px;justify-content:center;flex-wrap:wrap}}
</style>


