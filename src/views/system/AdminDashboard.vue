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

// ── Inline status update inside Complaint Details dialog ─
const dialogStatusUpdate = ref('')
watch(showReportDialog, (val) => {
  if (val && selectedReport.value) dialogStatusUpdate.value = selectedReport.value.status || ''
})

async function confirmDialogStatusUpdate() {
  await nextTick()
  if (!dialogStatusUpdate.value || !selectedReport.value) return
  if (dialogStatusUpdate.value === selectedReport.value.status) return
  if (dialogStatusUpdate.value === 'ongoing') {
    selectedReportForAssign.value = selectedReport.value
    assignedPersonnel.value = selectedReport.value.assigned_personnel || ''
    showAssignDialog.value = true
    return
  }
  await updateStatus(selectedReport.value.id, dialogStatusUpdate.value)
  selectedReport.value.status = dialogStatusUpdate.value
  showSnackbar('Status updated successfully')
}

// ── Print/Save PDF ───────────────────────────────────────
function printReport() {
  if (!selectedReport.value) return
  const r = selectedReport.value
  const statusColors = { pending: '#92400e', ongoing: '#1e40af', resolved: '#166534', rejected: '#991b1b' }
  const statusBg     = { pending: '#fef3c7', ongoing: '#dbeafe', resolved: '#dcfce7', rejected: '#fee2e2' }
  const statusBorder = { pending: '#f59e0b', ongoing: '#3b82f6', resolved: '#22c55e', rejected: '#ef4444' }
  const st = r.status || 'pending'

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Complaint Report – ${r.type}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f0f6ff; padding: 32px; color: #0f172a; }
    .card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); max-width: 720px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 28px 32px; display: flex; align-items: center; gap: 18px; }
    .header-logo { width: 52px; height: 52px; background: rgba(255,255,255,0.18); border-radius: 14px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.25); font-size: 22px; color: white; font-weight: 800; }
    .header-info h1 { font-size: 20px; font-weight: 800; color: white; }
    .header-info p  { font-size: 13px; color: rgba(255,255,255,0.75); margin-top: 4px; }
    .status-badge { margin: 24px 32px 0; display: inline-block; padding: 10px 22px; border-radius: 10px; font-size: 13px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; background: ${statusBg[st]}; border: 2px solid ${statusBorder[st]}; color: ${statusColors[st]}; }
    .body { padding: 22px 32px 28px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .item { background: #f0f6ff; border-radius: 10px; padding: 12px 14px; border: 1px solid #bfdbfe; }
    .item-lbl { font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .item-val { font-size: 14px; font-weight: 600; color: #0f172a; }
    .full { grid-column: 1 / -1; }
    .notes { background: #f8fafc; border-radius: 10px; padding: 14px; border: 1px solid #e2e8f0; margin-bottom: 18px; }
    .notes-lbl { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .notes-val { font-size: 14px; color: #0f172a; line-height: 1.6; }
    .footer-strip { background: #1e3a8a; color: rgba(255,255,255,0.8); font-size: 11px; padding: 12px 32px; display: flex; justify-content: space-between; }
    @media print { body { background: white; padding: 0; } .card { box-shadow: none; border-radius: 0; } }
  </style></head><body>
  <div class="card">
    <div class="header">
      <div class="header-logo">B</div>
      <div class="header-info">
        <h1>BCWD Complaint Report</h1>
        <p>Butuan City Water District — Complaint Management System</p>
      </div>
    </div>
    <div style="padding:0 32px;">
      <div class="status-badge">Status: ${st.toUpperCase()}</div>
    </div>
    <div class="body">
      <div class="grid">
        <div class="item"><div class="item-lbl">Complaint Type</div><div class="item-val">${r.type || 'N/A'}</div></div>
        <div class="item"><div class="item-lbl">Reported By</div><div class="item-val">${reporterName.value || 'N/A'}</div></div>
        <div class="item"><div class="item-lbl">Severity</div><div class="item-val">${r.severity || 'N/A'}</div></div>
        <div class="item"><div class="item-lbl">Landmark</div><div class="item-val">${r.landmark || 'N/A'}</div></div>
        <div class="item"><div class="item-lbl">Assigned To</div><div class="item-val">${r.assigned_personnel || 'N/A'}</div></div>
        <div class="item"><div class="item-lbl">Coordinates</div><div class="item-val">${r.latitude ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}` : 'N/A'}</div></div>
        <div class="item full"><div class="item-lbl">Date Reported</div><div class="item-val">${new Date(r.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</div></div>
      </div>
      ${r.notes ? `<div class="notes"><div class="notes-lbl">Notes</div><div class="notes-val">${r.notes}</div></div>` : ''}
    </div>
    <div class="footer-strip">
      <span>© 2025 BCWD Complaint System</span>
      <span>Printed: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
      <span>Gov. Jose A. Rosales Ave., Butuan City</span>
    </div>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

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
  if (selectedReport.value && selectedReport.value.id === selectedReportForAssign.value.id) {
    selectedReport.value.status = 'ongoing'
    dialogStatusUpdate.value = 'ongoing'
  }
  showAssignDialog.value = false; selectedReportForAssign.value = null; assignedPersonnel.value = ''
}

function cancelAssign() {
  if (selectedReportForAssign.value) selectedReportForAssign.value.status = 'pending'
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
      .bindPopup(
        `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;min-width:180px;padding:4px 2px;">
          <div style="font-weight:800;font-size:14px;color:#1d4ed8;margin-bottom:6px;">${consumerName}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;">Type</span>
            <span style="font-weight:600;color:#0f172a;">${report.type}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;">Landmark</span>
            <span style="font-weight:600;color:#0f172a;">${report.landmark || 'N/A'}</span>
          </div>
          <div style="margin-top:8px;padding:6px 10px;border-radius:8px;background:${statusColor}22;border:1px solid ${statusColor};text-align:center;">
            <span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${statusColor};">● ${report.status.toUpperCase()}</span>
          </div>
        </div>`,
        { closeButton: false, autoClose: false, closeOnClick: false }
      )

    marker.on('mouseover', function () { this.openPopup() })
    marker.on('mouseout',  function () { this.closePopup() })
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
  <v-app :class="['bcwd-app', theme]">

    <!-- ─── App Bar ─── -->
    <v-app-bar flat height="56" :class="['bcwd-header', theme]">
      <div class="header-inner">
        <button class="menu-btn" @click="toggleSidebar" aria-label="Toggle menu">
          <v-icon size="22" color="#1e40af">mdi-menu</v-icon>
        </button>
        <div class="header-brand">
          <v-img src="/images/logo.png" width="28" height="28" class="header-img" />
          <span class="header-title">BCWD Complaint System</span>
          <span class="header-role-badge">Admin</span>
        </div>
        <div class="header-right">
          <span class="header-time d-none d-sm-block">{{ phTime }}</span>
        </div>
      </div>
    </v-app-bar>

    <!-- ─── Sidebar ─── -->
    <v-navigation-drawer v-model="drawer" :temporary="mobile" :rail="!mobile && rail" :width="250" class="bcwd-sidebar">
      <div class="sidebar-profile" :class="{ 'sidebar-profile--rail': !mobile && rail }">
        <div class="admin-av">
          <v-icon size="26" color="white">mdi-shield-account</v-icon>
        </div>
        <div class="profile-meta" v-if="!(!mobile && rail)">
          <p class="profile-name">Administrator</p>
          <p class="profile-role">System Admin</p>
        </div>
      </div>
      <div class="sidebar-sep" />
      <nav class="sidebar-nav">
        <button :class="['s-nav-item', { 's-nav-item--active': currentView === 'dashboard' }]" @click="handleMobileNav('dashboard')">
          <v-icon size="19">mdi-view-dashboard-outline</v-icon>
          <span v-if="!(!mobile && rail)" class="s-nav-label">Dashboard</span>
          <span v-if="summaryCounts.newCount > 0 && !(!mobile && rail)" class="s-nav-badge">{{ summaryCounts.newCount }}</span>
        </button>
        <button :class="['s-nav-item', { 's-nav-item--active': currentView === 'map' }]" @click="handleMobileNav('map')">
          <v-icon size="19">mdi-map-outline</v-icon>
          <span v-if="!(!mobile && rail)" class="s-nav-label">Map View</span>
        </button>
        <button :class="['s-nav-item', { 's-nav-item--active': currentView === 'settings' }]" @click="handleMobileNav('settings')">
          <v-icon size="19">mdi-cog-outline</v-icon>
          <span v-if="!(!mobile && rail)" class="s-nav-label">Settings</span>
        </button>
        <button class="s-nav-item s-nav-item--logout" @click="logout">
          <v-icon size="19">mdi-logout</v-icon>
          <span v-if="!(!mobile && rail)" class="s-nav-label">Sign Out</span>
        </button>
      </nav>
      <div class="rail-lump" @click="toggleSidebar">
        <v-icon size="16" color="white">{{ (!mobile && rail) ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
      </div>
    </v-navigation-drawer>

    <!-- ─── Main ─── -->
    <v-main :class="['bcwd-main', theme]">
      <div class="view-full">

        <!-- ═══ DASHBOARD VIEW ═══ -->
        <div v-if="currentView === 'dashboard'">

          <div class="page-hdr">
            <div>
              <h1 class="page-title">Complaint Reports</h1>
              <p class="page-sub">Monitor and manage all consumer water service reports</p>
            </div>
          </div>

          <!-- Summary cards -->
          <div class="summary-grid">
            <div :class="['sum-card', theme]" v-for="card in [
              { label: 'Total Reports',  value: summaryCounts.total,    icon: 'mdi-file-document-multiple',  color: '#1d4ed8', bg: '#eff6ff' },
              { label: 'New / Unread',   value: summaryCounts.newCount, icon: 'mdi-star-circle',             color: '#ef4444', bg: '#fee2e2' },
              { label: 'Pending',        value: summaryCounts.pending,  icon: 'mdi-clock-alert-outline',     color: '#f59e0b', bg: '#fef3c7' },
              { label: 'Ongoing',        value: summaryCounts.ongoing,  icon: 'mdi-progress-wrench',         color: '#3b82f6', bg: '#dbeafe' },
              { label: 'Resolved',       value: summaryCounts.resolved, icon: 'mdi-check-circle-outline',   color: '#22c55e', bg: '#dcfce7' },
            ]" :key="card.label">
              <div class="sum-icon" :style="{ background: card.bg, color: card.color }">
                <v-icon size="22">{{ card.icon }}</v-icon>
              </div>
              <div class="sum-body">
                <p class="sum-value" :style="{ color: card.color }">{{ card.value }}</p>
                <p class="sum-label">{{ card.label }}</p>
              </div>
            </div>
          </div>

          <!-- Filter + search card -->
          <div :class="['filter-card', theme]">
            <div class="filter-top">
              <h2 class="section-title">All Reports</h2>
              <span class="total-badge">{{ filteredReports.length }} records</span>
            </div>
            <div class="status-tabs">
              <button v-for="s in statuses" :key="s"
                :class="['f-chip', `f-chip--${s.toLowerCase()}`, { 'f-chip--on': selectedStatus === s }]"
                @click="selectedStatus = s">
                {{ s }}
              </button>
            </div>
            <div class="search-wrap">
              <v-icon class="search-icon" size="18" color="#94a3b8">mdi-magnify</v-icon>
              <input v-model="search" class="search-input" placeholder="Search by type, landmark, notes…" />
              <button v-if="search" class="search-clear" @click="search = ''">
                <v-icon size="15" color="#94a3b8">mdi-close</v-icon>
              </button>
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
                    <v-icon size="48" color="#cbd5e1">mdi-inbox-outline</v-icon>
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
                    <div class="status-select-wrap">
                      <select
                        :value="item.status"
                        class="status-select"
                        :class="`status-select--${item.status}`"
                        @change="(e) => handleStatusChange(item, e.target.value)"
                      >
                        <option value="pending">Pending</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <v-icon class="status-select-caret" size="13">mdi-chevron-down</v-icon>
                      <span class="status-select-hint">
                        <v-icon size="10">mdi-pencil-outline</v-icon> Click to change
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-view" @click="openReportDetails(item)">
                        <v-icon size="14" class="mr-1">mdi-eye</v-icon> View
                      </button>
                      <span v-if="!item.viewed_by_admin" class="new-badge">NEW</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        <!-- ═══ MAP VIEW ═══ -->
        <div v-else-if="currentView === 'map'" class="map-view">
          <div class="page-hdr">
            <div>
              <h1 class="page-title">Map View</h1>
              <p class="page-sub">Geographic overview of all pinned consumer reports</p>
            </div>
            <button class="btn-outline" @click="currentView = 'dashboard'">
              <v-icon size="16" class="mr-1">mdi-arrow-left</v-icon> Back to Dashboard
            </button>
          </div>
          <div :class="['map-card', theme]">
            <div class="map-card-header">
              <div class="map-card-header-left">
                <div class="map-header-icon">
                  <v-icon size="20" color="white">mdi-map-marker-multiple</v-icon>
                </div>
                <div>
                  <p class="map-header-title">Consumer Reports Map</p>
                  <p class="map-header-sub">Hover any pin to preview · Click to manage</p>
                </div>
              </div>
              <span class="pin-count-badge">{{ reportsWithCoordinates.length }} pins</span>
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

        <!-- ═══ SETTINGS VIEW ═══ -->
        <div v-else-if="currentView === 'settings'">
          <div class="page-hdr">
            <div>
              <h1 class="page-title">Settings</h1>
              <p class="page-sub">Manage your admin preferences and display options</p>
            </div>
          </div>
          <div class="settings-hero">
            <div class="settings-hero-icon"><v-icon size="36" color="white">mdi-cog</v-icon></div>
            <div>
              <h2 class="settings-hero-title">Admin Settings</h2>
              <p class="settings-hero-sub">Manage your application preferences</p>
            </div>
          </div>
          <div class="settings-grid">
            <!-- Appearance -->
            <div :class="['s-card', theme]">
              <div class="s-card-header">
                <div class="s-card-icon" style="background:#eff6ff;"><v-icon size="20" color="#1d4ed8">mdi-palette-outline</v-icon></div>
                <div>
                  <h3 class="s-card-title">Appearance</h3>
                  <p class="s-card-sub">Customize how the app looks</p>
                </div>
              </div>
              <div class="s-options">
                <div class="s-option">
                  <div class="s-option-info">
                    <v-icon size="18" color="#64748b">mdi-theme-light-dark</v-icon>
                    <div>
                      <p class="s-option-label">Color Theme</p>
                      <p class="s-option-desc">Switch between light and dark mode</p>
                    </div>
                  </div>
                  <div class="theme-toggle-group">
                    <button :class="['theme-btn', { 'theme-btn--on': theme === 'light' }]" @click="theme = 'light'">
                      <v-icon size="15">mdi-white-balance-sunny</v-icon> Light
                    </button>
                    <button :class="['theme-btn', { 'theme-btn--on': theme === 'dark' }]" @click="theme = 'dark'">
                      <v-icon size="15">mdi-weather-night</v-icon> Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Time Display -->
            <div :class="['s-card', theme]">
              <div class="s-card-header">
                <div class="s-card-icon" style="background:#f0fdf4;"><v-icon size="20" color="#16a34a">mdi-clock-outline</v-icon></div>
                <div>
                  <h3 class="s-card-title">Time Display</h3>
                  <p class="s-card-sub">Set your preferred time format</p>
                </div>
              </div>
              <div class="s-options">
                <div class="s-option">
                  <div class="s-option-info">
                    <v-icon size="18" color="#64748b">mdi-clock-time-twelve-outline</v-icon>
                    <div>
                      <p class="s-option-label">Time Format</p>
                      <p class="s-option-desc">Choose 12-hour or 24-hour clock</p>
                    </div>
                  </div>
                  <div class="theme-toggle-group">
                    <button :class="['theme-btn', { 'theme-btn--on': timeFormat === '24' }]" @click="timeFormat = '24'">24h</button>
                    <button :class="['theme-btn', { 'theme-btn--on': timeFormat === '12' }]" @click="timeFormat = '12'">12h</button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Reports Display -->
            <div :class="['s-card', theme]">
              <div class="s-card-header">
                <div class="s-card-icon" style="background:#fef3c7;"><v-icon size="20" color="#d97706">mdi-file-document-multiple-outline</v-icon></div>
                <div>
                  <h3 class="s-card-title">Reports Display</h3>
                  <p class="s-card-sub">Control how many records appear per page</p>
                </div>
              </div>
              <div class="s-options">
                <div class="s-option">
                  <div class="s-option-info">
                    <v-icon size="18" color="#64748b">mdi-view-list</v-icon>
                    <div>
                      <p class="s-option-label">Rows per Page</p>
                      <p class="s-option-desc">Reports shown in the table</p>
                    </div>
                  </div>
                  <div class="items-select-group">
                    <button v-for="n in [5,10,20,50]" :key="n"
                      :class="['items-btn', { 'items-btn--on': itemsPerPage === n }]"
                      @click="itemsPerPage = n">{{ n }}</button>
                  </div>
                </div>
              </div>
            </div>
            <!-- About -->
            <div :class="['s-card', theme]">
              <div class="s-card-header">
                <div class="s-card-icon" style="background:#f5f3ff;"><v-icon size="20" color="#7c3aed">mdi-information-outline</v-icon></div>
                <div>
                  <h3 class="s-card-title">About</h3>
                  <p class="s-card-sub">System and contact information</p>
                </div>
              </div>
              <div class="about-info">
                <div class="about-row"><span class="about-lbl">System</span><span class="about-val">BCWD Complaint System</span></div>
                <div class="about-row"><span class="about-lbl">Version</span><span class="about-val">2025.1</span></div>
                <div class="about-row"><span class="about-lbl">Hotline</span><span class="about-val">(085) 817-6635</span></div>
                <div class="about-row"><span class="about-lbl">Email</span><span class="about-val">bcwdrecords@gmail.com</span></div>
                <div class="about-row"><span class="about-lbl">Address</span><span class="about-val">Gov. Jose A. Rosales Ave., Butuan City</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── Footer ─── -->
        <footer class="bcwd-footer">
          <div class="footer-row">
            <span>© 2025 BCWD Complaint System</span>
            <div class="footer-contacts d-none d-md-flex">
              <span><v-icon size="13">mdi-map-marker</v-icon> Gov. Jose A. Rosales Ave., Butuan City</span>
              <span><v-icon size="13">mdi-phone</v-icon> (085) 817-6635</span>
              <span><v-icon size="13">mdi-cellphone</v-icon> 0918-930-4234 · 0917-188-8726</span>
              <span><v-icon size="13">mdi-email</v-icon> bcwdrecords@gmail.com</span>
            </div>
            <span>Philippines (Asia/Manila)</span>
          </div>
        </footer>

      </div>
    </v-main>

    <!-- ─── Pin Details Dialog ─── -->
    <v-dialog v-model="showPinDetails" max-width="540">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-bar">
          <div class="dialog-bar-left"><v-icon size="19" color="white">mdi-map-pin</v-icon><h3>Pin Details</h3></div>
          <button class="dialog-x" @click="showPinDetails = false"><v-icon size="19" color="white">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body" v-if="selectedMapPin">
          <div :class="['status-hero', `status-hero--${selectedMapPin.status || 'pending'}`]">
            <span class="status-hero-lbl">STATUS</span>
            <span class="status-hero-val">{{ (selectedMapPin.status || 'pending').toUpperCase() }}</span>
          </div>
          <div class="detail-grid">
            <div class="d-item" v-for="it in [
              { label: 'Consumer',    value: selectedMapPin.consumerName,                 icon: 'mdi-account' },
              { label: 'Type',        value: selectedMapPin.type,                         icon: 'mdi-format-list-bulleted' },
              { label: 'Severity',    value: selectedMapPin.severity || 'N/A',            icon: 'mdi-alert' },
              { label: 'Landmark',    value: selectedMapPin.landmark || 'N/A',            icon: 'mdi-map-marker' },
              { label: 'Assigned to', value: selectedMapPin.assigned_personnel || 'N/A',  icon: 'mdi-account-hard-hat' },
            ]" :key="it.label">
              <div class="d-item-lbl"><v-icon size="13">{{ it.icon }}</v-icon> {{ it.label }}</div>
              <div class="d-item-val">{{ it.value }}</div>
            </div>
          </div>
          <div class="update-status-row">
            <p class="update-status-label"><v-icon size="14" class="mr-1">mdi-sync</v-icon> Update Status</p>
            <v-select v-model="mapStatusUpdate" :items="['pending','ongoing','resolved','rejected']" label="Select new status" density="comfortable" hide-details variant="outlined" />
          </div>
        </div>
        <div class="dialog-foot">
          <button class="btn-outline" @click="viewReportFromMap"><v-icon size="14" class="mr-1">mdi-eye</v-icon> View in Table</button>
          <button class="btn-outline" @click="showPinDetails = false">Cancel</button>
          <button class="btn-primary" @click="updateMapPinStatus" :disabled="!mapStatusUpdate">
            <v-icon size="14" class="mr-1">mdi-check</v-icon> Update
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- ─── Report Details Dialog (wide two-column layout) ─── -->
    <v-dialog v-model="showReportDialog" max-width="960">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-bar">
          <div class="dialog-bar-left"><v-icon size="19" color="white">mdi-file-document-outline</v-icon><h3>Complaint Details</h3></div>
          <button class="dialog-x" @click="showReportDialog = false"><v-icon size="19" color="white">mdi-close</v-icon></button>
        </div>

        <div class="dialog-body-wide" v-if="selectedReport">

          <!-- Status hero — full width across both columns -->
          <div :class="['status-hero', 'status-hero--fullrow', `status-hero--${dialogStatusUpdate || selectedReport.status || 'pending'}`]">
            <span class="status-hero-lbl">STATUS</span>
            <span class="status-hero-val">{{ (dialogStatusUpdate || selectedReport.status || 'pending').toUpperCase() }}</span>
          </div>

          <!-- LEFT column: report details + notes -->
          <div class="dialog-col">
            <p class="col-section-label"><v-icon size="13" class="mr-1">mdi-information-outline</v-icon> Report Information</p>
            <div class="detail-grid">
              <div class="d-item" v-for="it in [
                { label: 'Type',        value: selectedReport.type,                                                                               icon: 'mdi-format-list-bulleted' },
                { label: 'Reported by', value: reporterName,                                                                                     icon: 'mdi-account' },
                { label: 'Severity',    value: selectedReport.severity || 'N/A',                                                                 icon: 'mdi-alert' },
                { label: 'Landmark',    value: selectedReport.landmark || 'N/A',                                                                 icon: 'mdi-map-marker' },
                { label: 'Assigned to', value: selectedReport.assigned_personnel || 'N/A',                                                       icon: 'mdi-account-hard-hat' },
                { label: 'Coordinates', value: selectedReport.latitude ? `${selectedReport.latitude.toFixed(5)}, ${selectedReport.longitude.toFixed(5)}` : 'N/A', icon: 'mdi-crosshairs-gps' },
              ]" :key="it.label">
                <div class="d-item-lbl"><v-icon size="13">{{ it.icon }}</v-icon> {{ it.label }}</div>
                <div class="d-item-val">{{ it.value }}</div>
              </div>
            </div>
            <div v-if="selectedReport.notes" class="d-item d-item--full">
              <div class="d-item-lbl"><v-icon size="13">mdi-note-text</v-icon> Notes</div>
              <div class="d-item-val">{{ selectedReport.notes }}</div>
            </div>
          </div>

          <!-- RIGHT column: status update + images -->
          <div class="dialog-col">
            <div class="inline-status-update">
              <p class="update-status-label">
                <v-icon size="14" class="mr-1">mdi-sync</v-icon> Update Status — click a status to apply immediately
              </p>
              <div class="inline-status-options">
                <button
                  v-for="s in ['pending', 'ongoing', 'resolved', 'rejected']"
                  :key="s"
                  :class="['inline-status-btn', `inline-status-btn--${s}`, { 'inline-status-btn--on': (dialogStatusUpdate || selectedReport.status) === s, 'inline-status-btn--current': selectedReport.status === s }]"
                  @click="dialogStatusUpdate = s; confirmDialogStatusUpdate()"
                >
                  <v-icon size="13" class="mr-1">{{
                    s === 'pending'  ? 'mdi-clock-outline' :
                    s === 'ongoing'  ? 'mdi-progress-wrench' :
                    s === 'resolved' ? 'mdi-check-circle-outline' :
                                       'mdi-close-circle-outline'
                  }}</v-icon>
                  {{ s.charAt(0).toUpperCase() + s.slice(1) }}
                  <span v-if="selectedReport.status === s" class="current-tag">Current</span>
                </button>
              </div>
            </div>

            <div v-if="selectedReport.images && selectedReport.images.length" class="dialog-imgs">
              <p class="imgs-lbl"><v-icon size="13">mdi-image-multiple</v-icon> Attached Images</p>
              <div class="imgs-grid">
                <img v-for="(img, i) in selectedReport.images" :key="i" :src="img" class="thumb" @click="openImageViewer(img)" />
              </div>
            </div>
          </div>

        </div>

        <div class="dialog-foot dialog-foot--report">
          <button class="btn-print" @click="printReport">
            <v-icon size="14" class="mr-1">mdi-printer</v-icon> Print / Save PDF
          </button>
          <button class="btn-primary" @click="showReportDialog = false">
            <v-icon size="14" class="mr-1">mdi-close</v-icon> Close
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- ─── Assign Dialog ─── -->
    <v-dialog v-model="showAssignDialog" max-width="480">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-bar">
          <div class="dialog-bar-left"><v-icon size="19" color="white">mdi-account-hard-hat</v-icon><h3>Assign Personnel</h3></div>
          <button class="dialog-x" @click="cancelAssign"><v-icon size="19" color="white">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body">
          <p class="assign-hint">Select a maintenance team to handle this complaint.</p>
          <v-select v-model="assignedPersonnel" :items="personnelOptions" label="Select Personnel" density="comfortable" hide-details variant="outlined" />
        </div>
        <div class="dialog-foot">
          <button class="btn-outline" @click="cancelAssign">Cancel</button>
          <button class="btn-primary" @click="confirmAssign"><v-icon size="14" class="mr-1">mdi-check</v-icon> Assign</button>
        </div>
      </div>
    </v-dialog>

    <!-- ─── Map Assign Dialog ─── -->
    <v-dialog v-model="showMapAssignDialog" max-width="480">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-bar">
          <div class="dialog-bar-left"><v-icon size="19" color="white">mdi-account-hard-hat</v-icon><h3>Assign Personnel</h3></div>
          <button class="dialog-x" @click="cancelMapAssign"><v-icon size="19" color="white">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body">
          <p class="assign-hint">Select a maintenance team to handle this complaint.</p>
          <v-select v-model="mapAssignedPersonnel" :items="personnelOptions" label="Select Personnel" density="comfortable" hide-details variant="outlined" />
        </div>
        <div class="dialog-foot">
          <button class="btn-outline" @click="cancelMapAssign">Cancel</button>
          <button class="btn-primary" @click="confirmMapAssign"><v-icon size="14" class="mr-1">mdi-check</v-icon> Assign</button>
        </div>
      </div>
    </v-dialog>

    <!-- ─── Image Viewer ─── -->
    <v-dialog v-model="showImageViewer" fullscreen>
      <div :class="['img-viewer', theme]">
        <div class="img-viewer-bar">
          <span>Image Viewer</span>
          <div class="d-flex gap-2">
            <button class="viewer-btn" @click="zoomOut"><v-icon>mdi-magnify-minus</v-icon></button>
            <button class="viewer-btn" @click="resetZoom"><v-icon>mdi-magnify</v-icon></button>
            <button class="viewer-btn" @click="zoomIn"><v-icon>mdi-magnify-plus</v-icon></button>
            <button class="viewer-btn viewer-btn--red" @click="showImageViewer = false"><v-icon>mdi-close</v-icon></button>
          </div>
        </div>
        <div class="img-viewer-body" @wheel.prevent="e => e.deltaY < 0 ? zoomIn() : zoomOut()">
          <img :src="activeImage" :style="{ transform: `scale(${zoomLevel})` }" class="viewer-img" />
        </div>
      </div>
    </v-dialog>

    <!-- ─── Snackbar ─── -->
    <v-snackbar v-model="snackbar" timeout="2500" location="bottom right" color="#1d4ed8">
      <div class="d-flex align-center gap-2"><v-icon size="18">mdi-check-circle</v-icon> {{ snackbarMessage }}</div>
    </v-snackbar>

  </v-app>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
* { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }

/* ── Theme vars ── */
.bcwd-app.light { --bg: #f0f6ff; --surface: #ffffff; --surface2: #f8fafc; --border: #e2e8f0; --text: #0f172a; --text2: #334155; --muted: #64748b; }
.bcwd-app.dark  { --bg: #060e1a; --surface: #0f1e35; --surface2: #0c1828; --border: rgba(255,255,255,0.09); --text: #f1f5f9; --text2: #cbd5e1; --muted: #94a3b8; }

/* ── App Bar ── */
.bcwd-header { background: #ffffff !important; border-bottom: 1px solid #e2e8f0 !important; box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important; }
.bcwd-header.dark { background: #0c1624 !important; border-bottom-color: rgba(255,255,255,0.08) !important; }
.header-inner { display: flex; align-items: center; width: 100%; padding: 0 20px; gap: 14px; }
.menu-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e2e8f0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s; }
.menu-btn:hover { background: #f1f5f9; }
.bcwd-header.dark .menu-btn { border-color: rgba(255,255,255,0.12); }
.header-brand { display: flex; align-items: center; gap: 10px; }
.header-img { border-radius: 6px; flex-shrink: 0; }
.header-title { font-size: 15px; font-weight: 700; color: #1e40af; letter-spacing: -0.3px; }
.bcwd-header.dark .header-title { color: #60a5fa; }
.header-role-badge { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 20px; font-size: 11px; font-weight: 700; padding: 2px 10px; letter-spacing: 0.3px; }
.bcwd-app.dark .header-role-badge { background: rgba(29,78,216,0.18); color: #60a5fa; border-color: rgba(59,130,246,0.3); }
.header-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.header-time { font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; }
.bcwd-header.dark .header-time { color: #94a3b8; }

/* ── Sidebar ── */
.bcwd-sidebar { background: #1d4ed8 !important; border-right: none !important; box-shadow: 2px 0 16px rgba(29,78,216,0.25) !important; }
.bcwd-app.dark .bcwd-sidebar { background: #0f2560 !important; }
.sidebar-profile { display: flex; align-items: center; gap: 12px; padding: 20px 16px 14px; }
.sidebar-profile--rail { justify-content: center; padding: 18px 0; }
.admin-av { width: 52px; height: 52px; border-radius: 14px; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.profile-meta { overflow: hidden; }
.profile-name { font-size: 14px; font-weight: 700; color: #ffffff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-role { font-size: 11px; color: rgba(255,255,255,0.65); margin: 2px 0 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.4px; }
.sidebar-sep { height: 1px; background: rgba(255,255,255,0.18); margin: 0 14px 10px; }
.sidebar-nav { display: flex; flex-direction: column; padding: 0 10px; gap: 3px; }
.s-nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.75); cursor: pointer; font-size: 14px; font-weight: 500; width: 100%; text-align: left; transition: all 0.18s; font-family: 'Plus Jakarta Sans', sans-serif; position: relative; }
.s-nav-item:hover { background: rgba(255,255,255,0.15); color: #ffffff; }
.s-nav-item--active { background: rgba(255,255,255,0.2) !important; color: #ffffff !important; font-weight: 700 !important; box-shadow: inset 3px 0 0 #ffffff; }
.s-nav-label { flex: 1; }
.s-nav-badge { background: #ef4444; color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px; }
.s-nav-item--logout { margin-top: 20px; color: rgba(255,200,200,0.85) !important; }
.s-nav-item--logout:hover { background: rgba(239,68,68,0.25) !important; color: #fca5a5 !important; }
.rail-lump { position: absolute; top: 50%; right: -16px; transform: translateY(-50%); width: 32px; height: 64px; border-radius: 0 14px 14px 0; background: #1d4ed8; border: 1px solid rgba(255,255,255,0.2); border-left: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 3px 0 10px rgba(29,78,216,0.3); transition: all 0.2s; z-index: 10; }
.bcwd-app.dark .rail-lump { background: #0f2560; }
.rail-lump:hover { background: #1e40af; }

/* ── Main layout ── */
.bcwd-main { background: var(--bg) !important; }
.view-full { padding: 28px 32px 0; display: flex; flex-direction: column; min-height: calc(100vh - 56px); }
.page-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 26px; font-weight: 800; color: var(--text); margin: 0 0 4px; letter-spacing: -0.5px; }
.page-sub { font-size: 14px; color: var(--muted); margin: 0; }

/* ── Summary cards ── */
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 20px; }
.sum-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; transition: all 0.2s; }
.sum-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(29,78,216,0.1); }
.sum-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sum-body { min-width: 0; }
.sum-value { font-size: 26px; font-weight: 800; margin: 0; line-height: 1; letter-spacing: -1px; }
.sum-label { font-size: 11px; color: var(--muted); margin: 4px 0 0; font-weight: 600; }

/* ── Filter card ── */
.filter-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px 22px; margin-bottom: 14px; }
.filter-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; }
.section-title { font-size: 17px; font-weight: 800; color: var(--text); margin: 0; letter-spacing: -0.3px; }
.total-badge { background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
.bcwd-app.dark .total-badge { background: rgba(29,78,216,0.15); color: #60a5fa; }
.status-tabs { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 14px; }
.f-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 15px; border-radius: 50px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.f-chip:hover { border-color: #1d4ed8; color: #1d4ed8; }
.f-chip--on.f-chip--all      { background: #1d4ed8; border-color: #1d4ed8; color: white; }
.f-chip--on.f-chip--new      { background: #ef4444; border-color: #ef4444; color: white; }
.f-chip--on.f-chip--pending  { background: #f59e0b; border-color: #f59e0b; color: white; }
.f-chip--on.f-chip--ongoing  { background: #3b82f6; border-color: #3b82f6; color: white; }
.f-chip--on.f-chip--resolved { background: #22c55e; border-color: #22c55e; color: white; }
.f-chip--on.f-chip--rejected { background: #ef4444; border-color: #ef4444; color: white; }

/* ── Search ── */
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 14px; }
.search-input { width: 100%; height: 42px; padding: 0 40px 0 44px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--surface2); color: var(--text); font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: all 0.2s; }
.search-input:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,0.1); }
.search-input::placeholder { color: var(--muted); }
.search-clear { position: absolute; right: 12px; width: 24px; height: 24px; border-radius: 50%; border: none; background: var(--surface2); display: flex; align-items: center; justify-content: center; cursor: pointer; }

/* ── Reports table ── */
.reports-table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 0; }
.reports-table { width: 100%; border-collapse: collapse; }
.reports-table thead { background: linear-gradient(135deg, #1d4ed8, #2563eb); }
.reports-table thead th { color: white; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 14px 18px; text-align: left; }
.reports-table tbody tr { border-bottom: 1px solid var(--border); transition: all 0.18s; }
.reports-table tbody tr:last-child { border-bottom: none; }
.table-row:hover { background: rgba(29,78,216,0.03); }
.bcwd-app.dark .table-row:hover { background: rgba(59,130,246,0.05); }
.table-row--new { background: #fffbeb; }
.bcwd-app.dark .table-row--new { background: rgba(245,158,11,0.06); }
.table-row--highlighted { background: #eff6ff; box-shadow: inset 4px 0 0 #1d4ed8; }
.bcwd-app.dark .table-row--highlighted { background: rgba(29,78,216,0.1); }
.reports-table td { padding: 14px 18px; font-size: 14px; color: var(--text); vertical-align: middle; }
.cell-muted { color: var(--muted); font-size: 13px; }
.cell-date { white-space: nowrap; }
.cell-type { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.type-dot { width: 8px; height: 8px; border-radius: 50%; background: #1d4ed8; flex-shrink: 0; }
.table-loading { display: flex; justify-content: center; align-items: center; padding: 64px; }
.table-empty { text-align: center; padding: 64px; color: var(--muted); }
.table-empty p { margin: 12px 0 0; font-size: 15px; }

/* ── Status select wrapper ── */
.status-select-wrap { position: relative; display: inline-flex; flex-direction: column; align-items: flex-start; gap: 3px; cursor: pointer; }
.status-select { padding: 6px 28px 6px 10px; border-radius: 8px; border: 1.5px solid var(--border); font-size: 12px; font-weight: 700; background: var(--surface2); color: var(--text); cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: all 0.2s; appearance: none; -webkit-appearance: none; min-width: 118px; }
.status-select:hover { box-shadow: 0 0 0 3px rgba(29,78,216,0.12); }
.status-select--pending  { border-color: #f59e0b; color: #92400e; background: #fef3c7; }
.status-select--ongoing  { border-color: #3b82f6; color: #1e40af; background: #dbeafe; }
.status-select--resolved { border-color: #22c55e; color: #166534; background: #dcfce7; }
.status-select--rejected { border-color: #ef4444; color: #991b1b; background: #fee2e2; }
.status-select-caret { position: absolute; right: 8px; top: 11px; pointer-events: none; opacity: 0.55; }
.status-select-hint { display: flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 600; color: var(--muted); letter-spacing: 0.2px; opacity: 0.8; padding-left: 2px; user-select: none; }

/* ── Table actions ── */
.table-actions { display: flex; align-items: center; gap: 10px; }
.btn-view { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 2px 8px rgba(29,78,216,0.25); }
.btn-view:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(29,78,216,0.35); }
.new-badge { background: #ef4444; color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 10px; letter-spacing: 0.5px; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }

/* ── Map view ── */
.map-view { flex: 1; display: flex; flex-direction: column; }
.map-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; flex: 1; display: flex; flex-direction: column; margin-bottom: 20px; }
.map-card-header { background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.map-card-header-left { display: flex; align-items: center; gap: 14px; }
.map-header-icon { width: 42px; height: 42px; background: rgba(255,255,255,0.18); border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.25); flex-shrink: 0; }
.map-header-title { font-size: 15px; font-weight: 700; color: white; margin: 0 0 2px; }
.map-header-sub { font-size: 12px; color: rgba(255,255,255,0.7); margin: 0; }
.pin-count-badge { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 20px; white-space: nowrap; }
.map-legend { display: flex; gap: 16px; padding: 10px 20px; background: var(--surface2); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--muted); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.map-container { flex: 1; min-height: 480px; }

/* ── Settings ── */
.settings-hero { display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, #1d4ed8, #2563eb); border-radius: 16px; padding: 28px 32px; margin-bottom: 20px; }
.settings-hero-icon { width: 64px; height: 64px; background: rgba(255,255,255,0.18); border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.25); }
.settings-hero-title { font-size: 22px; font-weight: 800; color: white; margin: 0 0 4px; letter-spacing: -0.4px; }
.settings-hero-sub { font-size: 14px; color: rgba(255,255,255,0.75); margin: 0; }
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
.s-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px; }
.s-card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
.s-card-icon { width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.s-card-title { font-size: 14px; font-weight: 700; color: var(--text); margin: 0 0 2px; }
.s-card-sub { font-size: 12px; color: var(--muted); margin: 0; }
.s-options { display: flex; flex-direction: column; gap: 12px; }
.s-option { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.s-option-info { display: flex; align-items: center; gap: 12px; }
.s-option-label { font-size: 14px; font-weight: 600; color: var(--text); margin: 0 0 2px; }
.s-option-desc { font-size: 12px; color: var(--muted); margin: 0; }
.theme-toggle-group { display: flex; border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden; }
.theme-btn { padding: 7px 14px; border: none; background: transparent; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.18s; font-family: 'Plus Jakarta Sans', sans-serif; }
.theme-btn--on { background: #1d4ed8; color: white; }
.items-select-group { display: flex; border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden; }
.items-btn { padding: 7px 14px; border: none; background: transparent; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.18s; font-family: 'Plus Jakarta Sans', sans-serif; }
.items-btn--on { background: #1d4ed8; color: white; }
.about-info { display: flex; flex-direction: column; gap: 10px; }
.about-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 14px; background: var(--surface2); border-radius: 10px; border: 1px solid var(--border); gap: 12px; }
.about-lbl { font-size: 12px; font-weight: 600; color: var(--muted); min-width: 70px; }
.about-val { font-size: 13px; font-weight: 600; color: var(--text); text-align: right; flex: 1; }

/* ── Footer ── */
.bcwd-footer { background: #1e3a8a; color: white; padding: 10px 0; font-size: 12px; margin-top: auto; }
.footer-row { padding: 0 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.footer-contacts { display: flex; gap: 16px; opacity: 0.8; }
.footer-contacts span { display: flex; align-items: center; gap: 5px; }

/* ── Dialogs (shared) ── */
:deep(.v-dialog > .v-overlay__content > *) { background: #ffffff !important; border-radius: 20px !important; }
.bcwd-app.dark :deep(.v-dialog > .v-overlay__content > *) { background: #0f1e35 !important; }
.bcwd-dialog { background: #ffffff !important; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.22); }
.bcwd-app.dark .bcwd-dialog { background: #0f1e35 !important; }
.dialog-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; background: linear-gradient(135deg, #1d4ed8, #2563eb); }
.dialog-bar-left { display: flex; align-items: center; gap: 10px; }
.dialog-bar-left h3 { font-size: 15px; font-weight: 700; color: white; margin: 0; }
.dialog-x { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.dialog-x:hover { background: rgba(255,255,255,0.2); }

/* Original single-col dialog body (Pin Details, Assign dialogs) */
.dialog-body { padding: 22px; background: #ffffff !important; }
.bcwd-app.dark .dialog-body { background: #0f1e35 !important; }

/* ── Wide two-column body for Report Details ── */
.dialog-body-wide {
  padding: 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  background: #ffffff !important;
}
.bcwd-app.dark .dialog-body-wide { background: #0f1e35 !important; }

/* Status hero spans both columns */
.status-hero--fullrow { grid-column: 1 / -1; }

/* Each column stacks its children vertically */
.dialog-col { display: flex; flex-direction: column; gap: 14px; }

/* Column section label */
.col-section-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  margin: 0 0 2px;
}

/* ── Dialog footer ── */
.dialog-foot {
  padding: 14px 22px;
  background: #f8fafc !important;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.dialog-foot--report { justify-content: space-between; }
.bcwd-app.dark .dialog-foot { background: #0c1828 !important; border-top-color: rgba(255,255,255,0.09); }
.assign-hint { font-size: 13px; color: var(--muted); margin: 0 0 16px; }
.update-status-row { margin-top: 16px; }
.update-status-label { font-size: 12px; font-weight: 700; color: var(--muted); margin: 0 0 8px; display: flex; align-items: center; text-transform: uppercase; letter-spacing: 0.5px; }

/* ── Status hero ── */
.status-hero { display: flex; flex-direction: column; align-items: center; padding: 20px; border-radius: 14px; margin-bottom: 0; border: 2px solid; transition: all 0.25s; }
.status-hero--pending  { background: #fef3c7; border-color: #f59e0b; }
.status-hero--ongoing  { background: #dbeafe; border-color: #3b82f6; }
.status-hero--resolved { background: #dcfce7; border-color: #22c55e; }
.status-hero--rejected { background: #fee2e2; border-color: #ef4444; }
.bcwd-app.dark .status-hero--pending  { background: rgba(245,158,11,0.1); }
.bcwd-app.dark .status-hero--ongoing  { background: rgba(59,130,246,0.1); }
.bcwd-app.dark .status-hero--resolved { background: rgba(34,197,94,0.1); }
.bcwd-app.dark .status-hero--rejected { background: rgba(239,68,68,0.1); }
.status-hero-lbl { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; opacity: 0.55; margin-bottom: 4px; color: #0f172a; }
.status-hero-val { font-size: 26px; font-weight: 800; letter-spacing: 1px; transition: color 0.25s; }
.status-hero--pending  .status-hero-val { color: #92400e; }
.status-hero--ongoing  .status-hero-val { color: #1e40af; }
.status-hero--resolved .status-hero-val { color: #166534; }
.status-hero--rejected .status-hero-val { color: #991b1b; }

/* ── Detail grid ── */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.d-item { background: #f0f6ff !important; border-radius: 10px; padding: 11px 13px; border: 1px solid #bfdbfe; }
.bcwd-app.dark .d-item { background: #0c1828 !important; border-color: rgba(255,255,255,0.09); }
.d-item--full { grid-column: 1 / -1; }
.d-item-lbl { font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
.bcwd-app.dark .d-item-lbl { color: #60a5fa; }
.d-item-val { font-size: 14px; font-weight: 600; color: #0f172a; word-break: break-all; }
.bcwd-app.dark .d-item-val { color: #f1f5f9; }

/* ── Inline status update ── */
.inline-status-update { background: var(--surface2); border: 1.5px solid var(--border); border-radius: 12px; padding: 14px 16px; }
.inline-status-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 10px; }
.inline-status-btn { position: relative; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 10px 8px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.18s; flex-direction: column; min-width: 0; overflow: hidden; }
.inline-status-btn .v-icon { flex-shrink: 0; }
.current-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background: rgba(0,0,0,0.12); border-radius: 4px; padding: 1px 5px; line-height: 1.4; }
.inline-status-btn--pending:hover  { background: #fef9ec; border-color: #f59e0b; color: #92400e; }
.inline-status-btn--ongoing:hover  { background: #eff6ff; border-color: #3b82f6; color: #1e40af; }
.inline-status-btn--resolved:hover { background: #f0fdf4; border-color: #22c55e; color: #166534; }
.inline-status-btn--rejected:hover { background: #fff1f1; border-color: #ef4444; color: #991b1b; }
.inline-status-btn--pending.inline-status-btn--on  { background: #fef3c7; border-color: #f59e0b; color: #92400e; box-shadow: 0 0 0 3px rgba(245,158,11,0.2); }
.inline-status-btn--ongoing.inline-status-btn--on  { background: #dbeafe; border-color: #3b82f6; color: #1e40af; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
.inline-status-btn--resolved.inline-status-btn--on { background: #dcfce7; border-color: #22c55e; color: #166534; box-shadow: 0 0 0 3px rgba(34,197,94,0.2); }
.inline-status-btn--rejected.inline-status-btn--on { background: #fee2e2; border-color: #ef4444; color: #991b1b; box-shadow: 0 0 0 3px rgba(239,68,68,0.2); }

/* ── Images ── */
.dialog-imgs { }
.imgs-lbl { font-size: 12px; font-weight: 600; color: var(--muted); margin: 0 0 10px; display: flex; align-items: center; gap: 5px; }
.imgs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
.thumb { width: 100%; height: 110px; object-fit: cover; border-radius: 10px; cursor: pointer; transition: 0.2s; border: 1px solid var(--border); }
.thumb:hover { transform: scale(1.04); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }

/* ── Image viewer ── */
.img-viewer { width: 100vw; height: 100vh; display: flex; flex-direction: column; }
.img-viewer.light { background: #f8fafc; }
.img-viewer.dark  { background: #060e1a; }
.img-viewer-bar { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; padding: 14px 22px; display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: 700; }
.viewer-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: 0.2s; }
.viewer-btn:hover { background: rgba(255,255,255,0.2); }
.viewer-btn--red { background: rgba(239,68,68,0.3); border-color: rgba(239,68,68,0.4); }
.img-viewer-body { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.viewer-img { max-width: 100%; max-height: 80vh; object-fit: contain; transition: transform 0.2s ease; }

/* ── Buttons ── */
.btn-primary { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; box-shadow: 0 4px 12px rgba(29,78,216,0.3); font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(29,78,216,0.4); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-outline { background: transparent; color: #1d4ed8; border: 1.5px solid #1d4ed8; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-outline:hover { background: rgba(29,78,216,0.06); }
.bcwd-app.dark .btn-outline { color: #60a5fa; border-color: #60a5fa; }
.btn-print { background: transparent; color: #16a34a; border: 1.5px solid #16a34a; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-print:hover { background: #f0fdf4; }
.bcwd-app.dark .btn-print { color: #4ade80; border-color: #4ade80; }
.bcwd-app.dark .btn-print:hover { background: rgba(74,222,128,0.08); }

/* ── Vuetify overrides ── */
:deep(.v-field) { border-radius: 10px !important; }
:deep(.v-navigation-drawer__scrim) { display: none; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .view-full { padding: 20px 16px 0; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .settings-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .footer-row { padding: 0 16px; }
  .settings-hero { padding: 22px 20px; }
  .inline-status-options { grid-template-columns: repeat(2, 1fr); }
  /* Stack report dialog to single column on tablets */
  .dialog-body-wide { grid-template-columns: 1fr; }
  .status-hero--fullrow { grid-column: 1; }
}
@media (max-width: 600px) {
  .view-full { padding: 14px 12px 0; }
  .summary-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .page-title { font-size: 20px; }
  .reports-table td, .reports-table th { padding: 10px 12px; }
  .inline-status-options { grid-template-columns: repeat(2, 1fr); }
  .dialog-foot--report { flex-direction: column; }
  .dialog-body-wide { grid-template-columns: 1fr; padding: 16px; gap: 14px; }
}
</style>