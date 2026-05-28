'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from './context'
import {
  GraduationCap, BookOpen, FileText, Users,
  AlertTriangle, TrendingUp, CheckCircle2, HardDrive
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalGuru: number
  totalSiswa: number
  totalFileGuru: number
  totalFileSiswa: number
  guruBelumLengkap: number
  siswaBelumLengkap: number
  storageUsedBytes: number
}

const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024 // 1 GB

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

export default function DashboardPage() {
  const supabase = createClient()
  const { user, profil } = useApp()
  const [stats, setStats] = useState<Stats>({
    totalGuru: 0, totalSiswa: 0, totalFileGuru: 0,
    totalFileSiswa: 0, guruBelumLengkap: 0, siswaBelumLengkap: 0,
    storageUsedBytes: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const [guru, siswa, fileGuru, fileSiswa, jenisGuru, jenisSiswa] = await Promise.all([
      supabase.from('data_guru').select('id', { count: 'exact', head: true }),
      supabase.from('data_siswa').select('id', { count: 'exact', head: true }),
      supabase.from('file_guru').select('file_size'),
      supabase.from('file_siswa').select('file_size'),
      supabase.from('jenis_file').select('id').eq('kategori', 'guru').eq('wajib', true),
      supabase.from('jenis_file').select('id').eq('kategori', 'siswa').eq('wajib', true),
    ])

    // Hitung total storage dari file_size
    const storageGuru = (fileGuru.data || []).reduce((sum, f) => sum + (f.file_size || 0), 0)
    const storageSiswa = (fileSiswa.data || []).reduce((sum, f) => sum + (f.file_size || 0), 0)
    const storageUsedBytes = storageGuru + storageSiswa

    // Check incomplete
    let guruBelumLengkap = 0
    let siswaBelumLengkap = 0

    if (jenisGuru.data && jenisGuru.data.length > 0) {
      const { data: allGuru } = await supabase.from('data_guru').select('id')
      if (allGuru) {
        for (const g of allGuru) {
          const { data: files } = await supabase
            .from('file_guru').select('jenis_file_id').eq('guru_id', g.id)
          const uploadedIds = (files || []).map(f => f.jenis_file_id)
          const missing = jenisGuru.data.some(j => !uploadedIds.includes(j.id))
          if (missing) guruBelumLengkap++
        }
      }
    }

    if (jenisSiswa.data && jenisSiswa.data.length > 0) {
      const { data: allSiswa } = await supabase.from('data_siswa').select('id')
      if (allSiswa) {
        for (const s of allSiswa) {
          const { data: files } = await supabase
            .from('file_siswa').select('jenis_file_id').eq('siswa_id', s.id)
          const uploadedIds = (files || []).map(f => f.jenis_file_id)
          const missing = jenisSiswa.data.some(j => !uploadedIds.includes(j.id))
          if (missing) siswaBelumLengkap++
        }
      }
    }

    setStats({
      totalGuru: guru.count || 0,
      totalSiswa: siswa.count || 0,
      totalFileGuru: (fileGuru.data || []).length,
      totalFileSiswa: (fileSiswa.data || []).length,
      guruBelumLengkap,
      siswaBelumLengkap,
      storageUsedBytes,
    })
    setLoading(false)
  }

  const storagePercent = Math.min((stats.storageUsedBytes / STORAGE_LIMIT_BYTES) * 100, 100)
  const storageColor = storagePercent > 80 ? 'from-rose-400 to-rose-500'
    : storagePercent > 60 ? 'from-amber-400 to-amber-500'
    : 'from-emerald-400 to-emerald-500'
  const storageBg = storagePercent > 80 ? 'bg-rose-50' : storagePercent > 60 ? 'bg-amber-50' : 'bg-emerald-50'
  const storageText = storagePercent > 80 ? 'text-rose-600' : storagePercent > 60 ? 'text-amber-600' : 'text-emerald-600'

  const statCards = [
    {
      label: 'Total Guru', value: stats.totalGuru, icon: GraduationCap,
      color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600',
      href: '/dashboard/guru'
    },
    {
      label: 'Total Siswa', value: stats.totalSiswa, icon: BookOpen,
      color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600',
      href: '/dashboard/siswa'
    },
    {
      label: 'File Guru', value: stats.totalFileGuru, icon: FileText,
      color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600',
      href: '/dashboard/guru'
    },
    {
      label: 'File Siswa', value: stats.totalFileSiswa, icon: FileText,
      color: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600',
      href: '/dashboard/siswa'
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="page-title">
          Selamat Datang, {user?.nama_lengkap?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          {profil?.nama_sekolah ? `${profil.nama_sekolah} — ` : ''}Sistem Arsip File Digital
        </p>
      </div>

      {/* Warning cards */}
      {(stats.guruBelumLengkap > 0 || stats.siswaBelumLengkap > 0) && (
        <div className="space-y-3 mb-8">
          {stats.guruBelumLengkap > 0 && (
            <Link href="/dashboard/guru" className="warning-card block hover:border-amber-300 transition-colors">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Dokumen Guru Belum Lengkap</p>
                <p className="text-amber-700 mt-0.5">
                  <strong>{stats.guruBelumLengkap} guru</strong> belum melengkapi file wajib. Klik untuk melihat detail.
                </p>
              </div>
            </Link>
          )}
          {stats.siswaBelumLengkap > 0 && (
            <Link href="/dashboard/siswa" className="warning-card block hover:border-amber-300 transition-colors">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Dokumen Siswa Belum Lengkap</p>
                <p className="text-amber-700 mt-0.5">
                  <strong>{stats.siswaBelumLengkap} siswa</strong> belum melengkapi file wajib. Klik untuk melihat detail.
                </p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <Link key={i} href={card.href} className="card-hover p-5 block">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.text}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                {loading ? (
                  <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse mb-1" />
                ) : (
                  <p className="text-3xl font-display font-bold text-slate-800">{card.value}</p>
                )}
                <p className="text-sm text-slate-500 mt-0.5">{card.label}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Storage Widget */}
      <div className="card p-6 mb-6">
        <h3 className="font-display font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-slate-500" />
          Kapasitas Penyimpanan
        </h3>
        {loading ? (
          <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className={`text-2xl font-display font-bold ${storageText}`}>
                  {formatBytes(stats.storageUsedBytes)}
                </span>
                <span className="text-slate-400 text-sm ml-1">terpakai</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-sm">
                  Sisa: <strong>{formatBytes(STORAGE_LIMIT_BYTES - stats.storageUsedBytes)}</strong>
                </span>
                <p className="text-xs text-slate-400">dari total 1 GB</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full bg-gradient-to-r ${storageColor} rounded-full transition-all duration-700`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${storageBg} ${storageText} font-medium`}>
                {storagePercent > 80 ? (
                  <><AlertTriangle className="w-3 h-3" /> Hampir penuh ({storagePercent.toFixed(1)}%)</>
                ) : storagePercent > 60 ? (
                  <><AlertTriangle className="w-3 h-3" /> Cukup terpakai ({storagePercent.toFixed(1)}%)</>
                ) : (
                  <><CheckCircle2 className="w-3 h-3" /> Masih aman ({storagePercent.toFixed(1)}%)</>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {stats.totalFileGuru + stats.totalFileSiswa} file total
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="font-display font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            Status Kelengkapan Guru
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">Dokumen Lengkap</span>
                </div>
                <span className="font-bold text-emerald-700">
                  {stats.totalGuru - stats.guruBelumLengkap}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700">Belum Lengkap</span>
                </div>
                <span className="font-bold text-amber-700">{stats.guruBelumLengkap}</span>
              </div>
              {stats.totalGuru > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Progress Kelengkapan</span>
                    <span>{Math.round(((stats.totalGuru - stats.guruBelumLengkap) / stats.totalGuru) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round(((stats.totalGuru - stats.guruBelumLengkap) / stats.totalGuru) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-500" />
            Status Kelengkapan Siswa
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">Dokumen Lengkap</span>
                </div>
                <span className="font-bold text-emerald-700">
                  {stats.totalSiswa - stats.siswaBelumLengkap}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700">Belum Lengkap</span>
                </div>
                <span className="font-bold text-amber-700">{stats.siswaBelumLengkap}</span>
              </div>
              {stats.totalSiswa > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Progress Kelengkapan</span>
                    <span>{Math.round(((stats.totalSiswa - stats.siswaBelumLengkap) / stats.totalSiswa) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-400 to-violet-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round(((stats.totalSiswa - stats.siswaBelumLengkap) / stats.totalSiswa) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick access */}
      <div className="mt-8">
        <h3 className="font-display font-semibold text-slate-600 text-sm uppercase tracking-wider mb-4">
          Akses Cepat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/guru', label: 'Data Guru', icon: GraduationCap, color: 'text-blue-500 bg-blue-50' },
            { href: '/dashboard/siswa', label: 'Data Siswa', icon: BookOpen, color: 'text-violet-500 bg-violet-50' },
            ...(user?.role === 'admin' ? [
              { href: '/dashboard/jenis-file', label: 'Jenis File', icon: FileText, color: 'text-emerald-500 bg-emerald-50' },
              { href: '/dashboard/pengguna', label: 'Pengguna', icon: Users, color: 'text-rose-500 bg-rose-50' },
            ] : []),
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <Link key={i} href={item.href}
                className="card-hover p-4 flex flex-col items-center gap-2 text-center">
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
