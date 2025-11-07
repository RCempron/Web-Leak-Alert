<!-- src/components/auth/RegisterForm.vue -->
<script setup>
import { ref } from 'vue'
import { supabase, formActionDefault } from '@/utils/supabase'
import AlertNotification from '../common/AlertNotification.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const refVForm = ref()
const formAction = ref({ ...formActionDefault })

const formData = ref({
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  password_confirmation: '',
  // admin_code: '', // optional: uncomment if you want to show an admin_code input in the form (dev only)
})

const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)

const requiredValidator = (value) => !!value || 'This field is required'
const emailValidator = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Enter a valid email'
const passwordValidator = (value) => value.length >= 8 || 'Password must be at least 8 characters'
const confirmPasswordValidator = (value) =>
  value === formData.value.password || 'Passwords do not match'

const onFormSubmit = async () => {
  const { valid } = await refVForm.value.validate()
  if (!valid) return

  formAction.value = { ...formActionDefault, formProcess: true }

  // default role
  let roleToSet = 'user'

  // Optional dev-only admin-code support:
  // If you want to create an admin via the registration form for testing only:
  //  - add VITE_ADMIN_CODE=some-secret in your local .env
  //  - uncomment the "admin_code" field in formData above and add an input in the template
  //  - This is INSECURE in production — use manual metadata changes in Supabase for real admins.
  try {
    const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE
    if (ADMIN_CODE && formData.value.admin_code && formData.value.admin_code === ADMIN_CODE) {
      roleToSet = 'admin'
    }
  } catch (e) {
    // ignore if env not present
  }

  const { data, error } = await supabase.auth.signUp({
    email: formData.value.email,
    password: formData.value.password,
    options: {
      data: {
        firstname: formData.value.firstname,
        lastname: formData.value.lastname,
        role: roleToSet, // safe default
      },
    },
  })

  if (error) {
    console.error('Supabase Error:', error)
    formAction.value.formErrorMessage = error.message
    formAction.value.formStatus = error.status
  } else {
    console.log('Supabase Response:', data)
    formAction.value.formSuccessMessage = 'Successfully Registered Account.'

    // After registering, you can either send them to dashboard or show message.
    // If email confirm is enabled, the user must confirm before signing in.
    router.replace('/dashboard')
  }

  refVForm.value?.reset()
  formAction.value.formProcess = false
}
</script>

<template>
  <AlertNotification
    :form-success-message="formAction.formSuccessMessage"
    :form-error-message="formAction.formErrorMessage"
  ></AlertNotification>

  <v-form ref="refVForm" @submit.prevent="onFormSubmit">
    <!-- Firstname -->
    <v-text-field
      v-model="formData.firstname"
      label="Firstname"
      prepend-inner-icon="mdi-account"
      variant="outlined"
      class="mb-3"
      :rules="[requiredValidator]"
    ></v-text-field>

    <!-- Lastname -->
    <v-text-field
      v-model="formData.lastname"
      label="Lastname"
      prepend-inner-icon="mdi-account"
      variant="outlined"
      class="mb-3"
      :rules="[requiredValidator]"
    ></v-text-field>

    <!-- Email -->
    <v-text-field
      v-model="formData.email"
      label="Email"
      prepend-inner-icon="mdi-email"
      variant="outlined"
      class="mb-3"
      :rules="[requiredValidator, emailValidator]"
    ></v-text-field>

    <!-- Password -->
    <v-text-field
      v-model="formData.password"
      label="Password"
      prepend-inner-icon="mdi-lock"
      variant="outlined"
      class="mb-3"
      :type="isPasswordVisible ? 'text' : 'password'"
      :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="isPasswordVisible = !isPasswordVisible"
      :rules="[requiredValidator, passwordValidator]"
    ></v-text-field>

    <!-- Confirm Password -->
    <v-text-field
      v-model="formData.password_confirmation"
      label="Confirm Password"
      prepend-inner-icon="mdi-lock-check"
      variant="outlined"
      class="mb-4"
      :type="isConfirmPasswordVisible ? 'text' : 'password'"
      :append-inner-icon="isConfirmPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
      :rules="[requiredValidator, confirmPasswordValidator]"
    ></v-text-field>

    <!-- Optional: dev admin code input (uncomment in both template and formData if you use it) -->
    <!--
    <v-text-field
      v-model="formData.admin_code"
      label="Admin Code (dev only)"
      prepend-inner-icon="mdi-key"
      variant="outlined"
      class="mb-4"
    />
    -->

    <!-- Submit Button -->
    <v-btn
      class="mt-2"
      type="submit"
      block
      color="primary"
      size="large"
      prepend-icon="mdi-account-plus"
      :disabled="formAction.formProcess"
      :loading="formAction.formProcess"
    >
      Register
    </v-btn>
  </v-form>
</template>
