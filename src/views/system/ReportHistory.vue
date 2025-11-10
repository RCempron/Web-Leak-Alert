<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'

// states
const router = useRouter()
const reports = ref([])
const loading = ref(true)
const errorMessage = ref('')

// theme
const theme = ref(localStorage.getItem('theme') ?? 'light')
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
}

// fetch user reports
onMounted(async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError) throw userError

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    reports.value = data
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
})

// logout
// async function logout() {
//   await supabase.auth.signOut()
//   router.push('/login')
// }
</script>

<template>
  <v-app :theme="theme">
    <!-- Header -->
    <v-app-bar
      flat
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-4'"
      class="px-6"
    >
      <v-toolbar-title class="font-weight-bold" :class="mobile ? 'text-h6' : 'text-h5'">
        <span :class="theme === 'light' ? 'text-blue' : 'text-blue-lighten-3'">BCWD </span>
        <span :style="{ color: theme === 'light' ? '#000' : '#fff' }">Complaint System</span>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn
        :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
      ></v-btn>
    </v-app-bar>

    <!-- Main Content -->
    <v-main
      class="d-flex align-center justify-center"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
      style="min-height: calc(100vh - 64px - 48px)"
    >
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <v-card
              class="pa-6"
              elevation="8"
              rounded="xl"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <!-- 🔹 Back button moved to top -->
              <div class="d-flex justify-space-between align-center mb-4">
                <h2 class="font-weight-bold">My Report History</h2>
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-arrow-left"
                  @click="router.replace('/dashboard')"
                >
                  Back
                </v-btn>
              </div>

              <p class="text-center text-medium-emphasis mb-6">
                View all the reports you’ve submitted.
              </p>

              <v-progress-circular
                v-if="loading"
                indeterminate
                color="primary"
                size="48"
                class="mx-auto my-8 d-block"
              ></v-progress-circular>

              <v-alert v-else-if="errorMessage" type="error" class="mb-4">
                {{ errorMessage }}
              </v-alert>

              <v-alert v-else-if="!reports.length" type="info" class="text-center">
                You haven’t submitted any reports yet.
              </v-alert>

              <v-row v-else dense>
                <v-col v-for="report in reports" :key="report.id" cols="12" class="mb-3">
                  <v-card
                    elevation="3"
                    class="pa-4"
                    :color="theme === 'light' ? 'grey-lighten-5' : 'blue-grey-darken-2'"
                    rounded="lg"
                  >
                    <h3 class="font-weight-bold mb-1">{{ report.type }}</h3>
                    <p class="text-body-2 mb-1">Severity: {{ report.severity }}</p>
                    <p class="text-body-2 mb-1">Landmark: {{ report.landmark || 'N/A' }}</p>
                    <p class="text-body-2 mb-2">Notes: {{ report.notes || 'N/A' }}</p>
                    <p class="text-caption text-medium-emphasis">
                      Submitted: {{ new Date(report.created_at).toLocaleString() }}
                    </p>

                    <v-row v-if="report.images" dense class="mt-3">
                      <v-col
                        v-for="(img, i) in report.images"
                        :key="i"
                        cols="6"
                        sm="4"
                        class="d-flex justify-center"
                      >
                        <v-img :src="img" height="100" width="100" contain class="rounded"></v-img>
                      </v-col>
                    </v-row>
                  </v-card>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer
      class="text-center py-2"
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-3'"
    >
      <small>&copy; 2025 LeakAlert | All Rights Reserved</small>
    </v-footer>
  </v-app>
</template>

<style scoped>
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
</style>
