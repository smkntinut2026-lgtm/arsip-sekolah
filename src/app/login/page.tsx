'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn, School, MapPin, ExternalLink, ArrowRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ProfilSekolah } from '@/types'
import Image from 'next/image'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profil, setProfil] = useState<ProfilSekolah | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.replace('/dashboard')
      }
    })
    fetchProfil()
  }, [])

  async function fetchProfil() {
    const { data } = await supabase
      .from('profil_sekolah')
      .select('*')
      .limit(1)
      .single()
    if (data) setProfil(data)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message === 'Invalid login credentials'
          ? 'Email atau password salah'
          : error.message)
        setLoading(false)
      } else if (data.session) {
        toast.success('Berhasil masuk!')
        window.location.replace('/dashboard')
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,200,50,0.5); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255,200,50,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,200,50,0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .spmb-banner {
          animation: slide-down 0.6s ease-out forwards;
        }
        .login-card {
          animation: slide-up 0.7s ease-out 0.2s both;
        }
        .spmb-btn {
          background: linear-gradient(135deg, #f59e0b, #ef4444, #ec4899);
          background-size: 200% 200%;
          animation: shimmer 3s linear infinite;
          position: relative;
          overflow: hidden;
        }
        .spmb-btn::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 40%;
          height: 200%;
          background: rgba(255,255,255,0.25);
          transform: skewX(-15deg);
          animation: shimmer-sweep 2.5s ease-in-out infinite;
        }
        @keyframes shimmer-sweep {
          0% { left: -60%; }
          100% { left: 160%; }
        }
        .logo-float {
          animation: float 3s ease-in-out infinite;
        }
        .sparkle-1 { animation: twinkle 2s ease-in-out 0s infinite; }
        .sparkle-2 { animation: twinkle 2s ease-in-out 0.6s infinite; }
        .sparkle-3 { animation: twinkle 2s ease-in-out 1.2s infinite; }

        .banner-bg {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #1e3a8a 100%);
          position: relative;
          overflow: hidden;
        }
        .banner-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 20% 50%, rgba(99,102,241,0.3) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(245,158,11,0.2) 0%, transparent 40%),
                            radial-gradient(circle at 60% 80%, rgba(236,72,153,0.15) 0%, transparent 40%);
        }
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .badge-new {
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
      `}</style>

      <div className="min-h-screen flex flex-col">

        {/* ===== SPMB HEADER BANNER ===== */}
        <div className="spmb-banner banner-bg shadow-2xl">
          <div className="grid-overlay" />

          {/* Decorative sparkles */}
          <div className="absolute top-3 left-[15%] sparkle-1">
            <Sparkles className="w-3 h-3 text-yellow-300 opacity-70" />
          </div>
          <div className="absolute top-5 right-[25%] sparkle-2">
            <Sparkles className="w-2.5 h-2.5 text-pink-300 opacity-60" />
          </div>
          <div className="absolute bottom-4 left-[35%] sparkle-3">
            <Sparkles className="w-3 h-3 text-indigo-300 opacity-50" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">

              {/* Kiri: Logo + Info Sekolah */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Logo */}
                <div className="logo-float flex-shrink-0">
                  {profil?.logo_url ? (
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg shadow-indigo-900/50 bg-white/10 backdrop-blur-sm">
                      <Image
                        src={profil.logo_url}
                        alt="Logo Sekolah"
                        width={56}
                        height={56}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                      <School className="w-7 h-7 text-white" />
                    </div>
                  )}
                </div>

                {/* Nama & Alamat Sekolah */}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-indigo-300 uppercase mb-0.5">
                    Sistem Informasi
                  </p>
                  <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                    {profil?.nama_sekolah || 'Nama Sekolah'}
                  </h1>
                  {profil?.alamat && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-indigo-300 flex-shrink-0" />
                      <p className="text-xs text-indigo-200/80 truncate leading-tight">
                        {profil.alamat}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Kanan: Tombol SPMB */}
              <div className="flex-shrink-0 flex flex-col items-center sm:items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="badge-new inline-flex items-center gap-1 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full inline-block"></span>
                    BUKA SEKARANG
                  </div>
                </div>
                <a
                  href="https://spmb-smk1.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spmb-btn group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-xl shadow-orange-900/30 hover:scale-105 active:scale-95 transition-transform duration-200 select-none"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-base">🎓</span>
                    <span>Pendaftaran SPMB</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                  </span>
                </a>
                <p className="text-[10px] text-indigo-300/60 text-center sm:text-right">
                  Seleksi Penerimaan Murid Baru
                </p>
              </div>

            </div>
          </div>

          {/* Bottom accent line */}
          <div className="relative z-10 h-[3px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
        </div>

        {/* ===== LOGIN SECTION ===== */}
        <div className="flex-1 flex items-center justify-center p-4 relative">

          {/* Background blobs */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
          </div>

          <div className="w-full max-w-md relative z-10 login-card">

            {/* Logo + Nama Sekolah */}
            <div className="text-center mb-8">
              <div className="inline-flex flex-col items-center gap-3">
                {profil?.logo_url ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-card border-2 border-white">
                    <Image src={profil.logo_url} alt="Logo Sekolah" width={80} height={80} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-glow-blue">
                    <School className="w-10 h-10 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-display font-bold text-slate-800">
                    {profil?.nama_sekolah || 'Arsip Sekolah'}
                  </h1>
                  {profil?.npsn && (
                    <p className="text-sm text-slate-500 mt-0.5">NPSN: {profil.npsn}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Card Login */}
            <div className="card p-8">
              <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-slate-800">Selamat Datang</h2>
                <p className="text-slate-500 text-sm mt-1">Masuk ke akun Anda untuk melanjutkan</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-12"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon w-8 h-8"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? <div className="spinner" /> : <LogIn className="w-5 h-5" />}
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-5 space-y-3">

              {/* SPMB mini link di bawah */}
              <div className="flex items-center justify-center">
                <a
                  href="https://spmb-smk1.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 transition-colors duration-200 group"
                >
                  <span>🎓</span>
                  <span>Daftar sebagai siswa baru?</span>
                  <span className="text-primary-600 font-semibold group-hover:underline">
                    Buka SPMB
                  </span>
                  <ArrowRight className="w-3 h-3 text-primary-500 group-hover:translate-x-1 transition-transform duration-200" />
                </a>
              </div>

              <p className="text-center text-xs text-slate-400">
                Sistem Arsip File Digital © {new Date().getFullYear()}
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
