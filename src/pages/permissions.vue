<script lang="ts" setup></script>
<template>
  <DashboardPanel id="permissions">
    <template #header>
      <DashboardNavbar title="Permissions"></DashboardNavbar>
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
