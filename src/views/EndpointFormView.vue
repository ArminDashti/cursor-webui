<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createEndpoint,
  deleteEndpoint,
  fetchEndpoint,
  updateEndpoint,
  type EndpointInput,
} from '@/lib/auth'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'endpoint-edit')
const endpointId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

const name = ref('')
const method = ref<'GET' | 'POST'>('GET')
const group = ref('openai')
const openaiPath = ref('')
const cursorPath = ref('')
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const errorMessage = ref<string | null>(null)

function toInput(): EndpointInput {
  const cursor = cursorPath.value.trim()
  return {
    name: name.value.trim(),
    method: method.value,
    openai_path: openaiPath.value.trim(),
    cursor_path: cursor || null,
    group: group.value.trim(),
  }
}

async function load() {
  if (!isEdit.value) return
  loading.value = true
  errorMessage.value = null
  try {
    const row = await fetchEndpoint(endpointId.value)
    name.value = row.name
    method.value = row.method.toUpperCase() === 'POST' ? 'POST' : 'GET'
    group.value = row.group
    openaiPath.value = row.openai_path
    cursorPath.value = row.cursor_path ?? ''
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load endpoint'
  } finally {
    loading.value = false
  }
}

async function onSave() {
  const body = toInput()
  if (!body.name || !body.openai_path || !body.group) {
    errorMessage.value = 'Name, OpenAI path, and group are required'
    return
  }
  if (!body.openai_path.startsWith('/')) {
    errorMessage.value = 'OpenAI path must start with /'
    return
  }
  if (body.cursor_path && !body.cursor_path.startsWith('/')) {
    errorMessage.value = 'Cursor path must start with /'
    return
  }

  saving.value = true
  errorMessage.value = null
  try {
    if (isEdit.value) {
      await updateEndpoint(endpointId.value, body)
    } else {
      await createEndpoint(body)
    }
    await router.push('/endpoints')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!isEdit.value) return
  if (!window.confirm('Delete this endpoint definition?')) return
  deleting.value = true
  errorMessage.value = null
  try {
    await deleteEndpoint(endpointId.value)
    await router.push('/endpoints')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Delete failed'
  } finally {
    deleting.value = false
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
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ isEdit ? 'Edit endpoint' : 'New endpoint' }}
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Define OpenAI and Cursor paths used for health checks and the test playground.
        </p>
      </div>
      <Button size="sm" variant="outline" @click="router.push('/endpoints')">Back</Button>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
    <p v-if="loading" class="text-sm text-muted-foreground">Loading…</p>

    <Card v-if="!loading">
      <CardHeader>
        <CardTitle class="text-base">Definition</CardTitle>
        <CardDescription>Paths must start with /.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="onSave">
          <label class="block space-y-1 text-sm">
            <span class="text-muted-foreground">Name</span>
            <input
              v-model="name"
              type="text"
              required
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1 text-sm">
              <span class="text-muted-foreground">Method</span>
              <select
                v-model="method"
                class="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
            <label class="space-y-1 text-sm">
              <span class="text-muted-foreground">Group</span>
              <select
                v-model="group"
                class="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="local">local</option>
                <option value="cursor">cursor</option>
                <option value="openai">openai</option>
              </select>
            </label>
          </div>

          <label class="block space-y-1 text-sm">
            <span class="text-muted-foreground">OpenAI path</span>
            <input
              v-model="openaiPath"
              type="text"
              required
              placeholder="/v1/models"
              spellcheck="false"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs"
            />
          </label>

          <label class="block space-y-1 text-sm">
            <span class="text-muted-foreground">Cursor path</span>
            <input
              v-model="cursorPath"
              type="text"
              placeholder="/api/v1/cursor/models"
              spellcheck="false"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs"
            />
          </label>

          <div class="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" :disabled="saving || deleting">
              {{ saving ? 'Saving…' : isEdit ? 'Save' : 'Create' }}
            </Button>
            <Button
              v-if="isEdit"
              type="button"
              size="sm"
              variant="outline"
              :disabled="saving || deleting"
              @click="onDelete"
            >
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
