<template>
  <div class="page-container fsr-page">
    <div class="page-head">
      <div>
        <h2>业务配置</h2>
        <p>维护事件类型字典、填报要素与流转环节配置（省级角色）。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="load">刷新配置</el-button>
    </div>

    <el-alert
      type="warning" show-icon :closable="false" class="mb-12"
      title="配置规则为演示规则，正式口径待业务确认"
    />

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" class="mb-12">
      <el-button size="small" type="primary" plain @click="load">重试加载</el-button>
    </el-alert>

    <div v-loading="loading" class="panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane
          v-for="(sec, key) in sections" :key="key"
          :label="sec.name" :name="key" lazy
        >
          <!-- 区块元信息：版本号/生效时间/更新人/审批状态 -->
          <div class="sec-meta">
            <span>版本号：v{{ sec.version }}</span>
            <el-divider direction="vertical" />
            <span>生效时间：{{ sec.effectiveAt }}</span>
            <el-divider direction="vertical" />
            <span>更新人：{{ sec.updatedBy }}</span>
            <el-divider direction="vertical" />
            <span>审批状态：{{ sec.approvedStatus }}</span>
            <el-tag size="small" type="warning" class="ml-8">演示</el-tag>
          </div>

          <!-- 事件类型字典 -->
          <el-table v-if="key === 'eventTypes'" :data="sec.value" stripe border empty-text="暂无事件类型配置">
            <el-table-column prop="code" label="编码" width="110" />
            <el-table-column prop="name" label="名称" width="110" />
            <el-table-column prop="demoRiskRule" label="演示风险规则" min-width="280" show-overflow-tooltip />
            <el-table-column label="演示时限天数（天）" width="140" align="center">
              <template #default="{ row }">{{ row.demoDeadline }}</template>
            </el-table-column>
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" :before-change="beforeToggle" />
              </template>
            </el-table-column>
          </el-table>

          <!-- 填报要素配置 -->
          <el-table v-else-if="key === 'reportFields'" :data="sec.value" stripe border empty-text="暂无填报要素配置">
            <el-table-column prop="field" label="要素" min-width="180" />
            <el-table-column label="必填" width="80" align="center">
              <template #default="{ row }">{{ row.required ? '是' : '否' }}</template>
            </el-table-column>
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" />
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ row.note || '—' }}</template>
            </el-table-column>
          </el-table>

          <!-- 流转环节配置 -->
          <el-table v-else :data="sec.value" stripe border empty-text="暂无流转环节配置">
            <el-table-column prop="step" label="环节" width="150" />
            <el-table-column prop="owner" label="责任主体" width="130" />
            <el-table-column label="演示时限天数（天）" width="140" align="center">
              <template #default="{ row }">{{ row.demoDeadline == null ? '—' : row.demoDeadline }}</template>
            </el-table-column>
            <el-table-column prop="note" label="说明" min-width="240" show-overflow-tooltip />
          </el-table>

          <div class="sec-actions">
            <el-button type="primary" :loading="savingKey === key" @click="save(key)">保存配置</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchBizConfig, saveBizConfig } from '@/api/fsr'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const sections = ref({})
const activeTab = ref('eventTypes')
const loading = ref(false)
const error = ref('')
const savingKey = ref('')

const operatorName = () => (userStore.role?.name ? `${userStore.role.name}（演示）` : '省管理员（演示）')

// 事件类型启用开关：切换前二次确认，取消则保持原状态
const beforeToggle = () =>
  ElMessageBox.confirm('确认切换该事件类型的启用状态？切换后需点击“保存配置”方可生效。', '启用二次确认', {
    confirmButtonText: '确认切换',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => true).catch(() => Promise.reject())

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const conf = await fetchBizConfig()
    sections.value = conf.sections || {}
  } catch (e) {
    error.value = '业务配置加载失败：' + (e?.message || '网络异常，请重试')
  } finally {
    loading.value = false
  }
}

const save = async (key) => {
  const sec = sections.value[key]
  if (!sec) return
  savingKey.value = key
  try {
    const r = await saveBizConfig(key, sec.value, operatorName())
    if (!r.success) return ElMessage.error(r.message || '保存失败')
    ElMessage.success(`配置已保存，新版本号 v${r.version}`)
    load()
  } finally {
    savingKey.value = ''
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.fsr-page { overflow: auto; }
.page-head { display: flex; justify-content: space-between; margin-bottom: 14px; }
.page-head h2 { margin: 4px 0; font-size: 20px; font-weight: 600; }
.page-head p { margin: 0; color: var(--ah-text-secondary); font-size: 13px; }
.sec-meta {
  display: flex; align-items: center; flex-wrap: wrap;
  padding: 8px 12px; margin-bottom: 12px;
  background: var(--ah-bg); border-radius: 6px;
  color: var(--ah-text-secondary); font-size: 13px;
}
.sec-actions { margin-top: 14px; display: flex; justify-content: flex-end; }
.ml-8 { margin-left: 8px; }
</style>
