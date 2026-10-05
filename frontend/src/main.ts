import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/motion.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import { createAppI18n } from '@/plugins/i18n'
import { createAppVuetify } from '@/plugins/vuetify'
import { router } from '@/router'
import { useSettingsStore } from '@/stores/useSettingsStore'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Start in the saved theme and language, so the first paint doesn't flash the defaults.
const { settings } = useSettingsStore(pinia)
const i18n = createAppI18n(settings.locale)

app.use(i18n)
app.use(createAppVuetify(i18n, settings.theme))
app.use(router)
app.mount('#app')
