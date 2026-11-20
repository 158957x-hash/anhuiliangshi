<template>
  <div class="page-container sil-subject">
    <header class="page-head">
      <div>
        <h2>主体信息核查</h2>
        <p>按属地查询种植主体和收储主体的基本信息与备案信息，供各级管理部门核对；皖政通提供同一份查询视图。</p>
      </div>
      <div class="head-actions">
        <el-input v-model="keyword" placeholder="搜索主体 / 联系人" clearable style="width: 220px" />
      </div>
    </header>

    <section class="panel">
      <el-tabs v-model="tab">
        <el-tab-pane :label="`种植主体（${planting.length}）`" name="planting">
          <el-table v-loading="loading" :data="plantingRows" stripe border>
            <el-table-column label="主体名称" min-width="220">
              <template #default="{ row }"><b>{{ row.name }}</b><small class="cell-sub">{{ row.type }} · {{ row.id }}</small></template>
            </el-table-column>
            <el-table-column prop="regionName" label="属地" min-width="180" />
            <el-table-column label="联系人" width="150"><template #default="{ row }">{{ row.owner }}<small class="cell-sub">{{ row.phone }}</small></template></el-table-column>
            <el-table-column label="备案计划" width="110"><template #default="{ row }">{{ row.filedCount }} 份</template></el-table-column>
            <el-table-column label="备案面积（亩）" width="140"><template #default="{ row }">{{ row.filedArea.toFixed(1) }}</template></el-table-column>
            <el-table-column label="预计产量（吨）" width="140"><template #default="{ row }">{{ row.filedYield.toFixed(1) }}</template></el-table-column>
            <el-table-column label="最近备案" width="160"><template #default="{ row }">{{ row.lastFiledAt || '—' }}</template></el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }"><el-button link type="primary" @click="openDetail(row, 'planting')">查看</el-button></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane :label="`收储主体（${storage.length}）`" name="storage">
          <el-table v-loading="loading" :data="storageRows" stripe border>
            <el-table-column label="主体名称" min-width="230">
              <template #default="{ row }"><b>{{ row.name }}</b><small class="cell-sub">{{ row.type }} · {{ row.id }}</small></template>
            </el-table-column>
            <el-table-column prop="regionName" label="属地" min-width="180" />
            <el-table-column label="联系人" width="150"><template #default="{ row }">{{ row.owner }}<small class="cell-sub">{{ row.phone }}</small></template></el-table-column>
            <el-table-column label="备案申报" width="110"><template #default="{ row }">{{ row.filedCount }} 份</template></el-table-column>
            <el-table-column label="备案重量（吨）" width="140"><template #default="{ row }">{{ row.filedWeight.toFixed(1) }}</template></el-table-column>
            <el-table-column label="用途" width="130"><template #default="{ row }">{{ row.usages.join('、') || '—' }}</template></el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }"><el-button link type="primary" @click="openDetail(row, 'storage')">查看</el-button></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
      <el-empty v-if="!loading && !currentRows.length" description="属地内暂无主体档案" :image-size="70" />
    </section>

    <el-drawer v-model="detailVisible" :title="detailType === 'planting' ? '种植主体信息' : '收储主体信息'" size="min(880px, 96vw)" append-to-body>
      <template v-if="current">
        <h3 class="block-title first">基本信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="主体名称">{{ current.name }}</el-descriptions-item>
          <el-descriptions-item label="主体类型">{{ current.type }}</el-descriptions-item>
          <el-descriptions-item label="主体编号">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="属地">{{ current.regionName }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ current.owner }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ current.phone }}</el-descriptions-item>
        </el-descriptions>

        <template v-if="detailType === 'planting'">
          <h3 class="block-title">备案信息（{{ current.filedCount }} 份 · {{ current.filedArea.toFixed(1) }} 亩 · {{ current.filedYield.toFixed(1) }} 吨）</h3>
          <el-table :data="current.plans" border size="small">
            <el-table-column prop="filedNo" label="备案号" min-width="190" />
            <el-table-column label="年度" width="110"><template #default="{ row }">{{ row.year }} {{ row.season }}</template></el-table-column>
            <el-table-column label="地块 / 面积" width="140"><template #default="{ row }">{{ row.plots?.length }} 块 · {{ row.area }} 亩</template></el-table-column>
            <el-table-column label="预计产量" width="110"><template #default="{ row }">{{ row.expectedYield }} 吨</template></el-table-column>
            <el-table-column label="状态" width="100"><template #default="{ row }">{{ SIL_PLAN_STATUS[row.status]?.name }}</template></el-table-column>
          </el-table>
        </template>
        <template v-else>
          <h3 class="block-title">备案信息（{{ current.filedCount }} 份 · {{ current.filedWeight.toFixed(1) }} 吨）</h3>
          <el-table :data="current.declares" border size="small">
            <el-table-column prop="filedNo" label="备案号" min-width="190" />
            <el-table-column label="作物 / 品种" min-width="150"><template #default="{ row }">{{ silCropName(row.crop) }} / {{ row.variety }}</template></el-table-column>
            <el-table-column label="重量（吨）" width="110"><template #default="{ row }">{{ row.expectedWeight }}</template></el-table-column>
            <el-table-column label="价格" width="100"><template #default="{ row }">{{ row.price }}</template></el-table-column>
            <el-table-column label="用途" width="90"><template #default="{ row }">{{ SIL_STORAGE_USAGE[row.usage] }}</template></el-table-column>
          </el-table>
        </template>
        <div class="drawer-footer">
          <el-button @click="router.push('/sil/map')">在种植上图查看</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { SIL_PLAN_STATUS, SIL_STORAGE_USAGE, silCropName, fetchSubjectCheck } from '@/api/silPlan'

const router = useRouter()
const userStore = useUserStore()
const role = computed(() => userStore.role)
const tab = ref('planting')
const keyword = ref('')
const planting = ref([])
const storage = ref([])
const loading = ref(false)
const detailVisible = ref(false)
const detailType = ref('planting')
const current = ref(null)

const match = row => !keyword.value || `${row.name} ${row.owner} ${row.phone}`.includes(keyword.value)
const plantingRows = computed(() => planting.value.filter(match))
const storageRows = computed(() => storage.value.filter(match))
const currentRows = computed(() => tab.value === 'planting' ? plantingRows.value : storageRows.value)

async function load() {
  loading.value = true
  try {
    const data = await fetchSubjectCheck(role.value)
    planting.value = data.planting
    storage.value = data.storage
  } catch (error) { ElMessage.error(error?.message || '加载失败') } finally { loading.value = false }
}

function openDetail(row, type) { detailType.value = type; current.value = row; detailVisible.value = true }

onMounted(load)
watch(() => role.value?.code, load)
</script>

<style scoped lang="scss">
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.page-head h2 { font-size: 18px; margin-bottom: 6px; }
.page-head p { font-size: 12px; color: var(--ah-text-muted); line-height: 1.6; max-width: 820px; }
.panel { flex: 1; min-height: 0; overflow: auto; }
.cell-sub { display: block; font-size: 11px; color: var(--ah-text-muted); margin-top: 3px; }
.block-title { font-size: 14px; margin: 18px 0 10px; }
.block-title.first { margin-top: 0; }
.drawer-footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
</style>
