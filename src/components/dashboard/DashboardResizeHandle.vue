<script lang="ts">
import type { AppConfig } from '@/types/appConfig'
import _appConfig from '#build/app.config'
import theme from '@/components/themes/dashboard-resize-handle'
import { tv } from '../../utils/tv'

const appConfig = _appConfig as AppConfig & {
  uiPro: { dashboardResizeHandle: Partial<typeof theme> }
}

const dashboardResizeHandle = tv({
  extend: tv(theme),
  ...(appConfig.uiPro?.dashboardResizeHandle || {}),
})

export interface DashboardResizeHandleProps {
  /**
   * The element or component this component should render as.
   * @defaultValue 'div'
   */
  as?: any
  class?: any
}

export interface DashboardResizeHandleSlots {
  default(props?: {}): any
}
</script>

<script setup lang="ts">
import { Primitive } from 'reka-ui'

const props = defineProps<DashboardResizeHandleProps>()
defineSlots<DashboardResizeHandleSlots>()
</script>

<template>
  <Primitive
    ref="handleRef"
    :as="as"
    role="separator"
    :class="dashboardResizeHandle({ class: props.class })"
  >
    <slot />
  </Primitive>
</template>
