<template>
  <!-- Configured home content retains precedence and its original rendering. -->
  <div v-if="hasHomeContent" class="min-h-screen">
    <iframe v-if="isHomeContentUrl" :src="homeContent.trim()" class="h-screen w-full border-0" allowfullscreen></iframe>
    <div v-else v-html="homeContent"></div>
  </div>
  <div v-else :data-testid="compactHomeEnabled ? 'compact-home' : undefined" class="home-shell" :class="{ 'home-compact': compactHomeEnabled }">
    <header class="home-header">
      <nav class="home-nav">
        <div class="home-brand"><img :src="siteLogo || '/logo.svg'" alt="Logo" /><span>{{ siteName }}</span></div>
        <div class="home-nav-actions">
          <LocaleSwitcher />
          <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="home-nav-link" :title="t('home.viewDocs')"><Icon name="book" size="md" /></a>
          <router-link v-if="showModelPlazaEntry" to="/model-plaza" class="home-nav-link" :title="t('nav.modelPlaza')"><Icon name="grid" size="md" /><span class="hidden sm:inline">{{ t('nav.modelPlaza') }}</span></router-link>
          <button type="button" class="home-nav-link" :title="isDark ? t('home.switchToLight') : t('home.switchToDark')" :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')" @click="toggleTheme"><Icon :name="isDark ? 'sun' : 'moon'" size="md" /></button>
          <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="btn btn-primary">{{ isAuthenticated ? t('home.dashboard') : t('home.login') }}</router-link>
        </div>
      </nav>
    </header>
    <main class="home-main">
      <section class="home-intro">
        <p class="home-context">{{ t('console.workspace') }}</p>
        <h1>{{ siteName }}</h1>
        <p class="home-subtitle">{{ siteSubtitle }}</p>
        <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="btn btn-primary home-cta">{{ isAuthenticated ? t('home.goToDashboard') : t('home.login') }}<Icon name="arrowRight" size="md" /></router-link>
      </section>
      <!-- Retain the default-home selector; this area now contains real destinations. -->
      <section v-if="!compactHomeEnabled" class="terminal-container home-destinations" :aria-label="t('console.homeExplore')">
        <h2>{{ t('console.homeExplore') }}</h2>
        <router-link v-if="showModelPlazaEntry" to="/model-plaza" class="home-destination">
          <div><h3>{{ t('console.homeModels') }}</h3><p>{{ t('console.homeModelsDetail') }}</p></div><Icon name="arrowRight" size="md" />
        </router-link>
        <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="home-destination">
          <div><h3>{{ t('console.homeAccount') }}</h3><p>{{ t('console.homeAccountDetail') }}</p></div><Icon name="arrowRight" size="md" />
        </router-link>
        <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="home-destination">
          <div><h3>{{ t('console.homeDocs') }}</h3><p>{{ t('console.homeDocsDetail') }}</p></div><Icon name="arrowRight" size="md" />
        </a>
      </section>
    </main>
    <footer class="home-footer"><span>&copy; {{ currentYear }} {{ siteName }}</span><div v-if="!compactHomeEnabled"><a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer">{{ t('home.docs') }}</a><a :href="githubUrl" target="_blank" rel="noopener noreferrer">GitHub</a></div></footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import { sanitizeUrl } from '@/utils/url'
import { FeatureFlags, isFeatureFlagEnabled } from '@/utils/featureFlags'

const { t } = useI18n()

const authStore = useAuthStore()
const appStore = useAppStore()

// Site settings - directly from appStore (already initialized from injected config)
const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || t('console.gatewaySubtitle'))
const docUrl = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.doc_url || appStore.docUrl || ''))
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')
const hasHomeContent = computed(() => homeContent.value.trim().length > 0)
const compactHomeEnabled = computed(() => appStore.cachedPublicSettings?.compact_home_enabled === true)
const modelPlazaEnabled = computed(() => isFeatureFlagEnabled(FeatureFlags.modelPlaza))

// Check if homeContent is a URL (for iframe display)
const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

// Theme
const isDark = ref(document.documentElement.classList.contains('dark'))

// GitHub URL
const githubUrl = 'https://github.com/Wei-Shaw/sub2api'

// Auth state
const isAuthenticated = computed(() => authStore.isAuthenticated)
const modelPlazaRequiresAuth = computed(
  () => appStore.cachedPublicSettings?.model_plaza_require_auth === true,
)
const showModelPlazaEntry = computed(
  () => modelPlazaEnabled.value && (isAuthenticated.value || !modelPlazaRequiresAuth.value),
)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => isAdmin.value ? '/admin/dashboard' : '/dashboard')
// Current year for footer
const currentYear = computed(() => new Date().getFullYear())

// Toggle theme
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
}

onMounted(() => {
  initTheme()

  // Check auth state
  authStore.checkAuth()

  // Ensure public settings are loaded (will use cache if already loaded from injected config)
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})
</script>


<style scoped>
.home-shell { min-height: 100dvh; display: flex; flex-direction: column; background: var(--surface-panel); color: var(--text-primary); }
.home-header { background: var(--surface-canvas); }
.home-nav { display: flex; justify-content: space-between; align-items: center; gap: 20px; max-width: 1360px; margin: auto; padding: 20px 40px; }
.home-brand { display: flex; align-items: center; gap: 12px; min-width: 0; font-size: 18px; font-weight: 600; }
.home-brand img { width: 34px; height: 34px; object-fit: contain; flex-shrink: 0; }
.home-brand span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.home-nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.home-nav-link { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; min-width: 40px; padding: 8px; border-radius: 6px; color: var(--text-muted); font-size: 14px; }
.home-nav-link:hover { background: var(--surface-border); color: var(--text-primary); }
.home-main { flex: 1; display: grid; grid-template-columns: 1.15fr 1fr; align-items: center; gap: clamp(40px, 8vw, 120px); width: 100%; max-width: 1280px; margin: auto; padding: 88px 40px; }
.home-context { font-size: 14px; color: var(--focus-color); font-weight: 500; }
.home-intro h1 { margin-top: 20px; font-size: clamp(42px, 5.6vw, 80px); font-weight: 600; line-height: 1.12; letter-spacing: -.055em; overflow-wrap: anywhere; }
.home-subtitle { max-width: 36ch; margin-top: 28px; font-size: 18px; color: var(--text-muted); line-height: 1.85; white-space: pre-wrap; overflow-wrap: anywhere; }
.home-cta { margin-top: 36px; min-height: 44px; padding: 10px 20px; }
.home-destinations { min-width: 0; padding-left: 36px; border-left: 1px solid var(--surface-border); }
.home-destinations h2 { margin-bottom: 16px; color: var(--text-muted); font-size: 13px; font-weight: 500; }
.home-destination { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 0; border-bottom: 1px solid var(--surface-border); }
.home-destination:last-child { border-bottom: 0; }
.home-destination h3 { font-size: 19px; font-weight: 500; }
.home-destination p { margin-top: 8px; color: var(--text-muted); font-size: 14px; line-height: 1.7; }
.home-destination > svg { flex-shrink: 0; color: var(--text-muted); }
.home-destination:hover h3, .home-destination:hover > svg { color: var(--focus-color); }
.home-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px; max-width: 1280px; width: 100%; margin: auto; padding: 24px 40px; color: var(--text-muted); font-size: 13px; overflow-wrap: anywhere; }
.home-footer > div { display: flex; gap: 24px; }
.home-compact .home-main { grid-template-columns: 1fr; max-width: 1040px; }
.home-compact .home-intro { max-width: 720px; }
@media (max-width: 767px) {
  .home-nav { padding: 16px 20px; flex-wrap: wrap; gap: 12px; }
  .home-brand { flex: 1; }
  .home-nav-actions { gap: 2px; }
  .home-nav-actions .btn { padding-inline: 12px; }
  .home-main { grid-template-columns: 1fr; gap: 48px; padding: 56px 24px 40px; }
  .home-intro h1 { font-size: 42px; }
  .home-subtitle { font-size: 16px; margin-top: 20px; }
  .home-destinations { border-left: 0; border-top: 1px solid var(--surface-border); padding: 24px 0 0; }
  .home-destination { padding: 20px 0; }
  .home-footer { padding: 24px; }
}
@media (max-width: 430px) { .home-nav-actions { flex-wrap: wrap; } .home-brand { flex-basis: 100%; } }
</style>
