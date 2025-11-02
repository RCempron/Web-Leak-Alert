<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import AlertNotification from '@/components/common/AlertNotification.vue'

const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const editing = ref(false) // ✨ Controls edit mode
const user = ref(null)

const email = ref('')
const firstname = ref('')
const lastname = ref('')
const age = ref('')
const residency = ref('')

const formSuccessMessage = ref('')
const formErrorMessage = ref('')

// 🌗 Theme handling
const theme = ref(localStorage.getItem('theme') ?? 'light')
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
}

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
    editing.value = false // disable edit mode
  } catch (err) {
    console.error('Update failed', err)
    formErrorMessage.value = err?.message || String(err)
  } finally {
    saving.value = false
  }
}

async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

function goBack() {
  router.replace('/dashboard')
}

onMounted(loadCurrentUser)
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
        <span :class="theme === 'light' ? 'text-blue' : 'text-blue-lighten-3'">Leak</span>
        <span class="text-black">Alert</span>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn
        :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
      ></v-btn>
    </v-app-bar>

    <!-- Main -->
    <v-main
      :class="theme === 'light' ? 'bg-grey-lighten-5' : 'bg-grey-darken-4'"
      class="d-flex align-center justify-center pa-6"
    >
      <v-container>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="6" lg="5">
            <v-card
              class="pa-8 text-center modern-card"
              :color="theme === 'light' ? 'white' : 'blue-grey-darken-3'"
              elevation="10"
              rounded="xl"
            >
              <v-avatar size="90" class="mb-4">
                <v-icon size="90" color="primary">mdi-account-circle</v-icon>
              </v-avatar>

              <h2 class="font-weight-bold mb-2">My Profile</h2>
              <p class="text-medium-emphasis mb-6">View or edit your personal information</p>

              <AlertNotification
                :form-success-message="formSuccessMessage"
                :form-error-message="formErrorMessage"
              />

              <v-skeleton-loader v-if="loading" type="heading, paragraph, paragraph" class="mb-4" />

              <div v-else>
                <!-- Fields -->
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

                <!-- Buttons -->
                <div class="d-flex justify-center flex-wrap gap-3 mt-6">
                  <v-btn v-if="!editing" color="primary" size="large" @click="editing = true">
                    <v-icon start>mdi-account-edit</v-icon>
                    Edit Profile
                  </v-btn>

                  <v-btn v-else color="success" size="large" :loading="saving" @click="saveProfile">
                    <v-icon start>mdi-content-save</v-icon>
                    Save Changes
                  </v-btn>

                  <v-btn color="secondary" variant="outlined" size="large" @click="goBack">
                    <v-icon start>mdi-arrow-left</v-icon>
                    Back to Dashboard
                  </v-btn>

                  <v-btn color="error" variant="outlined" size="large" @click="logout">
                    <v-icon start>mdi-logout</v-icon>
                    Logout
                  </v-btn>
                </div>
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
.gap-3 {
  gap: 12px;
}
.modern-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}
.modern-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
</style>
