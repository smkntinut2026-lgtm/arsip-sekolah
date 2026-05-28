'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../context'
import { Plus, Trash2, Edit3, X, FileText, GraduationCap, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import type { JenisFile } from '@/types'
import { useRouter } from 'next/navigation'

export default function JenisFilePage() {
  const supabase = createClient()
  const { user } = useApp()
  const router = useRouter()

  const [jenisFileList, setJenisFileList] = useState<JenisFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<JenisFile | null>(null)
  const [form, setForm] = useState({ nama: '', kategori: 'guru' as 'guru' | 'siswa', wajib: false, urutan: 0 })
  const [activeTab, setActiveTab] = useState<'guru' | 'siswa'>('guru')

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/dashboard'); return }
    fetchData()
  }, [user])

  async function fetchData() {
    const { data } = await supabase.from('jenis_file').select('*').order('kategori').order('urutan')
    setJenisFileList(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.nama.trim()) { toast.error('Nama wajib diisi'); return }
    const urutan = form.urutan || (jenisFileList.filter(j => j.kategori === form.kategori).length + 1)

    if (editItem) {
      const { error } = await supabase.from('jenis_file').update({ ...form, urutan }).eq('id', editItem.id)
      if (error) { toast.error('Gagal menyimpan'); return }
      toast.success('Jenis file diperbarui')
    } else {
      const { error } = await supabase.from('jenis_file').insert({ ...form, urutan })
      if (error) { toast.error('Gagal menyimpan'); return }
      toast.success('Jenis file ditambahkan')
    }
    setShowModal(false)
    setEditItem(null)
    setForm({ nama: '', kategori: 'guru', wajib: false, urutan: 0 })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus jenis file ini? File yang sudah di-upload tidak akan terpengaruh.')) return
    await supabase.from('jenis_file').delete().eq('id', id)
    toast.success('Jenis file dihapus')
    fetchData()
  }

  const guruFiles = jenisFileList.filter(j => j.kategori === 'guru')
  const siswaFiles = jenisFileList.filter(j => j.kategori === 'siswa')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Jenis File</h1>
          <p className="text-slate-500 text-sm mt-0.5">Kelola jenis dokumen yang harus dilengkapi</p>
        </div>
        <button onClick={() => { setEditItem(null); setForm({ nama: '', kategori: activeTab, wajib: false, urutan: 0 }); setShowModal(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Jenis File
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'guru' as const, label: 'Guru', icon: GraduationCap, count: guruFiles.length },
          { key: 'siswa' as const, label: 'Siswa', icon: BookOpen, count: siswaFiles.length },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${activeTab === tab.key ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-300 hover:text-primary-600'}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* File list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (activeTab === 'guru' ? guruFiles : siswaFiles).length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium">Belum ada jenis file untuk {activeTab}</p>
            <p className="text-sm mt-1">Klik "Tambah Jenis File" untuk mulai</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {(activeTab === 'guru' ? guruFiles : siswaFiles).map((item, index) => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0 font-bold text-primary-700 text-sm">
                  {item.urutan || index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{item.nama}</span>
                    {item.wajib && (
                      <span className="badge-red text-xs">Wajib</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    Dokumen {item.kategori} · Urutan {item.urutan || index + 1}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => {
                    setEditItem(item)
                    setForm({ nama: item.nama, kategori: item.kategori, wajib: item.wajib, urutan: item.urutan })
                    setShowModal(true)
                  }} className="btn-icon">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="btn-icon text-rose-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
        <p className="font-semibold mb-1">ℹ️ Informasi:</p>
        <ul className="space-y-1 text-blue-700 list-disc list-inside">
          <li>Jenis file <strong>Wajib</strong> akan memunculkan peringatan jika belum diupload</li>
          <li>Jenis file tidak wajib tetap bisa diupload tapi tidak mempengaruhi status kelengkapan</li>
          <li>Menghapus jenis file tidak akan menghapus file yang sudah diupload</li>
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal-content">
            <div className="gradient-header p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-display font-bold text-lg">
                {editItem ? 'Edit Jenis File' : 'Tambah Jenis File'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nama Jenis File *</label>
                <input className="input" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Ijazah Terakhir, Akta Kelahiran" />
              </div>
              <div>
                <label className="label">Kategori *</label>
                <select className="input" value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value as any })}>
                  <option value="guru">Guru</option>
                  <option value="siswa">Siswa</option>
                </select>
              </div>
              <div>
                <label className="label">Urutan Tampil</label>
                <input type="number" className="input" value={form.urutan}
                  onChange={e => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
                  placeholder="0 = otomatis" min="0" />
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={form.wajib}
                    onChange={e => setForm({ ...form, wajib: e.target.checked })} />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary-500 transition-colors duration-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
                <div>
                  <p className="font-medium text-slate-700 text-sm">File Wajib</p>
                  <p className="text-xs text-slate-400">Memunculkan peringatan jika belum diupload</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleSave} className="btn-primary flex-1">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
