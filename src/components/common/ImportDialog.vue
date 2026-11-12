<template>
  <el-dialog v-model="visible" :title="title" width="720px" :close-on-click-modal="false" @closed="reset">
    <el-steps :active="step" align-center finish-status="success" simple style="margin-bottom: 16px">
      <el-step title="下载模板" />
      <el-step title="上传文件" />
      <el-step title="校验入库" />
    </el-steps>

    <!-- 步骤1：模板 -->
    <div v-if="step === 0" class="imp-hint">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item v-for="c in columns" :key="c.key" :label="c.label">
          {{ c.hint }}<span v-if="c.required" class="req">（必填）</span>
        </el-descriptions-item>
      </el-descriptions>
      <div class="imp-actions">
        <el-button type="primary" icon="Download" @click="downloadTemplate">下载导入模板（CSV）</el-button>
        <el-button icon="Right" @click="step = 1">下一步</el-button>
      </div>
    </div>

    <!-- 步骤2：上传 -->
    <div v-else-if="step === 1" class="imp-hint">
      <el-upload
        drag
        accept=".csv,.txt"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="onFileChange"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽 CSV 文件到此处，或<em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">按模板列顺序填写；以 UTF-8 编码保存；首行为表头</div>
        </template>
      </el-upload>
      <div v-if="rawRows.length" class="imp-preview">
        <el-alert type="success" :closable="false" show-icon :title="`解析成功：共 ${rawRows.length} 行数据`" />
        <el-table :data="rawRows.slice(0, 5)" size="small" border max-height="180" style="margin-top: 8px">
          <el-table-column v-for="c in columns" :key="c.key" :prop="c.key" :label="c.label" min-width="90" show-overflow-tooltip />
        </el-table>
        <div class="imp-actions">
          <el-button @click="step = 0">上一步</el-button>
          <el-button type="primary" :loading="importing" @click="doImport">开始导入</el-button>
        </div>
      </div>
    </div>

    <!-- 步骤3：结果 -->
    <div v-else class="imp-hint">
      <el-alert
        :type="result.failed ? 'warning' : 'success'"
        :closable="false"
        show-icon
        :title="`导入完成：共 ${result.total} 行，成功 ${result.success} 行，失败 ${result.failed} 行`"
      />
      <el-table :data="result.items" size="small" border max-height="260" style="margin-top: 8px">
        <el-table-column prop="row" label="CSV行号" width="80" align="center" />
        <el-table-column prop="status" label="结果" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '成功' ? 'success' : 'danger'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="msg" label="失败原因" min-width="220" show-overflow-tooltip />
        <el-table-column label="数据摘要" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ summary(row.data) }}</template>
        </el-table-column>
      </el-table>
      <div class="imp-actions">
        <el-button @click="step = 1">重新上传</el-button>
        <el-button type="primary" @click="visible = false">关闭</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const props = defineProps({
  title: { type: String, required: true },
  columns: { type: Array, required: true }, // [{key,label,required,hint,example}]
  doImport: { type: Function, required: true } // async (rows) => {total,success,failed,items}
})
const emit = defineEmits(['success'])

const visible = ref(false)
const step = ref(0)
const rawRows = ref([])
const importing = ref(false)
const result = ref({ total: 0, success: 0, failed: 0, items: [] })

const open = () => { visible.value = true }
const reset = () => { step.value = 0; rawRows.value = []; result.value = { total: 0, success: 0, failed: 0, items: [] } }

const downloadTemplate = () => {
  const header = props.columns.map((c) => c.label).join(',')
  const examples = props.columns.map((c) => c.example || '').join(',')
  // \ufeff BOM 保证 Excel 打开不乱码
  const csv = '\ufeff' + header + '\n' + examples + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${props.title.replace(/^.*（|）.*$/g, '') || '导入模板'}模板.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

const onFileChange = (file) => {
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result || '').replace(/^\ufeff/, '')
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) { ElMessage.warning('文件没有数据行'); return }
    const headers = lines[0].split(',').map((h) => h.trim())
    const keys = props.columns.map((c) => c.label)
    if (!props.columns.every((c) => headers.includes(c.label))) {
      ElMessage.error(`表头不匹配：应为 ${keys.join(',')}（当前：${headers.join(',')}）`)
      return
    }
    rawRows.value = lines.slice(1).map((l) => {
      const cells = l.split(',')
      const row = {}
      props.columns.forEach((c, i) => { row[c.key] = (cells[headers.indexOf(c.label)] || '').trim() })
      return row
    })
    ElMessage.success(`解析 ${rawRows.value.length} 行`)
  }
  reader.readAsText(file.raw, 'utf-8')
}

const runImport = async () => {
  importing.value = true
  try {
    result.value = await props.doImport(rawRows.value)
    step.value = 2
    if (result.value.success) emit('success', result.value)
  } finally { importing.value = false }
}

// props.doImport 由父组件传入，runImport 包装供模板调用
const doImport = runImport
defineExpose({ open })

const summary = (d) => props.columns.slice(0, 3).map((c) => d[c.key]).filter(Boolean).join(' / ')
</script>

<style lang="scss" scoped>
.imp-hint {
  .req { color: var(--el-color-danger); }
  .imp-actions { display: flex; justify-content: center; gap: 12px; margin-top: 14px; }
}
</style>
