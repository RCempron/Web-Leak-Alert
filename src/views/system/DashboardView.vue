<script setup>
import { ref, watch } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase.js'

const { mobile } = useDisplay()
const router = useRouter()
const vuetifyTheme = useTheme()

// Persistent theme
const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.global.name.value = theme.value

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.global.name.value = theme.value
}

watch(theme, (val) => (vuetifyTheme.global.name.value = val))

// Logout
async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}

// Dashboard cards
const cards = [
  { title: 'Report a Leak', icon: 'mdi-water-alert', color: 'blue', route: '/report' },
  { title: 'My Reports', icon: 'mdi-format-list-bulleted', color: 'green', route: '/my-reports' },
  { title: 'Profile', icon: 'mdi-account-circle', color: 'deep-purple', route: '/profile' },
]
</script>

<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-4'"
      class="px-4"
    >
      <v-toolbar-title class="font-weight-bold" :class="mobile ? 'text-h6' : 'text-h5'">
        <span :class="theme === 'light' ? 'text-blue' : 'text-blue-lighten-3'">Leak</span>
        <span :style="{ color: theme === 'light' ? '#000' : '#fff' }">Alert</span>
      </v-toolbar-title>
      <v-spacer />
      <v-btn icon variant="text" @click="toggleTheme">
        <v-icon>{{ theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
      <v-btn icon variant="text" color="error" @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main Dashboard -->
    <v-main
      class="d-flex align-center justify-center pa-6"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <v-container>
        <v-row justify="center" class="text-center mb-8">
          <v-col cols="12">
            <h2 class="font-weight-bold text-h5 text-md-h4 mb-2">
              <br />Welcome to LeakAlert Dashboard
            </h2>
            <p class="text-medium-emphasis">
              Manage your leak reports and account using the shortcuts below.
            </p>
          </v-col>
        </v-row>

        <!-- Responsive Cards -->
        <v-row
          class="d-flex justify-center align-center text-center"
          align="stretch"
          justify="center"
        >
          <v-col
            v-for="(card, index) in cards"
            :key="index"
            cols="12"
            sm="6"
            md="4"
            class="d-flex justify-center"
          >
            <v-card
              class="pa-6 hover-scale text-center dashboard-card"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
              elevation="8"
              rounded="xl"
              @click="router.push(card.route)"
            >
              <v-icon :color="card.color" size="64" class="mb-4">{{ card.icon }}</v-icon>
              <h3 class="font-weight-bold mb-2">{{ card.title }}</h3>
              <v-btn :color="card.color" variant="tonal" size="small">Open</v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer
      app
      class="text-center py-2"
      height="48"
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
.bg-grey-lighten-5 {
  background-color: #f5f5f5;
}
.bg-grey-darken-4 {
  background-color: #121212;
}
.hover-scale {
  transition: all 0.25s ease;
  cursor: pointer;
}
.hover-scale:hover {
  transform: scale(1.05);
}

/* ✅ Consistent card sizes */
.dashboard-card {
  width: 280px;
  height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
