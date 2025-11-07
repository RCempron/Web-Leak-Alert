<!-- src/views/system/AdminDashboard.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'vue-router'

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
</script>

<template>
  <v-app :theme="theme">
    <!-- HEADER -->
    <v-app-bar
      flat
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-4'"
      class="px-6"
    >
      <v-toolbar-title class="font-weight-bold text-h5 d-flex align-center">
        <v-img src="/images/LeakAlertLogo.png" width="34" height="34" class="mr-2" />
        <span :class="theme === 'light' ? 'text-blue' : 'text-blue-lighten-3'">Leak</span>
        <span class="text-black">Alert (Admin)</span>
      </v-toolbar-title>

      <v-spacer />

      <v-btn
        :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
      ></v-btn>

      <v-btn prepend-icon="mdi-logout" color="error" variant="text" @click="logout"> Logout </v-btn>
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
                View all leak reports submitted by users.
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
                    class="pa-4 modern-card"
                    :color="theme === 'light' ? 'grey-lighten-5' : 'blue-grey-darken-2'"
                  >
                    <div class="d-flex justify-space-between align-start mb-2">
                      <div>
                        <h3 class="mb-1 font-weight-medium">{{ rep.type }}</h3>
                        <small class="text-caption">User ID: {{ rep.user_id }}</small>
                      </div>
                      <v-chip
                        :color="
                          rep.status === 'pending'
                            ? 'orange'
                            : rep.status === 'resolved'
                              ? 'green'
                              : rep.status === 'rejected'
                                ? 'red'
                                : 'blue'
                        "
                        class="text-white text-capitalize"
                      >
                        {{ rep.status }}
                      </v-chip>
                    </div>

                    <p><strong>Severity:</strong> {{ rep.severity }}</p>
                    <p><strong>Landmark:</strong> {{ rep.landmark || 'N/A' }}</p>
                    <p><strong>Notes:</strong> {{ rep.notes || 'N/A' }}</p>
                    <p class="text-caption text-medium-emphasis mb-2">
                      Submitted: {{ new Date(rep.created_at).toLocaleString() }}
                    </p>

                    <v-row v-if="rep.images" dense class="mb-3">
                      <v-col v-for="(img, i) in rep.images" :key="i" cols="6" sm="4">
                        <v-img
                          :src="img"
                          height="100"
                          contain
                          class="rounded cursor-pointer"
                          @click="openImages(rep.images)"
                        />
                      </v-col>
                    </v-row>
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
    <v-footer
      class="text-center py-2"
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-3'"
    >
      <small>&copy; 2025 LeakAlert | Admin Portal</small>
    </v-footer>

    <!-- IMAGE MODAL -->
    <v-dialog v-model="showImages" width="800">
      <v-card>
        <v-card-title class="text-h6">Report Images</v-card-title>
        <v-card-text>
          <v-row>
            <v-col
              v-for="(img, i) in selectedImages"
              :key="i"
              cols="12"
              sm="6"
              class="d-flex justify-center"
            >
              <v-img :src="img" height="220" contain rounded />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showImages = false">Close</v-btn>
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
</style>
