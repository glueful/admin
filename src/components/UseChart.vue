<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import type { ChartConfiguration } from 'chart.js'

const props = defineProps({
  options: {
    type: Object as () => ChartConfiguration,
    required: true,
  },
})

const chartContainer = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

onMounted(() => {
  if (chartContainer.value && props.options && Object.keys(props.options).length > 0) {
    createChart()
  }
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

watch(
  () => props.options,
  (newOptions) => {
    if (chartInstance) {
      chartInstance.destroy()
    }

    if (Object.keys(newOptions).length > 0) {
      nextTick(() => createChart())
    }
  },
  { deep: true },
)

function createChart() {
  if (!chartContainer.value) return

  chartInstance = new Chart(chartContainer.value, props.options)
}
</script>

<template>
  <canvas ref="chartContainer"></canvas>
</template>
