<script lang="ts" setup></script>
<template>
  <DashboardPanel id="cron-jobs">
    <template #header>
      <DashboardNavbar title="Cron Jobs"></DashboardNavbar>
    </template>
  </DashboardPanel>
</template>
<route lang="json">
{
  "meta": {
    "layout": "dashboard",
    "requiresAuth": true
  }
}
</route>
