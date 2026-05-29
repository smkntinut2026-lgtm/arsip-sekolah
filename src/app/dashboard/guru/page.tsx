'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../context'
import {
  Plus, Search, Upload, Download, Trash2, Edit3, Eye,
  AlertTriangle, CheckCircle2, FileText, X, Filter,
  ArrowUpDown, Import, FileDown, ChevronDown, Paperclip, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { DataGuru, JenisFile, FileGuru } from '@/types'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function GuruPage() {
  const supabase = createClient()
  const { user } = useApp()
  const isAdmin = user?.role === 'admin'

  const [guruList, setGuruList] = useState<DataGuru[]>([])
  const [jenisFileList, setJenisFileList] = useState<JenisFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'nama' | 'created_at'>('nama')
  const [filterStatus, setFilterStatus] = useState<'semua' | 'lengkap' | 'belum'>('semua')
  const [filterJabatan, setFilterJabatan] = useState<'semua' | 'Guru' | 'Tendik'>('semua')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedGuru, setSelectedGuru] = useState<DataGuru | null>(null)

  // Form
  const [form, setForm] = useState({
    nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '',
    pendidikan_terakhir: '', gelar: '', no_telepon: '', jabatan: 'Guru'
  })

  // Bulk delete
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Hapus ${selected.size} data guru beserta semua filenya?`)) return
    const ids = Array.from(selected)
    await supabase.from('data_guru').delete().in('id', ids)
    toast.success(`${ids.length} data guru berhasil dihapus`)
    setSelected(new Set())
    fetchData()
  }

  // File upload
  const [uploadJenisId, setUploadJenisId] = useState('')
  const [uploadNamaFile, setUploadNamaFile] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [guruRes, jenisRes] = await Promise.all([
      supabase.from('data_guru').select('*, file_guru(*, jenis_file(*))').order('nama_lengkap'),
      supabase.from('jenis_file').select('*').eq('kategori', 'guru').order('urutan')
    ])
    setGuruList(guruRes.data || [])
    setJenisFileList(jenisRes.data || [])
    setLoading(false)
  }

  function isLengkap(guru: DataGuru) {
    const wajib = jenisFileList.filter(j => j.wajib)
    if (wajib.length === 0) return true
    const uploadedIds = (guru.file_guru || []).map(f => f.jenis_file_id)
    return wajib.every(j => uploadedIds.includes(j.id))
  }

  const filtered = guruList
    .filter(g => g.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      g.nik.includes(search))
    .filter(g => filterJabatan === 'semua' ? true : g.jabatan === filterJabatan)
    .filter(g => filterStatus === 'semua' ? true :
      filterStatus === 'lengkap' ? isLengkap(g) : !isLengkap(g))
    .sort((a, b) => {
      if (sortBy === 'nama') return a.nama_lengkap.localeCompare(b.nama_lengkap)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  async function handleSave() {
    if (!form.nama_lengkap.trim()) { toast.error('Nama wajib diisi'); return }
    const payload = { ...form, tanggal_lahir: form.tanggal_lahir || null }

    if (showEditModal && selectedGuru) {
      const { error } = await supabase.from('data_guru').update(payload).eq('id', selectedGuru.id)
      if (error) { toast.error('Gagal menyimpan'); return }
      toast.success('Data berhasil diperbarui')
    } else {
      const { error } = await supabase.from('data_guru').insert(payload)
      if (error) { toast.error('Gagal menyimpan'); return }
      toast.success('Guru berhasil ditambahkan')
    }
    setShowAddModal(false)
    setShowEditModal(false)
    setForm({ nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '', pendidikan_terakhir: '', gelar: '', no_telepon: '', jabatan: 'Guru' })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus data guru ini beserta semua filenya?')) return
    await supabase.from('data_guru').delete().eq('id', id)
    toast.success('Data berhasil dihapus')
    fetchData()
  }

  async function handleUploadFile() {
    if (!uploadFile || !uploadNamaFile.trim() || !selectedGuru) {
      toast.error('Lengkapi semua field'); return
    }
    setUploading(true)
    try {
      const ext = uploadFile.name.split('.').pop()
      const path = `${selectedGuru.id}/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('file-guru').upload(path, uploadFile)
      if (storageErr) throw storageErr

      const { data: urlData } = supabase.storage.from('file-guru').getPublicUrl(path)

      await supabase.from('file_guru').insert({
        guru_id: selectedGuru.id,
        jenis_file_id: uploadJenisId || null,
        nama_file: uploadNamaFile,
        file_url: urlData.publicUrl,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        uploaded_by: user?.id
      })
      toast.success('File berhasil diupload')
      setUploadFile(null)
      setUploadNamaFile('')
      setUploadJenisId('')
      fetchData()
      // refresh selected guru files
      const { data } = await supabase
        .from('data_guru').select('*, file_guru(*, jenis_file(*))')
        .eq('id', selectedGuru.id).single()
      if (data) setSelectedGuru(data)
    } catch (err: any) {
      toast.error('Gagal upload: ' + err.message)
    }
    setUploading(false)
  }

  async function handleDeleteFile(file: FileGuru) {
    if (!confirm('Hapus file ini?')) return
    const path = file.file_url.split('/file-guru/')[1]
    await supabase.storage.from('file-guru').remove([path])
    await supabase.from('file_guru').delete().eq('id', file.id)
    toast.success('File dihapus')
    const { data } = await supabase
      .from('data_guru').select('*, file_guru(*, jenis_file(*))')
      .eq('id', selectedGuru!.id).single()
    if (data) setSelectedGuru(data)
    fetchData()
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

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nama Lengkap', 'NIK', 'Jabatan (Guru/Tendik)', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Pendidikan Terakhir', 'Gelar'],
      ['Contoh: Ahmad Fauzi, S.Pd', '1234567890123456', 'Guru', 'Jakarta', '1985-05-15', 'S1', 'S.Pd'],
      ['Contoh: Budi Santoso', '6543210987654321', 'Tendik', 'Surabaya', '1990-03-20', 'S1', ''],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Guru & Tendik')
    XLSX.writeFile(wb, 'template_import_guru_tendik.xlsx')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const dataRows = rows.slice(1).filter(r => r[0])

      let imported = 0, skipped = 0
      for (const row of dataRows) {
        const jabatanRaw = row[2]?.toString().trim() || 'Guru'
        const jabatan = jabatanRaw.toLowerCase() === 'tendik' ? 'Tendik' : 'Guru'
        const entry: any = {
          nama_lengkap: row[0]?.toString().trim() || '',
          nik: row[1]?.toString().trim() || '',
          jabatan,
          tempat_lahir: row[3]?.toString().trim() || '',
          tanggal_lahir: row[4] || null,
          pendidikan_terakhir: row[5]?.toString().trim() || '',
          gelar: row[6]?.toString().trim() || '',
        }
        if (!entry.nama_lengkap) { skipped++; continue }
        const { error } = await supabase.from('data_guru').insert(entry)
        if (error) skipped++
        else imported++
      }
      toast.success(`Berhasil import ${imported} data, ${skipped} dilewati`)
      setShowImportModal(false)
      fetchData()
    }
    reader.readAsArrayBuffer(file)
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Data Guru & Tendik</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {guruList.filter(g => g.jabatan === 'Guru').length} Guru · {guruList.filter(g => g.jabatan === 'Tendik').length} Tendik
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {selected.size > 0 && (
              <button onClick={handleBulkDelete} className="btn-secondary text-sm text-rose-600 border-rose-200 hover:bg-rose-50">
                <Trash2 className="w-4 h-4" /> Hapus {selected.size} Terpilih
              </button>
            )}
            <button onClick={() => setShowImportModal(true)} className="btn-secondary text-sm">
              <Import className="w-4 h-4" /> Import Excel
            </button>
            <button onClick={() => { setForm({ nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '', pendidikan_terakhir: '', gelar: '', no_telepon: '', jabatan: 'Guru' }); setShowAddModal(true) }} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Tambah Pegawai
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9" placeholder="Cari nama atau NIK..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <select className="input w-auto" value={filterJabatan}
              onChange={e => setFilterJabatan(e.target.value as any)}>
              <option value="semua">Semua Jabatan</option>
              <option value="Guru">Guru</option>
              <option value="Tendik">Tendik</option>
            </select>
            <select className="input w-auto" value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="semua">Semua Status</option>
              <option value="lengkap">Sudah Lengkap</option>
              <option value="belum">Belum Lengkap</option>
            </select>
            <select className="input w-auto" value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}>
              <option value="nama">Urutkan: Nama</option>
              <option value="created_at">Urutkan: Terbaru</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {isAdmin && (
                  <th style={{width: '40px'}}>
                    <input type="checkbox"
                      checked={filtered.length > 0 && filtered.every(g => selected.has(g.id))}
                      onChange={() => {
                        const allIds = filtered.map(g => g.id)
                        const allChecked = allIds.every(id => selected.has(id))
                        if (allChecked) setSelected(new Set())
                        else setSelected(new Set(allIds))
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                )}
                <th>Nama Pegawai</th>
                <th>NIK</th>
                <th>Pendidikan</th>
                <th>File</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p>Tidak ada data guru</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(guru => {
                const lengkap = isLengkap(guru)
                const fileCount = (guru.file_guru || []).length
                return (
                  <tr key={guru.id} className={selected.has(guru.id) ? 'bg-blue-50' : ''}>
                    {isAdmin && (
                      <td>
                        <input type="checkbox"
                          checked={selected.has(guru.id)}
                          onChange={() => toggleSelect(guru.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}
                    <td>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-semibold text-slate-800">{guru.nama_lengkap}</div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          guru.jabatan === 'Tendik'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>{guru.jabatan}</span>
                      </div>
                      {guru.gelar && <div className="text-xs text-slate-400 mb-1">{guru.gelar}</div>}
                      {jenisFileList.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {jenisFileList.map(j => {
                            const uploaded = (guru.file_guru || []).some(f => f.jenis_file_id === j.id)
                            return (
                              <span key={j.id} className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                uploaded
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : j.wajib
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-slate-100 text-slate-400'
                              }`}>
                                {uploaded ? '✓' : '–'} {j.nama}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </td>
                    <td className="text-slate-600 font-mono text-sm">
                      <div>{guru.nik || '-'}</div>
                      {guru.no_telepon && (
                        <a href={`https://wa.me/${guru.no_telepon.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-emerald-600 hover:underline flex items-center gap-1 mt-0.5">
                          📱 {guru.no_telepon}
                        </a>
                      )}
                    </td>
                    <td>{guru.pendidikan_terakhir || '-'}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium">{fileCount}</span>
                        <span className="text-xs text-slate-400">file</span>
                      </div>
                    </td>
                    <td>
                      {lengkap ? (
                        <span className="badge-green flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Lengkap
                        </span>
                      ) : (
                        <span className="badge-yellow flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Belum Lengkap
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedGuru(guru); setShowFileModal(true) }}
                          className="btn-icon" title="Lihat/Upload File"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedGuru(guru)
                                setForm({
                                  nama_lengkap: guru.nama_lengkap, nik: guru.nik,
                                  tempat_lahir: guru.tempat_lahir, tanggal_lahir: guru.tanggal_lahir || '',
                                  pendidikan_terakhir: guru.pendidikan_terakhir, gelar: guru.gelar,
                                  no_telepon: guru.no_telepon || '', jabatan: guru.jabatan || 'Guru'
                                })
                                setShowEditModal(true)
                              }}
                              className="btn-icon" title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(guru.id)} className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setShowEditModal(false) } }}>
          <div className="modal-content">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">
                {showEditModal ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
              </h2>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false) }} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nama Lengkap *</label>
                  <input className="input" value={form.nama_lengkap} onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} placeholder="Nama lengkap pegawai" />
                </div>
                <div>
                  <label className="label">Jabatan *</label>
                  <select className="input" value={form.jabatan} onChange={e => setForm({ ...form, jabatan: e.target.value })}>
                    <option value="Guru">Guru</option>
                    <option value="Tendik">Tendik (Tenaga Kependidikan)</option>
                  </select>
                </div>
                <div>
                  <label className="label">NIK</label>
                  <input className="input" value={form.nik} onChange={e => setForm({ ...form, nik: e.target.value })} placeholder="16 digit NIK" />
                </div>
                <div>
                  <label className="label">Gelar</label>
                  <input className="input" value={form.gelar} onChange={e => setForm({ ...form, gelar: e.target.value })} placeholder="S.Pd, M.Pd, dll" />
                </div>
                <div>
                  <label className="label">Tempat Lahir</label>
                  <input className="input" value={form.tempat_lahir} onChange={e => setForm({ ...form, tempat_lahir: e.target.value })} placeholder="Kota kelahiran" />
                </div>
                <div>
                  <label className="label">Tanggal Lahir</label>
                  <input className="input" type="date" value={form.tanggal_lahir} onChange={e => setForm({ ...form, tanggal_lahir: e.target.value })} />
                </div>
                <div>
                  <label className="label">Pendidikan Terakhir</label>
                  <select className="input" value={form.pendidikan_terakhir} onChange={e => setForm({ ...form, pendidikan_terakhir: e.target.value })}>
                    <option value="">Pilih pendidikan</option>
                    {['SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">No. Telepon / WhatsApp</label>
                  <input className="input" value={form.no_telepon} onChange={e => setForm({ ...form, no_telepon: e.target.value })} placeholder="Contoh: 08123456789" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false) }} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleSave} className="btn-primary flex-1">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Modal */}
      {showFileModal && selectedGuru && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowFileModal(false) }}>
          <div className="modal-content max-w-2xl">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="font-display font-bold text-lg">{selectedGuru.nama_lengkap}</h2>
                <p className="text-white/70 text-sm">{selectedGuru.gelar && `${selectedGuru.gelar} · `}Arsip File Guru</p>
              </div>
              <button onClick={() => setShowFileModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Missing files warning */}
            {!isLengkap(selectedGuru) && (
              <div className="mx-6 mt-5 warning-card">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p>
                  File wajib belum lengkap:{' '}
                  {jenisFileList.filter(j => j.wajib && !(selectedGuru.file_guru || []).map(f => f.jenis_file_id).includes(j.id))
                    .map(j => j.nama).join(', ')}
                </p>
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* Existing files */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  File Tersimpan ({(selectedGuru.file_guru || []).length})
                </h3>
                {(selectedGuru.file_guru || []).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl text-sm">
                    Belum ada file yang diupload
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(selectedGuru.file_guru || []).map((file: FileGuru) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-800 truncate">{file.nama_file}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {file.jenis_file?.nama && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary-50 text-primary-700 text-xs font-medium border border-primary-100">
                                {file.jenis_file.nama}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{formatBytes(file.file_size)}</span>
                            <span className="text-xs text-slate-300">·</span>
                            <span className="text-xs text-slate-400">{format(new Date(file.created_at), 'dd MMM yyyy', { locale: localeId })}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Lihat / Preview">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => handleDownload(file.file_url, file.nama_file)} className="btn-icon text-primary-500 hover:bg-primary-50 hover:text-primary-700" title="Download">
                            <Download className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDeleteFile(file)} className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload */}
              {isAdmin && (
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-500" />
                    Upload File Baru
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="label">Nama File *</label>
                      <input className="input" placeholder="Nama deskriptif file ini"
                        value={uploadNamaFile} onChange={e => setUploadNamaFile(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Jenis File</label>
                      <select className="input" value={uploadJenisId} onChange={e => setUploadJenisId(e.target.value)}>
                        <option value="">— Pilih Jenis File —</option>
                        {jenisFileList.map(j => (
                          <option key={j.id} value={j.id}>{j.nama}{j.wajib ? ' *' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div
                      className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setDragOver(false)
                        const f = e.dataTransfer.files[0]
                        if (f) { setUploadFile(f); if (!uploadNamaFile) setUploadNamaFile(f.name.replace(/\.[^.]+$/, '')) }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input ref={fileInputRef} type="file" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) { setUploadFile(f); if (!uploadNamaFile) setUploadNamaFile(f.name.replace(/\.[^.]+$/, '')) }
                        }} />
                      {uploadFile ? (
                        <div className="text-center">
                          <FileText className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                          <p className="font-medium text-slate-700">{uploadFile.name}</p>
                          <p className="text-sm text-slate-400">{formatBytes(uploadFile.size)}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">Klik atau seret file ke sini</p>
                          <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOCX (max 50MB)</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleUploadFile}
                      disabled={uploading || !uploadFile}
                      className="btn-primary w-full"
                    >
                      {uploading ? <div className="spinner" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'Mengupload...' : 'Upload File'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false) }}>
          <div className="modal-content">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">Import Data Guru & Tendik</h2>
              <button onClick={() => setShowImportModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
                <p className="font-semibold mb-1">Petunjuk Import:</p>
                <ul className="space-y-1 text-blue-700 list-disc list-inside">
                  <li>Unduh template Excel terlebih dahulu</li>
                  <li>Isi kolom <strong>Jabatan</strong> dengan <strong>Guru</strong> atau <strong>Tendik</strong></li>
                  <li>Field yang kosong akan dilewati, dapat dilengkapi nanti via tombol Edit</li>
                  <li>Kolom Nama Lengkap wajib diisi</li>
                </ul>
              </div>
              <button onClick={downloadTemplate} className="btn-secondary w-full">
                <FileDown className="w-4 h-4" /> Unduh Template Excel
              </button>
              <div>
                <label className="label">Upload File Excel (.xlsx)</label>
                <input type="file" accept=".xlsx,.xls"
                  className="block w-full text-sm text-slate-500 file:btn-primary file:mr-4 file:text-sm file:border-0 cursor-pointer"
                  onChange={handleImport} />
              </div>
              <button onClick={() => setShowImportModal(false)} className="btn-secondary w-full">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
