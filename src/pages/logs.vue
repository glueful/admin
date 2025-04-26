<script lang="ts" setup></script>
<template>
  <DashboardPanel id="logs">
    <template #header>
      <DashboardNavbar title="Logs"></DashboardNavbar>
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
