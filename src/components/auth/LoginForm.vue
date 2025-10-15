<script setup>
import { ref } from 'vue'

const isPasswordVisible = ref(false)
</script>

<template>
  <v-form fast-fail @submit.prevent>
    <!-- Email -->
    <v-text-field
      label="Email"
      prepend-inner-icon="mdi-email"
      variant="outlined"
      class="mb-3"
    ></v-text-field>

    <!-- Password -->
    <v-text-field
      prepend-inner-icon="mdi-lock"
      label="Password"
      variant="outlined"
      :type="isPasswordVisible ? 'text' : 'password'"
      :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="isPasswordVisible = !isPasswordVisible"
      class="mb-4"
    ></v-text-field>

    <!-- Login Button -->
    <v-btn class="mt-2" type="submit" block color="primary" size="large" prepend-icon="mdi-login">
      Login
    </v-btn>
  </v-form>
</template>
