<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import AlertNotification from '@/components/common/AlertNotification.vue'

// Theme toggle (localStorage based for all pages)
const theme = ref(localStorage.getItem('theme') || 'light')
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}

const refVForm = ref(null)
const router = useRouter()

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
  formStatus: 200,
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

  formAction.value = {
    formProcess: true,
    formStatus: 200,
    formErrorMessage: '',
    formSuccessMessage: '',
  }

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) throw new Error('User not authenticated.')
    const user = userData.user

    const uploadedUrls = []
    if (files.value.length > 0) {
      for (const f of files.value) {
        const filePath = `${user.id}/${Date.now()}-${f.name}`

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('report-attachments')
          .upload(filePath, f)

        if (uploadErr) throw uploadErr

        const { data: publicUrlData } = supabase.storage
          .from('report-attachments')
          .getPublicUrl(uploadData.path)
        uploadedUrls.push(publicUrlData.publicUrl)
      }
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
    type.value = ''
    severity.value = ''
    landmark.value = ''
    notes.value = ''
    files.value = []
    previews.value = []
    latitude.value = null
    longitude.value = null

    setTimeout(() => router.replace('/dashboard'), 1200)
  } catch (err) {
    console.error('submitReport error', err)
    formAction.value.formErrorMessage = err.message || 'An unexpected error occurred.'
  } finally {
    formAction.value.formProcess = false
  }
}
</script>

<template>
  <v-app :theme="theme">
    <!-- App Bar -->
    <v-app-bar
      flat
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-4'"
      class="px-6"
    >
      <v-toolbar-title class="font-weight-bold text-h5 d-flex align-center">
        <v-img
          src="/images/LeakAlertLogo.png"
          alt="LeakAlert Logo"
          width="36"
          height="36"
          class="mr-2"
        />
        <span :class="theme === 'light' ? 'text-blue' : 'text-blue-lighten-3'">Leak</span>
        <span class="text-black">Alert</span>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- Theme Toggle -->
      <v-btn
        :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
      ></v-btn>
    </v-app-bar>

    <!-- Main Layout -->
    <v-main
      class="d-flex align-center justify-center pa-6"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <v-card
              class="pa-6"
              elevation="8"
              rounded="xl"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <h3 class="font-weight-bold mb-2">Report a Leak</h3>
              <p class="text-medium-emphasis mb-4">
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
                      dense
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="severity"
                      :items="severities"
                      label="Severity"
                      :rules="[(v) => !!v || 'Severity is required']"
                      dense
                    />
                  </v-col>
                </v-row>

                <v-text-field v-model="landmark" label="Landmark / Nearest place" dense />
                <v-textarea v-model="notes" label="Additional notes" rows="3" dense />

                <!-- Geolocation -->
                <div class="my-4">
                  <div class="d-flex align-center gap-3 mb-2">
                    <v-btn small @click="captureLocation" :loading="fetchingLocation">
                      Capture device location
                    </v-btn>
                    <span v-if="latitude && longitude" class="text-caption">
                      Lat: {{ latitude.toFixed(6) }}, Lng: {{ longitude.toFixed(6) }}
                    </span>
                    <span v-else class="text-caption">No location captured</span>
                  </div>
                  <small class="text-caption">
                    If geolocation fails, write the place in Landmark.
                  </small>
                </div>

                <!-- Image upload -->
                <div class="my-3">
                  <label class="mb-1">Attach photos (max 4)</label>
                  <input type="file" accept="image/*" multiple @change="onFilesChange" />
                  <v-row class="mt-3" dense>
                    <v-col v-for="(p, i) in previews" :key="i" cols="6" sm="4">
                      <v-card class="pa-2">
                        <v-img :src="p" height="120" contain />
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

                <!-- Action buttons -->
                <div class="d-flex justify-space-between mt-6">
                  <v-btn variant="outlined" @click="$router.replace('/dashboard')"> Back </v-btn>

                  <v-btn
                    color="primary"
                    :loading="formAction.formProcess"
                    :disabled="formAction.formProcess || !canSubmit"
                    @click="submitReport"
                  >
                    Submit Report
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
.text-black {
  color: #000000;
}
.gap-3 {
  gap: 12px;
}
</style>
