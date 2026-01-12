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
    </v-app-bar>

    <v-main
      class="d-flex flex-column pa-0"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <v-container class="px-4 py-8 flex-grow-1" fluid>
        <!-- Top margin prevents cutting by header, bottom margin adds space under card -->
        <v-row justify="center" class="mt-8 mt-sm-12 mt-md-16 mb-8 mb-sm-12">
          <v-col cols="12" sm="8" md="5" lg="4">
            <v-card
              class="pa-8"
              elevation="10"
              rounded="xl"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <div class="text-center mb-6">
                <v-img
                  src="/images/LeakAlertLogo.png"
                  class="mx-auto mb-3"
                  :width="mobile ? 100 : 130"
                  contain
                />
                <h2 class="font-weight-bold text-h5 mb-2">Create an Account</h2>
                <p class="text-medium-emphasis">Register now to report leaks and services issues</p>
              </div>

              <RegisterForm />

              <div class="d-flex align-center my-5">
                <v-divider class="flex-grow-1" />
                <span class="mx-2 text-caption">or</span>
                <v-divider class="flex-grow-1" />
              </div>

              <div class="text-center">
                <span>Already have an account? </span>
                <RouterLink to="/login" class="font-weight-bold text-blue text-decoration-none">
                  Login here</RouterLink
                >
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!-- Mobile Footer – full width, no side/bottom gaps -->
      <div
        v-if="mobile"
        class="footer-mobile-fullwidth"
        :class="theme === 'light' ? 'bg-footer-light' : 'bg-footer-dark'"
      >
        <div class="footer-content-mobile text-center py-3 px-3">
          <div class="mb-3">
            <span class="text-caption font-weight-medium text-white"
              >&copy; 2025 BCWD Complaint System</span
            >
          </div>

          <div class="footer-contacts-mobile mb-3">
            <div class="contact-line mb-2">
              <v-icon size="14" class="mr-2 text-white">mdi-map-marker</v-icon>
              <span class="text-caption text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>
            <div class="contact-line mb-2">
              <v-icon size="14" class="mr-2 text-white">mdi-phone</v-icon>
              <span class="text-caption text-white">(085) 817-6635</span>
            </div>
            <div class="contact-line mb-2">
              <v-icon size="14" class="mr-2 text-white">mdi-cellphone</v-icon>
              <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
            </div>
            <div class="contact-line">
              <v-icon size="14" class="mr-2 text-white">mdi-email</v-icon>
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
    </v-main>

    <!-- Footer (Desktop only) -->
    <v-footer
      v-if="!mobile"
      app
      class="py-2 footer-bar"
      height="30"
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

/* footer tweaks */
.footer-bar {
  color: #fff;
}

/* Mobile full-width footer */
.footer-mobile-fullwidth {
  width: 100%;
  margin: 0;
  color: white;
}

/* Mobile footer content */
.footer-content-mobile {
  color: white;
}

.footer-contacts-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.contact-line {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.4;
}

/* small styling for PH time */
.ph-time {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  white-space: nowrap;
}

/* Remove unwanted paddings/margins that cause gaps */
.v-main {
  padding: 0 !important;
  margin: 0 !important;
}

.v-container {
  padding-bottom: 0 !important;
  margin-bottom: 0 !important;
}

.v-application .v-main__wrap {
  display: flex;
  flex-direction: column;
}

/* Ensure white text colors */
.text-white {
  color: white !important;
}
</style>
