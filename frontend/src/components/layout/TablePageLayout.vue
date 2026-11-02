<template>
  <div class="table-page-layout" :class="{ 'mobile-mode': isMobile }">
    <!-- 固定区域：操作按钮 -->
    <PageHeading class="layout-section-fixed">
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    </PageHeading>

    <!-- 固定区域：搜索和过滤器 -->
    <div v-if="$slots.filters" class="layout-section-fixed table-filters">
      <slot name="filters" />
    </div>

    <!-- 滚动区域：表格 -->
    <div class="layout-section-scrollable">
      <div class="card table-scroll-container">
        <slot name="table" />
      </div>
    </div>

    <!-- 固定区域：分页器 -->
    <div v-if="$slots.pagination" class="layout-section-fixed table-pagination">
      <slot name="pagination" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import PageHeading from './PageHeading.vue'

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.table-page-layout {
  @apply flex min-w-0 flex-col gap-4;
  height: calc(100dvh - 112px);
  min-height: 480px;
}
.layout-section-fixed { @apply min-w-0 flex-shrink-0; }
.layout-section-scrollable { @apply flex min-h-0 min-w-0 flex-1 flex-col; }
.table-filters { padding-bottom: 16px; border-bottom: 1px solid var(--surface-border); }
.table-pagination { padding-top: 4px; }
.table-scroll-container {
  @apply flex h-full min-w-0 flex-col overflow-hidden;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: var(--surface-panel);
}
.table-scroll-container :deep(.table-wrapper) {
  @apply flex-1 overflow-x-auto overflow-y-auto;
  scrollbar-gutter: stable;
}
.table-scroll-container :deep(table) { @apply w-full; min-width: max-content; display: table; }
.table-scroll-container :deep(th) {
  @apply px-4 py-3 text-sm font-medium;
  background: var(--surface-panel);
  color: var(--text-muted);
  border-bottom: 1px solid var(--surface-border);
}
.table-scroll-container :deep(td) {
  @apply px-4 py-3 text-sm;
  border-bottom: 1px solid var(--surface-rule);
}
.table-page-layout.mobile-mode { height: auto; min-height: 0; }
.table-page-layout.mobile-mode .table-scroll-container { height: auto; }
.table-page-layout.mobile-mode .layout-section-scrollable { @apply flex-none min-h-fit; }
.table-page-layout.mobile-mode .table-scroll-container :deep(table) { min-width: 100%; }
.table-filters :deep(.flex) { min-width: 0; }
@media (max-width: 639px) {
  .table-filters :deep(.input), .table-filters :deep(.select-trigger) { min-height: 44px; }
}
</style>
