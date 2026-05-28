'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn, School } from 'lucide-react'
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
    // Cek kalau sudah login, langsung redirect
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
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

        <p className="text-center text-xs text-slate-400 mt-6">
          Sistem Arsip File Digital © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
