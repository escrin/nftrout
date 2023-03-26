import { createRouter, createWebHistory } from "vue-router";

import HomeView from "./views/HomeView.vue";

const router = createRouter({
  strict: true,
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: `/`,
      component: HomeView,
    },
    {
      path: "/:path(.*)",
      component: () => import("./views/404View.vue"),
    },
  ],
});

export default router;
