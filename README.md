# FingerCarousel-MR

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-0097A7?style=flat-square)
![Mixed Reality](https://img.shields.io/badge/Mixed%20Reality-Project-6A1B9A?style=flat-square)

**FingerCarousel-MR** adalah aplikasi web berbasis kamera yang menampilkan galeri gambar mobil di atas feed webcam secara real-time. Galeri digeser cukup dengan menggerakkan **ujung telunjuk** di udara — tanpa menyentuh layar, mouse, maupun keyboard.

Project ini awalnya dibuat untuk tugas mata kuliah **Mixed Reality**.

---

## Kategori Project

| Lapisan | Kategori | Keterangan |
| --- | --- | --- |
| Interaksi | Touchless / free-hand gesture interaction, NUI | Telunjuk berperan sebagai kursor alami |
| Teknologi tampilan | Mixed Reality / XR (screen-based AR) | Objek virtual (gambar mobil) digabung dengan video kamera secara real-time |
| Teknis | Computer Vision + ML inference on-device | MediaPipe Hands memprediksi 21 landmark tangan |
| Akademik | Aplikasi HCI / CV, bukan riset ML | Menggunakan model pra-latih, tanpa proses training |

Singkatnya: **aplikasi Mixed Reality berbasis ML-powered computer vision**. Komponen ML-nya berada di sisi *inference* (deteksi landmark tangan), bukan *training*.

---

## Fitur

- **Mirror view** — feed kamera ditampilkan terbalik seperti cermin agar gerakan tangan terasa natural.
- **Hand tracking 21 landmark** — seluruh kerangka tangan digambar di atas video, ujung telunjuk ditandai khusus.
- **Hover kartu** — saat telunjuk berada di atas sebuah kartu, kartu tersebut terangkat (`-30px`) dan membesar (`1.05x`).
- **Drag-to-scroll** — geser telunjuk ke kiri/kanan (mulai setelah bergerak 6px) untuk memindahkan galeri. Drag tetap aktif walau telunjuk keluar dari area kartu, dan dilepas saat tangan keluar frame atau telunjuk menjauh dari baris kartu.
- **Smoothing berbasis waktu** — gerakan galeri halus dan terasa sama di 30 fps maupun 60 fps.
- **Loop tanpa henti** — galeri berputar seperti carousel: melewati `img6` akan memunculkan `img1` lagi, dan sebaliknya. Tidak ada ujung, tidak ada area kosong.
- **Umpan balik status** — pesan jelas jika kamera ditolak, tidak ditemukan, atau browser tidak mendukung.
- **Tema liquid glass** — HUD berupa panel kaca (blur + rim light), kartu bergaris tepi kaca di canvas, glow lembut, dan latar orb yang bergerak pelan. Animasi dinonaktifkan otomatis saat `prefers-reduced-motion`.
- **Responsif** — panggung kamera menjaga rasio 4:3, menyesuaikan lebar/tinggi layar, menghormati *safe area* perangkat ber-notch, dan mengecilkan teks pada layar sempit.
- **Mesin framework-free** — logika kamera, gesture, dan render tidak meng-import Vue, jadi bisa dipakai ulang oleh UI lain.

---

## Cara Kerja

1. Kamera diambil melalui `Camera` utils dan dikirim ke MediaPipe Hands setiap frame.
2. MediaPipe menghasilkan 21 landmark tangan dalam koordinat ternormalisasi `(0..1)`.
3. Landmark dicerminkan (`x -> 1 - x`) agar sinkron dengan tampilan mirror.
4. Landmark indeks **8** (ujung telunjuk) dikonversi ke koordinat piksel.
5. Posisi telunjuk diuji terhadap area setiap kartu untuk menentukan kartu yang sedang di-hover.
6. Setelah telunjuk bergerak melewati ambang 6px di atas kartu, mode **drag** aktif dan selisih posisi antar-frame (`dx`) dipakai untuk menggeser `targetScrollX`. Drag bertahan sampai tangan keluar frame atau telunjuk menjauh lebih dari 90px dari baris kartu.
7. `targetScrollX` sengaja **tidak dibatasi**. Posisi gambar dihitung dengan `scrollX mod RING_WIDTH` (6 kartu × 200px = 1200px), lalu setiap kartu digambar beserta salinannya di kiri dan kanan. Hasilnya deretan gambar berulang mulus tanpa celah, dan nilai scroll dinormalisasi agar tetap kecil.
8. Deteksi dan render dipisah: hasil MediaPipe disimpan, lalu satu loop `requestAnimationFrame` menghaluskan `scrollX` menuju `targetScrollX` (berbasis waktu) dan menggambar seluruh scene: video mirror → kerangka tangan → kartu gambar.

---

## Teknologi

- **Vue 3 + Vite + TypeScript** untuk shell UI: layout, HUD, dan status.
- **Canvas 2D** untuk render. Mesin carousel, gesture, dan pipeline kamera berada di `src/engine/` dan **tidak bergantung pada Vue**.
- **[MediaPipe Hands](https://developers.google.com/mediapipe)** — model hand landmark detection.
- `@mediapipe/camera_utils` untuk loop kamera. Kerangka tangan digambar sendiri di Canvas (tanpa `drawing_utils`) agar tetap tajam di layar HiDPI.
- Library MediaPipe dimuat via CDN jsDelivr dengan **versi di-pin** (tidak ikut berubah saat upstream update), jadi **butuh koneksi internet** saat runtime.
- Rencana berikutnya: migrasi dari legacy Solutions ke `@mediapipe/tasks-vision` dengan model & wasm lokal.

---

## Menjalankan

Akses kamera hanya diizinkan pada *secure context* (**localhost** atau **HTTPS**), jadi jangan membuka `index.html` langsung lewat `file://`.

```bash
# dari dalam folder project
npm install
npm run dev
```

Buka URL yang dicetak Vite (biasanya <http://localhost:5173>) dan izinkan akses kamera saat browser meminta.

Untuk memeriksa hasil produksi:

```bash
npm run build
npm run preview
```

`legacy/index.html` adalah arsip versi satu-file sebelum refactor dan tidak dipakai lagi.

**Tips:** pastikan pencahayaan cukup dan tangan terlihat penuh oleh kamera (jarak ideal ±40–80 cm).

---

## Kontrol

| Aksi | Efek |
| --- | --- |
| Arahkan telunjuk ke sebuah kartu | Kartu terangkat dan sedikit membesar |
| Geser telunjuk ke kiri / kanan (min. 6px) | Galeri bergeser horizontal; kartu tetap terangkat walau telunjuk keluar dari area kartu |
| Terus menggeser melewati kartu terakhir | Galeri berputar kembali ke kartu pertama — tanpa batas |
| Telunjuk bergerak > 90px ke atas / bawah dari baris kartu | Drag dilepas |
| Tarik tangan keluar frame | Drag dilepas, kursor nonaktif |

---

## Struktur File

```text
.
├── index.html          # shell Vite
├── src/
│   ├── main.ts         # bootstrap Vue
│   ├── App.vue         # panggung kamera + HUD + status
│   ├── config.ts       # konstanta carousel
│   ├── engine/         # mesin carousel: kamera, gesture, render (framework-free)
│   ├── composables/    # jembatan Vue ↔ engine
│   ├── styles/         # CSS global
│   └── types/          # deklarasi MediaPipe legacy (temporer)
├── public/             # aset gambar mobil
├── legacy/             # arsip versi satu-file sebelum refactor
├── netlify.toml        # konfigurasi build & deploy
└── README.md
```

---

## Batasan

- Hanya memproses **satu tangan** dan gerakan **satu arah** (horizontal).
- Deteksi sensitif terhadap pencahayaan dan latar yang ramai.
- Ukuran, jarak, dan posisi kartu masih *hardcoded* (`180x120`, spacing `200px`).
- Belum ada momentum/inertia setelah gestur dilepas.
- Karena galeri berputar tanpa ujung, belum ada penanda posisi (dots) — pengguna tidak tahu sedang di gambar ke berapa.

---

## Rencana Pengembangan

- [ ] Inertia scroll setelah gestur dilepas
- [ ] Gestur *pinch* untuk memilih kartu dan membuka detail mobil
- [ ] Indikator posisi (dots) yang ikut berputar
- [ ] Dukungan multi-tangan dan scroll vertikal
- [ ] Penempatan kartu berbasis pose/spatial anchor agar level MR-nya lebih kuat

---

## Lisensi

Kode bebas dipakai untuk pembelajaran dan pengembangan pribadi. Gambar mobil merupakan aset contoh dan hak milik pemilik masing-masing.
