<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import LoginForm from '@/components/auth/LoginForm.vue'

const { mobile } = useDisplay()
const vuetifyTheme = useTheme()

const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.global.name.value = theme.value

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.global.name.value = theme.value
}

watch(theme, (val) => (vuetifyTheme.global.name.value = val))

// -------- Philippine live date/time ----------
const phTime = ref('')
let timer = null

function updatePhTime() {
  const now = new Date()
  phTime.value = new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Manila',
  }).format(now)
}

onMounted(() => {
  updatePhTime()
  timer = setInterval(updatePhTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <v-app>
    <!-- Glass Header -->
    <v-app-bar flat class="glass-header" :class="theme">
      <div class="d-flex align-center gap-3">
        <v-img src="/images/LeakAlertLogo.png" width="36" contain />
        <div class="title">BCWD Complaint System</div>
      </div>

      <v-spacer />

      <div class="ph-time d-none d-sm-flex">{{ phTime }}</div>

      <v-btn icon variant="text" @click="toggleTheme">
        <v-icon>{{ theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main -->
    <v-main class="auth-bg" :class="theme">
      <div class="auth-wrapper">
        <v-card class="mega-auth-card" elevation="16" rounded="xl">
          <div class="mega-grid">
            <!-- Welcome + Branding Side -->
            <div class="mega-left">
              <div class="mega-overlay"></div>
              <div class="mega-content">
                <v-img src="/images/LeakAlertLogo.png" width="110" class="mb-4" />
                <h1>Welcome Back</h1>
                <p class="subtitle">BCWD Complaint System</p>
                <p class="desc">
                  A secure, reliable, and modern platform for reporting and tracking water-related
                  complaints and services in real-time.
                </p>

                <div class="mega-stats">
                  <div class="stat">
                    <strong>24/7</strong>
                    <span>System Access</span>
                  </div>
                  <div class="stat">
                    <strong>Real-time</strong>
                    <span>Status Updates</span>
                  </div>
                  <div class="stat">
                    <strong>Secure</strong>
                    <span>Data Protection</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Login Side -->
            <div class="mega-right">
              <div class="login-header">
                <h2>Sign in</h2>
                <p>Enter your credentials to continue</p>
              </div>

              <LoginForm />

              <div class="divider-wrap">
                <span></span>
                <small>or</small>
                <span></span>
              </div>

              <div class="register-link">
                <span>Don’t have an account?</span>
                <RouterLink to="/register">Create one</RouterLink>
              </div>
            </div>
          </div>
        </v-card>
      </div>

      <!-- Footer -->
      <v-footer class="auth-footer" :class="theme">
        <div class="footer-inner">
          <div class="left">© 2025 BCWD Complaint System</div>
          <div class="center d-none d-md-flex">
            <span
              ><v-icon size="14">mdi-map-marker</v-icon> Gov. Jose A. Rosales Ave., Butuan
              City</span
            >
            <span><v-icon size="14">mdi-phone</v-icon> (085) 817-6635</span>
            <span><v-icon size="14">mdi-email</v-icon> bcwdrecords@gmail.com</span>
          </div>
          <div class="right">Philippines (Asia/Manila)</div>
        </div>
      </v-footer>
    </v-main>
  </v-app>
</template>

<style scoped>
/* THEME BACKGROUND */
.auth-bg.light {
  background: linear-gradient(135deg, #e3f2fd, #f5f9ff);
}
.auth-bg.dark {
  background: radial-gradient(circle at top, #0f1720, #05080d);
}

/* HEADER */
.glass-header {
  backdrop-filter: blur(12px);
  background: rgba(20, 40, 80, 0.85);
  color: white;
}
.glass-header.dark {
  background: rgba(5, 10, 15, 0.85);
}
.title {
  font-weight: 700;
  letter-spacing: 0.5px;
}

.ph-time {
  font-size: 0.75rem;
  opacity: 0.9;
  margin-right: 12px;
}

/* WRAPPER */
.auth-wrapper {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-grid {
  width: 100%;
  max-width: 1100px;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  border-radius: 22px;
  overflow: hidden;
}

@media (max-width: 960px) {
  .auth-grid {
    grid-template-columns: 1fr;
  }
}

/* BRAND PANEL */
.brand-panel {
  position: relative;
  background: url('/images/water-bg.jpg') center/cover no-repeat;
  color: white;
  padding: 48px;
  display: flex;
  align-items: center;
}

.brand-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(21, 101, 192, 0.85), rgba(10, 40, 80, 0.85));
}

.brand-content {
  position: relative;
  z-index: 2;
}

.brand-content h1 {
  font-size: 2.4rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.brand-content p {
  opacity: 0.95;
  max-width: 420px;
}

.brand-stats {
  display: flex;
  gap: 16px;
  margin-top: 32px;
}

.stat-box {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(6px);
  padding: 14px 18px;
  border-radius: 14px;
  text-align: center;
}

.stat-box strong {
  display: block;
  font-size: 1.1rem;
}

.stat-box span {
  font-size: 0.7rem;
  opacity: 0.9;
}

/* FORM PANEL */
.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 36px 32px;
  border-radius: 22px;
}

.card-header {
  text-align: center;
  margin-bottom: 24px;
}

.card-header h2 {
  font-weight: 700;
  margin-top: 12px;
}

.card-header p {
  font-size: 0.85rem;
  opacity: 0.7;
}

.logo {
  margin: 0 auto;
}

/* DIVIDER */
.divider-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 22px 0;
}

.divider-wrap span {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #bbb, transparent);
}

.divider-wrap small {
  font-size: 0.7rem;
  opacity: 0.6;
}

/* REGISTER */
.register-link {
  text-align: center;
  font-size: 0.85rem;
}

.register-link a {
  margin-left: 6px;
  font-weight: 600;
  text-decoration: none;
  color: #1976d2;
}

/* MEGA CARD */
.mega-auth-card {
  width: 60%;
  max-width: 1200px;
  overflow: hidden;
}

.mega-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
}

@media (max-width: 960px) {
  .mega-grid {
    grid-template-columns: 1fr;
  }
}

/* LEFT SIDE */
.mega-left {
  position: relative;
  background: linear-gradient(135deg, #1565c0, #0f5088);
  color: white;
  padding: 48px;
  display: flex;
  align-items: center;
}

.mega-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(21, 101, 192, 0.9), rgba(15, 80, 136, 0.9));
}

.mega-content {
  position: relative;
  z-index: 2;
  max-width: 480px;
}

.mega-content h1 {
  font-size: 2.4rem;
  font-weight: 800;
  margin-bottom: 6px;
}

.subtitle {
  font-weight: 600;
  opacity: 0.95;
}

.desc {
  margin-top: 12px;
  opacity: 0.9;
  line-height: 1.5;
}

.mega-stats {
  display: flex;
  gap: 16px;
  margin-top: 32px;
}

.stat {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(6px);
  padding: 14px 18px;
  border-radius: 14px;
  text-align: center;
}

.stat strong {
  display: block;
  font-size: 1.1rem;
}
.stat span {
  font-size: 0.7rem;
  opacity: 0.9;
}

/* RIGHT SIDE */
.mega-right {
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}
.login-header h2 {
  font-weight: 700;
}
.login-header p {
  font-size: 0.85rem;
  opacity: 0.7;
}

/* HEADER COLORS */
.glass-header {
  backdrop-filter: blur(12px);
  background: #1565c0;
  color: white;
}
.glass-header.dark {
  background: #0f1720;
}

/* FOOTER */
.auth-footer {
  background: #0f5088;
  color: white;
  font-size: 0.7rem;
}

.auth-footer.dark {
  background: #0b1116;
}

.footer-inner {
  width: 100%;
  max-width: 1200px;
  margin: auto;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.footer-inner .center span {
  margin: 0 10px;
  white-space: nowrap;
}
</style>
