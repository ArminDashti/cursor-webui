<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import AppFooter from '@/components/AppFooter.vue'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/useAuth'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'

const router = useRouter()
const { isAuthenticated, logout } = useAuth()

const theme = ref<Theme>(getTheme())
const offline = ref(!navigator.onLine)

const navLinkClass =
  'rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
const navLinkActiveClass = 'bg-muted text-foreground'

function syncTheme() {
  theme.value = getTheme()
}

function onLogout() {
  logout()
  void router.push('/login')
}

function onToggleTheme() {
  theme.value = toggleTheme()
}

function onOnline() {
  offline.value = false
}
function onOffline() {
  offline.value = true
}

let themeObserver: MutationObserver | null = null

onMounted(() => {
  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<template>
  <div class="flex h-full w-full flex-col bg-background text-foreground">
    <header
      class="sticky top-0 z-40 flex shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-background/95 px-4 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <nav class="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5" aria-label="Main">
        <RouterLink
          to="/endpoints"
          class="mr-2 flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[10px] font-bold uppercase tracking-wide text-primary-foreground"
            aria-hidden="true"
          >
            C
          </span>
          <span>Cursor Gateway</span>
        </RouterLink>
        <RouterLink :class="navLinkClass" :active-class="navLinkActiveClass" to="/endpoints">
          Endpoints
        </RouterLink>
        <RouterLink :class="navLinkClass" :active-class="navLinkActiveClass" to="/api-keys">
          API Keys
        </RouterLink>
      </nav>
      <div class="flex shrink-0 items-center gap-2">
        <span
          v-if="offline"
          class="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
        >
          Offline
        </span>
        <Button
          variant="outline"
          size="sm"
          :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="onToggleTheme"
        >
          {{ theme === 'dark' ? 'Light' : 'Dark' }}
        </Button>
        <template v-if="isAuthenticated">
          <Button variant="ghost" size="sm" @click="onLogout">Log out</Button>
        </template>
        <template v-else>
          <RouterLink to="/login">
            <Button variant="outline" size="sm">Log in</Button>
          </RouterLink>
        </template>
      </div>
    </header>
    <main class="min-h-0 flex-1 overflow-auto">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>
