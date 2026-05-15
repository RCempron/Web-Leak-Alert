<!-- src/views/auth/RegisterView.vue — BCWD Redesign 2025 -->
<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import RegisterForm from '@/components/auth/RegisterForm.vue'

const { mobile } = useDisplay()
const vuetifyTheme = useTheme()

const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.global.name.value = theme.value

const themeIcon = computed(() => (theme.value === 'light' ? 'mdi-weather-night' : 'mdi-white-balance-sunny'))
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
    <v-app-bar flat height="56" :class="['top-rail', theme]">
      <div class="rail-inner">
        <div class="rail-brand">
          <v-img src="/images/logo.png" width="28" height="28" class="rail-logo" />
          <span class="rail-title">BCWD Complaint System</span>
        </div>
        <v-spacer />
        <span class="rail-time" :class="{ 'd-none': mobile }">{{ phTime }}</span>
        <button class="rail-theme-btn" @click="toggleTheme">
          <v-icon size="18">{{ themeIcon }}</v-icon>
        </button>
      </div>
    </v-app-bar>

    <v-main :class="['auth-stage', theme]">
      <div class="blob blob-a" />
      <div class="blob blob-b" />

      <div class="stage-center">
        <!-- Brand panel -->
        <div v-if="!mobile" class="brand-panel">
          <div class="brand-inner">
            <h1 class="brand-heading">Join BCWD Portal</h1>
            <p class="brand-sub">Create your account</p>
            <div class="brand-divider" />
            <p class="brand-body">
              Register to report water leaks, low pressure, contamination, and other
              service concerns. Your reports go directly to maintenance teams for fast
              resolution.
            </p>
            <div class="feature-list">
              <div class="feat-item" v-for="feat in features" :key="feat.icon">
                <div class="feat-icon"><v-icon size="18" color="white">{{ feat.icon }}</v-icon></div>
                <span class="feat-text">{{ feat.text }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Form panel -->
        <div class="form-panel">
          <div :class="['form-card', theme]">
            <div v-if="mobile" class="mobile-seal">
              <v-img src="/images/logo.png" width="60" height="60" />
            </div>
            <div class="form-header">
              <h2 class="form-heading">Create account</h2>
              <p class="form-sub">Fill in your details to get started</p>
            </div>

            <RegisterForm />

            <div class="or-divider">
              <span class="or-line" /><small class="or-text">or</small><span class="or-line" />
            </div>
            <div class="register-row">
              <span class="reg-prompt">Already have an account?</span>
              <RouterLink to="/login" class="reg-link">Sign in</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </v-main>

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

<script>
export default {
  data() {
    return {
      features: [
        { icon: 'mdi-send-check', text: 'Submit reports instantly' },
        { icon: 'mdi-bell-ring-outline', text: 'Real-time status notifications' },
        { icon: 'mdi-map-marker-check', text: 'GPS location pinning' },
        { icon: 'mdi-shield-lock-outline', text: 'Secure & private data' },
      ],
    }
  },
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
* { font-family: 'Plus Jakarta Sans', sans-serif; }

.top-rail { background: #ffffff !important; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.top-rail.dark { background: #0c1624 !important; border-bottom: 1px solid rgba(255,255,255,0.08); }
.rail-inner { display: flex; align-items: center; width: 100%; padding: 0 24px; gap: 16px; }
.rail-brand { display: flex; align-items: center; gap: 10px; }
.rail-logo { border-radius: 6px; }
.rail-title { font-size: 15px; font-weight: 700; color: #1e40af; letter-spacing: -0.3px; }
.top-rail.dark .rail-title { color: #60a5fa; }
.rail-time { font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; }
.top-rail.dark .rail-time { color: #94a3b8; }
.rail-theme-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e2e8f0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; transition: all 0.2s; }
.top-rail.dark .rail-theme-btn { border-color: rgba(255,255,255,0.12); color: #94a3b8; }
.rail-theme-btn:hover { background: #f1f5f9; color: #1e40af; }

/* CHANGED: overflow: hidden → overflow-y: auto so page can scroll if needed */
.auth-stage { min-height: 100vh; position: relative; overflow-y: auto; display: flex; align-items: center; justify-content: center; padding: 16px 20px; }
.auth-stage.light { background: #f0f6ff; }
.auth-stage.dark  { background: #060e1a; }
.blob { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }
.blob-a { width: 520px; height: 520px; top: -180px; left: -140px; background: radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 70%); }
.blob-b { width: 400px; height: 400px; bottom: -120px; right: -80px; background: radial-gradient(circle, rgba(14,165,233,0.11) 0%, transparent 70%); }
.auth-stage.dark .blob-a { background: radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%); }

/* CHANGED: added max-height so card never exceeds viewport, overflow-y: auto for internal scroll */
.stage-center { position: relative; z-index: 2; display: flex; align-items: stretch; width: 100%; max-width: 960px; max-height: calc(100vh - 80px); overflow-y: auto; border-radius: 20px; box-shadow: 0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06); }
.auth-stage.light .stage-center { background: #ffffff; }
.auth-stage.dark  .stage-center { background: #0f1e35; }

/* CHANGED: padding 52px → 32px top/bottom */
.brand-panel { flex: 1.1; background: linear-gradient(145deg, #1d4ed8 0%, #1e3a8a 40%, #0f2560 100%); padding: 24px 44px; display: flex; align-items: center; position: relative; overflow: hidden; }
.brand-panel::before { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
.brand-inner { position: relative; z-index: 1; }
.brand-seal { width: 88px; height: 88px; background: rgba(255,255,255,0.12); border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 28px; backdrop-filter: blur(8px); }
.brand-heading { font-size: 21px; font-weight: 800; color: #ffffff; line-height: 1.2; margin: 0 0 6px; letter-spacing: -0.5px; }
.brand-sub { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 14px; }
.brand-divider { width: 40px; height: 2px; background: rgba(255,255,255,0.35); border-radius: 2px; margin-bottom: 12px; }
.brand-body { font-size: 13px; color: rgba(255,255,255,0.78); line-height: 1.6; margin: 0 0 16px; max-width: 360px; }
.feature-list { display: flex; flex-direction: column; gap: 8px; }
.feat-item { display: flex; align-items: center; gap: 10px; }
.feat-icon { width: 28px; height: 28px; background: rgba(255,255,255,0.15); border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.feat-text { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500; }

/* CHANGED: padding 40px → 24px top/bottom */
.form-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px 36px; }
.form-card { width: 100%; max-width: 400px; }
.form-card.light { background: #ffffff; }
.form-card.dark  { background: #0f1e35; }
.mobile-seal { display: flex; justify-content: center; margin-bottom: 24px; }
/* CHANGED: margin-bottom 24px → 16px */
.form-header { margin-bottom: 10px; }
.form-heading { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.5px; }
.form-card.dark .form-heading { color: #f1f5f9; }
.form-sub { font-size: 13px; color: #64748b; margin: 0; }
.form-card.dark .form-sub { color: #94a3b8; }

/* CHANGED: margin 20px → 12px */
.or-divider { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
.or-line { flex: 1; height: 1px; background: #e2e8f0; }
.form-card.dark .or-line { background: rgba(255,255,255,0.1); }
.or-text { font-size: 12px; color: #94a3b8; }
.register-row { text-align: center; font-size: 14px; color: #64748b; }
.form-card.dark .register-row { color: #94a3b8; }
.reg-prompt { margin-right: 6px; }
.reg-link { color: #1d4ed8; font-weight: 700; text-decoration: none; }
.reg-link:hover { color: #1e40af; }
.form-card.dark .reg-link { color: #60a5fa; }

.auth-footer { background: #1e3a8a !important; color: white; font-size: 12px; min-height: 40px; }
.auth-footer.dark { background: #070e1c !important; }
.footer-row { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 20px; }
.footer-copy { opacity: 0.8; font-weight: 500; }
.footer-contacts { display: flex; gap: 20px; opacity: 0.75; }
.footer-contacts span { display: flex; align-items: center; gap: 5px; }
.footer-tz { opacity: 0.7; }

:deep(.v-text-field .v-field) { border-radius: 10px !important; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px !important; }
:deep(.v-field__input) { min-height: 40px !important; padding-top: 8px !important; padding-bottom: 8px !important; font-size: 13px !important; }
:deep(.v-label) { font-size: 13px !important; }
:deep(.v-btn.v-btn--block) { border-radius: 10px !important; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700 !important; height: 40px !important; font-size: 14px !important; background: linear-gradient(135deg, #1d4ed8, #2563eb) !important; box-shadow: 0 4px 14px rgba(29,78,216,0.35) !important; transition: all 0.25s ease !important; }
:deep(.v-btn.v-btn--block:hover) { transform: translateY(-1px) !important; box-shadow: 0 8px 20px rgba(29,78,216,0.4) !important; }

/* CHANGED: tightened form-panel padding, added max-height + overflow on stage-center for mobile */
@media (max-width: 960px) { .stage-center { max-width: 460px; flex-direction: column; max-height: calc(100vh - 80px); overflow-y: auto; } .form-panel { padding: 16px 28px; } }
@media (max-width: 600px) { .form-panel { padding: 20px; } }
</style>