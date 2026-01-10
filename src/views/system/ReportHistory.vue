<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { supabase } from '@/utils/supabase'

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

// Logout function
async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}

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

// states
const reports = ref([])
const loading = ref(true)
const errorMessage = ref('')

// fetch user reports
onMounted(async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError) throw userError

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    reports.value = data
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
})

// 🟢 Status helpers
function normalizeStatus(status) {
  return status || 'pending'
}

function statusColor(status) {
  switch (status) {
    case 'ongoing':
      return 'info'
    case 'resolved':
      return 'success'
    case 'rejected':
      return 'error'
    default:
      return 'warning' // pending
  }
}

function statusLabel(status) {
  switch (status) {
    case 'ongoing':
      return 'Ongoing'
    case 'resolved':
      return 'Resolved'
    case 'rejected':
      return 'Rejected'
    default:
      return 'Pending'
  }
}

// 🧱 Pipe location label helper
function pipeLocationLabel(value) {
  const map = {
    mainline: 'Mainline',
    transition: 'Transition Line',
    distribution: 'Distribution Line',
    service: 'Service Line',
    unknown: 'Not sure',
  }

  return map[value] || 'Not specified'
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

    <!-- Main Content -->
    <v-main
      class="pa-2 pa-sm-4 pa-md-6"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <v-container class="px-3 px-sm-0">
        <v-row justify="center" class="w-100 mx-0">
          <v-col cols="12" md="8" lg="6" class="px-0 px-sm-3">
            <br /><br />
            <v-card
              class="pa-4 pa-sm-6 modern-card mx-auto"
              elevation="8"
              rounded="xl"
              max-width="900"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <!-- 🔹 Back button moved to top -->
              <div class="d-flex justify-space-between align-center mb-4">
                <h2 class="font-weight-bold" :class="mobile ? 'text-h6' : ''">My Report History</h2>
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-arrow-left"
                  @click="router.replace('/dashboard')"
                  :size="mobile ? 'small' : 'default'"
                >
                  Back
                </v-btn>
              </div>

              <p class="text-center text-medium-emphasis mb-6" :class="mobile ? 'text-body-2' : ''">
                View all the reports you've submitted.
              </p>

              <v-progress-circular
                v-if="loading"
                indeterminate
                color="primary"
                size="48"
                class="mx-auto my-8 d-block"
              ></v-progress-circular>

              <v-alert v-else-if="errorMessage" type="error" class="mb-4">
                {{ errorMessage }}
              </v-alert>

              <v-alert v-else-if="!reports.length" type="info" class="text-center">
                You haven't submitted any reports yet.
              </v-alert>

              <v-row v-else dense>
                <v-col v-for="report in reports" :key="report.id" cols="12" class="mb-3">
                  <v-card
                    elevation="3"
                    class="pa-4"
                    :color="theme === 'light' ? 'grey-lighten-5' : 'blue-grey-darken-2'"
                    rounded="lg"
                  >
                    <div class="d-flex justify-space-between align-center mb-1">
                      <h3 class="font-weight-bold" :class="mobile ? 'text-body-1' : ''">
                        {{ report.type }}
                      </h3>

                      <!-- 🏷️ STATUS CHIP -->
                      <v-chip
                        size="small"
                        label
                        class="text-uppercase font-weight-medium"
                        :color="statusColor(normalizeStatus(report.status))"
                      >
                        {{ statusLabel(normalizeStatus(report.status)) }}
                      </v-chip>
                    </div>

                    <p class="text-body-2 mb-1">Severity: {{ report.severity }}</p>

                    <p class="text-body-2 mb-1">
                      Pipe Location: {{ pipeLocationLabel(report.pipe_location) }}
                    </p>

                    <p class="text-body-2 mb-1">Landmark: {{ report.landmark || 'N/A' }}</p>

                    <p class="text-body-2 mb-2">Notes: {{ report.notes || 'N/A' }}</p>
                    <p class="text-caption text-medium-emphasis">
                      Submitted: {{ new Date(report.created_at).toLocaleString() }}
                    </p>

                    <v-row v-if="report.images" dense class="mt-3">
                      <v-col
                        v-for="(img, i) in report.images"
                        :key="i"
                        cols="6"
                        sm="4"
                        class="d-flex justify-center"
                      >
                        <v-img :src="img" height="100" width="100" contain class="rounded"></v-img>
                      </v-col>
                    </v-row>
                  </v-card>
                </v-col>
              </v-row>
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
    <v-footer
      v-if="!mobile"
      app
      class="py-2 footer-bar"
      height="auto"
      :color="theme === 'light' ? '#0f5088' : '#0b1116'"
    >
      <v-container class="pa-0">
        <v-row no-gutters align="center" class="footer-content px-2 px-sm-4">
          <!-- Copyright -->
          <div class="footer-section copyright d-flex align-center">
            <span class="text-caption font-weight-medium text-white"
              >&copy; 2025 BCWD Complaint System</span
            >
          </div>

          <v-spacer class="d-none d-md-flex" />

          <!-- Contact Info - Horizontal Layout -->
          <div class="footer-section contacts d-flex align-center justify-center flex-nowrap">
            <!-- Address -->
            <div class="contact-item d-flex align-center gap-1">
              <v-icon size="12" class="mr-1 text-white">mdi-map-marker</v-icon>
              <span class="text-caption text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <!-- Phone -->
            <div class="contact-item d-flex align-center gap-1">
              <v-icon size="12" class="mr-1 text-white">mdi-phone</v-icon>
              <span class="text-caption text-white">(085) 817-6635</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <!-- Mobile -->
            <div class="contact-item d-flex align-center gap-1">
              <v-icon size="12" class="mr-1 text-white">mdi-cellphone</v-icon>
              <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <!-- Email -->
            <div class="contact-item d-flex align-center gap-1">
              <v-icon size="12" class="mr-1 text-white">mdi-email</v-icon>
              <span class="text-caption text-white">bcwdrecords@gmail.com</span>
            </div>
          </div>

          <v-spacer class="d-none d-md-flex" />

          <!-- Time Zone -->
          <div class="footer-section timezone d-flex align-center justify-end">
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
.text-black {
  color: #000000;
}
.bg-grey-lighten-5 {
  background-color: #f5f5f5;
}
.bg-grey-darken-4 {
  background-color: #121212;
}

/* Footer background colors */
.bg-footer-light {
  background-color: #0f5088;
}
.bg-footer-dark {
  background-color: #0b1116;
}

/* header tweaks */
.header-bar {
  color: #fff;
}
.header-sub {
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
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
  gap: 0.5rem;
}

.contact-item,
.divider-item {
  transition: all 0.3s ease;
}

.divider-item {
  opacity: 0.3;
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

/* small styling for PH time */
.ph-time {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  white-space: nowrap;
}

/* Card styling */
.modern-card {
  transition: all 0.3s ease;
}
.modern-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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

  .ph-time {
    font-size: 0.6rem;
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
  .header-bar .font-weight-bold {
    font-size: 0.9rem !important;
  }

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

/* Ensure main content has enough space on mobile */
.v-main {
  min-height: calc(100vh - 64px) !important;
}

/* Ensure white text colors */
.text-white {
  color: white !important;
}

/* Remove any potential white gaps */
.v-application .v-main {
  padding-bottom: 0 !important;
}

.v-container {
  padding-bottom: 0 !important;
}

/* Add this to your style section */
.v-container {
  max-width: 100% !important;
}

.v-row {
  margin: 0 !important;
}

.v-col {
  padding: 0 !important;
}

@media (max-width: 599px) {
  .v-container {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
}
</style>
