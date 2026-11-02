<template>
  <div class="model-catalog">
    <header v-if="!embedded" class="catalog-header">
      <div>
        <h1>{{ t('modelPlaza.title') }}</h1>
        <p class="catalog-intro">浏览模型、比较分组价格，复制模型 ID 开始接入。</p>
      </div>
      <div class="catalog-guide">
        <div><p>USD 计价</p><span>Token 价格按百万展示</span></div>
      </div>
    </header>

    <div v-if="descriptionHtml" class="plaza-description" v-html="descriptionHtml"></div>
    <p v-if="!isAuthenticated" class="catalog-hint">{{ t('modelPlaza.anonymousHint') }}</p>

    <div v-if="loading" class="catalog-loading" role="status" aria-label="加载模型">
      <div class="h-7 w-7 animate-spin rounded-full border-2 border-cyan-600/20 border-t-cyan-600"></div>
      <p>正在加载模型目录…</p>
    </div>
    <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{{ t('modelPlaza.loadFailed') }}</div>
    <template v-else>
      <div class="catalog-controls">
        <nav aria-label="模型分组" class="category-tabs">
          <button v-for="category in categories" :key="category" type="button" :data-category="category" :aria-pressed="selectedCategory === category" class="filter-button" :class="{ active: selectedCategory === category }" @click="selectedCategory = category">
            {{ category }} <span>{{ categoryCount(category) }}</span>
          </button>
        </nav>
        <div class="catalog-toolbar">
          <div class="catalog-search">
            <Icon name="search" size="sm" class="search-icon" />
            <input v-model="searchQuery" type="search" aria-label="搜索模型 ID 或分组" placeholder="搜索模型 ID 或分组…" />
          </div>
          <select v-model="selectedFamily" aria-label="模型系列" class="family-select">
            <option value="all">全部模型系列</option>
            <option v-for="family in families" :key="family" :value="family">{{ family }}</option>
          </select>
          <div class="view-switch" role="group" aria-label="显示方式">
            <button type="button" aria-label="卡片视图" :aria-pressed="view === 'cards'" class="view-button" :class="{ selected: view === 'cards' }" @click="view = 'cards'">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><rect x="2" y="2" width="4.5" height="4.5" rx="1" /><rect x="9.5" y="2" width="4.5" height="4.5" rx="1" /><rect x="2" y="9.5" width="4.5" height="4.5" rx="1" /><rect x="9.5" y="9.5" width="4.5" height="4.5" rx="1" /></svg>卡片
            </button>
            <button type="button" aria-label="表格视图" :aria-pressed="view === 'table'" class="view-button" :class="{ selected: view === 'table' }" @click="view = 'table'">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="1.5" /><path d="M2 6h12M2 10h12M7 6v8" /></svg>表格
            </button>
          </div>
        </div>
      </div>
      <div class="catalog-results" aria-live="polite">
        <p><strong>{{ entries.length }}</strong> 个模型配置 <span class="result-divider">/</span> {{ selectedCategory }} <button v-if="hasFilters" type="button" class="reset-button" @click="resetFilters">清除筛选</button></p>
        <p>标准时段基础档 · 完整计费规则见详情</p>
      </div>

      <div v-if="entries.length && view === 'cards'" class="catalog-grid">
        <article v-for="entry in entries" :key="entry.key" data-model-card class="model-card">
          <div class="model-card-top">
            <span class="family-badge">{{ entry.family }}</span>
            <span class="billing-label">{{ entry.price.token ? 'Token 计费' : entry.price.unit.replace('USD / ', '按') + '计费' }}</span>
          </div>
          <div class="model-identity">
            <h2>{{ entry.model.name }}</h2>
            <p>{{ entry.group.name }}</p>
          </div>
          <dl class="price-columns">
            <div>
              <dt class="price-label">{{ entry.price.token ? '输入价格' : '单价' }}</dt>
              <dd class="price-value" :class="{ 'price-compact': entry.price.input.length > 9 }">{{ entry.price.input }}</dd>
            </div>
            <div v-if="entry.price.output !== null">
              <dt class="price-label">输出价格</dt>
              <dd class="price-value" :class="{ 'price-compact': entry.price.output.length > 9 }">{{ entry.price.output }}</dd>
            </div>
          </dl>
          <div class="price-unit"><span>{{ entry.price.unit }}</span><span v-if="entry.price.tiered" class="tier-badge">基础档 · 阶梯定价</span></div>
          <div class="model-card-actions">
            <button type="button" class="copy-button" :aria-label="`复制 ${entry.model.name} 的模型 ID`" @click="copyToClipboard(entry.model.name)"><Icon name="copy" size="sm" />复制 ID</button>
            <button type="button" data-details class="details-button" @click="selected = entry">价格详情 <span aria-hidden="true">↗</span></button>
          </div>
        </article>
      </div>
      <div v-else-if="entries.length" class="catalog-table-wrap" tabindex="0" role="region" aria-label="模型价格表，可横向滚动">
        <table class="catalog-table">
          <thead><tr><th scope="col">模型 ID / 系列</th><th scope="col">分组</th><th scope="col" class="text-right">输入 / 单价</th><th scope="col" class="text-right">输出</th><th scope="col">单位</th><th scope="col">操作</th></tr></thead>
          <tbody><tr v-for="entry in entries" :key="entry.key">
            <td class="table-identity"><p>{{ entry.model.name }}</p><span class="family-badge">{{ entry.family }}</span></td>
            <td>{{ entry.group.name }}</td><td class="table-price">{{ entry.price.input }}</td><td class="table-price">{{ entry.price.output ?? '—' }}</td><td class="table-unit">{{ entry.price.unit }}<p v-if="entry.price.tiered">基础档 · 阶梯定价</p></td>
            <td><div class="table-actions"><button type="button" class="copy-button" :aria-label="`复制 ${entry.model.name} 的模型 ID`" @click="copyToClipboard(entry.model.name)"><Icon name="copy" size="sm" />复制 ID</button><button type="button" data-details class="details-button" @click="selected = entry">详情 <span aria-hidden="true">↗</span></button></div></td>
          </tr></tbody>
        </table>
      </div>
      <div v-else class="catalog-empty">
        <span class="empty-icon"><Icon name="search" size="lg" /></span>
        <p>{{ hasFilters ? t('modelPlaza.noSearchResult') : t('modelPlaza.empty') }}</p>
        <button v-if="hasFilters" type="button" class="copy-button" @click="resetFilters">清除筛选</button>
      </div>
      <footer class="catalog-footnote"><Icon name="infoCircle" size="sm" /><p>同一模型在不同分组分别展示。<span>「—」表示未提供价格；模型目录不代表实时可用性。</span></p></footer>
    </template>
    <BaseDialog :show="selected !== null" title="模型价格详情" width="extra-wide" @close="selected = null">
      <div v-if="selected" class="catalog-detail">
        <div class="detail-identity"><div><span class="family-badge">{{ selected.family }}</span><p class="detail-model-id">{{ selected.model.name }}</p><p class="detail-family-note">系列仅依据模型 ID 识别</p></div><button type="button" class="copy-button" :aria-label="`复制 ${selected.model.name} 的模型 ID`" @click="copyToClipboard(selected.model.name)"><Icon name="copy" size="sm" />复制 ID</button></div>
        <p class="detail-note">Token 价格单位为 USD / 1M tokens；按次、图片等价格保留各自单位。下表展示分组倍率、缓存、阶梯与分时时段；高峰规则以分组说明为准。</p>
        <p class="detail-scroll-hint text-xs text-gray-500 sm:hidden">左右滑动下表查看完整价格</p>
        <PlazaGroupSection :group="{ ...selected.group, models: [selected.model] }" />
        <div v-if="selected.model.time_pricing" class="detail-time"><p>分时定价时区：<strong>{{ selected.model.time_pricing.timezone }}</strong>{{ selected.model.time_pricing.weekdays_only ? ' · 仅工作日生效，周末按标准价格' : '' }}</p><p v-for="period in selected.model.time_pricing.periods" :key="period.start_time" class="mt-2 font-mono">{{ period.start_time }}–{{ period.end_time }} <strong>×{{ period.multiplier }}</strong></p></div>
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
.model-catalog, .catalog-detail {
  --catalog-accent: var(--focus-color);
  --catalog-accent-soft: var(--accent-soft);
  --catalog-border: var(--surface-border);
  --catalog-surface: var(--surface-panel);
  --catalog-subtle: var(--surface-subtle);
  --catalog-text: var(--text-primary);
  --catalog-muted: var(--text-muted);
  color: var(--catalog-text);
}
.model-catalog { display: flex; min-width: 0; flex-direction: column; gap: 20px; }
.catalog-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: 8px 0 12px; }
.catalog-header h1 { font-size: 30px; font-weight: 600; line-height: 1.3; letter-spacing: -.035em; }
.catalog-intro { margin-top: 10px; font-size: 14px; color: var(--catalog-muted); line-height: 1.7; }
.catalog-guide { padding: 0 0 4px 24px; border-left: 1px solid var(--catalog-border); }
.catalog-guide p { font-size: 14px; font-weight: 500; color: var(--catalog-text); }
.catalog-guide span { display: block; margin-top: 5px; font-size: 12px; color: var(--catalog-muted); }
.catalog-hint { font-size: 13px; color: var(--catalog-muted); }
.catalog-controls { min-width: 0; }
.category-tabs { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 24px; border-bottom: 1px solid var(--catalog-border); }
.filter-button { display: inline-flex; flex-shrink: 0; align-items: center; gap: 8px; min-height: 48px; padding: 10px 0; border-bottom: 2px solid transparent; color: var(--catalog-muted); font-size: 14px; font-weight: 500; transition: color .15s, border-color .15s; }
.filter-button span { font-size: 12px; font-weight: 400; font-variant-numeric: tabular-nums; }
.filter-button:hover, .filter-button.active { color: var(--catalog-accent); }
.filter-button.active { border-color: var(--catalog-accent); }
.filter-button.active span { color: var(--catalog-accent); }
.catalog-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 20px; }
.catalog-search { position: relative; flex: 1; min-width: 180px; max-width: 460px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--catalog-muted); pointer-events: none; }
.catalog-search input, .family-select { min-width: 0; height: 40px; border: 1px solid var(--catalog-border); border-radius: 6px; background: var(--catalog-surface); color: var(--catalog-text); font: inherit; font-size: 13px; outline: none; }
.catalog-search input { width: 100%; padding: 0 12px 0 36px; }
.catalog-search input:focus, .family-select:focus { border-color: var(--catalog-accent); box-shadow: 0 0 0 2px var(--catalog-accent-soft); }
.catalog-search input::placeholder { color: var(--catalog-muted); }
.family-select { width: 172px; padding: 0 30px 0 12px; }
.view-switch { display: flex; flex-shrink: 0; gap: 2px; padding: 3px; margin-left: auto; border: 1px solid var(--catalog-border); border-radius: 6px; background: var(--catalog-subtle); }
.view-button { display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 4px; padding: 5px 10px; font-size: 13px; color: var(--catalog-muted); }
.view-button svg { width: 14px; height: 14px; }
.view-button.selected { background: var(--catalog-surface); color: var(--catalog-text); box-shadow: 0 1px 2px #0000000d; }
.catalog-results { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--catalog-muted); }
.catalog-results strong { color: var(--catalog-text); font-weight: 600; font-variant-numeric: tabular-nums; }
.result-divider { margin: 0 8px; color: var(--catalog-border); }
.reset-button { margin-left: 12px; color: var(--catalog-accent); }
.catalog-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; border: 1px solid var(--catalog-border); border-radius: 10px; overflow: hidden; background: var(--catalog-surface); }
.model-card { display: flex; flex-direction: column; min-width: 0; padding: 22px 24px 16px; background: var(--catalog-surface); border-right: 1px solid var(--catalog-border); border-bottom: 1px solid var(--catalog-border); margin-right: -1px; margin-bottom: -1px; transition: background .15s; }
.model-card:hover { background: var(--catalog-subtle); }
.model-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.family-badge { display: inline-flex; font-size: 12px; font-weight: 500; line-height: 1.5; color: var(--catalog-muted); }
.billing-label { font-size: 12px; color: var(--catalog-muted); }
.model-identity { flex: 1; margin: 16px 0 24px; }
.model-identity h2 { overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 18px; line-height: 1.55; letter-spacing: -.04em; font-weight: 600; }
.model-identity > p { margin-top: 7px; font-size: 13px; line-height: 1.6; color: var(--catalog-muted); overflow-wrap: anywhere; }
.price-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.price-columns > div + div { padding-left: 0; }
.price-label { font-size: 12px; color: var(--catalog-muted); }
.price-value { margin-top: 6px; overflow-wrap: anywhere; font-size: 26px; font-weight: 500; line-height: 1.3; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.price-value.price-compact { font-size: 18px; line-height: 33.8px; letter-spacing: -.04em; }
.price-unit { display: flex; align-items: center; flex-wrap: wrap; gap: 5px 8px; margin-top: 10px; font-size: 12px; color: var(--catalog-muted); }
.tier-badge { padding-left: 8px; border-left: 1px solid var(--catalog-border); }
.model-card-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--catalog-border); }
.copy-button, .details-button { color: var(--catalog-accent); padding: 6px 8px; }
.copy-button { padding: 6px 0; color: var(--catalog-muted); }
.copy-button:hover { color: var(--catalog-text); }
.details-button { color: var(--catalog-accent); padding: 6px 3px 6px 8px; }
.details-button:hover { background: var(--catalog-accent-soft); }
.details-button span { font-size: 15px; margin-left: 2px; }
.catalog-table-wrap { overflow-x: auto; border: 1px solid var(--catalog-border); border-radius: 12px; background: var(--catalog-surface); }
.catalog-table { width: 100%; min-width: 880px; text-align: left; font-size: 14px; }
.catalog-table th { color: var(--catalog-muted); padding: 13px 18px; font-size: 13px; font-weight: 500; white-space: nowrap; }
.catalog-table td { padding: 16px 18px; border-top: 1px solid var(--catalog-border); }
.catalog-table tbody tr:hover { background: var(--catalog-subtle); }
.table-identity { max-width: 300px; }
.table-identity > p { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; overflow-wrap: anywhere; font-weight: 500; line-height: 1.6; margin-bottom: 7px; }
.table-price { text-align: right; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
.table-unit { color: var(--catalog-muted); font-size: 12px; white-space: nowrap; }
.table-unit p { margin-top: 5px; }
.table-actions { display: flex; align-items: center; gap: 12px; }
.catalog-empty, .catalog-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; min-height: 280px; border: 1px dashed var(--catalog-border); border-radius: 14px; font-size: 13px; color: var(--catalog-muted); }
.empty-icon { color: var(--catalog-muted); }
.catalog-footnote { display: flex; align-items: flex-start; gap: 8px; color: var(--catalog-muted); font-size: 12px; line-height: 1.8; }
.catalog-footnote > :first-child { flex-shrink: 0; margin-top: 2px; }
.catalog-footnote span { margin-left: 5px; }
.catalog-detail { display: flex; flex-direction: column; gap: 20px; }
.detail-identity { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.detail-identity > div { min-width: 0; }
.detail-model-id { margin-top: 12px; overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: 600; line-height: 1.6; letter-spacing: -.025em; }
.detail-family-note { margin-top: 5px; font-size: 12px; color: var(--catalog-muted); }
.detail-note, .detail-time { border: 1px solid var(--catalog-border); border-radius: 10px; padding: 14px 16px; background: var(--catalog-subtle); color: var(--catalog-muted); font-size: 12px; line-height: 1.8; }
.detail-time strong { color: var(--catalog-text); font-weight: 500; }
button:focus-visible, input:focus-visible, select:focus-visible, .catalog-table-wrap:focus-visible { outline: 2px solid var(--catalog-accent); outline-offset: 3px; }
.plaza-description { padding: 18px 20px; border: 1px solid var(--catalog-border); border-radius: 12px; background: var(--catalog-surface); font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.plaza-description :deep(h1), .plaza-description :deep(h2), .plaza-description :deep(h3) { margin: 12px 0 8px; font-weight: 600; }
.plaza-description :deep(:first-child) { margin-top: 0; }
.plaza-description :deep(p) { margin-bottom: 8px; }
.plaza-description :deep(p:last-child) { margin-bottom: 0; }
.plaza-description :deep(a) { color: var(--catalog-accent); text-decoration: underline; }
.plaza-description :deep(ul) { margin-bottom: 8px; list-style: disc; padding-left: 20px; }
.plaza-description :deep(ol) { margin-bottom: 8px; list-style: decimal; padding-left: 20px; }
.plaza-description :deep(code) { border-radius: 4px; background: var(--catalog-subtle); padding: 2px 5px; font-size: 12px; }
.plaza-description :deep(blockquote) { margin: 8px 0; padding-left: 12px; border-left: 3px solid var(--catalog-border); color: var(--catalog-muted); }
@media (max-width: 1199px) { .catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .catalog-guide { display: none; } }
@media (max-width: 639px) {
  .model-catalog { gap: 18px; }
  .catalog-header { padding: 4px 0 6px; }
  .catalog-controls { padding: 0; }
  .catalog-search { max-width: none; }
  .catalog-search input, .family-select { height: 44px; font-size: 16px; }
  .view-button { min-height: 36px; }
  .category-tabs { flex-wrap: nowrap; overflow-x: auto; gap: 16px; }
  .filter-button { flex-shrink: 0; font-size: 14px; }
  .catalog-toolbar { flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .catalog-search { flex-basis: 100%; }
  .family-select { flex: 1; min-width: 0; }
  .catalog-grid { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .model-card { padding: 22px 20px 16px; }
  .model-identity { margin: 17px 0 18px; }
  .model-card-actions .copy-button, .model-card-actions .details-button { min-height: 40px; }
  .catalog-footnote span { display: block; margin-left: 0; }
  .detail-identity { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) { .model-card, .copy-button, .details-button, .filter-button { transition: none; } }
</style>
