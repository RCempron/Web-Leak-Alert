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
        <v-icon size="20">{{
          theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'
        }}</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main
      class="d-flex flex-column pa-0"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <!-- Main content area - centered vertically on mobile -->
      <div class="flex-grow-1 d-flex align-center justify-center">
        <v-container class="px-4 py-6" fluid>
          <v-row justify="center">
            <v-col cols="12" sm="8" md="5" lg="4">
              <v-card
                class="pa-8 mx-auto"
                max-width="420"
                elevation="10"
                rounded="xl"
                :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
              >
                <div class="text-center mb-6">
                  <v-img
                    src="/images/LeakAlertLogo.png"
                    class="mx-auto mb-4"
                    :width="mobile ? 90 : 120"
                    contain
                  />
                  <h2 class="font-weight-bold text-h5 mb-2">Welcome Back!</h2>
                  <p class="text-medium-emphasis">Login to continue to your account</p>
                </div>

                <LoginForm />

                <div class="d-flex align-center my-6">
                  <v-divider class="flex-grow-1" />
                  <span class="mx-3 text-caption">or</span>
                  <v-divider class="flex-grow-1" />
                </div>

                <div class="text-center">
                  <span>Don't have an account? </span>
                  <RouterLink
                    to="/register"
                    class="font-weight-bold text-blue text-decoration-none"
                  >
                    Register here
                  </RouterLink>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>

      <!-- Mobile Footer - extremely compact, mostly requires scrolling -->
      <div
        v-if="mobile"
        class="footer-mobile-fullwidth"
        :class="theme === 'light' ? 'bg-footer-light' : 'bg-footer-dark'"
      >
        <div class="footer-content-mobile text-center py-1 px-3">
          <div class="mb-1">
            <span class="text-caption font-weight-medium text-white">
              © 2025 BCWD Complaint System
            </span>
          </div>

          <div class="footer-contacts-mobile mb-1">
            <div class="contact-line mb-1">
              <v-icon size="11" class="mr-1 text-white">mdi-map-marker</v-icon>
              <span class="text-caption text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>
            <div class="contact-line mb-1">
              <v-icon size="11" class="mr-1 text-white">mdi-phone</v-icon>
              <span class="text-caption text-white">(085) 817-6635</span>
            </div>
            <div class="contact-line mb-1">
              <v-icon size="11" class="mr-1 text-white">mdi-cellphone</v-icon>
              <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
            </div>
            <div class="contact-line">
              <v-icon size="11" class="mr-1 text-white">mdi-email</v-icon>
              <span class="text-caption text-white">bcwdrecords@gmail.com</span>
            </div>
          </div>

          <small class="text-caption text-white opacity-80"> Philippines (Asia/Manila) </small>
        </div>
      </div>
    </v-main>

    <!-- Desktop Footer -->
    <v-footer
      v-if="!mobile"
      app
      class="py-2 footer-bar"
      height="30"
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
.text-blue {
  color: #1976d2;
}
.bg-grey-lighten-5 {
  background-color: #f5f5f5;
}
.bg-grey-darken-4 {
  background-color: #121212;
}

.bg-footer-light {
  background-color: #0f5088;
}
.bg-footer-dark {
  background-color: #0b1116;
}

.header-bar {
  color: #fff;
}
.footer-bar {
  color: #fff;
}

/* Mobile footer - intentionally very small height */
.footer-mobile-fullwidth {
  width: 100%;
  margin: 0;
  color: white;
  min-height: 64px; /* ← very small - most content hidden until scroll */
}

.footer-content-mobile {
  color: white;
  padding: 6px 12px;
  font-size: 0.72rem;
}

.footer-contacts-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  margin: 3px 0;
}

.contact-line {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  margin: 0;
}

/* Extra compact on very small screens */
@media (max-width: 380px) {
  .footer-mobile-fullwidth {
    min-height: 56px;
  }
  .footer-content-mobile {
    padding: 4px 8px;
  }
}

/* Layout fixes */
.v-main {
  padding: 0 !important;
  margin: 0 !important;
}

.v-container {
  padding-bottom: 0 !important;
}

.v-application .v-main__wrap {
  display: flex;
  flex-direction: column;
}

.text-white {
  color: white !important;
}

.ph-time {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  white-space: nowrap;
}
</style>
