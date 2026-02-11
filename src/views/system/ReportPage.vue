<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
// Report form logic
const refVForm = ref(null)
const reportTypes = [
  'Broken Pipe',
  'Low Pressure',
  'Contamination',
  'Water Leak',
  'No Water',
  'Other',
]
const severities = ['Low', 'Medium', 'High', 'Critical']
const type = ref('')
const severity = ref('')
const landmark = ref('')
const notes = ref('')
const files = ref([])
const previews = ref([])
const latitude = ref(null)
const longitude = ref(null)
const fetchingLocation = ref(false)
const formAction = ref({
  formProcess: false,
  formErrorMessage: '',
  formSuccessMessage: '',
})
const canSubmit = computed(
  () => !!type.value && !!severity.value && (landmark.value || notes.value),
)
function onFilesChange(e) {
  const selected = Array.from(e.target.files || []).slice(0, 4)
  files.value = selected
  previews.value = []
  selected.forEach((f) => {
    const r = new FileReader()
    r.onload = (ev) => previews.value.push(ev.target.result)
    r.readAsDataURL(f)
  })
}
function removePreview(i) {
  previews.value.splice(i, 1)
  files.value.splice(i, 1)
}
function captureLocation() {
  if (!navigator.geolocation) {
    formAction.value.formErrorMessage = 'Geolocation not supported by this browser.'
    return
  }
  fetchingLocation.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      latitude.value = pos.coords.latitude
      longitude.value = pos.coords.longitude
      fetchingLocation.value = false
    },
    (err) => {
      formAction.value.formErrorMessage = 'Could not get location: ' + err.message
      fetchingLocation.value = false
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}
async function submitReport() {
  const isValid = await refVForm.value?.validate()
  if (!isValid) return
  formAction.value.formProcess = true
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) throw new Error('User not authenticated.')
    const user = userData.user
    const uploadedUrls = []
    for (const f of files.value) {
      const filePath = `${user.id}/${Date.now()}-${f.name}`
      const { data, error } = await supabase.storage.from('report-attachments').upload(filePath, f)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('report-attachments').getPublicUrl(data.path)
      uploadedUrls.push(urlData.publicUrl)
    }
    const { error: insertError } = await supabase.from('reports').insert([
      {
        user_id: user.id,
        type: type.value,
        severity: severity.value,
        landmark: landmark.value || null,
        notes: notes.value || null,
        latitude: latitude.value,
        longitude: longitude.value,
        images: uploadedUrls.length ? uploadedUrls : null,
        pipe_location: pipeLocation.value || null,
        status: 'pending',
      },
    ])
    if (insertError) throw insertError
    formAction.value.formSuccessMessage = 'Report submitted successfully!'
    setTimeout(() => router.replace('/dashboard'), 1000)
  } catch (err) {
    formAction.value.formErrorMessage = err.message || 'An unexpected error occurred.'
  } finally {
    formAction.value.formProcess = false
  }
}
// Pipe location
const pipeLocation = ref(null)
const pipeLocationOptions = [
  { value: 'mainline', title: 'Mainline – Large pipes along major roads' },
  { value: 'transition', title: 'Transition Line – Connects main pipes to neighborhoods' },
  { value: 'distribution', title: 'Distribution Line – Pipes within streets and barangays' },
  { value: 'service', title: 'Service Line – Pipe connecting directly to a house' },
  { value: 'unknown', title: 'Not sure – I am not certain' },
]
</script>
<template>
  <v-app :theme="theme">
    <!-- Header -->
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
      class="admin-header"
    >
      <!-- FULL-WIDTH depth system -->
      <div class="header-depth-layer"></div>
      <div class="header-inner px-2 px-sm-6">
        <v-toolbar-title class="font-weight-bold header-title">
          BCWD Complaint System
        </v-toolbar-title>
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
    <v-main
      class="pa-2 pa-sm-4 pa-md-6"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <br /><br /><br />
      <v-container class="px-3 px-sm-3">
        <v-row justify="center" class="w-100 mx-0">
          <v-col cols="12" sm="10" md="8" lg="7" xl="6" class="px-0">
            <v-card
              class="pa-4 pa-sm-8 text-left modern-card mx-auto"
              elevation="10"
              rounded="xl"
              max-width="900"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <h3 class="font-weight-bold mb-2 text-center" :class="mobile ? 'text-h6' : ''">
                File a complaint
              </h3>
              <p class="text-medium-emphasis mb-4 text-center" :class="mobile ? 'text-body-2' : ''">
                Provide details and optional photos. Capture your location for faster response.
              </p>
              <AlertNotification
                :form-success-message="formAction.formSuccessMessage"
                :form-error-message="formAction.formErrorMessage"
              />
              <v-form ref="refVForm">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="type"
                      :items="reportTypes"
                      label="Type of complaint"
                      :rules="[(v) => !!v || 'Type is required']"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="severity"
                      :items="severities"
                      label="Severity"
                      :rules="[(v) => !!v || 'Severity is required']"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
                <v-row>
                  <v-col cols="12">
                    <v-select
                      v-model="pipeLocation"
                      :items="pipeLocationOptions"
                      item-title="title"
                      item-value="value"
                      label="Pipe Location (Optional)"
                      variant="outlined"
                      clearable
                    />
                  </v-col>
                </v-row>
                <v-text-field
                  v-model="landmark"
                  label="Landmark / Nearest place"
                  variant="outlined"
                  class="mb-3"
                />
                <v-textarea
                  v-model="notes"
                  label="Additional notes"
                  rows="3"
                  variant="outlined"
                  class="mb-3"
                />
                <!-- Location -->
                <div class="my-4">
                  <div class="d-flex align-center gap-3 mb-2 flex-wrap">
                    <v-btn small @click="captureLocation" :loading="fetchingLocation">
                      Capture device location
                    </v-btn>
                    <span v-if="latitude && longitude" class="text-caption">
                      Lat: {{ latitude.toFixed(6) }}, Lng: {{ longitude.toFixed(6) }}
                    </span>
                    <span v-else class="text-caption"> No location captured</span>
                  </div>
                  <small class="text-caption">
                    If geolocation fails, write the place in Landmark.
                  </small>
                </div>
                <!-- File Upload -->
                <div class="my-3">
                  <label class="mb-1">Attach photos (max 4) </label>
                  <input type="file" accept="image/*" multiple @change="onFilesChange" />
                  <v-row class="mt-3" dense>
                    <v-col v-for="(p, i) in previews" :key="i" cols="6" sm="4" md="3">
                      <v-card class="pa-2 rounded-lg elevation-2">
                        <v-img :src="p" height="120" contain rounded />
                        <v-row justify="space-between" class="mt-2">
                          <small class="text-caption">{{ files[i]?.name }}</small>
                          <v-btn icon small @click="removePreview(i)">
                            <v-icon>mdi-close</v-icon>
                          </v-btn>
                        </v-row>
                      </v-card>
                    </v-col>
                  </v-row>
                </div>
                <!-- Actions -->
                <div
                  class="d-flex flex-column flex-sm-row justify-space-between align-center mt-6 gap-3"
                >
                  <v-btn variant="outlined" size="large" @click="$router.replace('/dashboard')">
                    <v-icon start>mdi-arrow-left</v-icon> Back
                  </v-btn>
                  <v-btn
                    color="primary"
                    size="large"
                    :loading="formAction.formProcess"
                    :disabled="formAction.formProcess || !canSubmit"
                    @click="submitReport"
                  >
                    <v-icon start>mdi-send</v-icon> Submit Report
                  </v-btn>
                </div>
              </v-form>
            </v-card>
            <br /><br /><br /><br />
          </v-col>
        </v-row>
      </v-container>
      <!-- Footer Content Inside Main (for mobile) - Outside container -->
    </v-main>
    <!-- Footer (Desktop only) -->
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
/* header tweaks */
.header-bar {
  color: #fff;
}
.header-sub {
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
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
