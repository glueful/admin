<script lang="ts" setup></script>
<template>
  <DashboardPanel id="settings">
    <template #header>
      <DashboardNavbar title="Settings"></DashboardNavbar>
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
