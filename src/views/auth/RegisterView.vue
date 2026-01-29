<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import RegisterForm from '@/components/auth/RegisterForm.vue'

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
    <!-- Header -->
    <v-app-bar flat density="comfortable" class="glass-header" :class="theme">
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

    <v-main class="auth-bg" :class="theme">
      <div class="auth-wrapper">
        <!-- MEGA CARD -->
        <v-card class="mega-auth-card" elevation="16" rounded="xl">
          <div class="mega-grid">
            <!-- LEFT SIDE (WELCOME) -->
            <div class="mega-left">
              <div class="mega-overlay"></div>
              <div class="mega-content">
                <v-img src="/images/LeakAlertLogo.png" width="110" class="mb-4" />
                <h1>Join BCWD</h1>
                <p class="subtitle">Create your account</p>
                <p class="desc">
                  Register to report leaks, track complaints, and access real-time updates and
                  services from BCWD.
                </p>

                <div class="mega-stats">
                  <div class="stat">
                    <strong>Fast</strong>
                    <span>Registration</span>
                  </div>
                  <div class="stat">
                    <strong>Secure</strong>
                    <span>User Data</span>
                  </div>
                  <div class="stat">
                    <strong>Verified</strong>
                    <span>Reports</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT SIDE (FORM) -->
            <div class="mega-right">
              <div class="login-header">
                <h2>Create Account</h2>
                <p>Fill in the details to get started</p>
              </div>

              <RegisterForm />

              <div class="divider-wrap">
                <span></span>
                <small>or</small>
                <span></span>
              </div>

              <div class="register-link">
                <span>Already have an account?</span>
                <RouterLink to="/login">Sign in</RouterLink>
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
/* BACKGROUND */
.auth-bg.light {
  background: linear-gradient(135deg, #e3f2fd, #f5f9ff);
}
.auth-bg.dark {
  background: radial-gradient(circle at top, #0f1720, #05080d);
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

/* MEGA CARD */
.mega-auth-card {
  width: 50%;
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

/* LEFT */
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

/* RIGHT */
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

/* REGISTER LINK */
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
