<script setup>
import { ref } from 'vue'
import { requiredValidator, emailValidator } from '@/utils/validators.js'
import { formActionDefault, supabase } from '@/utils/supabase'
import { useRouter } from 'vue-router'
import AlertNotification from '../common/AlertNotification.vue'

const router = useRouter()
const isPasswordVisible = ref(false)
const refVForm = ref()

const formDataDefault = {
  email: '',
  password: '',
}

const formData = ref({ ...formDataDefault })
const formAction = ref({ ...formActionDefault })

// ✅ Main form submission handler
const onFormSubmit = async () => {
  const { valid } = await refVForm.value.validate()
  if (!valid) return

  // Reset form action to default
  formAction.value = { ...formActionDefault }
  formAction.value.formProcess = true

  // 👉 Attempt login via Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.value.email,
    password: formData.value.password,
  })

  if (error) {
    console.error('Supabase Error:', error)
    formAction.value.formErrorMessage = error.message
    formAction.value.formStatus = error.status
  } else {
    console.log('Supabase Response:', data)
    formAction.value.formSuccessMessage = 'Successfully Logged In.'

    // Redirect to dashboard after login
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
  />

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

    <v-btn
      block
      color="primary"
      size="large"
      type="submit"
      prepend-icon="mdi-login"
      :disabled="formAction.formProcess"
      :loading="formAction.formProcess"
    >
      Login
    </v-btn>
  </v-form>
</template>
