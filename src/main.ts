import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import ui from '@nuxt/ui/vue-plugin'
import piniaPluginPersist from '@/plugins/pinia-persist-plugin'
const app = createApp(App)

app.use(ui)
// Create the Pinia store
const pinia = createPinia()
pinia.use(piniaPluginPersist)
app.use(pinia)
app.use(router)
app.mount('#app')
