<!-- src/views/system/DashboardView.vue -->
<script setup>
import { ref, onMounted, onUnmounted, watch, computed, onActivated, nextTick } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase.js'
import AlertNotification from '@/components/common/AlertNotification.vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
const { mobile } = useDisplay()
const router = useRouter()
const vuetifyTheme = useTheme()
// ── Theme ───────────────────────────────────────────────
const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.change(theme.value)
watch(theme, (newTheme) => {
  localStorage.setItem('theme', newTheme)
  vuetifyTheme.change(newTheme)
  showSnackbar('Theme changed')
})
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
// ── Real-time PH Time ───────────────────────────────────
const phTime = ref('')
let timer = null
const timeFormat = ref(localStorage.getItem('timeFormat') || '24')
watch(timeFormat, (val) => {
  localStorage.setItem('timeFormat', val)
  updatePhTime()
  showSnackbar('Time format changed')
})
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
    hour12: timeFormat.value === '12',
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
// ── Reports & Filtering ─────────────────────────────────
const updatedReports = ref(new Set())
const lastViewedUpdates = ref(JSON.parse(localStorage.getItem('lastViewedUpdates') || '{}'))
const notificationCount = computed(() => updatedReports.value.size)
const showUpdatedOnly = ref(false)
function showUpdatedReports() {
  currentView.value = 'dashboard'
  showUpdatedOnly.value = true
  currentStatus.value = 'all'
  selectedType.value = 'all'
  page.value = 1
}
function resetToAllReports() {
  showUpdatedOnly.value = false
  currentStatus.value = 'all'
  selectedType.value = 'all'
  page.value = 1
}
const reports = ref([])
async function fetchReports() {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return
  const { data } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
  reports.value = data || []
}
const baseReportsForFiltering = computed(() => {
  if (!showUpdatedOnly.value) return reports.value
  return reports.value.filter((r) => updatedReports.value.has(r.id))
})
const statusCounts = computed(() => {
  const counts = {
    all: baseReportsForFiltering.value.length,
    pending: 0,
    ongoing: 0,
    resolved: 0,
    rejected: 0,
  }
  baseReportsForFiltering.value.forEach((r) => {
    if (r.status in counts) counts[r.status]++
  })
  return counts
})
const typeCounts = computed(() => {
  const counts = {}
  baseReportsForFiltering.value.forEach((r) => {
    const t = (r.type || 'other').toLowerCase()
    counts[t] = (counts[t] || 0) + 1
  })
  return counts
})
const currentStatus = ref('all')
const selectedType = ref('all')
const filteredReports = computed(() => {
  let filtered = baseReportsForFiltering.value
  if (currentStatus.value !== 'all')
    filtered = filtered.filter((r) => r.status === currentStatus.value)
  if (selectedType.value && selectedType.value !== 'all') {
    filtered = filtered.filter((r) => (r.type || 'other').toLowerCase() === selectedType.value)
  }
  return filtered
})
const page = ref(1)
const itemsPerPage = ref(parseInt(localStorage.getItem('itemsPerPage')) || 10)
watch(itemsPerPage, (val) => {
  localStorage.setItem('itemsPerPage', val.toString())
  showSnackbar('Items per page changed')
  page.value = 1
})
const paginatedReports = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return filteredReports.value.slice(start, start + itemsPerPage.value)
})
const paginationLength = computed(() =>
  Math.ceil(filteredReports.value.length / itemsPerPage.value),
)
// ── UPDATED ICONS (water leak & broken pipe now different) ───────
const typeIcons = {
  'low pressure': 'mdi-water',
  'broken pipe': 'mdi-pipe-disconnected', // ← clear broken pipe
  'dark colored water': 'mdi-water-alert',
  contamination: 'mdi-water-alert',
  'water leak': 'mdi-pipe-leak', // ← classic leaking pipe
  'no water': 'mdi-water-off',
  other: 'mdi-help-circle',
}
const typeColors = {
  'low pressure': 'red',
  'broken pipe': 'red',
  'dark colored water': 'orange',
  contamination: 'orange',
  'water leak': 'red',
  'no water': 'red',
  other: 'grey',
}
const statusColors = {
  pending: 'amber',
  ongoing: 'blue',
  resolved: 'green',
  rejected: 'red',
}
const statusTextColors = {
  pending: '#FFA726',
  ongoing: '#42A5F5',
  resolved: '#66BB6A',
  rejected: '#EF5350',
}
const statusHexColors = {
  pending: '#FFA726',
  ongoing: '#42A5F5',
  resolved: '#66BB6A',
  rejected: '#EF5350',
}
const userName = ref('')
async function fetchUser() {
  const { data } = await supabase.auth.getUser()
  const metadata = data?.user?.user_metadata || {}
  userName.value =
    `${metadata.firstname || ''} ${metadata.lastname || ''}`.trim() ||
    data?.user?.email?.split('@')[0] ||
    'User'
}
// ── Report Dialog & Image Viewer ────────────────────────
const dialog = ref(false)
const selectedReport = ref(null)
function openReportDetails(report) {
  selectedReport.value = report
  dialog.value = true
  lastViewedUpdates.value[report.id] = report.updated_at
  localStorage.setItem('lastViewedUpdates', JSON.stringify(lastViewedUpdates.value))
  updatedReports.value.delete(report.id)
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
// ── Sidebar ─────────────────────────────────────────────
const drawer = ref(!mobile.value)
const rail = ref(false)
function toggleSidebar() {
  if (mobile.value) drawer.value = !drawer.value
  else rail.value = !rail.value
}
watch(mobile, (isMobile) => {
  if (isMobile) {
    drawer.value = false
    rail.value = false
  } else {
    drawer.value = true
    rail.value = false
  }
})
// ── Data Loading ────────────────────────────────────────
async function loadData() {
  await fetchReports()
  await fetchUser()
  const updated = reports.value.filter((r) => {
    const lastViewed = lastViewedUpdates.value[r.id]
    const updatedDate = new Date(r.updated_at)
    const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0)
    return r.status !== 'pending' && r.updated_at && updatedDate > lastViewedDate
  })
  updatedReports.value = new Set(updated.map((r) => r.id))
}
onMounted(loadData)
onActivated(loadData)
// ── Profile ─────────────────────────────────────────────
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
    await fetchUser()
  } catch (err) {
    formErrorMessage.value = err?.message || String(err)
  } finally {
    saving.value = false
  }
}
const currentView = ref('dashboard')
onMounted(loadCurrentUser)
// ── Snackbar ────────────────────────────────────────────
const snackbar = ref(false)
const snackbarMessage = ref('')
function showSnackbar(message) {
  snackbarMessage.value = message
  snackbar.value = true
}
async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
function handleMobileNav(view) {
  currentView.value = view
  if (mobile.value) drawer.value = false
}
// ── Avatar ──────────────────────────────────────────────
const colors = [
  'red',
  'pink',
  'purple',
  'deep-purple',
  'indigo',
  'blue',
  'light-blue',
  'cyan',
  'teal',
  'green',
  'light-green',
  'lime',
  'yellow',
  'amber',
  'orange',
  'deep-orange',
]
const initial = computed(() => userName.value.charAt(0).toUpperCase() || 'U')
const avatarColor = computed(() => {
  if (!userName.value) return 'grey'
  const index = Math.abs(userName.value.charCodeAt(0)) % colors.length
  return colors[index]
})
// ── Map Integration for Pinning ─────────────────────────
const mapInstance = ref(null)
const markerInstance = ref(null)
const showMapDialog = ref(false)

watch(showMapDialog, async (newVal) => {
  if (newVal) {
    await nextTick()
    // Ensure map container is ready and visible
    const mapContainer = document.getElementById('report-map')
    if (!mapContainer) return
    
    // Initialize map centered on Cagayan de Oro
    mapInstance.value = L.map('report-map', { 
      preferCanvas: true,
      zoomControl: true,
      dragging: true
    }).setView([8.4542, 124.6319], 13)
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance.value)
    
    // Reset marker when opening dialog
    markerInstance.value = null
    
    // Wait for dialog to fully render, then trigger map resize
    await new Promise(resolve => {
      setTimeout(() => {
        if (mapInstance.value) {
          mapInstance.value.invalidateSize(true)
        }
        resolve()
      }, 300)
    })
    
    // If report already has coordinates, show marker
    if (selectedReport.value?.latitude && selectedReport.value?.longitude) {
      const latLng = [selectedReport.value.latitude, selectedReport.value.longitude]
      markerInstance.value = L.marker(latLng).addTo(mapInstance.value)
      mapInstance.value.setView(latLng, 15)
    }
    
    // Add click handler to map
    mapInstance.value.on('click', (e) => {
      // Remove old marker if exists
      if (markerInstance.value) {
        markerInstance.value.remove()
      }
      // Add new marker at clicked location
      markerInstance.value = L.marker(e.latlng).addTo(mapInstance.value)
    })
  } else {
    // Clean up map on dialog close
    if (mapInstance.value) {
      mapInstance.value.off('click')
      mapInstance.value.remove()
      mapInstance.value = null
      markerInstance.value = null
    }
  }
})

async function savePin() {
  if (!markerInstance.value) {
    showSnackbar('Please select a location on the map first')
    return
  }
  
  try {
    const { lat, lng } = markerInstance.value.getLatLng()
    const { error } = await supabase
      .from('reports')
      .update({ latitude: lat, longitude: lng })
      .eq('id', selectedReport.value.id)
    
    if (error) throw error
    
    selectedReport.value.latitude = lat
    selectedReport.value.longitude = lng
    showSnackbar('Location pinned successfully')
    showMapDialog.value = false
    await fetchReports()
  } catch (err) {
    console.error('Save pin error:', err)
    showSnackbar('Error saving location: ' + err.message)
  }
}
</script>
<template>
  <v-app class="dashboard-app" :theme="theme">
    <!-- App Bar -->
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
      class="consumer-header"
    >
      <div class="consumer-header-depth"></div>
      <div class="consumer-header-inner px-2 px-sm-6">
        <v-toolbar-title class="font-weight-bold consumer-header-title"
          >BCWD Complaint System</v-toolbar-title
        >
        <v-spacer />
        <div class="d-flex align-center gap-3 consumer-header-right">
          <div
            class="text-caption text-white font-weight-medium ph-time"
            :class="{ 'd-none d-sm-block': mobile }"
          >
            {{ phTime }}
          </div>
        </div>
      </div>
    </v-app-bar>
    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :temporary="mobile"
      :rail="!mobile && rail"
      :width="260"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
    >
      <v-list nav density="compact">
        <div
          class="sidebar-profile pa-5 d-flex flex-column align-center"
          :class="{ 'd-none': !mobile && rail }"
        >
          <v-avatar :color="avatarColor" size="80" class="mb-4 elevation-6 profile-avatar">
            <span class="text-h5 white--text">{{ initial }}</span>
          </v-avatar>
          <div class="admin-info text-center">
            <div class="admin-name text-h6 font-weight-medium mb-1">{{ userName }}</div>
            <div class="admin-role text-caption opacity-70">Consumer</div>
          </div>
        </div>
        <v-divider class="my-3 mx-4" :class="{ 'mt-6': !mobile && rail }" />
        <v-list-item
          :active="currentView === 'dashboard'"
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          @click="handleMobileNav('dashboard')"
        />
        <v-list-item
          :active="currentView === 'profile'"
          prepend-icon="mdi-account-circle"
          title="Profile"
          @click="handleMobileNav('profile')"
        />
        <v-list-item
          :active="currentView === 'settings'"
          prepend-icon="mdi-cog"
          title="Settings"
          @click="handleMobileNav('settings')"
        />
        <v-list-item prepend-icon="mdi-logout" title="Logout" @click="logout" class="mt-8" />
      </v-list>
      <div class="sidebar-lump" @click="toggleSidebar">
        <v-icon size="22">{{ drawer ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
      </div>
    </v-navigation-drawer>
    <!-- Main Content -->
    <v-main class="dashboard-main" :class="theme === 'light' ? 'bg-grey-lighten-4' : 'bg-grey-darken-4'">
      <v-container fluid class="pa-4 pa-md-6 pb-6 pb-md-10">
        <div class="text-center mb-6 mb-md-8">
          <h2 class="font-weight-bold mb-2" :class="mobile ? 'text-h6' : 'text-h4'">
            Welcome to BCWD Complaint System
          </h2>
          <p class="text-medium-emphasis" :class="mobile ? 'text-caption' : 'text-body-1'">
            Report and track water-related issues quickly and easily.
          </p>
        </div>
        <!-- Dashboard -->
        <div v-if="currentView === 'dashboard'">
          <v-card rounded="lg" elevation="2" class="position-relative">
            <div class="d-flex align-center justify-space-between py-6 px-6 border-bottom">
  <div class="text-h5 font-weight-bold">
    {{ showUpdatedOnly ? 'Updated Reports' : 'My Reports' }}
  </div>
  <v-spacer></v-spacer>
  <div class="d-flex align-center" style="gap: 24px;">
    <!-- Notification icon moved to header (never gets cut) -->
    <v-btn
      v-if="!showUpdatedOnly"
      icon
      class="notification-btn"
      @click="showUpdatedReports"
    >
      <v-badge
        v-if="notificationCount > 0"
        :content="notificationCount"
        color="error"
        floating
        overlap
      >
        <v-icon size="28">mdi-bell-ring</v-icon>
      </v-badge>
      <v-icon v-else size="28">mdi-bell-ring</v-icon>
    </v-btn>

    <v-btn
      color="primary"
      prepend-icon="mdi-plus"
      variant="flat"
      size="large"
      @click="router.push('/report')"
      class="new-report-btn"
    >
      New Report
    </v-btn>
  </div>
</div>
            <v-alert
              v-if="showUpdatedOnly"
              density="compact"
              variant="tonal"
              class="mx-6 mb-4 rounded-xl"
              elevation="2"
            >
              <div class="d-flex align-center gap-3 flex-wrap">
                <div>
                  Showing <strong>{{ notificationCount }}</strong> new report update{{
                    notificationCount !== 1 ? 's' : ''
                  }}
                </div>
                <v-spacer />
                <v-btn
                  color="primary"
                  prepend-icon="mdi-arrow-left"
                  variant="flat"
                  @click="resetToAllReports"
                  >Go back to all reports</v-btn
                >
              </div>
            </v-alert>
            <v-card-text class="px-6 pb-6">
              <v-chip-group v-if="!showUpdatedOnly" v-model="currentStatus" mandatory class="mb-6">
  <v-chip
    value="all"
    :color="theme === 'light' ? 'primary' : 'blue-darken-2'"
    variant="flat"
    size="large"
    >All <strong class="ml-1">{{ statusCounts.all }}</strong></v-chip
  >
  <v-chip value="pending" color="amber" variant="flat" size="large"
    >Pending <strong class="ml-1">{{ statusCounts.pending }}</strong></v-chip
  >
  <v-chip value="ongoing" color="blue" variant="flat" size="large"
    >Ongoing <strong class="ml-1">{{ statusCounts.ongoing }}</strong></v-chip
  >
  <v-chip value="resolved" color="green" variant="flat" size="large"
    >Resolved <strong class="ml-1">{{ statusCounts.resolved }}</strong></v-chip
  >
  <v-chip value="rejected" color="red" variant="flat" size="large"
    >Rejected <strong class="ml-1">{{ statusCounts.rejected }}</strong></v-chip
  >
</v-chip-group>
              <div v-if="!showUpdatedOnly" class="mb-6">
                <div class="text-subtitle-1 mb-2">Filter by Type</div>
                <v-chip-group v-model="selectedType" class="d-flex flex-wrap">
                  <v-chip value="all" :variant="selectedType === 'all' ? 'flat' : 'outlined'"
                    >All Reports ({{ baseReportsForFiltering.length }})</v-chip
                  >
                  <v-chip
                    v-for="(count, type) in typeCounts"
                    :key="type"
                    :value="type"
                    :prepend-icon="typeIcons[type]"
                    :color="typeColors[type]"
                    :variant="selectedType === type ? 'flat' : 'outlined'"
                  >
                    {{ type.charAt(0).toUpperCase() + type.slice(1) }} ({{ count }})
                  </v-chip>
                </v-chip-group>
              </div>
              <v-row>
                <v-col cols="12">
                  <v-card
                    v-for="report in paginatedReports"
                    :key="report.id"
                    class="mb-4"
                    flat
                    hover
                  >
                    <v-list-item three-line @click="openReportDetails(report)">
                      <template v-slot:prepend>
                        <v-icon
                          :color="typeColors[(report.type || 'other').toLowerCase()]"
                          size="48"
                          class="mr-4"
                        >
                          {{ typeIcons[(report.type || 'other').toLowerCase()] }}
                        </v-icon>
                      </template>
                      <v-list-item-title class="font-weight-medium">{{
                        report.type || 'Other'
                      }}</v-list-item-title>
                      <v-list-item-subtitle class="mt-1">
                        <div class="d-flex align-center gap-2">
                          <div class="text-caption">
                            Reported: {{ new Date(report.created_at).toLocaleDateString('en-PH') }}
                          </div>
                          <v-chip
                            :color="statusColors[report.status]"
                            label
                            size="small"
                            class="text-capitalize"
                          >
                            {{ report.status || 'pending' }}
                          </v-chip>
                        </div>
                      </v-list-item-subtitle>
                      <template v-slot:append>
                        <div class="d-flex align-center gap-4">
                          <v-chip
                            v-if="updatedReports.has(report.id)"
                            color="green"
                            label
                            size="small"
                            prepend-icon="mdi-update"
                            class="mr-2"
                            >Status Updated</v-chip
                          >
                        </div>
                      </template>
                    </v-list-item>
                    <v-divider />
                  </v-card>
                  <div v-if="filteredReports.length === 0" class="text-center py-8">
                    <v-icon size="64" color="grey-lighten-1">mdi-inbox-outline</v-icon>
                    <div class="text-h6 mt-4">No reports found</div>
                    <div class="text-body-2 text-medium-emphasis">Try changing your filters</div>
                  </div>
                </v-col>
              </v-row>
              <div class="text-center mt-6">
                <v-pagination
                  v-model="page"
                  :length="paginationLength"
                  :total-visible="7"
                  density="compact"
                ></v-pagination>
              </div>
            </v-card-text>
          </v-card>
        </div>
        <!-- Profile View -->
        <div v-else-if="currentView === 'profile'">
          <v-card
            class="pa-3 pa-sm-5 text-center modern-card mx-auto"
            :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            elevation="10"
            rounded="xl"
            max-width="700"
          >
            <v-avatar :color="avatarColor" size="90" class="mb-4"
              ><span class="text-h4 white--text">{{ initial }}</span></v-avatar
            >
            <h2 class="font-weight-bold mb-2" :class="mobile ? 'text-h6' : ''">My Profile</h2>
            <p class="text-medium-emphasis mb-6" :class="mobile ? 'text-body-2' : ''">
              View or edit your personal information
            </p>
            <AlertNotification
              :form-success-message="formSuccessMessage"
              :form-error-message="formErrorMessage"
            />
            <v-skeleton-loader v-if="loading" type="heading, paragraph, paragraph" class="mb-4" />
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
              <div class="button-group d-flex flex-wrap justify-center align-center mt-6">
                <v-btn
                  v-if="!editing"
                  color="primary"
                  size="large"
                  class="flex-btn"
                  @click="editing = true"
                  ><v-icon start>mdi-account-edit</v-icon> Edit Profile</v-btn
                >
                <v-btn
                  v-else
                  color="success"
                  size="large"
                  class="flex-btn"
                  :loading="saving"
                  @click="saveProfile"
                  ><v-icon start>mdi-content-save</v-icon> Save Changes</v-btn
                >
                <v-btn variant="outlined" size="large" @click="currentView = 'dashboard'"
                  ><v-icon start>mdi-arrow-left</v-icon> Back</v-btn
                >
                <v-btn
                  color="error"
                  variant="outlined"
                  size="large"
                  class="flex-btn"
                  @click="logout"
                  ><v-icon start>mdi-logout</v-icon> Logout</v-btn
                >
              </div>
            </div>
          </v-card>
        </div>
        <!-- Settings View -->
        <div v-else-if="currentView === 'settings'">
          <v-card
            class="pa-3 pa-sm-5 text-center modern-card mx-auto"
            :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            elevation="10"
            rounded="xl"
            max-width="700"
          >
            <v-avatar size="90" class="mb-4"
              ><v-icon size="90" color="primary">mdi-cog</v-icon></v-avatar
            >
            <h2 class="font-weight-bold mb-2" :class="mobile ? 'text-h6' : ''">Settings</h2>
            <p class="text-medium-emphasis mb-6" :class="mobile ? 'text-body-2' : ''">
              Manage your application settings
            </p>
            <v-divider class="mb-4" />
            <v-list lines="one" class="pa-0">
              <v-list-group value="appearance">
                <template v-slot:activator="{ props }"
                  ><v-list-item v-bind="props" prepend-icon="mdi-palette" title="Appearance"
                /></template>
                <v-list-item title="Theme" prepend-icon="mdi-theme-light-dark">
                  <template v-slot:append>
                    <v-select
                      v-model="theme"
                      :items="[
                        { value: 'light', title: 'Light' },
                        { value: 'dark', title: 'Dark' },
                      ]"
                      density="compact"
                      hide-details
                      variant="outlined"
                      style="width: 150px"
                    />
                  </template>
                </v-list-item>
              </v-list-group>
              <v-list-group value="time-display">
                <template v-slot:activator="{ props }"
                  ><v-list-item
                    v-bind="props"
                    prepend-icon="mdi-clock-outline"
                    title="Time Display"
                /></template>
                <v-list-item title="Time Format" prepend-icon="mdi-clock-time-twelve-outline">
                  <template v-slot:append>
                    <v-select
                      v-model="timeFormat"
                      :items="[
                        { value: '24', title: '24-hour' },
                        { value: '12', title: '12-hour' },
                      ]"
                      density="compact"
                      hide-details
                      variant="outlined"
                      style="width: 150px"
                    />
                  </template>
                </v-list-item>
              </v-list-group>
              <v-list-group value="reports">
                <template v-slot:activator="{ props }"
                  ><v-list-item
                    v-bind="props"
                    prepend-icon="mdi-file-document-multiple"
                    title="Reports"
                /></template>
                <v-list-item title="Items per Page" prepend-icon="mdi-view-list">
                  <template v-slot:append>
                    <v-select
                      v-model="itemsPerPage"
                      :items="[5, 10, 20, 50]"
                      density="compact"
                      hide-details
                      variant="outlined"
                      style="width: 150px"
                    />
                  </template>
                </v-list-item>
              </v-list-group>
            </v-list>
            <div class="button-group d-flex flex-wrap justify-center align-center mt-6">
              <v-btn variant="outlined" size="large" @click="currentView = 'dashboard'"
                ><v-icon start>mdi-arrow-left</v-icon> Back</v-btn
              >
            </div>
          </v-card>
        </div>
      </v-container>
    </v-main>
    <!-- Mobile Footer -->
    <v-row v-if="mobile" class="mt-auto mx-0">
      <v-col cols="12" class="px-0">
        <div
          class="footer-mobile-content"
          :class="theme === 'light' ? 'bg-footer-light' : 'bg-footer-dark'"
        >
          <div class="footer-content-mobile text-center py-6">
            <div class="mb-4">
              <span class="text-caption font-weight-medium text-white"
                >&copy; 2025 BCWD Complaint System</span
              >
            </div>
            <div class="footer-contacts-mobile mb-4">
              <div class="contact-line mb-2">
                <v-icon size="16" class="mr-2 text-white">mdi-map-marker</v-icon
                ><span class="text-body-2 text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
              </div>
              <div class="contact-line mb-2">
                <v-icon size="16" class="mr-2 text-white">mdi-phone</v-icon
                ><span class="text-body-2 text-white">(085) 817-6635</span>
              </div>
              <div class="contact-line mb-2">
                <v-icon size="16" class="mr-2 text-white">mdi-cellphone</v-icon
                ><span class="text-body-2 text-white">0918-930-4234 • 0917-188-8726</span>
              </div>
              <div class="contact-line mb-2">
                <v-icon size="16" class="mr-2 text-white">mdi-email</v-icon
                ><span class="text-body-2 text-white">bcwdrecords@gmail.com</span>
              </div>
            </div>
            <div>
              <small class="text-body-2 font-weight-medium text-white"
                >Philippines (Asia/Manila)</small
              >
            </div>
          </div>
        </div>
      </v-col>
    </v-row>
    <!-- Desktop Footer -->
    <v-footer
      v-if="!mobile"
      class="py-6 footer-bar consumer-footer"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
    >
      <v-container class="pa-0">
        <v-row no-gutters align="center" class="footer-content px-2 px-sm-4 justify-space-between">
          <div class="consumer-footer-depth copyright d-flex align-center mb-4 mb-md-0">
            <span class="text-body-2 font-weight-medium text-white"
              >&copy; 2025 BCWD Complaint System</span
            >
          </div>
          <div
            class="footer-section contacts d-flex flex-column align-center justify-center flex-grow-1 mx-4"
          >
            <div class="contact-item d-flex align-center gap-2 mb-2">
              <v-icon size="16" class="text-white">mdi-map-marker</v-icon
              ><span class="text-body-2 text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>
            <div class="contact-item d-flex align-center gap-2 mb-2">
              <v-icon size="16" class="text-white">mdi-phone</v-icon
              ><span class="text-body-2 text-white">(085) 817-6635</span>
            </div>
            <div class="contact-item d-flex align-center gap-2 mb-2">
              <v-icon size="16" class="text-white">mdi-cellphone</v-icon
              ><span class="text-body-2 text-white">0918-930-4234 • 0917-188-8726</span>
            </div>
            <div class="contact-item d-flex align-center gap-2 mb-2">
              <v-icon size="16" class="text-white">mdi-email</v-icon
              ><span class="text-body-2 text-white">bcwdrecords@gmail.com</span>
            </div>
          </div>
          <div class="footer-section timezone d-flex align-center mt-4 mt-md-0">
            <small class="text-body-2 font-weight-medium text-white"
              >Philippines (Asia/Manila)</small
            >
          </div>
        </v-row>
      </v-container>
    </v-footer>
    <!-- Report Details Dialog -->
    <v-dialog v-model="dialog" max-width="820">
      <v-card v-if="selectedReport" rounded="xl" class="pa-6">
        <v-card-title class="font-weight-bold mb-4" style="padding: 0;">
          <v-icon start>mdi-file-document</v-icon>
          Complaint Details
        </v-card-title>
        <div v-if="selectedReport" class="mb-6">
          <div class="status-badge-large" :style="{ borderColor: statusHexColors[selectedReport.status] }">
            <div class="status-label-small">STATUS</div>
            <div class="status-value-large" :style="{ color: statusHexColors[selectedReport.status] }">
              {{ (selectedReport.status || 'pending').toUpperCase() }}
            </div>
          </div>
        </div>
        <v-divider class="mb-4" />
        <v-card-text class="pa-0">
          <div class="complaint-details-wrapper">
            <div class="complaint-details-content">
              <div class="info-row mb-3">
                <span class="info-label">Type</span>
                <span class="info-value">{{ selectedReport.type || 'N/A' }}</span>
              </div>
              <div class="info-row mb-3">
                <span class="info-label">Reported by</span>
                <span class="info-value">{{ userName }}</span>
              </div>
              <div class="info-row mb-3">
                <span class="info-label">Severity</span>
                <span class="info-value">{{ selectedReport.severity || 'N/A' }}</span>
              </div>
              <div class="info-row mb-3">
                <span class="info-label">Landmark</span>
                <span class="info-value">{{ selectedReport.landmark || selectedReport.location || 'N/A' }}</span>
              </div>
              <div class="info-row mb-3">
                <span class="info-label">Assigned to</span>
                <span class="info-value">{{ selectedReport.assigned_personnel || 'N/A' }}</span>
              </div>
              <div class="info-row mb-3">
                <span class="info-label">Coordinates</span>
                <span class="info-value text-caption">Lat: {{ selectedReport.latitude || 'N/A' }}<br/>Lng: {{ selectedReport.longitude || 'N/A' }}</span>
              </div>
              <div class="info-row text-caption mb-4" v-if="selectedReport.notes">
                <span class="info-label">Notes</span>
                <span class="info-value">{{ selectedReport.notes }}</span>
              </div>
              <v-divider class="my-4" />
              <h4 class="text-subtitle-2 font-weight-bold mb-3">
                <v-icon start x-small>mdi-image-multiple</v-icon>
                Attached Images
              </h4>
              <v-row v-if="selectedReport.images && selectedReport.images.length" dense>
                <v-col v-for="(img, i) in selectedReport.images" :key="i" cols="12" sm="6">
                  <v-img
                    :src="img"
                    height="140"
                    cover
                    class="rounded cursor-pointer"
                    style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);"
                    @click="openImageViewer(img)"
                  />
                </v-col>
              </v-row>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="dialog-actions pt-4">
          <v-spacer></v-spacer>
          <v-btn color="info" variant="outlined" @click="showMapDialog = true">
            <v-icon start>mdi-map-marker</v-icon> Adjust Map Location
          </v-btn>
          <v-btn color="primary" variant="flat" @click="dialog = false">
            <v-icon start>mdi-close</v-icon>
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Image Zoom Dialog -->
    <v-dialog v-model="showImageViewer" max-width="900" fullscreen>
      <v-card rounded="xl">
        <v-card-title class="font-weight-bold d-flex align-center justify-space-between" style="background: linear-gradient(135deg, #1565c0, #1976d2); color: white;">
          <div>
            <v-icon start>mdi-image</v-icon>
            Image Viewer
          </div>
          <v-btn icon color="white" @click="showImageViewer = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text
          class="d-flex justify-center align-center"
          style="height: calc(100vh - 120px); background: rgba(0, 0, 0, 0.05);"
          @wheel.prevent="(e) => (e.deltaY < 0 ? zoomIn() : zoomOut())"
        >
          <img
            :src="activeImage"
            class="zoomable-image"
            :style="{ transform: `scale(${zoomLevel})`, boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)' }"
          />
        </v-card-text>
        <v-card-actions class="justify-center pa-4" style="background: linear-gradient(135deg, rgba(21, 101, 192, 0.1), rgba(33, 150, 243, 0.08));">
          <v-btn color="primary" icon @click="zoomOut">
            <v-icon>mdi-magnify-minus</v-icon>
          </v-btn>
          <v-btn color="primary" icon @click="resetZoom">
            <v-icon>mdi-magnify</v-icon>
          </v-btn>
          <v-btn color="primary" icon @click="zoomIn">
            <v-icon>mdi-magnify-plus</v-icon>
          </v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="showImageViewer = false">
            <v-icon start>mdi-close</v-icon>
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Map Adjustment Dialog -->
    <v-dialog v-model="showMapDialog" max-width="900">
      <v-card rounded="xl" class="pa-6">
        <v-card-title class="font-weight-bold mb-4" style="padding: 0;">
          <v-icon start>mdi-map-marker</v-icon>
          Adjust Map Location
        </v-card-title>
        <v-divider class="mb-4" />
        <v-card-text class="pa-0">
          <p class="text-caption text-medium-emphasis mb-4">Click on the map to place or move the pin. Then save.</p>
          <div id="report-map" style="height: 400px; width: 100%; border: 2px solid rgba(21, 101, 192, 0.2); border-radius: 12px; z-index: 0; position: relative;"></div>
        </v-card-text>
        <v-card-actions class="pt-4">
          <v-spacer />
          <v-btn color="primary" variant="outlined" @click="showMapDialog = false">
            <v-icon start>mdi-close</v-icon>
            Cancel
          </v-btn>
          <v-btn color="primary" variant="flat" @click="savePin" :disabled="!markerInstance">
            <v-icon start>mdi-check</v-icon> Save Location
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" timeout="2000" location="bottom">
      <template #default>
        <div class="d-flex align-center gap-2">
          <v-icon color="success">mdi-check-circle</v-icon>
          {{ snackbarMessage }}
        </div>
      </template>
    </v-snackbar>
  </v-app>
</template>
<style scoped>
/* Your original styles (unchanged) */
.ph-time {
  opacity: 0.9;
}
.v-navigation-drawer {
  border-right: none !important;
}
.v-list-item--active {
  background-color: rgba(255, 255, 255, 0.12) !important;
}
.bg-footer-light {
  background-color: #1565c0;
}
.bg-footer-dark {
  background-color: #0f1720;
}
.text-white {
  color: white !important;
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
.zoomable-image {
  max-width: 100%;
  max-height: 70vh;
  transition: transform 0.2s ease;
}
.cursor-pointer {
  cursor: pointer;
}
.sidebar-profile {
  padding: 28px 16px 20px !important;
  transition: all 0.3s ease;
}
.profile-avatar {
  border: 3px solid rgba(255, 255, 255, 0.2);
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
.v-navigation-drawer--rail .sidebar-profile {
  display: none !important;
}
.modern-card {
  transition: all 0.3s ease;
}
.modern-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.button-group {
  gap: 12px;
  width: 100%;
}
.flex-btn {
  flex: 1 1 200px;
  max-width: 240px;
  justify-content: center;
}
@media (max-width: 600px) {
  .flex-btn {
    flex: 1 1 100%;
    max-width: 100%;
  }
  .toolbar-title {
    font-size: 1rem !important;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    line-height: 1.2;
    max-width: 50vw;
  }
  .v-app-bar {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }
  .v-container {
    max-width: 100% !important;
  }
}
/* Sidebar lump */
.sidebar-lump {
  position: absolute;
  top: 50%;
  right: -32px;
  transform: translateY(-50%);
  width: 32px;
  height: 72px;
  border-radius: 0 36px 36px 0;
  background-color: #1565c0;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 50;
  box-shadow: 3px 0 12px rgba(0, 0, 0, 0.35);
  transition: all 0.2s ease;
}
.v-theme--dark .sidebar-lump {
  background-color: #0f1720;
}
.sidebar-lump:hover {
  background-color: #1976d2;
  transform: translateY(-50%) scale(1.08);
}
.v-theme--dark .sidebar-lump:hover {
  background-color: #1e293b;
}
.v-navigation-drawer--rail .sidebar-lump {
  right: -32px;
}
.footer-mobile-content {
  width: 100%;
}

.dashboard-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dashboard-app > .v-main {
  flex: 1;
}

  .v-application .v-main__wrap {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .v-main {
    flex: 1;
    min-height: calc(100vh - 64px) !important;
  }

  .dashboard-main {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

.consumer-header {
  position: relative;
  padding: 0 !important;
  overflow: hidden;
  z-index: 30;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.25),
    0 6px 18px rgba(0, 0, 0, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.consumer-header-depth {
  position: absolute;
  inset: 0;
  width: 100vw;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.14),
    rgba(255, 255, 255, 0.05),
    rgba(0, 0, 0, 0.22)
  );
}
.consumer-header-inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  width: 100%;
}
.consumer-header-title {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  letter-spacing: 0.4px;
}
.consumer-header-right {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
.v-theme--dark .consumer-header {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.55),
    0 10px 28px rgba(0, 0, 0, 0.65);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
/* Mobile fixes */
@media (max-width: 600px) {
  .consumer-header-inner {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }
  .consumer-header-title {
    font-size: 0.95rem !important;
    font-weight: 600 !important;
    line-height: 1.2;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: unset !important;
    max-width: 100% !important;
    text-align: left;
  }
  .v-toolbar-title {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: unset !important;
    max-width: 100% !important;
  }
  .v-card-title {
    padding: 12px 14px !important;
    flex-direction: column;
    align-items: flex-start !important;
    gap: 10px;
  }
  .v-card-title .text-h6 {
    font-size: 1rem !important;
  }
  .v-card-title > div:last-child {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 8px;
  }
  .v-card-title .v-btn[icon] {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
  }
  .v-card-title .v-btn[color='primary'] {
    flex: 1;
    font-size: 0.75rem !important;
    height: 40px !important;
    min-height: 40px !important;
    padding: 0 12px !important;
  }
  .v-btn--size-large {
    font-size: 0.75rem !important;
    height: 40px !important;
    min-height: 40px !important;
  }
  .v-chip {
    font-size: 0.65rem !important;
    height: 28px !important;
    padding: 0 8px !important;
  }
  .v-pagination {
    transform: scale(0.9);
  }
  .v-list-item {
    padding: 10px !important;
  }
  .v-list-item-title {
    font-size: 0.85rem !important;
  }
  .v-list-item-subtitle {
    font-size: 0.7rem !important;
  }
  .v-list-item .v-icon {
    font-size: 32px !important;
  }
  .v-chip[size='small'] {
    font-size: 0.6rem !important;
    height: 22px !important;
  }
}
/* Add this to ensure actions are on top */
.dialog-actions {
  z-index: 10;
  position: relative;
}
/* Report Status Chip Styling */
.report-status-chip {
  min-width: 120px !important;
  padding: 8px 16px !important;
  font-size: 1.1rem !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  transition: all 0.3s ease;
}
.report-status-chip:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3) !important;
  transform: scale(1.05);
}
/* Complaint Status Chip Styling */
.complaint-status-chip {
  min-width: 150px !important;
  padding: 12px 24px !important;
  font-size: 1.3rem !important;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
  transition: all 0.3s ease;
}
.complaint-status-chip:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35) !important;
  transform: scale(1.08);
}
/* Status Text Label (no button styling) */
.status-label-container {
  position: absolute;
  top: 16px;
  right: 16px;
  display: inline-block;
}
.status-text-label {
  font-size: 1.2rem;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.85;
}
.complaint-details-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
}
.complaint-details-wrapper .status-text-label {
  position: absolute;
  top: -8px;
  right: 0;
  font-size: 1.1rem;
  font-weight: bold;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: 0.9;
}
.complaint-details-content {
  width: 100%;
}
.v-card-text {
  position: relative;
}

/* ============================= */
/* MODERN UI ENHANCEMENTS */
/* ============================= */

/* Cards */
.v-card {
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  transition: all 0.3s ease;
}

.v-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
}

.v-card.modern-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85)) !important;
  border: 1px solid rgba(21, 101, 192, 0.1);
}

.v-theme--dark .v-card.modern-card {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9), rgba(35, 35, 35, 0.85)) !important;
  border: 1px solid rgba(33, 150, 243, 0.15);
}

/* Chips */
.v-chip {
  font-weight: 600 !important;
  letter-spacing: 0.3px;
  border-radius: 8px !important;
  transition: all 0.3s ease;
}

.v-chip-group .v-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.v-chip-group .v-chip.v-chip--selected {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

/* Buttons */
.v-btn {
  border-radius: 8px !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px !important;
  text-transform: capitalize !important;
  transition: all 0.3s ease !important;
}

.v-btn--flat {
  background: linear-gradient(135deg, #1565c0, #1976d2) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(21, 101, 192, 0.3) !important;
}

.v-btn--flat:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 20px rgba(21, 101, 192, 0.4) !important;
}

.v-btn--outlined {
  border: 2px solid #1565c0 !important;
  color: #1565c0 !important;
}

.v-btn--outlined:hover {
  background: rgba(21, 101, 192, 0.08) !important;
  border-color: #1976d2 !important;
  transform: translateY(-2px);
}

/* Text Fields and Selects */
.v-input__control .v-field {
  border-radius: 8px !important;
  background: rgba(255, 255, 255, 0.6) !important;
  border: 2px solid rgba(21, 101, 192, 0.2) !important;
  transition: all 0.2s ease;
}

.v-input__control .v-field:hover {
  border: 2px solid rgba(21, 101, 192, 0.4) !important;
  background: rgba(21, 101, 192, 0.04) !important;
}

.v-input__control .v-field.v-field--focused {
  border: 2px solid #1565c0 !important;
  background: rgba(21, 101, 192, 0.08) !important;
  box-shadow: 0 0 12px rgba(21, 101, 192, 0.2);
}

.v-theme--dark .v-input__control .v-field {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 2px solid rgba(33, 150, 243, 0.2) !important;
}

/* Dialog Cards */
.v-dialog__content .v-card {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
}

.v-card-title {
  background: linear-gradient(135deg, #1565c0, #1976d2) !important;
  color: white !important;
  font-size: 1.3rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
  padding: 20px 24px !important;
  border-radius: 16px 16px 0 0 !important;
}

/* List Items */
.v-list-item {
  border-radius: 8px !important;
  margin: 4px 8px;
  transition: all 0.2s ease;
}

.v-list-item:hover {
  background: rgba(21, 101, 192, 0.08);
  transform: translateX(4px);
}

.v-list-item.v-list-item--active {
  background: linear-gradient(135deg, rgba(21, 101, 192, 0.15), rgba(33, 150, 243, 0.08)) !important;
  border-left: 4px solid #1565c0;
  color: #1565c0 !important;
}

/* Status Badge Large */
.status-badge-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 32px;
  border: 3px solid;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(21, 101, 192, 0.05), rgba(33, 150, 243, 0.03));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.status-badge-large:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.v-theme--dark .status-badge-large {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.08), rgba(33, 150, 243, 0.04));
}

.status-label-small {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.54);
  margin-bottom: 8px;
}

.v-theme--dark .status-label-small {
  color: rgba(255, 255, 255, 0.54);
}

.status-value-large {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Info Rows */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: rgba(21, 101, 192, 0.04);
  border-left: 3px solid #1565c0;
}

.v-theme--dark .info-row {
  background: rgba(33, 150, 243, 0.08);
  border-left: 3px solid #42a5f5;
}

.info-label {
  font-weight: 600;
  color: #1565c0;
  min-width: 180px;
}

.v-theme--dark .info-label {
  color: #42a5f5;
}

.info-value {
  flex: 1;
  text-align: right;
  color: rgba(0, 0, 0, 0.87);
  padding-left: 12px;
}

.v-theme--dark .info-value {
  color: rgba(255, 255, 255, 0.87);
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #1565c0, #1976d2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #1976d2, #2196F3);
}

.v-theme--dark ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

/* Smooth transitions */
.v-card,
.v-btn,
.v-chip,
.v-list-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: rgba(0, 0, 0, 0.54);
}

.v-theme--dark .empty-state {
  color: rgba(255, 255, 255, 0.54);
}

.empty-state .v-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.4;
}

/* Mobile optimization */
@media (max-width: 600px) {
  .v-card {
    border-radius: 10px !important;
  }

  .status-badge-large {
    padding: 16px 24px;
  }

  .status-value-large {
    font-size: 1.5rem;
  }

  .info-label {
    min-width: 120px;
  }
}

/* Dashboard Header */
.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.v-theme--dark .border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

/* Notification Button */
.notification-btn {
  transition: all 0.3s ease;
}

.notification-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 16px rgba(21, 101, 192, 0.3);
}

/* New Report Button */
.new-report-btn {
  min-width: 140px !important;
  font-size: 1rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 16px rgba(21, 101, 192, 0.3) !important;
}

.new-report-btn:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 24px rgba(21, 101, 192, 0.4) !important;
}
.notification-actions {
  gap: 24px !important;     /* or 32px if you want even more space */
}
</style>