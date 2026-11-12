<template>
  <el-drawer :model-value="visible" size="46%" :with-header="true" :title="event ? `任务详情 · ${event.code}` : '任务详情'" @close="$emit('close')">
    <TaskDetailContent :event="event" />
  </el-drawer>
</template>

<script setup>
// 统一任务详情抽屉：内容复用 TaskDetailContent（事件/来源/举报证据/派发/核查/整改复核/全环节轨迹）
// 所有环节的操作弹窗同样内嵌 TaskDetailContent，保证每一步都能查看之前的详情与进度（用户硬性要求 2026-11-12）
import TaskDetailContent from './TaskDetailContent.vue'

defineProps({ visible: Boolean, event: Object })
defineEmits(['close'])
</script>
