<!-- src/views/system/AdminDashboard.vue — BCWD Redesign 2025 -->
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
watch(theme, (newTheme) => { localStorage.setItem('theme', newTheme); vuetifyTheme.change(newTheme); showSnackbar('Theme changed') })
function toggleTheme() { theme.value = theme.value === 'light' ? 'dark' : 'light' }

// ── Real-time PH Time ───────────────────────────────────
const phTime = ref('')
const timeFormat = ref(localStorage.getItem('timeFormat') || '24')
let timer = null
function updatePhTime() {
  phTime.value = new Intl.DateTimeFormat('en-PH', {
    weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: timeFormat.value === '12', timeZone: 'Asia/Manila',
  }).format(new Date())
}
watch(timeFormat, (val) => { localStorage.setItem('timeFormat', val); updatePhTime(); showSnackbar('Time format changed') })
onMounted(() => { updatePhTime(); timer = setInterval(updatePhTime, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Sidebar ─────────────────────────────────────────────
const drawer = ref(!mobile.value)
const rail = ref(false)
function toggleSidebar() { if (mobile.value) drawer.value = !drawer.value; else rail.value = !rail.value }
watch(mobile, (isMobile) => { if (isMobile) { drawer.value = false; rail.value = false } else { drawer.value = true; rail.value = false } })

// ── View ─────────────────────────────────────────────────
const currentView = ref('dashboard')

// ── Reports ─────────────────────────────────────────────
const reports = ref([])
const loading = ref(true)
const errorMessage = ref('')
const search = ref('')
const selectedStatus = ref('All')
const statuses = ['All', 'New', 'Pending', 'Ongoing', 'Resolved', 'Rejected']

const filteredReports = computed(() => {
  let list = reports.value
  if (search.value.trim()) {
    const term = search.value.toLowerCase()
    list = list.filter((r) => r.type?.toLowerCase().includes(term) || r.landmark?.toLowerCase().includes(term) || r.notes?.toLowerCase().includes(term))
  }
  if (selectedStatus.value === 'New') { list = list.filter((r) => !r.viewed_by_admin) }
  else if (selectedStatus.value !== 'All') { list = list.filter((r) => r.status?.toLowerCase() === selectedStatus.value.toLowerCase()) }
  return list
})

// Summary counts
const summaryCounts = computed(() => ({
  total:    reports.value.length,
  newCount: reports.value.filter(r => !r.viewed_by_admin).length,
  pending:  reports.value.filter(r => r.status === 'pending').length,
  ongoing:  reports.value.filter(r => r.status === 'ongoing').length,
  resolved: reports.value.filter(r => r.status === 'resolved').length,
}))

const itemsPerPage = ref(parseInt(localStorage.getItem('adminItemsPerPage')) || 10)
watch(itemsPerPage, (val) => { localStorage.setItem('adminItemsPerPage', val.toString()); showSnackbar('Items per page changed') })

// ── Dialogs ─────────────────────────────────────────────
const showReportDialog = ref(false)
const selectedReport = ref(null)
const reporterName = ref('')
const showImageViewer = ref(false)
const activeImage = ref('')
const zoomLevel = ref(1)
function openImageViewer(img) { activeImage.value = img; zoomLevel.value = 1; showImageViewer.value = true }
function zoomIn() { zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3) }
function zoomOut() { zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5) }
function resetZoom() { zoomLevel.value = 1 }

const showAssignDialog = ref(false)
const selectedReportForAssign = ref(null)
const assignedPersonnel = ref('')
const personnelOptions = ['Maintenance Team A', 'Maintenance Team B', 'Maintenance Team C']

// ── Map ──────────────────────────────────────────────────
const mapInstance = ref(null)
const mapMarkers = ref([])
const selectedMapPin = ref(null)
const showPinDetails = ref(false)
const mapStatusUpdate = ref('')
const showMapAssignDialog = ref(false)
const mapAssignedPersonnel = ref('')
const highlightedReportId = ref(null)

const statusHexColors = { pending: '#f59e0b', ongoing: '#3b82f6', resolved: '#22c55e', rejected: '#ef4444' }

const reportsWithCoordinates = computed(() => reports.value.filter(r => r.latitude && r.longitude))

// ── Data ─────────────────────────────────────────────────
async function loadReports() {
  loading.value = true
  try {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) throw error
    reports.value = data || []
  } catch (err) { errorMessage.value = err.message || 'Failed to load reports.' }
  finally { loading.value = false }
}

async function updateStatus(reportId, newStatus, personnel = null) {
  const updates = { status: newStatus, viewed_by_admin: true, updated_at: new Date().toISOString() }
  if (personnel) updates.assigned_personnel = personnel
  await supabase.from('reports').update(updates).eq('id', reportId)
  await loadReports()
}

function handleStatusChange(item, newStatus) {
  item.status = newStatus
  if (newStatus === 'ongoing') { selectedReportForAssign.value = item; assignedPersonnel.value = item.assigned_personnel || ''; showAssignDialog.value = true }
  else { updateStatus(item.id, newStatus) }
}

async function confirmAssign() {
  if (!assignedPersonnel.value) { showSnackbar('Please select personnel'); return }
  await updateStatus(selectedReportForAssign.value.id, 'ongoing', assignedPersonnel.value)
  showAssignDialog.value = false; selectedReportForAssign.value = null; assignedPersonnel.value = ''
}

function cancelAssign() {
  selectedReportForAssign.value.status = 'pending'
  showAssignDialog.value = false; selectedReportForAssign.value = null; assignedPersonnel.value = ''
}

async function openReportDetails(report) {
  selectedReport.value = report
  const { data, error } = await supabase.rpc('get_user_full_name', { user_id: report.user_id })
  reporterName.value = error ? 'Unknown' : data || 'Unknown'
  showReportDialog.value = true
  if (!report.viewed_by_admin) {
    await supabase.from('reports').update({ viewed_by_admin: true }).eq('id', report.id)
    const found = reports.value.find((r) => r.id === report.id)
    if (found) found.viewed_by_admin = true
  }
}

async function logout() { await supabase.auth.signOut(); router.replace('/login') }

// ── Map management ───────────────────────────────────────
async function initializeMap() {
  await nextTick()
  const mapContainer = document.getElementById('admin-report-map')
  if (!mapContainer || mapInstance.value) return
  mapInstance.value = L.map('admin-report-map', { preferCanvas: true, zoomControl: true, minZoom: 1, maxZoom: 25, scrollWheelZoom: true }).setView([8.9731, 125.5244], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(mapInstance.value)
  await new Promise(resolve => setTimeout(() => { if (mapInstance.value) { mapInstance.value.invalidateSize(true); loadMapPins() } resolve() }, 300))
}

async function loadMapPins() {
  if (!mapInstance.value) return
  mapMarkers.value.forEach(m => m.remove())
  mapMarkers.value = []
  for (const report of reportsWithCoordinates.value) {
    const latLng = [report.latitude, report.longitude]
    const { data: nameData } = await supabase.rpc('get_user_full_name', { user_id: report.user_id })
    const consumerName = nameData || 'Unknown'
    const statusColor = statusHexColors[report.status] || '#9CCC65'
    const glow = L.circleMarker(latLng, { radius: 20, fillColor: statusColor, color: statusColor, weight: 0, opacity: 0.3, fillOpacity: 0.2 }).addTo(mapInstance.value)
    const marker = L.circleMarker(latLng, { radius: 16, fillColor: statusColor, color: '#fff', weight: 3, opacity: 1, fillOpacity: 0.95 })
      .addTo(mapInstance.value)
      .bindPopup(`<div style="font-size:13px;min-width:160px;font-weight:500;"><strong style="color:#1d4ed8;">${consumerName}</strong><br/><span style="color:#666;">${report.type}</span><br/><small>${report.landmark||'N/A'}</small><br/><small>Status: <strong style="color:${statusColor};">${report.status}</strong></small></div>`)
    marker.on('click', () => { selectedMapPin.value = { ...report, consumerName }; showPinDetails.value = true })
    mapMarkers.value.push(marker, glow)
  }
}

function cleanupMap() {
  if (mapInstance.value) { mapMarkers.value.forEach(m => m.remove()); mapMarkers.value = []; mapInstance.value.remove(); mapInstance.value = null }
}

watch(currentView, async (newView) => { if (newView === 'map') await initializeMap(); else cleanupMap() })
watch(() => reports.value.length, async () => { if (currentView.value === 'map' && mapInstance.value) await loadMapPins() }, { deep: true })

function viewReportFromMap() {
  if (selectedMapPin.value) {
    highlightedReportId.value = selectedMapPin.value.id; showPinDetails.value = false; currentView.value = 'dashboard'
    setTimeout(() => {
      const el = document.querySelector(`[data-report-id="${selectedMapPin.value.id}"]`)
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => { highlightedReportId.value = null }, 5000) }
    }, 100)
  }
}

async function updateMapPinStatus() {
  if (!selectedMapPin.value || !mapStatusUpdate.value) { showSnackbar('Please select a status'); return }
  if (mapStatusUpdate.value === 'ongoing') { mapAssignedPersonnel.value = selectedMapPin.value.assigned_personnel || ''; showMapAssignDialog.value = true; return }
  await performMapStatusUpdate(mapStatusUpdate.value, null)
}

async function performMapStatusUpdate(status, personnel = null) {
  if (!selectedMapPin.value) return
  try {
    const updates = { status, viewed_by_admin: true, updated_at: new Date().toISOString() }
    if (personnel) updates.assigned_personnel = personnel
    const { error } = await supabase.from('reports').update(updates).eq('id', selectedMapPin.value.id)
    if (error) throw error
    selectedMapPin.value.status = status; if (personnel) selectedMapPin.value.assigned_personnel = personnel
    const idx = reports.value.findIndex(r => r.id === selectedMapPin.value.id)
    if (idx !== -1) { reports.value[idx].status = status; if (personnel) reports.value[idx].assigned_personnel = personnel }
    showSnackbar('Status updated'); mapStatusUpdate.value = ''
    if (currentView.value === 'map' && mapInstance.value) await loadMapPins()
  } catch (err) { showSnackbar('Error: ' + err.message) }
}

function confirmMapAssign() { if (!mapAssignedPersonnel.value) { showSnackbar('Please select personnel'); return } performMapStatusUpdate('ongoing', mapAssignedPersonnel.value); showMapAssignDialog.value = false; mapAssignedPersonnel.value = '' }
function cancelMapAssign() { showMapAssignDialog.value = false; mapAssignedPersonnel.value = ''; mapStatusUpdate.value = '' }

// ── Lifecycle ────────────────────────────────────────────
onMounted(async () => { await loadReports() })
onUnmounted(() => { cleanupMap() })

function handleMobileNav(view) { currentView.value = view; if (mobile.value) drawer.value = false }

// ── Snackbar ─────────────────────────────────────────────
const snackbar = ref(false)
const snackbarMessage = ref('')
function showSnackbar(message) { snackbarMessage.value = message; snackbar.value = true }

function statusRowClass(report) {
  if (highlightedReportId.value === report.id) return 'row-highlighted'
  if (!report.viewed_by_admin) return 'row-new'
  return ''
}
</script>

<template>
  <v-app :class="['bcwd-admin', theme]">

    <!-- ─── App Bar ─── -->
    <v-app-bar flat height="60" :class="['admin-appbar', theme]">
      <div class="appbar-inner">
        <button class="menu-toggle" @click="toggleSidebar">
          <v-icon size="22">mdi-menu</v-icon>
        </button>
        <div class="appbar-brand">
          <v-img src="/images/logo.png" width="32" height="32" class="brand-img" />
          <div class="brand-text">
            <span class="brand-name">BCWD</span>
            <span class="brand-role">Admin Dashboard</span>
          </div>
        </div>
        <div class="appbar-right">
          <span class="appbar-time" :class="{ 'd-none': mobile }">{{ phTime }}</span>
        </div>
      </div>
    </v-app-bar>

    <!-- ─── Navigation Drawer ─── -->
    <v-navigation-drawer v-model="drawer" :temporary="mobile" :rail="!mobile && rail" :width="260" :class="['admin-drawer', theme]">
      <div class="drawer-profile" :class="{ 'drawer-profile--rail': !mobile && rail }">
        <div class="admin-av">
          <v-icon size="28" color="white">mdi-shield-account</v-icon>
        </div>
        <div class="admin-info" v-if="!(!mobile && rail)">
          <p class="admin-name">Administrator</p>
          <p class="admin-role-label">System Admin</p>
        </div>
      </div>
      <div class="drawer-divider" />
      <nav class="drawer-nav">
        <button :class="['nav-item', { 'nav-item--active': currentView === 'dashboard' }]" @click="handleMobileNav('dashboard')">
          <v-icon size="20">mdi-view-dashboard-outline</v-icon>
          <span v-if="!(!mobile && rail)" class="nav-label">Dashboard</span>
          <span v-if="summaryCounts.newCount > 0 && !(!mobile && rail)" class="nav-badge">{{ summaryCounts.newCount }}</span>
        </button>
        <button :class="['nav-item', { 'nav-item--active': currentView === 'map' }]" @click="handleMobileNav('map')">
          <v-icon size="20">mdi-map-outline</v-icon>
          <span v-if="!(!mobile && rail)" class="nav-label">Map View</span>
        </button>
        <button :class="['nav-item', { 'nav-item--active': currentView === 'settings' }]" @click="handleMobileNav('settings')">
          <v-icon size="20">mdi-cog-outline</v-icon>
          <span v-if="!(!mobile && rail)" class="nav-label">Settings</span>
        </button>
        <button class="nav-item nav-item--logout" @click="logout">
          <v-icon size="20">mdi-logout</v-icon>
          <span v-if="!(!mobile && rail)" class="nav-label">Sign Out</span>
        </button>
      </nav>
      <div class="rail-toggle" @click="toggleSidebar">
        <v-icon size="18">{{ (!mobile && rail) ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
      </div>
    </v-navigation-drawer>

    <!-- ─── Main ─── -->
    <v-main :class="['admin-main', theme]">
      <div class="admin-container">

        <!-- ═══ Dashboard ═══ -->
        <div v-if="currentView === 'dashboard'">

          <!-- Summary cards -->
          <div class="summary-grid">
            <div :class="['sum-card', theme]" v-for="card in [
              { label: 'Total Reports', value: summaryCounts.total, icon: 'mdi-file-document-multiple', color: '#1d4ed8' },
              { label: 'New / Unread', value: summaryCounts.newCount, icon: 'mdi-star-circle', color: '#ef4444' },
              { label: 'Pending', value: summaryCounts.pending, icon: 'mdi-clock-alert-outline', color: '#f59e0b' },
              { label: 'Ongoing', value: summaryCounts.ongoing, icon: 'mdi-progress-wrench', color: '#3b82f6' },
              { label: 'Resolved', value: summaryCounts.resolved, icon: 'mdi-check-circle-outline', color: '#22c55e' },
            ]" :key="card.label">
              <div class="sum-icon" :style="{ background: card.color + '18', color: card.color }">
                <v-icon size="24">{{ card.icon }}</v-icon>
              </div>
              <div class="sum-body">
                <p class="sum-value">{{ card.value }}</p>
                <p class="sum-label">{{ card.label }}</p>
              </div>
            </div>
          </div>

          <!-- Filter section -->
          <div :class="['filter-card', theme]">
            <div class="filter-top">
              <h2 class="section-title">Complaint Reports</h2>
              <div class="filter-top-right">
                <span class="total-badge">{{ filteredReports.length }} records</span>
              </div>
            </div>

            <!-- Status filter tabs -->
            <div class="status-tabs">
              <button v-for="s in statuses" :key="s"
                :class="['status-tab', { 'status-tab--active': selectedStatus === s }, `status-tab--${s.toLowerCase()}`]"
                @click="selectedStatus = s">
                {{ s }}
              </button>
            </div>

            <!-- Search -->
            <div class="search-wrap">
              <v-icon class="search-icon" size="20">mdi-magnify</v-icon>
              <input v-model="search" class="search-input" placeholder="Search by type, landmark, notes…" />
              <button v-if="search" class="search-clear" @click="search = ''"><v-icon size="16">mdi-close</v-icon></button>
            </div>
          </div>

          <!-- Table -->
          <div :class="['reports-table-wrap', theme]">
            <div v-if="loading" class="table-loading">
              <v-progress-circular indeterminate color="#1d4ed8" size="40" />
            </div>
            <table v-else class="reports-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Landmark</th>
                  <th>Reported</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredReports.length === 0">
                  <td colspan="5" class="table-empty">
                    <v-icon size="48" color="#e2e8f0">mdi-inbox-outline</v-icon>
                    <p>No reports found</p>
                  </td>
                </tr>
                <tr v-for="item in filteredReports.slice(0, itemsPerPage)" :key="item.id"
                  :class="['table-row', { 'table-row--new': !item.viewed_by_admin, 'table-row--highlighted': highlightedReportId === item.id }]"
                  :data-report-id="item.id">
                  <td>
                    <div class="cell-type">
                      <span class="type-dot" />
                      <span>{{ item.type }}</span>
                    </div>
                  </td>
                  <td class="cell-muted">{{ item.landmark || '—' }}</td>
                  <td class="cell-muted cell-date">{{ new Date(item.created_at).toLocaleDateString('en-PH') }}</td>
                  <td>
                    <select :value="item.status" class="status-select" :class="`status-select--${item.status}`"
                      @change="(e) => handleStatusChange(item, e.target.value)">
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-view" @click="openReportDetails(item)">
                        <v-icon size="15" class="mr-1">mdi-eye</v-icon> View
                      </button>
                      <span v-if="!item.viewed_by_admin" class="new-badge">NEW</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ═══ Map View ═══ -->
        <div v-else-if="currentView === 'map'" class="map-view">
          <div :class="['map-card', theme]">
            <div class="map-header">
              <div class="map-header-left">
                <v-icon size="20">mdi-map-marker-multiple</v-icon>
                <span>Consumer Reports Map</span>
              </div>
              <div class="map-header-right">
                <span class="pin-count">{{ reportsWithCoordinates.length }} pins</span>
                <button class="btn-outline-sm" @click="currentView = 'dashboard'">
                  <v-icon size="15" class="mr-1">mdi-arrow-left</v-icon> Back
                </button>
              </div>
            </div>
            <div class="map-legend">
              <span v-for="(color, status) in statusHexColors" :key="status" class="legend-item">
                <span class="legend-dot" :style="{ background: color }" />
                {{ status.charAt(0).toUpperCase() + status.slice(1) }}
              </span>
            </div>
            <div id="admin-report-map" class="map-container" />
          </div>
        </div>

        <!-- ═══ Settings View ═══ -->
        <div v-else-if="currentView === 'settings'" class="view-centered">
          <div :class="['content-card', theme]">
            <div class="content-card-header">
              <div class="settings-icon-wrap"><v-icon size="32" color="#1d4ed8">mdi-cog-outline</v-icon></div>
              <h2 class="content-card-title">Settings</h2>
              <p class="content-card-sub">Manage admin preferences</p>
            </div>
            <div class="settings-group">
              <p class="settings-group-label">Appearance</p>
              <div class="settings-row">
                <div class="settings-row-info"><v-icon size="18">mdi-theme-light-dark</v-icon><span>Theme</span></div>
                <v-select v-model="theme" :items="[{value:'light',title:'Light'},{value:'dark',title:'Dark'}]" density="compact" hide-details variant="outlined" style="width:140px" />
              </div>
            </div>
            <div class="settings-group">
              <p class="settings-group-label">Time Display</p>
              <div class="settings-row">
                <div class="settings-row-info"><v-icon size="18">mdi-clock-outline</v-icon><span>Time Format</span></div>
                <v-select v-model="timeFormat" :items="[{value:'24',title:'24-hour'},{value:'12',title:'12-hour'}]" density="compact" hide-details variant="outlined" style="width:140px" />
              </div>
            </div>
            <div class="settings-group">
              <p class="settings-group-label">Reports Table</p>
              <div class="settings-row">
                <div class="settings-row-info"><v-icon size="18">mdi-view-list</v-icon><span>Rows per page</span></div>
                <v-select v-model="itemsPerPage" :items="[5,10,20,50]" density="compact" hide-details variant="outlined" style="width:140px" />
              </div>
            </div>
            <div class="card-actions mt-4">
              <button class="btn-outline" @click="currentView = 'dashboard'"><v-icon size="16" class="mr-1">mdi-arrow-left</v-icon> Back</button>
            </div>
          </div>
        </div>

      </div>
    </v-main>

    <!-- ─── Pin Details Dialog ─── -->
    <v-dialog v-model="showPinDetails" max-width="540">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-topbar">
          <div class="dialog-topbar-left"><v-icon size="20">mdi-map-pin</v-icon><h3>Pin Details</h3></div>
          <button class="dialog-close" @click="showPinDetails = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body" v-if="selectedMapPin">
          <div :class="['dialog-status', `dialog-status--${selectedMapPin.status || 'pending'}`]">
            <span class="dialog-status-label">STATUS</span>
            <span class="dialog-status-value">{{ (selectedMapPin.status || 'pending').toUpperCase() }}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item" v-for="it in [
              { label: 'Consumer', value: selectedMapPin.consumerName, icon: 'mdi-account' },
              { label: 'Type', value: selectedMapPin.type, icon: 'mdi-format-list-bulleted' },
              { label: 'Severity', value: selectedMapPin.severity || 'N/A', icon: 'mdi-alert' },
              { label: 'Landmark', value: selectedMapPin.landmark || 'N/A', icon: 'mdi-map-marker' },
              { label: 'Assigned to', value: selectedMapPin.assigned_personnel || 'N/A', icon: 'mdi-account-hard-hat' },
            ]" :key="it.label">
              <div class="detail-label"><v-icon size="14">{{ it.icon }}</v-icon> {{ it.label }}</div>
              <div class="detail-value">{{ it.value }}</div>
            </div>
          </div>
          <div class="update-status-row">
            <p class="update-status-label"><v-icon size="15" class="mr-1">mdi-sync</v-icon> Update Status</p>
            <v-select v-model="mapStatusUpdate" :items="['pending','ongoing','resolved','rejected']" label="Select new status" density="compact" hide-details variant="outlined" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="viewReportFromMap"><v-icon size="15" class="mr-1">mdi-eye</v-icon> View in Table</button>
          <button class="btn-outline" @click="showPinDetails = false">Cancel</button>
          <button class="btn-primary" @click="updateMapPinStatus" :disabled="!mapStatusUpdate"><v-icon size="15" class="mr-1">mdi-check</v-icon> Update</button>
        </div>
      </div>
    </v-dialog>

    <!-- ─── Report Details Dialog ─── -->
    <v-dialog v-model="showReportDialog" max-width="720">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-topbar">
          <div class="dialog-topbar-left"><v-icon size="20">mdi-file-document-outline</v-icon><h3>Complaint Details</h3></div>
          <button class="dialog-close" @click="showReportDialog = false"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body" v-if="selectedReport">
          <div :class="['dialog-status', `dialog-status--${selectedReport.status || 'pending'}`]">
            <span class="dialog-status-label">STATUS</span>
            <span class="dialog-status-value">{{ (selectedReport.status || 'pending').toUpperCase() }}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item" v-for="it in [
              { label: 'Type', value: selectedReport.type, icon: 'mdi-format-list-bulleted' },
              { label: 'Reported by', value: reporterName, icon: 'mdi-account' },
              { label: 'Severity', value: selectedReport.severity || 'N/A', icon: 'mdi-alert' },
              { label: 'Landmark', value: selectedReport.landmark || 'N/A', icon: 'mdi-map-marker' },
              { label: 'Assigned to', value: selectedReport.assigned_personnel || 'N/A', icon: 'mdi-account-hard-hat' },
              { label: 'Coordinates', value: selectedReport.latitude ? `${selectedReport.latitude.toFixed(5)}, ${selectedReport.longitude.toFixed(5)}` : 'N/A', icon: 'mdi-crosshairs-gps' },
            ]" :key="it.label">
              <div class="detail-label"><v-icon size="14">{{ it.icon }}</v-icon> {{ it.label }}</div>
              <div class="detail-value">{{ it.value }}</div>
            </div>
            <div v-if="selectedReport.notes" class="detail-item detail-item--full">
              <div class="detail-label"><v-icon size="14">mdi-note-text</v-icon> Notes</div>
              <div class="detail-value">{{ selectedReport.notes }}</div>
            </div>
          </div>
          <div v-if="selectedReport.images && selectedReport.images.length" class="dialog-images">
            <p class="images-label"><v-icon size="14">mdi-image-multiple</v-icon> Attached Images</p>
            <div class="images-grid">
              <img v-for="(img, i) in selectedReport.images" :key="i" :src="img" class="thumb-img" @click="openImageViewer(img)" />
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-primary" @click="showReportDialog = false"><v-icon size="15" class="mr-1">mdi-close</v-icon> Close</button>
        </div>
      </div>
    </v-dialog>

    <!-- ─── Assign Dialog ─── -->
    <v-dialog v-model="showAssignDialog" max-width="480">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-topbar">
          <div class="dialog-topbar-left"><v-icon size="20">mdi-account-hard-hat</v-icon><h3>Assign Personnel</h3></div>
          <button class="dialog-close" @click="cancelAssign"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body">
          <p class="assign-hint">Select a maintenance team to handle this complaint.</p>
          <v-select v-model="assignedPersonnel" :items="personnelOptions" label="Select Personnel" density="comfortable" hide-details variant="outlined" />
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="cancelAssign">Cancel</button>
          <button class="btn-primary" @click="confirmAssign"><v-icon size="15" class="mr-1">mdi-check</v-icon> Assign</button>
        </div>
      </div>
    </v-dialog>

    <!-- ─── Map Assign Dialog ─── -->
    <v-dialog v-model="showMapAssignDialog" max-width="480">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-topbar">
          <div class="dialog-topbar-left"><v-icon size="20">mdi-account-hard-hat</v-icon><h3>Assign Personnel</h3></div>
          <button class="dialog-close" @click="cancelMapAssign"><v-icon size="20">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body">
          <v-select v-model="mapAssignedPersonnel" :items="personnelOptions" label="Select Personnel" density="comfortable" hide-details variant="outlined" />
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="cancelMapAssign">Cancel</button>
          <button class="btn-primary" @click="confirmMapAssign"><v-icon size="15" class="mr-1">mdi-check</v-icon> Assign</button>
        </div>
      </div>
    </v-dialog>

    <!-- ─── Image Viewer ─── -->
    <v-dialog v-model="showImageViewer" fullscreen>
      <div :class="['image-viewer', theme]">
        <div class="image-viewer-bar">
          <span class="font-weight-600">Image Viewer</span>
          <div class="viewer-controls">
            <button class="viewer-btn" @click="zoomOut"><v-icon>mdi-magnify-minus</v-icon></button>
            <button class="viewer-btn" @click="resetZoom"><v-icon>mdi-magnify</v-icon></button>
            <button class="viewer-btn" @click="zoomIn"><v-icon>mdi-magnify-plus</v-icon></button>
            <button class="viewer-btn viewer-btn--close" @click="showImageViewer = false"><v-icon>mdi-close</v-icon></button>
          </div>
        </div>
        <div class="image-viewer-body" @wheel.prevent="(e) => e.deltaY < 0 ? zoomIn() : zoomOut()">
          <img :src="activeImage" :style="{ transform: `scale(${zoomLevel})` }" class="viewer-img" />
        </div>
      </div>
    </v-dialog>

    <!-- ─── Snackbar ─── -->
    <v-snackbar v-model="snackbar" timeout="2500" location="bottom right" :color="theme === 'dark' ? '#1e3a8a' : '#1d4ed8'">
      <div class="d-flex align-center gap-2"><v-icon size="18">mdi-check-circle</v-icon> {{ snackbarMessage }}</div>
    </v-snackbar>
  </v-app>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
* { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }

/* ── Themes ── */
.bcwd-admin.light { --bg: #f0f6ff; --surface: #ffffff; --surface2: #f8fafc; --border: #e2e8f0; --text: #0f172a; --text-muted: #64748b; --sidebar-bg: #1e3a8a; }
.bcwd-admin.dark  { --bg: #060e1a; --surface: #0f1e35; --surface2: #0c1828; --border: rgba(255,255,255,0.08); --text: #f1f5f9; --text-muted: #94a3b8; --sidebar-bg: #070e1c; }

/* ── App Bar ── */
.admin-appbar { background: var(--surface) !important; border-bottom: 1px solid var(--border) !important; box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important; }
.appbar-inner { display: flex; align-items: center; width: 100%; padding: 0 20px; gap: 16px; }
.menu-toggle { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); transition: all 0.2s; }
.menu-toggle:hover { background: var(--surface2); color: #1d4ed8; }
.appbar-brand { display: flex; align-items: center; gap: 10px; }
.brand-img { border-radius: 6px; }
.brand-text { display: flex; flex-direction: column; }
.brand-name { font-size: 14px; font-weight: 800; color: #1e40af; line-height: 1; }
.bcwd-admin.dark .brand-name { color: #60a5fa; }
.brand-role { font-size: 11px; color: var(--text-muted); line-height: 1.2; }
.appbar-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.appbar-time { font-size: 12px; color: var(--text-muted); font-variant-numeric: tabular-nums; }

/* ── Drawer ── */
.admin-drawer { background: var(--sidebar-bg) !important; border-right: none !important; box-shadow: 2px 0 16px rgba(0,0,0,0.15) !important; }
.drawer-profile { display: flex; align-items: center; gap: 14px; padding: 24px 20px 16px; }
.drawer-profile--rail { justify-content: center; padding: 20px 0; }
.admin-av { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08)); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.admin-info { overflow: hidden; }
.admin-name { font-size: 14px; font-weight: 600; color: #fff; margin: 0; }
.admin-role-label { font-size: 11px; color: rgba(255,255,255,0.5); margin: 2px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
.drawer-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 0 16px 12px; }
.drawer-nav { display: flex; flex-direction: column; padding: 0 12px; gap: 4px; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.75); cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 500; width: 100%; text-align: left; position: relative; }
.nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
.nav-item--active { background: rgba(255,255,255,0.12); color: #fff !important; box-shadow: inset 3px 0 0 rgba(255,255,255,0.5); }
.nav-item--logout { margin-top: 24px; color: rgba(255,255,255,0.45); }
.nav-item--logout:hover { color: #fca5a5; background: rgba(239,68,68,0.1); }
.nav-label { flex: 1; }
.nav-badge { background: #ef4444; color: white; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
.rail-toggle { position: absolute; bottom: 32px; right: -16px; width: 32px; height: 64px; border-radius: 0 12px 12px 0; background: var(--sidebar-bg); display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(255,255,255,0.7); box-shadow: 4px 0 12px rgba(0,0,0,0.2); transition: all 0.2s; }
.rail-toggle:hover { color: #fff; }

/* ── Main ── */
.admin-main { background: var(--bg) !important; }
.admin-container { padding: 28px; max-width: 1300px; margin: 0 auto; }

/* ── Summary cards ── */
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
.sum-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; transition: all 0.2s; }
.sum-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.sum-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sum-body { min-width: 0; }
.sum-value { font-size: 28px; font-weight: 800; color: var(--text); margin: 0; line-height: 1; letter-spacing: -1px; }
.sum-label { font-size: 12px; color: var(--text-muted); margin: 4px 0 0; font-weight: 500; }

/* ── Filter card ── */
.filter-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; }
.filter-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-size: 18px; font-weight: 800; color: var(--text); margin: 0; letter-spacing: -0.3px; }
.total-badge { background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
.bcwd-admin.dark .total-badge { background: rgba(29,78,216,0.15); color: #60a5fa; }

/* ── Status tabs ── */
.status-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.status-tab { padding: 7px 16px; border-radius: 20px; border: 1.5px solid var(--border); background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.status-tab:hover { border-color: #1d4ed8; color: #1d4ed8; }
.status-tab--active { border-color: #1d4ed8; background: #1d4ed8; color: white; }
.status-tab--new.status-tab--active    { background: #ef4444; border-color: #ef4444; }
.status-tab--pending.status-tab--active { background: #f59e0b; border-color: #f59e0b; }
.status-tab--ongoing.status-tab--active { background: #3b82f6; border-color: #3b82f6; }
.status-tab--resolved.status-tab--active { background: #22c55e; border-color: #22c55e; }
.status-tab--rejected.status-tab--active { background: #ef4444; border-color: #ef4444; }

/* ── Search ── */
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 14px; color: var(--text-muted); }
.search-input { width: 100%; height: 42px; padding: 0 40px 0 44px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--surface2); color: var(--text); font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: all 0.2s; }
.search-input:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,0.12); }
.search-input::placeholder { color: var(--text-muted); }
.search-clear { position: absolute; right: 12px; width: 24px; height: 24px; border-radius: 50%; border: none; background: var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); }

/* ── Table ── */
.reports-table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.reports-table { width: 100%; border-collapse: collapse; }
.reports-table thead { background: linear-gradient(135deg, #1d4ed8, #2563eb); }
.reports-table thead th { color: white; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; padding: 14px 18px; text-align: left; }
.reports-table tbody tr { border-bottom: 1px solid var(--border); transition: all 0.18s; }
.reports-table tbody tr:last-child { border-bottom: none; }
.table-row:hover { background: rgba(29,78,216,0.03); }
.bcwd-admin.dark .table-row:hover { background: rgba(59,130,246,0.05); }
.table-row--new { background: #fffbeb; }
.bcwd-admin.dark .table-row--new { background: rgba(245,158,11,0.06); }
.table-row--highlighted { background: #eff6ff; box-shadow: inset 4px 0 0 #1d4ed8; }
.bcwd-admin.dark .table-row--highlighted { background: rgba(29,78,216,0.1); }
.reports-table td { padding: 14px 18px; font-size: 14px; color: var(--text); vertical-align: middle; }
.cell-muted { color: var(--text-muted); font-size: 13px; }
.cell-date { white-space: nowrap; }
.cell-type { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.type-dot { width: 8px; height: 8px; border-radius: 50%; background: #1d4ed8; flex-shrink: 0; }
.table-loading { display: flex; justify-content: center; align-items: center; padding: 64px; }
.table-empty { text-align: center; padding: 64px; color: var(--text-muted); }
.table-empty p { margin: 12px 0 0; font-size: 15px; }

/* ── Status select ── */
.status-select { padding: 6px 10px; border-radius: 8px; border: 1.5px solid var(--border); font-size: 13px; font-weight: 600; background: var(--surface2); color: var(--text); cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: all 0.2s; appearance: none; -webkit-appearance: none; min-width: 110px; }
.status-select--pending  { border-color: #f59e0b; color: #92400e; background: #fef3c7; }
.status-select--ongoing  { border-color: #3b82f6; color: #1e40af; background: #dbeafe; }
.status-select--resolved { border-color: #22c55e; color: #166534; background: #dcfce7; }
.status-select--rejected { border-color: #ef4444; color: #991b1b; background: #fee2e2; }

/* ── Table actions ── */
.table-actions { display: flex; align-items: center; gap: 10px; }
.btn-view { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 2px 8px rgba(29,78,216,0.25); }
.btn-view:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(29,78,216,0.35); }
.new-badge { background: #ef4444; color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 10px; letter-spacing: 0.5px; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }

/* ── Map view ── */
.map-view { height: calc(100vh - 120px); }
.map-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; height: 100%; display: flex; flex-direction: column; }
.map-header { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
.map-header-left { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; }
.map-header-right { display: flex; align-items: center; gap: 12px; }
.pin-count { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.map-legend { display: flex; gap: 16px; padding: 10px 20px; background: var(--surface2); border-bottom: 1px solid var(--border); }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: var(--text-muted); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.map-container { flex: 1; }

/* ── Centered views ── */
.view-centered { display: flex; justify-content: center; padding: 40px 24px; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 40px; max-width: 560px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
.content-card-header { text-align: center; margin-bottom: 28px; }
.content-card-title { font-size: 22px; font-weight: 800; color: var(--text); margin: 8px 0 4px; letter-spacing: -0.4px; }
.content-card-sub { font-size: 14px; color: var(--text-muted); margin: 0; }
.settings-icon-wrap { width: 64px; height: 64px; background: #eff6ff; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.bcwd-admin.dark .settings-icon-wrap { background: rgba(29,78,216,0.15); }
.card-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.settings-group { margin-bottom: 20px; }
.settings-group-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin: 0 0 10px; }
.settings-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--surface2); border-radius: 10px; border: 1px solid var(--border); gap: 12px; }
.settings-row-info { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--text); }

/* ── Dialog ── */
.bcwd-dialog { background: var(--surface); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.2); }
.bcwd-dialog.dark { background: #0f1e35; }
.dialog-topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; }
.dialog-topbar-left { display: flex; align-items: center; gap: 10px; }
.dialog-topbar-left h3 { font-size: 15px; font-weight: 700; margin: 0; }
.dialog-close { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; }
.dialog-close:hover { background: rgba(255,255,255,0.2); }
.dialog-body { padding: 22px; }
.dialog-footer { padding: 14px 22px; background: var(--surface2); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
.assign-hint { font-size: 13px; color: var(--text-muted); margin: 0 0 16px; }
.update-status-row { margin-top: 16px; }
.update-status-label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 0 0 8px; display: flex; align-items: center; }

/* ── Dialog status ── */
.dialog-status { display: flex; flex-direction: column; align-items: center; padding: 20px; border-radius: 14px; margin-bottom: 18px; border: 2px solid; }
.dialog-status--pending  { background: #fef3c7; border-color: #f59e0b; }
.dialog-status--ongoing  { background: #dbeafe; border-color: #3b82f6; }
.dialog-status--resolved { background: #dcfce7; border-color: #22c55e; }
.dialog-status--rejected { background: #fee2e2; border-color: #ef4444; }
.bcwd-admin.dark .dialog-status--pending  { background: rgba(245,158,11,0.08); }
.bcwd-admin.dark .dialog-status--ongoing  { background: rgba(59,130,246,0.08); }
.bcwd-admin.dark .dialog-status--resolved { background: rgba(34,197,94,0.08); }
.bcwd-admin.dark .dialog-status--rejected { background: rgba(239,68,68,0.08); }
.dialog-status-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; opacity: 0.6; margin-bottom: 4px; }
.dialog-status-value { font-size: 26px; font-weight: 800; letter-spacing: 1px; }
.dialog-status--pending  .dialog-status-value { color: #92400e; }
.dialog-status--ongoing  .dialog-status-value { color: #1e40af; }
.dialog-status--resolved .dialog-status-value { color: #166534; }
.dialog-status--rejected .dialog-status-value { color: #991b1b; }

/* ── Detail grid ── */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.detail-item { background: var(--surface2); border-radius: 10px; padding: 12px 14px; border: 1px solid var(--border); }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
.bcwd-admin.dark .detail-label { color: #60a5fa; }
.detail-value { font-size: 14px; font-weight: 500; color: var(--text); word-break: break-all; }

/* ── Images ── */
.dialog-images { margin-top: 8px; }
.images-label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 0 0 10px; display: flex; align-items: center; gap: 5px; }
.images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
.thumb-img { width: 100%; height: 110px; object-fit: cover; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid var(--border); }
.thumb-img:hover { transform: scale(1.04); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }

/* ── Image viewer ── */
.image-viewer { width: 100vw; height: 100vh; display: flex; flex-direction: column; }
.image-viewer.light { background: #f8fafc; }
.image-viewer.dark  { background: #060e1a; }
.image-viewer-bar { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
.viewer-controls { display: flex; gap: 8px; }
.viewer-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: all 0.2s; }
.viewer-btn:hover { background: rgba(255,255,255,0.2); }
.viewer-btn--close { background: rgba(239,68,68,0.3); }
.image-viewer-body { flex: 1; display: flex; align-items: center; justify-content: center; }
.viewer-img { max-width: 100%; max-height: 80vh; object-fit: contain; transition: transform 0.2s ease; }

/* ── Buttons ── */
.btn-primary { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; box-shadow: 0 4px 12px rgba(29,78,216,0.3); font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(29,78,216,0.4); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-outline { background: transparent; color: #1d4ed8; border: 1.5px solid #1d4ed8; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-outline:hover { background: rgba(29,78,216,0.06); }
.bcwd-admin.dark .btn-outline { color: #60a5fa; border-color: #60a5fa; }
.btn-outline-sm { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.2s; }
.btn-outline-sm:hover { background: rgba(255,255,255,0.25); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .admin-container { padding: 16px; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .reports-table { font-size: 12px; }
  .reports-table td, .reports-table th { padding: 10px 12px; }
}

/* ── V-field overrides ── */
:deep(.v-field) { border-radius: 10px !important; }
</style>