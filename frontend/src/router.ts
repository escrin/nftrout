import { createRouter, createWebHistory } from 'vue-router';

import HomeView from './views/HomeView.vue';

const router = createRouter({
  strict: true,
  history: createWebHistory((import.meta as any).env.BASE_URL),
  routes: [
    {
      path: `/`,
      component: HomeView,
    },
    {
      path: `/races/:race`,
      component: () => import('./views/RaceView.vue'),
    },
    {
      path: '/:path(.*)',
      component: () => import('./views/404View.vue'),
    },
  ],
});

export default router;
