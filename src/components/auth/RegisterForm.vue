<script setup>
import { ref } from 'vue'

// reactive variables for password visibility
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
</script>

<template>
  <v-form fast-fail @submit.prevent>
    <!-- Firstname -->
    <v-text-field
      label="Firstname"
      prepend-inner-icon="mdi-account"
      variant="outlined"
      class="mb-3"
    ></v-text-field>

    <!-- Lastname -->
    <v-text-field
      label="Lastname"
      prepend-inner-icon="mdi-account"
      variant="outlined"
      class="mb-3"
    ></v-text-field>

    <!-- Email -->
    <v-text-field
      label="Email"
      prepend-inner-icon="mdi-email"
      variant="outlined"
      class="mb-3"
    ></v-text-field>

    <!-- Password -->
    <v-text-field
      label="Password"
      prepend-inner-icon="mdi-lock"
      variant="outlined"
      class="mb-3"
      :type="isPasswordVisible ? 'text' : 'password'"
      :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="isPasswordVisible = !isPasswordVisible"
    ></v-text-field>

    <!-- Confirm Password -->
    <v-text-field
      label="Confirm Password"
      prepend-inner-icon="mdi-lock-check"
      variant="outlined"
      class="mb-4"
      :type="isConfirmPasswordVisible ? 'text' : 'password'"
      :append-inner-icon="isConfirmPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
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
