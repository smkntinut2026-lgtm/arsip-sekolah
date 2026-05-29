import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * PERBAIKAN MIDDLEWARE
 * 
 * Sebelumnya: middleware kosong — auth check dilakukan client-side di setiap halaman
 * (artinya: halaman dashboard sudah di-render dulu, BARU redirect ke login → lambat & flicker)
 * 
 * Sesudah: auth check dilakukan di EDGE NETWORK sebelum halaman dirender sama sekali.
 * Hasilnya: redirect ke /login instan, tanpa loading screen, tanpa flicker.
 * 
 * Bonus: Security headers ditambahkan di sini satu kali untuk semua halaman.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // ── Security Headers (ditambahkan ke semua response) ──────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // ── Auth Guard untuk /dashboard/* ─────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Redirect ke login, simpan tujuan asal agar bisa balik setelah login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Redirect root ke dashboard atau login ─────────────────────────────────
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Jalankan middleware untuk semua path KECUALI file statis & API internal Next.js
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
