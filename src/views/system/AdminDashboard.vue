<!-- src/views/system/AdminDashboard.vue -->
<script setup>
import { supabase } from '@/utils/supabase'
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()

const router = useRouter()

// 🌗 THEME
const theme = ref(localStorage.getItem('theme') || 'light')
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
}

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
// async function updateStatus(reportId, newStatus) {
//   try {
//     const { error } = await supabase
//       .from('reports')
//       .update({
//         status: newStatus,
//         updated_at: new Date(),
//       })
//       .eq('id', reportId)

//     if (error) throw error

//     // reload reports after update
//     loadReports()
//   } catch (err) {
//     alert('Failed to update report status.')
//     console.error(err)
//   }
// }

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
    await loadReports() // refresh list
  }
}

// async function updateStatus(reportId, newStatus) {
//   const { error } = await supabase
//     .from('reports')
//     .update({
//       status: newStatus,
//       updated_at: new Date(),
//     })
//     .eq('id', reportId)

//   if (error) {
//     console.error('Update failed:', error)
//     return
//   }

//   // 🔄 Refresh list after update
//   await loadReports()
// }

// 🖼️ IMAGE PREVIEW
function openImages(imgs = []) {
  selectedImages.value = imgs
  showImages.value = true
}

// 🚪 LOGOUT
async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

onMounted(loadReports)

// 🔽 Expanded card tracking
const expandedReportId = ref(null)

// toggle expand + mark as viewed
async function toggleExpand(report) {
  if (expandedReportId.value === report.id) {
    expandedReportId.value = null
    return
  }

  expandedReportId.value = report.id

  // mark as viewed if not yet
  if (!report.viewed_by_admin) {
    await supabase.from('reports').update({ viewed_by_admin: true }).eq('id', report.id)

    report.viewed_by_admin = true
  }
}

// 🪟 FULL REPORT MODAL
// const showReportDialog = ref(false)
// const selectedReport = ref(null)

// open full report
async function openFullReport(report) {
  selectedReport.value = report
  showReportDialog.value = true

  // mark as viewed (if not yet)
  if (!report.viewed_by_admin) {
    await supabase.from('reports').update({ viewed_by_admin: true }).eq('id', report.id)

    report.viewed_by_admin = true
  }
}

// 🔍 SINGLE IMAGE VIEWER (ZOOMABLE)
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
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <v-app :theme="theme">
    <!-- HEADER -->
    <v-app-bar flat density="comfortable" color="#1565c0" class="px-2 px-sm-4 header-bar">
      <!-- Title -->
      <div class="d-flex align-center">
        <div class="font-weight-bold text-white" :class="mobile ? 'text-body-1' : 'text-h5'">
          BCWD Complaint System
        </div>
      </div>

      <v-spacer />

      <!-- Live PH Time (HIDDEN on mobile) -->
      <div v-if="!mobile" class="mr-4 text-caption ph-time">
        {{ phTime }}
      </div>

      <!-- Logout (icon-only on mobile) -->
      <v-btn icon variant="text" class="text-white" @click="logout" :title="'Logout'">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- MAIN -->
    <v-main
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
      class="d-flex align-center justify-center"
      style="min-height: calc(100vh - 64px - 48px)"
    >
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8">
            <v-card
              class="pa-6"
              elevation="10"
              rounded="xl"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <h2 class="text-center font-weight-bold mb-1">Admin Dashboard</h2>
              <p class="text-center text-medium-emphasis mb-6">
                View and manage leak reports submitted by users.
              </p>

              <v-progress-circular
                v-if="loading"
                indeterminate
                color="primary"
                size="48"
                class="mx-auto my-8 d-block"
              />

              <v-alert v-if="errorMessage" type="error" class="mb-4 text-center">
                {{ errorMessage }}
              </v-alert>

              <v-row v-if="!loading && reports.length">
                <v-col v-for="rep in reports" :key="rep.id" cols="12" md="6" class="mb-4">
                  <v-card
                    elevation="4"
                    class="pa-4 modern-card cursor-pointer"
                    :color="theme === 'light' ? 'grey-lighten-5' : 'blue-grey-darken-2'"
                    @click="toggleExpand(rep)"
                  >
                    <div class="d-flex justify-space-between align-start mb-2">
                      <div>
                        <div class="d-flex align-center gap-2">
                          <h3 class="mb-1 font-weight-medium">{{ rep.type }}</h3>

                          <!-- 🆕 NEW BADGE -->
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

                        <small class="text-caption">User ID: {{ rep.user_id }}</small>
                      </div>

                      <!-- 🔽 STATUS UPDATE -->
                      <v-select
                        :items="['pending', 'ongoing', 'resolved', 'rejected']"
                        :model-value="rep.status"
                        density="compact"
                        variant="outlined"
                        class="status-select"
                        @click.stop
                        @update:modelValue="(val) => updateStatus(rep.id, val)"
                      />
                    </div>

                    <v-expand-transition>
                      <div v-show="expandedReportId === rep.id">
                        <p><strong>Severity:</strong> {{ rep.severity }}</p>
                        <p>
                          <strong>Pipe Location:</strong>
                          {{
                            rep.pipe_location
                              ? formatPipeLocation(rep.pipe_location)
                              : 'Not specified'
                          }}
                        </p>

                        <p><strong>Landmark:</strong> {{ rep.landmark || 'N/A' }}</p>
                        <p><strong>Notes:</strong> {{ rep.notes || 'N/A' }}</p>

                        <p class="text-caption text-medium-emphasis mb-2">
                          Submitted: {{ new Date(rep.created_at).toLocaleString() }}
                        </p>

                        <!-- Images -->
                        <v-row v-if="rep.images && rep.images.length" dense class="mb-3">
                          <v-col v-for="(img, i) in rep.images" :key="i" cols="12" sm="6">
                            <v-img
                              :src="img"
                              height="220"
                              cover
                              class="rounded cursor-pointer"
                              @click.stop="openImageViewer(img)"
                            />
                          </v-col>
                        </v-row>
                      </div>
                    </v-expand-transition>
                    <!-- <v-btn
                      size="small"
                      variant="tonal"
                      color="primary"
                      class="mt-2"
                      @click.stop="openFullReport(rep)"
                    >
                      View Full Report
                    </v-btn> -->
                  </v-card>
                </v-col>
              </v-row>

              <v-alert v-else-if="!loading && !reports.length" type="info" class="text-center">
                No reports found.
              </v-alert>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- FOOTER -->
    <!-- FOOTER -->
    <v-footer app height="32" color="#0f5088" class="footer-bar">
      <v-container class="pa-0">
        <v-row no-gutters align="center" class="px-4">
          <span class="text-caption text-white"> © 2025 BCWD Complaint System </span>

          <v-spacer />

          <small class="text-caption text-white"> Philippines (Asia/Manila) </small>
        </v-row>
      </v-container>
    </v-footer>

    <!-- IMAGE MODAL -->
    <v-dialog v-model="showImages" width="800">
      <v-card>
        <v-card-title class="text-h6">Report Images</v-card-title>
        <v-card-text>
          <v-row v-if="selectedImages && selectedImages.length">
            <v-col
              v-for="(img, i) in selectedImages"
              :key="i"
              cols="12"
              sm="6"
              class="d-flex justify-center"
            >
              <v-img
                :src="img"
                height="220"
                cover
                class="rounded cursor-pointer"
                @click.stop="openImageViewer(img)"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showImages = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- 🪟 FULL REPORT DIALOG -->

    <!-- 🔍 IMAGE VIEWER WITH ZOOM -->
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

        <v-card-text class="d-flex justify-center align-center">
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
.text-blue {
  color: #1976d2;
}
.text-black {
  color: #000;
}
.bg-grey-lighten-5 {
  background-color: #f5f5f5;
}
.bg-grey-darken-4 {
  background-color: #121212;
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

/* Header & footer branding */
.header-bar {
  color: #fff;
}

.footer-bar {
  color: #fff;
}

/* PH time styling */
.ph-time {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  white-space: nowrap;
}
</style>
