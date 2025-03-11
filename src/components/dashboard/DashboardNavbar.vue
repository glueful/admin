<script lang="ts">
import type { AppConfig } from '@/types/appConfig'
import type { ButtonProps } from '@nuxt/ui'
import _appConfig from '#build/app.config'
import theme from '@/components/themes/dashboard-navbar'
import { tv } from '../utils/tv'
import type { DashboardContext } from '../utils/dashboard'

const appConfig = _appConfig as AppConfig & { uiPro: { dashboardNavbar: Partial<typeof theme> } }

const dashboardNavbar = tv({ extend: tv(theme), ...(appConfig.uiPro?.dashboardNavbar || {}) })

export interface DashboardNavbarProps {
  /**
   * The element or component this component should render as.
   * @defaultValue 'div'
   */
  as?: any
  icon?: string
  title?: string
  /**
   * Customize the toggle button to open the sidebar.
   * `{ color: 'neutral', variant: 'ghost' }`{lang="ts-type"}
   * @defaultValue true
   */
  toggle?: boolean | Partial<ButtonProps>
  /**
   * The side to render the toggle button on.
   * @defaultValue 'left'
   */
  toggleSide?: 'left' | 'right'
  class?: any
  ui?: Partial<typeof dashboardNavbar.slots>
}

type DashboardNavbarSlotsProps = Omit<DashboardContext, 'persistent' | 'storage' | 'storageKey'>

export interface DashboardNavbarSlots {
  title(props?: {}): any
  leading(props: DashboardNavbarSlotsProps): any
  trailing(props: DashboardNavbarSlotsProps): any
  left(props: DashboardNavbarSlotsProps): any
  default(props: DashboardNavbarSlotsProps): any
  right(props: DashboardNavbarSlotsProps): any
  toggle(props: DashboardNavbarSlotsProps): any
}
</script>

<script setup lang="ts">
import { Primitive } from 'reka-ui'
import { createReusableTemplate } from '@vueuse/core'
import { useDashboard } from '../utils/dashboard'

const props = withDefaults(defineProps<DashboardNavbarProps>(), {
  toggle: true,
  toggleSide: 'left',
})
const slots = defineSlots<DashboardNavbarSlots>()

const [DefineToggleTemplate, ReuseToggleTemplate] = createReusableTemplate()

const dashboardContext = useDashboard({})

// eslint-disable-next-line vue/no-dupe-keys
const ui = dashboardNavbar()
</script>

<template>
  <DefineToggleTemplate>
    <slot name="toggle" v-bind="dashboardContext">
      <DashboardSidebarToggle
        v-if="toggle"
        v-bind="typeof toggle === 'object' ? (toggle as Partial<ButtonProps>) : {}"
        :side="toggleSide"
        :class="ui.toggle({ class: props.ui?.toggle, toggleSide })"
      />
    </slot>
  </DefineToggleTemplate>

  <Primitive :as="as" :class="ui.root({ class: [props.class, props.ui?.root] })">
    <div :class="ui.left({ class: props.ui?.left })">
      <ReuseToggleTemplate v-if="toggleSide === 'left'" />

      <slot name="left" v-bind="dashboardContext">
        <slot name="leading" v-bind="dashboardContext">
          <UIcon v-if="icon" :name="icon" :class="ui.icon({ class: props.ui?.icon })" />
        </slot>

        <h1 :class="ui.title({ class: props.ui?.title })">
          <slot name="title">
            {{ title }}
          </slot>
        </h1>

        <slot name="trailing" v-bind="dashboardContext" />
      </slot>
    </div>

    <div v-if="!!slots.default" :class="ui.center({ class: props.ui?.center })">
      <slot v-bind="dashboardContext" />
    </div>

    <div :class="ui.right({ class: props.ui?.right })">
      <slot name="right" v-bind="dashboardContext" />

      <ReuseToggleTemplate v-if="toggleSide === 'right'" />
    </div>
  </Primitive>
</template>
