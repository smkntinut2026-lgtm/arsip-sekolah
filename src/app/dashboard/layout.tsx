'use client'

import { useState, useEffect } from 'react'
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

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/kepala-sekolah', label: 'Kepala Sekolah', icon: UserCheck, adminOnly: true },
  { href: '/dashboard/guru', label: 'Data Guru & Tendik', icon: GraduationCap },
  { href: '/dashboard/siswa', label: 'Data Siswa', icon: BookOpen },
  { href: '/dashboard/arsip-sekolah', label: 'Arsip Sekolah', icon: FolderArchive },
  { href: '/dashboard/portal', label: 'Portal Publik', icon: Link2 },
  { href: '/dashboard/jenis-file', label: 'Jenis File', icon: FileText, adminOnly: true },
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
  const supabase = createClient()
  const [user, setUser] = useState<Pengguna | null>(null)
  const [profil, setProfil] = useState<ProfilSekolah | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: userData } = await supabase
      .from('pengguna').select('*').eq('id', authUser.id).single()
    setUser(userData)
    await fetchProfil()
    setLoading(false)
  }

  async function fetchProfil() {
    const { data } = await supabase.from('profil_sekolah').select('*').limit(1).single()
    if (data) setProfil(data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div className="spinner spinner-dark" style={{width: 28, height: 28}} />
        </div>
      </div>
    )
  }

  const visibleNav = navItems.filter(item => !item.adminOnly || user?.role === 'admin')

  // Label halaman aktif untuk header mobile
  const segments = pathname.split('/').filter(Boolean)
  const currentPageLabel = BREADCRUMB_LABELS[segments[segments.length - 1]] || 'Dashboard'

  return (
    <AppContext.Provider value={{ user, profil, refreshProfil: fetchProfil }}>
      <div className="min-h-screen flex">

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
          'lg:translate-x-0 lg:static lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Sidebar header */}
          <div className="p-4 border-b border-slate-100">
            {/* Tombol tutup sidebar (mobile only) */}
            <div className="flex items-center justify-between mb-3 lg:hidden">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="btn-icon w-8 h-8">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {profil?.logo_url ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                  <Image src={profil.logo_url} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
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
                  onClick={() => setSidebarOpen(false)}
                  className={clsx('sidebar-link', active && 'active')}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
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
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top header */}
          <header className="h-14 bg-white border-b border-slate-100 flex items-center px-3 sm:px-4 lg:px-6 gap-3 sticky top-0 z-20 shadow-sm">
            {/* Hamburger – mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-icon lg:hidden flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile: nama halaman aktif */}
            <div className="flex-1 lg:hidden min-w-0">
              <p className="font-display font-semibold text-slate-800 text-sm truncate">
                {currentPageLabel}
              </p>
            </div>

            {/* Desktop: breadcrumb */}
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

            {/* User badge */}
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
