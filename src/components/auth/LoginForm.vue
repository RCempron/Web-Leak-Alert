<!-- src/components/auth/LoginForm.vue -->
<script setup>
import { ref } from 'vue'
import { requiredValidator, emailValidator } from '@/utils/validators.js'
import { formActionDefault, supabase } from '@/utils/supabase'
import { useRouter } from 'vue-router'
import AlertNotification from '../common/AlertNotification.vue'

const router = useRouter()
const isPasswordVisible = ref(false)
const refVForm = ref()
const formData = ref({ email: '', password: '' })
const formAction = ref({ ...formActionDefault })

const onFormSubmit = async () => {
  const { valid } = await refVForm.value.validate()
  if (!valid) return

  formAction.value = { ...formActionDefault, formProcess: true }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.value.email,
    password: formData.value.password,
  })

  if (error) {
    formAction.value.formErrorMessage = error.message
    formAction.value.formProcess = false
    return
  }

  const user = data?.user
  if (!user) {
    formAction.value.formErrorMessage = 'Login failed — no user data.'
    formAction.value.formProcess = false
    return
  }

  // ✅ Identify user role
  const role = user.user_metadata?.role || 'user'
  formAction.value.formSuccessMessage = 'Successfully Logged In.'

  setTimeout(() => {
    if (role === 'admin') router.replace('/admin')
    else router.replace('/dashboard')
  }, 300)

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
      :loading="formAction.formProcess"
      :disabled="formAction.formProcess"
    >
      Login
    </v-btn>
  </v-form>
</template>
