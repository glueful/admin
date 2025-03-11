<script lang="ts">
import type { AppConfig } from '@/types/appConfig'
import _appConfig from '#build/app.config'
import theme from '@/components/themes/dashboard-toolbar'
import { tv } from '../utils/tv'

const appConfigdashboardToolbar = _appConfig as AppConfig & {
  uiPro: { dashboardToolbar: Partial<typeof theme> }
}

const dashboardToolbar = tv({
  extend: tv(theme),
  ...(appConfigdashboardToolbar.uiPro?.dashboardToolbar || {}),
})

export interface DashboardToolbarProps {
  /**
   * The element or component this component should render as.
   * @defaultValue 'div'
   */
  as?: any
  class?: any
  ui?: Partial<typeof dashboardToolbar.slots>
}

export interface DashboardToolbarSlots {
  default(props?: {}): any
  left(props?: {}): any
  right(props?: {}): any
}
</script>

<script setup lang="ts">
import { Primitive } from 'reka-ui'

const props = defineProps<DashboardToolbarProps>()
defineSlots<DashboardToolbarSlots>()

// eslint-disable-next-line vue/no-dupe-keys
const ui = dashboardToolbar()
</script>

<template>
  <Primitive :as="as" :class="ui.root({ class: [props.class, props.ui?.root] })">
    <slot>
      <div :class="ui.left({ class: [props.ui?.left] })">
        <slot name="left" />
      </div>

      <div :class="ui.right({ class: [props.ui?.right] })">
        <slot name="right" />
      </div>
    </slot>
  </Primitive>
</template>
