import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initTheme } from './lib/theme'
import { useAuth } from './lib/useAuth'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './assets/index.css'

initTheme()

const { hydrate } = useAuth()

void hydrate().then(() => {
  createApp(App).use(router).mount('#app')
})
