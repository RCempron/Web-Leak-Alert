<!-- src/views/system/AdminDashboard.vue -->
<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { supabase } from '@/utils/supabase'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
const { mobile } = useDisplay()
const router = useRouter()
const vuetifyTheme = useTheme()
// ── Theme ───────────────────────────────────────────────
const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.change(theme.value)
// Watch theme changes (covers both toggle and settings select)
watch(theme, (newTheme) => {
  localStorage.setItem('theme', newTheme)
  vuetifyTheme.change(newTheme)
})
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  showSnackbar('Theme changed')
}
// ── Real-time PH Time ───────────────────────────────────
const phTime = ref('')
const timeFormat = ref(localStorage.getItem('timeFormat') || '24')
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
    hour12: timeFormat.value === '12',
    timeZone: 'Asia/Manila',
  }).format(now)
}
watch(timeFormat, (val) => {
  localStorage.setItem('timeFormat', val)
  updatePhTime()
  showSnackbar('Time format changed')
})
onMounted(() => {
  updatePhTime()
  timer = setInterval(updatePhTime, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
// ── Sidebar ─────────────────────────────────────────────
const drawer = ref(!mobile.value)
const rail = ref(false)
function toggleSidebar() {
  if (mobile.value) {
    drawer.value = !drawer.value
  } else {
    rail.value = !rail.value
  }
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
// ── View State ──────────────────────────────────────────
const currentView = ref('dashboard')
// ── Map State ────────────────────────────────────────────
const mapInstance = ref(null)
const mapMarkers = ref([])
const selectedMapPin = ref(null)
const showPinDetails = ref(false)
const mapLoading = ref(false)
const mapStatusUpdate = ref('')
const highlightedReportId = ref(null)
const reportsWithCoordinates = computed(() => {
  return reports.value.filter(r => r.latitude && r.longitude)
})
// ── Settings ────────────────────────────────────────────
const itemsPerPage = ref(parseInt(localStorage.getItem('adminItemsPerPage')) || 10)
watch(itemsPerPage, (val) => {
  localStorage.setItem('adminItemsPerPage', val.toString())
  showSnackbar('Items per page changed')
})
// ── Snackbar ────────────────────────────────────────────
const snackbar = ref(false)
const snackbarMessage = ref('')
function showSnackbar(message) {
  snackbarMessage.value = message
  snackbar.value = true
}
// ── Reports Data & Filtering ────────────────────────────
const reports = ref([])
const loading = ref(true)
const errorMessage = ref('')
const search = ref('')
const selectedStatus = ref('All')
const statuses = ['All', 'New', 'Pending', 'Ongoing', 'Resolved', 'Rejected']
const statusColors = {
  All: 'grey',
  New: 'error',
  Pending: 'warning',
  Ongoing: 'primary',
  Resolved: 'success',
  Rejected: 'error',
}
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
  if (selectedStatus.value === 'New') {
    list = list.filter((r) => !r.viewed_by_admin)
  } else if (selectedStatus.value !== 'All') {
    list = list.filter((r) => r.status?.toLowerCase() === selectedStatus.value.toLowerCase())
  }
  return list
})
// ── Report Dialog & Image Viewer ────────────────────────
const showReportDialog = ref(false)
const selectedReport = ref(null)
const reporterName = ref('')
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
// ── Assign Personnel Dialog ─────────────────────────────
const showAssignDialog = ref(false)
const selectedReportForAssign = ref(null)
const assignedPersonnel = ref('')
const showMapAssignDialog = ref(false)
const mapAssignedPersonnel = ref('')
const personnelOptions = ['Maintenance Team A', 'Maintenance Team B', 'Maintenance Team C']
// ── Data Loading ────────────────────────────────────────
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
async function updateStatus(reportId, newStatus, personnel = null) {
  const updates = {
    status: newStatus,
    viewed_by_admin: true,
    updated_at: new Date().toISOString(),
  }
  if (personnel) {
    updates.assigned_personnel = personnel
  }
  await supabase
    .from('reports')
    .update(updates)
    .eq('id', reportId)
  await loadReports()
}
function handleStatusChange(item, newStatus) {
  const oldStatus = item.status
  item.status = newStatus // Optimistic update for UI
  if (oldStatus === 'pending' && newStatus === 'ongoing') {
    selectedReportForAssign.value = item
    assignedPersonnel.value = item.assigned_personnel || ''
    showAssignDialog.value = true
  } else {
    updateStatus(item.id, newStatus)
  }
}
async function confirmAssign() {
  if (!assignedPersonnel.value) {
    showSnackbar('Please select personnel')
    return
  }
  await updateStatus(selectedReportForAssign.value.id, 'ongoing', assignedPersonnel.value)
  showAssignDialog.value = false
  selectedReportForAssign.value = null
  assignedPersonnel.value = ''
}
function cancelAssign() {
  selectedReportForAssign.value.status = 'pending' // Revert optimistic update
  showAssignDialog.value = false
  selectedReportForAssign.value = null
  assignedPersonnel.value = ''
}
async function openReportDetails(report) {
  selectedReport.value = report
  const { data, error } = await supabase.rpc('get_user_full_name', {
    user_id: report.user_id,
  })
  reporterName.value = error ? 'Unknown' : data || 'Unknown'
  showReportDialog.value = true
  if (!report.viewed_by_admin) {
    await supabase.from('reports').update({ viewed_by_admin: true }).eq('id', report.id)
    const found = reports.value.find((r) => r.id === report.id)
    if (found) found.viewed_by_admin = true
  }
}
async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}
// ── Map Management ──────────────────────────────────────
async function initializeMap() {
  await nextTick()
  const mapContainer = document.getElementById('admin-report-map')
  if (!mapContainer || mapInstance.value) return

  mapInstance.value = L.map('admin-report-map', {
    preferCanvas: true,
    zoomControl: true,
    dragging: true,
  }).setView([8.9731, 125.5244], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mapInstance.value)

  // Wait for map to fully render
  await new Promise(resolve => {
    setTimeout(() => {
      if (mapInstance.value) {
        mapInstance.value.invalidateSize(true)
        loadMapPins()
      }
      resolve()
    }, 300)
  })
}

async function loadMapPins() {
  if (!mapInstance.value) return

  // Clear existing markers
  mapMarkers.value.forEach(marker => marker.remove())
  mapMarkers.value = []

  // Create markers for each report with coordinates
  for (const report of reportsWithCoordinates.value) {
    const latLng = [report.latitude, report.longitude]
    
    // Get consumer name
    const { data: nameData } = await supabase.rpc('get_user_full_name', {
      user_id: report.user_id,
    })
    const consumerName = nameData || 'Unknown'

    // Create marker with custom color based on status
    const statusColors = {
      pending: '#FFA726',
      ongoing: '#42A5F5',
      resolved: '#66BB6A',
      rejected: '#EF5350',
    }
    const statusColor = statusColors[report.status] || '#9CCC65'

    // Create outer glow effect
    const glowMarker = L.circleMarker(latLng, {
      radius: 20,
      fillColor: statusColor,
      color: statusColor,
      weight: 0,
      opacity: 0.3,
      fillOpacity: 0.2,
      className: 'marker-glow',
    }).addTo(mapInstance.value)

    // Create main marker (bigger and more noticeable)
    const marker = L.circleMarker(latLng, {
      radius: 16,
      fillColor: statusColor,
      color: '#fff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.95,
      className: 'map-marker-main',
    })
      .addTo(mapInstance.value)
      .bindPopup(`
        <div style="font-size: 13px; min-width: 160px; font-weight: 500;">
          <strong style="color: #1565c0;">${consumerName}</strong><br/>
          <span style="color: #666;">${report.type}</span><br/>
          <small>${report.landmark || 'N/A'}</small><br/>
          <small>Status: <strong style="color: ${statusColor};">${report.status}</strong></small>
        </div>
      `)

    // Add hover effects
    marker.on('mouseover', function() {
      this.setRadius(20)
      this.setStyle({ weight: 4, fillOpacity: 1 })
    })

    marker.on('mouseout', function() {
      this.setRadius(16)
      this.setStyle({ weight: 3, fillOpacity: 0.95 })
    })

    marker.on('click', () => {
      selectedMapPin.value = {
        ...report,
        consumerName,
      }
      showPinDetails.value = true
    })

    mapMarkers.value.push(marker)
    mapMarkers.value.push(glowMarker)
  }
}

function cleanupMap() {
  if (mapInstance.value) {
    mapMarkers.value.forEach(marker => marker.remove())
    mapMarkers.value = []
    mapInstance.value.remove()
    mapInstance.value = null
  }
}

watch(currentView, async (newView) => {
  if (newView === 'map') {
    await initializeMap()
  } else {
    cleanupMap()
  }
})

watch(() => reports.value.length, async () => {
  if (currentView.value === 'map' && mapInstance.value) {
    await loadMapPins()
  }
}, { deep: true })

function viewReportFromMap() {
  if (selectedMapPin.value) {
    highlightedReportId.value = selectedMapPin.value.id
    showPinDetails.value = false
    currentView.value = 'dashboard'
    // Scroll to the highlighted report after a short delay to ensure DOM is updated
    setTimeout(() => {
      const reportElement = document.querySelector(`[data-report-id="${selectedMapPin.value.id}"]`)
      if (reportElement) {
        reportElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        reportElement.classList.add('highlight-report')
        
        // Remove highlight after 5 seconds
        setTimeout(() => {
          reportElement.classList.remove('highlight-report')
          highlightedReportId.value = null
        }, 5000)
      }
    }, 100)
  }
}

async function updateMapPinStatus() {
  if (!selectedMapPin.value || !mapStatusUpdate.value) {
    showSnackbar('Please select a status')
    return
  }

  // If changing to ongoing, show personnel assignment dialog
  if (mapStatusUpdate.value === 'ongoing') {
    mapAssignedPersonnel.value = selectedMapPin.value.assigned_personnel || ''
    showMapAssignDialog.value = true
    return
  }

  // For other statuses, update directly
  await performMapStatusUpdate(mapStatusUpdate.value, null)
}

async function performMapStatusUpdate(status, personnel = null) {
  if (!selectedMapPin.value) return

  try {
    const updates = {
      status: status,
      viewed_by_admin: true,
      updated_at: new Date().toISOString(),
    }

    if (personnel) {
      updates.assigned_personnel = personnel
    }

    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', selectedMapPin.value.id)

    if (error) throw error

    // Update the local pin data
    selectedMapPin.value.status = status
    if (personnel) {
      selectedMapPin.value.assigned_personnel = personnel
    }

    // Update the reports list
    const reportIndex = reports.value.findIndex(r => r.id === selectedMapPin.value.id)
    if (reportIndex !== -1) {
      reports.value[reportIndex].status = status
      if (personnel) {
        reports.value[reportIndex].assigned_personnel = personnel
      }
    }

    showSnackbar('Status updated successfully')
    mapStatusUpdate.value = ''
    
    // Reload map pins to reflect the status color change
    if (currentView.value === 'map' && mapInstance.value) {
      await loadMapPins()
    }
  } catch (err) {
    console.error('Status update error:', err)
    showSnackbar('Error updating status: ' + err.message)
  }
}

function confirmMapAssign() {
  if (!mapAssignedPersonnel.value) {
    showSnackbar('Please select personnel')
    return
  }
  performMapStatusUpdate('ongoing', mapAssignedPersonnel.value)
  showMapAssignDialog.value = false
  mapAssignedPersonnel.value = ''
}

function cancelMapAssign() {
  showMapAssignDialog.value = false
  mapAssignedPersonnel.value = ''
  mapStatusUpdate.value = ''
}
// ── Lifecycle ───────────────────────────────────────────
onMounted(async () => {
  await loadReports()
})
onUnmounted(() => {
  cleanupMap()
})
function handleMobileNav(view) {
  currentView.value = view
  // auto-close drawer ONLY on mobile
  if (mobile.value) {
    drawer.value = false
  }
}
</script>
<template>
  <v-app :theme="theme">
    <!-- App Bar -->
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
      class="admin-header"
    >
      <!-- FULL-WIDTH depth system -->
      <div class="header-depth-layer"></div>
      <div class="header-inner px-2 px-sm-6">
        <v-toolbar-title class="font-weight-bold header-title"> Admin Dashboard </v-toolbar-title>
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
    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :temporary="mobile"
      :rail="!mobile && rail"
      :width="260"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
    >
      <!-- ... rest of drawer content unchanged ... -->
      <v-list nav density="compact">
        <div
          class="sidebar-profile pa-5 d-flex flex-column align-center"
          :class="{ 'd-none': !mobile && rail }"
        >
          <v-avatar size="80" class="mb-4 elevation-6 profile-avatar" color="grey-lighten-4">
            <v-icon size="48" color="primary">mdi-account-circle</v-icon>
          </v-avatar>
          <div class="admin-info text-center">
            <div class="admin-name text-h6 font-weight-medium mb-1">Administrator</div>
            <div class="admin-role text-caption opacity-70">System Administrator</div>
          </div>
        </div>
        <v-divider class="my-3 mx-4" :class="{ 'mt-6': !mobile && rail }" />
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          :active="currentView === 'dashboard'"
          @click="handleMobileNav('dashboard')"
        />
        <v-list-item
          prepend-icon="mdi-map"
          title="Map"
          :active="currentView === 'map'"
          @click="handleMobileNav('map')"
        />
        <v-list-item
          prepend-icon="mdi-cog"
          title="Settings"
          :active="currentView === 'settings'"
          @click="handleMobileNav('settings')"
        />
        <v-list-item prepend-icon="mdi-logout" title="Logout" @click="logout" class="mt-8" />
      </v-list>
      <div class="sidebar-lump" @click="toggleSidebar">
        <v-icon size="22">
          {{ drawer ? 'mdi-chevron-left' : 'mdi-chevron-right' }}
        </v-icon>
      </div>
    </v-navigation-drawer>
    <!-- Main Content -->
    <v-main :class="theme === 'light' ? 'bg-grey-lighten-4' : 'bg-grey-darken-4'">
      <v-container fluid class="pa-4 pa-md-6 pb-6 pb-md-10">
        <!-- Dashboard View -->
        <div v-if="currentView === 'dashboard'">
          <!-- ... unchanged dashboard content ... -->
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
            :items-per-page="itemsPerPage"
            :footer-props="{ itemsPerPageOptions: [] }"
            class="elevation-1"
          >
            <!-- templates unchanged -->
            <template #item="{ item, index }">
              <tr 
                :key="item.id" 
                :data-report-id="item.id"
                :class="['data-table-row', { 'highlight-report': highlightedReportId === item.id }]"
              >
                <td>{{ item.type }}</td>
                <td>{{ item.landmark }}</td>
                <td>{{ new Date(item.created_at).toLocaleDateString('en-PH') }}</td>
                <td>
                  <v-select
                    :model-value="item.status"
                    :items="['pending', 'ongoing', 'resolved', 'rejected']"
                    density="compact"
                    hide-details
                    @update:modelValue="(v) => handleStatusChange(item, v)"
                  />
                </td>
                <td>
                  <div class="d-flex align-center gap-4">
                    <v-btn size="small" color="primary" @click="openReportDetails(item)">
                      View details
                    </v-btn>
                    <v-chip v-if="!item.viewed_by_admin" color="error" size="small" label>NEW</v-chip>
                  </div>
                </td>
              </tr>
            </template>
          </v-data-table>
        </div>
        <!-- Settings View -->
        <div v-else-if="currentView === 'settings'">
          <!-- ... unchanged settings card ... -->
          <v-card
            class="pa-3 pa-sm-5 text-center modern-card mx-auto"
            :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            elevation="10"
            rounded="xl"
            max-width="700"
          >
            <!-- ... full settings content unchanged ... -->
            <v-avatar size="90" class="mb-4">
              <v-icon size="90" color="primary">mdi-cog</v-icon>
            </v-avatar>
            <h2 class="font-weight-bold mb-2">Settings</h2>
            <p class="text-medium-emphasis mb-6">Manage your application settings</p>
            <v-list lines="one" class="pa-0">
              <v-list-group value="appearance">
                <template v-slot:activator="{ props }">
                  <v-list-item v-bind="props" prepend-icon="mdi-palette" title="Appearance" />
                </template>
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
              <!-- time-display and reports groups unchanged -->
              <v-list-group value="time-display">
                <template v-slot:activator="{ props }">
                  <v-list-item
                    v-bind="props"
                    prepend-icon="mdi-clock-outline"
                    title="Time Display"
                  />
                </template>
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
                <template v-slot:activator="{ props }">
                  <v-list-item
                    v-bind="props"
                    prepend-icon="mdi-file-document-multiple"
                    title="Reports"
                  />
                </template>
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
              <v-btn variant="outlined" size="large" @click="currentView = 'dashboard'">
                <v-icon start>mdi-arrow-left</v-icon> Back to Dashboard
              </v-btn>
            </div>
          </v-card>
        </div>
        <!-- Map View -->
        <div v-else-if="currentView === 'map'" style="height: calc(100vh - 200px)">
          <v-card flat style="height: 100%; display: flex; flex-direction: column">
            <v-card-title class="font-weight-bold d-flex align-center justify-space-between">
              <span>Consumer Reports Map</span>
              <v-chip 
                color="info" 
                variant="outlined"
                :label="`${reportsWithCoordinates.length} Pins`"
              />
            </v-card-title>
            <v-divider />
            <v-card-text style="flex: 1; padding: 0; overflow: hidden">
              <div id="admin-report-map" style="width: 100%; height: 100%; border-radius: 8px 8px 0 0"></div>
            </v-card-text>
            <v-card-actions>
              <v-btn variant="outlined" @click="currentView = 'dashboard'">
                <v-icon start>mdi-arrow-left</v-icon> Back to Dashboard
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>
      </v-container>
    </v-main>
    <!-- Pin Details Dialog -->
    <v-dialog v-model="showPinDetails" max-width="500">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="font-weight-bold">Pin Details</v-card-title>
        <v-divider />
        <v-card-text v-if="selectedMapPin">
          <p><strong>Consumer:</strong> {{ selectedMapPin.consumerName }}</p>
          <p><strong>Type:</strong> {{ selectedMapPin.type }}</p>
          <p><strong>Severity:</strong> {{ selectedMapPin.severity || 'N/A' }}</p>
          <p><strong>Landmark:</strong> {{ selectedMapPin.landmark || 'N/A' }}</p>
          <p><strong>Notes:</strong> {{ selectedMapPin.notes || 'N/A' }}</p>
          <p><strong>Assigned to:</strong> {{ selectedMapPin.assigned_personnel || 'N/A' }}</p>
          <p><strong>Current Status:</strong> <v-chip :color="statusColors[selectedMapPin.status]" size="small">{{ selectedMapPin.status }}</v-chip></p>
          <!-- <p><strong>Coordinates:</strong><br/>Lat: {{ selectedMapPin.latitude }}<br/>Lng: {{ selectedMapPin.longitude }}</p> -->
          
          <v-divider class="my-4" />
          <p class="font-weight-bold mb-2">Update Status</p>
          <v-select
            v-model="mapStatusUpdate"
            :items="['pending', 'ongoing', 'resolved', 'rejected']"
            label="Select new status"
            density="compact"
            outlined
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPinDetails = false">Close</v-btn>
          <v-btn color="primary" variant="flat" @click="updateMapPinStatus" :disabled="!mapStatusUpdate">
            <v-icon start>mdi-check</v-icon> Update Status
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Map Assign Personnel Dialog -->
    <v-dialog v-model="showMapAssignDialog" max-width="500">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="font-weight-bold">Assign Personnel</v-card-title>
        <v-divider />
        <v-card-text>
          <v-select
            v-model="mapAssignedPersonnel"
            :items="personnelOptions"
            label="Select Personnel"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelMapAssign">Cancel</v-btn>
          <v-btn color="primary" @click="confirmMapAssign">Assign</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Dialogs and Snackbar unchanged -->
    <v-dialog v-model="showReportDialog" max-width="820">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="font-weight-bold">Complaint Details</v-card-title>
        <v-divider />
        <v-card-text v-if="selectedReport">
          <p><strong>Type:</strong> {{ selectedReport.type }}</p>
          <p><strong>Reported by:</strong> {{ reporterName }}</p>
          <p><strong>Severity:</strong> {{ selectedReport.severity || 'N/A' }}</p>
          <p><strong>Landmark:</strong> {{ selectedReport.landmark || 'N/A' }}</p>
          <p>
            <strong>Coordinates:</strong> Lat: {{ selectedReport.latitude || 'N/A' }} Lng:
            {{ selectedReport.longitude || 'N/A' }}
          </p>
          <p><strong>Notes:</strong> {{ selectedReport.notes || 'N/A' }}</p>
          <p><strong>Assigned to:</strong> {{ selectedReport.assigned_personnel || 'N/A' }}</p>
          <v-row dense class="mt-4">
            <v-col v-for="(img, i) in selectedReport.images || []" :key="i" cols="12" sm="6">
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
    <!-- Assign Personnel Dialog -->
    <v-dialog v-model="showAssignDialog" max-width="500">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="font-weight-bold">Assign Personnel</v-card-title>
        <v-divider />
        <v-card-text>
          <v-select
            v-model="assignedPersonnel"
            :items="personnelOptions"
            label="Select Personnel"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelAssign">Cancel</v-btn>
          <v-btn color="primary" @click="confirmAssign">Assign</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="snackbar" timeout="2000" color="success" location="bottom">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-app>
</template>
<style scoped>
/* All your existing styles remain unchanged */
.ph-time {
  opacity: 0.9;
}
.sidebar-profile {
  padding: 28px 16px 20px !important;
}
.profile-avatar {
  border: 3px solid rgba(255, 255, 255, 0.2);
  background-color: white !important;
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
.zoomable-image {
  max-width: 100%;
  max-height: 70vh;
  transition: transform 0.2s ease;
}
.cursor-pointer {
  cursor: pointer;
}
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
/* Map styles */
#admin-report-map {
  position: relative;
  z-index: 1;
}
.leaflet-popup-content {
  font-family: 'Roboto', sans-serif !important;
  margin: 0 !important;
}
.leaflet-popup {
  margin-bottom: 0 !important;
}
/* Highlight Report Row */
.data-table-row {
  transition: all 0.3s ease;
}
.highlight-report {
  background: linear-gradient(90deg, rgba(21, 101, 192, 0.15), rgba(33, 150, 243, 0.08)) !important;
  box-shadow: inset 3px 0 0 0 #1565c0;
  animation: highlightPulse 2s ease-in-out;
}
@keyframes highlightPulse {
  0% {
    background: linear-gradient(90deg, rgba(21, 101, 192, 0.35), rgba(33, 150, 243, 0.2)) !important;
    box-shadow: inset 3px 0 0 0 #1565c0, 0 0 12px rgba(21, 101, 192, 0.4);
  }
  50% {
    background: linear-gradient(90deg, rgba(21, 101, 192, 0.25), rgba(33, 150, 243, 0.15)) !important;
  }
  100% {
    background: linear-gradient(90deg, rgba(21, 101, 192, 0.15), rgba(33, 150, 243, 0.08)) !important;
    box-shadow: inset 3px 0 0 0 #1565c0;
  }
}
/* Clear highlighting after 5 seconds */
.highlight-report.fade-out {
  animation: fadeOutHighlight 0.5s ease-in-out forwards;
}
@keyframes fadeOutHighlight {
  from {
    background: linear-gradient(90deg, rgba(21, 101, 192, 0.15), rgba(33, 150, 243, 0.08)) !important;
    box-shadow: inset 3px 0 0 0 #1565c0;
  }
  to {
    background: transparent;
    box-shadow: none;
  }
}
</style>