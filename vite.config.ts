import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueRouter from 'unplugin-vue-router/vite'
import ui from '@nuxt/ui/vite'
import Layouts from 'vite-plugin-vue-layouts-next'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VueRouter(),
    Layouts(),
    ui({
      ui: {
        icons: {
          loading: 'i-lucide-loader-circle',
        },
        button: {
          slots: {
            base: ['cursor-pointer'],
          },
        },
        dropdownMenu: {
          slots: {
            item: ['cursor-pointer'],
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
