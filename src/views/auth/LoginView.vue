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
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
      class="admin-header"
    >
      <!-- FULL-WIDTH depth system -->
      <div class="header-depth-layer"></div>
      <div class="header-inner px-2 px-sm-6">
        <v-toolbar-title class="font-weight-bold header-title"> BCWD Complaint System </v-toolbar-title>
        <v-spacer />
        <div class="d-flex align-center gap-3 header-right">
          <div
            class="text-caption text-white font-weight-medium ph-time"
            :class="{ 'd-none d-sm-block': mobile }"
          >
            {{ phTime }}
          </div>
        </div>
      </div>
    </v-app-bar>

    <!-- Main -->
    <v-main class="auth-bg" :class="theme">
      <div class="auth-wrapper">
        <v-card class="mega-auth-card" elevation="16" rounded="xl">
          <div class="mega-grid">
            <!-- Welcome + Branding Side (hidden on mobile) -->
            <div class="mega-left">
              <v-img src="/images/logo.png" class="mega-logo" />

              <div class="mega-overlay"></div>

              <div class="mega-content">
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
              <!-- Logo shown only on mobile -->
              <v-img
                v-if="mobile"
                src="/images/logo.png"
                class="mobile-logo"
                max-width="140"
                contain
              />

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
  min-height: calc(100vh - 64px - 40px); /* header + footer */
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

  /* Hide left side completely on mobile */
  .mega-left {
    display: none !important;
  }

  /* Right side takes full space */
  .mega-right {
    padding: 40px 24px;
  }

  /* Make card full-width on mobile */
  .mega-auth-card {
    width: 100% !important;
    max-width: none !important;
    margin: 0 16px;
  }

  /* Optional: smaller padding for very small screens */
  @media (max-width: 600px) {
    .mega-right {
      padding: 32px 20px;
    }
  }
}

/* LEFT SIDE - THEME AWARE */
.mega-left {
  position: relative;
  padding: 48px;
  display: flex;
  align-items: center;
  background: #e9f0f5; /* light mode */
  color: #0f5088;
  transition:
    background 0.3s ease,
    color 0.3s ease;
}

/* Dark mode left side */
.dark .mega-left {
  background: #0f1720; /* same family as right side */
  color: #e3f2fd;
}

.mega-overlay {
  display: none;
}

.mega-content {
  position: relative;
  z-index: 2;
  max-width: 480px;
  margin-top: 100px; /* Move content below the logo */
}

/* TEXT COLORS - LIGHT */
.mega-content h1 {
  color: #0d47a1;
}

.subtitle {
  color: #1565c0;
}

.desc {
  color: #455a64;
}

/* TEXT COLORS - DARK */
.dark .mega-content h1 {
  color: #e3f2fd;
}

.dark .subtitle {
  color: #90caf9;
}

.dark .desc {
  color: #b0bec5;
}

.mega-stats {
  display: flex;
  gap: 16px;
  margin-top: 32px;
}

/* STATS - LIGHT */
.stat {
  background: transparent;
  border: none;
  color: #0f5088;
}

/* STATS - DARK */
.dark .stat {
  color: #e3f2fd;
}

.dark .stat span {
  color: #b0bec5;
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

.mega-content h1 {
  color: #0d47a1;
}

.subtitle {
  color: #1565c0;
}

.desc {
  color: #455a64;
}

.logo-white {
  padding: 10px;
  border-radius: 14px;
  background: #f5f9ff;
  border: 1px solid #e3f2fd;
}

.mega-logo {
  position: absolute; /* Take it out of normal flow */
  top: 24px; /* Distance from top */
  left: 24px; /* Distance from left */
  width: 140px; /* Bigger logo */
  height: auto; /* Maintain aspect ratio */
  z-index: 3; /* Above overlay */
}

/* Mobile-only logo */
.mobile-logo {
  display: block;
  margin: 0 auto 32px auto;
  width: 140px;
  height: auto;
}

/* Optional: slightly smaller on very small screens */
@media (max-width: 600px) {
  .mobile-logo {
    width: 120px;
  }
}

/* Make sure the form header has proper spacing after mobile logo */
@media (max-width: 960px) {
  .login-header {
    margin-top: 8px;
  }
}

/* ============================= */
/* FULL-WIDTH HEADER DEPTH */
/* ============================= */
.admin-header {
  position: relative;
  padding: 0 !important; /* remove vuetify internal padding */
  overflow: hidden;
  z-index: 20;
  /* elevation */
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.25),
    0 6px 18px rgba(0, 0, 0, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
/* true full-width depth layer */
.header-depth-layer {
  position: absolute;
  inset: 0;
  width: 100vw; /* force viewport width */
  left: 50%;
  transform: translateX(-50%); /* center it */
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.14),
    rgba(255, 255, 255, 0.04),
    rgba(0, 0, 0, 0.22)
  );
  z-index: 0;
}
/* content wrapper */
.header-inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  width: 100%;
}
/* text depth */
.header-title {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  letter-spacing: 0.4px;
}
.header-right {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
/* dark mode tuning */
.v-theme--dark .admin-header {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.55),
    0 10px 28px rgba(0, 0, 0, 0.65);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
</style>
