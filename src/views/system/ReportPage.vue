<template>
  <v-app :theme="theme">
    <!-- Header -->
    <v-app-bar
      flat
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-4'"
      class="px-6"
    >
      <v-toolbar-title class="font-weight-bold" :class="mobile ? 'text-h6' : 'text-h5'">
        <span :class="theme === 'light' ? 'text-blue' : 'text-blue-lighten-3'">BCWD </span>
        <span :style="{ color: theme === 'light' ? '#000' : '#fff' }">Complaint System</span>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn
        :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
      ></v-btn>
    </v-app-bar>

    <!-- Main -->
    <v-main
      class="main-section d-flex align-center justify-center"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <v-container class="fill-height d-flex align-center justify-center">
        <v-row justify="center" class="w-100">
          <v-col cols="12" sm="10" md="9" lg="8" xl="6">
            <v-card
              class="pa-8 text-left modern-card mx-auto"
              elevation="10"
              rounded="xl"
              max-width="900"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <h3 class="font-weight-bold mb-2 text-center">File a complaint</h3>
              <p class="text-medium-emphasis mb-4 text-center">
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
                      label="Type of leak"
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
                  <label class="mb-1">Attach photos (max 4)</label>
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
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer
      class="text-center py-2"
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-3'"
    >
      <small>&copy; 2025 LeakAlert | All Rights Reserved</small>
    </v-footer>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import AlertNotification from '@/components/common/AlertNotification.vue'

// 🌗 Theme toggle (shared across app)
const theme = ref(localStorage.getItem('theme') || 'light')
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
}

const router = useRouter()
const refVForm = ref(null)

const reportTypes = ['Broken Pipe', 'Water Leak', 'Low Pressure', 'Contamination', 'Other']
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
</script>

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
.main-section {
  min-height: calc(100vh - 64px - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modern-card {
  transition: all 0.3s ease;
}
.modern-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
</style>
