-- =====================================================
-- ARSIP SEKOLAH - Supabase Database Schema
-- Jalankan SQL ini di Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: profil_sekolah
-- =====================================================
CREATE TABLE IF NOT EXISTS profil_sekolah (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_sekolah TEXT NOT NULL DEFAULT '',
  npsn TEXT DEFAULT '',
  alamat TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row
INSERT INTO profil_sekolah (nama_sekolah, npsn, alamat)
VALUES ('Nama Sekolah', '', '')
ON CONFLICT DO NOTHING;

-- =====================================================
-- TABLE: pengguna (users/profiles)
-- =====================================================
CREATE TABLE IF NOT EXISTS pengguna (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: jenis_file (file types that admin defines)
-- =====================================================
CREATE TABLE IF NOT EXISTS jenis_file (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('guru', 'siswa')),
  wajib BOOLEAN DEFAULT false,
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: data_guru
-- =====================================================
CREATE TABLE IF NOT EXISTS data_guru (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_lengkap TEXT NOT NULL,
  nik TEXT DEFAULT '',
  tempat_lahir TEXT DEFAULT '',
  tanggal_lahir DATE,
  pendidikan_terakhir TEXT DEFAULT '',
  gelar TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: data_siswa
-- =====================================================
CREATE TABLE IF NOT EXISTS data_siswa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_lengkap TEXT NOT NULL,
  nisn TEXT DEFAULT '',
  tempat_lahir TEXT DEFAULT '',
  tanggal_lahir DATE,
  kelas TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: file_guru (uploaded files for guru)
-- =====================================================
CREATE TABLE IF NOT EXISTS file_guru (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guru_id UUID NOT NULL REFERENCES data_guru(id) ON DELETE CASCADE,
  jenis_file_id UUID REFERENCES jenis_file(id) ON DELETE SET NULL,
  nama_file TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT DEFAULT '',
  uploaded_by UUID REFERENCES pengguna(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: file_siswa (uploaded files for siswa)
-- =====================================================
CREATE TABLE IF NOT EXISTS file_siswa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  siswa_id UUID NOT NULL REFERENCES data_siswa(id) ON DELETE CASCADE,
  jenis_file_id UUID REFERENCES jenis_file(id) ON DELETE SET NULL,
  nama_file TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT DEFAULT '',
  uploaded_by UUID REFERENCES pengguna(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('sekolah-logos', 'sekolah-logos', true, 5242880),
  ('file-guru', 'file-guru', false, 52428800),
  ('file-siswa', 'file-siswa', false, 52428800)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profil_sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_siswa ENABLE ROW LEVEL SECURITY;

-- profil_sekolah: semua bisa baca, hanya auth yang bisa update
CREATE POLICY "profil_sekolah_read" ON profil_sekolah FOR SELECT USING (true);
CREATE POLICY "profil_sekolah_update" ON profil_sekolah FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "profil_sekolah_insert" ON profil_sekolah FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- pengguna: auth bisa baca semua, insert/update sendiri atau admin
CREATE POLICY "pengguna_read" ON pengguna FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pengguna_insert" ON pengguna FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pengguna_update" ON pengguna FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "pengguna_delete" ON pengguna FOR DELETE USING (EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));

-- jenis_file: semua auth bisa baca, hanya admin yang bisa CRUD
CREATE POLICY "jenis_file_read" ON jenis_file FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "jenis_file_insert" ON jenis_file FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "jenis_file_update" ON jenis_file FOR UPDATE USING (EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "jenis_file_delete" ON jenis_file FOR DELETE USING (EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));

-- data_guru: semua auth bisa baca, hanya admin insert/update/delete
CREATE POLICY "data_guru_read" ON data_guru FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "data_guru_write" ON data_guru FOR ALL USING (EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));

-- data_siswa: semua auth bisa baca, hanya admin insert/update/delete
CREATE POLICY "data_siswa_read" ON data_siswa FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "data_siswa_write" ON data_siswa FOR ALL USING (EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));

-- file_guru: semua auth bisa baca, hanya admin insert/delete
CREATE POLICY "file_guru_read" ON file_guru FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "file_guru_write" ON file_guru FOR ALL USING (EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));

-- file_siswa: semua auth bisa baca, hanya admin insert/delete
CREATE POLICY "file_siswa_read" ON file_siswa FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "file_siswa_write" ON file_siswa FOR ALL USING (EXISTS (SELECT 1 FROM pengguna WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Logos: public read, auth write
CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'sekolah-logos');
CREATE POLICY "logos_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sekolah-logos' AND auth.role() = 'authenticated');
CREATE POLICY "logos_auth_update" ON storage.objects FOR UPDATE USING (bucket_id = 'sekolah-logos' AND auth.role() = 'authenticated');
CREATE POLICY "logos_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'sekolah-logos' AND auth.role() = 'authenticated');

-- File guru: auth read, admin write
CREATE POLICY "file_guru_storage_read" ON storage.objects FOR SELECT USING (bucket_id = 'file-guru' AND auth.role() = 'authenticated');
CREATE POLICY "file_guru_storage_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'file-guru' AND auth.role() = 'authenticated');
CREATE POLICY "file_guru_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'file-guru' AND auth.role() = 'authenticated');

-- File siswa: auth read, admin write
CREATE POLICY "file_siswa_storage_read" ON storage.objects FOR SELECT USING (bucket_id = 'file-siswa' AND auth.role() = 'authenticated');
CREATE POLICY "file_siswa_storage_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'file-siswa' AND auth.role() = 'authenticated');
CREATE POLICY "file_siswa_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'file-siswa' AND auth.role() = 'authenticated');

-- =====================================================
-- FUNCTION: Auto-create pengguna on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.pengguna (id, nama_lengkap, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nama_lengkap', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'staff')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SAMPLE: Jenis file default
-- =====================================================
INSERT INTO jenis_file (nama, kategori, wajib, urutan) VALUES
  ('Ijazah Terakhir', 'guru', true, 1),
  ('SK Pengangkatan', 'guru', false, 2),
  ('Sertifikat Pendidik', 'guru', false, 3),
  ('Kartu NUPTK', 'guru', false, 4),
  ('Akta Kelahiran', 'siswa', false, 1),
  ('Kartu Keluarga', 'siswa', false, 2),
  ('Ijazah SD/SMP', 'siswa', false, 3),
  ('Pas Foto', 'siswa', false, 4)
ON CONFLICT DO NOTHING;
