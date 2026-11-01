<template>
  <div class="space-y-5">
    <div v-if="!embedded" class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">MODEL CATALOG</p>
        <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{{ t('modelPlaza.title') }}</h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-dark-400">发现模型，清晰比较价格，复制模型 ID 即可接入。</p>
      </div>
      <span class="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-dark-700 dark:text-dark-300">价格单位 USD · Token 按百万计费</span>
    </div>

    <div v-if="descriptionHtml" class="plaza-description rounded-2xl border border-gray-200 bg-white p-5 text-sm dark:border-dark-700 dark:bg-dark-800" v-html="descriptionHtml"></div>
    <p v-if="!isAuthenticated" class="text-xs text-gray-500 dark:text-dark-400">{{ t('modelPlaza.anonymousHint') }}</p>

    <div v-if="loading" class="flex min-h-[240px] items-center justify-center" role="status" aria-label="加载模型">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600/25 border-t-primary-600"></div>
    </div>
    <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{{ t('modelPlaza.loadFailed') }}</div>
    <template v-else>
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800 sm:p-5">
        <nav aria-label="模型分组" class="flex flex-wrap gap-2 border-b border-gray-100 pb-4 dark:border-dark-700">
          <button v-for="category in categories" :key="category" type="button" :data-category="category" :aria-pressed="selectedCategory === category" class="filter-button" :class="{ active: selectedCategory === category }" @click="selectedCategory = category">
            {{ category }} <span class="ml-1 opacity-60">{{ categoryCount(category) }}</span>
          </button>
        </nav>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row">
          <div class="relative flex-1">
            <Icon name="search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input v-model="searchQuery" type="search" aria-label="搜索模型 ID 或分组" placeholder="搜索模型 ID 或分组…" class="input w-full pl-10" />
          </div>
          <select v-model="selectedFamily" aria-label="模型系列" class="input sm:w-44">
            <option value="all">全部模型系列</option>
            <option v-for="family in families" :key="family" :value="family">{{ family }}</option>
          </select>
          <div class="flex shrink-0 rounded-xl bg-gray-100 p-1 dark:bg-dark-900" role="group" aria-label="显示方式">
            <button type="button" aria-label="卡片视图" :aria-pressed="view === 'cards'" class="view-button" :class="{ selected: view === 'cards' }" @click="view = 'cards'">卡片</button>
            <button type="button" aria-label="表格视图" :aria-pressed="view === 'table'" class="view-button" :class="{ selected: view === 'table' }" @click="view = 'table'">表格</button>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-dark-400" aria-live="polite">
        <p>共 {{ entries.length }} 个模型配置 <span class="mx-1">·</span> 同一模型在不同分组分别展示</p>
        <p>标准时段基础档价格 · 完整计费规则见详情</p>
      </div>

      <div v-if="entries.length && view === 'cards'" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="entry in entries" :key="entry.key" data-model-card class="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-primary-300 hover:shadow-md dark:border-dark-700 dark:bg-dark-800 dark:hover:border-primary-700">
          <div class="mb-4 flex items-center justify-between gap-2">
            <span class="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">{{ entry.family }}</span>
            <span class="text-xs text-gray-500 dark:text-dark-400">{{ entry.price.token ? 'Token 计费' : entry.price.unit.replace('USD / ', '按') + '计费' }}</span>
          </div>
          <h2 class="break-all font-mono text-base font-semibold leading-6 text-gray-900 dark:text-white">{{ entry.model.name }}</h2>
          <p class="mt-2 text-xs text-gray-500 dark:text-dark-400">{{ entry.group.name }}</p>
          <div class="my-5 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 dark:bg-dark-900/60">
            <div><p class="text-xs text-gray-500 dark:text-dark-400">{{ entry.price.token ? '输入' : '单价' }}</p><p class="mt-1 break-all font-mono text-lg font-semibold text-gray-900 dark:text-white">{{ entry.price.input }}</p></div>
            <div v-if="entry.price.output !== null"><p class="text-xs text-gray-500 dark:text-dark-400">输出</p><p class="mt-1 break-all font-mono text-lg font-semibold text-gray-900 dark:text-white">{{ entry.price.output }}</p></div>
            <p class="col-span-2 text-[11px] text-gray-500 dark:text-dark-400">{{ entry.price.unit }}{{ entry.price.tiered ? ' · 基础档，含阶梯定价' : '' }}</p>
          </div>
          <div class="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-dark-700">
            <button type="button" class="action-button" :aria-label="`复制 ${entry.model.name} 的模型 ID`" @click="copyToClipboard(entry.model.name)"><Icon name="copy" size="sm" />复制 ID</button>
            <button type="button" data-details class="action-button text-primary-600 dark:text-primary-400" @click="selected = entry">价格详情 <span aria-hidden="true">→</span></button>
          </div>
        </article>
      </div>
      <div v-else-if="entries.length" class="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 dark:bg-dark-900 dark:text-dark-400"><tr><th class="p-4">模型 ID / 系列</th><th class="p-4">分组</th><th class="p-4">输入 / 单价</th><th class="p-4">输出</th><th class="p-4">单位</th><th class="p-4">操作</th></tr></thead>
          <tbody><tr v-for="entry in entries" :key="entry.key" class="border-t border-gray-100 text-gray-700 dark:border-dark-700 dark:text-dark-200">
            <td class="max-w-xs break-all p-4"><p class="font-mono font-medium text-gray-900 dark:text-white">{{ entry.model.name }}</p><p class="mt-1 text-xs text-gray-500">{{ entry.family }}</p></td>
            <td class="p-4">{{ entry.group.name }}</td><td class="p-4 font-mono">{{ entry.price.input }}</td><td class="p-4 font-mono">{{ entry.price.output ?? '—' }}</td><td class="p-4 text-xs">{{ entry.price.unit }}<p v-if="entry.price.tiered" class="mt-1 text-gray-500">基础档 · 阶梯定价</p></td>
            <td class="p-4"><div class="flex gap-3"><button type="button" class="action-button" :aria-label="`复制 ${entry.model.name} 的模型 ID`" @click="copyToClipboard(entry.model.name)">复制 ID</button><button type="button" data-details class="action-button text-primary-600 dark:text-primary-400" @click="selected = entry">详情</button></div></td>
          </tr></tbody>
        </table>
      </div>
      <div v-else class="rounded-2xl border border-dashed border-gray-300 px-5 py-16 text-center dark:border-dark-600">
        <p class="text-sm text-gray-500 dark:text-dark-400">{{ hasFilters ? t('modelPlaza.noSearchResult') : t('modelPlaza.empty') }}</p>
        <button v-if="hasFilters" type="button" class="mt-4 text-sm text-primary-600 dark:text-primary-400" @click="resetFilters">清除筛选</button>
      </div>
    </template>
    <BaseDialog :show="selected !== null" title="模型价格详情" width="extra-wide" @close="selected = null">
      <div v-if="selected" class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0"><p class="break-all font-mono text-lg font-semibold text-gray-900 dark:text-white">{{ selected.model.name }}</p><p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ selected.family }} · 系列仅依据模型 ID 识别</p></div><button type="button" class="action-button" @click="copyToClipboard(selected.model.name)"><Icon name="copy" size="sm" />复制 ID</button></div>
        <p class="text-sm text-gray-500 dark:text-dark-400">Token 价格单位为 USD / 1M tokens；按次、图片等价格保留各自单位。下表展示分组倍率、缓存、阶梯与分时时段；高峰规则以分组说明为准。</p>
        <PlazaGroupSection :group="{ ...selected.group, models: [selected.model] }" />
        <div v-if="selected.model.time_pricing" class="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-dark-900 dark:text-dark-300">分时定价时区：{{ selected.model.time_pricing.timezone }}{{ selected.model.time_pricing.weekdays_only ? ' · 仅工作日生效，周末按标准价格' : '' }}<p v-for="period in selected.model.time_pricing.periods" :key="period.start_time" class="mt-1 font-mono">{{ period.start_time }}–{{ period.end_time }} ×{{ period.multiplier }}</p></div>
      </div>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import Icon from '@/components/icons/Icon.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import PlazaGroupSection from './PlazaGroupSection.vue'
import type { ModelPlazaGroup, ModelPlazaResponse, PlazaModel } from '@/api/modelPlaza'
import { useAuthStore } from '@/stores/auth'
import { useClipboard } from '@/composables/useClipboard'
import { categoryNames, modelFamily, priceSummary } from './catalog'

const props = defineProps<{ response: ModelPlazaResponse | null; loading: boolean; error?: boolean; embedded?: boolean }>()
const { t } = useI18n()
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const { copyToClipboard } = useClipboard()
const selectedCategory = ref('全部模型')
const selectedFamily = ref('all')
const searchQuery = ref('')
const view = ref<'cards' | 'table'>('cards')
interface Entry { key: string; group: ModelPlazaGroup; model: PlazaModel; family: string; price: ReturnType<typeof priceSummary> }
const selected = ref<Entry | null>(null)
const groups = computed(() => props.response?.groups ?? [])
// Preserve additional configured names without guessing a domestic/foreign classification.
const categories = computed(() => ['全部模型', ...categoryNames, ...new Set(groups.value.map(g => g.name).filter(name => !(categoryNames as readonly string[]).includes(name)))])
const families = computed(() => [...new Set(groups.value.flatMap(g => g.models.map(m => modelFamily(m.name))))].sort())
const categoryCount = (category: string) => groups.value.filter(g => category === '全部模型' || g.name === category).reduce((sum, g) => sum + g.models.length, 0)
const hasFilters = computed(() => selectedCategory.value !== '全部模型' || selectedFamily.value !== 'all' || searchQuery.value.trim() !== '')
function resetFilters() { selectedCategory.value = '全部模型'; selectedFamily.value = 'all'; searchQuery.value = '' }
const entries = computed<Entry[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return groups.value.filter(g => selectedCategory.value === '全部模型' || g.name === selectedCategory.value).flatMap(group => group.models.filter(model =>
    (selectedFamily.value === 'all' || modelFamily(model.name) === selectedFamily.value) &&
    (!query || model.name.toLowerCase().includes(query) || group.name.toLowerCase().includes(query))
  ).map(model => ({ key: `${group.id}:${model.platform}:${model.name}`, group, model, family: modelFamily(model.name), price: priceSummary(model, group) })))
})
watch(() => props.response, () => { selected.value = null; if (!categories.value.includes(selectedCategory.value)) selectedCategory.value = '全部模型'; if (!families.value.includes(selectedFamily.value)) selectedFamily.value = 'all' })
const descriptionHtml = computed(() => {
  const md = props.response?.description?.trim()
  return md ? DOMPurify.sanitize(marked.parse(md) as string) : ''
})
</script>

<style scoped>
.filter-button { @apply rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700; }
.filter-button.active { @apply bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300; }
.view-button { @apply rounded-lg px-4 py-1.5 text-sm text-gray-500 dark:text-dark-400; }
.view-button.selected { @apply bg-white font-medium text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white; }
.action-button { @apply inline-flex items-center gap-1.5 whitespace-nowrap rounded-md py-1 text-xs font-medium hover:underline; }
button:focus-visible { @apply outline-none ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-800; }
.plaza-description { line-height: 1.7; overflow-wrap: anywhere; }
.plaza-description :deep(h1), .plaza-description :deep(h2), .plaza-description :deep(h3) { @apply mb-2 mt-3 font-semibold text-gray-900 first:mt-0 dark:text-white; }
.plaza-description :deep(p) { @apply mb-2 text-gray-700 last:mb-0 dark:text-dark-200; }
.plaza-description :deep(a) { @apply text-primary-600 underline dark:text-primary-300; }
.plaza-description :deep(ul) { @apply mb-2 list-disc pl-5; }
.plaza-description :deep(ol) { @apply mb-2 list-decimal pl-5; }
.plaza-description :deep(code) { @apply rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-dark-900; }
.plaza-description :deep(blockquote) { @apply my-2 border-l-4 border-gray-300 pl-3 text-gray-600 dark:border-dark-600 dark:text-dark-300; }
</style>
