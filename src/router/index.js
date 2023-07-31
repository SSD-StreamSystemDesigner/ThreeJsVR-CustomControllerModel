import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import Cube from "../components/Cube.vue"
import testVrController from "../views/testVrController.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: testVrController, //HomeView,
    },

    {
      path:"/cube",
      name:"cube",
      component: Cube,
    },
    {
      path:"/test",
      name:"test",
      component: testVrController,
    }
  ],
});

export default router;
