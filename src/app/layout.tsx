/**
 * PERBAIKAN layout.tsx (root)
 *
 * Masalah lama:
 * ❌ Font Google dimuat via @import di CSS — render-blocking!
 *    Browser harus: parse HTML → download CSS → parse CSS → temukan @import
 *    → baru request font. Ini urutan yang panjang.
 *
 * ✅ Perbaikan:
 *    - preconnect ke fonts.googleapis.com & fonts.gstatic.com LEBIH AWAL
 *      (browser buka koneksi TCP+TLS sebelum tahu URL font sebenarnya)
 *    - <link rel="stylesheet"> langsung di <head> HTML, bukan di dalam CSS
 *    - display=swap sudah ada di URL, teks muncul pakai fallback font dulu
 *
 * Dampak: First Contentful Paint (FCP) bisa turun 200-500ms
 */

import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Arsip Sekolah',
  description: 'Sistem Arsip Digital Sekolah',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/* ✅ Preconnect: buka koneksi ke Google Fonts sedini mungkin */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* ✅ Load font stylesheet langsung di <head>, lebih awal dari CSS @import */}
        {/* display=swap memastikan teks tidak invisible saat font belum siap */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* ✅ DNS prefetch sebagai fallback tambahan */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            // ✅ Kurangi durasi default agar tidak ganggu UX lama
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
