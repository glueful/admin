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
  ModalConfirmColor: {
    type: String as () =>
      | 'primary'
      | 'neutral'
      | 'warning'
      | 'secondary'
      | 'success'
      | 'info'
      | 'error',
    default: 'primary',
  },
  ModalCancelColor: {
    type: String as () =>
      | 'primary'
      | 'neutral'
      | 'warning'
      | 'secondary'
      | 'success'
      | 'info'
      | 'error',
    default: 'neutral',
  },
  ModalCancelText: {
    type: String,
    default: 'No, Save Changes',
  },
  ModalIcon: {
    type: String,
    default: 'warning',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  ModalIconClass: {
    type: String,
    default: 'text-gray-500 size-15',
  },
  showCloseIcon: {
    type: Boolean,
    default: true,
  },
  ui: {
    type: Object,
    default: () => ({
      footer: 'flex justify-end space-x-2',
    }),
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
    :ui="ui"
    :close="showCloseIcon ? { onClick: () => emit('close') } : false"
  >
    <template #body>
      <slot name="body" />
      <UIcon :name="ModalIcon" :class="ModalIconClass" v-if="ModalIcon" class="mb-5" />
      <p v-if="ModalContent" v-html="ModalContent"></p>
    </template>
    <template #footer>
      <UButton
        :color="ModalCancelColor"
        variant="soft"
        :label="ModalCancelText"
        @click="emit('close')"
      />
      <UButton
        type="button"
        :color="ModalConfirmColor"
        :label="ModalConfirmText"
        @click="emit('confirm')"
      />
    </template>
  </UModal>
</template>
