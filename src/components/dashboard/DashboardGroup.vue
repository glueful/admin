<script lang="ts">
import type { AppConfig } from '@/types/appConfig'
import _appConfig from '#build/app.config'
import theme from '@/components/themes/dashboard-group'
import type { UseResizableProps } from '../../composables/useResizable'
import { tv } from '../../utils/tv'

const appConfig = _appConfig as AppConfig & { uiPro: { dashboardGroup: Partial<typeof theme> } }

const dashboardGroup = tv({ extend: tv(theme), ...(appConfig.uiPro?.dashboardGroup || {}) })

export interface DashboardGroupProps
  extends Pick<UseResizableProps, 'storage' | 'storageKey' | 'persistent'> {
  /**
   * The element or component this component should render as.
   * @defaultValue 'div'
   */
  as?: any
  class?: any
}

export interface DashboardGroupSlots {
  default(props?: {}): any
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { Primitive } from 'reka-ui'
import { provideDashboardContext } from '../../utils/dashboard'

const props = withDefaults(defineProps<DashboardGroupProps>(), {
  storage: 'cookie',
  storageKey: 'dashboard',
  persistent: true,
})
defineSlots<DashboardGroupSlots>()

provideDashboardContext({
  storage: props.storage,
  storageKey: props.storageKey,
  persistent: props.persistent,
  sidebarOpen: ref(false),
  toggleSidebar: () => {},
  sidebarCollapsed: ref(false),
  collapseSidebar: () => {},
  searchOpen: ref(false),
  toggleSearch: () => {},
})
</script>

<template>
  <Primitive :as="as" :class="dashboardGroup({ class: props.class })">
    <slot />
  </Primitive>
</template>
