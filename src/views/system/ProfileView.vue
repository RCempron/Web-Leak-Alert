<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { supabase } from '@/utils/supabase'
import AlertNotification from '@/components/common/AlertNotification.vue'

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

// Profile logic
const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const user = ref(null)

const email = ref('')
const firstname = ref('')
const lastname = ref('')
const age = ref('')
const residency = ref('')

const formSuccessMessage = ref('')
const formErrorMessage = ref('')

async function loadCurrentUser() {
  loading.value = true
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    user.value = data?.user ?? null

    email.value = user.value?.email || ''
    firstname.value = user.value?.user_metadata?.firstname || ''
    lastname.value = user.value?.user_metadata?.lastname || ''
    age.value = user.value?.user_metadata?.age || ''
    residency.value = user.value?.user_metadata?.residency || ''
  } catch (err) {
    console.error('Failed to load user', err)
    formErrorMessage.value = err?.message || String(err)
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!firstname.value || !lastname.value) {
    formErrorMessage.value = 'Please fill out all required fields.'
    return
  }

  saving.value = true
  formErrorMessage.value = ''
  formSuccessMessage.value = ''

  try {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        firstname: firstname.value,
        lastname: lastname.value,
        age: age.value,
        residency: residency.value,
      },
    })
    if (error) throw error

    user.value = data?.user ?? user.value
    formSuccessMessage.value = 'Profile updated successfully.'
    editing.value = false
  } catch (err) {
    console.error('Update failed', err)
    formErrorMessage.value = err?.message || String(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadCurrentUser)
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
      <v-container class="px-3 px-sm-3">
        <v-row justify="center" class="w-100 mx-0">
          <v-col cols="12" sm="10" md="8" lg="6" xl="5" class="px-0">
            <br /><br />
            <v-card
              class="pa-3 pa-sm-5 text-center modern-card mx-auto"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
              elevation="10"
              rounded="xl"
              max-width="700"
            >
              <!-- Avatar -->
              <v-avatar size="90" class="mb-4">
                <v-icon size="90" color="primary">mdi-account-circle</v-icon>
              </v-avatar>

              <h2 class="font-weight-bold mb-2" :class="mobile ? 'text-h6' : ''">My Profile</h2>
              <p class="text-medium-emphasis mb-6" :class="mobile ? 'text-body-2' : ''">
                View or edit your personal information
              </p>

              <AlertNotification
                :form-success-message="formSuccessMessage"
                :form-error-message="formErrorMessage"
              />

              <!-- Loader -->
              <v-skeleton-loader v-if="loading" type="heading, paragraph, paragraph" class="mb-4" />

              <!-- Profile Fields -->
              <div v-else>
                <v-text-field
                  v-model="email"
                  label="Email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  class="mb-3"
                  readonly
                />
                <v-text-field
                  v-model="firstname"
                  label="First Name"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  class="mb-3"
                  :readonly="!editing"
                />
                <v-text-field
                  v-model="lastname"
                  label="Last Name"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  class="mb-3"
                  :readonly="!editing"
                />
                <v-text-field
                  v-model="age"
                  label="Age"
                  prepend-inner-icon="mdi-calendar"
                  variant="outlined"
                  class="mb-3"
                  type="number"
                  :readonly="!editing"
                />
                <v-text-field
                  v-model="residency"
                  label="Residency"
                  prepend-inner-icon="mdi-home-city"
                  variant="outlined"
                  class="mb-4"
                  :readonly="!editing"
                />

                <!-- ✅ Fixed Responsive Buttons -->
                <div class="button-group d-flex flex-wrap justify-center align-center mt-6">
                  <v-btn
                    v-if="!editing"
                    color="primary"
                    size="large"
                    class="flex-btn"
                    @click="editing = true"
                  >
                    <v-icon start>mdi-account-edit</v-icon>
                    Edit Profile
                  </v-btn>

                  <v-btn
                    v-else
                    color="success"
                    size="large"
                    class="flex-btn"
                    :loading="saving"
                    @click="saveProfile"
                  >
                    <v-icon start>mdi-content-save</v-icon>
                    Save Changes
                  </v-btn>

                  <v-btn variant="outlined" size="large" @click="$router.replace('/dashboard')">
                    <v-icon start>mdi-arrow-left</v-icon> Back
                  </v-btn>

                  <v-btn
                    color="error"
                    variant="outlined"
                    size="large"
                    class="flex-btn"
                    @click="logout"
                  >
                    <v-icon start>mdi-logout</v-icon>
                    Logout
                  </v-btn>
                </div>
              </div>
            </v-card>
            <br /><br /><br />
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

/* ✅ Fix buttons to be fluid and wrap nicely */
.button-group {
  gap: 12px;
  width: 100%;
}
.flex-btn {
  flex: 1 1 200px; /* grows, shrinks, min width 200px */
  max-width: 240px;
  justify-content: center;
}
@media (max-width: 600px) {
  .flex-btn {
    flex: 1 1 100%;
    max-width: 100%;
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

@media (min-width: 600px) {
  .v-container {
    padding-left: 24px !important;
    padding-right: 24px !important;
  }
}
</style>
