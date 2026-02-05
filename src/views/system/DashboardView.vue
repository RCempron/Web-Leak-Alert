<!-- src/views/system/DashboardView.vue -->
<script setup>
import { ref, onMounted, onUnmounted, watch, computed, onActivated } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase.js'
import AlertNotification from '@/components/common/AlertNotification.vue'

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
const hasNotifications = computed(() => notificationCount.value > 0)
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
  if (currentStatus.value !== 'all') {
    filtered = filtered.filter((r) => r.status === currentStatus.value)
  }
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

const typeIcons = {
  'low pressure': 'mdi-water',
  'broken pipe': 'mdi-pipe-leak',
  'dark colored water': 'mdi-water-alert',
  contamination: 'mdi-water-alert',
  'water leak': 'mdi-pipe-leak',
  other: 'mdi-help-circle',
}

const typeColors = {
  'low pressure': 'red',
  'broken pipe': 'red',
  'dark colored water': 'orange',
  contamination: 'orange',
  'water leak': 'red',
  other: 'grey',
}

const statusColors = {
  pending: 'amber',
  ongoing: 'blue',
  resolved: 'green',
  rejected: 'red',
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
    console.error('Failed to load user', err)
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
    console.error('Update failed', err)
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
      class="consumer-header"
    >
      <!-- FULL-WIDTH depth layer -->
      <div class="consumer-header-depth"></div>

      <!-- header content wrapper -->
      <div class="consumer-header-inner px-2 px-sm-6">
        <v-toolbar-title class="font-weight-bold consumer-header-title">
          BCWD Complaint System
        </v-toolbar-title>

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
          <v-avatar size="80" class="mb-4 elevation-6 profile-avatar" color="grey-lighten-4">
            <v-icon size="48" color="primary">mdi-account-circle</v-icon>
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
          class="mb-1"
          @click="handleMobileNav('dashboard')"
        />

        <v-list-item
          :active="currentView === 'profile'"
          prepend-icon="mdi-account-circle"
          title="Profile"
          class="mb-1"
          @click="handleMobileNav('profile')"
        />

        <v-list-item
          :active="currentView === 'settings'"
          prepend-icon="mdi-cog"
          title="Settings"
          class="mb-1"
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
        <div class="text-center mb-6 mb-md-8">
          <h2 class="font-weight-bold mb-2" :class="mobile ? 'text-h6' : 'text-h4'">
            Welcome to BCWD Complaint System
          </h2>
          <p class="text-medium-emphasis" :class="mobile ? 'text-caption' : 'text-body-1'">
            Report and track water-related issues quickly and easily.
          </p>
        </div>

        <!-- Dashboard View -->
        <div v-if="currentView === 'dashboard'">
          <v-card rounded="lg" elevation="2" class="position-relative">
            <v-card-title class="d-flex align-center justify-space-between py-4 px-6">
              <div class="text-h6 font-weight-bold">
                {{ showUpdatedOnly ? 'Updated Reports' : 'My Reports' }}
              </div>
              <div class="d-flex align-center gap-2">
                <v-btn v-if="!showUpdatedOnly" icon class="mr-3" @click="showUpdatedReports">
                  <v-badge
                    v-if="notificationCount > 0"
                    :content="notificationCount"
                    color="error"
                    floating
                    overlap
                  >
                    <v-icon size="24">mdi-bell-ring</v-icon>
                  </v-badge>
                  <v-icon v-else size="24">mdi-bell-ring</v-icon>
                </v-btn>
                <v-btn
                  v-if="!showUpdatedOnly"
                  color="primary"
                  prepend-icon="mdi-plus"
                  variant="flat"
                  size="large"
                  @click="router.push('/report')"
                >
                  New Report
                </v-btn>
              </div>
            </v-card-title>

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
                >
                  Go back to all reports
                </v-btn>
              </div>
            </v-alert>

            <v-card-text class="px-6 pb-6">
              <v-chip-group v-if="!showUpdatedOnly" v-model="currentStatus" mandatory class="mb-6">
                <v-chip
                  value="all"
                  :color="theme === 'light' ? 'primary' : 'blue-darken-2'"
                  variant="flat"
                  size="large"
                >
                  All <strong class="ml-1">{{ statusCounts.all }}</strong>
                </v-chip>
                <v-chip value="pending" color="amber" variant="flat" size="large">
                  Pending <strong class="ml-1">{{ statusCounts.pending }}</strong>
                </v-chip>
                <v-chip value="ongoing" color="blue" variant="flat" size="large">
                  Ongoing <strong class="ml-1">{{ statusCounts.ongoing }}</strong>
                </v-chip>
                <v-chip value="resolved" color="green" variant="flat" size="large">
                  Resolved <strong class="ml-1">{{ statusCounts.resolved }}</strong>
                </v-chip>
                <v-chip value="rejected" color="red" variant="flat" size="large">
                  Rejected <strong class="ml-1">{{ statusCounts.rejected }}</strong>
                </v-chip>
              </v-chip-group>

              <div v-if="!showUpdatedOnly" class="mb-6">
                <div class="text-subtitle-1 mb-2">Filter by Type</div>
                <v-chip-group v-model="selectedType" class="d-flex flex-wrap">
                  <v-chip value="all" :variant="selectedType === 'all' ? 'flat' : 'outlined'">
                    All Reports ({{ baseReportsForFiltering.length }})
                  </v-chip>
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
                      <v-list-item-title class="font-weight-medium">
                        {{ report.type || 'Other' }}
                      </v-list-item-title>
                      <v-list-item-subtitle class="mt-1">
                        <div class="text-caption mt-1">
                          Reported: {{ new Date(report.created_at).toLocaleDateString('en-PH') }}
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
                          >
                            Status Updated
                          </v-chip>
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
            <v-avatar size="90" class="mb-4">
              <v-icon size="90" color="primary">mdi-account-circle</v-icon>
            </v-avatar>
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
                >
                  <v-icon start>mdi-account-edit</v-icon> Edit Profile
                </v-btn>
                <v-btn
                  v-else
                  color="success"
                  size="large"
                  class="flex-btn"
                  :loading="saving"
                  @click="saveProfile"
                >
                  <v-icon start>mdi-content-save</v-icon> Save Changes
                </v-btn>
                <v-btn variant="outlined" size="large" @click="currentView = 'dashboard'">
                  <v-icon start>mdi-arrow-left</v-icon> Back
                </v-btn>
                <v-btn
                  color="error"
                  variant="outlined"
                  size="large"
                  class="flex-btn"
                  @click="logout"
                >
                  <v-icon start>mdi-logout</v-icon> Logout
                </v-btn>
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
            <v-avatar size="90" class="mb-4">
              <v-icon size="90" color="primary">mdi-cog</v-icon>
            </v-avatar>
            <h2 class="font-weight-bold mb-2" :class="mobile ? 'text-h6' : ''">Settings</h2>
            <p class="text-medium-emphasis mb-6" :class="mobile ? 'text-body-2' : ''">
              Manage your application settings
            </p>
            <v-divider class="mb-4" />
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
                <v-icon start>mdi-arrow-left</v-icon> Back
              </v-btn>
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
                <v-icon size="16" class="mr-2 text-white">mdi-map-marker</v-icon>
                <span class="text-body-2 text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
              </div>
              <div class="contact-line mb-2">
                <v-icon size="16" class="mr-2 text-white">mdi-phone</v-icon>
                <span class="text-body-2 text-white">(085) 817-6635</span>
              </div>
              <div class="contact-line mb-2">
                <v-icon size="16" class="mr-2 text-white">mdi-cellphone</v-icon>
                <span class="text-body-2 text-white">0918-930-4234 • 0917-188-8726</span>
              </div>
              <div class="contact-line mb-2">
                <v-icon size="16" class="mr-2 text-white">mdi-email</v-icon>
                <span class="text-body-2 text-white">bcwdrecords@gmail.com</span>
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
      class="py-6 footer-bar"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
    >
      <v-container class="pa-0">
        <v-row no-gutters align="center" class="footer-content px-2 px-sm-4 justify-space-between">
          <div class="footer-section copyright d-flex align-center mb-4 mb-md-0">
            <span class="text-body-2 font-weight-medium text-white"
              >&copy; 2025 BCWD Complaint System</span
            >
          </div>
          <div
            class="footer-section contacts d-flex flex-column align-center justify-center flex-grow-1 mx-4"
          >
            <div class="contact-item d-flex align-center gap-2 mb-2">
              <v-icon size="16" class="text-white">mdi-map-marker</v-icon>
              <span class="text-body-2 text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>
            <div class="contact-item d-flex align-center gap-2 mb-2">
              <v-icon size="16" class="text-white">mdi-phone</v-icon>
              <span class="text-body-2 text-white">(085) 817-6635</span>
            </div>
            <div class="contact-item d-flex align-center gap-2 mb-2">
              <v-icon size="16" class="text-white">mdi-cellphone</v-icon>
              <span class="text-body-2 text-white">0918-930-4234 • 0917-188-8726</span>
            </div>
            <div class="contact-item d-flex align-center gap-2 mb-2">
              <v-icon size="16" class="text-white">mdi-email</v-icon>
              <span class="text-body-2 text-white">bcwdrecords@gmail.com</span>
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
    <v-dialog v-model="dialog" max-width="600px">
      <v-card v-if="selectedReport" rounded="xl" class="pa-4">
        <v-card-title class="d-flex align-center pa-0 mb-4">
          <span class="text-h6 font-weight-bold">{{ selectedReport.type || 'Other' }}</span>
          <v-spacer />
          <v-chip :color="statusColors[selectedReport.status]" variant="outlined" size="small">
            {{ (selectedReport.status || 'pending').toUpperCase() }}
          </v-chip>
        </v-card-title>
        <v-card-text class="pa-0">
          <p class="mb-2">Severity: {{ selectedReport.severity || 'N/A' }}</p>
          <p class="mb-2">Pipe Location: {{ selectedReport.pipe_location || 'N/A' }}</p>
          <p class="mb-2">
            Landmark: {{ selectedReport.landmark || selectedReport.location || 'N/A' }}
          </p>
          <p class="mb-4">
            Notes: {{ selectedReport.notes || selectedReport.description || 'N/A' }}
          </p>
          <p class="mb-4 text-caption text-medium-emphasis">
            Submitted:
            {{
              new Date(selectedReport.created_at).toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true,
              })
            }}
          </p>
          <v-row v-if="selectedReport.images && selectedReport.images.length" dense class="mt-4">
            <v-col v-for="(img, i) in selectedReport.images" :key="i" cols="12" sm="6" md="4">
              <v-img
                :src="img"
                aspect-ratio="1"
                cover
                class="rounded cursor-pointer"
                @click="openImageViewer(img)"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Image Zoom Dialog -->
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

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" timeout="2000" color="success" location="bottom">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
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
}

.v-container {
  max-width: 100% !important;
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

/* ============================= */
/* CONSUMER HEADER DEPTH SYSTEM */
/* ============================= */

.consumer-header {
  position: relative;
  padding: 0 !important;
  overflow: hidden;
  z-index: 30;

  /* elevation */
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.25),
    0 6px 18px rgba(0, 0, 0, 0.18);

  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* full-width depth layer */
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

/* content wrapper */
.consumer-header-inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  width: 100%;
}

/* title depth */
.consumer-header-title {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  letter-spacing: 0.4px;
}

/* right side depth */
.consumer-header-right {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* dark mode tuning */
.v-theme--dark .consumer-header {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.55),
    0 10px 28px rgba(0, 0, 0, 0.65);

  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
</style>
