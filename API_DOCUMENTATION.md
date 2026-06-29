# Dokumentasi API Kalaras (Kalaras API Documentation)

Dokumentasi ini berisi daftar seluruh endpoint API yang tersedia di aplikasi Kalaras beserta metode HTTP, deskripsi, parameter/payload permintaan, dan contoh responsnya.

---

## Ketentuan Umum & Autentikasi
Sebagian besar endpoint memerlukan autentikasi menggunakan JSON Web Token (JWT).
* **Format Header:** `Authorization: Bearer <access_token>`
* **Base URL:** `http://localhost:3000`

---

## Daftar Endpoint Berdasarkan Kategori

### 1. Autentikasi (`/api/v1/auth`)

#### **Register Akun Baru**
* **Method & Path:** `POST /api/v1/auth/register`
* **Deskripsi:** Mendaftarkan akun pengguna baru ke dalam sistem.
* **Headers:** `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123",
    "full_name": "Nama Lengkap Pengguna",
    "religion": "Islam",
    "marital_status": "Belum Kawin",
    "phone": "081234567890",
    "referred_by": "kode-referral-opsional"
  }
  ```
* **Respons Berhasil (201 Created):**
  ```json
  {
    "message": "Pendaftaran berhasil. Silakan verifikasi akun Anda menggunakan kode OTP yang telah dikirim.",
    "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c"
  }
  ```

#### **Login Pengguna**
* **Method & Path:** `POST /api/v1/auth/login`
* **Deskripsi:** Autentikasi pengguna menggunakan email dan password untuk mendapatkan token akses.
* **Headers:** `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Login berhasil.",
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

#### **Logout Pengguna**
* **Method & Path:** `POST /api/v1/auth/logout`
* **Deskripsi:** Keluar dari aplikasi dan menonaktifkan refresh token yang digunakan.
* **Headers:** `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "refresh_token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Logout berhasil."
  }
  ```

#### **Pembaruan Access Token (Refresh)**
* **Method & Path:** `POST /api/v1/auth/refresh`
* **Deskripsi:** Mendapatkan `access_token` baru dengan menggunakan `refresh_token` yang masih valid.
* **Headers:** `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "refresh_token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Token berhasil diperbarui.",
    "access_token": "eyJhbGciOiJIUzI1NiIsInNew..."
  }
  ```

#### **Verifikasi OTP**
* **Method & Path:** `POST /api/v1/auth/verify-otp`
* **Deskripsi:** Memverifikasi kode OTP yang dikirimkan ke nomor ponsel pengguna.
* **Headers:** `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "phone": "081234567890",
    "otp": "123456"
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Verifikasi OTP berhasil."
  }
  ```

---

### 2. Profil & Identitas (`/api/v1/profile`)

#### **Ambil Profil Sendiri**
* **Method & Path:** `GET /api/v1/profile/`
* **Deskripsi:** Mengambil detail profil dari pengguna yang sedang masuk log.
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  {
    "id": "profile-uuid-1234",
    "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
    "full_name": "Nama Lengkap Pengguna",
    "religion": "Islam",
    "marital_status": "Belum Kawin",
    "avatar_url": "http://minio-url/avatar.jpg",
    "birth_place_date": "Jakarta, 01 Januari 2000",
    "address": "Jl. Mawar Indah No. 12",
    "updated_at": "2026-06-20T13:00:00.000Z",
    "user": {
      "email": "user@example.com",
      "phone": "081234567890",
      "role": "user",
      "tier": "free"
    }
  }
  ```

#### **Perbarui Profil**
* **Method & Path:** `PUT /api/v1/profile/`
* **Deskripsi:** Memperbarui data pribadi/profil pengguna (nama, agama, status pernikahan, nomor hp).
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "full_name": "Nama Baru Pengguna",
    "religion": "Islam",
    "marital_status": "Kawin",
    "phone": "081234567890"
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Profil dan identitas Anda berhasil diperbarui.",
    "data": {
      "id": "profile-uuid-1234",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "full_name": "Nama Baru Pengguna",
      "religion": "Islam",
      "marital_status": "Kawin",
      "avatar_url": "http://minio-url/avatar.jpg",
      "birth_place_date": "Jakarta, 01 Januari 2000",
      "address": "Jl. Mawar Indah No. 12",
      "updated_at": "2026-06-20T13:20:00.000Z"
    }
  }
  ```

#### **Unggah Foto Profil (Avatar)**
* **Method & Path:** `POST /api/v1/profile/avatar`
* **Deskripsi:** Mengunggah file gambar untuk dijadikan foto profil pengguna ke cloud storage MinIO.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: multipart/form-data`
* **Body (Multipart Form):**
  * `file`: Berkas gambar (jpg/png, maks 5 MB)
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Foto profil berhasil diperbarui.",
    "avatar_url": "http://minio-url/avatar-88ec7845-123456.png",
    "data": {
      "id": "profile-uuid-1234",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "full_name": "Nama Lengkap Pengguna",
      "religion": "Islam",
      "marital_status": "Belum Kawin",
      "avatar_url": "http://minio-url/avatar-88ec7845-123456.png",
      "updated_at": "2026-06-20T13:20:00.000Z"
    }
  }
  ```

#### **Ambil Daftar Dokumen Formal**
* **Method & Path:** `GET /api/v1/profile/documents`
* **Deskripsi:** Mengambil semua dokumen formal (KTP, BPJS, KK, dll.) yang pernah diunggah oleh pengguna.
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  [
    {
      "id": "doc-uuid-9999",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "document_type": "KTP",
      "file_url": "http://minio-url/doc-KTP-88ec7845-123.jpg",
      "file_name": "foto-ktp-saya.jpg",
      "created_at": "2026-06-20T13:00:00.000Z"
    }
  ]
  ```

#### **Unggah Dokumen Formal**
* **Method & Path:** `POST /api/v1/profile/documents`
* **Deskripsi:** Mengunggah file dokumen formal baru (seperti KTP, BPJS, KK) ke storage.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: multipart/form-data`
* **Body (Multipart Form):**
  * `file`: Berkas dokumen (pdf/image, maks 5 MB)
  * `document_type`: Kategori dokumen (Contoh: `"KTP"`, `"BPJS"`, `"KK"`, `"LAINNYA"`) (Default: `"LAINNYA"`)
* **Respons Berhasil (201 Created):**
  ```json
  {
    "message": "Dokumen formal berhasil diunggah dan disimpan secara aman.",
    "data": {
      "id": "doc-uuid-9999",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "document_type": "KTP",
      "file_url": "http://minio-url/doc-KTP-88ec7845-123.jpg",
      "file_name": "foto-ktp-saya.jpg",
      "created_at": "2026-06-20T13:20:00.000Z"
    }
  }
  ```

---

### 3. Pocket & Jurnal (`/api/v1/pocket`)

#### **Ambil Semua Kontak Darurat**
* **Method & Path:** `GET /api/v1/pocket/emergency-contacts`
* **Deskripsi:** Mengambil semua daftar kontak darurat yang didaftarkan pengguna, diurutkan berdasarkan prioritas terkecil.
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  [
    {
      "id": "contact-uuid-5555",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "name": "Aris",
      "relation": "Sahabat",
      "phone": "081299997777",
      "priority_order": 5,
      "created_at": "2026-06-20T13:00:00.000Z"
    }
  ]
  ```

#### **Tambah Kontak Darurat**
* **Method & Path:** `POST /api/v1/pocket/emergency-contacts`
* **Deskripsi:** Menambahkan kontak darurat baru. Maksimal kontak yang diperbolehkan adalah 5.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "name": "Aris",
    "relation": "Sahabat",
    "phone": "081299997777",
    "priority_order": 5
  }
  ```
* **Respons Berhasil (201 Created):**
  ```json
  {
    "message": "Kontak darurat berhasil ditambahkan.",
    "data": {
      "id": "contact-uuid-5555",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "name": "Aris",
      "relation": "Sahabat",
      "phone": "081299997777",
      "priority_order": 5,
      "created_at": "2026-06-20T13:20:00.000Z"
    }
  }
  ```

#### **Perbarui Kontak Darurat**
* **Method & Path:** `PUT /api/v1/pocket/emergency-contacts/:id`
* **Deskripsi:** Memperbarui data salah satu kontak darurat berdasarkan ID-nya.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Path Parameter:** `id` (UUID dari kontak darurat)
* **Body (Request Payload):**
  ```json
  {
    "name": "Aris Pratama",
    "relation": "Keluarga",
    "phone": "081299990000",
    "priority_order": 1
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Data kontak darurat berhasil diperbarui.",
    "data": {
      "id": "contact-uuid-5555",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "name": "Aris Pratama",
      "relation": "Keluarga",
      "phone": "081299990000",
      "priority_order": 1,
      "created_at": "2026-06-20T13:00:00.000Z"
    }
  }
  ```

#### **Hapus Kontak Darurat**
* **Method & Path:** `DELETE /api/v1/pocket/emergency-contacts/:id`
* **Deskripsi:** Menghapus data kontak darurat tertentu dari database.
* **Headers:** `Authorization: Bearer <access_token>`
* **Path Parameter:** `id` (UUID dari kontak darurat)
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Kontak darurat berhasil dihapus dari sistem."
  }
  ```

#### **Ambil Daftar Jurnal Harian**
* **Method & Path:** `GET /api/v1/pocket/journal`
* **Deskripsi:** Mengambil semua entri catatan harian dengan paginasi, terurut dari yang terbaru.
* **Headers:** `Authorization: Bearer <access_token>`
* **Query Parameters:**
  * `page`: Halaman ke-berapa (integer, default: `1`)
  * `limit`: Banyak data per halaman (integer, default: `10`)
* **Respons Berhasil (200 OK):**
  ```json
  {
    "meta": {
      "page": 1,
      "limit": 10,
      "total_data": 1,
      "total_page": 1
    },
    "data": [
      {
        "id": "journal-uuid-1111",
        "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
        "content": "Hari ini saya merasa lebih tenang...",
        "created_at": "2026-06-20T13:00:00.000Z",
        "updated_at": "2026-06-20T13:00:00.000Z"
      }
    ]
  }
  ```

#### **Tambah Catatan Jurnal Harian**
* **Method & Path:** `POST /api/v1/pocket/journal`
* **Deskripsi:** Menyimpan catatan jurnal baru untuk hari ini.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "content": "Hari ini saya merasa lebih tenang..."
  }
  ```
* **Respons Berhasil (201 Created):**
  ```json
  {
    "message": "Catatan jurnal harian berhasil disimpan.",
    "data": {
      "id": "journal-uuid-1111",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "content": "Hari ini saya merasa lebih tenang...",
      "created_at": "2026-06-20T13:20:00.000Z",
      "updated_at": "2026-06-20T13:20:00.000Z"
    }
  }
  ```

#### **Perbarui Catatan Jurnal Harian**
* **Method & Path:** `PUT /api/v1/pocket/journal/:id`
* **Deskripsi:** Mengedit isi catatan jurnal yang pernah dibuat berdasarkan ID-nya.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Path Parameter:** `id` (UUID dari jurnal)
* **Body (Request Payload):**
  ```json
  {
    "content": "Hari ini saya merasa sangat tenang dan bahagia..."
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Catatan jurnal harian berhasil diperbarui.",
    "data": {
      "id": "journal-uuid-1111",
      "user_id": "88ec7845-206a-4c9b-a6bd-01c64090bb8c",
      "content": "Hari ini saya merasa sangat tenang dan bahagia...",
      "created_at": "2026-06-20T13:00:00.000Z",
      "updated_at": "2026-06-20T13:20:00.000Z"
    }
  }
  ```

#### **Hapus Catatan Jurnal Harian**
* **Method & Path:** `DELETE /api/v1/pocket/journal/:id`
* **Deskripsi:** Menghapus salah satu catatan jurnal.
* **Headers:** `Authorization: Bearer <access_token>`
* **Path Parameter:** `id` (UUID dari jurnal)
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Catatan jurnal harian berhasil dihapus."
  }
  ```

---

### 4. Ringkasan Dashboard / Home (`/api/v1/home`)

#### **Ambil Summary Kelengkapan Data (Readiness Score)**
* **Method & Path:** `GET /api/v1/home/summary`
* **Deskripsi:** Menghitung dan mengembalikan skor kesiapan identitas (0-100) serta status kelengkapan data pribadi pengguna berdasarkan 5 kriteria dasar (Tempat Tanggal Lahir, Alamat, Kontak Darurat, Catatan Alergi, Riwayat Penyakit).
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Readiness score berhasil dihitung.",
    "data": {
      "readiness_score": 60,
      "criteria": {
        "tempat_tanggal_lahir": true,
        "alamat_lengkap": false,
        "kontak_darurat": true,
        "catatan_alergi": true,
        "riwayat_penyakit": false
      }
    }
  }
  ```

---

### 5. Medis (`/api/v1/medical`)

#### **Perbarui Profil Medis (Upsert)**
* **Method & Path:** `PUT /api/v1/medical/`
* **Deskripsi:** Membuat baru atau memperbarui data alergi dan riwayat medis pengguna (Upsert).
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "allergies": "Alergi obat Parasetamol dan Kacang-kacangan",
    "medical_history": "Pernah mengalami kecelakaan tulang belakang tahun 2022"
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Profil medis berhasil diperbarui.",
    "data": {
      "allergies": "Alergi obat Parasetamol dan Kacang-kacangan",
      "medical_history": "Pernah mengalami kecelakaan tulang belakang tahun 2022",
      "updated_at": "2026-06-20T13:20:00.000Z"
    }
  }
  ```

#### **Baca Medis Tag Darurat (Public)**
* **Method & Path:** `GET /api/v1/medical/tag/:userId`
* **Deskripsi:** Endpoint publik yang dapat diakses **tanpa autentikasi** untuk memindai data darurat pengguna (KTP, Kontak Darurat, Riwayat Medis) demi penyelamatan darurat.
* **Path Parameter:** `userId` (UUID dari pengguna target)
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Profil medis darurat berhasil diambil.",
    "data": {
      "identitas": {
        "full_name": "Nama Lengkap Pengguna",
        "birth_place_date": "Jakarta, 01 Januari 2000"
      },
      "kontak_darurat": [
        {
          "id": "contact-uuid-5555",
          "name": "Aris",
          "relation": "Sahabat",
          "phone": "081299997777",
          "priority_order": 5
        }
      ],
      "profil_medis": {
        "allergies": "Alergi obat Parasetamol dan Kacang-kacangan",
        "medical_history": "Pernah mengalami kecelakaan tulang belakang tahun 2022"
      }
    }
  }
  ```

---

### 6. Chatbot Kalaras AI (`/api/v1/kalaras`)

#### **Kirim Pesan Chat (AI Conversation)**
* **Method & Path:** `POST /api/v1/kalaras/chat`
* **Deskripsi:** Mengirim pesan teks ke chatbot Kalaras. Pencarian intent akan dicari terlebih dahulu di Redis Cache, kemudian didukung respons cerdas.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "message": "Halo, saya sedang merasa cemas."
  }
  ```
* **Respons Berhasil (200 OK):**
  ```json
  {
    "reply": "Halo! Tenang saja, Kalaras di sini untuk mendengarkan. Tarik napas perlahan..."
  }
  ```

#### **Ambil Kuota Harian Chat**
* **Method & Path:** `GET /api/v1/kalaras/quota`
* **Deskripsi:** Mengambil detail sisa limit kuota pesan harian chatbot untuk akun pengguna yang login.
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  {
    "user_tier": "free",
    "kuota_maksimal": 10,
    "kuota_terpakai": 2,
    "sisa_kuota": "8"
  }
  ```

#### **Hapus Riwayat Chat**
* **Method & Path:** `DELETE /api/v1/kalaras/history`
* **Deskripsi:** Menghapus seluruh riwayat obrolan pengguna dengan chatbot.
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Riwayat percakapan berhasil dihapus."
  }
  ```

---

### 7. Sinyal Darurat / Panic Alert (`/api/v1/emergency`)

#### **Trigger Sinyal Darurat**
* **Method & Path:** `POST /api/v1/emergency/trigger`
* **Deskripsi:** Memicu pengiriman sinyal darurat (notifikasi SMS/WhatsApp/Push) secara langsung ke semua kontak darurat terdaftar.
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Sinyal darurat berhasil diproses dan notifikasi telah dikirimkan kepada seluruh kontak terdaftar."
  }
  ```

#### **Ambil Riwayat Log Darurat**
* **Method & Path:** `GET /api/v1/emergency/logs`
* **Deskripsi:** Mengambil riwayat pengaktifan sinyal darurat pengguna.
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Daftar riwayat log darurat berhasil diambil.",
    "data": []
  }
  ```

---

### 8. Admin Chatbot Template (`/api/v1/admin/chatbot`)

#### **Buat Template Chatbot Baru**
* **Method & Path:** `POST /api/v1/admin/chatbot/templates`
* **Deskripsi:** Membuat intent template chatbot baru di database dan secara otomatis melakukan sinkronisasi ke Redis Cache. (Akses terbatas untuk admin/authenticated).
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "intent": "cemas",
    "keywords": "cemas, panik, takut, gugup",
    "response_template": "Jika Anda cemas, cobalah teknik pernapasan kotak: Hirup 4 detik, Tahan 4 detik, Hembuskan 4 detik."
  }
  ```
* **Respons Berhasil (201 Created):**
  ```json
  {
    "message": "Template chatbot baru berhasil dibuat dan disinkronkan.",
    "data": {
      "id": "template-uuid-0001",
      "intent": "cemas",
      "keywords": "cemas, panik, takut, gugup",
      "response_template": "Jika Anda cemas, cobalah teknik pernapasan kotak: Hirup 4 detik, Tahan 4 detik, Hembuskan 4 detik.",
      "created_at": "2026-06-20T13:20:00.000Z",
      "updated_at": "2026-06-20T13:20:00.000Z"
    }
  }
  ```

#### **Ambil Semua Template Chatbot**
* **Method & Path:** `GET /api/v1/admin/chatbot/templates`
* **Deskripsi:** Mengambil semua daftar template/intent chatbot yang tersimpan di PostgreSQL.
* **Headers:** `Authorization: Bearer <access_token>`
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Daftar template chatbot berhasil diambil.",
    "total": 1,
    "data": [
      {
        "id": "template-uuid-0001",
        "intent": "cemas",
        "keywords": "cemas, panik, takut, gugup",
        "response_template": "Jika Anda cemas, cobalah teknik pernapasan kotak: Hirup 4 detik, Tahan 4 detik, Hembuskan 4 detik.",
        "created_at": "2026-06-20T13:00:00.000Z",
        "updated_at": "2026-06-20T13:00:00.000Z"
      }
    ]
  }
  ```

#### **Hapus Template Chatbot**
* **Method & Path:** `DELETE /api/v1/admin/chatbot/templates/:id`
* **Deskripsi:** Menghapus template chatbot berdasarkan ID di database dan sekaligus menghapus cache-nya dari Redis.
* **Headers:** `Authorization: Bearer <access_token>`
* **Path Parameter:** `id` (UUID dari template)
* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Template chatbot dengan intent 'cemas' berhasil dihapus dari sistem dan cache."
  }
  ```

---

### 9. Safety Mode — Checkpoint & Deadman Switch (`/api/v1/safety`)

Fitur keselamatan perjalanan berbasis timer otomatis (Deadman Switch). Jika pengguna tidak mengkonfirmasi keselamatan dalam waktu yang ditentukan, sistem secara otomatis mengirimkan sinyal darurat ke seluruh kontak darurat melalui WhatsApp.

**Konsep Inti:**
* **Deadman Switch**: Timer berjalan di background (BullMQ). Jika user tidak menekan "Saya Aman" sebelum timer habis → sinyal darurat otomatis terkirim.
* **Zero Geolocation di Backend**: Server TIDAK menghitung jarak/radius. Client Flutter mengirimkan flag `is_out_of_route`.
* **Rolling Database**: Lokasi di-upsert (1 baris per user), tidak menumpuk data.

**Status Sesi (`SafetySession.status`):**
| Status | Deskripsi |
|---|---|
| `active` | Sesi sedang berjalan, timer aktif |
| `confirmed` | User menekan "Saya Aman" sebelum timer habis |
| `expired` | Timer habis, user tidak konfirmasi → AUTO_SOS terkirim |
| `critical` | Client melaporkan OUT_OF_ROUTE → darurat langsung terkirim |

#### **Mulai Sesi Safety Mode**
* **Method & Path:** `POST /api/v1/safety/start-session`
* **Deskripsi:** Memulai sesi Safety Mode baru dengan timer deadman switch. Jika user tidak mengkonfirmasi keselamatan sebelum timer habis, sinyal darurat otomatis dikirim ke semua kontak darurat via WhatsApp.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "duration_seconds": 1800,
    "preset_label": "Ojol Malam"
  }
  ```
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `duration_seconds` | integer | ✅ | Durasi timer (min: 60, max: 86400) dalam detik |
  | `preset_label` | string | ❌ | Label opsional (misal: "Ojol Malam", "Jalan Sendirian") |

* **Respons Berhasil (201 Created):**
  ```json
  {
    "message": "Sesi Safety Mode berhasil dimulai. Timer deadman switch aktif.",
    "data": {
      "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "duration_seconds": 1800,
      "started_at": "2026-06-26T14:00:00.000Z",
      "expires_at": "2026-06-26T14:30:00.000Z",
      "bullmq_job_id": "safety-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  }
  ```
* **Respons Gagal:**
  | Kode | Kondisi |
  |---|---|
  | `400` | `duration_seconds` tidak valid (bukan integer, < 60, atau > 86400) |
  | `409` | User sudah memiliki sesi aktif yang belum selesai |
  | `503` | Redis/BullMQ tidak tersedia |

#### **Konfirmasi Keselamatan (Saya Aman)**
* **Method & Path:** `POST /api/v1/safety/confirm-safe`
* **Deskripsi:** User mengkonfirmasi bahwa dirinya dalam keadaan aman. Timer deadman switch dibatalkan dan job dihapus dari antrean Redis.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
  ```
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `session_id` | string | ✅ | UUID sesi Safety Mode yang sedang aktif |

* **Respons Berhasil (200 OK):**
  ```json
  {
    "message": "Konfirmasi keselamatan berhasil. Timer deadman switch dibatalkan.",
    "data": {
      "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "confirmed",
      "confirmed_at": "2026-06-26T14:15:00.000Z"
    }
  }
  ```
* **Respons Gagal:**
  | Kode | Kondisi |
  |---|---|
  | `400` | `session_id` tidak dikirim |
  | `403` | Sesi bukan milik user yang login |
  | `404` | Sesi tidak ditemukan |
  | `409` | Status sesi sudah bukan `active` (sudah expired/confirmed/critical) |
  | `503` | Redis/BullMQ tidak tersedia |

#### **Update Lokasi & Deteksi Deviasi Rute**
* **Method & Path:** `POST /api/v1/safety/update-location`
* **Deskripsi:** Memperbarui lokasi terakhir user (upsert 1 baris per user). Jika `is_out_of_route = true`, sinyal darurat langsung dikirim ke semua kontak tanpa menunggu timer habis.
* **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
* **Body (Request Payload):**
  ```json
  {
    "latitude": -6.200000,
    "longitude": 106.816666,
    "is_out_of_route": false,
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
  ```
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `latitude` | number | ✅ | Koordinat latitude (-90 s/d 90) |
  | `longitude` | number | ✅ | Koordinat longitude (-180 s/d 180) |
  | `is_out_of_route` | boolean | ✅ | `true` jika client Flutter mendeteksi user keluar jalur |
  | `session_id` | string | ❌ | UUID sesi aktif (jika tidak dikirim, dicari otomatis dari DB) |

* **Respons Berhasil — Lokasi Normal (200 OK):**
  ```json
  {
    "message": "Lokasi berhasil diperbarui.",
    "data": {
      "latitude": -6.200000,
      "longitude": 106.816666,
      "recorded_at": "2026-06-26T14:10:00.000Z"
    }
  }
  ```
* **Respons Berhasil — Deviasi Rute Terdeteksi (200 OK):**
  ```json
  {
    "message": "⚠️ Deviasi rute terdeteksi! Sinyal darurat telah dikirim ke semua kontak terdaftar.",
    "data": {
      "location": {
        "latitude": -6.300000,
        "longitude": 107.000000
      },
      "session_status": "critical",
      "alert": {
        "total_contacts": 2,
        "delivered": 2,
        "failed": 0,
        "recipients": [
          {
            "name": "Aris",
            "phone": "081299997777",
            "chatId": "6281299997777@c.us",
            "delivered": true
          },
          {
            "name": "Budi",
            "phone": "081288886666",
            "chatId": "6281288886666@c.us",
            "delivered": true
          }
        ]
      }
    }
  }
  ```
* **Respons Gagal:**
  | Kode | Kondisi |
  |---|---|
  | `400` | Koordinat tidak valid, atau deviasi terdeteksi tapi tidak ada kontak darurat terdaftar |
  | `503` | Redis/BullMQ tidak tersedia |
