-- =====================================================
-- MIGRASI: Arsip Sekolah & Portal Publik
-- Jalankan SQL ini di Supabase SQL Editor
-- =====================================================

-- =====================================================
-- TABLE: arsip_sekolah
-- Untuk menyimpan file umum sekolah (akreditasi, izin, dll)
-- =====================================================
CREATE TABLE IF NOT EXISTS arsip_sekolah (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_file TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Lainnya',
  deskripsi TEXT DEFAULT '',
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT DEFAULT '',
  uploaded_by UUID REFERENCES pengguna(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY untuk arsip_sekolah
-- =====================================================
ALTER TABLE arsip_sekolah ENABLE ROW LEVEL SECURITY;

-- Semua user ter-autentikasi bisa baca
CREATE POLICY "arsip_sekolah_read_auth" ON arsip_sekolah
  FOR SELECT USING (auth.role() = 'authenticated');

-- Akses publik (tanpa login) untuk portal publik
CREATE POLICY "arsip_sekolah_read_public" ON arsip_sekolah
  FOR SELECT USING (true);

-- Hanya admin yang bisa insert/update/delete
CREATE POLICY "arsip_sekolah_write" ON arsip_sekolah
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- STORAGE BUCKET: arsip-sekolah
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('arsip-sekolah', 'arsip-sekolah', true, 52428800)
ON CONFLICT DO NOTHING;

-- Storage policies untuk arsip-sekolah
CREATE POLICY "arsip_sekolah_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'arsip-sekolah');

CREATE POLICY "arsip_sekolah_storage_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'arsip-sekolah' AND auth.role() = 'authenticated');

CREATE POLICY "arsip_sekolah_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'arsip-sekolah' AND auth.role() = 'authenticated');

-- =====================================================
-- PORTAL PUBLIK: Akses tanpa login untuk file guru & siswa
-- Catatan: Aktifkan policy ini HANYA jika Anda ingin portal
-- dapat diakses tanpa login. Jika tidak, hapus policy ini
-- dan portal hanya bisa diakses setelah login.
-- =====================================================

-- Izinkan akses publik untuk data guru di portal
CREATE POLICY "data_guru_read_public" ON data_guru
  FOR SELECT USING (true);

-- Izinkan akses publik untuk data siswa di portal
CREATE POLICY "data_siswa_read_public" ON data_siswa
  FOR SELECT USING (true);

-- Izinkan akses publik untuk file guru di portal
CREATE POLICY "file_guru_read_public" ON file_guru
  FOR SELECT USING (true);

-- Izinkan akses publik untuk file siswa di portal
CREATE POLICY "file_siswa_read_public" ON file_siswa
  FOR SELECT USING (true);

-- Izinkan akses publik untuk jenis_file
CREATE POLICY "jenis_file_read_public" ON jenis_file
  FOR SELECT USING (true);

-- Izinkan akses publik untuk profil_sekolah (sudah ada di schema awal)
-- CREATE POLICY "profil_sekolah_public" ON profil_sekolah FOR SELECT USING (true);

-- Storage: akses publik untuk file-guru dan file-siswa (untuk portal)
-- PERHATIAN: Ini membuat file dapat didownload tanpa login.
-- Hapus policy ini jika tidak diinginkan.
CREATE POLICY "file_guru_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'file-guru');

CREATE POLICY "file_siswa_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'file-siswa');
