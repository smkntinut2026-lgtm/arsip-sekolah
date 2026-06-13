'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../context'
import {
  Plus, Trash2, Edit3, Upload, Download, Eye, X, Save,
  Folder, FolderOpen, Lock, Unlock, KeyRound, FolderArchive,
  ChevronRight, ChevronDown, FileText, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { FolderArsip, DokumenFolder } from '@/types'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(fileType: string) {
  if (fileType?.includes('pdf')) return '📄'
  if (fileType?.includes('image')) return '🖼️'
  if (fileType?.includes('word') || fileType?.includes('document')) return '📝'
  if (fileType?.includes('sheet') || fileType?.includes('excel')) return '📊'
  if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return '📑'
  return '📁'
}

export default function FolderArsipPage() {
  const supabase = createClient()
  const { user } = useApp()
  const isAdmin = user?.role === 'admin'

  const [folders, setFolders] = useState<FolderArsip[]>([])
  const [loading, setLoading] = useState(true)
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  // Modal: Buat Folder
  const [showBuatFolder, setShowBuatFolder] = useState(false)
  const [folderNama, setFolderNama] = useState('')
  const [folderDeskripsi, setFolderDeskripsi] = useState('')
  const [folderPakaiFsandi, setFolderPakaiSandi] = useState(false)
  const [folderSandi, setFolderSandi] = useState('')
  const [folderKonfirmasiSandi, setFolderKonfirmasiSandi] = useState('')
  const [savingFolder, setSavingFolder] = useState(false)

  // Modal: Edit Folder
  const [showEditFolder, setShowEditFolder] = useState(false)
  const [editFolder, setEditFolder] = useState<FolderArsip | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [editPakaiSandi, setEditPakaiSandi] = useState(false)
  const [editSandi, setEditSandi] = useState('')
  const [editKonfirmasiSandi, setEditKonfirmasiSandi] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Modal: Upload Dokumen ke Folder
  const [showUploadDokumen, setShowUploadDokumen] = useState(false)
  const [uploadTargetFolder, setUploadTargetFolder] = useState<FolderArsip | null>(null)
  const [uploadNama, setUploadNama] = useState('')
  const [uploadDeskripsi, setUploadDeskripsi] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('folder_arsip')
      .select('*, pengguna(nama_lengkap), dokumen_folder(*, pengguna(nama_lengkap))')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Gagal memuat folder: ' + error.message)
    } else {
      setFolders(data || [])
    }
    setLoading(false)
  }

  function toggleFolder(id: string) {
    setOpenFolders(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  // ── Buat Folder ────────────────────────────────────────────
  function resetFormBuatFolder() {
    setFolderNama('')
    setFolderDeskripsi('')
    setFolderPakaiSandi(false)
    setFolderSandi('')
    setFolderKonfirmasiSandi('')
  }

  async function handleBuatFolder() {
    if (!folderNama.trim()) { toast.error('Nama folder wajib diisi'); return }
    if (folderPakaiFsandi) {
      if (!folderSandi) { toast.error('Sandi wajib diisi'); return }
      if (folderSandi.length < 4) { toast.error('Sandi minimal 4 karakter'); return }
      if (folderSandi !== folderKonfirmasiSandi) { toast.error('Sandi dan konfirmasi sandi tidak cocok'); return }
    }
    setSavingFolder(true)
    const { error } = await supabase.from('folder_arsip').insert({
      nama: folderNama.trim(),
      deskripsi: folderDeskripsi.trim(),
      has_password: folderPakaiFsandi,
      password: folderPakaiFsandi ? folderSandi : null,
      created_by: user?.id || null,
    })
    if (error) {
      toast.error('Gagal membuat folder: ' + error.message)
    } else {
      toast.success('Folder berhasil dibuat!')
      setShowBuatFolder(false)
      resetFormBuatFolder()
      fetchData()
    }
    setSavingFolder(false)
  }

  // ── Edit Folder ────────────────────────────────────────────
  function openEditFolder(f: FolderArsip) {
    setEditFolder(f)
    setEditNama(f.nama)
    setEditDeskripsi(f.deskripsi || '')
    setEditPakaiSandi(f.has_password)
    setEditSandi('')
    setEditKonfirmasiSandi('')
    setShowEditFolder(true)
  }

  async function handleSaveEditFolder() {
    if (!editFolder) return
    if (!editNama.trim()) { toast.error('Nama folder wajib diisi'); return }
    if (editPakaiSandi) {
      // Kalau ada isian sandi baru, validasi
      if (editSandi) {
        if (editSandi.length < 4) { toast.error('Sandi minimal 4 karakter'); return }
        if (editSandi !== editKonfirmasiSandi) { toast.error('Sandi tidak cocok'); return }
      }
      // Kalau tidak ada isian sandi baru, pertahankan sandi lama
    }
    setSavingEdit(true)
    const updatePayload: any = {
      nama: editNama.trim(),
      deskripsi: editDeskripsi.trim(),
      has_password: editPakaiSandi,
    }
    if (!editPakaiSandi) {
      updatePayload.password = null
    } else if (editSandi) {
      updatePayload.password = editSandi
    }
    // Kalau editPakaiSandi=true tapi editSandi kosong: password lama tetap (tidak di-update)

    const { error } = await supabase.from('folder_arsip').update(updatePayload).eq('id', editFolder.id)
    if (error) {
      toast.error('Gagal menyimpan: ' + error.message)
    } else {
      toast.success('Folder berhasil diperbarui')
      setShowEditFolder(false)
      fetchData()
    }
    setSavingEdit(false)
  }

  // ── Hapus Folder ───────────────────────────────────────────
  async function handleHapusFolder(f: FolderArsip) {
    if (!confirm(`Hapus folder "${f.nama}" dan semua dokumen di dalamnya? Tindakan ini tidak dapat dibatalkan.`)) return
    // Hapus semua file di storage
    const docs = f.dokumen_folder || []
    for (const doc of docs) {
      const path = doc.file_url.split('/dokumen-folder/')[1]
      if (path) await supabase.storage.from('dokumen-folder').remove([path])
    }
    await supabase.from('folder_arsip').delete().eq('id', f.id)
    toast.success('Folder berhasil dihapus')
    fetchData()
  }

  // ── Upload Dokumen ke Folder ───────────────────────────────
  function openUploadDokumen(f: FolderArsip) {
    setUploadTargetFolder(f)
    setUploadNama('')
    setUploadDeskripsi('')
    setUploadFile(null)
    setShowUploadDokumen(true)
  }

  async function handleUploadDokumen() {
    if (!uploadFile) { toast.error('Pilih file terlebih dahulu'); return }
    if (!uploadNama.trim()) { toast.error('Nama dokumen wajib diisi'); return }
    if (!uploadTargetFolder) return

    setUploading(true)
    try {
      const ext = uploadFile.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('dokumen-folder').upload(path, uploadFile)
      if (storageErr) throw storageErr

      const { data: urlData } = supabase.storage.from('dokumen-folder').getPublicUrl(path)

      const { error: dbErr } = await supabase.from('dokumen_folder').insert({
        folder_id: uploadTargetFolder.id,
        nama_file: uploadNama.trim(),
        deskripsi: uploadDeskripsi.trim(),
        file_url: urlData.publicUrl,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        uploaded_by: user?.id || null,
      })
      if (dbErr) throw dbErr

      toast.success('Dokumen berhasil diupload!')
      setShowUploadDokumen(false)
      fetchData()
    } catch (err: any) {
      toast.error('Gagal upload: ' + err.message)
    }
    setUploading(false)
  }

  // ── Hapus Dokumen ──────────────────────────────────────────
  async function handleHapusDokumen(doc: DokumenFolder) {
    if (!confirm('Hapus dokumen ini?')) return
    const path = doc.file_url.split('/dokumen-folder/')[1]
    if (path) await supabase.storage.from('dokumen-folder').remove([path])
    await supabase.from('dokumen_folder').delete().eq('id', doc.id)
    toast.success('Dokumen berhasil dihapus')
    fetchData()
  }

  // ── Download ───────────────────────────────────────────────
  async function handleDownload(fileUrl: string, namaFile: string) {
    try {
      const res = await fetch(fileUrl)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = namaFile
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error('Gagal mendownload: ' + err.message)
    }
  }

  const filteredFolders = folders.filter(f =>
    f.nama.toLowerCase().includes(search.toLowerCase()) ||
    f.deskripsi?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Folder Arsip</h1>
          <p className="text-slate-500 text-sm mt-0.5">{folders.length} folder tersimpan</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetFormBuatFolder(); setShowBuatFolder(true) }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Buat Folder
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari nama folder..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Daftar Folder */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="spinner spinner-dark mx-auto mb-3" style={{ width: 32, height: 32 }} />
          <p className="text-slate-400">Memuat folder...</p>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderArchive className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Belum ada folder</p>
          <p className="text-slate-300 text-sm mt-1">Klik "Buat Folder" untuk memulai</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFolders.map(folder => {
            const isOpen = openFolders.has(folder.id)
            const dokumenList = folder.dokumen_folder || []
            return (
              <div key={folder.id} className="card overflow-hidden">
                {/* Header Folder */}
                <div
                  className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                  {isOpen
                    ? <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" />
                    : <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{folder.nama}</p>
                      {folder.has_password && (
                        <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          <Lock className="w-3 h-3" /> Bersandi
                        </span>
                      )}
                    </div>
                    {folder.deskripsi && (
                      <p className="text-sm text-slate-500 truncate">{folder.deskripsi}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {dokumenList.length} dokumen ·{' '}
                      {format(new Date(folder.created_at), 'dd MMM yyyy', { locale: localeId })}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openUploadDokumen(folder)}
                        className="btn-icon text-primary-500"
                        title="Upload Dokumen"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditFolder(folder)}
                        className="btn-icon"
                        title="Edit Folder"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleHapusFolder(folder)}
                        className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus Folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Isi Folder */}
                {isOpen && (
                  <div className="border-t border-slate-100">
                    {dokumenList.length === 0 ? (
                      <div className="px-5 py-6 text-center text-slate-400 text-sm">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                        Folder ini masih kosong
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {dokumenList.map(doc => (
                          <div key={doc.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                            <span className="text-xl shrink-0">{getFileIcon(doc.file_type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm">{doc.nama_file}</p>
                              {doc.deskripsi && (
                                <p className="text-xs text-slate-400 truncate">{doc.deskripsi}</p>
                              )}
                              <p className="text-xs text-slate-400">
                                {formatBytes(doc.file_size)} ·{' '}
                                {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: localeId })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-icon"
                                title="Lihat"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleDownload(doc.file_url, doc.nama_file)}
                                className="btn-icon"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleHapusDokumen(doc)}
                                  className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Buat Folder ── */}
      {showBuatFolder && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBuatFolder(false) }}>
          <div className="modal-content max-w-md">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">Buat Folder Baru</h2>
              <button onClick={() => setShowBuatFolder(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nama Folder *</label>
                <input className="input" placeholder="Contoh: Dokumen Rapat 2024" value={folderNama} onChange={e => setFolderNama(e.target.value)} />
              </div>
              <div>
                <label className="label">Deskripsi (opsional)</label>
                <textarea className="input resize-none" rows={2} placeholder="Keterangan singkat" value={folderDeskripsi} onChange={e => setFolderDeskripsi(e.target.value)} />
              </div>

              {/* Toggle sandi */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setFolderPakaiSandi(v => !v)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${folderPakaiFsandi ? 'bg-primary-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${folderPakaiFsandi ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    {folderPakaiFsandi ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                    {folderPakaiFsandi ? 'Folder bersandi (diaktifkan)' : 'Folder tanpa sandi'}
                  </span>
                </label>

                {folderPakaiFsandi && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="label">Sandi *</label>
                      <input
                        type="password"
                        className="input"
                        placeholder="Minimal 4 karakter"
                        value={folderSandi}
                        onChange={e => setFolderSandi(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Konfirmasi Sandi *</label>
                      <input
                        type="password"
                        className="input"
                        placeholder="Ulangi sandi"
                        value={folderKonfirmasiSandi}
                        onChange={e => setFolderKonfirmasiSandi(e.target.value)}
                      />
                      {folderKonfirmasiSandi && folderSandi !== folderKonfirmasiSandi && (
                        <p className="text-xs text-rose-500 mt-1">Sandi tidak cocok</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowBuatFolder(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleBuatFolder} disabled={savingFolder} className="btn-primary flex-1">
                  {savingFolder ? <div className="spinner" /> : <Plus className="w-4 h-4" />}
                  Buat Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Folder ── */}
      {showEditFolder && editFolder && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditFolder(false) }}>
          <div className="modal-content max-w-md">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">Edit Folder</h2>
              <button onClick={() => setShowEditFolder(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nama Folder *</label>
                <input className="input" value={editNama} onChange={e => setEditNama(e.target.value)} />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input resize-none" rows={2} value={editDeskripsi} onChange={e => setEditDeskripsi(e.target.value)} />
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setEditPakaiSandi(v => !v)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${editPakaiSandi ? 'bg-primary-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${editPakaiSandi ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    {editPakaiSandi ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                    {editPakaiSandi ? 'Folder bersandi' : 'Tanpa sandi'}
                  </span>
                </label>
                {editPakaiSandi && (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-slate-500">Kosongkan jika tidak ingin mengubah sandi</p>
                    <div>
                      <label className="label">Sandi Baru</label>
                      <input type="password" className="input" placeholder="Kosongkan = tidak berubah" value={editSandi} onChange={e => setEditSandi(e.target.value)} />
                    </div>
                    {editSandi && (
                      <div>
                        <label className="label">Konfirmasi Sandi Baru</label>
                        <input type="password" className="input" placeholder="Ulangi sandi baru" value={editKonfirmasiSandi} onChange={e => setEditKonfirmasiSandi(e.target.value)} />
                        {editKonfirmasiSandi && editSandi !== editKonfirmasiSandi && (
                          <p className="text-xs text-rose-500 mt-1">Sandi tidak cocok</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowEditFolder(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleSaveEditFolder} disabled={savingEdit} className="btn-primary flex-1">
                  {savingEdit ? <div className="spinner" /> : <Save className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Upload Dokumen ke Folder ── */}
      {showUploadDokumen && uploadTargetFolder && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowUploadDokumen(false) }}>
          <div className="modal-content max-w-lg">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="font-display font-bold text-lg">Upload Dokumen</h2>
                <p className="text-white/70 text-sm flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" /> {uploadTargetFolder.nama}
                </p>
              </div>
              <button onClick={() => setShowUploadDokumen(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nama Dokumen *</label>
                <input className="input" placeholder="Contoh: Notulen Rapat Maret 2024" value={uploadNama} onChange={e => setUploadNama(e.target.value)} />
              </div>
              <div>
                <label className="label">Deskripsi (opsional)</label>
                <textarea className="input resize-none" rows={2} placeholder="Keterangan singkat" value={uploadDeskripsi} onChange={e => setUploadDeskripsi(e.target.value)} />
              </div>
              <div>
                <label className="label">File *</label>
                <div
                  className={`drop-zone ${dragOver ? 'drag-over' : ''} cursor-pointer`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragOver(false)
                    const f = e.dataTransfer.files[0]
                    if (f) { setUploadFile(f); if (!uploadNama) setUploadNama(f.name.replace(/\.[^.]+$/, '')) }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setUploadFile(f); if (!uploadNama) setUploadNama(f.name.replace(/\.[^.]+$/, '')) }
                  }} />
                  {uploadFile ? (
                    <div className="text-center">
                      <div className="text-3xl mb-2">{getFileIcon(uploadFile.type)}</div>
                      <p className="font-medium text-slate-700 text-sm">{uploadFile.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatBytes(uploadFile.size)}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Klik atau seret file ke sini</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, Gambar (max 50MB)</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowUploadDokumen(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleUploadDokumen} disabled={uploading || !uploadFile} className="btn-primary flex-1">
                  {uploading ? <div className="spinner" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Mengupload...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
