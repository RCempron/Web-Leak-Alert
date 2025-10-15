<script setup>
import { ref } from 'vue'
import { useDisplay } from 'vuetify'
import LoginForm from '@/components/auth/LoginForm.vue'

const theme = ref('light')
const { mobile } = useDisplay()

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
</script>

<template>
  <v-app :theme="theme">
    <!-- Top Bar -->
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
    </v-app-bar>

    <!-- Main Login Layout -->
    <v-main
      class="d-flex align-center justify-center"
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
    >
      <v-container>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="5" lg="4">
            <v-card
              class="pa-8"
              elevation="10"
              rounded="xl"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
            >
              <!-- Logo -->
              <div class="text-center mb-6">
                <v-img
                  src="/images/LeakAlertLogo.png"
                  class="mx-auto mb-3"
                  :width="mobile ? '120' : '100'"
                  alt="LeakAlert Logo"
                ></v-img>
                <h2 class="font-weight-bold text-h5 mb-2">Welcome Back</h2>
                <p class="text-medium-emphasis">Login to continue to your account</p>
              </div>

              <!-- Login Form -->
              <LoginForm />

              <!-- Divider -->
              <div class="d-flex align-center my-5">
                <v-divider class="flex-grow-1"></v-divider>
                <span class="mx-2 text-caption">or</span>
                <v-divider class="flex-grow-1"></v-divider>
              </div>

              <!-- Social Login -->
              <div class="d-flex justify-center ga-2 mb-4">
                <v-btn icon="mdi-facebook" color="blue" variant="flat"></v-btn>
                <v-btn icon="mdi-google" color="red" variant="flat"></v-btn>
              </div>

              <!-- Register Link -->
              <div class="text-center">
                <span>Don’t have an account?</span>
                <RouterLink to="/register" class="font-weight-bold text-blue text-decoration-none">
                  Register
                </RouterLink>
              </div>
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
</style>
