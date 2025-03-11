<script lang="ts">
import _appConfig from '#build/app.config'
import type {
  ButtonProps,
  FormProps,
  FormFieldProps,
  FormSchema,
  FormSubmitEvent,
  SeparatorProps,
} from '@nuxt/ui'
import { tv } from '../utils/tv'
import theme from '@/components/themes/auth-form'

const appConfig = _appConfig as AppConfig & { ui: { authForm: Partial<typeof theme> } }

const authForm = tv({ extend: tv(theme), ...(appConfig.ui?.authForm || {}) })

type AuthFormField = FormFieldProps & {
  name: string
  type?: 'checkbox' | 'select' | 'password' | 'text'
  defaultValue?: string | number | boolean | null | undefined
}

export interface AuthFormProps<T extends FormSchema<object>, F extends AuthFormField> {
  /**
   * The element or component this component should render as.
   * @defaultValue 'div'
   */
  as?: string | object
  title?: string
  description?: string
  icon?: string
  fields?: F[]
  /**
   * Display a list of Button under the description.
   * `{ color: 'neutral', variant: 'subtle', block: true }`{lang="ts-type"}
   */
  providers?: ButtonProps[]
  /**
   * The text displayed in the separator.
   * @defaultValue 'or'
   */
  separator?: string | SeparatorProps
  /**
   * Display a submit button at the bottom of the form.
   * `{ label: 'Continue', block: true }`{lang="ts-type"}
   */
  submit?: ButtonProps
  schema?: T
  validate?: FormProps<object>['validate']
  validateOn?: FormProps<object>['validateOn']
  validateOnInputDelay?: FormProps<object>['validateOnInputDelay']
  disabled?: FormProps<object>['disabled']
  class?: string | string[] | Record<string, boolean>
  ui?: Partial<typeof authForm.slots>
}

export type AuthFormEmits<T extends object> = {
  submit: [payload: FormSubmitEvent<T>]
}

type DynamicFieldSlots<T, F, SlotProps = { field: F; state: T }> = Record<
  string,
  (props: SlotProps) => unknown
> &
  Record<`${keyof T extends string ? keyof T : never}-field`, (props: SlotProps) => unknown>

type DynamicFormFieldSlots<T> = Record<string, (props?: object) => unknown> &
  Record<
    `${keyof T extends string ? keyof T : never}-${'label' | 'description' | 'hint' | 'help' | 'error'}`,
    (props?: object) => unknown
  >

export type AuthFormSlots<T extends object, F extends AuthFormField> = {
  header(props?: object): unknown
  leading(props?: object): unknown
  title(props?: object): unknown
  description(props?: object): unknown
  validation(props?: object): unknown
  footer(props?: object): unknown
} & DynamicFieldSlots<T, F> &
  DynamicFormFieldSlots<T>
</script>
<script setup lang="ts" generic="T extends FormSchema<any>, F extends AuthFormField">
import { reactive, ref, type AppConfig } from 'vue'
import { Primitive } from 'reka-ui'
import { omit } from '@nuxt/ui/utils/index'
import { useAppConfig } from '@/composables/appConfig'

const props = withDefaults(defineProps<AuthFormProps<T, F>>(), {
  separator: 'or',
})

type FormStateType = T extends FormSchema<infer U> ? U : Record<string, unknown>

type TypedAuthFormField = AuthFormField & {
  name: keyof FormStateType
  defaultValue?: FormStateType[keyof FormStateType]
}

const state = reactive<FormStateType>(
  ((props.fields as TypedAuthFormField[]) || []).reduce<FormStateType>((acc, field) => {
    if (field.name) {
      acc[field.name] = field.defaultValue
    }
    return acc
  }, {} as FormStateType),
)

const emits = defineEmits<AuthFormEmits<typeof state>>()
const slots = defineSlots<AuthFormSlots<typeof state, F>>()

const appConfig = useAppConfig()

const formRef = ref()
const passwordVisibility = ref(false)

// eslint-disable-next-line vue/no-dupe-keys
const ui = authForm()

defineExpose({
  formRef,
})
</script>
<template>
  <Primitive :as="as" :class="ui.root({ class: [props.class as any, props.ui?.root] })">
    <div
      v-if="
        icon ||
        !!slots.icon ||
        title ||
        !!slots.title ||
        description ||
        !!slots.description ||
        !!slots.header
      "
      :class="ui.header({ class: props.ui?.header })"
    >
      <slot name="header">
        <div v-if="icon || !!slots.leading" :class="ui.leading({ class: props.ui?.leading })">
          <slot name="leading">
            <UIcon
              v-if="icon"
              :name="icon"
              :class="ui.leadingIcon({ class: props.ui?.leadingIcon })"
            />
          </slot>
        </div>

        <div v-if="title || !!slots.title" :class="ui.title({ class: props.ui?.title })">
          <slot name="title">
            {{ title }}
          </slot>
        </div>

        <div
          v-if="description || !!slots.description"
          :class="ui.description({ class: props.ui?.description })"
        >
          <slot name="description">
            {{ description }}
          </slot>
        </div>
      </slot>
    </div>

    <div :class="ui.body({ class: props.ui?.body })">
      <div v-if="providers?.length" :class="ui.providers({ class: props.ui?.providers })">
        <UButton
          v-for="(provider, index) in providers"
          :key="index"
          block
          color="neutral"
          variant="subtle"
          v-bind="provider"
        />
      </div>

      <USeparator
        v-if="providers?.length && fields?.length"
        v-bind="typeof separator === 'object' ? separator : { label: separator }"
        :class="ui.separator({ class: props.ui?.separator })"
      />

      <UForm
        v-if="fields?.length"
        ref="formRef"
        :state="state"
        :schema="schema"
        :validate="validate"
        :validate-on="validateOn"
        :class="ui.form({ class: props.ui?.form })"
        @submit="emits('submit', $event)"
      >
        <UFormField
          v-for="field in fields"
          :key="field.name"
          :label="field.type === 'checkbox' ? '' : (field.label ?? '')"
          :description="field.description"
          :help="field.help"
          :hint="field.hint"
          :name="field.name"
          :size="field.size"
          :required="field.required"
        >
          <slot :name="`${field.name}-field`" v-bind="{ state, field }">
            <UCheckbox
              v-if="field.type === 'checkbox'"
              v-model="state[field.name]"
              v-bind="omit(field, ['description', 'help', 'hint', 'size', 'defaultValue'])"
            />
            <USelectMenu
              v-else-if="field.type === 'select'"
              v-model="state[field.name]"
              v-bind="omit(field, ['description', 'help', 'hint', 'size'])"
            />
            <UInput
              v-else-if="field.type === 'password'"
              v-model="state[field.name]"
              :type="passwordVisibility ? 'text' : 'password'"
              v-bind="
                omit(field, [
                  'label',
                  'description',
                  'help',
                  'hint',
                  'size',
                  'type',
                  'required',
                  'defaultValue',
                ])
              "
              :ui="{ root: 'w-full' }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="passwordVisibility ? appConfig.ui.icons.eyeOff : appConfig.ui.icons.eye"
                  :aria-label="passwordVisibility ? 'Hide password' : 'Show password'"
                  :aria-pressed="passwordVisibility"
                  aria-controls="password"
                  @click="passwordVisibility = !passwordVisibility"
                />
              </template>
            </UInput>
            <UInput
              v-else
              v-model="state[field.name]"
              v-bind="
                omit(field, [
                  'label',
                  'description',
                  'help',
                  'hint',
                  'size',
                  'required',
                  'defaultValue',
                ])
              "
              :ui="{ root: 'w-full' }"
            />
          </slot>

          <template v-if="!!slots[`${field.name}-label`]" #label>
            <slot :name="`${field.name}-label`" />
          </template>
          <template v-if="!!slots[`${field.name}-description`]" #description>
            <slot :name="`${field.name}-description`" />
          </template>
          <template v-if="!!slots[`${field.name}-hint`]" #hint>
            <slot :name="`${field.name}-hint`" />
          </template>
          <template v-if="!!slots[`${field.name}-help`]" #help>
            <slot :name="`${field.name}-help`" />
          </template>
          <template v-if="!!slots[`${field.name}-error`]" #error>
            <slot :name="`${field.name}-error`" />
          </template>
        </UFormField>

        <slot v-if="!!slots.validation" name="validation" />

        <UButton type="submit" label="Continue" block v-bind="submit" />
      </UForm>
    </div>

    <div v-if="!!slots.footer" :class="ui.footer({ class: props.ui?.footer })">
      <slot name="footer" />
    </div>
  </Primitive>
</template>
