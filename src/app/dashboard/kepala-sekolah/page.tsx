'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../context'
import { useRouter } from 'next/navigation'
import {
  Plus, Edit3, Trash2, Save, X, Upload, User,
  CheckCircle2, Clock, Calendar, GraduationCap, BadgeCheck,
  FileText, Download, Paperclip, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { KepalaSekolah, JenisFile } from '@/types'

interface FileKepalaSekolah {
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

interface KepalaSekolahWithFiles extends KepalaSekolah {
  file_kepala_sekolah?: FileKepalaSekolah[]
}

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

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatNama(ks: KepalaSekolah) {
  if (!ks.gelar) return ks.nama_lengkap
  return `${ks.nama_lengkap}, ${ks.gelar}`
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return '📄'
  if (fileType.includes('image')) return '🖼️'
  if (fileType.includes('word') || fileType.includes('document')) return '📝'
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
  return '📁'
}

export default function KepalaSekolahPage() {
  const supabase = createClient()
  const { user } = useApp()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  const [list, setList] = useState<KepalaSekolahWithFiles[]>([])
  const [jenisFileList, setJenisFileList] = useState<JenisFile[]>([])
  const [loading, setLoading] = useState(true)

  // Modal tambah/edit
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<KepalaSekolahWithFiles | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form data
  const [form, setForm] = useState(EMPTY_FORM)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const fotoRef = useRef<HTMLInputElement>(null)

  // Inline upload state (per KS id)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadNamaFile, setUploadNamaFile] = useState('')
  const [uploadJenisId, setUploadJenisId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Expand/collapse riwayat
  const [expandedRiwayat, setExpandedRiwayat] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/dashboard'); return }
    fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)
    const [ksRes, jenisRes] = await Promise.all([
      supabase
        .from('kepala_sekolah')
        .select('*, file_kepala_sekolah(*, jenis_file(*))')
        .order('is_active', { ascending: false })
        .order('periode_mulai', { ascending: false }),
      supabase
        .from('jenis_file')
        .select('*')
        .eq('kategori', 'kepala_sekolah')
        .order('urutan'),
    ])
    setList(ksRes.data || [])
    setJenisFileList(jenisRes.data || [])
    setLoading(false)
  }

  async function refreshKS(id: string) {
    const { data } = await supabase
      .from('kepala_sekolah')
      .select('*, file_kepala_sekolah(*, jenis_file(*))')
      .eq('id', id)
      .single()
    if (data) {
      setList(prev => prev.map(k => k.id === id ? data : k))
    }
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFotoFile(null)
    setFotoPreview('')
    setShowModal(true)
  }

  function openEdit(ks: KepalaSekolahWithFiles) {
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

      if (form.is_active) {
        await supabase
          .from('kepala_sekolah')
          .update({ is_active: false })
          .neq('id', editing?.id ?? '00000000-0000-0000-0000-000000000000')
      }

      if (editing) {
        const { error } = await supabase.from('kepala_sekolah').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Data kepala sekolah berhasil diperbarui')
      } else {
        const { error } = await supabase.from('kepala_sekolah').insert(payload)
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

  async function handleDelete(ks: KepalaSekolahWithFiles) {
    if (!confirm(`Hapus data "${ks.nama_lengkap}" beserta semua filenya?`)) return
    setDeleting(ks.id)
    const { error } = await supabase.from('kepala_sekolah').delete().eq('id', ks.id)
    if (error) toast.error('Gagal menghapus: ' + error.message)
    else toast.success('Data berhasil dihapus')
    setDeleting(null)
    fetchData()
  }

  function openUploadFor(ksId: string) {
    setUploadingFor(ksId)
    setUploadFile(null)
    setUploadNamaFile('')
    setUploadJenisId('')
  }

  async function handleUploadFile(ksId: string) {
    if (!uploadFile || !uploadNamaFile.trim()) {
      toast.error('Nama file dan file harus diisi'); return
    }
    setUploading(true)
    try {
      const ext = uploadFile.name.split('.').pop()
      const path = `${ksId}/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('file-kepala-sekolah').upload(path, uploadFile)
      if (storageErr) throw storageErr

      const { data: urlData } = supabase.storage
        .from('file-kepala-sekolah').getPublicUrl(path)

      await supabase.from('file_kepala_sekolah').insert({
        kepala_sekolah_id: ksId,
        jenis_file_id: uploadJenisId || null,
        nama_file: uploadNamaFile.trim(),
        file_url: urlData.publicUrl,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        uploaded_by: user?.id,
      })

      toast.success('File berhasil diupload')
      setUploadingFor(null)
      setUploadFile(null)
      setUploadNamaFile('')
      setUploadJenisId('')
      refreshKS(ksId)
    } catch (err: any) {
      toast.error('Gagal upload: ' + err.message)
    }
    setUploading(false)
  }

  async function handleDeleteFile(file: FileKepalaSekolah) {
    if (!confirm('Hapus file ini?')) return
    const path = file.file_url.split('/file-kepala-sekolah/')[1]
    if (path) await supabase.storage.from('file-kepala-sekolah').remove([path])
    await supabase.from('file_kepala_sekolah').delete().eq('id', file.id)
    toast.success('File dihapus')
    refreshKS(file.kepala_sekolah_id)
  }

  async function handleDownload(fileUrl: string, namaFile: string) {
    try {
      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error('Gagal mengambil file')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = namaFile
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error('Gagal mendownload: ' + err.message)
    }
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

  // ---- Sub-component: Tabel File ----
  function FilesSection({ ks }: { ks: KepalaSekolahWithFiles }) {
    const files = ks.file_kepala_sekolah || []
    const isOpen = uploadingFor === ks.id

    return (
      <div className="border-t border-slate-100 mt-4 pt-4">
        {/* Header section file */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            File Tersimpan ({files.length})
          </p>
          {isAdmin && !isOpen && (
            <button
              onClick={() => openUploadFor(ks.id)}
              className="btn-secondary text-xs px-2.5 py-1"
            >
              <Upload className="w-3 h-3" /> Upload File
            </button>
          )}
        </div>

        {/* Form Upload Inline */}
        {isAdmin && isOpen && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Upload File Baru
              </p>
              <button
                onClick={() => setUploadingFor(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="label">Nama File *</label>
              <input
                className="input"
                placeholder="Nama deskriptif untuk file ini"
                value={uploadNamaFile}
                onChange={e => setUploadNamaFile(e.target.value)}
              />
            </div>
            {jenisFileList.length > 0 && (
              <div>
                <label className="label">Jenis File</label>
                <select
                  className="input"
                  value={uploadJenisId}
                  onChange={e => setUploadJenisId(e.target.value)}
                >
                  <option value="">— Pilih Jenis File (opsional) —</option>
                  {jenisFileList.map(j => (
                    <option key={j.id} value={j.id}>{j.nama}{j.wajib ? ' *' : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''} cursor-pointer`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) {
                  setUploadFile(f)
                  if (!uploadNamaFile) setUploadNamaFile(f.name.replace(/\.[^.]+$/, ''))
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setUploadFile(f)
                    if (!uploadNamaFile) setUploadNamaFile(f.name.replace(/\.[^.]+$/, ''))
                  }
                }}
              />
              {uploadFile ? (
                <div className="text-center">
                  <div className="text-2xl mb-1">{getFileIcon(uploadFile.type)}</div>
                  <p className="font-medium text-slate-700 text-sm">{uploadFile.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(uploadFile.size)}</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-slate-500 text-sm">Klik atau seret file ke sini</p>
                  <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG, DOCX (maks 50MB)</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUploadingFor(null)}
                className="btn-secondary flex-1 text-sm"
              >
                Batal
              </button>
              <button
                onClick={() => handleUploadFile(ks.id)}
                disabled={uploading || !uploadFile}
                className="btn-primary flex-1 text-sm"
              >
                {uploading ? <div className="spinner" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Mengupload...' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {/* Tabel file */}
        {files.length === 0 ? (
          <div className="text-center py-5 text-slate-400 bg-slate-50 rounded-xl text-sm">
            Belum ada file yang diupload
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-semibold">Nama File</th>
                  <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">Jenis</th>
                  <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">Ukuran</th>
                  <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell">Tanggal</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file: FileKepalaSekolah) => (
                  <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{getFileIcon(file.file_type)}</span>
                        <span className="font-medium text-slate-700 truncate max-w-[160px]">
                          {file.nama_file}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {file.jenis_file?.nama ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {formatBytes(file.file_size)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {format(new Date(file.created_at), 'dd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleDownload(file.file_url, file.nama_file)}
                          className="btn-icon"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteFile(file)}
                            className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

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
        {isAdmin && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      {/* Kepala Sekolah Aktif */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Kepala Sekolah Aktif
        </p>
        {aktif ? (
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-violet-50 border-primary-100">
            {/* Profil baris atas */}
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0">
                {aktif.foto_url ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-card">
                    <Image
                      src={aktif.foto_url} alt={aktif.nama_lengkap}
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

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg font-display font-bold text-slate-800">
                    {formatNama(aktif)}
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

              {/* Tombol edit & hapus saja — tidak ada Kelola File */}
              {isAdmin && (
                <div className="flex flex-col gap-2 flex-shrink-0">
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
              )}
            </div>

            {/* Tabel file langsung di bawah profil */}
            <FilesSection ks={aktif} />
          </div>
        ) : (
          <div className="card p-8 text-center border-dashed border-2 border-slate-200">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Belum ada kepala sekolah aktif</p>
            {isAdmin && (
              <button onClick={openAdd} className="btn-secondary text-sm mt-3">
                <Plus className="w-4 h-4" /> Tambahkan sekarang
              </button>
            )}
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
            {nonAktif.map(ks => {
              const isExpanded = expandedRiwayat.has(ks.id)
              return (
                <div key={ks.id} className="card p-4">
                  <div className="flex items-center gap-4">
                    {ks.foto_url ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                        <Image
                          src={ks.foto_url} alt={ks.nama_lengkap}
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
                      <p className="font-semibold text-slate-700 text-sm">{formatNama(ks)}</p>
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
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {(ks.file_kepala_sekolah || []).length} file
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 items-center">
                      <button
                        onClick={() => setExpandedRiwayat(prev => {
                          const n = new Set(prev)
                          n.has(ks.id) ? n.delete(ks.id) : n.add(ks.id)
                          return n
                        })}
                        className="btn-icon text-primary-500"
                        title={isExpanded ? 'Sembunyikan file' : 'Lihat file'}
                      >
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {isAdmin && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expand file section */}
                  {isExpanded && <FilesSection ks={ks} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <div className="card p-16 text-center">
          <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Belum ada data kepala sekolah</p>
        </div>
      )}

      {/* ==================== MODAL TAMBAH/EDIT ==================== */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="modal-content">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="font-display font-bold text-lg">
                  {editing ? 'Edit Kepala Sekolah' : 'Tambah Kepala Sekolah'}
                </h3>
                <p className="text-white/70 text-sm">Lengkapi data di bawah ini</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Foto */}
              <div>
                <label className="label">Foto</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
                    {fotoPreview || editing?.foto_url ? (
                      <Image
                        src={fotoPreview || editing!.foto_url}
                        alt="Foto" width={80} height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                    <button onClick={() => fotoRef.current?.click()} className="btn-secondary text-sm">
                      <Upload className="w-4 h-4" /> Pilih Foto
                    </button>
                    <p className="text-xs text-slate-400 mt-1.5">JPG, PNG. Maks 5MB</p>
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

              <div>
                <label className="label">Nama Lengkap * <span className="text-slate-400 font-normal">(tanpa gelar)</span></label>
                <input
                  className="input"
                  value={form.nama_lengkap}
                  onChange={e => setForm({ ...form, nama_lengkap: e.target.value })}
                  placeholder="Contoh: Ahmad Fauzi"
                />
              </div>
              <div>
                <label className="label">Gelar <span className="text-slate-400 font-normal">(akan tampil setelah nama)</span></label>
                <input
                  className="input"
                  value={form.gelar}
                  onChange={e => setForm({ ...form, gelar: e.target.value })}
                  placeholder="Contoh: S.Pd., M.M."
                />
                {form.nama_lengkap && (
                  <p className="text-xs text-slate-400 mt-1">
                    Preview: <span className="font-medium text-slate-600">
                      {form.nama_lengkap}{form.gelar ? `, ${form.gelar}` : ''}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="label">NIP</label>
                <input
                  className="input"
                  value={form.nip}
                  onChange={e => setForm({ ...form, nip: e.target.value })}
                  placeholder="Nomor Induk Pegawai"
                />
              </div>
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
                  <input type="date" className="input"
                    value={form.tanggal_lahir}
                    onChange={e => setForm({ ...form, tanggal_lahir: e.target.value })}
                  />
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Periode Mulai</label>
                  <input type="date" className="input"
                    value={form.periode_mulai}
                    onChange={e => setForm({ ...form, periode_mulai: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Periode Selesai</label>
                  <input type="date" className="input"
                    value={form.periode_selesai}
                    onChange={e => setForm({ ...form, periode_selesai: e.target.value })}
                  />
                </div>
              </div>
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
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Kepala sekolah lain yang aktif akan otomatis dinonaktifkan.
                </p>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
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
