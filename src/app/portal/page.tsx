'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Download, Eye, FileText, GraduationCap, BookOpen,
  School, FolderArchive, ChevronDown, ChevronRight, X, FolderOpen,
  Upload, CheckCircle2, AlertCircle, Loader2, Clock, ShieldAlert,
  ShieldCheck, Lock, KeyRound, UserCheck, Fingerprint, BadgeCheck
} from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { DataGuru, DataSiswa, FileGuru, FileSiswa, ArsipSekolah, JenisFile, KepalaSekolah, FileKepalaSekolah } from '@/types'

// ─── Konstanta ────────────────────────────────────────────────────────────────
const SESSION_KEY = 'portal_upload_session'
const STORAGE_WARNING_MB = 50
const STORAGE_LIMIT_MB = 1024
const NPSN_SEKOLAH = '69950327'

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

function getUploadSession(): { active: boolean; expired: boolean } {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return { active: false, expired: false }
    const { date } = JSON.parse(raw)
    const today = new Date().toDateString()
    if (date !== today) return { active: false, expired: true }
    return { active: true, expired: false }
  } catch {
    return { active: false, expired: false }
  }
}

function startUploadSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    startedAt: Date.now(),
    date: new Date().toDateString()
  }))
}

interface KepalaSekolahWithFiles extends KepalaSekolah {
  file_kepala_sekolah?: FileKepalaSekolah[]
}

type ActiveTab = 'arsip' | 'kepsek' | 'guru' | 'siswa'

// ─── Layar Verifikasi NPSN ────────────────────────────────────────────────────
function NPSNGate({ profil, onVerified }: { profil: any; onVerified: () => void }) {
  const [npsn, setNpsn] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  function handleVerify() {
    if (!npsn.trim()) return
    setLoading(true)
    setTimeout(() => {
      if (npsn.trim() === NPSN_SEKOLAH) {
        setSuccess(true)
        setTimeout(() => onVerified(), 900)
      } else {
        setError(true)
        setShaking(true)
        setLoading(false)
        setTimeout(() => setShaking(false), 600)
        setTimeout(() => setError(false), 3000)
        setNpsn('')
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }, 800)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-primary-400/20 to-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-500/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-300/10 to-violet-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header sekolah */}
        <div className="text-center mb-8">
          {profil?.logo_url ? (
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-xl mx-auto mb-4">
              <Image src={profil.logo_url} alt="Logo" width={64} height={64} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
              <School className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="font-display font-bold text-slate-800 text-lg leading-tight">
            {profil?.nama_sekolah || 'Portal Arsip Sekolah'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">Portal Dokumen Publik</p>
        </div>

        {/* Card Verifikasi */}
        <div className={`bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-300 ${shaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
          style={shaking ? { animation: 'shake 0.5s ease-in-out' } : {}}
        >
          {/* Gradient top bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary-500 via-violet-500 to-emerald-500" />

          <div className="p-8">
            {/* Icon + Judul */}
            <div className="flex flex-col items-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${
                success
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200'
                  : error
                  ? 'bg-gradient-to-br from-rose-400 to-red-500 shadow-lg shadow-rose-200'
                  : 'bg-gradient-to-br from-primary-500 to-violet-600 shadow-lg shadow-primary-200'
              }`}>
                {success ? (
                  <ShieldCheck className="w-8 h-8 text-white" />
                ) : error ? (
                  <ShieldAlert className="w-8 h-8 text-white" />
                ) : (
                  <Fingerprint className="w-8 h-8 text-white" />
                )}
              </div>

              <h2 className="font-display font-bold text-slate-800 text-xl text-center">
                {success ? 'Akses Diberikan!' : 'Verifikasi Identitas'}
              </h2>
              <p className="text-slate-500 text-sm text-center mt-2 leading-relaxed">
                {success
                  ? 'Selamat datang. Memuat data sekolah...'
                  : error
                  ? 'NPSN yang Anda masukkan tidak valid. Silakan coba lagi.'
                  : 'Portal ini memuat data sensitif warga sekolah. Hanya anggota resmi yang berhak mengaksesnya.'}
              </p>
            </div>

            {/* Pesan info */}
            {!success && !error && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5">
                <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Jika Anda adalah <strong>kepala sekolah, guru, tenaga pendidik, atau siswa</strong> di{' '}
                  <strong>{profil?.nama_sekolah || 'sekolah ini'}</strong>, masukkan{' '}
                  <strong>NPSN Sekolah</strong> untuk melanjutkan.
                </p>
              </div>
            )}

            {/* Input NPSN */}
            {!success && (
              <div className="space-y-3">
                <div className="relative">
                  <KeyRound className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    error ? 'text-rose-400' : 'text-slate-400'
                  }`} />
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 text-center font-display font-bold text-lg tracking-[0.4em] bg-slate-50 placeholder-slate-300 focus:outline-none focus:bg-white transition-all duration-200 ${
                      error
                        ? 'border-rose-300 focus:border-rose-400 text-rose-500'
                        : 'border-slate-200 focus:border-primary-400 text-slate-800'
                    }`}
                    placeholder="••••••••"
                    value={npsn}
                    onChange={e => {
                      setError(false)
                      setNpsn(e.target.value.replace(/\D/g, ''))
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleVerify}
                  disabled={loading || !npsn.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-violet-600 text-white font-semibold text-base shadow-lg shadow-primary-200 hover:shadow-xl hover:from-primary-400 hover:to-violet-500 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Memverifikasi...</>
                  ) : (
                    <><ShieldCheck className="w-5 h-5" /> Verifikasi & Masuk</>
                  )}
                </button>
              </div>
            )}

            {/* Success state */}
            {success && (
              <div className="flex items-center justify-center gap-2 py-3">
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-emerald-600 font-medium">Memuat portal...</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          🔒 Data dijaga kerahasiaannya · Hanya untuk warga sekolah resmi
        </p>
      </div>

      {/* CSS shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}

// ─── Komponen KepsekCard ───────────────────────────────────────────────────────
function KepsekCard({ ks, expandedId, onToggle, onPreview, onDownload }: {
  ks: KepalaSekolahWithFiles
  expandedId: string | null
  onToggle: (id: string) => void
  onPreview: (f: { nama: string; url: string; type: string }) => void
  onDownload: (url: string, nama: string) => void
}) {
  const files = ks.file_kepala_sekolah || []
  const expanded = expandedId === ks.id
  const namaLengkap = ks.gelar ? `${ks.nama_lengkap}, ${ks.gelar}` : ks.nama_lengkap

  return (
    <div className={`card overflow-hidden ${ks.is_active ? 'ring-2 ring-violet-300 ring-offset-1' : ''}`}>
      <button
        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
          ks.is_active
            ? 'bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-700 hover:to-purple-600'
            : 'bg-gradient-to-r from-slate-500 to-slate-400 hover:from-slate-600 hover:to-slate-500'
        }`}
        onClick={() => onToggle(ks.id)}
      >
        {ks.foto_url ? (
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/30 flex-shrink-0">
            <Image src={ks.foto_url} alt={ks.nama_lengkap} width={48} height={48} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white text-sm">{namaLengkap}</p>
            {ks.is_active && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white">
                <BadgeCheck className="w-3 h-3" /> Aktif
              </span>
            )}
          </div>
          <p className="text-xs text-white/70 mt-0.5">
            NIP: {ks.nip || '—'}
            {ks.periode_mulai && ` · ${format(new Date(ks.periode_mulai), 'yyyy', { locale: localeId })}`}
            {ks.periode_selesai
              ? `–${format(new Date(ks.periode_selesai), 'yyyy', { locale: localeId })}`
              : ks.periode_mulai ? '–sekarang' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/25 text-white">
            {files.length} file
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-white/80" /> : <ChevronRight className="w-4 h-4 text-white/80" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-violet-200 bg-violet-50 px-4 pb-4 pt-3">
          {/* Info singkat */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-slate-600">
            {ks.pendidikan_terakhir && (
              <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2 border border-slate-100">
                <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
                <span>{ks.pendidikan_terakhir}</span>
              </div>
            )}
            {ks.no_telepon && (
              <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2 border border-slate-100">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                <span>{ks.no_telepon}</span>
              </div>
            )}
          </div>
          {files.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">Belum ada file diupload</p>
          ) : (
            <div className="space-y-2">
              {files.map(file => (
                <FileRow
                  key={file.id}
                  nama={file.nama_file}
                  fileUrl={file.file_url}
                  fileType={file.file_type}
                  fileSize={file.file_size}
                  createdAt={file.created_at}
                  jenisNama={file.jenis_file?.nama}
                  uploadedBy={file.uploaded_by}
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

// ─── Komponen GuruCard ────────────────────────────────────────────────────────
function GuruCard({ guru, expandedId, onToggle, onPreview, onDownload, onClickUpload, checkingStorageFor }: {
  guru: DataGuru
  expandedId: string | null
  onToggle: (id: string) => void
  onPreview: (f: { nama: string; url: string; type: string }) => void
  onDownload: (url: string, nama: string) => void
  onClickUpload: (guru: DataGuru) => void
  checkingStorageFor: string | null
}) {
  const files = guru.file_guru || []
  const expanded = expandedId === guru.id
  const isTendik = guru.jabatan === 'Tendik'
  const isCheckingThis = checkingStorageFor === guru.id

  return (
    <div className="card overflow-hidden">
      <button
        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
          isTendik
            ? 'bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500'
            : 'bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500'
        }`}
        onClick={() => onToggle(guru.id)}
      >
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{guru.nama_lengkap}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-xs text-white/70">{guru.gelar && `${guru.gelar} · `}{guru.nik || 'NIK tidak tersedia'}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              (guru.status_induk || 'Induk') === 'Induk' ? 'bg-white/30 text-white' : 'bg-black/20 text-white/80'
            }`}>{guru.status_induk || 'Induk'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/25 text-white">
            {files.length} file
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-white/80" /> : <ChevronRight className="w-4 h-4 text-white/80" />}
        </div>
      </button>

      {expanded && (
        <div className={`border-t px-4 pb-4 pt-3 space-y-3 ${isTendik ? 'border-amber-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
          <div className="ml-4 space-y-3">
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
                    uploadedBy={file.uploaded_by}
                    onPreview={() => onPreview({ nama: file.nama_file, url: file.file_url, type: file.file_type })}
                    onDownload={() => onDownload(file.file_url, file.nama_file)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Komponen FileRow ─────────────────────────────────────────────────────────
function FileRow({ nama, fileUrl, fileType, fileSize, createdAt, jenisNama, uploadedBy, onPreview, onDownload }: {
  nama: string; fileUrl: string; fileType: string; fileSize: number; createdAt: string
  jenisNama?: string; uploadedBy?: string | null; onPreview: () => void; onDownload: () => void
}) {
  const isFromPortal = uploadedBy === null || uploadedBy === undefined
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-primary-200 transition-colors shadow-sm">
      <span className="text-xl flex-shrink-0">{getFileIcon(fileType)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-slate-800 truncate">{nama}</p>
          {isFromPortal ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 flex-shrink-0">
              <Upload className="w-2.5 h-2.5" /> Pengguna
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" /> Admin
            </span>
          )}
        </div>
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

// ─── Halaman Utama Portal ─────────────────────────────────────────────────────
export default function PortalPage() {
  const supabase = createClient()

  const [verified, setVerified] = useState(false)
  const [profil, setProfil] = useState<any>(null)
  const [profilLoaded, setProfilLoaded] = useState(false)

  const [kepsekList, setKepsekList] = useState<KepalaSekolahWithFiles[]>([])
  const [guruList, setGuruList] = useState<DataGuru[]>([])
  const [siswaList, setSiswaList] = useState<DataSiswa[]>([])
  const [arsipList, setArsipList] = useState<ArsipSekolah[]>([])
  const [jenisFileList, setJenisFileList] = useState<JenisFile[]>([])
  const [loading, setLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<ActiveTab>('arsip')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterKategori, setFilterKategori] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')
  function openPreview(url: string) { window.open(url, '_blank') }

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
  const [visitCount, setVisitCount] = useState<number | null>(null)

  // Fetch profil sekolah dulu (untuk ditampilkan di layar verifikasi)
  useEffect(() => {
    async function loadProfil() {
      const { data } = await supabase.from('profil_sekolah').select('*').limit(1).single()
      setProfil(data)
      setProfilLoaded(true)
    }
    loadProfil()
  }, [])

  // Fetch semua data setelah verified
  useEffect(() => {
    if (verified) {
      fetchAll()
      trackVisit()
    }
  }, [verified])

  async function fetchAll() {
    setLoading(true)
    const [kepsekRes, guruRes, siswaRes, arsipRes, jenisRes] = await Promise.all([
      supabase.from('kepala_sekolah').select('*, file_kepala_sekolah(*, jenis_file(*))').order('is_active', { ascending: false }).order('periode_mulai', { ascending: false }),
      supabase.from('data_guru').select('*, file_guru(*, jenis_file(*))').order('nama_lengkap'),
      supabase.from('data_siswa').select('*, file_siswa(*, jenis_file(*))').order('nama_lengkap'),
      supabase.from('arsip_sekolah').select('*').order('kategori').order('created_at', { ascending: false }),
      supabase.from('jenis_file').select('*').eq('kategori', 'guru').order('urutan'),
    ])
    setKepsekList(kepsekRes.data || [])
    setGuruList(guruRes.data || [])
    setSiswaList(siswaRes.data || [])
    setArsipList(arsipRes.data || [])
    setJenisFileList(jenisRes.data || [])
    setLoading(false)
  }

  async function trackVisit() {
    await supabase.rpc('increment_visit')
    const { data } = await supabase.from('visit_counter').select('count').eq('id', 1).single()
    if (data) setVisitCount(Number(data.count))
  }

  async function refreshGuru(guruId: string) {
    const { data } = await supabase.from('data_guru').select('*, file_guru(*, jenis_file(*))').eq('id', guruId).single()
    if (data) {
      setGuruList(prev => prev.map(g => g.id === guruId ? data : g))
      setUploadTargetGuru(data)
    }
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
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

  async function handleClickUpload(guru: DataGuru) {
    const session = getUploadSession()
    if (session.expired) { setSessionExpired(true); return }
    setUploadTargetGuru(guru)
    setCheckingStorage(true)
    const [storageRes] = await Promise.all([
      supabase.from('file_guru').select('file_size'),
      new Promise(r => setTimeout(r, 1200)),
    ])
    const usedBytes = ((storageRes.data || []) as any[]).reduce((s: number, f: any) => s + (f.file_size || 0), 0)
    const usedMB = usedBytes / (1024 * 1024)
    const sisaMB = STORAGE_LIMIT_MB - usedMB
    setCheckingStorage(false)
    if (sisaMB < 1) { toast.error('Ruang penyimpanan penuh. Hubungi admin.'); return }
    if (sisaMB < STORAGE_WARNING_MB) toast('Peringatan: ruang penyimpanan hampir penuh!', { icon: '⚠️' })
    if (!session.active) startUploadSession()
    setUploadNama(''); setUploadJenisId(''); setUploadFile(null)
    setShowUploadModal(true)
  }

  async function handleUpload() {
    if (!uploadFile || !uploadNama.trim() || !uploadTargetGuru) { toast.error('Nama file dan file wajib diisi'); return }
    const session = getUploadSession()
    if (!session.active) { setShowUploadModal(false); setSessionExpired(true); return }
    setUploading(true)
    try {
      const ext = uploadFile.name.split('.').pop()
      const path = `${uploadTargetGuru.id}/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage.from('file-guru').upload(path, uploadFile)
      if (storageErr) throw storageErr
      const { data: urlData } = supabase.storage.from('file-guru').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('file_guru').insert({
        guru_id: uploadTargetGuru.id, jenis_file_id: uploadJenisId || null,
        nama_file: uploadNama.trim(), file_url: urlData.publicUrl,
        file_size: uploadFile.size, file_type: uploadFile.type, uploaded_by: null,
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

  // ─── Filter ────────────────────────────────────────────────────────────────
  const filteredGuru = guruList.filter(g =>
    g.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || g.nik?.includes(search)
  )
  const guruOnly = filteredGuru.filter(g => g.jabatan !== 'Tendik')
  const tendikOnly = filteredGuru.filter(g => g.jabatan === 'Tendik')

  const filteredSiswa = siswaList
    .filter(s => filterKelas === 'semua' || s.kelas === filterKelas)
    .filter(s =>
      s.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn?.includes(search) || s.kelas?.toLowerCase().includes(search.toLowerCase())
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

  const filteredKepsek = kepsekList.filter(k =>
    k.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || k.nip?.includes(search)
  )
  const kepsekAktif = filteredKepsek.filter(k => k.is_active)
  const kepsekMantan = filteredKepsek.filter(k => !k.is_active)

  const totalSiswaFiles = siswaList.reduce((sum, s) => sum + (s.file_siswa?.length || 0), 0)

  // Tampilkan loading sampai profil selesai dimuat
  if (!profilLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Tampilkan layar verifikasi NPSN
  if (!verified) {
    return <NPSNGate profil={profil} onVerified={() => setVerified(true)} />
  }

  // ─── Portal utama ──────────────────────────────────────────────────────────
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
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-slate-800 text-base sm:text-lg truncate">
              {profil?.nama_sekolah || 'Portal Arsip Sekolah'}
            </h1>
            <p className="text-xs text-slate-400">Portal Dokumen Publik</p>
          </div>
          {/* Badge terverifikasi */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">Terverifikasi</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <p>
            Portal ini memuat dokumen yang dikelola oleh administrator serta dokumen yang dikirimkan
            secara mandiri oleh pengguna terdaftar. Keabsahan dokumen pihak ketiga menjadi tanggung
            jawab pengunggah masing-masing.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Arsip Sekolah', value: arsipList.length, icon: FolderArchive, color: 'from-violet-500 to-purple-600' },
            { label: 'Kepala Sekolah', value: kepsekList.length, sub: `${kepsekList.filter(k => k.is_active).length} Aktif`, icon: UserCheck, color: 'from-violet-600 to-indigo-600' },
            { label: 'Guru & Tendik', value: guruList.length, sub: `${guruList.filter(g => g.jabatan !== 'Tendik').length} Guru · ${guruList.filter(g => g.jabatan === 'Tendik').length} Tendik`, icon: GraduationCap, color: 'from-blue-500 to-primary-600' },
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

        {/* Tabs + Search */}
        <div className="card p-4 mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {([
              { key: 'arsip', label: 'Arsip Sekolah', icon: FolderArchive, count: arsipList.length, color: 'bg-violet-500' },
              { key: 'kepsek', label: 'Kepala Sekolah', icon: UserCheck, count: kepsekList.length, color: 'bg-purple-600' },
              { key: 'guru', label: 'Guru & Tendik', icon: GraduationCap, count: guruList.length, color: 'bg-primary-500' },
              { key: 'siswa', label: 'Siswa', icon: BookOpen, count: siswaList.length, color: 'bg-emerald-500' },
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
                  activeTab === 'kepsek' ? 'Cari nama kepala sekolah atau NIP...' :
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

        {/* Content */}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-slate-800 truncate">{file.nama_file}</p>
                          {file.uploaded_by ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 flex-shrink-0">
                              <Upload className="w-2.5 h-2.5" /> Pengguna
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {formatBytes(file.file_size)} · {format(new Date(file.created_at), 'dd MMM yyyy', { locale: localeId })}
                          {file.deskripsi && ` · ${file.deskripsi}`}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openPreview(file.file_url)} className="btn-icon">
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

        ) : activeTab === 'kepsek' ? (
          <div className="space-y-6">
            {filteredKepsek.length === 0 ? (
              <div className="card p-10 text-center text-slate-400">
                <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p>Tidak ada data kepala sekolah ditemukan</p>
              </div>
            ) : (
              <>
                {kepsekAktif.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-2 h-5 rounded-full bg-violet-500" />
                      <h2 className="font-display font-bold text-slate-700">Kepala Sekolah Aktif</h2>
                      <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">{kepsekAktif.length}</span>
                    </div>
                    <div className="space-y-3">
                      {kepsekAktif.map(ks => (
                        <KepsekCard key={ks.id} ks={ks} expandedId={expandedId} onToggle={toggleExpand} onPreview={(f) => openPreview(f.url)} onDownload={handleDownload} />
                      ))}
                    </div>
                  </div>
                )}
                {kepsekMantan.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-2 h-5 rounded-full bg-slate-400" />
                      <h2 className="font-display font-bold text-slate-700">Riwayat Kepala Sekolah</h2>
                      <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">{kepsekMantan.length}</span>
                    </div>
                    <div className="space-y-3">
                      {kepsekMantan.map(ks => (
                        <KepsekCard key={ks.id} ks={ks} expandedId={expandedId} onToggle={toggleExpand} onPreview={(f) => openPreview(f.url)} onDownload={handleDownload} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
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
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-2 h-5 rounded-full bg-blue-500" />
                    <h2 className="font-display font-bold text-slate-700">Guru</h2>
                    <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{guruOnly.length}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full ml-1">{guruOnly.filter(g => (g.status_induk || 'Induk') === 'Induk').length} Induk</span>
                    <span className="text-xs bg-rose-100 text-rose-600 font-semibold px-2 py-0.5 rounded-full">{guruOnly.filter(g => g.status_induk === 'Non Induk').length} Non Induk</span>
                  </div>
                  {guruOnly.length === 0 ? (
                    <div className="card p-6 text-center text-slate-400 text-sm">Tidak ada data guru</div>
                  ) : (
                    <div className="space-y-2">
                      {guruOnly.map(guru => (
                        <GuruCard key={guru.id} guru={guru} expandedId={expandedId} onToggle={toggleExpand} onPreview={(f) => openPreview(f.url)} onDownload={handleDownload} onClickUpload={handleClickUpload} checkingStorageFor={checkingStorage ? (uploadTargetGuru?.id ?? null) : null} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-2 h-5 rounded-full bg-amber-500" />
                    <h2 className="font-display font-bold text-slate-700">Tendik</h2>
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{tendikOnly.length}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full ml-1">{tendikOnly.filter(g => (g.status_induk || 'Induk') === 'Induk').length} Induk</span>
                    <span className="text-xs bg-rose-100 text-rose-600 font-semibold px-2 py-0.5 rounded-full">{tendikOnly.filter(g => g.status_induk === 'Non Induk').length} Non Induk</span>
                  </div>
                  {tendikOnly.length === 0 ? (
                    <div className="card p-6 text-center text-slate-400 text-sm">Tidak ada data tendik</div>
                  ) : (
                    <div className="space-y-2">
                      {tendikOnly.map(guru => (
                        <GuruCard key={guru.id} guru={guru} expandedId={expandedId} onToggle={toggleExpand} onPreview={(f) => openPreview(f.url)} onDownload={handleDownload} onClickUpload={handleClickUpload} checkingStorageFor={checkingStorage ? (uploadTargetGuru?.id ?? null) : null} />
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
              const expanded = expandedId === siswa.id
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
                            <FileRow key={file.id} nama={file.nama_file} fileUrl={file.file_url} fileType={file.file_type} fileSize={file.file_size} createdAt={file.created_at} jenisNama={file.jenis_file?.nama} uploadedBy={file.uploaded_by} onPreview={() => openPreview(file.file_url)} onDownload={() => handleDownload(file.file_url, file.nama_file)} />
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

      <footer className="max-w-5xl mx-auto px-4 py-8 mt-4 border-t border-slate-100">
        <div className="flex flex-col items-center gap-3 mb-5">
          <div className="flex items-center gap-3 bg-gradient-to-r from-primary-50 via-violet-50 to-blue-50 border border-primary-100 rounded-2xl px-6 py-4">
            <div className="flex gap-1 items-end">
              {visitCount !== null ? (
                String(visitCount).split('').map((digit, i) => (
                  <span key={i} className="inline-flex items-center justify-center w-7 h-9 bg-white border border-primary-200 rounded-lg text-lg font-display font-bold text-primary-700 shadow-sm">
                    {digit}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center justify-center w-7 h-9 bg-white border border-primary-100 rounded-lg text-slate-200 animate-pulse text-lg">-</span>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700">Total Kunjungan</p>
              <p className="text-xs text-slate-400">di Portal ini</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center">✨ Terima kasih telah mengunjungi portal ini!</p>
        </div>
        <p className="text-center text-xs text-slate-400">{profil?.nama_sekolah} · Portal Dokumen Publik</p>
      </footer>



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
                <p className="text-slate-500 text-sm mt-2">Demi keamanan, sesi upload Anda telah berakhir. Silakan coba lagi besok.</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
                <Clock className="w-4 h-4" />
                <span>Sesi aktif selama 1 hari</span>
              </div>
              <button onClick={() => setSessionExpired(false)} className="btn-secondary w-full">Tutup</button>
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
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Sesi upload aktif · Anda dapat mengupload file selama hari ini</span>
              </div>
              <div>
                <label className="label">Nama File *</label>
                <input className="input" placeholder="Contoh: Ijazah S1, SK Mengajar 2024" value={uploadNama} onChange={e => setUploadNama(e.target.value)} />
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
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOCX (max 50MB)</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowUploadModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadNama.trim()} className="btn-primary flex-1">
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
