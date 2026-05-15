<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { supabase } from '@/utils/supabase'
import AlertNotification from '@/components/common/AlertNotification.vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const { mobile } = useDisplay()
const router = useRouter()
const vuetifyTheme = useTheme()
const theme = ref(localStorage.getItem('theme') ?? 'light')
vuetifyTheme.change(theme.value)

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  vuetifyTheme.change(theme.value)
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}

const phTime = ref('')
let timer = null
function updatePhTime() {
  phTime.value = new Intl.DateTimeFormat('en-PH', {
    weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Asia/Manila',
  }).format(new Date())
}
onMounted(() => { updatePhTime(); timer = setInterval(updatePhTime, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

const refVForm = ref(null)
const reportTypes = ['Broken Pipe', 'Low Pressure', 'Contamination', 'Water Leak', 'No Water', 'Other']
const severities = ['Low', 'Medium', 'High', 'Critical']
const type = ref('')
const severity = ref('')
const landmark = ref('')
const notes = ref('')
const files = ref([])
const previews = ref([])
const latitude = ref(null)
const longitude = ref(null)
const formAction = ref({ formProcess: false, formErrorMessage: '', formSuccessMessage: '' })
const canSubmit = computed(() => !!type.value && !!severity.value && (landmark.value || notes.value))

function onFilesChange(e) {
  const selected = Array.from(e.target.files || []).slice(0, 4)
  files.value = selected
  previews.value = []
  selected.forEach((f) => {
    const r = new FileReader()
    r.onload = (ev) => previews.value.push(ev.target.result)
    r.readAsDataURL(f)
  })
}
function removePreview(i) {
  previews.value.splice(i, 1)
  files.value.splice(i, 1)
}

const mapInstance = ref(null)
const markerInstance = ref(null)
const showMapDialog = ref(false)

watch(showMapDialog, async (newVal) => {
  if (newVal) {
    await nextTick()
    const mapContainer = document.getElementById('report-map')
    if (!mapContainer) return
    mapInstance.value = L.map('report-map', { preferCanvas: true, zoomControl: true, dragging: true }).setView([8.9731, 125.5244], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.value)
    markerInstance.value = null
    await new Promise(resolve => setTimeout(() => { if (mapInstance.value) mapInstance.value.invalidateSize(true); resolve() }, 300))
    if (latitude.value && longitude.value) {
      const latLng = [latitude.value, longitude.value]
      markerInstance.value = L.marker(latLng).addTo(mapInstance.value)
      mapInstance.value.setView(latLng, 15)
    }
    mapInstance.value.on('click', (e) => {
      if (markerInstance.value) markerInstance.value.remove()
      markerInstance.value = L.marker(e.latlng).addTo(mapInstance.value)
    })
  } else {
    if (mapInstance.value) { mapInstance.value.off('click'); mapInstance.value.remove(); mapInstance.value = null; markerInstance.value = null }
  }
})

function saveLocation() {
  if (!markerInstance.value) { formAction.value.formErrorMessage = 'Please select a location on the map first'; return }
  try {
    const { lat, lng } = markerInstance.value.getLatLng()
    latitude.value = lat; longitude.value = lng
    showMapDialog.value = false; formAction.value.formErrorMessage = ''
  } catch (err) { formAction.value.formErrorMessage = 'Error saving location' }
}

async function submitReport() {
  const isValid = await refVForm.value?.validate()
  if (!isValid) return
  formAction.value.formProcess = true
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) throw new Error('User not authenticated.')
    const user = userData.user
    const uploadedUrls = []
    for (const f of files.value) {
      const filePath = `${user.id}/${Date.now()}-${f.name}`
      const { data, error } = await supabase.storage.from('report-attachments').upload(filePath, f)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('report-attachments').getPublicUrl(data.path)
      uploadedUrls.push(urlData.publicUrl)
    }
    const { error: insertError } = await supabase.from('reports').insert([{
      user_id: user.id, type: type.value, severity: severity.value,
      landmark: landmark.value || null, notes: notes.value || null,
      latitude: latitude.value, longitude: longitude.value,
      images: uploadedUrls.length ? uploadedUrls : null,
      pipe_location: pipeLocation.value || null, status: 'pending',
    }])
    if (insertError) throw insertError
    formAction.value.formSuccessMessage = 'Report submitted successfully!'
    setTimeout(() => router.replace('/dashboard'), 1000)
  } catch (err) {
    formAction.value.formErrorMessage = err.message || 'An unexpected error occurred.'
  } finally {
    formAction.value.formProcess = false
  }
}

const pipeLocation = ref(null)
const pipeLocationOptions = [
  { value: 'mainline', title: 'Mainline – Large pipes along major roads' },
  { value: 'transition', title: 'Transition Line – Connects main pipes to neighborhoods' },
  { value: 'distribution', title: 'Distribution Line – Pipes within streets and barangays' },
  { value: 'service', title: 'Service Line – Pipe connecting directly to a house' },
  { value: 'unknown', title: 'Not sure – I am not certain' },
]
</script>

<template>
  <v-app :class="['bcwd-app', theme]">

    <!-- ─── App Bar (matches DashboardView) ─── -->
    <v-app-bar flat height="56" :class="['bcwd-header', theme]">
      <div class="header-inner">
        <button class="menu-btn" @click="router.replace('/dashboard')" aria-label="Back to dashboard">
          <v-icon size="22" color="#1e40af">mdi-arrow-left</v-icon>
        </button>
        <div class="header-brand">
          <v-img src="/images/logo.png" width="28" height="28" class="header-img" />
          <span class="header-title">BCWD Complaint System</span>
        </div>
        <div class="header-right">
          <span class="header-time d-none d-sm-block">{{ phTime }}</span>
        </div>
      </div>
    </v-app-bar>

    <!-- ─── Main ─── -->
    <v-main :class="['bcwd-main', theme]">
      <div class="report-outer">

        <!-- Page Header -->
        <div class="report-hero">
          <div class="report-hero-bg" />
          <div class="report-hero-content">
            <div class="report-hero-icon">
              <v-icon size="32" color="white">mdi-clipboard-text-outline</v-icon>
            </div>
            <div>
              <h1 class="report-hero-title">File a Complaint</h1>
              <p class="report-hero-sub">Provide details and optional photos. Pin your location for faster response.</p>
            </div>
          </div>
        </div>

        <!-- Alert (full-width, above grid) -->
        <div class="report-alert-wrap">
          <AlertNotification
            :form-success-message="formAction.formSuccessMessage"
            :form-error-message="formAction.formErrorMessage"
          />
        </div>

        <!-- ── 2-Column Card Grid (mirrors Settings / Profile) ── -->
        <v-form ref="refVForm" class="report-grid-wrap">
          <div class="report-grid">

            <!-- ── LEFT COLUMN ── -->
            <div class="report-col">

              <!-- Card 1: Complaint Details -->
              <div :class="['r-card', theme]">
                <div class="r-card-header">
                  <div class="r-card-icon" style="background:#eff6ff;">
                    <v-icon size="20" color="#1d4ed8">mdi-water-alert-outline</v-icon>
                  </div>
                  <div>
                    <h3 class="r-card-title">Complaint Details</h3>
                    <p class="r-card-sub">Select type, severity and pipe information</p>
                  </div>
                </div>
                <div class="r-card-body">
                  <v-select
                    v-model="type"
                    :items="reportTypes"
                    label="Type of Complaint"
                    :rules="[(v) => !!v || 'Type is required']"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-water-alert"
                    class="mb-3"
                  />
                  <v-select
                    v-model="severity"
                    :items="severities"
                    label="Severity"
                    :rules="[(v) => !!v || 'Severity is required']"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-alert-circle-outline"
                    class="mb-3"
                  />
                  <v-select
                    v-model="pipeLocation"
                    :items="pipeLocationOptions"
                    item-title="title"
                    item-value="value"
                    label="Pipe Location (Optional)"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-pipe"
                    clearable
                  />
                </div>
              </div>

              <!-- Card 2: Location -->
              <div :class="['r-card', theme]">
                <div class="r-card-header">
                  <div class="r-card-icon" style="background:#f0fdf4;">
                    <v-icon size="20" color="#16a34a">mdi-map-marker-outline</v-icon>
                  </div>
                  <div>
                    <h3 class="r-card-title">Location</h3>
                    <p class="r-card-sub">Describe or pin where the issue is</p>
                  </div>
                </div>
                <div class="r-card-body">
                  <v-text-field
                    v-model="landmark"
                    label="Landmark / Nearest Place"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-map-marker-outline"
                    class="mb-3"
                  />
                  <button type="button" class="btn-pin btn-pin--full" @click="showMapDialog = true">
                    <v-icon size="16" class="mr-2">mdi-map-marker-plus</v-icon>
                    Pin Location on Map
                  </button>
                  <div class="pin-status" :class="latitude && longitude ? 'pin-status--ok' : 'pin-status--empty'">
                    <v-icon size="14">{{ latitude && longitude ? 'mdi-check-circle' : 'mdi-map-marker-off-outline' }}</v-icon>
                    <span>{{ latitude && longitude ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'No location pinned yet' }}</span>
                  </div>
                  <p class="location-hint">If map is unavailable, describe the location in the Landmark field above.</p>
                </div>
              </div>

            </div>

            <!-- ── RIGHT COLUMN ── -->
            <div class="report-col">

              <!-- Card 3: Notes -->
              <div :class="['r-card', theme]">
                <div class="r-card-header">
                  <div class="r-card-icon" style="background:#fef3c7;">
                    <v-icon size="20" color="#d97706">mdi-note-text-outline</v-icon>
                  </div>
                  <div>
                    <h3 class="r-card-title">Additional Notes</h3>
                    <p class="r-card-sub">Describe the issue in your own words</p>
                  </div>
                </div>
                <div class="r-card-body">
                  <v-textarea
                    v-model="notes"
                    label="Describe the issue in detail"
                    rows="5"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-text"
                    no-resize
                  />
                </div>
              </div>

              <!-- Card 4: Photos -->
              <div :class="['r-card', theme]">
                <div class="r-card-header">
                  <div class="r-card-icon" style="background:#f5f3ff;">
                    <v-icon size="20" color="#7c3aed">mdi-image-multiple-outline</v-icon>
                  </div>
                  <div>
                    <h3 class="r-card-title">Attach Photos</h3>
                    <p class="r-card-sub">Upload up to 4 photos of the issue</p>
                  </div>
                  <span class="section-badge">Max 4</span>
                </div>
                <div class="r-card-body">
                  <label class="file-upload-area" :class="{ 'file-upload-area--dark': theme === 'dark' }">
                    <v-icon size="26" color="#94a3b8">mdi-cloud-upload-outline</v-icon>
                    <span class="file-upload-text">Click to select photos</span>
                    <span class="file-upload-hint">PNG, JPG up to 10MB each</span>
                    <input type="file" accept="image/*" multiple @change="onFilesChange" class="file-input" />
                  </label>
                  <div v-if="previews.length" class="previews-grid">
                    <div v-for="(p, i) in previews" :key="i" class="preview-item">
                      <img :src="p" class="preview-img" />
                      <button type="button" class="preview-remove" @click="removePreview(i)">
                        <v-icon size="14" color="white">mdi-close</v-icon>
                      </button>
                      <div class="preview-name">{{ files[i]?.name }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card 5: Actions -->
              <div :class="['r-card r-card--actions', theme]">
                <div class="form-actions">
                  <button type="button" class="btn-outline" @click="router.replace('/dashboard')">
                    <v-icon size="16" class="mr-1">mdi-arrow-left</v-icon> Back to Dashboard
                  </button>
                  <button
                    type="button"
                    class="btn-primary"
                    :class="{ 'btn-primary--disabled': formAction.formProcess || !canSubmit }"
                    :disabled="formAction.formProcess || !canSubmit"
                    @click="submitReport"
                  >
                    <v-icon v-if="!formAction.formProcess" size="16" class="mr-1">mdi-send</v-icon>
                    <v-progress-circular v-else size="16" width="2" indeterminate color="white" class="mr-1" />
                    {{ formAction.formProcess ? 'Submitting…' : 'Submit Report' }}
                  </button>
                </div>
                <p class="submit-hint">
                  <v-icon size="13" color="#94a3b8">mdi-information-outline</v-icon>
                  Type and Severity are required before submitting.
                </p>
              </div>

            </div>
          </div>
        </v-form>

        <!-- Footer -->
        <footer class="bcwd-footer">
          <div class="footer-row">
            <span>© 2025 BCWD Complaint System</span>
            <div class="footer-contacts d-none d-md-flex">
              <span><v-icon size="13">mdi-map-marker</v-icon> Gov. Jose A. Rosales Ave., Butuan City</span>
              <span><v-icon size="13">mdi-phone</v-icon> (085) 817-6635</span>
              <span><v-icon size="13">mdi-cellphone</v-icon> 0918-930-4234 · 0917-188-8726</span>
              <span><v-icon size="13">mdi-email</v-icon> bcwdrecords@gmail.com</span>
            </div>
            <span>Philippines (Asia/Manila)</span>
          </div>
        </footer>
      </div>
    </v-main>

    <!-- ─── Map Dialog (matches DashboardView dialog style) ─── -->
    <v-dialog v-model="showMapDialog" max-width="800">
      <div :class="['bcwd-dialog', theme]">
        <div class="dialog-bar">
          <div class="dialog-bar-left">
            <v-icon size="19" color="white">mdi-map-marker</v-icon>
            <h3>Pin Location on Map</h3>
          </div>
          <button class="dialog-x" @click="showMapDialog = false">
            <v-icon size="19" color="white">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <p style="font-size:13px;color:#64748b;margin:0 0 12px;">Click on the map to place or move the pin, then save.</p>
          <div id="report-map" style="height:400px;width:100%;border-radius:12px;border:1px solid #e2e8f0;position:relative;z-index:0;" />
        </div>
        <div class="dialog-foot">
          <button class="btn-outline" @click="showMapDialog = false">Cancel</button>
          <button class="btn-primary" :class="{ 'btn-primary--disabled': !markerInstance }" :disabled="!markerInstance" @click="saveLocation">
            <v-icon size="15" class="mr-1">mdi-check</v-icon> Save Location
          </button>
        </div>
      </div>
    </v-dialog>

  </v-app>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
* { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }

/* ── Theme vars ── */
.bcwd-app.light { --bg: #f0f6ff; --surface: #ffffff; --surface2: #f8fafc; --border: #e2e8f0; --text: #0f172a; --text2: #334155; --muted: #64748b; }
.bcwd-app.dark  { --bg: #060e1a; --surface: #0f1e35; --surface2: #0c1828; --border: rgba(255,255,255,0.09); --text: #f1f5f9; --text2: #cbd5e1; --muted: #94a3b8; }

/* ── Header ── */
.bcwd-header { background: #ffffff !important; border-bottom: 1px solid #e2e8f0 !important; box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important; }
.bcwd-header.dark { background: #0c1624 !important; border-bottom-color: rgba(255,255,255,0.08) !important; }
.header-inner { display: flex; align-items: center; width: 100%; padding: 0 20px; gap: 14px; }
.menu-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e2e8f0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s; }
.menu-btn:hover { background: #f1f5f9; }
.bcwd-header.dark .menu-btn { border-color: rgba(255,255,255,0.12); }
.header-brand { display: flex; align-items: center; gap: 10px; }
.header-img { border-radius: 6px; flex-shrink: 0; }
.header-title { font-size: 15px; font-weight: 700; color: #1e40af; letter-spacing: -0.3px; }
.bcwd-header.dark .header-title { color: #60a5fa; }
.header-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.header-time { font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; }
.bcwd-header.dark .header-time { color: #94a3b8; }

/* ── Main ── */
.bcwd-main { background: var(--bg) !important; }
.report-outer { display: flex; flex-direction: column; min-height: calc(100vh - 56px); }

/* ── Hero Banner ── */
.report-hero { position: relative; overflow: hidden; margin: 28px 32px 0; border-radius: 18px; }
.report-hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #1d4ed8, #2563eb, #7c3aed); }
.report-hero-bg::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 24px 24px; }
.report-hero-content { position: relative; z-index: 1; display: flex; align-items: center; gap: 20px; padding: 28px 32px; }
.report-hero-icon { width: 60px; height: 60px; background: rgba(255,255,255,0.18); border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.25); }
.report-hero-title { font-size: 22px; font-weight: 800; color: white; margin: 0 0 4px; letter-spacing: -0.4px; }
.report-hero-sub { font-size: 13px; color: rgba(255,255,255,0.75); margin: 0; }

/* ── Alert wrap ── */
.report-alert-wrap { padding: 16px 32px 0; }

/* ── Grid layout (mirrors settings-grid / profile-grid) ── */
.report-grid-wrap { padding: 16px 32px 0; flex: 1; }
.report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.report-col { display: flex; flex-direction: column; gap: 18px; }

/* ── Cards (identical to .s-card / .p-card) ── */
.r-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px; }
.r-card--actions { padding: 18px 22px; }
.r-card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
.r-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.r-card-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 2px; }
.r-card-sub { font-size: 12px; color: var(--muted); margin: 0; }
.r-card-body { display: flex; flex-direction: column; }
.section-badge { background: #eff6ff; color: #1d4ed8; border-radius: 10px; font-size: 10px; font-weight: 700; padding: 2px 8px; margin-left: auto; align-self: flex-start; }
.bcwd-app.dark .section-badge { background: rgba(29,78,216,0.2); color: #60a5fa; }

/* ── Location ── */
.btn-pin { background: transparent; color: #1d4ed8; border: 1.5px solid #1d4ed8; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-pin--full { width: 100%; justify-content: center; margin-bottom: 10px; }
.btn-pin:hover { background: rgba(29,78,216,0.06); }
.bcwd-app.dark .btn-pin { color: #60a5fa; border-color: #60a5fa; }
.bcwd-app.dark .btn-pin:hover { background: rgba(59,130,246,0.1); }
.pin-status { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 8px 12px; border-radius: 8px; margin-bottom: 10px; }
.pin-status--ok { background: #dcfce7; color: #166534; }
.pin-status--empty { background: var(--surface2); color: var(--muted); }
.bcwd-app.dark .pin-status--ok { background: rgba(34,197,94,0.12); color: #4ade80; }
.location-hint { font-size: 12px; color: var(--muted); margin: 0; line-height: 1.5; }

/* ── File upload ── */
.file-upload-area { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 2px dashed var(--border); border-radius: 12px; padding: 20px 16px; cursor: pointer; transition: all 0.2s; margin-bottom: 12px; }
.file-upload-area:hover { border-color: #1d4ed8; background: rgba(29,78,216,0.03); }
.file-upload-area--dark { border-color: rgba(255,255,255,0.12); }
.file-upload-area--dark:hover { border-color: #60a5fa; background: rgba(59,130,246,0.06); }
.file-upload-text { font-size: 13px; font-weight: 600; color: var(--text2); }
.file-upload-hint { font-size: 11px; color: var(--muted); }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }

/* ── Previews ── */
.previews-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
.preview-item { position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); background: var(--surface2); }
.preview-img { width: 100%; height: 80px; object-fit: cover; display: block; }
.preview-remove { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 5px; background: rgba(0,0,0,0.55); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.preview-name { font-size: 9px; color: var(--muted); padding: 4px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Buttons ── */
.btn-primary { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; border: none; border-radius: 10px; padding: 11px 24px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; box-shadow: 0 4px 12px rgba(29,78,216,0.3); font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(29,78,216,0.4); }
.btn-primary--disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
.btn-outline { background: transparent; color: #1d4ed8; border: 1.5px solid #1d4ed8; border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-outline:hover { background: rgba(29,78,216,0.06); }
.bcwd-app.dark .btn-outline { color: #60a5fa; border-color: #60a5fa; }

/* ── Actions card ── */
.form-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.submit-hint { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); margin: 12px 0 0; }

/* ── Footer ── */
.bcwd-footer { background: #1e3a8a; color: white; padding: 10px 0; font-size: 12px; margin-top: 20px; }
.footer-row { max-width: 100%; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.footer-contacts { display: flex; gap: 16px; opacity: 0.8; }
.footer-contacts span { display: flex; align-items: center; gap: 5px; }

/* ── Dialogs ── */
:deep(.v-dialog > .v-overlay__content > *) { background: #ffffff !important; border-radius: 20px !important; }
.bcwd-app.dark :deep(.v-dialog > .v-overlay__content > *) { background: #0f1e35 !important; }
.bcwd-dialog { background: #ffffff !important; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.22); }
.bcwd-app.dark .bcwd-dialog { background: #0f1e35 !important; }
.dialog-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; background: linear-gradient(135deg, #1d4ed8, #2563eb); }
.dialog-bar-left { display: flex; align-items: center; gap: 10px; }
.dialog-bar-left h3 { font-size: 15px; font-weight: 700; color: white; margin: 0; }
.dialog-x { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.dialog-x:hover { background: rgba(255,255,255,0.2); }
.dialog-body { padding: 22px; background: #ffffff !important; }
.bcwd-app.dark .dialog-body { background: #0f1e35 !important; }
.dialog-foot { padding: 14px 22px; background: #f8fafc !important; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
.bcwd-app.dark .dialog-foot { background: #0c1828 !important; border-top-color: rgba(255,255,255,0.09); }

/* ── Vuetify overrides ── */
:deep(.v-field) { border-radius: 10px !important; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .report-hero { margin: 20px 16px 0; }
  .report-hero-content { padding: 22px 20px; }
  .report-alert-wrap { padding: 14px 16px 0; }
  .report-grid-wrap { padding: 14px 16px 0; }
  .report-grid { grid-template-columns: 1fr; }
  .footer-row { padding: 0 16px; }
}
@media (max-width: 600px) {
  .report-hero { margin: 12px 12px 0; }
  .report-alert-wrap { padding: 12px 12px 0; }
  .report-grid-wrap { padding: 12px 12px 0; }
  .report-hero-title { font-size: 18px; }
  .form-actions { flex-direction: column-reverse; align-items: stretch; }
  .btn-primary, .btn-outline { justify-content: center; width: 100%; }
}
</style>