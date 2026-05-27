'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../layout'
import { Save, Upload, School, X, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function ProfilPage() {
  const supabase = createClient()
  const { user, refreshProfil } = useApp()
  const router = useRouter()

  const [form, setForm] = useState({ nama_sekolah: '', npsn: '', alamat: '' })
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/dashboard'); return }
    fetchProfil()
  }, [user])

  async function fetchProfil() {
    const { data } = await supabase.from('profil_sekolah').select('*').limit(1).single()
    if (data) {
      setForm({ nama_sekolah: data.nama_sekolah, npsn: data.npsn, alamat: data.alamat })
      setLogoUrl(data.logo_url)
    }
    setLoading(false)
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran logo max 5MB'); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.nama_sekolah.trim()) { toast.error('Nama sekolah wajib diisi'); return }
    setSaving(true)
    try {
      let newLogoUrl = logoUrl

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `logo-${Date.now()}.${ext}`
        const { error: storageErr } = await supabase.storage
          .from('sekolah-logos').upload(path, logoFile, { upsert: true })
        if (storageErr) throw storageErr
        const { data: urlData } = supabase.storage.from('sekolah-logos').getPublicUrl(path)
        newLogoUrl = urlData.publicUrl
      }

      // Check if row exists
      const { data: existing } = await supabase.from('profil_sekolah').select('id').limit(1).single()
      if (existing) {
        await supabase.from('profil_sekolah').update({
          ...form, logo_url: newLogoUrl, updated_at: new Date().toISOString()
        }).eq('id', existing.id)
      } else {
        await supabase.from('profil_sekolah').insert({ ...form, logo_url: newLogoUrl })
      }

      setLogoUrl(newLogoUrl)
      setLogoFile(null)
      setLogoPreview('')
      toast.success('Profil sekolah berhasil disimpan')
      refreshProfil()
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Profil Sekolah</h1>
        <p className="text-slate-500 text-sm mt-0.5">Informasi sekolah yang tampil di halaman login</p>
      </div>

      {/* Preview card */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-primary-50 to-violet-50 border-primary-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Preview Halaman Login</p>
        <div className="flex flex-col items-center gap-3 py-4">
          {(logoPreview || logoUrl) ? (
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-card border-2 border-white">
              <Image
                src={logoPreview || logoUrl}
                alt="Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <School className="w-10 h-10 text-white" />
            </div>
          )}
          <div className="text-center">
            <p className="text-xl font-display font-bold text-slate-800">
              {form.nama_sekolah || 'Nama Sekolah'}
            </p>
            {form.npsn && <p className="text-sm text-slate-500">NPSN: {form.npsn}</p>}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6 space-y-5">
        {/* Logo upload */}
        <div>
          <label className="label">Logo Sekolah</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
              {(logoPreview || logoUrl) ? (
                <Image
                  src={logoPreview || logoUrl}
                  alt="Logo"
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-secondary text-sm w-full sm:w-auto"
              >
                <Upload className="w-4 h-4" /> Pilih Logo
              </button>
              <p className="text-xs text-slate-400 mt-2">JPG, PNG, SVG. Maksimum 5MB</p>
              {logoPreview && (
                <button
                  onClick={() => { setLogoFile(null); setLogoPreview('') }}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 mt-1"
                >
                  <X className="w-3 h-3" /> Hapus logo baru
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Nama Sekolah *</label>
          <input
            className="input"
            value={form.nama_sekolah}
            onChange={e => setForm({ ...form, nama_sekolah: e.target.value })}
            placeholder="Contoh: SMA Negeri 1 Manado"
          />
        </div>

        <div>
          <label className="label">NPSN</label>
          <input
            className="input"
            value={form.npsn}
            onChange={e => setForm({ ...form, npsn: e.target.value })}
            placeholder="Nomor Pokok Sekolah Nasional"
          />
        </div>

        <div>
          <label className="label">Alamat Sekolah</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.alamat}
            onChange={e => setForm({ ...form, alamat: e.target.value })}
            placeholder="Alamat lengkap sekolah"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-3"
        >
          {saving ? <div className="spinner" /> : <Save className="w-5 h-5" />}
          {saving ? 'Menyimpan...' : 'Simpan Profil Sekolah'}
        </button>
      </div>
    </div>
  )
}
