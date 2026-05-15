<!-- src/views/auth/LoginView.vue — BCWD Redesign 2025 -->
<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import LoginForm from '@/components/auth/LoginForm.vue'

const { mobile } = useDisplay()
const vuetifyTheme = useTheme()

const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.global.name.value = theme.value

const themeIcon = computed(() => (theme.value === 'light' ? 'mdi-weather-night' : 'mdi-white-balance-sunny'))
const themeLabel = computed(() => (theme.value === 'light' ? 'Dark mode' : 'Light mode'))

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.global.name.value = theme.value
}

watch(theme, (val) => (vuetifyTheme.global.name.value = val))

const phTime = ref('')
let timer = null

function updatePhTime() {
  const now = new Date()
  phTime.value = new Intl.DateTimeFormat('en-PH', {
    weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Asia/Manila',
  }).format(now)
}

onMounted(() => { updatePhTime(); timer = setInterval(updatePhTime, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <v-app :theme="theme">
    <!-- ─── Top bar ─── -->
    <v-app-bar flat height="56" :class="['top-rail', theme]">
      <div class="rail-inner">
        <div class="rail-brand">
          <v-img src="/images/logo.png" width="28" height="28" class="rail-logo" />
          <span class="rail-title">BCWD Complaint System</span>
        </div>
        <v-spacer />
        <span class="rail-time" :class="{ 'd-none': mobile }">{{ phTime }}</span>
        <button class="rail-theme-btn" :title="themeLabel" @click="toggleTheme">
          <v-icon size="18">{{ themeIcon }}</v-icon>
        </button>
      </div>
    </v-app-bar>

    <!-- ─── Main ─── -->
    <v-main :class="['auth-stage', theme]">
      <!-- Geometric accent blobs -->
      <div class="blob blob-a" />
      <div class="blob blob-b" />
      <div class="blob blob-c" />

      <div class="stage-center">
        <!-- Left: Branding panel -->
        <div v-if="!mobile" class="brand-panel">
          <div class="brand-inner">
            <!-- <div class="brand-seal">
              <v-img src="/images/logo.png" width="80" height="80" />
            </div> -->
            <h1 class="brand-heading">Butuan City Water District</h1>
            <p class="brand-sub">Complaint &amp; Service Portal</p>
            <div class="brand-divider" />
            <p class="brand-body">
              A secure, government-grade platform for reporting water service issues,
              tracking complaint status, and connecting residents with maintenance teams
              in real-time.
            </p>
            <div class="brand-stats">
              <div class="bstat">
                <span class="bstat-num">24 / 7</span>
                <span class="bstat-lbl">System uptime</span>
              </div>
              <div class="bstat">
                <span class="bstat-num">Real-time</span>
                <span class="bstat-lbl">Status updates</span>
              </div>
              <div class="bstat">
                <span class="bstat-num">Secure</span>
                <span class="bstat-lbl">Data protection</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Login card -->
        <div class="form-panel">
          <div :class="['form-card', theme]">
            <!-- Mobile logo -->
            <div v-if="mobile" class="mobile-seal">
              <v-img src="/images/logo.png" width="60" height="60" />
            </div>
            <div class="form-header">
              <h2 class="form-heading">Welcome back</h2>
              <p class="form-sub">Sign in to your account to continue</p>
            </div>

            <LoginForm />

            <div class="or-divider">
              <span class="or-line" /><small class="or-text">or</small><span class="or-line" />
            </div>
            <div class="register-row">
              <span class="reg-prompt">Don't have an account?</span>
              <RouterLink to="/register" class="reg-link">Create one</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </v-main>

    <!-- ─── Footer ─── -->
    <v-footer app :class="['auth-footer', theme]">
      <div class="footer-row">
        <span class="footer-copy">© 2025 BCWD Complaint System</span>
        <div class="footer-contacts d-none d-md-flex">
          <span><v-icon size="13">mdi-map-marker</v-icon> Gov. Jose A. Rosales Ave., Butuan City</span>
          <span><v-icon size="13">mdi-phone</v-icon> (085) 817-6635</span>
          <span><v-icon size="13">mdi-email</v-icon> bcwdrecords@gmail.com</span>
        </div>
        <span class="footer-tz">Philippines (Asia/Manila)</span>
      </div>
    </v-footer>
  </v-app>
</template>

<style scoped>
/* ── Google Font ── */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

* { font-family: 'Plus Jakarta Sans', sans-serif; }

/* ── Rail ── */
.top-rail {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.top-rail.dark {
  background: #0c1624 !important;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.rail-inner {
  display: flex; align-items: center;
  width: 100%; padding: 0 24px; gap: 16px;
}
.rail-brand { display: flex; align-items: center; gap: 10px; }
.rail-logo { border-radius: 6px; }
.rail-title {
  font-size: 15px; font-weight: 700; color: #1e40af; letter-spacing: -0.3px;
}
.top-rail.dark .rail-title { color: #60a5fa; }
.rail-time {
  font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; letter-spacing: 0.2px;
}
.top-rail.dark .rail-time { color: #94a3b8; }
.rail-theme-btn {
  width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #475569; transition: all 0.2s;
}
.top-rail.dark .rail-theme-btn { border-color: rgba(255,255,255,0.12); color: #94a3b8; }
.rail-theme-btn:hover { background: #f1f5f9; color: #1e40af; }
.top-rail.dark .rail-theme-btn:hover { background: rgba(255,255,255,0.08); color: #60a5fa; }

/* ── Stage ── */
.auth-stage {
  min-height: 100vh;
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  padding: 32px 20px;
}
.auth-stage.light { background: #f0f6ff; }
.auth-stage.dark  { background: #060e1a; }

/* Geometric blobs */
.blob {
  position: absolute; border-radius: 50%;
  pointer-events: none; z-index: 0;
}
.blob-a {
  width: 520px; height: 520px;
  top: -180px; left: -140px;
  background: radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 70%);
}
.blob-b {
  width: 400px; height: 400px;
  bottom: -120px; right: -80px;
  background: radial-gradient(circle, rgba(14,165,233,0.11) 0%, transparent 70%);
}
.blob-c {
  width: 280px; height: 280px;
  top: 40%; left: 38%;
  background: radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%);
}
.auth-stage.dark .blob-a { background: radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%); }
.auth-stage.dark .blob-b { background: radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 70%); }

/* Stage center */
.stage-center {
  position: relative; z-index: 2;
  display: flex; align-items: stretch;
  width: 100%; max-width: 960px;
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
}

/* ── Brand panel ── */
.brand-panel {
  flex: 1.1;
  background: linear-gradient(145deg, #1d4ed8 0%, #1e3a8a 40%, #0f2560 100%);
  padding: 52px 44px;
  display: flex; align-items: center;
  position: relative; overflow: hidden;
}
.brand-panel::before {
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
.brand-inner { position: relative; z-index: 1; }
.brand-seal {
  width: 88px; height: 88px;
  background: rgba(255,255,255,0.12);
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 28px;
  backdrop-filter: blur(8px);
}
.brand-heading {
  font-size: 26px; font-weight: 800;
  color: #ffffff; line-height: 1.2;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}
.brand-sub {
  font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,0.65); text-transform: uppercase;
  letter-spacing: 1.5px; margin: 0 0 24px;
}
.brand-divider {
  width: 48px; height: 3px;
  background: rgba(255,255,255,0.35); border-radius: 2px;
  margin-bottom: 20px;
}
.brand-body {
  font-size: 14px; color: rgba(255,255,255,0.78);
  line-height: 1.7; margin: 0 0 32px;
  max-width: 360px;
}
.brand-stats {
  display: flex; gap: 20px;
}
.bstat {
  display: flex; flex-direction: column;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 12px; padding: 14px 18px;
  backdrop-filter: blur(6px);
}
.bstat-num {
  font-size: 15px; font-weight: 700; color: #fff;
}
.bstat-lbl {
  font-size: 11px; color: rgba(255,255,255,0.6);
  margin-top: 2px;
}

/* ── Form panel ── */
.form-panel {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  padding: 48px 40px;
}
.form-card {
  width: 100%; max-width: 400px;
}
.form-card.light { background: #ffffff; }
.form-card.dark  { background: #0f1e35; }

.mobile-seal {
  display: flex; justify-content: center;
  margin-bottom: 24px;
}
.form-header { margin-bottom: 28px; }
.form-heading {
  font-size: 24px; font-weight: 800;
  color: #0f172a; margin: 0 0 6px; letter-spacing: -0.5px;
}
.form-card.dark .form-heading { color: #f1f5f9; }
.form-sub {
  font-size: 14px; color: #64748b; margin: 0;
}
.form-card.dark .form-sub { color: #94a3b8; }

.or-divider {
  display: flex; align-items: center; gap: 12px;
  margin: 24px 0;
}
.or-line {
  flex: 1; height: 1px; background: #e2e8f0;
}
.form-card.dark .or-line { background: rgba(255,255,255,0.1); }
.or-text { font-size: 12px; color: #94a3b8; }

.register-row {
  text-align: center; font-size: 14px; color: #64748b;
}
.form-card.dark .register-row { color: #94a3b8; }
.reg-prompt { margin-right: 6px; }
.reg-link {
  color: #1d4ed8; font-weight: 700; text-decoration: none;
  transition: color 0.2s;
}
.reg-link:hover { color: #1e40af; }
.form-card.dark .reg-link { color: #60a5fa; }

/* ── Footer ── */
.auth-footer {
  background: #1e3a8a !important;
  color: white;
  font-size: 12px;
  min-height: 40px;
}
.auth-footer.dark { background: #070e1c !important; }
.footer-row {
  width: 100%; display: flex; align-items: center;
  justify-content: space-between; gap: 16px;
  padding: 0 20px;
}
.footer-copy { opacity: 0.8; font-weight: 500; }
.footer-contacts {
  display: flex; gap: 20px; opacity: 0.75;
}
.footer-contacts span { display: flex; align-items: center; gap: 5px; }
.footer-tz { opacity: 0.7; }

/* ── V-form field overrides ── */
:deep(.v-text-field .v-field) {
  border-radius: 10px !important;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
:deep(.v-btn.v-btn--block) {
  border-radius: 10px !important;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700 !important;
  letter-spacing: 0.2px;
  height: 48px !important;
  font-size: 15px !important;
  background: linear-gradient(135deg, #1d4ed8, #2563eb) !important;
  box-shadow: 0 4px 14px rgba(29,78,216,0.35) !important;
  transition: all 0.25s ease !important;
}
:deep(.v-btn.v-btn--block:hover) {
  transform: translateY(-1px) !important;
  box-shadow: 0 8px 20px rgba(29,78,216,0.4) !important;
}

/* Stage card bg for light/dark split view */
.auth-stage.light .stage-center { background: #ffffff; }
.auth-stage.dark  .stage-center { background: #0f1e35; }

@media (max-width: 960px) {
  .stage-center { max-width: 460px; flex-direction: column; }
  .form-panel { padding: 40px 32px; }
  .auth-stage { padding: 24px 16px; }
}
@media (max-width: 600px) {
  .form-panel { padding: 32px 20px; }
}
</style>