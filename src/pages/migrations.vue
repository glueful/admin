<script lang="ts" setup></script>
<template>
  <DashboardPanel id="migrations">
    <template #header>
      <DashboardNavbar title="Migrations"></DashboardNavbar>
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
