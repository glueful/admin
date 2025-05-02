<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  ModalTitle: {
    type: String,
    default: '',
  },
  ModalContent: {
    type: String,
    default: '',
  },
  ModalConfirmText: {
    type: String,
    default: 'Yes, Discard Changes',
  },
  ModalCancelText: {
    type: String,
    default: 'No, Save Changes',
  },
  ModalIcon: {
    type: String,
    default: 'warning',
  },
  showCloseIcon: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:open', 'close', 'confirm'])

// Create a computed property for two-way binding of open state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="ModalTitle"
    :ui="{
      footer: 'justify-end gap-3',
    }"
    :close="showCloseIcon ? { onClick: () => emit('close') } : false"
  >
    <template #body>
      <slot name="body" />
      <p v-if="ModalContent">{{ ModalContent }}</p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="soft" :label="ModalCancelText" @click="emit('close')" />
      <UButton type="button" color="primary" :label="ModalConfirmText" @click="emit('confirm')" />
    </template>
  </UModal>
</template>
