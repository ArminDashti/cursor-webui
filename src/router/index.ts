import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import EndpointsView from '@/views/EndpointsView.vue'
import EndpointFormView from '@/views/EndpointFormView.vue'
import ApiKeysView from '@/views/ApiKeysView.vue'
import { getToken } from '@/lib/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/endpoints' },
    { path: '/login', name: 'login', component: LoginView, meta: { guest: true } },
    { path: '/endpoints', name: 'endpoints', component: EndpointsView, meta: { requiresAuth: true } },
    {
      path: '/endpoints/new',
      name: 'endpoint-new',
      component: EndpointFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/endpoints/:id/edit',
      name: 'endpoint-edit',
      component: EndpointFormView,
      meta: { requiresAuth: true },
    },
    { path: '/api-keys', name: 'api-keys', component: ApiKeysView, meta: { requiresAuth: true } },
  ],
})

router.beforeEach((to) => {
  const token = getToken()
  if (to.meta.requiresAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && token) {
    return { name: 'endpoints' }
  }
  return true
})

export default router
