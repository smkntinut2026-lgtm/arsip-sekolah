'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../layout'
import { Plus, Trash2, Edit3, X, Users, Shield, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Pengguna } from '@/types'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function PenggunaPage() {
  const supabase = createClient()
  const { user } = useApp()
  const router = useRouter()

  const [penggunaList, setPenggunaList] = useState<Pengguna[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editItem, setEditItem] = useState<Pengguna | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nama_lengkap: '', email: '', password: '', role: 'staff' as 'admin' | 'staff'
  })
  const [editForm, setEditForm] = useState({
    nama_lengkap: '', role: 'staff' as 'admin' | 'staff'
  })

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/dashboard'); return }
    fetchData()
  }, [user])

  async function fetchData() {
    const { data } = await supabase.from('pengguna').select('*').order('created_at')
    setPenggunaList(data || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.nama_lengkap.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Semua field wajib diisi'); return
    }
    if (form.password.length < 6) {
      toast.error('Password minimal 6 karakter'); return
    }
    setSaving(true)
    try {
      // Create auth user via admin (we'll use signup here, admin can use service role)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            nama_lengkap: form.nama_lengkap,
            role: form.role
          }
        }
      })
      if (authError) throw authError

      // The trigger will create the pengguna record, but update role if needed
      if (authData.user && form.role === 'admin') {
        await supabase.from('pengguna').update({ role: 'admin' }).eq('id', authData.user.id)
      }

      toast.success('Pengguna berhasil ditambahkan')
      setShowModal(false)
      setForm({ nama_lengkap: '', email: '', password: '', role: 'staff' })
      setTimeout(fetchData, 1000)
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambah pengguna')
    }
    setSaving(false)
  }

  async function handleEdit() {
    if (!editForm.nama_lengkap.trim()) { toast.error('Nama wajib diisi'); return }
    setSaving(true)
    const { error } = await supabase.from('pengguna')
      .update({ nama_lengkap: editForm.nama_lengkap, role: editForm.role })
      .eq('id', editItem!.id)
    if (error) { toast.error('Gagal menyimpan'); setSaving(false); return }
    toast.success('Data pengguna diperbarui')
    setShowEditModal(false)
    setEditItem(null)
    setSaving(false)
    fetchData()
  }

  async function handleDelete(id: string, nama: string) {
    if (id === user?.id) { toast.error('Tidak dapat menghapus akun sendiri'); return }
    if (!confirm(`Hapus pengguna "${nama}"? Akun ini tidak akan bisa login lagi.`)) return
    await supabase.from('pengguna').delete().eq('id', id)
    toast.success('Pengguna dihapus')
    fetchData()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Manajemen Pengguna</h1>
          <p className="text-slate-500 text-sm mt-0.5">{penggunaList.length} pengguna terdaftar</p>
        </div>
        <button onClick={() => { setForm({ nama_lengkap: '', email: '', password: '', role: 'staff' }); setShowModal(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Pengguna
        </button>
      </div>

      {/* Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
        <p className="font-semibold mb-1">ℹ️ Peran Pengguna:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <div className="flex items-start gap-2">
            <span className="badge-red mt-0.5">Admin</span>
            <span className="text-blue-700">Akses penuh: kelola data, upload file, atur jenis file, tambah pengguna</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="badge-blue mt-0.5">Staff</span>
            <span className="text-blue-700">Hanya bisa melihat data guru & siswa dan mendownload file</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {penggunaList.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.role === 'admin' ? 'bg-gradient-to-br from-rose-100 to-rose-200' : 'bg-gradient-to-br from-blue-100 to-blue-200'}`}>
                  {p.role === 'admin'
                    ? <Shield className="w-5 h-5 text-rose-600" />
                    : <User className="w-5 h-5 text-blue-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{p.nama_lengkap}</span>
                    {p.id === user?.id && <span className="badge-blue text-xs">Anda</span>}
                    <span className={p.role === 'admin' ? 'badge-red' : 'badge-blue'}>{p.role}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{p.email}</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Bergabung {format(new Date(p.created_at), 'dd MMM yyyy', { locale: localeId })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => {
                    setEditItem(p)
                    setEditForm({ nama_lengkap: p.nama_lengkap, role: p.role })
                    setShowEditModal(true)
                  }} className="btn-icon">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {p.id !== user?.id && (
                    <button onClick={() => handleDelete(p.id, p.nama_lengkap)} className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal-content">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">Tambah Pengguna Baru</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nama Lengkap *</label>
                <input className="input" value={form.nama_lengkap} onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} placeholder="Nama lengkap pengguna" />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@sekolah.sch.id" />
              </div>
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} className="input pr-12" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Minimal 6 karakter" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon w-8 h-8">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Peran *</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}>
                  <option value="staff">Staff (hanya lihat)</option>
                  <option value="admin">Admin (akses penuh)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1">
                  {saving ? <div className="spinner" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Menyimpan...' : 'Tambah'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editItem && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}>
          <div className="modal-content">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">Edit Pengguna</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                <span className="font-semibold">Email:</span> {editItem.email}
              </div>
              <div>
                <label className="label">Nama Lengkap *</label>
                <input className="input" value={editForm.nama_lengkap} onChange={e => setEditForm({ ...editForm, nama_lengkap: e.target.value })} />
              </div>
              <div>
                <label className="label">Peran *</label>
                <select className="input" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                  disabled={editItem.id === user?.id}>
                  <option value="staff">Staff (hanya lihat)</option>
                  <option value="admin">Admin (akses penuh)</option>
                </select>
                {editItem.id === user?.id && <p className="text-xs text-slate-400 mt-1">Tidak dapat mengubah peran akun sendiri</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleEdit} disabled={saving} className="btn-primary flex-1">
                  {saving ? <div className="spinner" /> : null}
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
