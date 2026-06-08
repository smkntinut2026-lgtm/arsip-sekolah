export interface ProfilSekolah {
  id: string
  nama_sekolah: string
  npsn: string
  alamat: string
  logo_url: string
  created_at: string
  updated_at: string
}

export interface Pengguna {
  id: string
  nama_lengkap: string
  email: string
  role: 'admin' | 'staff'
  created_at: string
  updated_at: string
}

export interface JenisFile {
  id: string
  nama: string
  kategori: 'guru' | 'siswa' | 'kepala_sekolah'
  wajib: boolean
  urutan: number
  created_at: string
}

export interface DataGuru {
  id: string
  nama_lengkap: string
  nik: string
  tempat_lahir: string
  tanggal_lahir: string | null
  pendidikan_terakhir: string
  gelar: string
  no_telepon: string
  jabatan: 'Guru' | 'Tendik'  // ✅ v3: kolom jabatan
  status_induk: 'Induk' | 'Non Induk'  // ✅ v4: status induk
  created_at: string
  updated_at: string
  file_guru?: FileGuru[]
}

export interface DataSiswa {
  id: string
  nama_lengkap: string
  nisn: string
  tempat_lahir: string
  tanggal_lahir: string | null
  kelas: string
  created_at: string
  updated_at: string
  file_siswa?: FileSiswa[]
}

export interface FileGuru {
  id: string
  guru_id: string
  jenis_file_id: string | null
  nama_file: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_by: string | null
  created_at: string
  jenis_file?: JenisFile
}

export interface FileSiswa {
  id: string
  siswa_id: string
  jenis_file_id: string | null
  nama_file: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_by: string | null
  created_at: string
  jenis_file?: JenisFile
}

export interface ArsipSekolah {
  id: string
  nama_file: string
  kategori: string
  deskripsi: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_by: string | null
  created_at: string
  pengguna?: { nama_lengkap: string }
}

// ✅ Kepala Sekolah
export interface KepalaSekolah {
  id: string
  nama_lengkap: string
  nip: string
  tempat_lahir: string
  tanggal_lahir: string | null
  pendidikan_terakhir: string
  gelar: string
  foto_url: string
  periode_mulai: string | null
  periode_selesai: string | null
  is_active: boolean
  no_telepon: string  // ✅ Kolom baru
  created_at: string
  updated_at: string
}

// ✅ File Kepala Sekolah
export interface FileKepalaSekolah {
  id: string
  kepala_sekolah_id: string
  jenis_file_id: string | null
  nama_file: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_by: string | null
  created_at: string
  jenis_file?: JenisFile
}
