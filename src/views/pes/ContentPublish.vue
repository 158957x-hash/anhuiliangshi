<template>
  <div class="pes-page">
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">内容发布</span>
        <div class="title-extra">
          <el-button type="primary" icon="Plus" @click="openCreate">新增内容</el-button>
          <el-button icon="Refresh" @click="load">刷新</el-button>
        </div>
      </div>

      <el-form inline class="filter-bar">
        <el-form-item label="内容状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 130px" @change="load">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已下架" value="paused" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容分类">
          <el-select v-model="filters.category" clearable placeholder="全部" style="width: 140px" @change="load">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="110" align="center" />
        <el-table-column prop="source" label="发布单位" width="150" show-overflow-tooltip />
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="STATUS_TAG[row.status] || 'info'" disable-transitions>{{ STATUS_NAME[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishTime" label="发布时间" width="160"><template #default="{ row }">{{ row.publishTime || '—' }}</template></el-table-column>
        <el-table-column prop="views" label="阅读量" width="90" align="center" />
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="row.status !== 'published'" link type="success" @click="doPublish(row)">发布</el-button>
            <el-button v-else link type="warning" @click="doUnpublish(row)">下架</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑内容' : '新增内容'" width="640px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="editForm" :rules="rules" label-width="90px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="editForm.title" maxlength="60" show-word-limit placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="editForm.category" placeholder="请选择分类" style="width: 220px">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="发布单位" prop="source">
          <el-input v-model="editForm.source" maxlength="30" placeholder="如：安徽省农业农村厅" />
        </el-form-item>
        <el-form-item label="正文" prop="contentText">
          <el-input v-model="editForm.contentText" type="textarea" :rows="8" placeholder="每行一段，段落间直接换行" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchKbArticles, saveKbArticle, publishKbArticle, fetchKbCategories } from '@/api/pes'

const STATUS_NAME = { draft: '草稿', published: '已发布', paused: '已下架' }
const STATUS_TAG = { draft: 'info', published: 'success', paused: 'warning' }

const rows = ref([])
const categories = ref([])
const loading = ref(false)
const saving = ref(false)
const filters = reactive({ status: '', category: '' })
const editVisible = ref(false)
const formRef = ref()
const editForm = reactive({ id: '', title: '', category: '', source: '', contentText: '' })
const rules = {
  title: [{ required: true, message: '标题必填', trigger: 'blur' }],
  category: [{ required: true, message: '分类必选', trigger: 'change' }],
  source: [{ required: true, message: '发布单位必填', trigger: 'blur' }],
  contentText: [{ required: true, message: '正文必填', trigger: 'blur' }]
}

const load = async () => {
  loading.value = true
  try {
    rows.value = await fetchKbArticles({})
  } finally { loading.value = false }
}

const openCreate = () => {
  Object.assign(editForm, { id: '', title: '', category: '', source: '省农业农村厅', contentText: '' })
  editVisible.value = true
}

const openEdit = (row) => {
  Object.assign(editForm, { id: row.id, title: row.title, category: row.category, source: row.source, contentText: row.content.join('\n') })
  editVisible.value = true
}

const save = () => formRef.value.validate(async (ok) => {
  if (!ok) return
  saving.value = true
  try {
    const res = await saveKbArticle({
      id: editForm.id || undefined,
      title: editForm.title,
      category: editForm.category,
      source: editForm.source,
      content: editForm.contentText.split('\n').map((s) => s.trim()).filter(Boolean)
    })
    res.success ? ElMessage.success(editForm.id ? '内容已保存' : '内容已保存为草稿') : ElMessage.error(res.msg)
    editVisible.value = false
    await load()
  } finally { saving.value = false }
})

const doPublish = (row) => ElMessageBox.confirm(`确认发布《${row.title}》？发布后皖企通/公众端可见。`, '发布确认', { type: 'warning' })
  .then(async () => {
    const res = await publishKbArticle(row.id, 'publish')
    res.success ? ElMessage.success('已发布') : ElMessage.error(res.msg)
    await load()
  }).catch(() => {})

const doUnpublish = (row) => ElMessageBox.confirm(`确认下架《${row.title}》？下架后皖企通/公众端不再展示。`, '下架确认', { type: 'warning' })
  .then(async () => {
    const res = await publishKbArticle(row.id, 'unpublish')
    res.success ? ElMessage.success('已下架') : ElMessage.error(res.msg)
    await load()
  }).catch(() => {})

onMounted(async () => {
  categories.value = await fetchKbCategories()
  await load()
})
onActivated(load)
</script>
