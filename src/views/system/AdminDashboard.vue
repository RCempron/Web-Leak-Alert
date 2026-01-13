<!-- src/views/system/AdminDashboard.vue -->
<script setup>
import { supabase } from '@/utils/supabase'
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDisplay, useTheme } from 'vuetify'

const { mobile } = useDisplay()
const vuetifyTheme = useTheme()
const router = useRouter()

// Theme management - consistent with other pages
const theme = ref(localStorage.getItem('theme') || 'light')
vuetifyTheme.global.name.value = theme.value

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.global.name.value = theme.value
}

watch(theme, (newVal) => {
  vuetifyTheme.global.name.value = newVal
})

// 📊 STATES
const reports = ref([])
const loading = ref(true)
const errorMessage = ref('')
const showImages = ref(false)
const selectedImages = ref([])

// 🧭 FETCH REPORTS
async function loadReports() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    reports.value = data || []
  } catch (err) {
    console.error('loadReports error:', err)
    errorMessage.value = err.message || 'Failed to fetch reports.'
  } finally {
    loading.value = false
  }
}

// ✅ UPDATE REPORT STATUS
async function updateStatus(reportId, newStatus) {
  const { error } = await supabase
    .from('reports')
    .update({
      status: newStatus,
      viewed_by_admin: true,
      updated_at: new Date(),
    })
    .eq('id', reportId)

  if (!error) {
    await loadReports()
  }
}

// 🖼️ IMAGE PREVIEW & MODALS
function openImages(imgs = []) {
  selectedImages.value = imgs
  showImages.value = true
}

const showImageViewer = ref(false)
const activeImage = ref('')
const zoomLevel = ref(1)

function openImageViewer(img) {
  activeImage.value = img
  zoomLevel.value = 1
  showImageViewer.value = true
}

function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3)
}
function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5)
}
function resetZoom() {
  zoomLevel.value = 1
}

// 🚪 LOGOUT
async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

// Expanded card tracking
const expandedReportId = ref(null)

async function toggleExpand(report) {
  if (expandedReportId.value === report.id) {
    expandedReportId.value = null
    return
  }

  expandedReportId.value = report.id

  if (!report.viewed_by_admin) {
    await supabase.from('reports').update({ viewed_by_admin: true }).eq('id', report.id)
    report.viewed_by_admin = true
  }
}

// 🇵🇭 Philippine live date & time
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
  loadReports()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function formatPipeLocation(value) {
  const map = {
    mainline: 'Mainline',
    transition: 'Transition Line',
    distribution: 'Distribution Line',
    service: 'Service Line',
    unknown: 'Not sure',
  }
  return map[value] || value
}
</script>

<template>
  <v-app :theme="theme">
    <!-- HEADER -->
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
      class="px-2 px-sm-4 header-bar"
    >
      <div class="d-flex align-center gap-2 gap-sm-4">
        <div>
          <div class="font-weight-bold text-white" :class="mobile ? 'text-body-1' : 'text-h5'">
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

    <!-- MAIN CONTENT -->
    <v-main
      class="d-flex flex-column pa-0"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <div class="flex-grow-1 d-flex flex-column">
        <v-container class="px-4 py-8 flex-grow-1" fluid>
          <!-- Added top margin so content isn't cut by header -->
          <v-row justify="center" class="mt-8 mt-sm-12">
            <v-col cols="12" md="10" lg="8">
              <v-card
                class="pa-6 mb-12 mb-sm-16"
                elevation="10"
                rounded="xl"
                :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
              >
                <h2 class="text-center font-weight-bold mb-2">Admin Dashboard</h2>
                <p class="text-center text-medium-emphasis mb-6">
                  View and manage leak reports submitted by users.
                </p>

                <v-progress-circular
                  v-if="loading"
                  indeterminate
                  color="primary"
                  size="48"
                  class="mx-auto my-10 d-block"
                />

                <v-alert v-if="errorMessage" type="error" class="mb-6 text-center">
                  {{ errorMessage }}
                </v-alert>

                <v-row v-if="!loading && reports.length" class="mt-6">
                  <v-col v-for="rep in reports" :key="rep.id" cols="12" md="6">
                    <v-card
                      elevation="4"
                      class="pa-5 mb-6 modern-card cursor-pointer"
                      :color="theme === 'light' ? 'grey-lighten-4' : 'blue-grey-darken-2'"
                      @click="toggleExpand(rep)"
                    >
                      <div class="d-flex justify-space-between align-start mb-3">
                        <div>
                          <div class="d-flex align-center gap-2">
                            <h3 class="mb-1 font-weight-medium">{{ rep.type }}</h3>
                            <v-chip
                              v-if="!rep.viewed_by_admin && rep.status === 'pending'"
                              size="x-small"
                              color="deep-orange"
                              label
                              class="font-weight-bold"
                            >
                              NEW
                            </v-chip>
                          </div>
                          <small class="text-caption text-medium-emphasis">
                            User ID: {{ rep.user_id }}
                          </small>
                        </div>

                        <v-select
                          :items="['pending', 'ongoing', 'resolved', 'rejected']"
                          :model-value="rep.status"
                          density="compact"
                          variant="outlined"
                          hide-details
                          class="status-select"
                          @click.stop
                          @update:modelValue="(val) => updateStatus(rep.id, val)"
                        />
                      </div>

                      <v-expand-transition>
                        <div v-show="expandedReportId === rep.id">
                          <p class="mb-2"><strong>Severity:</strong> {{ rep.severity }}</p>
                          <p class="mb-2">
                            <strong>Pipe Location:</strong>
                            {{
                              rep.pipe_location
                                ? formatPipeLocation(rep.pipe_location)
                                : 'Not specified'
                            }}
                          </p>
                          <p class="mb-2"><strong>Landmark:</strong> {{ rep.landmark || 'N/A' }}</p>
                          <p class="mb-3"><strong>Notes:</strong> {{ rep.notes || 'N/A' }}</p>

                          <p class="text-caption text-medium-emphasis mb-4">
                            Submitted: {{ new Date(rep.created_at).toLocaleString() }}
                          </p>

                          <v-row v-if="rep.images?.length" dense class="mb-3">
                            <v-col v-for="(img, i) in rep.images" :key="i" cols="6" sm="4">
                              <v-img
                                :src="img"
                                height="140"
                                cover
                                class="rounded cursor-pointer"
                                @click.stop="openImageViewer(img)"
                              />
                            </v-col>
                          </v-row>
                        </div>
                      </v-expand-transition>
                    </v-card>
                  </v-col>
                </v-row>

                <v-alert
                  v-else-if="!loading && !reports.length"
                  type="info"
                  class="text-center mt-8"
                >
                  No reports found at the moment.
                </v-alert>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>

      <!-- Footer -->
      <v-footer
        v-if="!mobile"
        app
        class="py-2 footer-bar"
        :color="theme === 'light' ? '#0f5088' : '#0b1116'"
      >
        <v-container class="pa-0">
          <v-row no-gutters align="center" class="px-4">
            <span class="text-caption text-white">© 2025 BCWD Complaint System</span>
            <v-spacer />
            <small class="text-caption text-white">Philippines (Asia/Manila)</small>
          </v-row>
        </v-container>
      </v-footer>
    </v-main>

    <!-- IMAGE ZOOM DIALOG -->
    <v-dialog v-model="showImageViewer" max-width="900">
      <v-card rounded="xl">
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="font-weight-bold">Image Viewer</span>
          <div class="d-flex gap-2">
            <v-btn icon size="small" @click="zoomOut">
              <v-icon>mdi-magnify-minus</v-icon>
            </v-btn>
            <v-btn icon size="small" @click="resetZoom">
              <v-icon>mdi-magnify</v-icon>
            </v-btn>
            <v-btn icon size="small" @click="zoomIn">
              <v-icon>mdi-magnify-plus</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-divider />

        <v-card-text class="d-flex justify-center align-center pa-4">
          <div
            class="image-zoom-wrapper"
            @wheel.prevent="(e) => (e.deltaY < 0 ? zoomIn() : zoomOut())"
          >
            <img
              :src="activeImage"
              class="zoomable-image"
              :style="{ transform: `scale(${zoomLevel})` }"
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showImageViewer = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

.modern-card {
  transition: all 0.3s ease;
}

.modern-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
}

.status-select {
  min-width: 140px;
  max-width: 160px;
}

.cursor-pointer {
  cursor: pointer;
}

.image-zoom-wrapper {
  max-height: 70vh;
  max-width: 100%;
  overflow: auto;
  cursor: zoom-in;
}

.zoomable-image {
  max-width: 100%;
  max-height: 70vh;
  transition: transform 0.2s ease;
  transform-origin: center center;
}

/* Ensure no unwanted padding/margin issues */
.v-main {
  padding: 0 !important;
}

.v-container {
  padding-bottom: 0 !important;
}
</style>
