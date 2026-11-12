<template>
  <div class="page-container public-page">
    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px"
      title="公众服务演示（无需登录演示入口）：面向社会公众的农药真伪查询与知识科普。" />

    <!-- 真伪查询 -->
    <div class="panel">
      <div class="panel-title"><span class="title-text">农药追溯码真伪查询</span></div>
      <div class="query-bar">
        <el-input
          v-model="code"
          size="large"
          placeholder="输入包装追溯码（演示可输入 HG20260301A，或任意乱码测试假货提示）"
          clearable
          @keyup.enter="doQuery"
        />
        <el-button size="large" type="primary" :loading="querying" @click="doQuery">查询</el-button>
        <el-button size="large" @click="doScan">模拟扫码</el-button>
      </div>

      <el-empty v-if="!result" description="请输入追溯码查询产品登记与流向信息" />

      <!-- 查询命中 -->
      <div v-else-if="result.found" class="result-card ok">
        <div class="rc-head">
          <el-icon :size="26" color="#1e6b52"><CircleCheckFilled /></el-icon>
          <div>
            <div class="rc-title">查询成功 · 已登记产品</div>
            <div class="rc-sub">追溯码 {{ result.batch.batchNo }} 与登记信息一致</div>
          </div>
        </div>
        <el-descriptions :column="3" border style="margin-top: 14px">
          <el-descriptions-item label="产品名称">{{ result.product.name }}</el-descriptions-item>
          <el-descriptions-item label="登记证号">{{ result.product.regNo }}</el-descriptions-item>
          <el-descriptions-item label="毒性">{{ result.product.toxAName }}</el-descriptions-item>
          <el-descriptions-item label="生产企业">{{ result.product.producerName }}</el-descriptions-item>
          <el-descriptions-item label="生产日期">{{ result.batch.produceDate }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ result.product.content }}（{{ result.product.formulation }}）</el-descriptions-item>
        </el-descriptions>
        <div class="rc-chain">
          <el-tag v-for="(n, i) in result.chain" :key="i" size="small" type="success" effect="plain" disable-transitions>{{ n }}</el-tag>
          <el-icon v-if="result.chain.length" color="#8ea6c8"><ArrowRight /></el-icon>
          <span class="rc-chain-tip">点击右上「流向追溯」查看完整链路</span>
        </div>
      </div>

      <!-- 查询未命中 -->
      <div v-else class="result-card bad">
        <div class="rc-head">
          <el-icon :size="26" color="#b03a3a"><CircleCloseFilled /></el-icon>
          <div>
            <div class="rc-title">未查询到登记信息，谨防假冒！</div>
            <div class="rc-sub">追溯码「{{ code }}」未匹配到任何已登记批次</div>
          </div>
        </div>
        <el-alert type="error" :closable="false" show-icon style="margin-top: 14px"
          title="请勿购买使用。投诉举报请拨打 12316（全国农业系统公益服务热线）。" />
      </div>
    </div>

    <!-- 知识库 -->
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">农药知识库</span>
        <div class="title-extra">
          <el-input v-model="kbKeyword" clearable placeholder="搜索标题/内容" style="width: 220px" />
        </div>
      </div>
      <el-tabs v-model="kbCategory">
        <el-tab-pane label="全部" name="" />
        <el-tab-pane v-for="c in categories" :key="c" :label="c" :name="c" />
      </el-tabs>
      <div class="kb-grid">
        <div v-for="a in kbList" :key="a.id" class="kb-card" role="button" tabindex="0" @click="openArticle(a)" @keyup.enter="openArticle(a)">
          <div class="kb-cat"><el-tag size="small" effect="plain" disable-transitions>{{ a.category }}</el-tag></div>
          <div class="kb-title">{{ a.title }}</div>
          <div class="kb-meta">{{ a.source }} · {{ a.date }} · 阅读 {{ a.views }}</div>
          <div class="kb-brief">{{ a.content[0] }}</div>
        </div>
        <el-empty v-if="!kbList.length" description="未找到相关文章" style="grid-column: 1 / -1" />
      </div>
    </div>

    <!-- 文章详情 -->
    <el-dialog v-model="articleVisible" :title="article?.title" width="640px">
      <div class="kb-article">
        <div class="kb-meta">{{ article?.source }} · {{ article?.date }} · 阅读 {{ article?.views }}</div>
        <p v-for="(p, i) in article?.content || []" :key="i">{{ p }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchBatches, scanQR, fetchKb, fetchKbCategories } from '@/api/pes'
import { PES_SUBJECT_MAP, PES_PRODUCT_MAP, PES_FLOWS } from '@/mock/pes/data'

const route = useRoute()

const code = ref('')
const querying = ref(false)
const result = ref(null)
const kbCategory = ref('')
const kbKeyword = ref('')
const categories = ref([])
const articleVisible = ref(false)
const article = ref(null)

const kbList = computed(() => {
  let list = kbAll.value
  if (kbCategory.value) list = list.filter((a) => a.category === kbCategory.value)
  if (kbKeyword.value) {
    const kw = kbKeyword.value
    list = list.filter((a) => a.title.includes(kw) || a.content.some((p) => p.includes(kw)))
  }
  return list
})

const kbAll = ref([])

const doQuery = async () => {
  if (!code.value) return
  querying.value = true
  try {
    const batches = await fetchBatches()
    const batch = batches.find((b) => b.batchNo.toLowerCase() === code.value.trim().toLowerCase())
    if (batch) {
      const product = PES_PRODUCT_MAP[batch.productId]
      const flows = PES_FLOWS.filter((f) => f.batchId === batch.id && f.type === 'sale')
      const chain = [product.producerName]
      flows.slice(0, 2).forEach((f) => { if (f.to) chain.push(PES_SUBJECT_MAP[f.to]?.name || '经营网点') })
      result.value = { found: true, batch, product, chain }
    } else {
      result.value = { found: false }
    }
  } finally { querying.value = false }
}

const doScan = async () => {
  const { batch } = await scanQR()
  code.value = batch.batchNo
  await doQuery()
}

const openArticle = (a) => { article.value = a; articleVisible.value = true }

onMounted(async () => {
  ;[kbAll.value, categories.value] = await Promise.all([fetchKb('', ''), fetchKbCategories()])
  if (route.query.code) { code.value = String(route.query.code); await doQuery() }
})
</script>

<style lang="scss" scoped>
.query-bar { display: flex; gap: 10px; margin: 6px 0 18px; .el-input { flex: 1; } }

.result-card {
  border-radius: 12px;
  padding: 18px 20px;
  border: 1px solid;
  &.ok { background: #f2faf6; border-color: #bfe3d2; }
  &.bad { background: #fdf3f3; border-color: #e7c3c3; }
  .rc-head { display: flex; align-items: center; gap: 12px;
    .rc-title { font-size: 16px; font-weight: 700; color: var(--ah-text); }
    .rc-sub { font-size: 13px; color: var(--ah-text-secondary); margin-top: 2px; }
  }
  .rc-chain { margin-top: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    .rc-chain-tip { font-size: 12px; color: var(--ah-text-secondary); }
  }
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.kb-card {
  background: #fbfcfe;
  border: 1px solid #eef1f6;
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: box-shadow .2s, transform .2s;
  &:hover { box-shadow: 0 4px 14px rgba(15, 62, 120, 0.12); transform: translateY(-2px); }
  &:focus-visible { outline: 2px solid #0f5eb5; outline-offset: 2px; }
  .kb-cat { margin-bottom: 8px; }
  .kb-title { font-size: 14.5px; font-weight: 600; color: var(--ah-text); }
  .kb-meta { font-size: 12px; color: var(--ah-text-secondary); margin: 6px 0; }
  .kb-brief {
    font-size: 12.5px; color: #4a5568;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
}
.kb-article {
  .kb-meta { font-size: 12.5px; color: var(--ah-text-secondary); margin-bottom: 12px; }
  p { font-size: 14px; line-height: 1.9; color: #344054; margin: 0 0 10px; }
}
@media (max-width: 1100px) { .kb-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 700px) { .kb-grid { grid-template-columns: 1fr; } }
</style>
