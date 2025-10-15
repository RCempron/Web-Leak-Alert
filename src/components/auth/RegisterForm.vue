<script setup>
import { ref } from 'vue'

// ✅ form reference
const refVForm = ref()

// ✅ form data for Supabase integration
const formDataDefault = {
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  password_confirmation: '',
}

const formData = ref({ ...formDataDefault })

// ✅ password visibility toggles
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)

// ✅ validators
const requiredValidator = (value) => !!value || 'This field is required'

const emailValidator = (value) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(value) || 'Enter a valid email address'
}

const passwordValidator = (value) => value.length >= 8 || 'Password must be at least 8 characters'

const confirmPasswordValidator = (value) =>
  value === formData.value.password || 'Passwords do not match'

// ✅ submit handler (will later handle Supabase signup)
const onFormSubmit = () => {
  refVForm.value?.validate().then(({ valid }) => {
    if (valid) {
      alert(`✅ Registering user: ${formData.value.email}`)
      // 👉 Replace this later with Supabase auth call
      // e.g., await supabase.auth.signUp({...})
    }
  })
}
</script>

<template>
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

    <!-- Submit Button -->
    <v-btn
      class="mt-2"
      type="submit"
      block
      color="primary"
      size="large"
      prepend-icon="mdi-account-plus"
    >
      Register
    </v-btn>
  </v-form>
</template>
