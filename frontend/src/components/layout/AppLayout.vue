<template>
  <div class="app-shell min-h-screen">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main Content Area -->
    <div
      class="app-workspace relative min-h-screen min-w-0 transition-[margin] duration-200 motion-reduce:transition-none"
      :class="[sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[232px]']"
    >
      <!-- Header -->
      <AppHeader />

      <!-- Main Content -->
      <main class="app-content">
        <PageHeading v-if="showPageHeading" />
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/onboarding.css'
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingTour } from '@/composables/useOnboardingTour'
import { useOnboardingStore } from '@/stores/onboarding'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import PageHeading from './PageHeading.vue'

withDefaults(defineProps<{ showPageHeading?: boolean }>(), { showPageHeading: true })

const appStore = useAppStore()
const authStore = useAuthStore()
const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
const isAdmin = computed(() => authStore.user?.role === 'admin')

const { replayTour } = useOnboardingTour({
  storageKey: isAdmin.value ? 'admin_guide' : 'user_guide',
  autoStart: true
})

const onboardingStore = useOnboardingStore()

onMounted(() => {
  onboardingStore.setReplayCallback(replayTour)
})

defineExpose({ replayTour })
</script>
