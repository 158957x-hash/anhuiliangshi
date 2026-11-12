<template>
  <div class="page-container mobile-demo-page">
    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px"
      title="皖企通移动端演示（R13 · C-13/C-14）：使用主体/回收主体经移动端上报为常规路径（design_proposal，正式归属见 Q-PES-11），本页为手机形态模拟。" />

    <div class="phone-wrap">
      <div class="phone">
        <div class="ph-status"><span>9:41</span><span>皖企通 · 农药服务</span><span>5G</span></div>
        <div class="ph-tabs">
          <button v-for="t in tabs" :key="t.key" type="button" class="ph-tab" :class="{ on: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
        </div>

        <div class="ph-body">
          <!-- 使用记录上报 -->
          <template v-if="tab === 'usage'">
            <div class="ph-banner">使用记录上报（C-13：使用主体经皖企通上报）</div>
            <el-form ref="usageFormRef" :model="usageForm" :rules="usageRules" label-position="top" size="small">
              <el-form-item label="使用日期" prop="usageDate">
                <el-date-picker v-model="usageForm.usageDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
              </el-form-item>
              <el-form-item label="作物" prop="crop"><el-input v-model="usageForm.crop" placeholder="如 小麦" /></el-form-item>
              <el-form-item label="防治对象" prop="pestTarget"><el-input v-model="usageForm.pestTarget" placeholder="如 赤霉病" /></el-form-item>
              <el-form-item label="农药产品" prop="productId">
                <el-select v-model="usageForm.productId" style="width: 100%" @change="onProductChange">
                  <el-option v-for="p in products" :key="p.id" :label="`${p.name}（${p.regNo}）`" :value="p.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="购买批次（可扫农药包装二维码自动带出）">
                <el-select v-model="usageForm.batchId" clearable style="width: 100%" placeholder="不选=演示追溯断点">
                  <el-option v-for="b in batches" :key="b.id" :label="`${b.batchNo}`" :value="b.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="用量（公斤）/ 面积（亩）">
                <el-input-number v-model="usageForm.dosage" :min="0" style="width: 45%" />
                <el-input-number v-model="usageForm.areaMu" :min="0" style="width: 45%; margin-left: 10%" />
              </el-form-item>
              <el-button type="primary" style="width: 100%" :loading="saving" @click="submitUsage">提交使用记录</el-button>
            </el-form>
            <div class="ph-list">
              <div v-for="u in myUsages" :key="u.id" class="ph-item">
                <div class="pi-row"><b>{{ u.crop }}</b><el-tag size="small" type="success" effect="plain" disable-transitions>已上报</el-tag></div>
                <div class="pi-sub">{{ u.usageDate }} · {{ u.productName }} · {{ u.dosage }}kg/{{ u.areaMu }}亩</div>
              </div>
            </div>
          </template>

          <!-- 回收登记 -->
          <template v-else-if="tab === 'recycle'">
            <div class="ph-banner">包装废弃物回收登记（C-14：回收主体维护）</div>
            <el-form ref="rcFormRef" :model="rcForm" :rules="rcRules" label-position="top" size="small">
              <el-form-item label="回收凭证号" prop="voucher"><el-input v-model="rcForm.voucher" /></el-form-item>
              <el-form-item label="类型" prop="type">
                <el-radio-group v-model="rcForm.type">
                  <el-radio-button value="农药瓶">农药瓶</el-radio-button>
                  <el-radio-button value="农药袋">农药袋</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="数量（个）/ 重量（kg）">
                <el-input-number v-model="rcForm.count" :min="1" style="width: 45%" />
                <el-input-number v-model="rcForm.weight" :min="1" style="width: 45%; margin-left: 10%" />
              </el-form-item>
              <el-button type="primary" style="width: 100%" :loading="saving" @click="submitRecycle">登记并交回站点</el-button>
            </el-form>
            <el-alert type="info" :closable="false" :title="'登记后进入「待核验」，由监管核验推进（演示提交后在 PC 端回收页可见）'" style="margin-top: 10px" />
          </template>

          <!-- 扫码查询 -->
          <template v-else>
            <div class="ph-banner">扫一扫 · 查真伪（公众服务 R13）</div>
            <div class="scan-box" @click="doScan">
              <el-icon :size="34"><FullScreen /></el-icon>
              <div>点击模拟扫描包装二维码</div>
            </div>
            <el-input v-model="scanCode" size="small" placeholder="或输入追溯码" @keyup.enter="doQuery">
              <template #append><el-button @click="doQuery">查询</el-button></template>
            </el-input>
            <div v-if="scanResult" class="scan-result" :class="scanResult.found ? 'ok' : 'bad'">
              <template v-if="scanResult.found">
                <b>{{ scanResult.product.name }}</b>
                <div class="sr-line">登记证 {{ scanResult.product.regNo }} · {{ scanResult.product.toxAName }}</div>
                <div class="sr-line">生产企业 {{ scanResult.product.producerName }}</div>
                <div class="sr-line">批次 {{ scanResult.batch.batchNo }} · {{ scanResult.batch.produceDate }}</div>
              </template>
              <template v-else>
                <b>未查询到登记信息，谨防假冒</b>
                <div class="sr-line">投诉举报请拨打 12316</div>
              </template>
            </div>
          </template>
        </div>
      </div>

      <div class="side-note">
        <h4>演示路径</h4>
        <p>① 使用主体（陈勇）在此上报使用记录 → 监管端「使用记录」页可见；</p>
        <p>② 回收主体（钱进）在此登记回收 → 监管端「包装废弃物回收」页待核验；</p>
        <p>③ 扫码查询走公众服务同一数据源。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchProducts, fetchBatches, scanQR, addUsage, fetchUsages } from '@/api/pes'
import { PES_PRODUCTS, PES_SUBJECTS, PES_RECYCLES } from '@/mock/pes/data'

const userStore = useUserStore()
const tab = ref('usage')
const tabs = [
  { key: 'usage', label: '使用上报' },
  { key: 'recycle', label: '回收登记' },
  { key: 'scan', label: '扫码查询' }
]

const products = ref([])
const batches = ref([])
const saving = ref(false)
const usageFormRef = ref()
const rcFormRef = ref()
const myUsages = ref([])

const usageForm = reactive({ usageDate: '', crop: '', pestTarget: '', productId: '', batchId: '', productName: '', dosage: 1, areaMu: 0 })
const usageRules = {
  usageDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  crop: [{ required: true, message: '请填写作物', trigger: 'blur' }],
  productId: [{ required: true, message: '请选择产品', trigger: 'change' }]
}
const rcForm = reactive({ voucher: '', type: '农药瓶', count: 100, weight: 50 })
const rcRules = {
  voucher: [
    { required: true, message: '请填写凭证号', trigger: 'blur' },
    { validator: (r, v, cb) => (PES_RECYCLES.some((x) => x.voucher === v) ? cb(new Error('凭证号已存在')) : cb()), trigger: 'blur' }
  ]
}

const scanCode = ref('')
const scanResult = ref(null)

const onProductChange = (pid) => { usageForm.productName = PES_PRODUCTS.find((p) => p.id === pid)?.name || '' }

// 使用主体默认取演示种植主体；回收主体取回收站
const demoUseSubject = computed(() => PES_SUBJECTS.find((s) => s.id === 'SUB-0001') || PES_SUBJECTS.find((s) => s.type === 'use'))
const submitUsage = () => {
  usageFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      await addUsage({
        dataSource: '皖企通',
        subjectId: demoUseSubject.value?.id, subjectName: demoUseSubject.value?.name || '',
        usageDate: usageForm.usageDate, crop: usageForm.crop, pestTarget: usageForm.pestTarget,
        productId: usageForm.productId, productName: usageForm.productName, batchId: usageForm.batchId || '',
        dosage: usageForm.dosage, areaMu: usageForm.areaMu,
        breakPoint: !usageForm.batchId, remark: usageForm.batchId ? '' : '移动端上报未关联批次，追溯断点'
      })
      ElMessage.success('使用记录已上报（监管端可见）')
      Object.assign(usageForm, { usageDate: usageForm.usageDate, crop: '', pestTarget: '', productId: '', batchId: '', productName: '', dosage: 1, areaMu: 0 })
      await refreshUsages()
    } finally { saving.value = false }
  })
}

const refreshUsages = async () => {
  myUsages.value = (await fetchUsages(null, {})).filter((u) => u.subjectId === demoUseSubject.value?.id).slice(0, 6)
}

const submitRecycle = () => {
  rcFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      PES_RECYCLES.unshift({
        id: `RC-${String(PES_RECYCLES.length + 1).padStart(4, '0')}`,
        stationId: 'PES-R-0002', stationName: '阜阳农资包装回收站', regionCode: '341202',
        date: new Date().toISOString().slice(0, 10),
        fromSubject: demoUseSubject.value?.id, fromName: demoUseSubject.value?.name || '',
        ...rcForm, handle: '待站点确认', status: '待核验'
      })
      ElMessage.success(`回收登记成功，凭证 ${rcForm.voucher} 已进入待核验`)
      rcForm.voucher = `HZ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`
    } finally { saving.value = false }
  })
}

const doScan = async () => {
  const { batch } = await scanQR()
  scanCode.value = batch.batchNo
  await doQuery()
}
const doQuery = async () => {
  if (!scanCode.value) return
  const batch = batches.value.find((b) => b.batchNo.toLowerCase() === scanCode.value.trim().toLowerCase())
  if (batch) {
    const product = PES_PRODUCTS.find((p) => p.id === batch.productId)
    scanResult.value = { found: true, batch, product }
  } else {
    scanResult.value = { found: false }
  }
}

onMounted(async () => {
  ;[products.value, batches.value] = await Promise.all([fetchProducts(), fetchBatches()])
  usageForm.usageDate = new Date().toISOString().slice(0, 10)
  rcForm.voucher = `HZ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`
  await refreshUsages()
})
</script>

<style lang="scss" scoped>
.mobile-demo-page { min-height: calc(100vh - 130px); }

.phone-wrap {
  display: flex;
  gap: 28px;
  justify-content: center;
  align-items: flex-start;
}

.phone {
  width: 375px;
  border-radius: 28px;
  border: 10px solid #1f2d3d;
  background: #f5f7fa;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(16, 49, 95, 0.25);
}

.ph-status {
  display: flex; justify-content: space-between;
  background: #1f2d3d; color: #cfe0f5;
  font-size: 11px; padding: 6px 14px;
}

.ph-tabs {
  display: flex; background: #fff; border-bottom: 1px solid #e8edf3;
  .ph-tab {
    flex: 1; text-align: center; padding: 10px 0; font-size: 13.5px; color: #5a6d85; cursor: pointer;
    background: none; border: none;
    &.on { color: #c2571a; font-weight: 600; border-bottom: 2.5px solid #c2571a; }
  }
}

.ph-body { padding: 12px 14px 20px; max-height: 400px; overflow: auto; }

.ph-banner {
  background: #fdf3ec; border-left: 3px solid #c2571a;
  font-size: 12.5px; color: #7a4a1e; padding: 8px 10px; border-radius: 6px; margin-bottom: 12px;
}

.ph-list { margin-top: 14px;
  .ph-item { background: #fff; border: 1px solid #eef1f6; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px;
    .pi-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .pi-sub { font-size: 11.5px; color: #8598b3; margin-top: 3px; }
  }
}

.scan-box {
  background: #1f2d3d; color: #9fb3cf; border-radius: 12px;
  height: 130px; display: flex; flex-direction: column; gap: 8px;
  align-items: center; justify-content: center; cursor: pointer; margin-bottom: 10px;
  font-size: 12.5px;
  &:hover { background: #2a3b55; }
}

.scan-result {
  margin-top: 12px; border-radius: 10px; padding: 12px 14px; font-size: 13px;
  &.ok { background: #f2faf6; border: 1px solid #bfe3d2; color: #1e6b52; }
  &.bad { background: #fdf3f3; border: 1px solid #e7c3c3; color: #b03a3a; }
  .sr-line { font-size: 12px; margin-top: 4px; color: inherit; opacity: .85; }
}

.side-note {
  background: #fbfcfe; border: 1px solid #eef1f6; border-radius: 10px;
  padding: 14px 18px; max-width: 320px; font-size: 13px; color: #4a5568;
  h4 { margin: 0 0 8px; font-size: 14px; color: var(--ah-text); }
  p { margin: 0 0 6px; line-height: 1.7; }
}
</style>
