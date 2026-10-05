import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import type { Component } from 'vue'
import { createAppI18n } from '@/plugins/i18n'
import { createAppVuetify } from '@/plugins/vuetify'

/** Mounts with the real Vuetify theme, i18n (English) and a fresh Pinia, like main.ts does. */
export function mountWithPlugins<C extends Component>(
  component: C,
  options: ComponentMountingOptions<C> = {},
  pinia: Pinia = createPinia(),
) {
  setActivePinia(pinia)
  const i18n = createAppI18n('en')
  const vuetify = createAppVuetify(i18n)
  return mount(component, {
    ...options,
    global: { ...options.global, plugins: [pinia, i18n, vuetify, ...(options.global?.plugins ?? [])] },
  } as ComponentMountingOptions<C>)
}
