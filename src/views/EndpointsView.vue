<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchEndpoints, type EndpointRow } from '@/lib/auth'

const rows = ref<EndpointRow[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const lastRefresh = ref<string | null>(null)

let timer: ReturnType<typeof setInterval> | null = null

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

onMounted(() => {
  void load()
  timer = setInterval(() => {
    void load()
  }, 15000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-4 px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Endpoints</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Live health of local, OpenAI-compatible, and Cursor Cloud probes.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="lastRefresh" class="text-xs text-muted-foreground">Updated {{ lastRefresh }}</span>
        <Button size="sm" variant="outline" :disabled="loading" @click="load">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </Button>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Status</CardTitle>
        <CardDescription>Auto-refreshes every 15 seconds.</CardDescription>
      </CardHeader>
      <CardContent class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b text-muted-foreground">
              <th class="px-2 py-2 font-medium">Name</th>
              <th class="px-2 py-2 font-medium">Path</th>
              <th class="px-2 py-2 font-medium">Group</th>
              <th class="px-2 py-2 font-medium">Status</th>
              <th class="px-2 py-2 font-medium">Latency</th>
              <th class="px-2 py-2 font-medium">Last checked</th>
              <th class="px-2 py-2 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-b border-border/70">
              <td class="px-2 py-2.5 font-medium">{{ row.name }}</td>
              <td class="px-2 py-2.5 font-mono text-xs">{{ row.method }} {{ row.path }}</td>
              <td class="px-2 py-2.5 capitalize">{{ row.group }}</td>
              <td class="px-2 py-2.5">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium capitalize" :class="statusClass(row.status)">
                  {{ row.status }}
                </span>
              </td>
              <td class="px-2 py-2.5">
                <template v-if="row.latency_ms != null">{{ row.latency_ms }} ms</template>
                <template v-else>—</template>
              </td>
              <td class="px-2 py-2.5 text-xs text-muted-foreground">
                {{ row.last_checked_at ? new Date(row.last_checked_at).toLocaleString() : '—' }}
              </td>
              <td class="max-w-[220px] truncate px-2 py-2.5 text-xs text-muted-foreground" :title="row.last_error || ''">
                {{ row.last_error || '—' }}
              </td>
            </tr>
            <tr v-if="!loading && rows.length === 0">
              <td colspan="7" class="px-2 py-8 text-center text-muted-foreground">No endpoint data yet.</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
