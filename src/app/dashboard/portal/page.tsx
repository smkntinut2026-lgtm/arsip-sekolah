'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../context'
import {
  Link2, Copy, CheckCheck, ExternalLink, GraduationCap,
  BookOpen, Eye, Share2, QrCode, Globe, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PortalLinkPage() {
  const { profil } = useApp()
  const supabase = createClient()
  const [copied, setCopied] = useState(false)
  const [portalUrl, setPortalUrl] = useState('')
  const [guruCount, setGuruCount] = useState(0)
  const [siswaCount, setSiswaCount] = useState(0)
  const [guruFileCount, setGuruFileCount] = useState(0)
  const [siswaFileCount, setSiswaFileCount] = useState(0)

  useEffect(() => {
    setPortalUrl(window.location.origin + '/portal')
    fetchStats()
  }, [])

  async function fetchStats() {
    const [guruRes, siswaRes, fgRes, fsRes] = await Promise.all([
      supabase.from('data_guru').select('id', { count: 'exact', head: true }),
      supabase.from('data_siswa').select('id', { count: 'exact', head: true }),
      supabase.from('file_guru').select('id', { count: 'exact', head: true }),
      supabase.from('file_siswa').select('id', { count: 'exact', head: true }),
    ])
    setGuruCount(guruRes.count || 0)
    setSiswaCount(siswaRes.count || 0)
    setGuruFileCount(fgRes.count || 0)
    setSiswaFileCount(fsRes.count || 0)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    toast.success('Link berhasil disalin!')
    setTimeout(() => setCopied(false), 3000)
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `Portal Arsip - ${profil?.nama_sekolah || 'Sekolah'}`,
        text: 'Silakan akses portal dokumen sekolah melalui link berikut:',
        url: portalUrl,
      })
    } else {
      handleCopy()
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Portal Publik</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Bagikan link ini kepada siapa saja yang membutuhkan akses ke dokumen sekolah
        </p>
      </div>

      {/* Link Card */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-slate-800">Link Portal Dokumen</h2>
            <p className="text-sm text-slate-400">Dapat diakses tanpa perlu login</p>
          </div>
        </div>

        {/* URL display */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
          <Link2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <span className="flex-1 text-sm font-mono text-slate-700 truncate">{portalUrl}</span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopy} className={`btn-primary flex-1 ${copied ? 'from-emerald-500 to-emerald-600' : ''}`}>
            {copied ? (
              <><CheckCheck className="w-4 h-4" /> Tersalin!</>
            ) : (
              <><Copy className="w-4 h-4" /> Salin Link</>
            )}
          </button>
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex-1"
          >
            <Eye className="w-4 h-4" /> Preview Portal
          </a>
          <button onClick={handleShare} className="btn-secondary">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Bagikan</span>
          </button>
        </div>
      </div>

      {/* Stats preview */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-display font-bold text-slate-800">{guruCount}</p>
            <p className="text-xs text-slate-400">Guru & Tendik · {guruFileCount} file</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-display font-bold text-slate-800">{siswaCount}</p>
            <p className="text-xs text-slate-400">Siswa · {siswaFileCount} file</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="card p-5 bg-blue-50 border-blue-100">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-sm text-blue-800">
            <p className="font-semibold">Cara menggunakan Portal Publik:</p>
            <ul className="space-y-1 text-blue-700 list-disc list-inside">
              <li>Salin link di atas dan bagikan via WhatsApp, email, atau media lain</li>
              <li>Penerima dapat langsung membuka link tanpa perlu login</li>
              <li>Portal menampilkan semua file guru, tendik, dan siswa yang sudah diupload</li>
              <li>Setiap file dapat dilihat langsung atau didownload</li>
              <li>Portal otomatis menampilkan data terbaru setiap saat</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
