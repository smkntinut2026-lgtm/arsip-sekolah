'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../context'
import { useRouter } from 'next/navigation'
import {
  Plus, Edit3, Trash2, Save, X, Upload, User,
  CheckCircle2, Clock, Calendar, GraduationCap, BadgeCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { KepalaSekolah } from '@/types'

const EMPTY_FORM = {
  nama_lengkap: '',
  nip: '',
  tempat_lahir: '',
  tanggal_lahir: '',
  pendidikan_terakhir: '',
  gelar: '',
  periode_mulai: '',
  periode_selesai: '',
  is_active: true,
}

export default function KepalaSekolahPage() {
  const supabase = createClient()
  const { user } = useApp()
  const router = useRouter()

  const [list, setList] = useState<KepalaSekolah[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<KepalaSekolah | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const fotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/dashboard'); return }
    fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('kepala_sekolah')
      .select('*')
      .order('is_active', { ascending: false })
      .order('periode_mulai', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFotoFile(null)
    setFotoPreview('')
    setShowModal(true)
  }

  function openEdit(ks: KepalaSekolah) {
    setEditing(ks)
    setForm({
      nama_lengkap: ks.nama_lengkap,
      nip: ks.nip,
      tempat_lahir: ks.tempat_lahir,
      tanggal_lahir: ks.tanggal_lahir ?? '',
      pendidikan_terakhir: ks.pendidikan_terakhir,
      gelar: ks.gelar,
      periode_mulai: ks.periode_mulai ?? '',
      periode_selesai: ks.periode_selesai ?? '',
      is_active: ks.is_active,
    })
    setFotoFile(null)
    setFotoPreview('')
    setShowModal(true)
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran foto max 5MB'); return }
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.nama_lengkap.trim()) { toast.error('Nama lengkap wajib diisi'); return }
    setSaving(true)
    try {
      let foto_url = editing?.foto_url ?? ''

      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop()
        const path = `foto-${Date.now()}.${ext}`
        const { error: storageErr } = await supabase.storage
          .from('foto-kepala-sekolah')
          .upload(path, fotoFile, { upsert: true })
        if (storageErr) throw storageErr
        const { data: urlData } = supabase.storage
          .from('foto-kepala-sekolah')
          .getPublicUrl(path)
        foto_url = urlData.publicUrl
      }

      const payload = {
        nama_lengkap: form.nama_lengkap.trim(),
        nip: form.nip.trim(),
        tempat_lahir: form.tempat_lahir.trim(),
        tanggal_lahir: form.tanggal_lahir || null,
        pendidikan_terakhir: form.pendidikan_terakhir.trim(),
        gelar: form.gelar.trim(),
        foto_url,
        periode_mulai: form.periode_mulai || null,
        periode_selesai: form.periode_selesai || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }

      // Jika set aktif, nonaktifkan yang lain dulu
      if (form.is_active) {
        await supabase
          .from('kepala_sekolah')
          .update({ is_active: false })
          .neq('id', editing?.id ?? '00000000-0000-0000-0000-000000000000')
      }

      if (editing) {
        const { error } = await supabase
          .from('kepala_sekolah')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        toast.success('Data kepala sekolah berhasil diperbarui')
      } else {
        const { error } = await supabase
          .from('kepala_sekolah')
          .insert(payload)
        if (error) throw error
        toast.success('Data kepala sekolah berhasil ditambahkan')
      }

      setShowModal(false)
      fetchData()
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message)
    }
    setSaving(false)
  }

  async function handleDelete(ks: KepalaSekolah) {
    if (!confirm(`Hapus data "${ks.nama_lengkap}"?`)) return
    setDeleting(ks.id)
    const { error } = await supabase.from('kepala_sekolah').delete().eq('id', ks.id)
    if (error) { toast.error('Gagal menghapus: ' + error.message) }
    else { toast.success('Data berhasil dihapus') }
    setDeleting(null)
    fetchData()
  }

  function formatTanggal(val: string | null) {
    if (!val) return '-'
    try { return format(new Date(val), 'd MMMM yyyy', { locale: localeId }) }
    catch { return val }
  }

  const aktif = list.find(k => k.is_active)
  const nonAktif = list.filter(k => !k.is_active)

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Data Kepala Sekolah</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Kelola riwayat kepala sekolah aktif dan periode sebelumnya
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {/* Kepala Sekolah Aktif */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Kepala Sekolah Aktif
        </p>
        {aktif ? (
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-violet-50 border-primary-100">
            <div className="flex items-start gap-5">
              {/* Foto */}
              <div className="flex-shrink-0">
                {aktif.foto_url ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-card">
                    <Image
                      src={aktif.foto_url}
                      alt={aktif.nama_lengkap}
                      width={80} height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
                    <User className="w-9 h-9 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg font-display font-bold text-slate-800">
                    {aktif.gelar ? `${aktif.gelar} ${aktif.nama_lengkap}` : aktif.nama_lengkap}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Aktif
                  </span>
                </div>
                {aktif.nip && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-1">
                    <BadgeCheck className="w-4 h-4 text-slate-400" />
                    NIP: {aktif.nip}
                  </p>
                )}
                {aktif.pendidikan_terakhir && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-1">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    {aktif.pendidikan_terakhir}
                  </p>
                )}
                {(aktif.periode_mulai || aktif.periode_selesai) && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Periode: {formatTanggal(aktif.periode_mulai)}
                    {aktif.periode_selesai ? ` – ${formatTanggal(aktif.periode_selesai)}` : ' – Sekarang'}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(aktif)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(aktif)}
                  disabled={deleting === aktif.id}
                  className="btn-ghost text-rose-500 hover:bg-rose-50 text-xs px-3 py-1.5"
                >
                  {deleting === aktif.id
                    ? <div className="spinner" style={{ width: 14, height: 14 }} />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center border-dashed border-2 border-slate-200">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Belum ada kepala sekolah aktif</p>
            <button onClick={openAdd} className="btn-secondary text-sm mt-3">
              <Plus className="w-4 h-4" /> Tambahkan sekarang
            </button>
          </div>
        )}
      </div>

      {/* Riwayat */}
      {nonAktif.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Riwayat Kepala Sekolah
          </p>
          <div className="space-y-3">
            {nonAktif.map(ks => (
              <div key={ks.id} className="card p-4">
                <div className="flex items-center gap-4">
                  {ks.foto_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                      <Image
                        src={ks.foto_url}
                        alt={ks.nama_lengkap}
                        width={48} height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 text-sm">
                      {ks.gelar ? `${ks.gelar} ${ks.nama_lengkap}` : ks.nama_lengkap}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {ks.nip && (
                        <span className="text-xs text-slate-400">NIP: {ks.nip}</span>
                      )}
                      {(ks.periode_mulai || ks.periode_selesai) && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTanggal(ks.periode_mulai)}
                          {ks.periode_selesai ? ` – ${formatTanggal(ks.periode_selesai)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(ks)}
                      className="btn-icon text-slate-500"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ks)}
                      disabled={deleting === ks.id}
                      className="btn-icon text-rose-400 hover:bg-rose-50"
                      title="Hapus"
                    >
                      {deleting === ks.id
                        ? <div className="spinner" style={{ width: 14, height: 14 }} />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <div className="card p-16 text-center">
          <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Belum ada data kepala sekolah</p>
        </div>
      )}

      {/* ===================== MODAL ===================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">
                {editing ? 'Edit Kepala Sekolah' : 'Tambah Kepala Sekolah'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-icon text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">

              {/* Foto Upload */}
              <div>
                <label className="label">Foto</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
                    {fotoPreview || (editing?.foto_url) ? (
                      <Image
                        src={fotoPreview || editing!.foto_url}
                        alt="Foto"
                        width={80} height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fotoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFotoChange}
                    />
                    <button
                      onClick={() => fotoRef.current?.click()}
                      className="btn-secondary text-sm"
                    >
                      <Upload className="w-4 h-4" /> Pilih Foto
                    </button>
                    <p className="text-xs text-slate-400 mt-1.5">
                      JPG, PNG. Maks 5MB
                    </p>
                    {fotoPreview && (
                      <button
                        onClick={() => { setFotoFile(null); setFotoPreview('') }}
                        className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 mt-1"
                      >
                        <X className="w-3 h-3" /> Hapus foto baru
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nama */}
              <div>
                <label className="label">Nama Lengkap *</label>
                <input
                  className="input"
                  value={form.nama_lengkap}
                  onChange={e => setForm({ ...form, nama_lengkap: e.target.value })}
                  placeholder="Nama lengkap tanpa gelar"
                />
              </div>

              {/* Gelar */}
              <div>
                <label className="label">Gelar</label>
                <input
                  className="input"
                  value={form.gelar}
                  onChange={e => setForm({ ...form, gelar: e.target.value })}
                  placeholder="Contoh: Drs., M.Pd."
                />
              </div>

              {/* NIP */}
              <div>
                <label className="label">NIP</label>
                <input
                  className="input"
                  value={form.nip}
                  onChange={e => setForm({ ...form, nip: e.target.value })}
                  placeholder="Nomor Induk Pegawai"
                />
              </div>

              {/* Tempat & Tanggal Lahir */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tempat Lahir</label>
                  <input
                    className="input"
                    value={form.tempat_lahir}
                    onChange={e => setForm({ ...form, tempat_lahir: e.target.value })}
                    placeholder="Kota"
                  />
                </div>
                <div>
                  <label className="label">Tanggal Lahir</label>
                  <input
                    type="date"
                    className="input"
                    value={form.tanggal_lahir}
                    onChange={e => setForm({ ...form, tanggal_lahir: e.target.value })}
                  />
                </div>
              </div>

              {/* Pendidikan */}
              <div>
                <label className="label">Pendidikan Terakhir</label>
                <select
                  className="input"
                  value={form.pendidikan_terakhir}
                  onChange={e => setForm({ ...form, pendidikan_terakhir: e.target.value })}
                >
                  <option value="">-- Pilih --</option>
                  <option>S1</option>
                  <option>S2</option>
                  <option>S3</option>
                  <option>D4</option>
                  <option>D3</option>
                </select>
              </div>

              {/* Periode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Periode Mulai</label>
                  <input
                    type="date"
                    className="input"
                    value={form.periode_mulai}
                    onChange={e => setForm({ ...form, periode_mulai: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Periode Selesai</label>
                  <input
                    type="date"
                    className="input"
                    value={form.periode_selesai}
                    onChange={e => setForm({ ...form, periode_selesai: e.target.value })}
                    placeholder="Kosongkan jika masih aktif"
                  />
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  id="is_active"
                  className="w-4 h-4 accent-primary-600 cursor-pointer"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Jadikan sebagai Kepala Sekolah aktif saat ini
                </label>
              </div>
              {form.is_active && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  ⚠️ Data kepala sekolah lain yang aktif akan otomatis dinonaktifkan.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? <div className="spinner" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
