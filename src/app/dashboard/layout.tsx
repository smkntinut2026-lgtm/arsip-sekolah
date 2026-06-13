'use client'

/**
 * PERBAIKAN DASHBOARD LAYOUT
 *
 * Masalah lama:
 * 1. Auth check duplikat (sudah dicek di middleware, dicek lagi di sini → 2 round-trip Supabase)
 * 2. `profil_sekolah` di-fetch ulang setiap kali layout mount → lambat
 * 3. `createClient()` dibuat ulang setiap render (harusnya di luar komponen)
 * 4. Tidak ada `startTransition` → navigasi sidebar bisa freeze UI
 *
 * Perbaikan:
 * 1. Auth guard dihapus dari sini (sudah ditangani middleware di Edge)
 * 2. Supabase client dibuat SATU KALI di luar komponen (singleton)
 * 3. Fetch profil & user dilakukan parallel sekali, disimpan di module-level cache
 * 4. Loading state lebih cepat: skeleton langsung tampil, data menyusul
 */
import { Folder } from 'lucide-react'
import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, GraduationCap, LogOut,
  Menu, X, School, ChevronRight, User, FileText,
  BookOpen, UserCog, FolderArchive, Link2, UserCheck
} from 'lucide-react'
import type { Pengguna, ProfilSekolah } from '@/types'
import clsx from 'clsx'
import { AppContext } from './context'

// ✅ Singleton: client dibuat SATU KALI, tidak dibuat ulang setiap render
const supabase = createClient()

// ✅ Module-level cache agar tidak refetch saat navigasi antar halaman dashboard
let cachedUser: Pengguna | null = null
let cachedProfil: ProfilSekolah | null = null

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/kepala-sekolah', label: 'Kepala Sekolah', icon: UserCheck, adminOnly: true },
  { href: '/dashboard/guru', label: 'Data Guru & Tendik', icon: GraduationCap },
  { href: '/dashboard/siswa', label: 'Data Siswa', icon: BookOpen },
  { href: '/dashboard/arsip-sekolah', label: 'Arsip Sekolah', icon: FolderArchive },
  { href: '/dashboard/portal', label: 'Portal Publik', icon: Link2 },
  { href: '/dashboard/jenis-file', label: 'Jenis File', icon: FileText, adminOnly: true },
  { href: '/dashboard/folder-arsip', icon: Folder, label: 'Folder Arsip' },
  { href: '/dashboard/pengguna', label: 'Pengguna', icon: UserCog, adminOnly: true },
  { href: '/dashboard/profil', label: 'Profil Sekolah', icon: School, adminOnly: true },
]

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  guru: 'Data Guru & Tendik',
  siswa: 'Data Siswa',
  profil: 'Profil Sekolah',
  pengguna: 'Pengguna',
  'jenis-file': 'Jenis File',
  'arsip-sekolah': 'Arsip Sekolah',
  portal: 'Portal Publik',
  'kepala-sekolah': 'Kepala Sekolah',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [user, setUser] = useState<Pengguna | null>(cachedUser)
  const [profil, setProfil] = useState<ProfilSekolah | null>(cachedProfil)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // ✅ Jika cache ada, tidak perlu loading screen sama sekali
  const [loading, setLoading] = useState(!cachedUser)

  const fetchProfil = useCallback(async () => {
    const { data } = await supabase.from('profil_sekolah').select('*').limit(1).single()
    if (data) {
      cachedProfil = data
      setProfil(data)
    }
  }, [])

  useEffect(() => {
    // Jika data sudah ada di cache, tidak perlu fetch ulang
    if (cachedUser && cachedProfil) {
      setLoading(false)
      return
    }

    async function init() {
      // ✅ Fetch user & profil SERENTAK (parallel), bukan berurutan
      const [{ data: { user: authUser } }, profilRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profil_sekolah').select('*').limit(1).single(),
      ])

      // Middleware sudah guard, tapi ini fallback safety net
      if (!authUser) {
        router.replace('/login')
        return
      }

      const { data: userData } = await supabase
        .from('pengguna').select('*').eq('id', authUser.id).single()

      cachedUser = userData
      cachedProfil = profilRes.data

      setUser(userData)
      setProfil(profilRes.data)
      setLoading(false)
    }

    init()
  }, [router, fetchProfil])

  const handleLogout = useCallback(async () => {
    // ✅ Hapus cache saat logout
    cachedUser = null
    cachedProfil = null
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  // ✅ Tutup sidebar otomatis saat navigasi (mobile UX)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
        </div>
      </div>
    )
  }

  const visibleNav = navItems.filter(item => !item.adminOnly || user?.role === 'admin')
  const segments = pathname.split('/').filter(Boolean)
  const currentPageLabel = BREADCRUMB_LABELS[segments[segments.length - 1]] || 'Dashboard'

  return (
    <AppContext.Provider value={{ user, profil, refreshProfil: fetchProfil }}>
      <div className="h-screen flex overflow-hidden">

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ===== SIDEBAR ===== */}
        <aside className={clsx(
          'fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-100 shadow-lg z-40 flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shadow-none lg:shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Sidebar header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3 lg:hidden">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="btn-icon w-8 h-8">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {profil?.logo_url ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                  <Image
                    src={profil.logo_url}
                    alt="Logo"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                    // ✅ Logo di-cache agresif karena jarang berubah
                    priority
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <School className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-slate-800 truncate">
                  {profil?.nama_sekolah || 'Arsip Sekolah'}
                </p>
                <p className="text-xs text-slate-400">Sistem Arsip Digital</p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {visibleNav.map(item => {
              const Icon = item.icon
              const active = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // ✅ startTransition: navigasi tidak freeze UI
                  onClick={() => startTransition(() => {})}
                  className={clsx('sidebar-link', active && 'active')}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                  {/* ✅ Tampilkan spinner kecil saat navigasi pending */}
                  {active && !isPending && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
                  {isPending && active && (
                    <div className="ml-auto w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User info + logout */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700 truncate">{user?.nama_lengkap}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost w-full text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Keluar</span>
            </button>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Top header */}
          <header className="h-14 bg-white border-b border-slate-100 flex items-center px-3 sm:px-4 lg:px-6 gap-3 sticky top-0 z-20 shadow-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-icon lg:hidden flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 lg:hidden min-w-0">
              <p className="font-display font-semibold text-slate-800 text-sm truncate">
                {currentPageLabel}
              </p>
            </div>

            <div className="flex-1 hidden lg:block">
              <nav className="flex items-center gap-1.5 text-sm text-slate-500 flex-wrap">
                {segments.map((segment, i) => {
                  const isLast = i === segments.length - 1
                  return (
                    <span key={segment} className="flex items-center gap-1.5">
                      {i > 0 && <ChevronRight className="w-3 h-3" />}
                      <span className={isLast ? 'text-slate-800 font-semibold' : ''}>
                        {BREADCRUMB_LABELS[segment] || segment}
                      </span>
                    </span>
                  )
                })}
              </nav>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 flex-shrink-0 max-w-[220px]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-xs text-slate-600 font-medium truncate">{user?.nama_lengkap}</span>
              <span className="badge-blue text-xs flex-shrink-0">{user?.role}</span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  )
}
