<script lang="ts">
import type { SwitchProps } from '@nuxt/ui'

export interface ColorModeSwitchProps
  extends /** @vue-ignore */ Pick<SwitchProps, 'as' | 'color' | 'size' | 'disabled' | 'ui'> {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'
import { useAppConfig } from '@/composables/appConfig'

defineOptions({ inheritAttrs: false })

defineProps<ColorModeSwitchProps>()

const colorMode: any = useColorMode()
const appConfig: any = useAppConfig()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  },
})
</script>

<template>
  <ClientOnly v-if="!colorMode?.forced">
    <USwitch
      v-bind="$attrs"
      v-model="isDark"
      :checked-icon="appConfig.ui.icons.dark"
      :unchecked-icon="appConfig.ui.icons.light"
      :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
    />

    <template #fallback>
      <USwitch
        v-bind="$attrs"
        :checked-icon="appConfig.ui.icons.dark"
        :unchecked-icon="appConfig.ui.icons.light"
        :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
        disabled
      />
    </template>
  </ClientOnly>
</template>
