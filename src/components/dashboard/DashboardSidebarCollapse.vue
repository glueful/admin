<script lang="ts">
import type { AppConfig } from '@/types/appConfig'
import type { ButtonProps } from '@nuxt/ui'
import _appConfig from '#build/app.config'
import theme from '@/components/themes/dashboard-sidebar-collapse'
import { tv } from '../utils/tv'

const appConfigDashboardSidebarCollapse = _appConfig as AppConfig & {
  uiPro: { dashboardSidebarCollapse: Partial<typeof theme> }
}

const dashboardSidebarCollapse = tv({
  extend: tv(theme),
  ...(appConfigDashboardSidebarCollapse.uiPro?.dashboardSidebarCollapse || {}),
})

export interface DashboardSidebarCollapseProps
  extends /** @vue-ignore */ Pick<ButtonProps, 'as' | 'size' | 'disabled' | 'ui'> {
  side?: 'left' | 'right'
  /**
   * @defaultValue 'neutral'
   */
  color?: ButtonProps['color']
  /**
   * @defaultValue 'ghost'
   */
  variant?: ButtonProps['variant']
  class?: any
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useForwardProps } from 'reka-ui'
import { reactivePick } from '@vueuse/core'
import { useAppConfig } from '@/components/composables/appConfig'
import { useDashboard } from '../utils/dashboard'

const props = withDefaults(defineProps<DashboardSidebarCollapseProps>(), {
  color: 'neutral',
  variant: 'ghost',
  side: 'left',
})

const rootProps = useForwardProps(reactivePick(props, 'color', 'variant', 'size'))

const appConfig: any = useAppConfig()
const { sidebarCollapsed, collapseSidebar } = useDashboard({
  sidebarCollapsed: ref(false),
  collapseSidebar: () => {},
})
</script>

<template>
  <UButton
    v-bind="rootProps"
    :aria-label="`${sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar`"
    :icon="sidebarCollapsed ? appConfig.ui.icons.panelOpen : appConfig.ui.icons.panelClose"
    :class="dashboardSidebarCollapse({ class: props.class, side: props.side })"
    @click="collapseSidebar?.(!sidebarCollapsed)"
  />
</template>
