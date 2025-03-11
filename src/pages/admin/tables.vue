<route lang="json">
{
  "meta": {
    "requiresAuth": true
  }
}
</route>
<script setup lang="ts">
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
</script>
<template>
  <DashboardPanel id="tables" :default-size="15" :min-size="15" :max-size="15">
    <div class="overflow-y-auto divide-y divide-(--ui-border)">tables</div>
  </DashboardPanel>
  <div
    class="flex flex-col sm:flex-row justify-between gap-1 p-4 sm:px-6 border-b border-(--ui-border)"
  >
    tables Data
  </div>
</template>
