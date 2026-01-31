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
    <!-- Glass Header -->
    <v-app-bar flat class="glass-header" :class="theme">
      <v-container class="d-flex align-center" fluid>
        <div class="title">BCWD Complaint System</div>

        <v-spacer />

        <div class="ph-time d-none d-sm-flex">{{ phTime }}</div>

        <v-btn icon variant="text" @click="toggleTheme">
          <v-icon>{{ theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>
      </v-container>
    </v-app-bar>

    <!-- Main -->
    <v-main class="auth-bg" :class="theme">
      <div class="auth-wrapper">
        <v-card class="mega-auth-card" elevation="16" rounded="xl">
          <div class="mega-grid">
            <!-- LEFT SIDE -->
            <div class="mega-left">
              <div class="mega-content">
                <v-img src="/images/logo.png" width="110" class="mb-4" />
                <h1>Create Account</h1>
                <p class="subtitle">Join BCWD Complaint System</p>
                <p class="desc">
                  Register to report leaks, track complaints, and receive real-time updates on water
                  services and system notifications.
                </p>

                <div class="mega-stats">
                  <div class="stat">
                    <strong>Fast</strong>
                    <span>Registration</span>
                  </div>
                  <div class="stat">
                    <strong>Secure</strong>
                    <span>Data Privacy</span>
                  </div>
                  <div class="stat">
                    <strong>Reliable</strong>
                    <span>System Access</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT SIDE -->
            <div class="mega-right">
              <!-- Logo shown only on mobile -->
              <v-img
                v-if="mobile"
                src="/images/logo.png"
                class="mobile-logo"
                max-width="140"
                contain
              />

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
    </v-main>

    <!-- Footer -->
    <v-footer app class="auth-footer" :class="theme">
      <div class="footer-inner">
        <div class="left">© 2025 BCWD Complaint System</div>
        <div class="center d-none d-md-flex">
          <span
            ><v-icon size="14">mdi-map-marker</v-icon> Gov. Jose A. Rosales Ave., Butuan City</span
          >
          <span><v-icon size="14">mdi-phone</v-icon> (085) 817-6635</span>
          <span><v-icon size="14">mdi-email</v-icon> bcwdrecords@gmail.com</span>
        </div>
        <div class="right">Philippines (Asia/Manila)</div>
      </div>
    </v-footer>
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
  min-height: calc(100vh - 64px - 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* MEGA CARD - Improved default width */
.mega-auth-card {
  width: 90%; /* Better for both desktop and mobile */
  max-width: 1200px;
  overflow: hidden;
  margin: 0 auto; /* Ensure centering */
}

/* GRID */
.mega-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
}

@media (max-width: 960px) {
  .mega-grid {
    grid-template-columns: 1fr;
  }

  /* Hide left branding side on mobile */
  .mega-left {
    display: none !important;
  }

  /* Right side (form) takes full space */
  .mega-right {
    padding: 40px 24px;
  }

  /* Optional: tighter padding on very small screens */
  @media (max-width: 600px) {
    .mega-right {
      padding: 32px 20px;
    }
  }
}

/* LEFT SIDE - SAME SYSTEM AS LOGIN */
.mega-left {
  position: relative;
  padding: 48px;
  display: flex;
  align-items: center;
  background: #e9f0f5;
  color: #0f5088;
  transition: 0.3s ease;
}

/* Dark mode */
.dark .mega-left {
  background: #0f1720;
  color: #e3f2fd;
}

.mega-content {
  max-width: 480px;
}

/* TEXT COLORS */
.mega-content h1 {
  color: #0d47a1;
}
.subtitle {
  color: #1565c0;
}
.desc {
  color: #455a64;
}

/* Dark text */
.dark .mega-content h1 {
  color: #e3f2fd;
}
.dark .subtitle {
  color: #90caf9;
}
.dark .desc {
  color: #b0bec5;
}

/* STATS */
.mega-stats {
  display: flex;
  gap: 16px;
  margin-top: 32px;
}
.stat {
  background: transparent;
  border: none;
  color: inherit;
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
/* Mobile-only logo */
.mobile-logo {
  display: block;
  margin: 0 auto 32px auto;
  width: 140px;
  height: auto;
}

/* Smaller on very small screens */
@media (max-width: 600px) {
  .mobile-logo {
    width: 120px;
  }
}

/* Adjust header spacing after mobile logo */
@media (max-width: 960px) {
  .login-header {
    margin-top: 8px;
  }
}
</style>
