<script lang="ts" setup></script>
<template>
  <DashboardPanel id="extensions">
    <template #header>
      <DashboardNavbar title="Extensions"></DashboardNavbar>
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
