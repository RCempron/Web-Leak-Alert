<!-- src/views/system/DashboardView.vue -->
<script setup>
import { ref, onMounted, onUnmounted, watch, computed, onActivated } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase.js'
import AlertNotification from '@/components/common/AlertNotification.vue'
const { mobile } = useDisplay()
const router = useRouter()
// Vuetify theme helper
const vuetifyTheme = useTheme()
// Persistent theme (read from localStorage)
const theme = ref(localStorage.getItem('theme') ?? 'light')
// Apply initial theme to Vuetify
vuetifyTheme.change(theme.value)
// toggle theme (and persist)
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.change(theme.value)
}
// keep Vuetify in sync if theme is changed elsewhere
watch(theme, (val) => {
  vuetifyTheme.change(val)
})
// Logout function
async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
// Dashboard cards (report icon color changed to red)
const cards = [
  { title: 'Report a Leak', icon: 'mdi-water-alert', color: 'red', route: '/report' },
  {
    title: 'My Reports',
    icon: 'mdi-format-list-bulleted',
    color: 'green',
    route: '/my-reports',
    notify: true,
  },
  { title: 'Profile', icon: 'mdi-account-circle', color: 'deep-purple', route: '/profile' },
]
// -------- Philippine live date/time ----------
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
// 🔔 REPORT STATUS INDICATOR
const updatedReports = ref(new Set())
const lastViewedUpdates = ref(JSON.parse(localStorage.getItem('lastViewedUpdates') || '{}'))
// Fetch reports
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
// Status counts
const statusCounts = computed(() => {
  const counts = { all: reports.value.length, pending: 0, ongoing: 0, resolved: 0, rejected: 0 }
  reports.value.forEach((r) => {
    if (r.status in counts) counts[r.status]++
  })
  return counts
})
// Type counts
const typeCounts = computed(() => {
  const counts = {}
  reports.value.forEach((r) => {
    const t = (r.type || 'other').toLowerCase()
    counts[t] = (counts[t] || 0) + 1
  })
  return counts
})
// Filters
const currentStatus = ref('all')
const selectedType = ref('all')
// Filtered reports
const filteredReports = computed(() => {
  let filtered = reports.value
  if (currentStatus.value !== 'all') {
    filtered = filtered.filter((r) => r.status === currentStatus.value)
  }
  if (selectedType.value && selectedType.value !== 'all') {
    filtered = filtered.filter((r) => (r.type || 'other').toLowerCase() === selectedType.value)
  }
  return filtered
})
// Pagination
const page = ref(1)
const itemsPerPage = 10
const paginatedReports = computed(() => {
  const start = (page.value - 1) * itemsPerPage
  return filteredReports.value.slice(start, start + itemsPerPage)
})
const paginationLength = computed(() => Math.ceil(filteredReports.value.length / itemsPerPage))
// Type maps
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
// User name for profile
const userName = ref('')
async function fetchUser() {
  const { data } = await supabase.auth.getUser()
  const metadata = data?.user?.user_metadata || {}
  userName.value =
    `${metadata.firstname || ''} ${metadata.lastname || ''}`.trim() ||
    data?.user?.email?.split('@')[0] ||
    'User'
}
// Report details dialog
const dialog = ref(false)
const selectedReport = ref(null)
function openReportDetails(report) {
  selectedReport.value = report
  dialog.value = true
  lastViewedUpdates.value[report.id] = report.updated_at
  localStorage.setItem('lastViewedUpdates', JSON.stringify(lastViewedUpdates.value))
  updatedReports.value.delete(report.id)
}
// Image zoom dialog
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
// Drawer control
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
// Load data function
async function loadData() {
  await fetchReports()
  await fetchUser()
  // Compute updated reports after fetching
  const updated = reports.value.filter((r) => {
    const lastViewed = lastViewedUpdates.value[r.id]
    const updatedDate = new Date(r.updated_at)
    const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0)
    return r.status !== 'pending' && r.updated_at && updatedDate > lastViewedDate
  })
  updatedReports.value = new Set(updated.map((r) => r.id))
}
// On mounted and activated
onMounted(loadData)
onActivated(loadData)
// Profile logic
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
</script>
<template>
  <v-app :theme="theme">
    <!-- Header -->
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
      class="px-3 px-sm-6"
    >
      <v-btn icon @click="toggleSidebar">
        <v-icon>mdi-menu</v-icon>
      </v-btn>
      <v-toolbar-title class="font-weight-bold">BCWD Complaint System</v-toolbar-title>
      <v-spacer />
      <div class="d-flex align-center gap-2">
        <!-- Live PH time - Hidden on small mobile -->
        <div
          class="text-caption text-white font-weight-medium ph-time"
          :class="{ 'd-none d-sm-block': mobile }"
        >
          {{ phTime }}
        </div>
        <!-- Theme toggle -->
        <v-btn icon variant="text" @click="toggleTheme">
          <v-icon>{{ theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>
        <!-- Logout -->
        <v-btn icon variant="text" @click="logout">
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </div>
    </v-app-bar>
    <!-- DRAWER / SIDEBAR -->
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
              {{ userName }}
            </div>
            <div class="admin-role text-caption opacity-70">Consumer</div>
          </div>
        </div>

        <v-divider class="my-3 mx-4" :class="{ 'mt-6': !mobile && rail }" />

        <v-list-item
          :active="currentView === 'dashboard'"
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          class="mb-1"
          @click="currentView = 'dashboard'"
        />
        <v-list-item
          :active="currentView === 'profile'"
          prepend-icon="mdi-account-circle"
          title="Profile"
          class="mb-1"
          @click="currentView = 'profile'"
        />
        <v-list-item prepend-icon="mdi-logout" title="Logout" @click="logout" class="mt-8" />
      </v-list>
    </v-navigation-drawer>
    <!-- Main -->
    <v-main class="bg-grey-lighten-4" :class="theme === 'dark' ? 'bg-grey-darken-4' : ''">
      <v-container fluid class="pa-4 pa-md-6">
        <!-- Welcome Section -->
        <div class="text-center mb-8">
          <h2 class="text-h4 font-weight-bold mb-2">Welcome to BCWD Complaint System</h2>
          <p class="text-body-1 text-medium-emphasis">
            Report and track water-related issues quickly and easily.
          </p>
        </div>
        <!-- Dynamic Content -->
        <div v-if="currentView === 'dashboard'">
          <!-- MY REPORTS SECTION -->
          <v-card rounded="lg" elevation="2" class="position-relative">
            <v-card-title class="d-flex align-center justify-space-between py-4 px-6">
              <div class="text-h6 font-weight-bold">My Reports</div>
              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                variant="flat"
                @click="router.push('/report')"
              >
                New Report
              </v-btn>
            </v-card-title>
            <v-card-text class="px-6 pb-6">
              <!-- Status Tabs -->
              <v-chip-group v-model="currentStatus" mandatory class="mb-6">
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
              <!-- Filter by Type -->
              <div class="mb-6">
                <div class="text-subtitle-1 mb-2">Filter by Type</div>
                <v-chip-group v-model="selectedType" class="d-flex flex-wrap">
                  <v-chip value="all" :variant="selectedType === 'all' ? 'flat' : 'outlined'"
                    >All Reports ({{ reports.length }})</v-chip
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
              <!-- Report Items -->
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
                </v-col>
              </v-row>
              <!-- Pagination -->
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
        <div v-else>
          <v-card
            class="pa-3 pa-sm-5 text-center modern-card mx-auto"
            :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            elevation="10"
            rounded="xl"
            max-width="700"
          >
            <!-- Avatar -->
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
            <!-- Loader -->
            <v-skeleton-loader v-if="loading" type="heading, paragraph, paragraph" class="mb-4" />
            <!-- Profile Fields -->
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
              <!-- ✅ Fixed Responsive Buttons -->
              <div class="button-group d-flex flex-wrap justify-center align-center mt-6">
                <v-btn
                  v-if="!editing"
                  color="primary"
                  size="large"
                  class="flex-btn"
                  @click="editing = true"
                >
                  <v-icon start>mdi-account-edit</v-icon>
                  Edit Profile
                </v-btn>
                <v-btn
                  v-else
                  color="success"
                  size="large"
                  class="flex-btn"
                  :loading="saving"
                  @click="saveProfile"
                >
                  <v-icon start>mdi-content-save</v-icon>
                  Save Changes
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
                  <v-icon start>mdi-logout</v-icon>
                  Logout
                </v-btn>
              </div>
            </div>
          </v-card>
        </div>
      </v-container>
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
            <v-row v-if="selectedReport.images?.length" dense class="mt-4">
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
      <!-- Footer Content Inside Main (for mobile) - Outside container -->
      <v-row v-if="mobile" class="mt-8 mx-0">
        <v-col cols="12" class="px-0">
          <div
            class="footer-mobile-content"
            :class="theme === 'light' ? 'bg-footer-light' : 'bg-footer-dark'"
          >
            <div class="footer-content-mobile text-center py-4">
              <div class="mb-3">
                <span class="text-caption font-weight-medium text-white"
                  >&copy; 2025 BCWD Complaint System</span
                >
              </div>
              <div class="footer-contacts-mobile mb-3">
                <div class="contact-line mb-1">
                  <v-icon size="12" class="mr-1 text-white">mdi-map-marker</v-icon>
                  <span class="text-caption text-white"
                    >Gov. Jose A. Rosales Ave., Butuan City</span
                  >
                </div>
                <div class="contact-line mb-1">
                  <v-icon size="12" class="mr-1 text-white">mdi-phone</v-icon>
                  <span class="text-caption text-white">(085) 817-6635</span>
                </div>
                <div class="contact-line mb-1">
                  <v-icon size="12" class="mr-1 text-white">mdi-cellphone</v-icon>
                  <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
                </div>
                <div class="contact-line mb-1">
                  <v-icon size="12" class="mr-1 text-white">mdi-email</v-icon>
                  <span class="text-caption text-white">bcwdrecords@gmail.com</span>
                </div>
              </div>
              <div>
                <small class="text-caption font-weight-medium text-white"
                  >Philippines (Asia/Manila)</small
                >
              </div>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-main>
    <!-- Footer (Desktop only) -->
    <v-footer
      v-if="!mobile"
      app
      class="py-2 footer-bar"
      height="52"
      :color="theme === 'light' ? '#1565c0' : '#0f1720'"
    >
      <v-container class="pa-0">
        <v-row no-gutters align="center" class="footer-content px-2 px-sm-4 justify-space-between">
          <!-- Copyright - Left -->
          <div class="footer-section copyright d-flex align-center">
            <span class="text-caption font-weight-medium text-white"
              >&copy; 2025 BCWD Complaint System</span
            >
          </div>
          <!-- Contact Info - Center -->
          <div
            class="footer-section contacts d-flex align-center justify-center flex-nowrap flex-grow-1 mx-4"
          >
            <!-- Address -->
            <div class="contact-item d-flex align-center gap-1 mx-1 mx-sm-2">
              <v-icon size="12" class="mr-1 text-white">mdi-map-marker</v-icon>
              <span class="text-caption text-white">Gov. Jose A. Rosales Ave., Butuan City</span>
            </div>
            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />
            <!-- Phone -->
            <div class="contact-item d-flex align-center gap-1 mx-1 mx-sm-2">
              <v-icon size="12" class="mr-1 text-white">mdi-phone</v-icon>
              <span class="text-caption text-white">(085) 817-6635</span>
            </div>
            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />
            <!-- Mobile -->
            <div class="contact-item d-flex align-center gap-1 mx-1 mx-sm-2">
              <v-icon size="12" class="mr-1 text-white">mdi-cellphone</v-icon>
              <span class="text-caption text-white">0918-930-4234 • 0917-188-8726</span>
            </div>
            <v-divider vertical thickness="1" class="mx-1 mx-sm-2 divider-item" />
            <!-- Email -->
            <div class="contact-item d-flex align-center gap-1 mx-1 mx-sm-2">
              <v-icon size="12" class="mr-1 text-white">mdi-email</v-icon>
              <span class="text-caption text-white">bcwdrecords@gmail.com</span>
            </div>
          </div>
          <!-- Time Zone - Right -->
          <div class="footer-section timezone d-flex align-center">
            <small class="text-caption font-weight-medium text-white"
              >Philippines (Asia/Manila)</small
            >
          </div>
        </v-row>
      </v-container>
    </v-footer>
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
/* Footer background colors */
.bg-footer-light {
  background-color: #1565c0;
}
.bg-footer-dark {
  background-color: #0f1720;
}
/* Additional styles from Code 1 if needed */
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
.text-blue {
  color: #1976d2;
}
.text-black {
  color: #000000;
}
.bg-grey-lighten-5 {
  background-color: #f5f5f5;
}
.bg-grey-darken-4 {
  background-color: #121212;
}
/* Footer background colors */
.bg-footer-light {
  background-color: #0f5088;
}
.bg-footer-dark {
  background-color: #0b1116;
}
/* header tweaks */
.header-bar {
  color: #fff;
}
.header-sub {
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
}
/* footer tweaks */
.footer-bar {
  color: #fff;
}
.footer-links a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 0.875rem;
}
/* Footer responsive styles */
.footer-content {
  flex-wrap: nowrap;
  min-height: 52px;
}
.footer-section .text-caption {
  font-size: 0.75rem;
  white-space: nowrap;
}
.contacts {
  gap: 0.5rem;
}
.contact-item,
.divider-item {
  transition: all 0.3s ease;
}
.divider-item {
  opacity: 0.3;
}
/* Mobile footer inside main */
.footer-mobile-content {
  width: 100%;
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
/* small styling for PH time */
.ph-time {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  white-space: nowrap;
}
/* Card styling */
.modern-card {
  transition: all 0.3s ease;
}
.modern-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
/* ✅ Fix buttons to be fluid and wrap nicely */
.button-group {
  gap: 12px;
  width: 100%;
}
.flex-btn {
  flex: 1 1 200px; /* grows, shrinks, min width 200px */
  max-width: 240px;
  justify-content: center;
}
@media (max-width: 600px) {
  .flex-btn {
    flex: 1 1 100%;
    max-width: 100%;
  }
}
/* Ensure main content has enough space on mobile */
.v-main {
  min-height: calc(100vh - 64px) !important;
}
/* Ensure white text colors */
.text-white {
  color: white !important;
}
/* Remove any potential white gaps */
.v-container {
  padding-bottom: 0 !important;
}
/* Add this to your style section */
.v-container {
  max-width: 100% !important;
}
@media (min-width: 600px) {
  .v-container {
    padding-left: 24px !important;
    padding-right: 24px !important;
  }
}
.v-main {
  overflow-y: auto !important;
}
</style>
