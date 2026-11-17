<template>
  <section class="mobile-entry-card" aria-label="功能入口">
    <div class="entry-head">
      <div><b>{{ title }}</b><span v-if="subtitle">{{ subtitle }}</span></div>
      <el-tag v-if="roleLabel" size="small" type="info" effect="plain">{{ roleLabel }}</el-tag>
    </div>
    <div class="entry-grid">
      <button v-for="item in visibleItems" :key="item.key" class="entry-item" :class="item.tone || 'blue'" type="button" @click="activate(item)">
        <strong>{{ item.label }}</strong>
        <span>{{ item.description }}</span>
        <em v-if="item.badge !== undefined">{{ item.badge }}</em>
      </button>
    </div>
    <p v-if="note" class="entry-note">{{ note }}</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, default: '功能入口' },
  subtitle: { type: String, default: '' },
  roleLabel: { type: String, default: '' },
  note: { type: String, default: '' },
  items: { type: Array, default: () => [] }
})
const emit = defineEmits(['select'])
const router = useRouter()
const visibleItems = computed(() => props.items.filter(item => item && item.visible !== false))
function activate(item) {
  if (item.action) return emit('select', item)
  if (item.to) router.push(item.to)
}
</script>

<style scoped lang="scss">
.mobile-entry-card{background:#fff;border:1px solid #e5ebf2;border-radius:14px;padding:14px;margin:12px 0}.entry-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;color:#243b5a}.entry-head b,.entry-head span{display:block}.entry-head b{font-size:15px}.entry-head span{font-size:11px;color:#98a2b3;margin-top:3px}.entry-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.entry-item:nth-child(3){grid-column:1 / -1}.entry-item{position:relative;border:0;border-radius:10px;padding:12px;text-align:left;color:#fff;min-height:76px;cursor:pointer}.entry-item strong,.entry-item span{display:block}.entry-item strong{font-size:14px}.entry-item span{font-size:11px;line-height:1.45;opacity:.9;margin-top:5px}.entry-item em{position:absolute;right:9px;top:9px;background:rgba(255,255,255,.22);border-radius:10px;padding:1px 6px;font-style:normal;font-size:11px}.entry-item.blue{background:#3978bd}.entry-item.green{background:#2f8c72}.entry-item.orange{background:#d8892f}.entry-item.red{background:#c85b55}.entry-item.purple{background:#7563a9}.entry-note{font-size:11px;color:#98a2b3;line-height:1.5;margin:10px 0 0}
</style>
