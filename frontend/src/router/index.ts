import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * One dashboard route with an optional board param, so switching boards never remounts the
 * page (and never restarts the feed). Pages are lazy chunks.
 */
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: ROUTE_NAMES.board } },
  {
    path: '/board/:boardId?',
    name: ROUTE_NAMES.board,
    component: () => import('@/pages/DashboardPage.vue'),
    props: true,
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
