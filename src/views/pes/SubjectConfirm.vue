<template>
  <div class="page-container">
    <!-- 企业视角：本主体确认卡 -->
    <div v-if="isEnterprise" class="panel">
      <div class="panel-title"><span class="title-text">本主体信息确认</span></div>
      <el-alert
        v-if="!confirmed"
        type="warning"
        show-icon
        :closable="false"
        title="主体信息尚未确认：确认前无法上报生产/经营台账"
        style="margin-bottom: 14px"
      />
      <el-descriptions :column="2" border>
        <el-descriptions-item label="主体编号">{{ mySubject?.id }}</el-descriptions-item>
        <el-descriptions-item label="主体名称">{{ mySubject?.name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ mySubject?.type === 'produce' ? '生产企业' : mySubject?.type === 'operate' ? '经营企业' : '回收主体' }}</el-descriptions-item>
        <el-descriptions-item label="法定代表人/负责人">{{ mySubject?.legal }}</el-descriptions-item>
        <el-descriptions-item label="许可证号">{{ mySubject?.license || '—' }}</el-descriptions-item>
        <el-descriptions-item label="地址">{{ mySubject?.address || '—' }}</el-descriptions-item>
        <el-descriptions-item label="区划代码">{{ mySubject?.regionCode }}</el-descriptions-item>
        <el-descriptions-item label="确认状态">
          <el-tag :type="confirmed ? 'success' : 'danger'" size="small" disable-transitions>{{ confirmed ? '已确认' : '未确认' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <div style="margin-top: 16px">
        <el-button v-if="!confirmed" type="primary" icon="CircleCheck" @click="doConfirm">确认本主体信息无误</el-button>
        <el-alert v-else type="success" :closable="false" show-icon
          :title="`已确认 · 确认人 ${myConfirm?.userName || '-'} · ${myConfirm?.confirmTime || '-'}`" />
      </div>
    </div>

    <!-- 监管视角：确认进度 -->
    <div class="panel">
      <div class="panel-title">
        <span class="title-text">主体确认进度（监管视图）</span>
        <div class="title-extra">
          <el-radio-group v-model="onlyUnconfirmed" size="small">
            <el-radio-button :value="false">全部</el-radio-button>
            <el-radio-button :value="true">仅未确认</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <el-table :data="monitorRows" border stripe>
        <el-table-column prop="subjectId" label="主体编号" width="130" />
        <el-table-column label="主体名称" min-width="220"><template #default="{ row }">{{ subjectName(row.subjectId) }}</template></el-table-column>
        <el-table-column prop="userName" label="确认人" width="120" />
        <el-table-column prop="confirmTime" label="确认时间" width="170"><template #default="{ row }">{{ row.confirmTime || '—' }}</template></el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '已确认' ? 'success' : 'danger'" size="small" disable-transitions>{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { fetchConfirms, confirmSubject } from '@/api/pes'
import { PES_SUBJECTS, PES_SUBJECT_MAP, PES_UNCONFIRMED_SUBJECTS } from '@/mock/pes/data'

const userStore = useUserStore()
const isEnterprise = computed(() => !!userStore.role?.subjectId && ['pes_producer', 'pes_operator', 'pes_recycler'].includes(userStore.role?.code))
const mySubjectId = computed(() => userStore.role?.subjectId)
const mySubject = computed(() => PES_SUBJECT_MAP[mySubjectId.value])

const confirms = ref([])
const confirmed = ref(false)
const myConfirm = computed(() => confirms.value.find((c) => c.subjectId === mySubjectId.value && c.status === '已确认'))
const onlyUnconfirmed = ref(false)

// 监管视图：全部演示主体的确认记录 + 未确认主体补充行
const monitorRows = computed(() => {
  const rows = confirms.value.map((c) => ({ ...c }))
  if (!onlyUnconfirmed.value) {
    PES_UNCONFIRMED_SUBJECTS.forEach((sid) => {
      if (!rows.some((r) => r.subjectId === sid)) {
        rows.push({ id: `CFM-V-${sid}`, subjectId: sid, userName: '—', confirmTime: '', status: '未确认', remark: '未建立确认记录（演示）' })
      }
    })
  }
  return onlyUnconfirmed.value ? rows.filter((r) => r.status !== '已确认') : rows
})

const subjectName = (sid) => PES_SUBJECT_MAP[sid]?.name || sid

const doConfirm = async () => {
  const rec = await confirmSubject(mySubjectId.value, userStore.role?.name)
  confirmed.value = true
  confirms.value = [rec, ...confirms.value]
  ElMessage.success('主体信息已确认，台账上报权限已开通（演示内存）')
}

const load = async () => {
  confirms.value = await fetchConfirms(userStore.role)
  confirmed.value = !!myConfirm.value
}

onMounted(load)
</script>
