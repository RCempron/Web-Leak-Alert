<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { supabase } from '@/utils/supabase'

const { mobile } = useDisplay()
const router = useRouter()

const vuetifyTheme = useTheme()
const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.global.name.value = theme.value

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.global.name.value = theme.value
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}

// Philippine live date/time
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

// ──────────────────────────────────────────────
// User reports state & loading
const reports = ref([])
const loading = ref(true)
const errorMessage = ref('')

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
    reports.value = data || []
  } catch (err) {
    errorMessage.value = err.message || 'Failed to load reports'
  } finally {
    loading.value = false
  }
})

// Status helpers
function normalizeStatus(status) {
  return status || 'pending'
}

function statusColor(status) {
  const map = {
    ongoing: 'info',
    resolved: 'success',
    rejected: 'error',
    pending: 'warning',
  }
  return map[status] || 'warning'
}

function statusLabel(status) {
  const map = {
    ongoing: 'Ongoing',
    resolved: 'Resolved',
    rejected: 'Rejected',
    pending: 'Pending',
  }
  return map[status] || 'Pending'
}

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
        <div>
          <div class="font-weight-bold" :class="mobile ? 'text-body-1' : 'text-h5'">
            BCWD Complaint System
          </div>
        </div>
      </div>

      <v-spacer />

      <div class="mr-2 mr-sm-4 text-caption ph-time" :class="{ 'd-none d-sm-flex': mobile }">
        {{ phTime }}
      </div>

      <v-btn icon variant="text" @click="toggleTheme" title="Toggle theme" size="small">
        <v-icon size="20">
          {{ theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
        </v-icon>
      </v-btn>

      <v-btn icon variant="text" @click="logout" title="Logout" size="small">
        <v-icon size="20">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main Content -->
    <v-main
      class="d-flex flex-column pa-0"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <!-- Content wrapper - grows and pushes footer down -->
      <div class="flex-grow-1 d-flex flex-column">
        <v-container class="px-4 py-8 flex-grow-1" fluid>
          <v-row justify="center" class="mt-6 mt-sm-10">
            <v-col cols="12" md="8" lg="6">
              <v-card
                class="pa-6 pa-sm-8 mb-12 mb-sm-16"
                elevation="10"
                rounded="xl"
                :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
              >
                <div class="d-flex justify-space-between align-center mb-6">
                  <h2 class="font-weight-bold" :class="mobile ? 'text-h6' : 'text-h5'">
                    My Report History
                  </h2>
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

                <p class="text-center text-medium-emphasis mb-8">
                  View all the reports you've submitted
                </p>

                <v-progress-circular
                  v-if="loading"
                  indeterminate
                  color="primary"
                  size="48"
                  class="mx-auto my-12 d-block"
                />

                <v-alert v-else-if="errorMessage" type="error" class="mb-8 text-center">
                  {{ errorMessage }}
                </v-alert>

                <v-alert v-else-if="!reports.length" type="info" class="text-center py-8">
                  You haven't submitted any reports yet.
                </v-alert>

                <v-row v-else dense class="mt-4">
                  <v-col v-for="report in reports" :key="report.id" cols="12">
                    <v-card
                      elevation="3"
                      class="pa-5 mb-6"
                      :color="theme === 'light' ? 'grey-lighten-4' : 'blue-grey-darken-2'"
                      rounded="lg"
                    >
                      <div class="d-flex justify-space-between align-center mb-3">
                        <h3 class="font-weight-bold text-body-1">
                          {{ report.type }}
                        </h3>

                        <v-chip
                          size="small"
                          label
                          class="text-uppercase font-weight-medium"
                          :color="statusColor(normalizeStatus(report.status))"
                        >
                          {{ statusLabel(normalizeStatus(report.status)) }}
                        </v-chip>
                      </div>

                      <p class="text-body-2 mb-2">Severity: {{ report.severity }}</p>
                      <p class="text-body-2 mb-2">
                        Pipe Location: {{ pipeLocationLabel(report.pipe_location) }}
                      </p>
                      <p class="text-body-2 mb-2">Landmark: {{ report.landmark || 'N/A' }}</p>
                      <p class="text-body-2 mb-3">Notes: {{ report.notes || 'N/A' }}</p>

                      <p class="text-caption text-medium-emphasis mb-4">
                        Submitted: {{ new Date(report.created_at).toLocaleString() }}
                      </p>

                      <v-row v-if="report.images?.length" dense>
                        <v-col v-for="(img, i) in report.images" :key="i" cols="6" sm="4" md="3">
                          <v-img :src="img" height="100" cover class="rounded" />
                        </v-col>
                      </v-row>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>

      <!-- Mobile Footer -->
      <div
        v-if="mobile"
        class="footer-mobile-fullwidth"
        :class="theme === 'light' ? 'bg-footer-light' : 'bg-footer-dark'"
      >
        <div class="footer-content-mobile text-center py-3 px-3">
          <div class="mb-2">
            <span class="text-caption font-weight-medium text-white">
              © 2025 BCWD Complaint System
            </span>
          </div>

          <div class="footer-contacts-mobile mb-2">
            <div class="contact-line mb-1">
              <v-icon size="13" class="mr-1 text-white">mdi-map-marker</v-icon>
              <span class="text-caption text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>
            <div class="contact-line mb-1">
              <v-icon size="13" class="mr-1 text-white">mdi-phone</v-icon>
              <span class="text-caption text-white">(085) 817-6635</span>
            </div>
            <div class="contact-line mb-1">
              <v-icon size="13" class="mr-1 text-white">mdi-cellphone</v-icon>
              <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
            </div>
            <div class="contact-line">
              <v-icon size="13" class="mr-1 text-white">mdi-email</v-icon>
              <span class="text-caption text-white">bcwdrecords@gmail.com</span>
            </div>
          </div>

          <small class="text-caption text-white"> Philippines (Asia/Manila) </small>
        </div>
      </div>
    </v-main>

    <!-- Desktop Footer -->
    <v-footer
      v-if="!mobile"
      app
      class="py-2 footer-bar"
      :color="theme === 'light' ? '#0f5088' : '#0b1116'"
    >
      <v-container class="pa-0">
        <v-row no-gutters align="center" class="footer-content px-2 px-sm-4">
          <div class="footer-section copyright d-flex align-center">
            <span class="text-caption font-weight-medium text-white">
              © 2025 BCWD Complaint System
            </span>
          </div>

          <v-spacer class="d-none d-md-flex" />

          <div class="footer-section contacts d-flex align-center justify-center flex-nowrap">
            <div class="contact-item d-flex align-center gap-1">
              <v-icon size="12" class="mr-1 text-white">mdi-map-marker</v-icon>
              <span class="text-caption text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <div class="contact-item d-flex align-center gap-1">
              <v-icon size="12" class="mr-1 text-white">mdi-phone</v-icon>
              <span class="text-caption text-white">(085) 817-6635</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <div class="contact-item d-flex align-center gap-1">
              <v-icon size="12" class="mr-1 text-white">mdi-cellphone</v-icon>
              <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
            </div>

            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />

            <div class="contact-item d-flex align-center gap-1">
              <v-icon size="12" class="mr-1 text-white">mdi-email</v-icon>
              <span class="text-caption text-white">bcwdrecords@gmail.com</span>
            </div>
          </div>

          <v-spacer class="d-none d-md-flex" />

          <div class="footer-section timezone d-flex align-center justify-end">
            <small class="text-caption font-weight-medium text-white">
              Philippines (Asia/Manila)
            </small>
          </div>
        </v-row>
      </v-container>
    </v-footer>
  </v-app>
</template>

<style scoped>
.header-bar {
  color: #fff;
}
.footer-bar {
  color: #fff;
}

.ph-time {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  white-space: nowrap;
}

.bg-footer-light {
  background-color: #0f5088;
}
.bg-footer-dark {
  background-color: #0b1116;
}

.modern-card {
  transition: all 0.3s ease;
}

.modern-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* Mobile full-width footer */
.footer-mobile-fullwidth {
  width: 100%;
  margin: 0;
}

.footer-content-mobile {
  color: white;
  padding: 8px 12px;
}

.footer-contacts-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.contact-line {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.25;
}

/* Core layout fixes - prevent content being cut */
.v-main {
  padding: 0 !important;
}

.v-container {
  padding-bottom: 0 !important;
}

.v-application .v-main__wrap {
  display: flex;
  flex-direction: column;
}
</style>
