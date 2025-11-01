const API_URL =
  'https://script.google.com/macros/s/AKfycbx2GG4R9RJ6PaiBDp2khF-FESTqr8XxgcL8phqwLTilYS48c8SFzS6Xb5dURIHDYQcS/exec'
// ------------------------------------------------------------------

// Variabel global untuk menyimpan data
let allSantri = []
let allBuku = []

// Elemen DOM
const loader = document.getElementById('loader')
const mainContent = document.getElementById('main-content')
const themeToggle = document.getElementById('theme-toggle')
const iconSun = document.getElementById('icon-sun')
const iconMoon = document.getElementById('icon-moon')
const jenjangSelect = document.getElementById('filter-jenjang')
const kelasSelect = document.getElementById('filter-kelas')
const bookList = document.getElementById('book-list')
const santriList = document.getElementById('santri-list')

// Format mata uang
const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

// === INISIALISASI ===
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup Listeners
  themeToggle.addEventListener('click', toggleTheme)
  jenjangSelect.addEventListener('change', renderFilteredData)
  kelasSelect.addEventListener('change', renderFilteredData)

  // 2. Cek Tema Tersimpan
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode')
    updateThemeIcon(true)
  } else {
    updateThemeIcon(false)
  }

  // 3. Muat Data
  loadData()
})

// === FUNGSI TEMA (TERANG/GELAP) ===
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode')
  localStorage.setItem('theme', isDark ? 'dark' : 'light')
  updateThemeIcon(isDark)
}

function updateThemeIcon(isDark) {
  iconSun.style.display = isDark ? 'none' : 'block'
  iconMoon.style.display = isDark ? 'block' : 'none'
}

// === FUNGSI DATA (FETCH DARI API) ===
async function loadData() {
  showLoader(true)
  try {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()

    if (data.error) {
      throw new Error(data.message)
    }

    // Simpan data ke variabel global
    allSantri = data.santri
    allBuku = data.buku

    // Tampilkan data
    populateFilters()
    renderFilteredData()
  } catch (error) {
    console.error('Gagal memuat data:', error)
    loader.innerHTML = `<p style="color: red;">Gagal memuat data: ${error.message}. Coba segarkan halaman.</p>`
  } finally {
    showLoader(false)
  }
}

function showLoader(isLoading) {
  loader.style.display = isLoading ? 'flex' : 'none'
  mainContent.style.display = isLoading ? 'none' : 'grid'
}

// === FUNGSI FILTER ===
function populateFilters() {
  // Ambil jenjang dan kelas unik dari data santri
  const jenjangSet = new Set(allSantri.map((s) => s.Jenjang))
  const kelasSet = new Set(allSantri.map((s) => s.Kelas))

  // Kosongkan filter (selain opsi "Semua")
  jenjangSelect.innerHTML = '<option value="semua">Semua Jenjang</option>'
  kelasSelect.innerHTML = '<option value="semua">Semua Kelas</option>'

  jenjangSet.forEach((j) => {
    if (j) jenjangSelect.innerHTML += `<option value="${j}">${j}</option>`
  })

  kelasSet.forEach((k) => {
    if (k) kelasSelect.innerHTML += `<option value="${k}">${k}</option>`
  })
}

// === FUNGSI RENDER (MENAMPILKAN DATA KE HTML) ===
function renderFilteredData() {
  const jenjang = jenjangSelect.value
  const kelas = kelasSelect.value

  // 1. Filter data
  const filteredBuku = allBuku.filter(
    (b) =>
      (jenjang === 'semua' || b.Jenjang === jenjang) &&
      (kelas === 'semua' || b.Kelas === kelas)
  )

  const filteredSantri = allSantri.filter(
    (s) =>
      (jenjang === 'semua' || s.Jenjang === jenjang) &&
      (kelas === 'semua' || s.Kelas === kelas)
  )

  // 2. Render Buku
  bookList.innerHTML = '' // Kosongkan
  if (filteredBuku.length > 0) {
    filteredBuku.forEach((buku) => {
      const itemHTML = `
        <div class="list-item">
          <div class="item-info">
            <span class="item-name">${buku.Judul_Buku}</span>
            <span class="item-detail">${buku.Jenjang} - ${buku.Kelas}</span>
          </div>
          <span class="item-price">${formatter.format(buku.Harga || 0)}</span>
        </div>
      `
      bookList.innerHTML += itemHTML
    })
  } else {
    bookList.innerHTML = `<p class="item-detail">Tidak ada data buku.</p>`
  }

  // 3. Render Santri
  santriList.innerHTML = '' // Kosongkan
  if (filteredSantri.length > 0) {
    filteredSantri.forEach((santri) => {
      const isChecked = santri.Status_Buku === 'Sudah'
      const statusClass = isChecked ? 'sudah' : 'belum'
      const statusId = `label-${santri.ID_Santri}`

      const itemHTML = `
        <div class="list-item">
          <div class="item-info">
            <span class="item-name">${santri.Nama_Santri}</span>
            <span class="item-detail">${santri.Jenjang} - ${santri.Kelas}</span>
          </div>
          <div class="item-status">
            <span id="${statusId}" class="status-label ${statusClass}">${
        santri.Status_Buku
      }</span>
            <label class="status-toggle">
              <input type="checkbox"
                     ${isChecked ? 'checked' : ''}
                     onchange="updateStatus('${santri.ID_Santri}', this)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `
      santriList.innerHTML += itemHTML
    })
  } else {
    santriList.innerHTML = `<p class="item-detail">Tidak ada data santri.</p>`
  }
}

// === FUNGSI UPDATE DATA (POST KE API) ===
async function updateStatus(id, checkbox) {
  const newStatus = checkbox.checked ? 'Sudah' : 'Belum'
  const statusLabel = document.getElementById(`label-${id}`)

  // 1. Optimistic Update: Langsung ubah UI agar responsif
  statusLabel.textContent = newStatus
  statusLabel.className = `status-label ${newStatus.toLowerCase()}`
  checkbox.disabled = true // Nonaktifkan toggle sementara request dikirim

  // 2. Update data di variabel global
  const santriIndex = allSantri.findIndex((s) => s.ID_Santri == id)
  if (santriIndex > -1) {
    allSantri[santriIndex].Status_Buku = newStatus
  }

  // 3. Kirim data ke API (Google Apps Script)
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: id,
        status: newStatus,
      }),
    })

    const result = await response.json()

    if (result.error) {
      throw new Error(result.message)
    }

    // console.log('Status berhasil diupdate:', result);
  } catch (error) {
    console.error('Gagal update status:', error)
    // Jika gagal, kembalikan UI ke status semula
    alert(`Gagal menyimpan perubahan: ${error.message}. Memuat ulang data.`)
    // Kembalikan ke state sebelumnya
    const oldStatus = newStatus === 'Sudah' ? 'Belum' : 'Sudah'
    statusLabel.textContent = oldStatus
    statusLabel.className = `status-label ${oldStatus.toLowerCase()}`
    checkbox.checked = !checkbox.checked
    // Atau muat ulang semua data
    // loadData();
  } finally {
    checkbox.disabled = false // Aktifkan kembali toggle
  }
}
