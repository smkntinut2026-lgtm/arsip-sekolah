'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../context'
import {
  Plus, Search, Upload, Download, Trash2, Edit3, Eye,
  AlertTriangle, CheckCircle2, FileText, X, Import, FileDown, Paperclip
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { DataSiswa, JenisFile, FileSiswa } from '@/types'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function SiswaPage() {
  const supabase = createClient()
  const { user } = useApp()
  const isAdmin = user?.role === 'admin'

  const [siswaList, setSiswaList] = useState<DataSiswa[]>([])
  const [jenisFileList, setJenisFileList] = useState<JenisFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'nama' | 'created_at'>('nama')
  const [filterStatus, setFilterStatus] = useState<'semua' | 'lengkap' | 'belum'>('semua')
  const [filterKelas, setFilterKelas] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedSiswa, setSelectedSiswa] = useState<DataSiswa | null>(null)

  const [form, setForm] = useState({
    nama_lengkap: '', nisn: '', tempat_lahir: '',
    tanggal_lahir: '', kelas: ''
  })

  const [uploadJenisId, setUploadJenisId] = useState('')
  const [uploadNamaFile, setUploadNamaFile] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [siswaRes, jenisRes] = await Promise.all([
      supabase.from('data_siswa').select('*, file_siswa(*, jenis_file(*))').order('nama_lengkap'),
      supabase.from('jenis_file').select('*').eq('kategori', 'siswa').order('urutan')
    ])
    setSiswaList(siswaRes.data || [])
    setJenisFileList(jenisRes.data || [])
    setLoading(false)
  }

  function isLengkap(siswa: DataSiswa) {
    const wajib = jenisFileList.filter(j => j.wajib)
    if (wajib.length === 0) return true
    const uploadedIds = (siswa.file_siswa || []).map(f => f.jenis_file_id)
    return wajib.every(j => uploadedIds.includes(j.id))
  }

  const kelasList = [...new Set(siswaList.map(s => s.kelas).filter(Boolean))].sort()

  const filtered = siswaList
    .filter(s => s.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || s.nisn.includes(search))
    .filter(s => filterStatus === 'semua' ? true : filterStatus === 'lengkap' ? isLengkap(s) : !isLengkap(s))
    .filter(s => !filterKelas || s.kelas === filterKelas)
    .sort((a, b) => sortBy === 'nama' ? a.nama_lengkap.localeCompare(b.nama_lengkap) :
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  async function handleSave() {
    if (!form.nama_lengkap.trim()) { toast.error('Nama wajib diisi'); return }
    const payload = { ...form, tanggal_lahir: form.tanggal_lahir || null }

    if (showEditModal && selectedSiswa) {
      const { error } = await supabase.from('data_siswa').update(payload).eq('id', selectedSiswa.id)
      if (error) { toast.error('Gagal menyimpan'); return }
      toast.success('Data berhasil diperbarui')
    } else {
      const { error } = await supabase.from('data_siswa').insert(payload)
      if (error) { toast.error('Gagal menyimpan'); return }
      toast.success('Siswa berhasil ditambahkan')
    }
    setShowAddModal(false); setShowEditModal(false)
    setForm({ nama_lengkap: '', nisn: '', tempat_lahir: '', tanggal_lahir: '', kelas: '' })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus data siswa ini beserta semua filenya?')) return
    await supabase.from('data_siswa').delete().eq('id', id)
    toast.success('Data berhasil dihapus')
    fetchData()
  }

  async function handleUploadFile() {
    if (!uploadFile || !uploadNamaFile.trim() || !selectedSiswa) {
      toast.error('Lengkapi semua field'); return
    }
    setUploading(true)
    try {
      const ext = uploadFile.name.split('.').pop()
      const path = `${selectedSiswa.id}/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage.from('file-siswa').upload(path, uploadFile)
      if (storageErr) throw storageErr
      const { data: urlData } = supabase.storage.from('file-siswa').getPublicUrl(path)
      await supabase.from('file_siswa').insert({
        siswa_id: selectedSiswa.id,
        jenis_file_id: uploadJenisId || null,
        nama_file: uploadNamaFile,
        file_url: urlData.publicUrl,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        uploaded_by: user?.id
      })
      toast.success('File berhasil diupload')
      setUploadFile(null); setUploadNamaFile(''); setUploadJenisId('')
      fetchData()
      const { data } = await supabase.from('data_siswa').select('*, file_siswa(*, jenis_file(*))').eq('id', selectedSiswa.id).single()
      if (data) setSelectedSiswa(data)
    } catch (err: any) {
      toast.error('Gagal upload: ' + err.message)
    }
    setUploading(false)
  }

  async function handleDeleteFile(file: FileSiswa) {
    if (!confirm('Hapus file ini?')) return
    const path = file.file_url.split('/file-siswa/')[1]
    await supabase.storage.from('file-siswa').remove([path])
    await supabase.from('file_siswa').delete().eq('id', file.id)
    toast.success('File dihapus')
    const { data } = await supabase.from('data_siswa').select('*, file_siswa(*, jenis_file(*))').eq('id', selectedSiswa!.id).single()
    if (data) setSelectedSiswa(data)
    fetchData()
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nama Lengkap', 'NISN', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Kelas'],
      ['Contoh: Budi Santoso', '1234567890', 'Manado', '2008-06-20', 'X IPA 1'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa')
    XLSX.writeFile(wb, 'template_import_siswa.xlsx')
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
        const entry: any = {
          nama_lengkap: row[0]?.toString().trim() || '',
          nisn: row[1]?.toString().trim() || '',
          tempat_lahir: row[2]?.toString().trim() || '',
          tanggal_lahir: row[3] || null,
          kelas: row[4]?.toString().trim() || '',
        }
        if (!entry.nama_lengkap) { skipped++; continue }
        const { error } = await supabase.from('data_siswa').insert(entry)
        if (error) skipped++
        else imported++
      }
      toast.success(`Berhasil import ${imported} data, ${skipped} dilewati`)
      setShowImportModal(false)
      fetchData()
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Data Siswa</h1>
          <p className="text-slate-500 text-sm mt-0.5">{siswaList.length} siswa terdaftar</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowImportModal(true)} className="btn-secondary text-sm">
              <Import className="w-4 h-4" /> Import Excel
            </button>
            <button onClick={() => { setForm({ nama_lengkap: '', nisn: '', tempat_lahir: '', tanggal_lahir: '', kelas: '' }); setShowAddModal(true) }} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Tambah Siswa
            </button>
          </div>
        )}
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9" placeholder="Cari nama atau NISN..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {kelasList.length > 0 && (
              <select className="input w-auto" value={filterKelas} onChange={e => setFilterKelas(e.target.value)}>
                <option value="">Semua Kelas</option>
                {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            )}
            <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="semua">Semua Status</option>
              <option value="lengkap">Sudah Lengkap</option>
              <option value="belum">Belum Lengkap</option>
            </select>
            <select className="input w-auto" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="nama">Urutkan: Nama</option>
              <option value="created_at">Urutkan: Terbaru</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Siswa</th>
                <th>NISN</th>
                <th>Kelas</th>
                <th>File</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>Tidak ada data siswa</p>
                  </td>
                </tr>
              ) : filtered.map(siswa => {
                const lengkap = isLengkap(siswa)
                return (
                  <tr key={siswa.id}>
                    <td>
                      <div className="font-semibold text-slate-800">{siswa.nama_lengkap}</div>
                      {siswa.tempat_lahir && siswa.tanggal_lahir && (
                        <div className="text-xs text-slate-400">
                          {siswa.tempat_lahir}, {format(new Date(siswa.tanggal_lahir), 'dd MMM yyyy', { locale: localeId })}
                        </div>
                      )}
                    </td>
                    <td className="font-mono text-sm">{siswa.nisn || '-'}</td>
                    <td>{siswa.kelas ? <span className="badge-purple">{siswa.kelas}</span> : '-'}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium">{(siswa.file_siswa || []).length}</span>
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
                          <AlertTriangle className="w-3 h-3" /> Belum
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelectedSiswa(siswa); setShowFileModal(true) }} className="btn-icon">
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button onClick={() => {
                              setSelectedSiswa(siswa)
                              setForm({ nama_lengkap: siswa.nama_lengkap, nisn: siswa.nisn, tempat_lahir: siswa.tempat_lahir, tanggal_lahir: siswa.tanggal_lahir || '', kelas: siswa.kelas })
                              setShowEditModal(true)
                            }} className="btn-icon"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(siswa.id)} className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600">
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
                {showEditModal ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h2>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false) }} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nama Lengkap *</label>
                  <input className="input" value={form.nama_lengkap} onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} placeholder="Nama lengkap siswa" />
                </div>
                <div>
                  <label className="label">NISN</label>
                  <input className="input" value={form.nisn} onChange={e => setForm({ ...form, nisn: e.target.value })} placeholder="Nomor Induk Siswa Nasional" />
                </div>
                <div>
                  <label className="label">Kelas</label>
                  <input className="input" value={form.kelas} onChange={e => setForm({ ...form, kelas: e.target.value })} placeholder="Contoh: X IPA 1" />
                </div>
                <div>
                  <label className="label">Tempat Lahir</label>
                  <input className="input" value={form.tempat_lahir} onChange={e => setForm({ ...form, tempat_lahir: e.target.value })} placeholder="Kota kelahiran" />
                </div>
                <div>
                  <label className="label">Tanggal Lahir</label>
                  <input className="input" type="date" value={form.tanggal_lahir} onChange={e => setForm({ ...form, tanggal_lahir: e.target.value })} />
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
      {showFileModal && selectedSiswa && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowFileModal(false) }}>
          <div className="modal-content max-w-2xl">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="font-display font-bold text-lg">{selectedSiswa.nama_lengkap}</h2>
                <p className="text-white/70 text-sm">
                  {selectedSiswa.kelas && `${selectedSiswa.kelas} · `}
                  {selectedSiswa.nisn && `NISN: ${selectedSiswa.nisn}`}
                </p>
              </div>
              <button onClick={() => setShowFileModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isLengkap(selectedSiswa) && (
              <div className="mx-6 mt-5 warning-card">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p>File wajib belum lengkap: {jenisFileList.filter(j => j.wajib && !(selectedSiswa.file_siswa || []).map(f => f.jenis_file_id).includes(j.id)).map(j => j.nama).join(', ')}</p>
              </div>
            )}

            <div className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  File Tersimpan ({(selectedSiswa.file_siswa || []).length})
                </h3>
                {(selectedSiswa.file_siswa || []).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl text-sm">Belum ada file</div>
                ) : (
                  <div className="space-y-2">
                    {(selectedSiswa.file_siswa || []).map((file: FileSiswa) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-800 truncate">{file.nama_file}</p>
                          <p className="text-xs text-slate-400">
                            {file.jenis_file?.nama && `${file.jenis_file.nama} · `}
                            {formatBytes(file.file_size)} · {format(new Date(file.created_at), 'dd MMM yyyy', { locale: localeId })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <a href={file.file_url} target="_blank" className="btn-icon"><Download className="w-4 h-4" /></a>
                          {isAdmin && (
                            <button onClick={() => handleDeleteFile(file)} className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-500" /> Upload File Baru
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="label">Nama File *</label>
                      <input className="input" placeholder="Nama deskriptif file" value={uploadNamaFile} onChange={e => setUploadNamaFile(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Jenis File</label>
                      <select className="input" value={uploadJenisId} onChange={e => setUploadJenisId(e.target.value)}>
                        <option value="">— Pilih Jenis File —</option>
                        {jenisFileList.map(j => <option key={j.id} value={j.id}>{j.nama}{j.wajib ? ' *' : ''}</option>)}
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
                      <input ref={fileInputRef} type="file" className="hidden" onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) { setUploadFile(f); if (!uploadNamaFile) setUploadNamaFile(f.name.replace(/\.[^.]+$/, '')) }
                      }} />
                      {uploadFile ? (
                        <div className="text-center">
                          <FileText className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                          <p className="font-medium text-slate-700">{uploadFile.name}</p>
                          <p className="text-sm text-slate-400">{formatBytes(uploadFile.size)}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">Klik atau seret file ke sini</p>
                        </div>
                      )}
                    </div>
                    <button onClick={handleUploadFile} disabled={uploading || !uploadFile} className="btn-primary w-full">
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
              <h2 className="font-display font-bold text-lg">Import Data Siswa</h2>
              <button onClick={() => setShowImportModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
                <p className="font-semibold mb-1">Petunjuk Import:</p>
                <ul className="space-y-1 text-blue-700 list-disc list-inside">
                  <li>Unduh template Excel terlebih dahulu</li>
                  <li>Isi data sesuai kolom yang tersedia</li>
                  <li>Field yang kosong dapat dilengkapi nanti via tombol Edit</li>
                  <li>Kolom Nama Lengkap wajib diisi</li>
                </ul>
              </div>
              <button onClick={downloadTemplate} className="btn-secondary w-full">
                <FileDown className="w-4 h-4" /> Unduh Template Excel
              </button>
              <div>
                <label className="label">Upload File Excel (.xlsx)</label>
                <input type="file" accept=".xlsx,.xls" className="block w-full text-sm text-slate-500 file:btn-primary file:mr-4 file:text-sm file:border-0 cursor-pointer" onChange={handleImport} />
              </div>
              <button onClick={() => setShowImportModal(false)} className="btn-secondary w-full">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
