<template>
  <div class="auth-shell">
    <aside class="auth-brand-panel">
      <router-link to="/" class="auth-wordmark">
        <img v-if="settingsLoaded" :src="siteLogo || '/logo.svg'" alt="Logo" />
        <span>{{ siteName }}</span>
      </router-link>
      <div class="auth-brand-copy">
        <p class="auth-context">{{ t('console.workspace') }}</p>
        <h1>{{ siteName }}</h1>
        <p class="auth-subtitle">{{ siteSubtitle }}</p>
        <div class="auth-purpose">
          <p>{{ t('console.authPurpose') }}</p>
          <span>{{ t('console.authDetail') }}</span>
        </div>
      </div>
      <p class="auth-copyright">&copy; {{ currentYear }} {{ siteName }}</p>
    </aside>
    <main class="auth-main">
      <div class="auth-tools"><LocaleSwitcher /></div>
      <div class="auth-form-column">
        <div class="auth-form"><slot /></div>
        <div class="auth-footer"><slot name="footer" /></div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import { sanitizeUrl } from '@/utils/url'

const appStore = useAppStore()
const { t } = useI18n()

const siteName = computed(() => appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || t('console.gatewaySubtitle'))
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)

const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  appStore.fetchPublicSettings()
})
</script>

<style scoped>
.auth-shell { display: grid; grid-template-columns: minmax(320px, .9fr) minmax(480px, 1.1fr); min-height: 100dvh; background: var(--surface-panel); }
.auth-brand-panel { display: flex; flex-direction: column; justify-content: space-between; gap: 48px; padding: 40px clamp(32px, 5vw, 80px); background: var(--surface-canvas); border-right: 1px solid var(--surface-border); }
.auth-wordmark { display: flex; align-items: center; gap: 12px; font-size: 18px; font-weight: 600; color: var(--text-primary); }
.auth-wordmark img { width: 34px; height: 34px; object-fit: contain; }
.auth-brand-copy { padding: 48px 0; }
.auth-context { color: var(--focus-color); font-size: 14px; font-weight: 500; }
.auth-brand-copy h1 { margin-top: 20px; font-size: clamp(36px, 4.2vw, 64px); font-weight: 600; line-height: 1.12; letter-spacing: -.05em; overflow-wrap: anywhere; }
.auth-subtitle { max-width: 32ch; margin-top: 24px; font-size: 18px; line-height: 1.8; color: var(--text-muted); white-space: pre-wrap; overflow-wrap: anywhere; }
.auth-purpose { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--surface-border); }
.auth-purpose p { font-size: 15px; font-weight: 500; }
.auth-purpose span { display: block; margin-top: 8px; color: var(--text-muted); font-size: 13px; }
.auth-copyright { color: var(--text-muted); font-size: 12px; }
.auth-main { position: relative; display: flex; align-items: center; justify-content: center; min-width: 0; padding: 88px 40px; }
.auth-tools { position: absolute; right: 28px; top: 24px; }
.auth-form-column { width: 100%; max-width: 400px; }
.auth-footer { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--surface-border); font-size: 14px; }
.auth-footer:empty { display: none; }
.auth-form :deep(.input), .auth-form :deep(.btn) { min-height: 44px; }
@media (max-width: 850px) {
  .auth-shell { display: flex; flex-direction: column; }
  .auth-brand-panel { padding: 24px; gap: 0; background: var(--surface-panel); border: 0; }
  .auth-brand-copy, .auth-copyright { display: none; }
  .auth-main { flex: 1; align-items: flex-start; padding: 36px 24px 48px; }
  .auth-tools { top: -58px; right: 20px; }
  .auth-wordmark { max-width: calc(100% - 52px); overflow-wrap: anywhere; }
}
</style>
