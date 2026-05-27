# 📚 Arsip Sekolah — Sistem Arsip File Digital

Aplikasi manajemen arsip file sekolah berbasis web dengan Next.js 14, Supabase, dan Tailwind CSS. Dihost di Vercel dengan database Supabase.

---

## 🛠️ Stack Teknologi

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Google Fonts (Sora + Plus Jakarta Sans)
- **Database & Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel
- **Import/Export**: SheetJS (xlsx)

---

## ✨ Fitur

- 🔐 Login dengan email & password
- 🏫 Profil sekolah (nama, NPSN, alamat, logo) tampil di halaman login
- 👥 Manajemen pengguna (Admin & Staff)
- 📋 Jenis file yang dapat dikonfigurasi (wajib/tidak wajib) per guru/siswa
- 👨‍🏫 Data guru dengan import Excel
- 👨‍🎓 Data siswa dengan import Excel + filter kelas
- 📁 Upload, download, dan hapus file per guru/siswa
- ⚠️ Warning otomatis jika file wajib belum lengkap
- 📊 Dashboard statistik kelengkapan dokumen
- 📱 Responsif untuk laptop & HP

---

## 🚀 Cara Setup & Deploy

### 1. Clone Repository

```bash
git clone https://github.com/USERNAME/arsip-sekolah.git
cd arsip-sekolah
npm install
```

### 2. Setup Supabase

1. Buka [supabase.com](https://supabase.com) dan login
2. Buat project baru
3. Buka **SQL Editor** dan jalankan isi file `supabase-schema.sql`
4. Setelah selesai, catat:
   - **Project URL** (Settings → API → Project URL)
   - **Anon Key** (Settings → API → anon/public)
   - **Service Role Key** (Settings → API → service_role)

### 3. Buat File `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Buat Akun Admin Pertama di Supabase

1. Buka **Supabase Dashboard → Authentication → Users**
2. Klik **"Add user"** → isi email & password
3. Buka **SQL Editor**, jalankan perintah ini (ganti dengan ID user yang baru dibuat):

```sql
UPDATE pengguna SET role = 'admin' WHERE email = 'email-admin-anda@example.com';
```

### 5. Test Lokal

```bash
npm run dev
# Buka http://localhost:3000
```

### 6. Deploy ke Vercel

**Cara A: Via GitHub (Direkomendasikan)**

1. Push kode ke GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Buka [vercel.com](https://vercel.com) → **Add New Project**
3. Import repo dari GitHub
4. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Klik **Deploy**

**Cara B: Via Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 📁 Struktur Proyek

```
arsip-sekolah/
├── src/
│   ├── app/
│   │   ├── login/           # Halaman login
│   │   ├── dashboard/
│   │   │   ├── layout.tsx   # Sidebar + layout utama
│   │   │   ├── page.tsx     # Dashboard (statistik)
│   │   │   ├── guru/        # Data & file guru
│   │   │   ├── siswa/       # Data & file siswa
│   │   │   ├── jenis-file/  # Kelola jenis file (admin)
│   │   │   ├── pengguna/    # Kelola pengguna (admin)
│   │   │   └── profil/      # Profil sekolah (admin)
│   │   └── globals.css
│   ├── lib/supabase/        # Supabase client/server
│   ├── middleware.ts        # Auth middleware
│   └── types/               # TypeScript types
├── supabase-schema.sql      # SQL schema lengkap
├── .env.example             # Template env vars
└── README.md
```

---

## 🔒 Hak Akses

| Fitur | Admin | Staff |
|---|---|---|
| Login | ✅ | ✅ |
| Lihat data guru/siswa | ✅ | ✅ |
| Download file | ✅ | ✅ |
| Upload/hapus file | ✅ | ❌ |
| Tambah/edit/hapus guru/siswa | ✅ | ❌ |
| Import Excel | ✅ | ❌ |
| Kelola jenis file | ✅ | ❌ |
| Kelola pengguna | ✅ | ❌ |
| Edit profil sekolah | ✅ | ❌ |

---

## 📋 Format Template Import Excel

### Guru
| Nama Lengkap | NIK | Tempat Lahir | Tanggal Lahir | Pendidikan Terakhir | Gelar |
|---|---|---|---|---|---|
| Ahmad Fauzi | 1234... | Jakarta | 1985-05-15 | S1 | S.Pd |

### Siswa
| Nama Lengkap | NISN | Tempat Lahir | Tanggal Lahir | Kelas |
|---|---|---|---|---|
| Budi Santoso | 1234567890 | Manado | 2008-06-20 | X IPA 1 |

> Field kosong akan dilewati dan dapat dilengkapi nanti via tombol Edit.

---

## ❓ Troubleshooting

**Login gagal terus:**
- Pastikan akun sudah dibuat di Supabase Auth
- Pastikan RLS policy sudah dijalankan dari schema SQL

**Upload file gagal:**
- Pastikan storage bucket sudah dibuat (jalankan ulang schema SQL)
- Cek storage policy di Supabase Dashboard → Storage → Policies

**Data tidak muncul:**
- Pastikan RLS policies sudah aktif
- Cek Supabase Dashboard → Table Editor untuk verifikasi data

---

*Dibuat dengan ❤️ untuk kemudahan administrasi sekolah*
