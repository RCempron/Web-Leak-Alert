<!-- src/views/system/AdminDashboard.vue -->
<script setup>
import { supabase } from '@/utils/supabase'
import { useRouter } from 'vue-router'
import { ref, onMounted, watch, computed } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
const { mobile } = useDisplay()
const vuetifyTheme = useTheme()
const router = useRouter()
// ── THEME ───────────────────────────────────────────────
const theme = ref(localStorage.getItem('theme') || 'light')
vuetifyTheme.global.name.value = theme.value
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.global.name.value = theme.value
}
watch(theme, (v) => {
  vuetifyTheme.global.name.value = v
})
// ── SIDEBAR STATE ───────────────────────────────────────
const drawer = ref(!mobile.value)
const rail = ref(false)
// Unified toggle for hamburger button
function toggleSidebar() {
  if (mobile.value) {
    drawer.value = !drawer.value
  } else {
    rail.value = !rail.value
  }
}
watch(mobile, (isMobile) => {
  if (isMobile) {
    drawer.value = false // close on mobile resize
    rail.value = false
  } else {
    drawer.value = true // open on desktop
    rail.value = false
  }
})
// ── STATES ──────────────────────────────────────────────
const reports = ref([])
const loading = ref(true)
const errorMessage = ref('')
const search = ref('')
const selectedStatus = ref('All')
const statuses = ['All', 'Pending', 'Ongoing', 'Resolved', 'Rejected']
const statusColors = {
  All: 'grey',
  Pending: 'warning',
  Ongoing: 'primary',
  Resolved: 'success',
  Rejected: 'error',
}
const showReportDialog = ref(false)
const selectedReport = ref(null)
const reporterName = ref('')
const showImageViewer = ref(false)
const activeImage = ref('')
const zoomLevel = ref(1)
// Placeholder — replace with real user data later
const adminName = 'Administrator'
// ── COMPUTED ────────────────────────────────────────────
const filteredReports = computed(() => {
  let list = reports.value
  if (search.value.trim()) {
    const term = search.value.toLowerCase()
    list = list.filter(
      (r) =>
        r.type?.toLowerCase().includes(term) ||
        r.landmark?.toLowerCase().includes(term) ||
        r.notes?.toLowerCase().includes(term),
    )
  }
  if (selectedStatus.value !== 'All') {
    list = list.filter((r) => r.status?.toLowerCase() === selectedStatus.value.toLowerCase())
  }
  return list
})
// ── FUNCTIONS ───────────────────────────────────────────
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
    errorMessage.value = err.message || 'Failed to load reports.'
  } finally {
    loading.value = false
  }
}
async function updateStatus(reportId, newStatus) {
  await supabase
    .from('reports')
    .update({
      status: newStatus,
      viewed_by_admin: true,
      updated_at: new Date(),
    })
    .eq('id', reportId)
  await loadReports()
}
async function openReportDetails(report) {
  selectedReport.value = report
  const { data, error } = await supabase.rpc('get_user_full_name', { user_id: report.user_id })
  if (error) {
    console.error(error)
    reporterName.value = 'Unknown'
  } else {
    reporterName.value = data || 'Unknown'
  }
  showReportDialog.value = true
  if (!report.viewed_by_admin) {
    await supabase.from('reports').update({ viewed_by_admin: true }).eq('id', report.id)
    report.viewed_by_admin = true
  }
}
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
async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}
onMounted(loadReports)
</script>
<template>
  <v-app :theme="theme">
    <!-- APP BAR -->
    <v-app-bar flat density="comfortable" :color="theme === 'light' ? '#1565c0' : '#0f1720'">
      <v-btn icon @click="toggleSidebar">
        <v-icon>mdi-menu</v-icon>
      </v-btn>
      <v-toolbar-title class="font-weight-bold"> Admin Dashboard </v-toolbar-title>
      <v-spacer />
      <v-btn icon @click="toggleTheme">
        <v-icon>{{ theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
    </v-app-bar>
    <!-- SIDEBAR -->
    <v-navigation-drawer
      v-model="drawer"
      :temporary="mobile"
      :rail="!mobile && rail"
      :width="260"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
      dark
    >
      <v-list nav density="compact">
        <!-- Profile - hidden completely in rail mode -->
        <div
          class="sidebar-profile pa-5 d-flex flex-column align-center"
          :class="{ 'd-none': !mobile && rail }"
        >
          <v-avatar size="80" class="mb-4 elevation-6 profile-avatar" color="grey-lighten-4">
            <v-icon size="48" color="primary">mdi-account-circle</v-icon>
          </v-avatar>
          <div class="admin-info text-center">
            <div class="admin-name text-h6 font-weight-medium mb-1">
              {{ adminName }}
            </div>
            <div class="admin-role text-caption opacity-70">System Administrator</div>
          </div>
        </div>
        <v-divider class="my-3 mx-4" :class="{ 'mt-6': !mobile && rail }" />
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" />
        <v-list-item prepend-icon="mdi-logout" title="Logout" @click="logout" />
      </v-list>
    </v-navigation-drawer>
    <!-- MAIN CONTENT -->
    <v-main :class="theme === 'light' ? 'bg-grey-lighten-4' : 'bg-dark-admin'">
      <v-container fluid class="pa-3 pa-sm-6">
        <v-card flat class="mb-4">
          <v-card-text>
            <v-chip-group v-model="selectedStatus" mandatory>
              <v-chip v-for="s in statuses" :key="s" :value="s" :color="statusColors[s]">
                {{ s }}
              </v-chip>
            </v-chip-group>
            <v-text-field
              v-model="search"
              label="Search reports"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              class="mt-3"
            />
          </v-card-text>
        </v-card>
        <v-data-table
          :headers="[
            { title: 'Complaint', key: 'type' },
            { title: 'Landmark', key: 'landmark' },
            { title: 'Reported', key: 'created_at' },
            { title: 'Status', key: 'status' },
            { title: 'Actions', key: 'actions', sortable: false },
          ]"
          :items="filteredReports"
          :loading="loading"
          class="elevation-1"
        >
          <template #item.type="{ item }">
            <div class="d-flex align-center gap-2">
              <v-icon color="error">mdi-water-alert</v-icon>
              <span>{{ item.type }}</span>
              <v-chip
                v-if="!item.viewed_by_admin && item.status === 'pending'"
                size="x-small"
                color="deep-orange"
                label
              >
                NEW
              </v-chip>
            </div>
          </template>
          <template #item.created_at="{ item }">
            {{ new Date(item.created_at).toLocaleDateString('en-PH') }}
          </template>
          <template #item.status="{ item }">
            <v-select
              :model-value="item.status"
              :items="['pending', 'ongoing', 'resolved', 'rejected']"
              density="compact"
              hide-details
              @update:modelValue="(v) => updateStatus(item.id, v)"
            />
          </template>
          <template #item.actions="{ item }">
            <v-btn icon @click="openReportDetails(item)">
              <v-icon>mdi-eye</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-container>
    </v-main>
    <!-- Dialogs remain unchanged -->
    <v-dialog v-model="showReportDialog" :max-width="mobile ? '100%' : 820">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="font-weight-bold">Complaint Details</v-card-title>
        <v-divider />
        <v-card-text v-if="selectedReport">
          <p><strong>Type:</strong> {{ selectedReport.type }}</p>
          <p><strong>Reported by:</strong> {{ reporterName }}</p>
          <p><strong>Severity:</strong> {{ selectedReport.severity }}</p>
          <p><strong>Landmark:</strong> {{ selectedReport.landmark }}</p>
          <p><strong>Notes:</strong> {{ selectedReport.notes }}</p>
          <v-divider class="my-4" />
          <v-row dense>
            <v-col v-for="(img, i) in selectedReport.images || []" :key="i" cols="6">
              <v-img
                :src="img"
                height="140"
                cover
                class="rounded cursor-pointer"
                @click="openImageViewer(img)"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showReportDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showImageViewer" max-width="900">
      <v-card>
        <v-card-text
          class="d-flex justify-center align-center"
          @wheel.prevent="(e) => (e.deltaY < 0 ? zoomIn() : zoomOut())"
        >
          <img
            :src="activeImage"
            class="zoomable-image"
            :style="{ transform: `scale(${zoomLevel})` }"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn icon @click="zoomOut"><v-icon>mdi-magnify-minus</v-icon></v-btn>
          <v-btn icon @click="resetZoom"><v-icon>mdi-magnify</v-icon></v-btn>
          <v-btn icon @click="zoomIn"><v-icon>mdi-magnify-plus</v-icon></v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showImageViewer = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>
<style scoped>
.bg-dark-admin {
  background-color: #121212;
}
.zoomable-image {
  max-width: 100%;
  max-height: 70vh;
  transition: transform 0.2s ease;
}
.cursor-pointer {
  cursor: pointer;
}
/* ── Sidebar Profile ─────────────────────────────── */
.sidebar-profile {
  padding: 28px 16px 20px !important;
  transition: all 0.3s ease;
}
.profile-avatar {
  border: 3px solid rgba(255, 255, 255, 0.2);
  background-color: white !important;
  transition: all 0.25s ease;
}
.profile-avatar:hover {
  transform: scale(1.06);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35) !important;
}
.admin-info {
  line-height: 1.3;
}
.admin-name {
  color: rgba(255, 255, 255, 0.96);
  letter-spacing: 0.3px;
}
.admin-role {
  color: rgba(255, 255, 255, 0.62);
  margin-top: 3px;
}
/* When rail → completely hide profile */
.v-navigation-drawer--rail .sidebar-profile {
  display: none !important;
}
</style>
