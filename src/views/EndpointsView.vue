<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE, fetchEndpoints, getToken, type EndpointRow } from '@/lib/auth'
import { formatCheckedAt } from '@/lib/format'

const CHAT_BODY_TEMPLATE = `{
  "model": "default",
  "messages": [
    { "role": "user", "content": "ping" }
  ]
}`

const router = useRouter()
const rows = ref<EndpointRow[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const lastRefresh = ref<string | null>(null)

const playgroundOpen = ref(false)
const playgroundTitle = ref('')
const playgroundCursorPath = ref<string | null>(null)
const testMethod = ref<'GET' | 'POST'>('GET')
const testPath = ref('')
const testBody = ref('')
const testApiKey = ref('')
const testSending = ref(false)
const testError = ref<string | null>(null)
const testStatus = ref<number | null>(null)
const testLatencyMs = ref<number | null>(null)
const testResponse = ref<string | null>(null)

const needsApiKey = computed(() => testPath.value.startsWith('/v1/'))
const needsJwt = computed(() => testPath.value.startsWith('/api/'))
const bodyEnabled = computed(() => testMethod.value === 'POST')
const hasCursorPath = computed(() => Boolean(playgroundCursorPath.value?.trim()))

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    rows.value = await fetchEndpoints()
    lastRefresh.value = new Date().toLocaleTimeString()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load endpoints'
  } finally {
    loading.value = false
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'up':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    case 'down':
      return 'bg-red-500/15 text-red-700 dark:text-red-300'
    case 'degraded':
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function openEdit(row: EndpointRow) {
  void router.push(`/endpoints/${row.id}/edit`)
}

function openPlayground(row: EndpointRow) {
  playgroundTitle.value = row.name
  playgroundCursorPath.value = row.cursor_path?.trim() || null
  const method = row.method.toUpperCase() === 'POST' ? 'POST' : 'GET'
  testMethod.value = method
  testPath.value = row.openai_path
  testBody.value =
    method === 'POST' && row.openai_path === '/v1/chat/completions'
      ? CHAT_BODY_TEMPLATE
      : method === 'POST'
        ? '{\n}\n'
        : ''
  testApiKey.value = ''
  testError.value = null
  testStatus.value = null
  testLatencyMs.value = null
  testResponse.value = null
  playgroundOpen.value = true
}

function applyCursorPath() {
  const path = playgroundCursorPath.value?.trim()
  if (!path) {
    testError.value = 'No Cursor path defined for this endpoint'
    return
  }
  testPath.value = path
  testError.value = null
}

function closePlayground() {
  if (testSending.value) return
  playgroundOpen.value = false
}

async function sendTest() {
  testError.value = null
  testStatus.value = null
  testLatencyMs.value = null
  testResponse.value = null

  const path = testPath.value.trim()
  if (!path.startsWith('/')) {
    testError.value = 'Path must start with /'
    return
  }

  const headers = new Headers()
  if (needsJwt.value) {
    const token = getToken()
    if (!token) {
      testError.value = 'Not authenticated (session JWT required for /api/ routes)'
      return
    }
    headers.set('Authorization', `Bearer ${token}`)
  } else if (needsApiKey.value) {
    const key = testApiKey.value.trim()
    if (!key) {
      testError.value = 'API key is required for /v1/ routes'
      return
    }
    headers.set('Authorization', `Bearer ${key}`)
  }

  const init: RequestInit = { method: testMethod.value, headers }
  if (testMethod.value === 'POST') {
    headers.set('Content-Type', 'application/json')
    init.body = testBody.value
  }

  testSending.value = true
  const start = performance.now()
  try {
    const response = await fetch(`${API_BASE}${path}`, init)
    testLatencyMs.value = Math.round(performance.now() - start)
    testStatus.value = response.status
    const text = await response.text()
    try {
      testResponse.value = JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      testResponse.value = text || '(empty body)'
    }
  } catch (err) {
    testLatencyMs.value = Math.round(performance.now() - start)
    testError.value = err instanceof Error ? err.message : 'Request failed'
  } finally {
    testSending.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="w-full space-y-4 px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Endpoints</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Live health of local, OpenAI-compatible, and Cursor Cloud probes.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="lastRefresh" class="text-xs text-muted-foreground">Updated {{ lastRefresh }}</span>
        <Button size="sm" variant="outline" @click="router.push('/endpoints/new')">Add endpoint</Button>
        <Button size="sm" variant="outline" :disabled="loading" @click="load">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </Button>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Status</CardTitle>
        <CardDescription>Refresh manually to re-probe endpoints.</CardDescription>
      </CardHeader>
      <CardContent class="overflow-x-auto">
        <table class="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b text-muted-foreground">
              <th class="px-2 py-2 font-medium">Name</th>
              <th class="px-2 py-2 font-medium">Method</th>
              <th class="px-2 py-2 font-medium">OpenAI path</th>
              <th class="px-2 py-2 font-medium">Group</th>
              <th class="px-2 py-2 font-medium">Latency</th>
              <th class="px-2 py-2 font-medium">Last checked</th>
              <th class="px-2 py-2 font-medium">Status</th>
              <th class="px-2 py-2 font-medium">Error</th>
              <th class="px-2 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-b border-border/70">
              <td class="px-2 py-2.5 font-medium">{{ row.name }}</td>
              <td class="px-2 py-2.5 font-mono text-xs uppercase">{{ row.method }}</td>
              <td class="px-2 py-2.5 font-mono text-xs">{{ row.openai_path }}</td>
              <td class="px-2 py-2.5 capitalize">{{ row.group }}</td>
              <td class="px-2 py-2.5">
                <template v-if="row.latency_ms != null">{{ row.latency_ms }} ms</template>
                <template v-else>—</template>
              </td>
              <td class="px-2 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                {{ formatCheckedAt(row.last_checked_at) }}
              </td>
              <td class="px-2 py-2.5">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium capitalize" :class="statusClass(row.status)">
                  {{ row.status }}
                </span>
              </td>
              <td class="max-w-[220px] truncate px-2 py-2.5 text-xs text-muted-foreground" :title="row.last_error || ''">
                {{ row.last_error || '—' }}
              </td>
              <td class="px-2 py-2.5">
                <div class="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" @click="openEdit(row)">Edit</Button>
                  <Button size="sm" variant="outline" @click="openPlayground(row)">Test</Button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && rows.length === 0">
              <td colspan="9" class="px-2 py-8 text-center text-muted-foreground">No endpoint data yet.</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>

    <div
      v-if="playgroundOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closePlayground"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
        <div class="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 class="text-base font-semibold">Test request</h2>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ playgroundTitle }}</p>
          </div>
          <Button size="sm" variant="ghost" :disabled="testSending" @click="closePlayground">Close</Button>
        </div>

        <div class="space-y-3 px-4 py-4">
          <div class="grid items-end gap-3 sm:grid-cols-[7rem_auto_1fr]">
            <label class="space-y-1 text-sm">
              <span class="text-muted-foreground">Method</span>
              <select
                v-model="testMethod"
                class="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
            <Button
              size="sm"
              variant="outline"
              class="h-9"
              :disabled="!hasCursorPath"
              @click="applyCursorPath"
            >
              Cursor path
            </Button>
            <label class="space-y-1 text-sm">
              <span class="text-muted-foreground">OpenAI path</span>
              <input
                v-model="testPath"
                type="text"
                class="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs"
                spellcheck="false"
              />
            </label>
          </div>

          <label v-if="needsApiKey" class="block space-y-1 text-sm">
            <span class="text-muted-foreground">API key (Bearer for /v1/)</span>
            <input
              v-model="testApiKey"
              type="password"
              autocomplete="off"
              placeholder="ck_…"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs"
            />
          </label>
          <p v-else-if="needsJwt" class="text-xs text-muted-foreground">
            Uses your session JWT for /api/ routes.
          </p>

          <label v-if="bodyEnabled" class="block space-y-1 text-sm">
            <span class="text-muted-foreground">Body (JSON)</span>
            <textarea
              v-model="testBody"
              rows="8"
              class="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              spellcheck="false"
            />
          </label>

          <p v-if="testError" class="text-sm text-red-600 dark:text-red-400">{{ testError }}</p>

          <div class="flex items-center gap-2">
            <Button size="sm" :disabled="testSending" @click="sendTest">
              {{ testSending ? 'Sending…' : 'Send' }}
            </Button>
            <span v-if="testStatus != null" class="text-xs text-muted-foreground">
              Status {{ testStatus }}
              <template v-if="testLatencyMs != null"> · {{ testLatencyMs }} ms</template>
            </span>
          </div>

          <div v-if="testResponse != null" class="space-y-1">
            <p class="text-xs font-medium text-muted-foreground">Response</p>
            <pre
              class="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap break-all"
            >{{ testResponse }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
