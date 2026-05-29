'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Download, Eye, FileText, GraduationCap, BookOpen,
  School, FolderArchive, ChevronDown, ChevronRight, X, FolderOpen,
  Upload, CheckCircle2, AlertCircle, Loader2, Clock, ShieldAlert
} from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { DataGuru, DataSiswa, FileGuru, FileSiswa, ArsipSekolah, JenisFile } from '@/types'

// ─── Konstanta sesi upload ────────────────────────────────────────────────────
const SESSION_KEY = 'portal_upload_session'
const SESSION_DURATION_MS = 60 * 60 * 1000 // 1 jam
const STORAGE_WARNING_MB = 50 // peringatan jika sisa < 50MB
const STORAGE_LIMIT_MB = 1024 // 1 GB batas Supabase free

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

// ─── Cek & kelola sesi upload ─────────────────────────────────────────────────
function getUploadSession(): { active: boolean; expired: boolean } {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return { active: false, expired: false }
    const { startedAt } = JSON.parse(raw)
    const elapsed = Date.now() - startedAt
    if (elapsed > SESSION_DURATION_MS) return { active: false, expired: true }
    return { active: true, expired: false }
  } catch {
    return { active: false, expired: false }
  }
}

function startUploadSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ startedAt: Date.now() }))
}

type ActiveTab = 'arsip' | 'guru' | 'siswa'

export default function PortalPage() {
  const supabase = createClient()

  const [profil, setProfil] = useState<any>(null)
  const [guruList, setGuruList] = useState<DataGuru[]>([])
  const [siswaList, setSiswaList] = useState<DataSiswa[]>([])
  const [arsipList, setArsipList] = useState<ArsipSekolah[]>([])
  const [jenisFileList, setJenisFileList] = useState<JenisFile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('arsip')
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filterKategori, setFilterKategori] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')
  const [previewFile, setPreviewFile] = useState<{ nama: string; url: string; type: string } | null>(null)

  // Upload states
  const [uploadTargetGuru, setUploadTargetGuru] = useState<DataGuru | null>(null)
  const [checkingStorage, setCheckingStorage] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [uploadNama, setUploadNama] = useState('')
  const [uploadJenisId, setUploadJenisId] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [profilRes, guruRes, siswaRes, arsipRes, jenisRes] = await Promise.all([
      supabase.from('profil_sekolah').select('*').limit(1).single(),
      supabase.from('data_guru').select('*, file_guru(*, jenis_file(*))').order('nama_lengkap'),
      supabase.from('data_siswa').select('*, file_siswa(*, jenis_file(*))').order('nama_lengkap'),
      supabase.from('arsip_sekolah').select('*').order('kategori').order('created_at', { ascending: false }),
      supabase.from('jenis_file').select('*').eq('kategori', 'guru').order('urutan'),
    ])
    setProfil(profilRes.data)
    setGuruList(guruRes.data || [])
    setSiswaList(siswaRes.data || [])
    setArsipList(arsipRes.data || [])
    setJenisFileList(jenisRes.data || [])
    setLoading(false)
  }

  async function refreshGuru(guruId: string) {
    const { data } = await supabase
      .from('data_guru').select('*, file_guru(*, jenis_file(*))')
      .eq('id', guruId).single()
    if (data) {
      setGuruList(prev => prev.map(g => g.id === guruId ? data : g))
      setUploadTargetGuru(data)
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function handleDownload(fileUrl: string, namaFile: string) {
    try {
      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = namaFile
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(fileUrl, '_blank')
    }
  }

  // ─── Klik tombol upload dari kartu guru ──────────────────────────────────────
  async function handleClickUpload(guru: DataGuru) {
    // Cek sesi
    const session = getUploadSession()
    if (session.expired) {
      setSessionExpired(true)
      return
    }

    setUploadTargetGuru(guru)
    setCheckingStorage(true)

    // Animasi cek storage (minimal 1.2 detik agar terasa)
    const [storageRes] = await Promise.all([
      supabase.from('file_guru').select('file_size'),
      new Promise(r => setTimeout(r, 1200)),
    ])

    const usedBytes = ((storageRes.data || []) as any[]).reduce((s: number, f: any) => s + (f.file_size || 0), 0)
    const usedMB = usedBytes / (1024 * 1024)
    const sisaMB = STORAGE_LIMIT_MB - usedMB

    setCheckingStorage(false)

    if (sisaMB < 1) {
      toast.error('Ruang penyimpanan penuh. Hubungi admin.')
      return
    }
    if (sisaMB < STORAGE_WARNING_MB) {
      toast('Peringatan: ruang penyimpanan hampir penuh!', { icon: '⚠️' })
    }

    // Mulai sesi jika belum ada
    if (!session.active) startUploadSession()

    setUploadNama('')
    setUploadJenisId('')
    setUploadFile(null)
    setShowUploadModal(true)
  }

  async function handleUpload() {
    if (!uploadFile || !uploadNama.trim() || !uploadTargetGuru) {
      toast.error('Nama file dan file wajib diisi')
      return
    }
    // Cek sesi lagi sebelum upload
    const session = getUploadSession()
    if (!session.active) {
      setShowUploadModal(false)
      setSessionExpired(true)
      return
    }

    setUploading(true)
    try {
      const ext = uploadFile.name.split('.').pop()
      const path = `${uploadTargetGuru.id}/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('file-guru').upload(path, uploadFile)
      if (storageErr) throw storageErr

      const { data: urlData } = supabase.storage.from('file-guru').getPublicUrl(path)

      const { error: dbErr } = await supabase.from('file_guru').insert({
        guru_id: uploadTargetGuru.id,
        jenis_file_id: uploadJenisId || null,
        nama_file: uploadNama.trim(),
        file_url: urlData.publicUrl,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        uploaded_by: null,
      })
      if (dbErr) throw dbErr

      toast.success('File berhasil diupload!')
      setShowUploadModal(false)
      await refreshGuru(uploadTargetGuru.id)
    } catch (err: any) {
      toast.error('Gagal upload: ' + err.message)
    }
    setUploading(false)
  }

  // ─── Filter data ─────────────────────────────────────────────────────────────
  const filteredGuru = guruList.filter(g =>
    g.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
    g.nik?.includes(search)
  )
  const guruOnly = filteredGuru.filter(g => g.jabatan !== 'Tendik')
  const tendikOnly = filteredGuru.filter(g => g.jabatan === 'Tendik')

  const filteredSiswa = siswaList
    .filter(s => filterKelas === 'semua' || s.kelas === filterKelas)
    .filter(s =>
      s.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn?.includes(search) ||
      s.kelas?.toLowerCase().includes(search.toLowerCase())
    )

  const allKategori = Array.from(new Set(arsipList.map(a => a.kategori))).filter(Boolean)
  const filteredArsip = arsipList.filter(a =>
    (filterKategori === 'semua' || a.kategori === filterKategori) &&
    (a.nama_file.toLowerCase().includes(search.toLowerCase()) ||
     a.kategori.toLowerCase().includes(search.toLowerCase()) ||
     a.deskripsi?.toLowerCase().includes(search.toLowerCase()))
  )
  const allKelas = Array.from(new Set(siswaList.map(s => s.kelas).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const arsipByKategori: Record<string, ArsipSekolah[]> = {}
  filteredArsip.forEach(a => {
    if (!arsipByKategori[a.kategori]) arsipByKategori[a.kategori] = []
    arsipByKategori[a.kategori].push(a)
  })

  const totalSiswaFiles = siswaList.reduce((sum, s) => sum + (s.file_siswa?.length || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          {profil?.logo_url ? (
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
              <Image src={profil.logo_url} alt="Logo" width={44} height={44} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <School className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display font-bold text-slate-800 text-base sm:text-lg truncate">
              {profil?.nama_sekolah || 'Portal Arsip Sekolah'}
            </h1>
            <p className="text-xs text-slate-400">Portal Dokumen Publik</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Arsip Sekolah', value: arsipList.length, icon: FolderArchive, color: 'from-violet-500 to-purple-600' },
            { label: 'Guru', value: guruList.filter(g => g.jabatan !== 'Tendik').length, sub: `${guruList.filter(g=>g.jabatan!=='Tendik').reduce((s,g)=>s+(g.file_guru?.length||0),0)} file`, icon: GraduationCap, color: 'from-blue-500 to-primary-600' },
            { label: 'Tendik', value: guruList.filter(g => g.jabatan === 'Tendik').length, sub: `${guruList.filter(g=>g.jabatan==='Tendik').reduce((s,g)=>s+(g.file_guru?.length||0),0)} file`, icon: GraduationCap, color: 'from-amber-500 to-orange-500' },
            { label: 'Siswa', value: siswaList.length, sub: `${totalSiswaFiles} file`, icon: BookOpen, color: 'from-emerald-500 to-teal-600' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-display font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}{s.sub ? ` · ${s.sub}` : ''}</p>
            </div>
          ))}
        </div>

        <div className="card p-4 mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {([
              { key: 'arsip', label: 'Arsip Sekolah', icon: FolderArchive, count: arsipList.length, color: 'bg-violet-500' },
              { key: 'guru', label: 'File Guru & Tendik', icon: GraduationCap, count: guruList.length, color: 'bg-primary-500' },
              { key: 'siswa', label: 'File Siswa', icon: BookOpen, count: siswaList.length, color: 'bg-emerald-500' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearch(''); setFilterKategori('semua'); setFilterKelas('semua') }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.key ? `${tab.color} text-white shadow-md` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder={
                  activeTab === 'arsip' ? 'Cari nama atau kategori file...' :
                  activeTab === 'guru' ? 'Cari nama guru / tendik atau NIK...' :
                  'Cari nama siswa, NISN, atau kelas...'
                }
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {activeTab === 'arsip' && allKategori.length > 0 && (
              <select className="input w-auto" value={filterKategori} onChange={e => setFilterKategori(e.target.value)}>
                <option value="semua">Semua Kategori</option>
                {allKategori.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            )}
            {activeTab === 'siswa' && allKelas.length > 0 && (
              <select className="input w-auto" value={filterKelas} onChange={e => setFilterKelas(e.target.value)}>
                <option value="semua">Semua Kelas</option>
                {allKelas.map(k => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="card p-10 text-center">
            <div className="spinner spinner-dark mx-auto mb-3" style={{ width: 32, height: 32 }} />
            <p className="text-slate-400">Memuat data...</p>
          </div>
        ) : activeTab === 'arsip' ? (
          <div className="space-y-4">
            {filteredArsip.length === 0 ? (
              <div className="card p-10 text-center text-slate-400">
                <FolderArchive className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p>Belum ada arsip sekolah</p>
              </div>
            ) : Object.entries(arsipByKategori).map(([kat, files]) => (
              <div key={kat} className="card overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-violet-500" />
                  <h3 className="font-semibold text-slate-700 text-sm">{kat}</h3>
                  <span className="ml-auto badge-purple">{files.length} file</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <span className="text-xl flex-shrink-0">{getFileIcon(file.file_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">{file.nama_file}</p>
                        <p className="text-xs text-slate-400">
                          {formatBytes(file.file_size)} · {format(new Date(file.created_at), 'dd MMM yyyy', { locale: localeId })}
                          {file.deskripsi && ` · ${file.deskripsi}`}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setPreviewFile({ nama: file.nama_file, url: file.file_url, type: file.file_type })} className="btn-icon">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownload(file.file_url, file.nama_file)} className="btn-icon">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'guru' ? (
          <div>
            {filteredGuru.length === 0 ? (
              <div className="card p-10 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p>Tidak ada data guru & tendik ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kolom Guru */}
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-2 h-5 rounded-full bg-blue-500" />
                    <h2 className="font-display font-bold text-slate-700">Guru</h2>
                    <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{guruOnly.length}</span>
                  </div>
                  {guruOnly.length === 0 ? (
                    <div className="card p-6 text-center text-slate-400 text-sm">Tidak ada data guru</div>
                  ) : (
                    <div className="space-y-2">
                      {guruOnly.map(guru => (
                        <GuruCard
                          key={guru.id} guru={guru}
                          expandedIds={expandedIds}
                          onToggle={toggleExpand}
                          onPreview={setPreviewFile}
                          onDownload={handleDownload}
                          onClickUpload={handleClickUpload}
                          checkingStorageFor={checkingStorage ? uploadTargetGuru?.id : null}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Kolom Tendik */}
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-2 h-5 rounded-full bg-amber-500" />
                    <h2 className="font-display font-bold text-slate-700">Tendik</h2>
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{tendikOnly.length}</span>
                  </div>
                  {tendikOnly.length === 0 ? (
                    <div className="card p-6 text-center text-slate-400 text-sm">Tidak ada data tendik</div>
                  ) : (
                    <div className="space-y-2">
                      {tendikOnly.map(guru => (
                        <GuruCard
                          key={guru.id} guru={guru}
                          expandedIds={expandedIds}
                          onToggle={toggleExpand}
                          onPreview={setPreviewFile}
                          onDownload={handleDownload}
                          onClickUpload={handleClickUpload}
                          checkingStorageFor={checkingStorage ? uploadTargetGuru?.id : null}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSiswa.length === 0 ? (
              <div className="card p-10 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p>Tidak ada data siswa ditemukan</p>
              </div>
            ) : filteredSiswa.map(siswa => {
              const files = siswa.file_siswa || []
              const expanded = expandedIds.has(siswa.id)
              return (
                <div key={siswa.id} className="card overflow-hidden">
                  <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(siswa.id)}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{siswa.nama_lengkap}</p>
                      <p className="text-xs text-slate-400">{siswa.kelas && `Kelas ${siswa.kelas} · `}{siswa.nisn ? `NISN: ${siswa.nisn}` : 'NISN tidak tersedia'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${files.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{files.length} file</span>
                      {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      {files.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-3">Belum ada file diupload</p>
                      ) : (
                        <div className="space-y-2">
                          {files.map((file: FileSiswa) => (
                            <FileRow key={file.id} nama={file.nama_file} fileUrl={file.file_url} fileType={file.file_type} fileSize={file.file_size} createdAt={file.created_at} jenisNama={file.jenis_file?.nama} onPreview={() => setPreviewFile({ nama: file.nama_file, url: file.file_url, type: file.file_type })} onDownload={() => handleDownload(file.file_url, file.nama_file)} />
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
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-6 mt-4 text-center text-xs text-slate-400 border-t border-slate-100">
        {profil?.nama_sekolah} · Portal Dokumen Publik
      </footer>

      {/* Modal Preview File */}
      {previewFile && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPreviewFile(null) }}>
          <div className="modal-content max-w-lg">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-base truncate max-w-xs">{previewFile.nama}</h2>
              <button onClick={() => setPreviewFile(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="text-center py-4">
                <div className="text-5xl mb-3">{getFileIcon(previewFile.type)}</div>
                <p className="font-medium text-slate-700">{previewFile.nama}</p>
              </div>
              <div className="flex gap-3">
                <a href={previewFile.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
                  <Eye className="w-4 h-4" /> Buka / Lihat
                </a>
                <button onClick={() => handleDownload(previewFile.url, previewFile.nama)} className="btn-primary flex-1">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sesi Expired */}
      {sessionExpired && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSessionExpired(false) }}>
          <div className="modal-content max-w-sm">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-800 text-lg">Sesi Upload Berakhir</h2>
                <p className="text-slate-500 text-sm mt-2">
                  Demi keamanan, sesi upload Anda telah berakhir. Silakan coba lagi besok ya, terimakasih😊.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
                <Clock className="w-4 h-4" />
                <span>Sesi aktif selama 1 jam sejak upload pertama</span>
              </div>
              <button onClick={() => setSessionExpired(false)} className="btn-secondary w-full">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload File */}
      {showUploadModal && uploadTargetGuru && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowUploadModal(false) }}>
          <div className="modal-content max-w-lg">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="font-display font-bold text-lg">Upload File</h2>
                <p className="text-white/70 text-sm truncate max-w-xs">{uploadTargetGuru.nama_lengkap}</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Info sesi */}
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Sesi upload aktif · Anda dapat mengupload file selama 1 jam</span>
              </div>

              <div>
                <label className="label">Nama File *</label>
                <input
                  className="input"
                  placeholder="Contoh: Ijazah S1, SK Mengajar 2024"
                  value={uploadNama}
                  onChange={e => setUploadNama(e.target.value)}
                />
              </div>

              {jenisFileList.length > 0 && (
                <div>
                  <label className="label">Jenis File</label>
                  <select className="input" value={uploadJenisId} onChange={e => setUploadJenisId(e.target.value)}>
                    <option value="">— Pilih Jenis File (opsional) —</option>
                    {jenisFileList.map(j => (
                      <option key={j.id} value={j.id}>{j.nama}{j.wajib ? ' *' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  <input
                    ref={fileInputRef} type="file" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) { setUploadFile(f); if (!uploadNama) setUploadNama(f.name.replace(/\.[^.]+$/, '')) }
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
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOCX (max 50MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowUploadModal(false)} className="btn-secondary flex-1">Batal</button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile || !uploadNama.trim()}
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
    </div>
  )
}

// ─── Komponen GuruCard ────────────────────────────────────────────────────────
function GuruCard({ guru, expandedIds, onToggle, onPreview, onDownload, onClickUpload, checkingStorageFor }: {
  guru: DataGuru
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onPreview: (f: { nama: string; url: string; type: string }) => void
  onDownload: (url: string, nama: string) => void
  onClickUpload: (guru: DataGuru) => void
  checkingStorageFor: string | null
}) {
  const files = guru.file_guru || []
  const expanded = expandedIds.has(guru.id)
  const isTendik = guru.jabatan === 'Tendik'
  const isCheckingThis = checkingStorageFor === guru.id

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => onToggle(guru.id)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isTendik ? 'bg-gradient-to-br from-amber-100 to-orange-100' : 'bg-gradient-to-br from-blue-100 to-primary-100'}`}>
          <GraduationCap className={`w-5 h-5 ${isTendik ? 'text-amber-600' : 'text-primary-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{guru.nama_lengkap}</p>
          <p className="text-xs text-slate-400">{guru.gelar && `${guru.gelar} · `}{guru.nik || 'NIK tidak tersedia'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${files.length > 0 ? (isTendik ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700') : 'bg-slate-100 text-slate-400'}`}>
            {files.length} file
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {/* Pesan ajakan upload */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-700 font-medium">Ini data Anda?</p>
              <p className="text-xs text-blue-600 mt-0.5">Anda dapat menambahkan file dokumen langsung dari sini.</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onClickUpload(guru) }}
              disabled={isCheckingThis}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors flex-shrink-0 disabled:opacity-70"
            >
              {isCheckingThis ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memeriksa...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" /> Upload File</>
              )}
            </button>
          </div>

          {/* Daftar file */}
          {files.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">Belum ada file diupload</p>
          ) : (
            <div className="space-y-2">
              {files.map((file: FileGuru) => (
                <FileRow
                  key={file.id}
                  nama={file.nama_file}
                  fileUrl={file.file_url}
                  fileType={file.file_type}
                  fileSize={file.file_size}
                  createdAt={file.created_at}
                  jenisNama={file.jenis_file?.nama}
                  onPreview={() => onPreview({ nama: file.nama_file, url: file.file_url, type: file.file_type })}
                  onDownload={() => onDownload(file.file_url, file.nama_file)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Komponen FileRow ─────────────────────────────────────────────────────────
function FileRow({ nama, fileUrl, fileType, fileSize, createdAt, jenisNama, onPreview, onDownload }: {
  nama: string; fileUrl: string; fileType: string; fileSize: number; createdAt: string; jenisNama?: string; onPreview: () => void; onDownload: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary-200 transition-colors">
      <span className="text-xl flex-shrink-0">{getFileIcon(fileType)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800 truncate">{nama}</p>
        <p className="text-xs text-slate-400">
          {jenisNama && `${jenisNama} · `}
          {formatBytes(fileSize)} · {format(new Date(createdAt), 'dd MMM yyyy', { locale: localeId })}
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onPreview} className="btn-icon"><Eye className="w-4 h-4" /></button>
        <button onClick={onDownload} className="btn-icon"><Download className="w-4 h-4" /></button>
      </div>
    </div>
  )
}
