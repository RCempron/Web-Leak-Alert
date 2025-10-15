<script setup>
import { ref } from 'vue'
import { requiredValidator, emailValidator } from '@/utils/validators.js'

const isPasswordVisible = ref(false)
const refVForm = ref()

const formDataDefault = {
  email: '',
  password: '',
}

const formData = ref({ ...formDataDefault })

// ✅ proper handler
const onFormSubmit = () => {
  refVForm.value?.validate().then(({ valid }) => {
    if (valid) {
      alert(`✅ Logging in as: ${formData.value.email}`)
      // 👉 Replace with Supabase login later
    }
  })
}
</script>

<template>
  <v-form ref="refVForm" @submit.prevent="onFormSubmit">
    <v-text-field
      v-model="formData.email"
      label="Email"
      prepend-inner-icon="mdi-email"
      variant="outlined"
      :rules="[requiredValidator, emailValidator]"
      class="mb-3"
    />

    <v-text-field
      v-model="formData.password"
      label="Password"
      prepend-inner-icon="mdi-lock"
      variant="outlined"
      :type="isPasswordVisible ? 'text' : 'password'"
      :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="isPasswordVisible = !isPasswordVisible"
      :rules="[requiredValidator]"
      class="mb-4"
    />

    <v-btn block color="primary" size="large" type="submit" prepend-icon="mdi-login"> Login </v-btn>
  </v-form>
</template>
