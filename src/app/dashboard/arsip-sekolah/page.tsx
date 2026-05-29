'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../context'
import {
  Plus, Search, Upload, Download, Trash2, Edit3, Eye,
  FileText, X, FolderOpen, CheckSquare, Square, AlertCircle,
  FolderArchive, Save, Link2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

// Kategori default untuk arsip sekolah
const KATEGORI_DEFAULT = [
  'Akreditasi',
  'Izin Operasional',
  'Kurikulum',
  'Keuangan',
  'Sarana Prasarana',
  'Surat Menyurat',
  'Lainnya',
]

interface ArsipSekolah {
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

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return '📄'
  if (fileType.includes('image')) return '🖼️'
  if (fileType.includes('word') || fileType.includes('document')) return '📝'
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📑'
  return '📁'
}

export default function ArsipSekolahPage() {
  const supabase = createClient()
  const { user } = useApp()
  const isAdmin = user?.role === 'admin'

  const [arsipList, setArsipList] = useState<ArsipSekolah[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('semua')

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ArsipSekolah | null>(null)

  // Upload form
  const [uploadNama, setUploadNama] = useState('')
  const [uploadKategori, setUploadKategori] = useState(KATEGORI_DEFAULT[0])
  const [uploadKategoriCustom, setUploadKategoriCustom] = useState('')
  const [uploadDeskripsi, setUploadDeskripsi] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit form
  const [editNama, setEditNama] = useState('')
  const [editKategori, setEditKategori] = useState('')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [saving, setSaving] = useState(false)

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('arsip_sekolah')
      .select('*, pengguna(nama_lengkap)')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Gagal memuat data: ' + error.message)
    } else {
      setArsipList(data || [])
    }
    setLoading(false)
  }

  // Get all unique categories from data + defaults
  const allKategori = Array.from(new Set([
    ...KATEGORI_DEFAULT,
    ...arsipList.map(a => a.kategori)
  ])).filter(Boolean)

  const filtered = arsipList
    .filter(a =>
      (filterKategori === 'semua' || a.kategori === filterKategori) &&
      (a.nama_file.toLowerCase().includes(search.toLowerCase()) ||
       a.kategori.toLowerCase().includes(search.toLowerCase()) ||
       a.deskripsi?.toLowerCase().includes(search.toLowerCase()))
    )

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Hapus ${selected.size} file yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) return

    const ids = Array.from(selected)
    const toDelete = arsipList.filter(a => ids.includes(a.id))

    for (const file of toDelete) {
      const path = file.file_url.split('/arsip-sekolah/')[1]
      if (path) await supabase.storage.from('arsip-sekolah').remove([path])
    }
    await supabase.from('arsip_sekolah').delete().in('id', ids)
    toast.success(`${ids.length} file berhasil dihapus`)
    setSelected(new Set())
    fetchData()
  }

  async function handleUpload() {
    if (!uploadFile) { toast.error('Pilih file terlebih dahulu'); return }
    if (!uploadNama.trim()) { toast.error('Nama file wajib diisi'); return }

    const kategori = uploadKategori === '__custom__' ? uploadKategoriCustom.trim() : uploadKategori
    if (!kategori) { toast.error('Kategori wajib diisi'); return }

    setUploading(true)
    try {
      const ext = uploadFile.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('arsip-sekolah').upload(path, uploadFile)
      if (storageErr) throw storageErr

      const { data: urlData } = supabase.storage.from('arsip-sekolah').getPublicUrl(path)

      const { error: dbErr } = await supabase.from('arsip_sekolah').insert({
        nama_file: uploadNama.trim(),
        kategori,
        deskripsi: uploadDeskripsi.trim(),
        file_url: urlData.publicUrl,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        uploaded_by: user?.id || null,
      })
      if (dbErr) throw dbErr

      toast.success('File berhasil diupload!')
      setShowUploadModal(false)
      resetUploadForm()
      fetchData()
    } catch (err: any) {
      toast.error('Gagal upload: ' + err.message)
    }
    setUploading(false)
  }

  function resetUploadForm() {
    setUploadNama('')
    setUploadKategori(KATEGORI_DEFAULT[0])
    setUploadKategoriCustom('')
    setUploadDeskripsi('')
    setUploadFile(null)
  }

  async function handleDelete(arsip: ArsipSekolah) {
    if (!confirm('Hapus file ini? Tindakan tidak dapat dibatalkan.')) return
    const path = arsip.file_url.split('/arsip-sekolah/')[1]
    if (path) await supabase.storage.from('arsip-sekolah').remove([path])
    await supabase.from('arsip_sekolah').delete().eq('id', arsip.id)
    toast.success('File berhasil dihapus')
    fetchData()
  }

  async function handleSaveEdit() {
    if (!selectedFile) return
    if (!editNama.trim()) { toast.error('Nama file wajib diisi'); return }
    setSaving(true)
    const { error } = await supabase.from('arsip_sekolah').update({
      nama_file: editNama.trim(),
      kategori: editKategori,
      deskripsi: editDeskripsi.trim(),
    }).eq('id', selectedFile.id)
    if (error) {
      toast.error('Gagal menyimpan: ' + error.message)
    } else {
      toast.success('File berhasil diperbarui')
      setShowEditModal(false)
      fetchData()
    }
    setSaving(false)
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

  function openEdit(arsip: ArsipSekolah) {
    setSelectedFile(arsip)
    setEditNama(arsip.nama_file)
    setEditKategori(arsip.kategori)
    setEditDeskripsi(arsip.deskripsi || '')
    setShowEditModal(true)
  }

  // Group by kategori for display
  const byKategori: Record<string, ArsipSekolah[]> = {}
  filtered.forEach(a => {
    if (!byKategori[a.kategori]) byKategori[a.kategori] = []
    byKategori[a.kategori].push(a)
  })

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Arsip Sekolah</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {arsipList.length} file tersimpan
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn-secondary text-sm text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Trash2 className="w-4 h-4" /> Hapus {selected.size} Terpilih
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => { resetUploadForm(); setShowUploadModal(true) }}
              className="btn-primary text-sm"
            >
              <Upload className="w-4 h-4" /> Upload File
            </button>
          )}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Cari nama file, kategori, atau deskripsi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={filterKategori}
            onChange={e => setFilterKategori(e.target.value)}
          >
            <option value="semua">Semua Kategori</option>
            {allKategori.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="spinner spinner-dark mx-auto mb-3" style={{ width: 32, height: 32 }} />
          <p className="text-slate-400">Memuat data...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderArchive className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Belum ada file arsip</p>
          <p className="text-slate-300 text-sm mt-1">
            {search || filterKategori !== 'semua'
              ? 'Coba ubah filter pencarian'
              : 'Klik "Upload File" untuk menambahkan file baru'}
          </p>
        </div>
      ) : filterKategori !== 'semua' ? (
        // Flat list when filtered by kategori
        <div className="card overflow-hidden">
          <FileTable
            files={filtered}
            isAdmin={isAdmin}
            selected={selected}
            onToggle={toggleSelect}
            onSelectAll={(ids) => {
              const allChecked = ids.every(id => selected.has(id))
              if (allChecked) setSelected(new Set())
              else setSelected(new Set(ids))
            }}
            onView={(f) => { setSelectedFile(f); setShowViewModal(true) }}
            onEdit={openEdit}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        </div>
      ) : (
        // Grouped by kategori
        <div className="space-y-4">
          {Object.entries(byKategori).map(([kat, files]) => (
            <div key={kat} className="card overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary-500" />
                <h3 className="font-semibold text-slate-700 text-sm">{kat}</h3>
                <span className="ml-auto badge-blue">{files.length} file</span>
              </div>
              <FileTable
                files={files}
                isAdmin={isAdmin}
                selected={selected}
                onToggle={toggleSelect}
                onSelectAll={(ids) => {
                  const allChecked = ids.every(id => selected.has(id))
                  if (allChecked) {
                    const n = new Set(selected)
                    ids.forEach(id => n.delete(id))
                    setSelected(n)
                  } else {
                    const n = new Set(selected)
                    ids.forEach(id => n.add(id))
                    setSelected(n)
                  }
                }}
                onView={(f) => { setSelectedFile(f); setShowViewModal(true) }}
                onEdit={openEdit}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowUploadModal(false) }}>
          <div className="modal-content max-w-lg">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">Upload File Arsip</h2>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nama File *</label>
                <input
                  className="input"
                  placeholder="Contoh: Sertifikat Akreditasi A 2024"
                  value={uploadNama}
                  onChange={e => setUploadNama(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Kategori *</label>
                <select
                  className="input"
                  value={uploadKategori}
                  onChange={e => setUploadKategori(e.target.value)}
                >
                  {KATEGORI_DEFAULT.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                  <option value="__custom__">+ Kategori Baru...</option>
                </select>
                {uploadKategori === '__custom__' && (
                  <input
                    className="input mt-2"
                    placeholder="Nama kategori baru"
                    value={uploadKategoriCustom}
                    onChange={e => setUploadKategoriCustom(e.target.value)}
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="label">Deskripsi (opsional)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Keterangan singkat tentang file ini"
                  value={uploadDeskripsi}
                  onChange={e => setUploadDeskripsi(e.target.value)}
                />
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
                    if (f) {
                      setUploadFile(f)
                      if (!uploadNama) setUploadNama(f.name.replace(/\.[^.]+$/, ''))
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
                        if (!uploadNama) setUploadNama(f.name.replace(/\.[^.]+$/, ''))
                      }
                    }}
                  />
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
                      <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, PowerPoint, Gambar (max 50MB)</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowUploadModal(false)} className="btn-secondary flex-1">Batal</button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="btn-primary flex-1"
                >
                  {uploading ? <div className="spinner" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Mengupload...' : 'Upload File'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedFile && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}>
          <div className="modal-content max-w-lg">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">Edit Info File</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500 flex items-center gap-2">
                <span className="text-xl">{getFileIcon(selectedFile.file_type)}</span>
                <span className="truncate">{selectedFile.file_url.split('/').pop()}</span>
              </div>
              <div>
                <label className="label">Nama File *</label>
                <input className="input" value={editNama} onChange={e => setEditNama(e.target.value)} />
              </div>
              <div>
                <label className="label">Kategori</label>
                <select className="input" value={editKategori} onChange={e => setEditKategori(e.target.value)}>
                  {allKategori.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={editDeskripsi}
                  onChange={e => setEditDeskripsi(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex-1">
                  {saving ? <div className="spinner" /> : <Save className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedFile && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowViewModal(false) }}>
          <div className="modal-content max-w-lg">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="font-display font-bold text-lg truncate max-w-xs">{selectedFile.nama_file}</h2>
                <p className="text-white/70 text-sm">{selectedFile.kategori}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-4xl">{getFileIcon(selectedFile.file_type)}</div>
                <div>
                  <p className="font-semibold text-slate-800">{selectedFile.nama_file}</p>
                  <p className="text-sm text-slate-500">{formatBytes(selectedFile.file_size)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Diupload {format(new Date(selectedFile.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                    {selectedFile.pengguna && ` · ${selectedFile.pengguna.nama_lengkap}`}
                  </p>
                </div>
              </div>
              {selectedFile.deskripsi && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                  <p className="font-semibold text-xs text-blue-500 mb-1">DESKRIPSI</p>
                  {selectedFile.deskripsi}
                </div>
              )}
              <div className="flex gap-3">
                <a
                  href={selectedFile.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex-1"
                >
                  <Eye className="w-4 h-4" /> Lihat File
                </a>
                <button
                  onClick={() => handleDownload(selectedFile.file_url, selectedFile.nama_file)}
                  className="btn-primary flex-1"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-component: table of files
function FileTable({
  files,
  isAdmin,
  selected,
  onToggle,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onDownload,
}: {
  files: ArsipSekolah[]
  isAdmin: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onView: (f: ArsipSekolah) => void
  onEdit: (f: ArsipSekolah) => void
  onDelete: (f: ArsipSekolah) => void
  onDownload: (fileUrl: string, namaFile: string) => void
}) {
  const ids = files.map(f => f.id)
  const allChecked = ids.length > 0 && ids.every(id => selected.has(id))

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {isAdmin && (
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => onSelectAll(ids)}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
            )}
            <th>Nama File</th>
            <th className="hidden sm:table-cell">Ukuran</th>
            <th className="hidden md:table-cell">Tanggal Upload</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.id} className={selected.has(file.id) ? 'bg-blue-50' : ''}>
              {isAdmin && (
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(file.id)}
                    onChange={() => onToggle(file.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>
              )}
              <td>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{getFileIcon(file.file_type)}</span>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{file.nama_file}</p>
                    {file.deskripsi && (
                      <p className="text-xs text-slate-400 truncate max-w-xs">{file.deskripsi}</p>
                    )}
                    <p className="text-xs text-slate-400 sm:hidden mt-0.5">
                      {formatBytes(file.file_size)} &middot; {format(new Date(file.created_at), 'dd MMM yyyy', { locale: localeId })}
                    </p>
                  </div>
                </div>
              </td>
              <td className="hidden sm:table-cell text-sm text-slate-500">{formatBytes(file.file_size)}</td>
              <td className="hidden md:table-cell text-sm text-slate-500">
                {format(new Date(file.created_at), 'dd MMM yyyy', { locale: localeId })}
              </td>
              <td>
                <div className="flex items-center gap-1">
                  <button onClick={() => onView(file)} className="btn-icon" title="Lihat Detail">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDownload(file.file_url, file.nama_file)} className="btn-icon" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => onEdit(file)} className="btn-icon" title="Edit Info">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(file)}
                        className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
