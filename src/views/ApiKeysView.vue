<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createAPIKey,
  fetchAPIKeys,
  revokeAPIKey,
  type APIKeyRow,
} from '@/lib/auth'

const rows = ref<APIKeyRow[]>([])
const name = ref('')
const loading = ref(false)
const creating = ref(false)
const errorMessage = ref<string | null>(null)
const createdSecret = ref<string | null>(null)
const copied = ref(false)

const activeCount = computed(() => rows.value.filter((r) => !r.revoked_at).length)

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    rows.value = await fetchAPIKeys()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load keys'
  } finally {
    loading.value = false
  }
}

async function onCreate() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  creating.value = true
  errorMessage.value = null
  copied.value = false
  try {
    const created = await createAPIKey(trimmed)
    createdSecret.value = created.key
    name.value = ''
    await load()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Create failed'
  } finally {
    creating.value = false
  }
}

async function onRevoke(id: string) {
  errorMessage.value = null
  try {
    await revokeAPIKey(id)
    await load()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Revoke failed'
  }
}

async function copySecret() {
  if (!createdSecret.value) return
  await navigator.clipboard.writeText(createdSecret.value)
  copied.value = true
}

function dismissSecret() {
  createdSecret.value = null
  copied.value = false
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="w-full space-y-4 px-4 py-8">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">API Keys</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Create gateway keys for OpenAI SDK / HTTP clients, or send a Cursor Cloud
        <code class="rounded bg-muted px-1 py-0.5 text-xs">crsr_…</code> key as
        <code class="rounded bg-muted px-1 py-0.5 text-xs">Authorization: Bearer</code>
        to
        <code class="rounded bg-muted px-1 py-0.5 text-xs">http://localhost:8130/v1</code>.
        Server env <code class="rounded bg-muted px-1 py-0.5 text-xs">CURSOR_API_KEY</code>
        is only needed for <code class="rounded bg-muted px-1 py-0.5 text-xs">ck_…</code> keys.
      </p>
    </div>

    <Card v-if="createdSecret" class="border-primary/40">
      <CardHeader>
        <CardTitle class="text-base">Copy your key now</CardTitle>
        <CardDescription>This secret is shown once and cannot be retrieved again.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <code class="block break-all rounded-md bg-muted px-3 py-2 text-sm">{{ createdSecret }}</code>
        <div class="flex flex-wrap gap-2">
          <Button size="sm" @click="copySecret">{{ copied ? 'Copied' : 'Copy' }}</Button>
          <Button size="sm" variant="outline" @click="dismissSecret">Done</Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Create key</CardTitle>
        <CardDescription>{{ activeCount }} active key(s).</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="onCreate">
          <label class="min-w-[220px] flex-1 space-y-1 text-sm">
            <span>Name</span>
            <input
              v-model="name"
              type="text"
              required
              placeholder="e.g. local-openai-sdk"
              class="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <Button type="submit" :disabled="creating || !name.trim()">
            {{ creating ? 'Creating…' : 'Create' }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Keys</CardTitle>
      </CardHeader>
      <CardContent class="overflow-x-auto">
        <table class="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b text-muted-foreground">
              <th class="px-2 py-2 font-medium">Name</th>
              <th class="px-2 py-2 font-medium">Prefix</th>
              <th class="px-2 py-2 font-medium">Created</th>
              <th class="px-2 py-2 font-medium">Last used</th>
              <th class="px-2 py-2 font-medium">Status</th>
              <th class="px-2 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-b border-border/70">
              <td class="px-2 py-2.5 font-medium">{{ row.name }}</td>
              <td class="px-2 py-2.5 font-mono text-xs">{{ row.key_prefix }}</td>
              <td class="px-2 py-2.5 text-xs text-muted-foreground">
                {{ new Date(row.created_at).toLocaleString() }}
              </td>
              <td class="px-2 py-2.5 text-xs text-muted-foreground">
                {{ row.last_used_at ? new Date(row.last_used_at).toLocaleString() : '—' }}
              </td>
              <td class="px-2 py-2.5 capitalize">
                {{ row.revoked_at ? 'revoked' : 'active' }}
              </td>
              <td class="px-2 py-2.5 text-right">
                <Button
                  v-if="!row.revoked_at"
                  size="sm"
                  variant="outline"
                  @click="onRevoke(row.id)"
                >
                  Revoke
                </Button>
              </td>
            </tr>
            <tr v-if="!loading && rows.length === 0">
              <td colspan="6" class="px-2 py-8 text-center text-muted-foreground">
                No keys yet. Create one to call OpenAI-compatible routes.
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
