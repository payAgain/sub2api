import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import { useAdminSettingsStore } from '@/stores/adminSettings'
import { resolveRouteMetaKeys } from '@/router/title'
import { resolveSiteBillingMode } from '@/utils/siteBillingMode'

/** Shared presentation of the existing route metadata and configured page labels. */
export function usePageHeading() {
  const route = useRoute()
  const { t } = useI18n()
  const appStore = useAppStore()
  const authStore = useAuthStore()
  const adminSettingsStore = useAdminSettingsStore()

  // /purchase 的标题/描述随站点计费模式切换，与 document.title 共用同一解析。
  const routeMetaKeys = computed(() => resolveRouteMetaKeys(route, {
    billingMode: resolveSiteBillingMode(appStore.cachedPublicSettings),
  }))

  const pageTitle = computed(() => {
    // For custom pages, use the menu item's label instead of generic "自定义页面"
    if (route.name === 'CustomPage') {
      const id = route.params.id as string
      const publicItems = appStore.cachedPublicSettings?.custom_menu_items ?? []
      const menuItem = publicItems.find((item) => item.id === id)
        ?? (authStore.isAdmin ? adminSettingsStore.customMenuItems.find((item) => item.id === id) : undefined)
      if (menuItem?.label) return menuItem.label
    }
    const titleKey = routeMetaKeys.value.titleKey
    if (titleKey) {
      return t(titleKey)
    }
    return (route.meta.title as string) || ''
  })

  const pageDescription = computed(() => {
    const descKey = routeMetaKeys.value.descriptionKey
    if (descKey) {
      return t(descKey)
    }
    return (route.meta.description as string) || ''
  })

  return { pageTitle, pageDescription }
}
