<script setup>
import { ref, watch } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import LoginForm from '@/components/auth/LoginForm.vue'

const { mobile } = useDisplay()
const vuetifyTheme = useTheme()

const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.global.name.value = theme.value

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.global.name.value = theme.value
}

watch(theme, (val) => (vuetifyTheme.global.name.value = val))
</script>

<template>
  <v-app>
    <v-app-bar
      flat
      density="comfortable"
      :color="theme === 'light' ? 'blue-lighten-5' : 'blue-grey-darken-4'"
      class="px-4"
    >
      <v-toolbar-title class="font-weight-bold" :class="mobile ? 'text-h6' : 'text-h5'">
        <span :class="theme === 'light' ? 'text-blue' : 'text-blue-lighten-3'">BCWD </span>
        <span :style="{ color: theme === 'light' ? '#000' : '#fff' }">Complaint System</span>
      </v-toolbar-title>
      <v-spacer />
      <v-btn icon variant="text" @click="toggleTheme">
        <v-icon>{{ theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main
      class="d-flex align-center justify-center"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <v-container class="px-4 py-8" fluid>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="5" lg="4">
            <v-card
              class="pa-8"
              elevation="10"
              rounded="xl"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <div class="text-center mb-6">
                <v-img
                  src="/images/LeakAlertLogo.png"
                  class="mx-auto mb-3"
                  :width="mobile ? 100 : 130"
                  contain
                />
                <h2 class="font-weight-bold text-h5 mb-2">Welcome Back!</h2>
                <p class="text-medium-emphasis">Login to continue to your account</p>
              </div>

              <LoginForm />

              <div class="d-flex align-center my-5">
                <v-divider class="flex-grow-1" />
                <span class="mx-2 text-caption">or</span>
                <v-divider class="flex-grow-1" />
              </div>

              <div class="text-center">
                <span>Don’t have an account? </span>
                <RouterLink to="/register" class="font-weight-bold text-blue text-decoration-none">
                  Register here</RouterLink
                >
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

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
</style>
