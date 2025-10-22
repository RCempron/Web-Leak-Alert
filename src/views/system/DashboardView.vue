<script setup>
import { ref } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase.js'

const { mobile } = useDisplay()
const router = useRouter()

// Theme switch
const theme = ref(localStorage.getItem('theme') ?? 'light')
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
}

// Logout
async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}

// Sample dashboard cards
const cards = [
  { title: 'Report a Leak', icon: 'mdi-water-alert', color: 'blue', route: '/report' },
  { title: 'My Reports', icon: 'mdi-format-list-bulleted', color: 'green', route: '/my-reports' },
  { title: 'Profile', icon: 'mdi-account-circle', color: 'deep-purple', route: '/profile' },
]
</script>

<template>
  <v-app :theme="theme">
    <!-- App Bar -->
    <v-app-bar
      flat
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-4'"
      class="px-6"
    >
      <v-toolbar-title class="font-weight-bold text-h5">
        <span :class="theme === 'light' ? 'text-blue' : 'text-blue-lighten-3'">Leak</span
        ><span class="text-black">Alert</span>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- Theme Toggle -->
      <v-btn
        :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
      ></v-btn>

      <!-- Logout -->
      <v-btn prepend-icon="mdi-logout" color="error" variant="text" @click="logout"> Logout </v-btn>
    </v-app-bar>

    <!-- Main Dashboard -->
    <v-main
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
      class="d-flex align-center justify-center pa-6"
    >
      <v-container>
        <v-row justify="center" align="center" class="text-center">
          <v-col cols="12">
            <h2 class="font-weight-bold mb-6">Welcome to LeakAlert Dashboard</h2>
            <p class="text-medium-emphasis mb-10">
              Manage your leak reports and account using the shortcuts below.
            </p>
          </v-col>

          <!-- Dashboard Cards -->
          <v-col
            v-for="(card, index) in cards"
            :key="index"
            cols="12"
            sm="6"
            md="4"
            class="d-flex justify-center"
          >
            <v-card
              class="pa-6 hover-scale text-center"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
              elevation="8"
              rounded="xl"
              width="250"
              height="220"
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
.bg-grey-lighten-5 {
  background-color: #f5f5f5;
}
.bg-grey-darken-4 {
  background-color: #121212;
}
.text-black {
  color: #000000;
}
.hover-scale {
  transition: all 0.3s ease;
  cursor: pointer;
}
.hover-scale:hover {
  transform: scale(1.05);
}
</style>
