import { createRouter, createWebHistory } from 'vue-router';

import HomeView from './views/HomeView.vue';

const router = createRouter({
  strict: true,
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: `/`,
      component: HomeView,
    },
    // {
    //   path: '/games/:gameId(\\d+)',
    //   component: GameView,
    //   props: true,
    //   name: 'game',
    // },
    {
      path: '/:path(.*)',
      component: () => import('./views/404View.vue'),
    },
  ],
});

export default router;
