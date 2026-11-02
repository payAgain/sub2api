<template>
  <!-- 后台内嵌形态:?embedded=1 且已登录,套完整后台布局 -->
  <AppLayout v-if="isEmbedded" :show-page-heading="false">
    <PageHeading class="plaza-page-heading">
      <template #actions>
        <button type="button" class="btn btn-secondary btn-sm" aria-label="刷新模型目录" :disabled="refreshing" @click="refresh">
          {{ refreshing ? '正在刷新…' : '刷新' }}
        </button>
      </template>
    </PageHeading>
    <p v-if="refreshFailed" role="status" class="mb-3 text-sm text-amber-700 dark:text-amber-400">刷新失败，当前显示上次加载的模型目录，请稍后重试。</p>
    <ModelPlazaContent :response="data" :loading="loading" :error="loadFailed" embedded />
  </AppLayout>

  <!-- 独立形态:自带导航条(logo/站名 + 登录/回后台) -->
  <div v-else class="plaza-page min-h-screen">
    <PlazaNavBar />
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div class="mb-3 flex justify-end">
        <button type="button" class="btn btn-secondary btn-sm" aria-label="刷新模型目录" :disabled="refreshing" @click="refresh">
          {{ refreshing ? '正在刷新…' : '刷新' }}
        </button>
      </div>
      <p v-if="refreshFailed" role="status" class="mb-3 text-sm text-amber-700 dark:text-amber-400">刷新失败，当前显示上次加载的模型目录，请稍后重试。</p>
      <ModelPlazaContent :response="data" :loading="loading" :error="loadFailed" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import PageHeading from '@/components/layout/PageHeading.vue'
import PlazaNavBar from '@/components/modelPlaza/PlazaNavBar.vue'
import ModelPlazaContent from '@/components/modelPlaza/ModelPlazaContent.vue'
import { getModelPlaza, type ModelPlazaResponse } from '@/api/modelPlaza'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()

// embedded=1 但未登录(如转发的链接)自动降级为独立形态。
const isEmbedded = computed(() => route.query.embedded === '1' && authStore.isAuthenticated)

const data = ref<ModelPlazaResponse | null>(null)
const loading = ref(true)
const loadFailed = ref(false)
const refreshing = ref(false)
const refreshFailed = ref(false)
let lastRevalidation = -Infinity
let controller: AbortController | null = null

function revalidate() {
  if (document.visibilityState !== 'visible' || refreshing.value) return
  // Switching tabs can fire both visibilitychange and focus.
  if (Date.now() - lastRevalidation < 1000) return
  lastRevalidation = Date.now()
  void refresh()
}

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  const request = new AbortController()
  controller = request
  try {
    const result = await getModelPlaza({ signal: request.signal })
    if (request.signal.aborted) return
    data.value = result
    loadFailed.value = false
    refreshFailed.value = false
  } catch {
    if (request.signal.aborted) return
    loadFailed.value = data.value === null
    refreshFailed.value = data.value !== null
  } finally {
    if (controller === request) {
      controller = null
      loading.value = false
      refreshing.value = false
    }
  }
}

onMounted(() => {
  // 独立形态导航条需要站点名/Logo;有 __APP_CONFIG__ 注入时同步命中缓存。
  void appStore.fetchPublicSettings()
  window.addEventListener('focus', revalidate)
  document.addEventListener('visibilitychange', revalidate)
  void refresh()
})

onUnmounted(() => {
  window.removeEventListener('focus', revalidate)
  document.removeEventListener('visibilitychange', revalidate)
  controller?.abort()
  controller = null
})
</script>

<style scoped>
.plaza-page { background: var(--surface-panel); }
.plaza-page-heading { flex-direction: row; align-items: center; margin-bottom: 16px; }
.plaza-page-heading :deep(.page-heading-actions) { width: auto; }
</style>
