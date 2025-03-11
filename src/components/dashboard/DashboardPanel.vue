<script lang="ts">
import type { AppConfig } from '@/types/appConfig'
import _appConfig from '#build/app.config'
import theme from '@/components/themes/dashboard-panel'
import type { UseResizableProps } from '../../composables/useResizable'
import { tv } from '../../utils/tv'

const appConfig = _appConfig as AppConfig & { uiPro: { dashboardPanel: Partial<typeof theme> } }

const dashboardPanel = tv({ extend: tv(theme), ...(appConfig.uiPro?.dashboardPanel || {}) })

export interface DashboardPanelProps
  extends Omit<
    UseResizableProps,
    'collapsed' | 'collapsible' | 'collapsedSize' | 'storage' | 'storageKey' | 'persistent'
  > {
  class?: any
  ui?: Partial<typeof dashboardPanel.slots>
}

export interface DashboardPanelSlots {
  'default'(props?: {}): any
  'header'(props?: {}): any
  'body'(props?: {}): any
  'footer'(props?: {}): any
  'resize-handle'(props: {
    onMouseDown: (e: MouseEvent) => void
    onTouchStart: (e: TouchEvent) => void
  }): any
}
</script>

<script setup lang="ts">
import { computed, useId, toRef } from 'vue'
import { useDashboard } from '../../utils/dashboard'
import { useResizable } from '../../composables/useResizable'

const props = withDefaults(defineProps<DashboardPanelProps>(), {
  minSize: 15,
  resizable: false,
})
defineSlots<DashboardPanelSlots>()

const dashboardContext = useDashboard({ storageKey: 'dashboard' })

const id = `${dashboardContext.storageKey}-panel-${props.id || useId()}`

const { el, size, isDragging, onMouseDown, onTouchStart } = useResizable(
  id,
  toRef(() => ({ ...dashboardContext, ...props })),
)

// eslint-disable-next-line vue/no-dupe-keys
const ui = computed(() =>
  dashboardPanel({
    size: !!size.value,
  }),
)
</script>

<template>
  <div
    :id="id"
    ref="el"
    :data-dragging="isDragging"
    :class="ui.root({ class: [props.class, props.ui?.root] })"
    :style="[size ? { '--width': `${size}%` } : undefined]"
  >
    <slot>
      <slot name="header" />

      <div :class="ui.body({ class: props.ui?.body })">
        <slot name="body" />
      </div>

      <slot name="footer" />
    </slot>
  </div>

  <slot name="resize-handle" :on-mouse-down="onMouseDown" :on-touch-start="onTouchStart">
    <DashboardResizeHandle
      v-if="resizable"
      :aria-controls="id"
      :class="ui.handle({ class: props.ui?.handle })"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
    />
  </slot>
</template>
