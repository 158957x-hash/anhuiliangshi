<template>
  <div class="mobile-pesticide">
    <header>
      <el-button v-if="view === 'home'" link @click="$router.push('/entry')">‹ 返回</el-button>
      <el-button v-else link @click="view = 'home'">‹ 返回</el-button>
      <b>{{ headerTitle }}</b>
      <span />
    </header>

    <!-- ===== 首页：身份卡 + 功能入口 ===== -->
    <template v-if="view === 'home'">
      <div class="identity-card">
        <div class="avatar" :style="{ background: currentIdentity.gradient }">{{ currentIdentity.name.charAt(0) }}</div>
        <div class="id-info">
          <b>{{ currentIdentity.subjectName }}</b>
          <span>{{ currentIdentity.roleName }} · {{ currentIdentity.legal }}</span>
        </div>
        <el-button size="small" round @click="switchIdentity">切换身份</el-button>
      </div>
      <p class="identity-tip">使用主体可上报用药记录，回收主体可登记回收台账，点击右上角可切换身份</p>

      <nav class="entry-list">
        <button class="entry-card" :class="{ disabled: currentIdentity.key !== 'use' }" @click="go('usage')">
          <span class="entry-icon usage">📱</span>
          <span class="entry-body">
            <b>使用上报 <el-tag v-if="currentIdentity.key !== 'use'" size="small" type="info">需使用主体</el-tag></b>
            <small>农药使用记录上报</small>
          </span>
          <span class="entry-badge">我已报 {{ myUsages.length }}</span>
        </button>
        <button class="entry-card" :class="{ disabled: currentIdentity.key !== 'recycler' }" @click="go('recycle')">
          <span class="entry-icon recycle">♻️</span>
          <span class="entry-body">
            <b>回收登记 <el-tag v-if="currentIdentity.key !== 'recycler'" size="small" type="info">需回收主体</el-tag></b>
            <small>包装废弃物回收登记</small>
          </span>
          <span class="entry-badge">本站 {{ myRecycles.length }}</span>
        </button>
        <button class="entry-card" @click="go('scan')">
          <span class="entry-icon scan">🔍</span>
          <span class="entry-body">
            <b>扫一扫 · 查真伪</b>
            <small>追溯码核验，与公众服务同源数据</small>
          </span>
          <span class="entry-badge">›</span>
        </button>
        <button class="entry-card" @click="go('kb')">
          <span class="entry-icon kb">📚</span>
          <span class="entry-body">
            <b>知识库</b>
            <small>政策法规 · 科学用药 · 废弃物回收</small>
          </span>
          <span class="entry-badge">›</span>
        </button>
      </nav>

      <div class="form-card">
        <div class="section-title"><b>今日摘要</b></div>
        <div class="metric-grid">
          <div><b>{{ myUsages.length }}</b><span>我的上报</span></div>
          <div><b>{{ myRecycles.length }}</b><span>本站登记</span></div>
          <div><b>{{ pendingCount }}</b><span>待核验</span></div>
        </div>
      </div>
    </template>

    <!-- ===== 使用上报 ===== -->
    <template v-else-if="view === 'usage'">
      <template v-if="currentIdentity.key !== 'use'">
        <el-empty description="使用上报仅限使用主体，请返回首页切换身份" :image-size="70" />
      </template>
      <template v-else>
        <div class="form-heading">
          <h3>农药使用记录上报</h3>
          <p>使用主体经皖企通上报，监管端实时可见；扫描包装二维码可自动带出批次。</p>
        </div>
        <el-tabs v-model="usageTab" class="wq-tabs">
          <el-tab-pane label="使用上报" name="fill">
            <div class="form-card">
              <el-form ref="usageFormRef" :model="usageForm" :rules="usageRules" label-position="top" size="default">
                <el-form-item label="使用日期" prop="usageDate">
                  <el-date-picker v-model="usageForm.usageDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                </el-form-item>
                <el-form-item label="作物" prop="crop"><el-input v-model="usageForm.crop" placeholder="如 小麦" /></el-form-item>
                <el-form-item label="防治对象" prop="pestTarget"><el-input v-model="usageForm.pestTarget" placeholder="如 小麦蚜虫" /></el-form-item>
                <el-form-item label="农药产品" prop="productId">
                  <el-select v-model="usageForm.productId" style="width: 100%" placeholder="选择已登记农药产品" @change="onProductChange">
                    <el-option v-for="p in products" :key="p.id" :label="`${p.name}（${p.regNo}）`" :value="p.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="购买批次">
                  <el-select v-model="usageForm.batchId" clearable style="width: 100%" placeholder="扫包装二维码带出；不选=演示追溯断点">
                    <el-option v-for="b in batches" :key="b.id" :label="b.batchNo" :value="b.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="用量与单位" prop="dosage">
                  <div class="num-grid">
                    <el-input-number v-model="usageForm.dosage" :min="0" :step="0.5" controls-position="right" />
                    <el-select v-model="usageForm.unit" style="width: 100%">
                      <el-option label="公斤" value="公斤" /><el-option label="升" value="升" /><el-option label="毫升" value="毫升" />
                    </el-select>
                  </div>
                </el-form-item>
                <el-form-item label="施药面积（亩）"><el-input-number v-model="usageForm.areaMu" :min="0" :step="10" controls-position="right" style="width: 100%" /></el-form-item>
              </el-form>
              <el-button type="primary" class="submit-btn" :loading="saving" @click="submitUsage">提交使用记录</el-button>
            </div>
          </el-tab-pane>
          <el-tab-pane :label="`上报记录（${myUsages.length}）`" name="list">
            <div class="form-card">
              <article v-for="u in myUsages" :key="u.id" class="record-card clickable" @click="detailU = detailU === u.id ? '' : u.id">
                <div class="card-head"><b>{{ u.crop }} · {{ u.productName }}</b><el-tag size="small" :type="RC_TAG[u.status] || 'info'" effect="plain">{{ CHECK_NAME[u.status] || u.status }}</el-tag></div>
                <p>{{ u.usageDate }} · 用量 {{ u.dosage }}{{ u.unit }}<el-icon class="rc-arrow" :class="{ open: detailU === u.id }"><ArrowDown /></el-icon></p>
                <div v-if="detailU === u.id" class="rc-detail">
                  <p><span>用药单位</span><b>{{ u.subjectName }}</b></p>
                  <p><span>使用日期</span><b>{{ u.usageDate }}</b></p>
                  <p><span>作物</span><b>{{ u.crop }}</b></p>
                  <p><span>防治对象</span><b>{{ u.pestTarget || '—' }}</b></p>
                  <p><span>农药产品</span><b>{{ u.productName }}</b></p>
                  <p><span>购买批次</span><b>{{ u.batchId ? (batchNoOf(u.batchId) || '—') : '未关联批次' }}</b></p>
                  <p><span>用量</span><b>{{ u.dosage }}{{ u.unit }}</b></p>
                  <p><span>施药面积</span><b>{{ u.areaMu ? `${u.areaMu}亩` : '—' }}</b></p>
                  <p><span>核验状态</span><b>{{ CHECK_NAME[u.status] || u.status }}</b></p>
                  <p v-if="u.checker"><span>核验人</span><b>{{ u.checker }} · {{ u.checkTime }}</b></p>
                  <p v-if="u.checkOpinion"><span>核验意见</span><b>{{ u.checkOpinion }}</b></p>
                </div>
                <p v-if="!u.batchId" class="warn-line">未关联批次，追溯断点</p>
              </article>
              <el-empty v-if="!myUsages.length" description="暂无上报记录" :image-size="55" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </template>

    <!-- ===== 回收登记 ===== -->
    <template v-else-if="view === 'recycle'">
      <template v-if="currentIdentity.key !== 'recycler'">
        <el-empty description="回收登记仅限回收主体（站点），请返回首页切换身份" :image-size="70" />
      </template>
      <template v-else>
        <div class="form-heading">
          <h3>包装废弃物回收登记</h3>
          <p>回收主体登记交回台账，字段与监管端「包装废弃物回收」页一致。</p>
        </div>
        <el-tabs v-model="recycleTab" class="wq-tabs">
          <el-tab-pane label="回收登记" name="fill">
            <div class="form-card">
              <el-form ref="rcFormRef" :model="rcForm" :rules="rcRules" label-position="top" size="default">
                <el-form-item label="回收凭证号" prop="voucher">
                  <el-input v-model="rcForm.voucher">
                    <template #append><el-button @click="genVoucher">随机</el-button></template>
                  </el-input>
                </el-form-item>
                <el-form-item label="回收日期" prop="date">
                  <el-date-picker v-model="rcForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                </el-form-item>
                <el-form-item label="交回主体" prop="fromName">
                  <el-select v-model="rcForm.fromName" filterable allow-create style="width: 100%" placeholder="选择系统内主体，或输入农户/门店名称">
                    <el-option v-for="s in returnableSubjects" :key="s.id" :label="`${s.name}（${TYPE_NAME[s.type]}）`" :value="s.name" />
                  </el-select>
                </el-form-item>
                <el-form-item label="农药批次（选填）">
                  <el-select v-model="rcForm.batchNo" filterable allow-create clearable style="width: 100%" placeholder="扫包装二维码带出；散装交回可留空">
                    <el-option v-for="b in batches" :key="b.id" :label="b.batchNo" :value="b.batchNo" />
                  </el-select>
                </el-form-item>
                <el-form-item label="废弃物类型" prop="type">
                  <el-radio-group v-model="rcForm.type">
                    <el-radio-button value="农药瓶">农药瓶</el-radio-button>
                    <el-radio-button value="农药袋">农药袋</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="数量（个）与重量（kg）">
                  <div class="num-grid">
                    <el-input-number v-model="rcForm.count" :min="1" controls-position="right" />
                    <el-input-number v-model="rcForm.weight" :min="1" controls-position="right" />
                  </div>
                </el-form-item>
                <el-form-item label="拟处置方式">
                  <el-select v-model="rcForm.handle" clearable style="width: 100%" placeholder="可先留空，核验后补录">
                    <el-option label="无害化焚烧处置" value="无害化焚烧处置" />
                    <el-option label="资源化利用" value="资源化利用" />
                    <el-option label="暂存待处置" value="暂存待处置" />
                  </el-select>
                </el-form-item>
              </el-form>
              <el-button type="primary" class="submit-btn" :loading="saving" @click="submitRecycle">登记并进入待核验</el-button>
              <el-alert title="登记后由县级农业农村部门核验一次（通过/不通过），核验状态在「登记记录」与监管端一致展示" type="info" :closable="false" show-icon style="margin-top: 12px" />
            </div>
          </el-tab-pane>
          <el-tab-pane :label="`登记记录（${myRecycles.length}）`" name="list">
            <div class="form-card">
              <article v-for="r in myRecycles" :key="r.id" class="record-card clickable" @click="detailR = detailR === r.id ? '' : r.id">
                <div class="card-head">
                  <b>{{ r.voucher }}</b>
                  <el-tag size="small" :type="RC_TAG[r.status] || 'info'" effect="plain">{{ CHECK_NAME[r.status] || r.status }}</el-tag>
                </div>
                <p>{{ r.date }} · 交回方 {{ r.fromName }} · {{ r.type }} {{ r.count }}个<el-icon class="rc-arrow" :class="{ open: detailR === r.id }"><ArrowDown /></el-icon></p>
                <div v-if="detailR === r.id" class="rc-detail">
                  <p><span>回收凭证号</span><b>{{ r.voucher }}</b></p>
                  <p><span>回收日期</span><b>{{ r.date }}</b></p>
                  <p><span>回收站点</span><b>{{ r.stationName }}</b></p>
                  <p><span>交回主体</span><b>{{ r.fromName }}</b></p>
                  <p><span>农药批次</span><b>{{ r.batchNo || '未关联批次' }}</b></p>
                  <p><span>废弃物类型</span><b>{{ r.type }}</b></p>
                  <p><span>数量</span><b>{{ r.count }}个</b></p>
                  <p><span>重量</span><b>{{ r.weight }}kg</b></p>
                  <p><span>拟处置方式</span><b>{{ r.handle || '—' }}</b></p>
                  <p><span>核验状态</span><b>{{ CHECK_NAME[r.status] || r.status }}</b></p>
                  <p v-if="r.checker"><span>核验人</span><b>{{ r.checker }} · {{ r.checkTime }}</b></p>
                  <p v-if="r.checkOpinion"><span>核验意见</span><b>{{ r.checkOpinion }}</b></p>
                </div>
              </article>
              <el-empty v-if="!myRecycles.length" description="本站暂无登记记录" :image-size="55" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </template>

    <!-- ===== 扫码查询 ===== -->
    <template v-else-if="view === 'scan'">
      <div class="form-heading">
        <h3>扫一扫 · 查真伪</h3>
        <p>与公众服务同源数据，支持追溯码输入或模拟扫码。</p>
      </div>
      <div class="form-card scan-card">
        <div class="scan-box" role="button" tabindex="0" @click="doScan" @keyup.enter="doScan">
          <el-icon :size="36"><FullScreen /></el-icon>
          <div>点击模拟扫描包装二维码</div>
          <small>对准农药标签上的追溯二维码</small>
        </div>
        <el-input v-model="scanCode" placeholder="或手动输入追溯码，如 HG20260301A" clearable @keyup.enter="doQuery">
          <template #append><el-button @click="doQuery">查询</el-button></template>
        </el-input>
        <div v-if="scanResult" class="scan-result" :class="scanResult.found ? 'ok' : 'bad'">
          <template v-if="scanResult.found">
            <div class="sr-head"><el-icon><CircleCheckFilled /></el-icon><b>登记信息核验通过</b></div>
            <b class="sr-name">{{ scanResult.product.name }}</b>
            <p>登记证号 {{ scanResult.product.regNo }} · {{ scanResult.product.toxAName }}</p>
            <p>生产企业 {{ scanResult.product.producerName }}</p>
            <p>批次 {{ scanResult.batch.batchNo }} · 生产日期 {{ scanResult.batch.produceDate }}</p>
            <el-button link type="primary" @click="toggleFlow">{{ flowOpen ? '收起流向链路' : '查看流向链路' }}</el-button>
            <div v-if="flowOpen && flowData" class="flow-mini">
              <el-tag v-if="hasBreakPoint" size="small" type="warning" effect="plain" style="margin-bottom: 6px">存在追溯断点</el-tag>
              <div class="fm-batch">{{ flowData.product.name }} · 批次 {{ flowData.batch.batchNo }}</div>
              <el-empty v-if="!flowData.links.length" description="该批次暂无流向记录" :image-size="55" />
              <div v-for="(l, i) in flowData.links" :key="i" class="fm-link" :class="{ dim: l.breakPoint }">
                <div class="fl-line">
                  <span class="fm-dot" :class="{ unknown: l.to === 'UNKNOWN' }"></span>
                  <span class="fl-path">{{ nodeName(l.from) }} → {{ nodeName(l.to) }}</span>
                </div>
                <div class="fl-meta">
                  <el-tag size="small" :type="l.breakPoint ? 'warning' : 'info'" effect="plain" disable-transitions>{{ FLOW_NAME[l.type] || l.type }}</el-tag>
                  <span>{{ l.qty }}吨 · {{ l.date }}</span>
                  <el-tag v-if="l.realName" size="small" type="success" effect="plain" disable-transitions>已实名</el-tag>
                </div>
                <p v-if="l.breakPoint" class="fl-break">断点：购买方信息缺失</p>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="sr-head"><el-icon><CircleCloseFilled /></el-icon><b>未查询到登记信息</b></div>
            <p>谨防假冒农药，投诉举报请拨打 12316</p>
          </template>
        </div>
      </div>
    </template>

    <!-- ===== 知识库 ===== -->
    <template v-else-if="view === 'kb'">
      <div class="form-heading">
        <h3>知识库</h3>
        <p>由省级主管部门统一发布的政策法规与科学用药知识。</p>
      </div>
      <div class="form-card">
        <el-input v-model="kbKeyword" placeholder="搜索标题或内容关键词" clearable @input="loadKb" />
        <div class="kb-cats">
          <span class="kb-cat" :class="{ on: !kbCategory }" @click="kbCategory = ''; loadKb()">全部</span>
          <span v-for="c in kbCats" :key="c" class="kb-cat" :class="{ on: kbCategory === c }" @click="kbCategory = c; loadKb()">{{ c }}</span>
        </div>
        <article v-for="a in kbArticles" :key="a.id" class="kb-item" @click="kbOpen = kbOpen === a.id ? '' : a.id">
          <div class="card-head">
            <b>{{ a.title }}</b>
            <el-icon><ArrowDown v-if="kbOpen === a.id" /><ArrowRight v-else /></el-icon>
          </div>
          <p>{{ a.source }} · {{ a.date }}</p>
          <div v-if="kbOpen === a.id" class="kb-body">
            <p v-for="(seg, i) in a.content" :key="i">{{ seg }}</p>
          </div>
        </article>
        <el-empty v-if="!kbArticles.length" description="暂无已发布内容" :image-size="55" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchProducts, fetchBatches, scanQR, addUsage, fetchUsages, fetchKb, fetchKbCategories, fetchTraceFlow } from '@/api/pes'
import { PES_PRODUCTS, PES_SUBJECTS, PES_RECYCLES, PES_CHECK_STATUS, PES_BATCH_MAP } from '@/mock/pes/data'

const TYPE_NAME = { produce: '生产企业', operate: '经营企业', use: '使用主体', recycle: '回收主体' }
const CHECK_NAME = Object.fromEntries(Object.entries(PES_CHECK_STATUS).map(([k, v]) => [k, v.name]))
const RC_TAG = { pending: 'warning', passed: 'success', rejected: 'danger' }

// 演示身份（C-13 使用主体 / C-14 回收主体），支持切换
const identities = {
  use: { key: 'use', name: '陈勇', legal: '陈勇', subjectName: '太和县丰乐种植专业合作社', roleName: '使用主体', subjectId: 'SUB-0001', regionCode: '341222', gradient: 'linear-gradient(145deg, #ffb33a, #ff9411)' },
  recycler: { key: 'recycler', name: '钱进', legal: '钱进', subjectName: '阜阳农资包装回收站', roleName: '回收主体', subjectId: 'PES-R-0002', regionCode: '341202', gradient: 'linear-gradient(145deg, #8e6bd6, #5e35b1)' }
}
const identityKey = ref('use')
const currentIdentity = computed(() => identities[identityKey.value])
const switchIdentity = () => {
  identityKey.value = identityKey.value === 'use' ? 'recycler' : 'use'
  view.value = 'home'
  ElMessage.success(`已切换为${currentIdentity.value.roleName}：${currentIdentity.value.subjectName}`)
}

const view = ref('home')
const go = (v) => { view.value = v; if (v === 'kb') loadKb() }
const headerTitle = computed(() => ({
  home: '皖企通 · 农药服务', usage: '使用上报', recycle: '回收登记', scan: '扫一扫', kb: '知识库'
}[view.value]))

// 知识库（省级发布内容，仅已发布可见）
const kbArticles = ref([])
const kbCats = ref([])
const kbKeyword = ref('')
const kbCategory = ref('')
const kbOpen = ref('')
const loadKb = async () => {
  kbArticles.value = await fetchKb(kbCategory.value, kbKeyword.value.trim() || undefined)
}

const products = ref([])
const batches = ref([])
const saving = ref(false)
const usageFormRef = ref()
const rcFormRef = ref()
const myUsages = ref([])
const myRecycles = ref([])
const usageTab = ref('fill')
const recycleTab = ref('fill')
const detailU = ref('')
const detailR = ref('')
const batchNoOf = (batchId) => PES_BATCH_MAP[batchId]?.batchNo || ''

const usageForm = reactive({ usageDate: '', crop: '', pestTarget: '', productId: '', batchId: '', productName: '', dosage: 1, unit: '公斤', areaMu: 0 })
const usageRules = {
  usageDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  crop: [{ required: true, message: '请填写作物', trigger: 'blur' }],
  productId: [{ required: true, message: '请选择农药产品', trigger: 'change' }]
}
const rcForm = reactive({ voucher: '', date: '', fromName: '', batchNo: '', type: '农药瓶', count: 100, weight: 50, handle: '' })
const rcRules = {
  voucher: [
    { required: true, message: '请填写凭证号', trigger: 'blur' },
    { validator: (r, v, cb) => (PES_RECYCLES.some((x) => x.voucher === v) ? cb(new Error('凭证号已存在')) : cb()), trigger: 'blur' }
  ],
  date: [{ required: true, message: '请选择回收日期', trigger: 'change' }],
  fromName: [{ required: true, message: '请填写交回主体（必填，与监管端台账一致）', trigger: 'change' }]
}
const scanCode = ref('')
const scanResult = ref(null)

const pendingCount = computed(() => myRecycles.value.filter((r) => r.status === 'pending').length)
const returnableSubjects = computed(() => PES_SUBJECTS.filter((s) => ['operate', 'use'].includes(s.type)))

const genVoucher = () => { rcForm.voucher = `HZ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(Math.random() * 90 + 10)}` }

const onProductChange = (pid) => { usageForm.productName = PES_PRODUCTS.find((p) => p.id === pid)?.name || '' }

const refreshMy = async () => {
  const usages = await fetchUsages(null, {})
  myUsages.value = usages.filter((u) => u.subjectId === identities.use.subjectId).slice(0, 8)
  myRecycles.value = PES_RECYCLES.filter((r) => r.stationId === identities.recycler.subjectId)
}

const submitUsage = () => {
  usageFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      await addUsage({
        dataSource: '皖企通',
        subjectId: identities.use.subjectId, subjectName: identities.use.subjectName,
        usageDate: usageForm.usageDate, crop: usageForm.crop, pestTarget: usageForm.pestTarget,
        productId: usageForm.productId, productName: usageForm.productName, batchId: usageForm.batchId || '',
        dosage: usageForm.dosage, unit: usageForm.unit, areaMu: usageForm.areaMu,
        breakPoint: !usageForm.batchId, remark: usageForm.batchId ? '' : '移动端上报未关联批次，追溯断点'
      })
      ElMessage.success('使用记录已上报，监管端可见')
      Object.assign(usageForm, { crop: '', pestTarget: '', productId: '', batchId: '', productName: '', dosage: 1, unit: '公斤', areaMu: 0 })
      await refreshMy()
    } finally { saving.value = false }
  })
}

const submitRecycle = () => {
  rcFormRef.value?.validate(async (ok) => {
    if (!ok) return
    saving.value = true
    try {
      const matched = PES_SUBJECTS.find((s) => s.name === rcForm.fromName)
      PES_RECYCLES.unshift({
        id: `RC-${String(PES_RECYCLES.length + 1).padStart(4, '0')}`,
        stationId: identities.recycler.subjectId, stationName: identities.recycler.subjectName,
        regionCode: identities.recycler.regionCode,
        date: rcForm.date,
        fromSubject: matched?.id || '外部交回', fromName: rcForm.fromName,
        type: rcForm.type, count: rcForm.count, weight: rcForm.weight,
        handle: rcForm.handle || '', voucher: rcForm.voucher, batchNo: rcForm.batchNo || '', status: 'pending', checker: '', checkTime: '', checkOpinion: ''
      })
      ElMessage.success(`回收登记成功，凭证 ${rcForm.voucher} 已进入待核验`)
      Object.assign(rcForm, { voucher: '', fromName: '', batchNo: '', type: '农药瓶', count: 100, weight: 50, handle: '' })
      genVoucher()
      await refreshMy()
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
  scanResult.value = batch
    ? { found: true, batch, product: PES_PRODUCTS.find((p) => p.id === batch.productId) }
    : { found: false }
  flowOpen.value = false
  flowData.value = batch ? await fetchTraceFlow(batch.id) : null
}
// 移动端内嵌流向链路展示（不跳后台），数据与后台「流向追溯」同源同构
const flowOpen = ref(false)
const flowData = ref(null)
const hasBreakPoint = computed(() => flowData.value?.links?.some((l) => l.breakPoint) || false)
const toggleFlow = () => { flowOpen.value = !flowOpen.value }
const FLOW_NAME = { produce: '生产入库', purchase: '采购入库', sale: '销售出库', buy: '购买', return: '退货' }
const nodeName = (id) => flowData.value?.nodes?.find((n) => n.id === id)?.name || '未知购买方'

onMounted(async () => {
  ;[products.value, batches.value] = await Promise.all([fetchProducts(), fetchBatches()])
  kbCats.value = await fetchKbCategories()
  const today = new Date().toISOString().slice(0, 10)
  usageForm.usageDate = today
  rcForm.date = today
  genVoucher()
  await refreshMy()
})
</script>

<style scoped lang="scss">
.mobile-pesticide {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  background: #f5f7fa;
  padding: 0 12px 24px;
  overflow-x: hidden;
  color: #344054;

  header {
    display: grid;
    grid-template-columns: 65px minmax(0, 1fr) 65px;
    align-items: center;
    height: 58px;
    text-align: center;
    > b { font-size: 19px; color: #243b53; }
  }
}

.identity-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #fff7ec, #fff);
  border: 1px solid #f3e3c8;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 8px;
  .avatar {
    width: 46px; height: 46px; border-radius: 50%;
    color: #fff; font-size: 20px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .id-info { flex: 1; min-width: 0;
    b { display: block; font-size: 15px; color: #243b53; }
    span { font-size: 12px; color: #8a98a7; }
  }
}
.identity-tip { font-size: 11.5px; color: #98a2b3; margin: 0 2px 14px; line-height: 1.5; }

.entry-list {
  display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;
  .entry-card {
    display: flex; align-items: center; gap: 12px;
    background: #fff; border: 1px solid #e2eaf1; border-radius: 12px;
    padding: 15px 16px; cursor: pointer; text-align: left;
    transition: box-shadow 0.15s;
    &:hover { box-shadow: 0 3px 10px rgba(20, 40, 80, 0.08); }
    &.disabled { opacity: 0.62; }
    .entry-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
      &.usage { background: #fff2dd; }
      &.recycle { background: #efe8fb; }
      &.scan { background: #e3f2ef; }
    }
    .entry-body { flex: 1; min-width: 0;
      b { display: flex; align-items: center; gap: 6px; font-size: 15px; color: #243b53; margin-bottom: 4px; }
      small { font-size: 12px; color: #8a98a7; line-height: 1.4; display: block; }
    }
    .entry-badge { font-size: 12px; color: #b26a00; background: #fff2dd; border-radius: 10px; padding: 2px 8px; flex-shrink: 0; }
  }
}

.form-heading {
  margin: 14px 0;
  h3 { font-size: 16px; margin: 0 0 7px; color: #243b53; line-height: 1.5; }
  p { font-size: 12px; color: #8a98a7; margin: 0; line-height: 1.6; }
}

.form-card {
  background: #fff;
  border: 1px solid #e2eaf1;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  display: flex; align-items: center; justify-content: space-between;
  color: #243b5a; margin-bottom: 12px; font-size: 14px;
}

.num-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.submit-btn { width: 100%; border-radius: 8px; }

.record-card {
  border-top: 1px solid #eef2f5;
  padding: 11px 0;
  .card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px;
    b { font-size: 13.5px; color: #344054; } }
  p { font-size: 12px; color: #7a8b9e; margin: 6px 0 0; line-height: 1.5; }
  .warn-line { color: #c77c12; }
  &.clickable { cursor: pointer; }
  .rc-arrow { font-size: 12px; color: #98a2b3; margin-left: 4px; transition: transform 0.2s; vertical-align: -1px;
    &.open { transform: rotate(180deg); } }
  .rc-detail {
    margin-top: 8px; background: #f7f9fb; border-radius: 8px; padding: 10px 12px;
    p { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 6px; font-size: 12px; color: #7a8b9e; line-height: 1.6; }
    p b { font-weight: 500; color: #344054; text-align: right; }
  }
}

.wq-tabs {
  :deep(.el-tabs__header) { margin-bottom: 2px; }
  :deep(.el-tabs__nav-wrap::after) { height: 1px; background: #eef2f5; }
  :deep(.el-tabs__item) { font-size: 13px; }
}

.metric-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center;
  > div { background: #f4f8fb; border-radius: 8px; padding: 12px 4px;
    b { display: block; font-size: 18px; color: #b26a00; }
    span { font-size: 12px; color: #98a2b3; } }
}

.scan-card {
  .scan-box {
    background: linear-gradient(160deg, #223349, #172538);
    color: #cfe0f5; border-radius: 14px;
    padding: 26px 0; margin-bottom: 12px;
    display: flex; flex-direction: column; gap: 6px;
    align-items: center; justify-content: center;
    cursor: pointer; font-size: 13.5px;
    small { font-size: 11px; color: #7a92b3; }
    &:hover { background: linear-gradient(160deg, #2a3f5c, #1d2f47); }
    &:focus-visible { outline: 2px solid #ff9411; outline-offset: 2px; }
  }
}

.scan-result {
  margin-top: 14px;
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 13px;
  &.ok { background: #f2faf6; border: 1px solid #bfe3d2; color: #1e6b52; }
  &.bad { background: #fdf3f3; border: 1px solid #e7c3c3; color: #b03a3a; }
  .sr-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 14px; }
  .sr-name { font-size: 15px; }
  p { margin: 4px 0; font-size: 12px; opacity: 0.9; }
}

.kb-cats {
  display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 4px;
  .kb-cat {
    font-size: 12px; color: #4e5969; background: #f2f3f5;
    border-radius: 12px; padding: 4px 12px; cursor: pointer;
    &.on { color: #fff; background: var(--ah-primary, #165dff); }
  }
}
.kb-item {
  border-top: 1px solid #eef2f5;
  padding: 11px 0; cursor: pointer;
  .card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px;
    b { font-size: 13.5px; color: #344054; line-height: 1.5; } }
  > p { font-size: 12px; color: #98a2b3; margin: 5px 0 0; }
  .kb-body {
    margin-top: 8px; background: #f7f9fb; border-radius: 8px; padding: 10px 12px;
    p { font-size: 12.5px; color: #4e5969; line-height: 1.7; margin: 0 0 6px; }
  }
}

.flow-mini {
  margin-top: 10px; background: #f7f9fb; border-radius: 8px; padding: 12px;
  .fm-batch { font-size: 12.5px; color: #243b53; font-weight: 600; margin-bottom: 8px; }
  .fm-link {
    position: relative; padding: 7px 0 7px 4px;
    &.dim { opacity: 0.65; }
    &::before { content: ''; position: absolute; left: 9px; top: 0; height: 100%; width: 1px; background: #dbe3ec; }
    &:first-of-type::before { top: 50%; }
    &:last-of-type::before { height: 50%; }
    .fl-line { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #344054; font-weight: 500; line-height: 1.5; }
    .fl-meta { display: flex; align-items: center; gap: 6px; margin: 4px 0 0 18px; font-size: 11.5px; color: #7a8b9e; flex-wrap: wrap; }
    .fl-break { margin: 4px 0 0 18px; font-size: 11.5px; color: #c77c12; }
  }
  .fm-dot {
    position: relative; z-index: 1;
    width: 10px; height: 10px; border-radius: 50%; background: var(--ah-primary, #165dff);
    flex-shrink: 0;
    &.unknown { background: #c9cfda; }
  }
}
</style>
