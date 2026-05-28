'use client'

import { createContext, useContext } from 'react'
import type { Pengguna, ProfilSekolah } from '@/types'

interface AppContextType {
  user: Pengguna | null
  profil: ProfilSekolah | null
  refreshProfil: () => void
}

export const AppContext = createContext<AppContextType>({
  user: null,
  profil: null,
  refreshProfil: () => {},
})

export const useApp = () => useContext(AppContext)
