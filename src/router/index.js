// src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from '@/utils/supabase'

// ✅ Import all views
import LoginView from '@/views/auth/LoginView.vue'
import RegisterView from '@/views/auth/RegisterView.vue'
import DashboardView from '@/views/system/DashboardView.vue'
import ProfileView from '@/views/system/ProfileView.vue'
import ReportPage from '@/views/system/ReportPage.vue'
import ReportHistory from '@/views/system/ReportHistory.vue'
import AdminDashboard from '@/views/system/AdminDashboard.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },

    // 🧍 User routes (require login)
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
    { path: '/report', name: 'report', component: ReportPage, meta: { requiresAuth: true } },
    {
      path: '/my-reports',
      name: 'ReportHistory',
      component: ReportHistory,
      meta: { requiresAuth: true },
    },

    // 🧑‍💼 Admin route
    {
      path: '/admin',
      name: 'admin',
      component: AdminDashboard,
      meta: { requiresAuth: true, requiresAdmin: true },
    },

    // Fallback
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// ✅ Global navigation guard
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta?.requiresAuth
  const requiresAdmin = to.meta?.requiresAdmin

  // Route doesn’t need authentication
  if (!requiresAuth) return next()

  // Get current user from Supabase
  const { data, error } = await supabase.auth.getUser()
  const user = data?.user

  // No user? send to login
  if (error || !user) return next('/login')

  // Check admin route
  if (requiresAdmin) {
    const role = user.user_metadata?.role || 'user'
    if (role !== 'admin') {
      // not admin -> redirect to normal user dashboard
      return next('/dashboard')
    }
  }

  // ✅ Authorized
  next()
})

export default router
