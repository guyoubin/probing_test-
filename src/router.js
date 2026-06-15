import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('./components/layout/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('./pages/DashboardPage.vue'),
      },
      {
        path: 'monitors',
        name: 'MonitorList',
        component: () => import('./pages/MonitorListPage.vue'),
      },
      {
        path: 'monitor/:id',
        name: 'MonitorDetail',
        component: () => import('./pages/MonitorDetailPage.vue'),
        props: true,
      },
      {
        path: 'probe/run',
        name: 'ProbeRun',
        component: () => import('./pages/ProbeRunPage.vue'),
      },
      {
        path: 'probe/nodes',
        name: 'ProbeNodes',
        component: () => import('./pages/ProbeNodesPage.vue'),
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('./pages/ReportsPage.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('./pages/SettingsPage.vue'),
      },
    ],
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('./pages/SetupPage.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.name === 'Setup') {
    next();
    return;
  }
  // Check if system needs setup (no admin user)
  try {
    const res = await fetch('/api/setup-status');
    const data = await res.json();
    if (data.needSetup) {
      next({ name: 'Setup' });
      return;
    }
  } catch {
    // API not available, continue
  }
  next();
});

export default router;
