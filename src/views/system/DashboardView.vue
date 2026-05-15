<!-- src/views/system/DashboardView.vue — BCWD Redesign 2025 v2 -->
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

const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.change(theme.value)
watch(theme, (newTheme) => { localStorage.setItem('theme', newTheme); vuetifyTheme.change(newTheme); showSnackbar('Theme changed') })
function toggleTheme() { theme.value = theme.value === 'light' ? 'dark' : 'light' }

const phTime = ref('')
let timer = null
const timeFormat = ref(localStorage.getItem('timeFormat') || '24')
watch(timeFormat, (val) => { localStorage.setItem('timeFormat', val); updatePhTime(); showSnackbar('Time format changed') })
function updatePhTime() {
  phTime.value = new Intl.DateTimeFormat('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: timeFormat.value === '12', timeZone: 'Asia/Manila' }).format(new Date())
}
onMounted(() => { updatePhTime(); timer = setInterval(updatePhTime, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

const updatedReports = ref(new Set())
const lastViewedUpdates = ref(JSON.parse(localStorage.getItem('lastViewedUpdates') || '{}'))
const notificationCount = computed(() => updatedReports.value.size)
const showUpdatedOnly = ref(false)
function showUpdatedReports() { currentView.value = 'dashboard'; showUpdatedOnly.value = true; currentStatus.value = 'all'; selectedType.value = 'all'; page.value = 1 }
function resetToAllReports() { showUpdatedOnly.value = false; currentStatus.value = 'all'; selectedType.value = 'all'; page.value = 1 }

const reports = ref([])
async function fetchReports() {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return
  const { data } = await supabase.from('reports').select('*').eq('user_id', userData.user.id).order('created_at', { ascending: false })
  reports.value = data || []
}

const baseReportsForFiltering = computed(() => showUpdatedOnly.value ? reports.value.filter(r => updatedReports.value.has(r.id)) : reports.value)
const statusCounts = computed(() => {
  const c = { all: baseReportsForFiltering.value.length, pending: 0, ongoing: 0, resolved: 0, rejected: 0 }
  baseReportsForFiltering.value.forEach(r => { if (r.status in c) c[r.status]++ })
  return c
})
const typeCounts = computed(() => {
  const c = {}
  baseReportsForFiltering.value.forEach(r => { const t = (r.type || 'other').toLowerCase(); c[t] = (c[t] || 0) + 1 })
  return c
})
const currentStatus = ref('all')
const selectedType = ref('all')
const filteredReports = computed(() => {
  let f = baseReportsForFiltering.value
  if (currentStatus.value !== 'all') f = f.filter(r => r.status === currentStatus.value)
  if (selectedType.value && selectedType.value !== 'all') f = f.filter(r => (r.type || 'other').toLowerCase() === selectedType.value)
  return f
})
const page = ref(1)
const itemsPerPage = ref(parseInt(localStorage.getItem('itemsPerPage')) || 10)
watch(itemsPerPage, (val) => { localStorage.setItem('itemsPerPage', val.toString()); showSnackbar('Items per page changed'); page.value = 1 })
const paginatedReports = computed(() => { const s = (page.value - 1) * itemsPerPage.value; return filteredReports.value.slice(s, s + itemsPerPage.value) })
const paginationLength = computed(() => Math.ceil(filteredReports.value.length / itemsPerPage.value))

const typeIcons = { 'low pressure': 'mdi-water', 'broken pipe': 'mdi-pipe-disconnected', 'dark colored water': 'mdi-water-alert', contamination: 'mdi-water-alert', 'water leak': 'mdi-pipe-leak', 'no water': 'mdi-water-off', other: 'mdi-help-circle' }
const typeColors = { 'low pressure': 'red', 'broken pipe': 'red', 'dark colored water': 'orange', contamination: 'orange', 'water leak': 'red', 'no water': 'red', other: 'grey' }
const statusHexColors = { pending: '#f59e0b', ongoing: '#3b82f6', resolved: '#22c55e', rejected: '#ef4444' }

const userName = ref('')
async function fetchUser() {
  const { data } = await supabase.auth.getUser()
  const m = data?.user?.user_metadata || {}
  userName.value = `${m.firstname || ''} ${m.lastname || ''}`.trim() || data?.user?.email?.split('@')[0] || 'User'
}

const dialog = ref(false)
const selectedReport = ref(null)
function openReportDetails(report) {
  selectedReport.value = report; dialog.value = true
  lastViewedUpdates.value[report.id] = report.updated_at
  localStorage.setItem('lastViewedUpdates', JSON.stringify(lastViewedUpdates.value))
  updatedReports.value.delete(report.id)
}
const showImageViewer = ref(false)
const activeImage = ref('')
const zoomLevel = ref(1)
function openImageViewer(img) { activeImage.value = img; zoomLevel.value = 1; showImageViewer.value = true }
function zoomIn() { zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3) }
function zoomOut() { zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5) }
function resetZoom() { zoomLevel.value = 1 }

const drawer = ref(!mobile.value)
const rail = ref(false)
function toggleSidebar() { if (mobile.value) drawer.value = !drawer.value; else rail.value = !rail.value }
watch(mobile, (isMobile) => { if (isMobile) { drawer.value = false; rail.value = false } else { drawer.value = true; rail.value = false } })

async function loadData() {
  await fetchReports(); await fetchUser()
  const updated = reports.value.filter(r => { const lv = lastViewedUpdates.value[r.id]; return r.status !== 'pending' && r.updated_at && new Date(r.updated_at) > new Date(lv || 0) })
  updatedReports.value = new Set(updated.map(r => r.id))
}
onMounted(loadData)
onActivated(loadData)

const loading = ref(false); const saving = ref(false); const editing = ref(false)
const user = ref(null); const email = ref(''); const firstname = ref(''); const lastname = ref('')
const age = ref(''); const residency = ref('')
const formSuccessMessage = ref(''); const formErrorMessage = ref('')
async function loadCurrentUser() {
  loading.value = true
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    user.value = data?.user ?? null
    email.value = user.value?.email || ''; firstname.value = user.value?.user_metadata?.firstname || ''
    lastname.value = user.value?.user_metadata?.lastname || ''; age.value = user.value?.user_metadata?.age || ''
    residency.value = user.value?.user_metadata?.residency || ''
  } catch (err) { formErrorMessage.value = err?.message || String(err) }
  finally { loading.value = false }
}
async function saveProfile() {
  if (!firstname.value || !lastname.value) { formErrorMessage.value = 'Please fill out all required fields.'; return }
  saving.value = true; formErrorMessage.value = ''; formSuccessMessage.value = ''
  try {
    const { data, error } = await supabase.auth.updateUser({ data: { firstname: firstname.value, lastname: lastname.value, age: age.value, residency: residency.value } })
    if (error) throw error
    user.value = data?.user ?? user.value; formSuccessMessage.value = 'Profile updated successfully.'; editing.value = false; await fetchUser()
  } catch (err) { formErrorMessage.value = err?.message || String(err) }
  finally { saving.value = false }
}
const currentView = ref('dashboard')
onMounted(loadCurrentUser)

const snackbar = ref(false); const snackbarMessage = ref('')
function showSnackbar(message) { snackbarMessage.value = message; snackbar.value = true }
async function logout() { await supabase.auth.signOut(); router.push('/login') }
function handleMobileNav(view) { currentView.value = view; if (mobile.value) drawer.value = false }

const colors = ['red','pink','purple','deep-purple','indigo','blue','cyan','teal','green','light-green']
const initial = computed(() => userName.value.charAt(0).toUpperCase() || 'U')
const avatarColor = computed(() => { if (!userName.value) return 'grey'; return colors[Math.abs(userName.value.charCodeAt(0)) % colors.length] })

const mapInstance = ref(null); const markerInstance = ref(null); const showMapDialog = ref(false)
watch(showMapDialog, async (newVal) => {
  if (newVal) {
    await nextTick()
    const mapContainer = document.getElementById('report-map')
    if (!mapContainer) return
    mapInstance.value = L.map('report-map', { preferCanvas: true, zoomControl: true, dragging: true }).setView([8.4542, 124.6319], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(mapInstance.value)
    markerInstance.value = null
    await new Promise(resolve => setTimeout(() => { if (mapInstance.value) mapInstance.value.invalidateSize(true); resolve() }, 300))
    if (selectedReport.value?.latitude && selectedReport.value?.longitude) {
      const latLng = [selectedReport.value.latitude, selectedReport.value.longitude]
      markerInstance.value = L.marker(latLng).addTo(mapInstance.value)
      mapInstance.value.setView(latLng, 15)
    }
    mapInstance.value.on('click', e => { if (markerInstance.value) markerInstance.value.remove(); markerInstance.value = L.marker(e.latlng).addTo(mapInstance.value) })
  } else {
    if (mapInstance.value) { mapInstance.value.off('click'); mapInstance.value.remove(); mapInstance.value = null; markerInstance.value = null }
  }
})
async function savePin() {
  if (!markerInstance.value) { showSnackbar('Please select a location first'); return }
  try {
    const { lat, lng } = markerInstance.value.getLatLng()
    const { error } = await supabase.from('reports').update({ latitude: lat, longitude: lng }).eq('id', selectedReport.value.id)
    if (error) throw error
    selectedReport.value.latitude = lat; selectedReport.value.longitude = lng
    showSnackbar('Location pinned successfully'); showMapDialog.value = false; await fetchReports()
  } catch (err) { showSnackbar('Error saving location: ' + err.message) }
}
</script>

<template>
  <v-app :class="['bcwd-app', theme]">

    <!-- ─── App Bar — WHITE (matches RegisterView) ─── -->
    <v-app-bar flat height="56" :class="['bcwd-header', theme]">
      <div class="header-inner">
        <button class="menu-btn" @click="toggleSidebar" aria-label="Toggle menu">
          <v-icon size="22" color="#1e40af">mdi-menu</v-icon>
        </button>
        <div class="header-brand">
          <v-img src="/images/logo.png" width="28" height="28" class="header-img" />
          <span class="header-title">BCWD Complaint System</span>
        </div>
        <div class="header-right">
          <span class="header-time d-none d-sm-block">{{ phTime }}</span>
        </div>
      </div>
    </v-app-bar>

    <!-- ─── Sidebar — LIGHT BLUE ─── -->
    <v-navigation-drawer v-model="drawer" :temporary="mobile" :rail="!mobile && rail" :width="250" class="bcwd-sidebar">
      <!-- Profile section -->
      <div class="sidebar-profile" :class="{ 'sidebar-profile--rail': !mobile && rail }">
        <v-avatar :color="avatarColor" size="52" class="profile-av">
          <span class="av-text">{{ initial }}</span>
        </v-avatar>
        <div class="profile-meta" v-if="!(!mobile && rail)">
          <p class="profile-name">{{ userName }}</p>
          <p class="profile-role">Consumer</p>
        </div>
      </div>
      <div class="sidebar-sep" />

      <!-- Nav items -->
      <nav class="sidebar-nav">
        <button :class="['s-nav-item', { 's-nav-item--active': currentView === 'dashboard' }]" @click="handleMobileNav('dashboard')">
          <v-icon size="19">mdi-view-dashboard-outline</v-icon>
          <span v-if="!(!mobile && rail)" class="s-nav-label">Dashboard</span>
          <div v-if="notificationCount > 0 && !(!mobile && rail)" class="s-nav-badge">{{ notificationCount }}</div>
        </button>
        <button :class="['s-nav-item', { 's-nav-item--active': currentView === 'profile' }]" @click="handleMobileNav('profile')">
          <v-icon size="19">mdi-account-circle-outline</v-icon>
          <span v-if="!(!mobile && rail)" class="s-nav-label">My Profile</span>
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

      <!-- Rail toggle -->
      <div class="rail-lump" @click="toggleSidebar">
        <v-icon size="16" color="white">{{ (!mobile && rail) ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
      </div>
    </v-navigation-drawer>

    <!-- ─── Main Content ─── -->
    <v-main :class="['bcwd-main', theme]">

      <!-- ═══ DASHBOARD VIEW ═══ -->
      <div v-if="currentView === 'dashboard'" class="view-full">
        <div class="page-hdr">
          <div>
            <h1 class="page-title">My Complaints</h1>
            <p class="page-sub">Track and manage your water service reports</p>
          </div>
          <div class="page-hdr-actions">
            <button v-if="notificationCount > 0 && !showUpdatedOnly" class="notif-btn" @click="showUpdatedReports">
              <v-icon size="20">mdi-bell-ring-outline</v-icon>
              <span class="notif-badge">{{ notificationCount }}</span>
            </button>
            <button class="btn-primary" @click="router.push('/report')">
              <v-icon size="17" class="mr-1">mdi-plus</v-icon> New Report
            </button>
          </div>
        </div>

        <div v-if="showUpdatedOnly" class="update-banner">
          <v-icon size="18" color="#1d4ed8">mdi-bell-ring</v-icon>
          <span>Showing <strong>{{ notificationCount }}</strong> updated report{{ notificationCount !== 1 ? 's' : '' }}</span>
          <button class="btn-ghost" @click="resetToAllReports" style="margin-left:auto;">
            <v-icon size="15" class="mr-1">mdi-arrow-left</v-icon> All reports
          </button>
        </div>

        <div v-if="!showUpdatedOnly" class="filter-row">
          <button v-for="s in ['all','pending','ongoing','resolved','rejected']" :key="s"
            :class="['f-chip', `f-chip--${s}`, { 'f-chip--on': currentStatus === s }]"
            @click="currentStatus = s; page = 1">
            {{ s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1) }}
            <span class="f-chip-count">{{ statusCounts[s] }}</span>
          </button>
        </div>

        <div v-if="!showUpdatedOnly" class="type-row">
          <button :class="['t-chip', { 't-chip--on': selectedType === 'all' }]" @click="selectedType = 'all'; page = 1">All types</button>
          <button v-for="(count, type) in typeCounts" :key="type"
            :class="['t-chip', { 't-chip--on': selectedType === type }]"
            @click="selectedType = type; page = 1">
            <v-icon size="13" class="mr-1">{{ typeIcons[type] }}</v-icon>
            {{ type.charAt(0).toUpperCase() + type.slice(1) }} ({{ count }})
          </button>
        </div>

        <div class="reports-list">
          <div v-if="paginatedReports.length === 0" class="empty-state">
            <v-icon size="56" color="#cbd5e1">mdi-inbox-outline</v-icon>
            <p class="empty-title">No reports found</p>
            <p class="empty-sub">Try changing your filters or submit a new complaint</p>
          </div>
          <div v-for="report in paginatedReports" :key="report.id" :class="['r-card', theme]" @click="openReportDetails(report)">
            <div :class="['r-icon', `r-icon--${typeColors[(report.type||'other').toLowerCase()]}`]">
              <v-icon size="22">{{ typeIcons[(report.type||'other').toLowerCase()] }}</v-icon>
            </div>
            <div class="r-body">
              <div class="r-top">
                <h3 class="r-title">{{ report.type || 'Other' }}</h3>
                <span :class="['s-pill', `s-pill--${report.status || 'pending'}`]">{{ report.status || 'Pending' }}</span>
              </div>
              <div class="r-meta">
                <span v-if="report.landmark"><v-icon size="12">mdi-map-marker-outline</v-icon> {{ report.landmark }}</span>
                <span><v-icon size="12">mdi-calendar-outline</v-icon> {{ new Date(report.created_at).toLocaleDateString('en-PH') }}</span>
              </div>
              <div v-if="updatedReports.has(report.id)" class="r-updated">
                <v-icon size="12">mdi-update</v-icon> Status updated
              </div>
            </div>
            <v-icon size="18" color="#cbd5e1">mdi-chevron-right</v-icon>
          </div>
        </div>

        <div v-if="paginationLength > 1" class="pagination-row">
          <v-pagination v-model="page" :length="paginationLength" :total-visible="7" density="compact" color="#1d4ed8" />
        </div>
      </div>

      <!-- ═══ PROFILE VIEW ═══ -->
      <div v-else-if="currentView === 'profile'" class="view-full">
        <div class="profile-page">
          <div class="profile-hero">
            <div class="profile-hero-bg" />
            <div class="profile-hero-content">
              <v-avatar :color="avatarColor" size="96" class="profile-hero-av">
                <span class="av-hero-text">{{ initial }}</span>
              </v-avatar>
              <div class="profile-hero-info">
                <h2 class="profile-hero-name">{{ firstname || userName }} {{ lastname }}</h2>
                <p class="profile-hero-email">{{ email }}</p>
                <span class="profile-hero-badge"><v-icon size="13" class="mr-1">mdi-account-check</v-icon> Verified Consumer</span>
              </div>
            </div>
          </div>

          <div class="profile-grid">
            <div :class="['p-card', theme]">
              <div class="p-card-header">
                <div class="p-card-icon" style="background:#eff6ff;"><v-icon size="20" color="#1d4ed8">mdi-account-outline</v-icon></div>
                <div>
                  <h3 class="p-card-title">Personal Information</h3>
                  <p class="p-card-sub">Your name and contact details</p>
                </div>
                <button v-if="!editing" class="btn-edit" @click="editing = true">
                  <v-icon size="15" class="mr-1">mdi-pencil</v-icon> Edit
                </button>
              </div>
              <AlertNotification :form-success-message="formSuccessMessage" :form-error-message="formErrorMessage" />
              <v-skeleton-loader v-if="loading" type="paragraph" class="mb-2" />
              <div v-else class="p-fields">
                <div class="p-field-group">
                  <v-text-field v-model="firstname" label="First Name" prepend-inner-icon="mdi-account" variant="outlined" density="comfortable" :readonly="!editing" />
                  <v-text-field v-model="lastname" label="Last Name" prepend-inner-icon="mdi-account" variant="outlined" density="comfortable" :readonly="!editing" />
                </div>
                <v-text-field v-model="email" label="Email Address" prepend-inner-icon="mdi-email" variant="outlined" density="comfortable" readonly class="mb-2" />
                <div class="p-field-group">
                  <v-text-field v-model="age" label="Age" prepend-inner-icon="mdi-calendar" variant="outlined" density="comfortable" type="number" :readonly="!editing" />
                  <v-text-field v-model="residency" label="Residency" prepend-inner-icon="mdi-home-city" variant="outlined" density="comfortable" :readonly="!editing" />
                </div>
                <div v-if="editing" class="p-actions">
                  <button class="btn-success" @click="saveProfile" :disabled="saving">
                    <v-icon size="15" class="mr-1">mdi-content-save</v-icon> {{ saving ? 'Saving…' : 'Save Changes' }}
                  </button>
                  <button class="btn-outline" @click="editing = false">Cancel</button>
                </div>
              </div>
            </div>

            <div :class="['p-card', theme]">
              <div class="p-card-header">
                <div class="p-card-icon" style="background:#f0fdf4;"><v-icon size="20" color="#16a34a">mdi-lightning-bolt</v-icon></div>
                <div>
                  <h3 class="p-card-title">Quick Actions</h3>
                  <p class="p-card-sub">Shortcuts and account options</p>
                </div>
              </div>
              <div class="quick-actions">
                <button class="qa-btn" @click="router.push('/report')">
                  <div class="qa-icon" style="background:#eff6ff;"><v-icon size="22" color="#1d4ed8">mdi-plus-circle</v-icon></div>
                  <div class="qa-text"><span class="qa-label">File a Complaint</span><span class="qa-sub">Submit a new water service report</span></div>
                  <v-icon size="16" color="#94a3b8">mdi-chevron-right</v-icon>
                </button>
                <button class="qa-btn" @click="currentView = 'dashboard'">
                  <div class="qa-icon" style="background:#f0fdf4;"><v-icon size="22" color="#16a34a">mdi-view-list</v-icon></div>
                  <div class="qa-text"><span class="qa-label">View My Reports</span><span class="qa-sub">See all your submitted complaints</span></div>
                  <v-icon size="16" color="#94a3b8">mdi-chevron-right</v-icon>
                </button>
                <button class="qa-btn" @click="currentView = 'settings'">
                  <div class="qa-icon" style="background:#fef3c7;"><v-icon size="22" color="#d97706">mdi-cog</v-icon></div>
                  <div class="qa-text"><span class="qa-label">App Settings</span><span class="qa-sub">Theme, time format, preferences</span></div>
                  <v-icon size="16" color="#94a3b8">mdi-chevron-right</v-icon>
                </button>
                <button class="qa-btn qa-btn--danger" @click="logout">
                  <div class="qa-icon" style="background:#fee2e2;"><v-icon size="22" color="#ef4444">mdi-logout</v-icon></div>
                  <div class="qa-text"><span class="qa-label" style="color:#ef4444;">Sign Out</span><span class="qa-sub">Logout from your account</span></div>
                  <v-icon size="16" color="#94a3b8">mdi-chevron-right</v-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ SETTINGS VIEW ═══ -->
      <div v-else-if="currentView === 'settings'" class="view-full">
        <div class="settings-page">
          <div class="settings-hero">
            <div class="settings-hero-icon"><v-icon size="36" color="white">mdi-cog</v-icon></div>
            <div>
              <h1 class="settings-hero-title">Settings</h1>
              <p class="settings-hero-sub">Manage your application preferences</p>
            </div>
          </div>

          <div class="settings-grid">
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
                      <v-icon size="16">mdi-white-balance-sunny</v-icon> Light
                    </button>
                    <button :class="['theme-btn', { 'theme-btn--on': theme === 'dark' }]" @click="theme = 'dark'">
                      <v-icon size="16">mdi-weather-night</v-icon> Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>

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

            <div :class="['s-card', theme]">
              <div class="s-card-header">
                <div class="s-card-icon" style="background:#fef3c7;"><v-icon size="20" color="#d97706">mdi-file-document-multiple-outline</v-icon></div>
                <div>
                  <h3 class="s-card-title">Reports Display</h3>
                  <p class="s-card-sub">Control how many records appear</p>
                </div>
              </div>
              <div class="s-options">
                <div class="s-option">
                  <div class="s-option-info">
                    <v-icon size="18" color="#64748b">mdi-view-list</v-icon>
                    <div>
                      <p class="s-option-label">Items per Page</p>
                      <p class="s-option-desc">Reports shown per page</p>
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
    </v-main>

    <!-- ─── Dialogs unchanged ─── -->
    <v-dialog v-model="dialog" max-width="700">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-bar">
          <div class="dialog-bar-left"><v-icon size="19" color="white">mdi-file-document-outline</v-icon><h3>Complaint Details</h3></div>
          <button class="dialog-x" @click="dialog = false"><v-icon size="19" color="white">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body" v-if="selectedReport">
          <div :class="['status-hero', `status-hero--${selectedReport.status || 'pending'}`]">
            <span class="status-hero-lbl">STATUS</span>
            <span class="status-hero-val">{{ (selectedReport.status || 'PENDING').toUpperCase() }}</span>
          </div>
          <div class="detail-grid">
            <div class="d-item" v-for="it in [
              { l:'Type', v: selectedReport.type || 'N/A', i:'mdi-format-list-bulleted' },
              { l:'Reported by', v: userName, i:'mdi-account' },
              { l:'Severity', v: selectedReport.severity || 'N/A', i:'mdi-alert' },
              { l:'Landmark', v: selectedReport.landmark || selectedReport.location || 'N/A', i:'mdi-map-marker' },
              { l:'Assigned to', v: selectedReport.assigned_personnel || 'Not yet assigned', i:'mdi-account-hard-hat' },
              { l:'Coordinates', v: selectedReport.latitude ? `${Number(selectedReport.latitude).toFixed(5)}, ${Number(selectedReport.longitude).toFixed(5)}` : 'N/A', i:'mdi-crosshairs-gps' },
            ]" :key="it.l">
              <div class="d-item-lbl"><v-icon size="13">{{ it.i }}</v-icon> {{ it.l }}</div>
              <div class="d-item-val">{{ it.v }}</div>
            </div>
            <div v-if="selectedReport.notes" class="d-item d-item--full">
              <div class="d-item-lbl"><v-icon size="13">mdi-note-text</v-icon> Notes</div>
              <div class="d-item-val">{{ selectedReport.notes }}</div>
            </div>
          </div>
          <div v-if="selectedReport.images && selectedReport.images.length" class="dialog-imgs">
            <p class="imgs-lbl"><v-icon size="13">mdi-image-multiple</v-icon> Attached Photos</p>
            <div class="imgs-grid">
              <img v-for="(img, i) in selectedReport.images" :key="i" :src="img" class="thumb" @click="openImageViewer(img)" />
            </div>
          </div>
        </div>
        <div class="dialog-foot">
          <button class="btn-outline" @click="showMapDialog = true"><v-icon size="15" class="mr-1">mdi-map-marker</v-icon> Adjust Location</button>
          <button class="btn-primary" @click="dialog = false"><v-icon size="15" class="mr-1">mdi-close</v-icon> Close</button>
        </div>
      </div>
    </v-dialog>

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

    <v-dialog v-model="showMapDialog" max-width="800">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-bar">
          <div class="dialog-bar-left"><v-icon size="19" color="white">mdi-map-marker</v-icon><h3>Adjust Map Location</h3></div>
          <button class="dialog-x" @click="showMapDialog = false"><v-icon size="19" color="white">mdi-close</v-icon></button>
        </div>
        <div class="dialog-body">
          <p style="font-size:13px;color:#64748b;margin:0 0 12px;">Click on the map to place or move the pin, then save.</p>
          <div id="report-map" style="height:400px;width:100%;border-radius:12px;border:1px solid #e2e8f0;position:relative;z-index:0;" />
        </div>
        <div class="dialog-foot">
          <button class="btn-outline" @click="showMapDialog = false">Cancel</button>
          <button class="btn-primary" @click="savePin" :disabled="!markerInstance"><v-icon size="15" class="mr-1">mdi-check</v-icon> Save Location</button>
        </div>
      </div>
    </v-dialog>

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

/* ── Header — WHITE (matches RegisterView) ── */
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
.header-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.header-time { font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; }
.bcwd-header.dark .header-time { color: #94a3b8; }

/* ── Sidebar — LIGHT BLUE ── */
.bcwd-sidebar { background: #1d4ed8 !important; border-right: none !important; box-shadow: 2px 0 16px rgba(29,78,216,0.25) !important; }
.bcwd-app.dark .bcwd-sidebar { background: #0f2560 !important; }

.sidebar-profile { display: flex; align-items: center; gap: 12px; padding: 20px 16px 14px; }
.sidebar-profile--rail { justify-content: center; padding: 18px 0; }
.profile-av { flex-shrink: 0; border: 2px solid rgba(255,255,255,0.35) !important; }
.av-text { font-size: 20px; font-weight: 700; color: white; }
.profile-meta { overflow: hidden; }
.profile-name { font-size: 14px; font-weight: 700; color: #ffffff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-role { font-size: 11px; color: rgba(255,255,255,0.65); margin: 2px 0 0; font-weight: 500; }

.sidebar-sep { height: 1px; background: rgba(255,255,255,0.18); margin: 0 14px 10px; }

.sidebar-nav { display: flex; flex-direction: column; padding: 0 10px; gap: 3px; }
.s-nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.75); cursor: pointer; font-size: 14px; font-weight: 500; width: 100%; text-align: left; transition: all 0.18s; font-family: 'Plus Jakarta Sans', sans-serif; position: relative; }
.s-nav-item:hover { background: rgba(255,255,255,0.15); color: #ffffff; }
.s-nav-item--active { background: rgba(255,255,255,0.2) !important; color: #ffffff !important; font-weight: 700 !important; box-shadow: inset 3px 0 0 #ffffff; }
.s-nav-label { flex: 1; }
.s-nav-badge { background: #ef4444; color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px; }
.s-nav-item--logout { margin-top: 20px; color: rgba(255,200,200,0.85) !important; }
.s-nav-item--logout:hover { background: rgba(239,68,68,0.25) !important; color: #fca5a5 !important; }

/* ── Rail toggle ── */
.rail-lump {
  position: absolute; top: 50%; right: -16px; transform: translateY(-50%);
  width: 32px; height: 64px; border-radius: 0 14px 14px 0;
  background: #1d4ed8; border: 1px solid rgba(255,255,255,0.2); border-left: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 3px 0 10px rgba(29,78,216,0.3);
  transition: all 0.2s; z-index: 10;
}
.bcwd-app.dark .rail-lump { background: #0f2560; }
.rail-lump:hover { background: #1e40af; }

/* ── Main ── */
.bcwd-main { background: var(--bg) !important; display: flex; flex-direction: column; }
.view-full { flex: 1; padding: 28px 32px 0; width: 100%; max-width: 100%; }

/* ── Page header ── */
.page-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 26px; font-weight: 800; color: var(--text); margin: 0 0 4px; letter-spacing: -0.5px; }
.page-sub { font-size: 14px; color: var(--muted); margin: 0; }
.page-hdr-actions { display: flex; align-items: center; gap: 12px; }

/* ── Buttons ── */
.btn-primary { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; box-shadow: 0 4px 12px rgba(29,78,216,0.3); font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(29,78,216,0.4); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
.btn-outline { background: transparent; color: #1d4ed8; border: 1.5px solid #1d4ed8; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-outline:hover { background: rgba(29,78,216,0.06); }
.bcwd-app.dark .btn-outline { color: #60a5fa; border-color: #60a5fa; }
.btn-success { background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-ghost { background: transparent; color: #1d4ed8; border: none; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; border-radius: 8px; transition: 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-ghost:hover { background: rgba(29,78,216,0.08); }
.btn-edit { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; font-family: 'Plus Jakarta Sans', sans-serif; transition: 0.2s; }
.btn-edit:hover { background: #dbeafe; }

/* ── Notif button ── */
.notif-btn { position: relative; width: 40px; height: 40px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: var(--surface); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--muted); transition: 0.2s; }
.notif-btn:hover { border-color: #1d4ed8; color: #1d4ed8; }
.notif-badge { position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; font-size: 10px; font-weight: 800; padding: 2px 5px; border-radius: 8px; min-width: 18px; text-align: center; }

/* ── Update banner ── */
.update-banner { display: flex; align-items: center; gap: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin-bottom: 18px; font-size: 14px; color: #1e40af; }
.bcwd-app.dark .update-banner { background: rgba(29,78,216,0.1); border-color: rgba(59,130,246,0.25); color: #93c5fd; }

/* ── Filter rows ── */
.filter-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.f-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 50px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.f-chip:hover { border-color: #1d4ed8; color: #1d4ed8; }
.f-chip-count { font-size: 11px; font-weight: 800; background: var(--surface2); padding: 1px 7px; border-radius: 10px; }
.f-chip--on.f-chip--all      { background: #1d4ed8; border-color: #1d4ed8; color: white; }
.f-chip--on.f-chip--pending  { background: #f59e0b; border-color: #f59e0b; color: white; }
.f-chip--on.f-chip--ongoing  { background: #3b82f6; border-color: #3b82f6; color: white; }
.f-chip--on.f-chip--resolved { background: #22c55e; border-color: #22c55e; color: white; }
.f-chip--on.f-chip--rejected { background: #ef4444; border-color: #ef4444; color: white; }
.f-chip--on .f-chip-count { background: rgba(255,255,255,0.22); color: white; }
.type-row { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 18px; }
.t-chip { display: inline-flex; align-items: center; padding: 5px 13px; border-radius: 50px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 12px; font-weight: 500; cursor: pointer; transition: 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.t-chip:hover { border-color: #1d4ed8; color: #1d4ed8; }
.t-chip--on { background: #eff6ff; border-color: #1d4ed8; color: #1d4ed8; font-weight: 700; }
.bcwd-app.dark .t-chip--on { background: rgba(29,78,216,0.14); border-color: #60a5fa; color: #60a5fa; }

/* ── Reports list ── */
.reports-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.r-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s; }
.r-card:hover { border-color: #1d4ed8; box-shadow: 0 4px 16px rgba(29,78,216,0.1); transform: translateX(2px); }
.r-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.r-icon--red    { background: #fef2f2; color: #ef4444; }
.r-icon--orange { background: #fff7ed; color: #f97316; }
.r-icon--grey   { background: #f8fafc; color: #94a3b8; }
.bcwd-app.dark .r-icon--red    { background: rgba(239,68,68,0.12); }
.bcwd-app.dark .r-icon--orange { background: rgba(249,115,22,0.12); }
.bcwd-app.dark .r-icon--grey   { background: rgba(148,163,184,0.12); }
.r-body { flex: 1; min-width: 0; }
.r-top { display: flex; align-items: center; gap: 12px; margin-bottom: 5px; }
.r-title { font-size: 15px; font-weight: 600; color: var(--text); margin: 0; }
.r-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--muted); }
.r-meta span { display: flex; align-items: center; gap: 4px; }
.r-updated { font-size: 11px; color: #22c55e; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px; }

/* ── Status pills ── */
.s-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
.s-pill--pending  { background: #fef3c7; color: #92400e; }
.s-pill--ongoing  { background: #dbeafe; color: #1e40af; }
.s-pill--resolved { background: #dcfce7; color: #166534; }
.s-pill--rejected { background: #fee2e2; color: #991b1b; }
.bcwd-app.dark .s-pill--pending  { background: rgba(245,158,11,0.18); color: #fbbf24; }
.bcwd-app.dark .s-pill--ongoing  { background: rgba(59,130,246,0.18); color: #60a5fa; }
.bcwd-app.dark .s-pill--resolved { background: rgba(34,197,94,0.18);  color: #4ade80; }
.bcwd-app.dark .s-pill--rejected { background: rgba(239,68,68,0.18);  color: #f87171; }

.pagination-row { display: flex; justify-content: center; padding: 8px 0 24px; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 24px; color: var(--muted); gap: 6px; }
.empty-title { font-size: 18px; font-weight: 700; color: var(--text); margin: 8px 0 0; }
.empty-sub { font-size: 14px; color: var(--muted); margin: 0; }

/* ═══ PROFILE PAGE ═══ */
.profile-page { max-width: 100%; }
.profile-hero { position: relative; border-radius: 18px; overflow: hidden; margin-bottom: 24px; }
.profile-hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #1d4ed8, #2563eb, #7c3aed); }
.profile-hero-bg::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 24px 24px; }
.profile-hero-content { position: relative; z-index: 1; display: flex; align-items: center; gap: 24px; padding: 36px 32px; flex-wrap: wrap; }
.profile-hero-av { border: 4px solid rgba(255,255,255,0.35) !important; flex-shrink: 0; }
.av-hero-text { font-size: 36px; font-weight: 800; color: white; }
.profile-hero-info { flex: 1; }
.profile-hero-name { font-size: 24px; font-weight: 800; color: #fff; margin: 0 0 4px; letter-spacing: -0.4px; }
.profile-hero-email { font-size: 14px; color: rgba(255,255,255,0.75); margin: 0 0 10px; }
.profile-hero-badge { display: inline-flex; align-items: center; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }

.profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.p-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.p-card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px; }
.p-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.p-card-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 2px; }
.p-card-sub { font-size: 12px; color: var(--muted); margin: 0; }
.p-fields { display: flex; flex-direction: column; gap: 2px; }
.p-field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.p-actions { display: flex; gap: 10px; margin-top: 12px; }

.quick-actions { display: flex; flex-direction: column; gap: 4px; }
.qa-btn { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface2); cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; text-align: left; width: 100%; }
.qa-btn:hover { border-color: #1d4ed8; background: #eff6ff; transform: translateX(2px); }
.bcwd-app.dark .qa-btn:hover { border-color: rgba(59,130,246,0.4); background: rgba(29,78,216,0.1); }
.qa-icon { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.qa-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.qa-label { font-size: 14px; font-weight: 600; color: var(--text); }
.qa-sub { font-size: 12px; color: var(--muted); }

/* ═══ SETTINGS PAGE ═══ */
.settings-page { max-width: 100%; }
.settings-hero { display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, #1d4ed8, #2563eb); border-radius: 16px; padding: 28px 32px; margin-bottom: 24px; }
.settings-hero-icon { width: 64px; height: 64px; background: rgba(255,255,255,0.18); border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.25); }
.settings-hero-title { font-size: 24px; font-weight: 800; color: white; margin: 0 0 4px; letter-spacing: -0.4px; }
.settings-hero-sub { font-size: 14px; color: rgba(255,255,255,0.75); margin: 0; }

.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
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
.theme-btn--on:hover { background: #1e40af; }

.items-select-group { display: flex; border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden; }
.items-btn { padding: 7px 14px; border: none; background: transparent; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.18s; font-family: 'Plus Jakarta Sans', sans-serif; }
.items-btn--on { background: #1d4ed8; color: white; }

.about-info { display: flex; flex-direction: column; gap: 10px; }
.about-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 14px; background: var(--surface2); border-radius: 10px; border: 1px solid var(--border); gap: 12px; }
.about-lbl { font-size: 12px; font-weight: 600; color: var(--muted); min-width: 70px; }
.about-val { font-size: 13px; font-weight: 600; color: var(--text); text-align: right; flex: 1; }

/* ── Footer ── */
.bcwd-footer { background: #1e3a8a; color: white; padding: 10px 0; font-size: 12px; margin-top: auto; }
.footer-row { max-width: 100%; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.footer-contacts { display: flex; gap: 16px; opacity: 0.8; }
.footer-contacts span { display: flex; align-items: center; gap: 5px; }

/* ═══ DIALOGS ═══ */
/* Force Vuetify's own dialog card to be opaque */
:deep(.v-dialog > .v-overlay__content > *) { background: #ffffff !important; border-radius: 20px !important; }
:deep(.v-dialog .v-card) { background: #ffffff !important; }
.bcwd-app.dark :deep(.v-dialog > .v-overlay__content > *) { background: #0f1e35 !important; }
.bcwd-app.dark :deep(.v-dialog .v-card) { background: #0f1e35 !important; }

.bcwd-dialog { background: #ffffff !important; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.22); }
.bcwd-app.dark .bcwd-dialog { background: #0f1e35 !important; }
.dialog-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; background: linear-gradient(135deg, #1d4ed8, #2563eb); }
.dialog-bar-left { display: flex; align-items: center; gap: 10px; }
.dialog-bar-left h3 { font-size: 15px; font-weight: 700; color: white; margin: 0; }
.dialog-x { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.dialog-x:hover { background: rgba(255,255,255,0.2); }
.dialog-body { padding: 22px; background: #ffffff !important; }
.bcwd-app.dark .dialog-body { background: #0f1e35 !important; }
.dialog-foot { padding: 14px 22px; background: #f8fafc !important; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
.bcwd-app.dark .dialog-foot { background: #0c1828 !important; border-top-color: rgba(255,255,255,0.09); }

.status-hero { display: flex; flex-direction: column; align-items: center; padding: 20px; border-radius: 14px; margin-bottom: 18px; border: 2px solid; }
.status-hero--pending  { background: #fef3c7; border-color: #f59e0b; }
.status-hero--ongoing  { background: #dbeafe; border-color: #3b82f6; }
.status-hero--resolved { background: #dcfce7; border-color: #22c55e; }
.status-hero--rejected { background: #fee2e2; border-color: #ef4444; }
.bcwd-app.dark .status-hero--pending  { background: rgba(245,158,11,0.1); }
.bcwd-app.dark .status-hero--ongoing  { background: rgba(59,130,246,0.1); }
.bcwd-app.dark .status-hero--resolved { background: rgba(34,197,94,0.1); }
.bcwd-app.dark .status-hero--rejected { background: rgba(239,68,68,0.1); }
.status-hero-lbl { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; opacity: 0.55; margin-bottom: 4px; color: #0f172a; }
.status-hero-val { font-size: 26px; font-weight: 800; letter-spacing: 1px; }
.status-hero--pending  .status-hero-val { color: #92400e; }
.status-hero--ongoing  .status-hero-val { color: #1e40af; }
.status-hero--resolved .status-hero-val { color: #166534; }
.status-hero--rejected .status-hero-val { color: #991b1b; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.d-item { background: #f0f6ff !important; border-radius: 10px; padding: 11px 13px; border: 1px solid #bfdbfe; }
.bcwd-app.dark .d-item { background: #0c1828 !important; border-color: rgba(255,255,255,0.09); }
.d-item--full { grid-column: 1 / -1; }
.d-item-lbl { font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
.bcwd-app.dark .d-item-lbl { color: #60a5fa; }
.d-item-val { font-size: 14px; font-weight: 600; color: #0f172a; }
.bcwd-app.dark .d-item-val { color: #f1f5f9; }

.dialog-imgs { margin-top: 8px; }
.imgs-lbl { font-size: 12px; font-weight: 600; color: var(--muted); margin: 0 0 10px; display: flex; align-items: center; gap: 5px; }
.imgs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
.thumb { width: 100%; height: 110px; object-fit: cover; border-radius: 10px; cursor: pointer; transition: 0.2s; border: 1px solid var(--border); }
.thumb:hover { transform: scale(1.04); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }

/* ── Image Viewer ── */
.img-viewer { width: 100vw; height: 100vh; display: flex; flex-direction: column; }
.img-viewer.light { background: #f8fafc; }
.img-viewer.dark  { background: #060e1a; }
.img-viewer-bar { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; padding: 14px 22px; display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: 700; }
.viewer-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: 0.2s; }
.viewer-btn:hover { background: rgba(255,255,255,0.2); }
.viewer-btn--red { background: rgba(239,68,68,0.3); border-color: rgba(239,68,68,0.4); }
.img-viewer-body { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.viewer-img { max-width: 100%; max-height: 80vh; object-fit: contain; transition: transform 0.2s ease; }

/* ── V-field overrides ── */
:deep(.v-field) { border-radius: 10px !important; }
:deep(.v-navigation-drawer__scrim) { display: none; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .profile-grid { grid-template-columns: 1fr; }
  .settings-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .view-full { padding: 20px 16px 0; }
  .footer-row { padding: 0 16px; }
  .p-field-group { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .page-hdr { flex-direction: column; }
  .view-full { padding: 16px 12px 0; }
}
</style>