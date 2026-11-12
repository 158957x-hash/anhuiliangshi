<template>
  <!-- 现场证据缩略图：点击放大预览；视频加播放角标；名称/时间/位置放 tooltip -->
  <div class="ev-thumbs">
    <el-tooltip v-for="(item, idx) in items" :key="(item.name || '') + idx" :content="tipText(item)" placement="top">
      <div class="ev-thumb-wrap" :style="{ width: size + 'px', height: size + 'px' }">
        <el-image
          :src="item.url" fit="cover"
          :preview-src-list="previewList" :initial-index="idx"
          preview-teleported hide-on-click-modal class="ev-thumb"
        >
          <template #error><div class="ev-fallback"><el-icon><Picture /></el-icon></div></template>
          <template #placeholder><div class="ev-fallback"><el-icon class="is-loading"><Loading /></el-icon></div></template>
        </el-image>
        <span v-if="item.type === 'video'" class="ev-play">▶</span>
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Picture, Loading } from '@element-plus/icons-vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  size: { type: Number, default: 64 }
})

const previewList = computed(() => (props.items || []).map((a) => a.url).filter(Boolean))
const tipText = (item) => {
  const parts = [item.type === 'video' ? '视频' : '照片', item.time, item.location].filter(Boolean)
  return parts.join(' · ')
}
</script>

<style scoped>
.ev-thumbs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.ev-thumb-wrap { position: relative; flex: none; border-radius: 4px; overflow: hidden; }
.ev-thumb { width: 100%; height: 100%; display: block; cursor: zoom-in; }
.ev-play {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 20px; height: 20px; line-height: 20px; text-align: center;
  font-size: 10px; color: #fff; background: rgba(0, 0, 0, 0.45); border-radius: 50%;
  pointer-events: none;
}
.ev-fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  color: var(--el-text-color-placeholder); background: var(--el-fill-color-light); font-size: 18px;
}
</style>
