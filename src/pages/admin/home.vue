<route lang="json">
{
  "meta": {
    "requiresAuth": true
  }
}
</route>
<script setup lang="ts">
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import DashboardNavbar from '@/components/dashboard/DashboardNavbar.vue'
</script>
<template>
  <DashboardPanel id="overview">
    <template #header>
      <DashboardNavbar title="Overview"> </DashboardNavbar>
    </template>
    <template #body>
      <div>Overview...</div>
    </template>
  </DashboardPanel>
</template>
