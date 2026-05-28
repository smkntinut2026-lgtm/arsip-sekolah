'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Download, Eye, FileText, GraduationCap, BookOpen,
  School, FolderArchive, ChevronDown, ChevronRight, X
} from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { DataGuru, DataSiswa, FileGuru, FileSiswa } from '@/types'

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
  return '📁'
}

type ActiveTab = 'guru' | 'siswa'

export default function PortalPage() {
  const supabase = createClient()

  const [profil, setProfil] = useState<any>(null)
  const [guruList, setGuruList] = useState<DataGuru[]>([])
  const [siswaList, setSiswaList] = useState<DataSiswa[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('guru')
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<{ nama: string; url: string; type: string } | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [profilRes, guruRes, siswaRes] = await Promise.all([
      supabase.from('profil_sekolah').select('*').limit(1).single(),
      supabase.from('data_guru').select('*, file_guru(*, jenis_file(*))').order('nama_lengkap'),
      supabase.from('data_siswa').select('*, file_siswa(*, jenis_file(*))').order('nama_lengkap'),
    ])
    setProfil(profilRes.data)
    setGuruList(guruRes.data || [])
    setSiswaList(siswaRes.data || [])
    setLoading(false)
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const filteredGuru = guruList.filter(g =>
    g.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
    g.nik?.includes(search)
  )

  const filteredSiswa = siswaList.filter(s =>
    s.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
    s.nisn?.includes(search) ||
    s.kelas?.toLowerCase().includes(search.toLowerCase())
  )

  const totalGuruFiles = guruList.reduce((sum, g) => sum + (g.file_guru?.length || 0), 0)
  const totalSiswaFiles = siswaList.reduce((sum, s) => sum + (s.file_siswa?.length || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Guru', value: guruList.length, icon: GraduationCap, color: 'from-blue-500 to-primary-600' },
            { label: 'File Guru', value: totalGuruFiles, icon: FileText, color: 'from-primary-500 to-violet-600' },
            { label: 'Total Siswa', value: siswaList.length, icon: BookOpen, color: 'from-emerald-500 to-teal-600' },
            { label: 'File Siswa', value: totalSiswaFiles, icon: FolderArchive, color: 'from-amber-500 to-orange-500' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-display font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Tabs */}
        <div className="card p-4 mb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={activeTab === 'guru' ? 'Cari nama guru atau NIK...' : 'Cari nama siswa, NISN, atau kelas...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('guru'); setSearch('') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'guru'
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              File Guru
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'guru' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {guruList.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('siswa'); setSearch('') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'siswa'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              File Siswa
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'siswa' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {siswaList.length}
              </span>
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="card p-10 text-center">
            <div className="spinner spinner-dark mx-auto mb-3" style={{ width: 32, height: 32 }} />
            <p className="text-slate-400">Memuat data...</p>
          </div>
        ) : activeTab === 'guru' ? (
          <div className="space-y-2">
            {filteredGuru.length === 0 ? (
              <div className="card p-10 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p>Tidak ada data guru ditemukan</p>
              </div>
            ) : filteredGuru.map(guru => {
              const files = guru.file_guru || []
              const expanded = expandedIds.has(guru.id)
              return (
                <div key={guru.id} className="card overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => toggleExpand(guru.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-primary-100 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{guru.nama_lengkap}</p>
                      <p className="text-xs text-slate-400">
                        {guru.gelar && `${guru.gelar} · `}
                        {guru.nik || 'NIK tidak tersedia'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        files.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {files.length} file
                      </span>
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      {files.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-3">Belum ada file diupload</p>
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
                              onPreview={() => setPreviewFile({ nama: file.nama_file, url: file.file_url, type: file.file_type })}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          // Siswa
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
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => toggleExpand(siswa.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{siswa.nama_lengkap}</p>
                      <p className="text-xs text-slate-400">
                        {siswa.kelas && `Kelas ${siswa.kelas} · `}
                        {siswa.nisn ? `NISN: ${siswa.nisn}` : 'NISN tidak tersedia'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        files.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {files.length} file
                      </span>
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      {files.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-3">Belum ada file diupload</p>
                      ) : (
                        <div className="space-y-2">
                          {files.map((file: FileSiswa) => (
                            <FileRow
                              key={file.id}
                              nama={file.nama_file}
                              fileUrl={file.file_url}
                              fileType={file.file_type}
                              fileSize={file.file_size}
                              createdAt={file.created_at}
                              jenisNama={file.jenis_file?.nama}
                              onPreview={() => setPreviewFile({ nama: file.nama_file, url: file.file_url, type: file.file_type })}
                            />
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

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-6 mt-4 text-center text-xs text-slate-400 border-t border-slate-100">
        {profil?.nama_sekolah} · Portal Dokumen Publik
      </footer>

      {/* Preview Modal */}
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
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex-1"
                >
                  <Eye className="w-4 h-4" /> Buka / Lihat
                </a>
                <a
                  href={previewFile.url}
                  download
                  className="btn-primary flex-1"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FileRow({
  nama, fileUrl, fileType, fileSize, createdAt, jenisNama, onPreview
}: {
  nama: string
  fileUrl: string
  fileType: string
  fileSize: number
  createdAt: string
  jenisNama?: string
  onPreview: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary-200 transition-colors">
      <span className="text-xl flex-shrink-0">{getFileIcon(fileType)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800 truncate">{nama}</p>
        <p className="text-xs text-slate-400">
          {jenisNama && `${jenisNama} · `}
          {formatBytes(fileSize)} ·{' '}
          {format(new Date(createdAt), 'dd MMM yyyy', { locale: localeId })}
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onPreview} className="btn-icon" title="Lihat">
          <Eye className="w-4 h-4" />
        </button>
        <a href={fileUrl} download className="btn-icon" title="Download">
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
