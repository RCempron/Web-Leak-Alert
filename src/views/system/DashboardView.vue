<!-- src/views/system/DashboardView.vue -->
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase.js'

const { mobile } = useDisplay()
const router = useRouter()

// Vuetify theme helper
const vuetifyTheme = useTheme()

// Persistent theme (read from localStorage)
const theme = ref(localStorage.getItem('theme') ?? 'light')

// Apply initial theme to Vuetify (use change to avoid deprecated assignment warnings)
vuetifyTheme.change(theme.value)

// toggle theme (and persist)
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.change(theme.value)
}

// keep Vuetify in sync if theme is changed elsewhere
watch(theme, (val) => {
  vuetifyTheme.change(val)
})

// Logout function
async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}

// Dashboard cards (report icon color changed to red)
const cards = [
  { title: 'Report a Leak', icon: 'mdi-water-alert', color: 'red', route: '/report' },
  {
    title: 'My Reports',
    icon: 'mdi-format-list-bulleted',
    color: 'green',
    route: '/my-reports',
    notify: true,
  },
  { title: 'Profile', icon: 'mdi-account-circle', color: 'deep-purple', route: '/profile' },
]

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

// 🔔 REPORT STATUS INDICATOR
const hasUpdatedReport = ref(false)

async function checkUpdatedReports() {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return

  const lastVisit = localStorage.getItem('lastMyReportsVisit')

  const { data } = await supabase
    .from('reports')
    .select('status, updated_at')
    .eq('user_id', userData.user.id)

  if (!lastVisit) {
    hasUpdatedReport.value = false
    return
  }

  hasUpdatedReport.value = (data || []).some(
    (r) => r.status !== 'pending' && r.updated_at && new Date(r.updated_at) > new Date(lastVisit),
  )
}

onMounted(checkUpdatedReports)

function handleCardClick(card) {
  if (card.route === '/my-reports') {
    localStorage.setItem('lastMyReportsVisit', new Date().toISOString())
    hasUpdatedReport.value = false
  }

  router.push(card.route)
}
</script>

<template>
  <v-app :theme="theme">
    <!-- Header -->
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
      class="px-2 px-sm-4 header-bar"
    >
      <div class="d-flex align-center gap-2 gap-sm-4">
        <!-- <v-img src="/images/LeakAlertLogo.png" width="40" height="40" alt="logo" /> -->
        <div>
          <div class="font-weight-bold" :class="mobile ? 'text-body-1' : 'text-h5'">
            BCWD Complaint System
          </div>
        </div>
      </div>

      <v-spacer />

      <!-- Live PH time - Hidden on small mobile -->
      <div class="mr-2 mr-sm-4 text-caption ph-time" :class="{ 'd-none d-sm-flex': mobile }">
        {{ phTime }}
      </div>

      <!-- Theme toggle -->
      <v-btn icon variant="text" @click="toggleTheme" :title="'Toggle theme'" size="small">
        <v-icon size="20">{{
          theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'
        }}</v-icon>
      </v-btn>

      <!-- Logout -->
      <v-btn icon variant="text" color="white" @click="logout" :title="'Logout'" size="small">
        <v-icon size="20">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main -->
    <v-main
      class="pa-2 pa-sm-4 pa-md-6"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <v-container class="px-0">
        <!-- Welcome Section with more top padding on mobile -->
        <v-row justify="center" class="text-center mb-4 mb-sm-6 pt-4 pt-sm-0">
          <v-col cols="12" class="px-3">
            <br />
            <br />
            <br />
            <h2 class="font-weight-bold mb-2" :class="mobile ? 'text-h5' : 'text-h4'">
              Welcome to BCWD Complaint System
            </h2>
            <p class="text-medium-emphasis mb-0" :class="mobile ? 'text-body-2' : ''">
              Report a leak quickly, track status, and manage your account.
            </p>
          </v-col>
        </v-row>

        <!-- Cards - Made bigger on mobile -->
        <v-row class="d-flex justify-center align-center text-center mb-8" justify="center">
          <v-col
            v-for="(card, index) in cards"
            :key="index"
            cols="12"
            sm="6"
            md="4"
            class="d-flex justify-center px-3 py-2"
          >
            <v-card
              class="pa-4 pa-sm-6 hover-scale dashboard-card position-relative"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
              elevation="6"
              rounded="xl"
              @click="handleCardClick(card)"
            >
              <!-- 🔔 STATUS UPDATED BANNER -->
              <div v-if="card.notify && hasUpdatedReport" class="status-banner">STATUS UPDATED</div>

              <v-icon :color="card.color" :size="mobile ? 72 : 64" class="mb-3 mb-sm-4">{{
                card.icon
              }}</v-icon>
              <h3 class="font-weight-bold mb-2" :class="mobile ? 'text-h6' : ''">
                {{ card.title }}
              </h3>
              <v-btn :color="card.color" variant="tonal" :size="mobile ? 'small' : 'small'"
                >Open</v-btn
              >
            </v-card>
          </v-col>
        </v-row>
      </v-container>
      <!-- Footer Content Inside Main (for mobile) - Outside container -->
      <v-row v-if="mobile" class="mt-8 mx-0">
        <v-col cols="12" class="px-0">
          <div
            class="footer-mobile-content"
            :class="theme === 'light' ? 'bg-footer-light' : 'bg-footer-dark'"
          >
            <div class="footer-content-mobile text-center py-4">
              <div class="mb-3">
                <span class="text-caption font-weight-medium text-white"
                  >&copy; 2025 BCWD Complaint System</span
                >
              </div>

              <div class="footer-contacts-mobile mb-3">
                <div class="contact-line mb-1">
                  <v-icon size="12" class="mr-1 text-white">mdi-map-marker</v-icon>
                  <span class="text-caption text-white"
                    >Gov. Jose A. Rosales Ave., Butuan City</span
                  >
                </div>
                <div class="contact-line mb-1">
                  <v-icon size="12" class="mr-1 text-white">mdi-phone</v-icon>
                  <span class="text-caption text-white">(085) 817-6635</span>
                </div>
                <div class="contact-line mb-1">
                  <v-icon size="12" class="mr-1 text-white">mdi-cellphone</v-icon>
                  <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
                </div>
                <div class="contact-line mb-1">
                  <v-icon size="12" class="mr-1 text-white">mdi-email</v-icon>
                  <span class="text-caption text-white">bcwdrecords@gmail.com</span>
                </div>
              </div>

              <div>
                <small class="text-caption font-weight-medium text-white"
                  >Philippines (Asia/Manila)</small
                >
              </div>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-main>
    <!-- Footer (Desktop only) -->
    <!-- Footer (Desktop only) -->
    <v-footer
      v-if="!mobile"
      app
      class="py-2 footer-bar"
      height="auto"
      :color="theme === 'light' ? '#0f5088' : '#0b1116'"
    >
      <v-container class="pa-0">
        <v-row no-gutters align="center" class="footer-content px-2 px-sm-4 justify-space-between">
          <!-- Copyright - Left -->
          <div class="footer-section copyright d-flex align-center">
            <span class="text-caption font-weight-medium text-white"
              >&copy; 2025 BCWD Complaint System</span
            >
          </div>

          <!-- Contact Info - Center -->
          <div
            class="footer-section contacts d-flex align-center justify-center flex-nowrap flex-grow-1 mx-4"
          >
            <!-- Address -->
            <div class="contact-item d-flex align-center gap-1 mx-1 mx-sm-2">
              <v-icon size="12" class="mr-1 text-white">mdi-map-marker</v-icon>
              <span class="text-caption text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <!-- Phone -->
            <div class="contact-item d-flex align-center gap-1 mx-1 mx-sm-2">
              <v-icon size="12" class="mr-1 text-white">mdi-phone</v-icon>
              <span class="text-caption text-white">(085) 817-6635</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <!-- Mobile -->
            <div class="contact-item d-flex align-center gap-1 mx-1 mx-sm-2">
              <v-icon size="12" class="mr-1 text-white">mdi-cellphone</v-icon>
              <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <!-- Email -->
            <div class="contact-item d-flex align-center gap-1 mx-1 mx-sm-2">
              <v-icon size="12" class="mr-1 text-white">mdi-email</v-icon>
              <span class="text-caption text-white">bcwdrecords@gmail.com</span>
            </div>
          </div>

          <!-- Time Zone - Right -->
          <div class="footer-section timezone d-flex align-center">
            <small class="text-caption font-weight-medium text-white"
              >Philippines (Asia/Manila)</small
            >
          </div>
        </v-row>
      </v-container>
    </v-footer>
  </v-app>
</template>

<style scoped>
.text-blue {
  color: #1976d2;
}
.bg-grey-lighten-5 {
  background-color: #f5f5f5;
}
.bg-grey-darken-4 {
  background-color: #121212;
}

/* header tweaks */
.header-bar {
  color: #fff;
}
.header-sub {
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
}

/* hover and card sizing */
.hover-scale {
  transition: all 0.25s ease;
  cursor: pointer;
}
.hover-scale:hover {
  transform: scale(1.04);
}

/* Consistent dashboard card size - Made bigger on mobile */
.dashboard-card {
  width: 100%;
  max-width: 320px;
  height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* small styling for PH time */
.ph-time {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  white-space: nowrap;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  /* Make cards bigger on mobile */
  .dashboard-card {
    height: 260px;
    max-width: 320px;
  }
}

@media (max-width: 599px) {
  /* Even bigger cards on smaller screens */
  .dashboard-card {
    height: 240px;
    max-width: 100%;
  }

  .ph-time {
    font-size: 0.6rem;
  }
}

@media (max-width: 420px) {
  .dashboard-card {
    height: 220px;
    min-height: 220px;
    padding-top: 28px;
    padding-bottom: 28px;
  }
}

/* Very small screens */
@media (max-width: 360px) {
  .header-bar .font-weight-bold {
    font-size: 0.9rem !important;
  }

  .dashboard-card {
    height: 200px;
    min-height: 200px;
    padding: 20px;
  }
}

/* Ensure main content has enough space on mobile */
.v-main {
  min-height: calc(100vh - 64px) !important;
}

/* Remove any potential white gaps */
.v-application .v-main {
  padding-bottom: 0 !important;
}

.v-container {
  padding-bottom: 0 !important;
}

/* Footer background colors */
.bg-footer-light {
  background-color: #0f5088;
}
.bg-footer-dark {
  background-color: #0b1116;
}

/* footer tweaks */
.footer-bar {
  color: #fff;
}
.footer-links a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 0.875rem;
}

/* Footer responsive styles */
.footer-content {
  flex-wrap: nowrap;
  min-height: 52px;
}

.footer-section .text-caption {
  font-size: 0.75rem;
  white-space: nowrap;
}

.contacts {
  gap: 0;
}

.contact-item,
.divider-item {
  transition: all 0.3s ease;
}

.divider-item {
  opacity: 0.3;
}

/* Ensure consistent spacing on all screen sizes */
@media (max-width: 1279px) {
  .footer-section .text-caption {
    font-size: 0.7rem;
  }
}

@media (max-width: 959px) {
  .footer-content {
    flex-wrap: wrap !important;
    justify-content: center !important;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .contacts {
    order: 1;
    flex: 1 1 100%;
    justify-content: center;
    margin: 0.5rem 0;
  }

  .copyright {
    order: 2;
  }

  .timezone {
    order: 3;
  }
}

@media (max-width: 767px) {
  .contacts {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .contact-item {
    flex: 1 1 calc(50% - 1rem);
    justify-content: center;
    min-width: 140px;
  }

  .divider-item {
    display: none;
  }
}

/* Mobile footer inside main */
.footer-mobile-content {
  width: 100%;
}

.footer-content-mobile {
  color: white;
}

.footer-contacts-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.contact-line {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Ensure white text colors */
.text-white {
  color: white !important;
}

/* Mobile responsiveness */
@media (max-width: 1279px) {
  .footer-section .text-caption {
    font-size: 0.7rem;
  }
}

@media (max-width: 959px) {
  .footer-content {
    flex-wrap: wrap !important;
    justify-content: center !important;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .footer-section {
    justify-content: center !important;
    flex: 1 1 100%;
  }

  .contacts {
    order: 1;
    gap: 0.75rem;
  }

  .copyright {
    order: 2;
  }

  .timezone {
    order: 3;
  }

  .footer-section .text-caption {
    font-size: 0.65rem;
  }

  .contact-item .v-icon {
    margin-right: 2px !important;
  }
}

@media (max-width: 767px) {
  .contacts {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .contact-item {
    flex: 1 1 calc(50% - 1rem);
    justify-content: center;
    min-width: 140px;
  }

  .divider-item {
    display: none;
  }

  .footer-section .text-caption {
    font-size: 0.6rem;
  }

  .footer-content-mobile .text-caption {
    font-size: 0.75rem;
  }
}

@media (max-width: 599px) {
  .footer-content-mobile .text-caption {
    font-size: 0.7rem;
  }

  .contact-line .text-caption {
    font-size: 0.65rem;
  }
}

@media (max-width: 420px) {
  .footer-content {
    gap: 0.25rem;
  }

  .footer-section .text-caption {
    font-size: 0.5rem;
  }

  .footer-content-mobile .text-caption {
    font-size: 0.65rem;
  }

  .contact-line .text-caption {
    font-size: 0.6rem;
  }

  .contact-item .v-icon {
    font-size: 10px !important;
  }
}

/* Very small screens */
@media (max-width: 360px) {
  .footer-bar {
    min-height: 48px;
  }

  .footer-content-mobile .text-caption {
    font-size: 0.6rem;
  }

  .contact-line .text-caption {
    font-size: 0.55rem;
  }
}

/* 🔔 Status update banner */
.status-banner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(90deg, #ff9800, #ffc107);
  color: #fff;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 6px 0;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  letter-spacing: 1px;
}

/* Slide-down animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.35s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-enter-to {
  transform: translateY(0);
  opacity: 1;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
