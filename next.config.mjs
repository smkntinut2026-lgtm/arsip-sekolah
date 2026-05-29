/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Kompresi otomatis semua response (gzip/brotli)
  compress: true,

  // ✅ Hapus X-Powered-By header (sedikit lebih aman + hemat bytes)
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    // ✅ Format modern: WebP & AVIF jauh lebih kecil dari PNG/JPEG
    formats: ['image/avif', 'image/webp'],
    // ✅ Cache gambar di CDN selama 1 tahun
    minimumCacheTTL: 31536000,
  },

  // ✅ HTTP Cache headers agresif untuk aset statis
  async headers() {
    return [
      {
        // JS, CSS, font, gambar: cache 1 tahun (immutable karena Next.js hash nama file)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Favicon & gambar publik: cache 7 hari
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        // Halaman dashboard: jangan di-cache browser agar data selalu fresh
        source: '/dashboard/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },

  // ✅ Optimasi webpack: pisahkan chunk vendor agar browser bisa cache lebih efisien
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Supabase dipisah sendiri (jarang berubah, bisa di-cache lama)
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            priority: 30,
            reuseExistingChunk: true,
          },
          // Library UI (lucide, clsx, date-fns) dipisah
          ui: {
            name: 'ui-libs',
            test: /[\\/]node_modules[\\/](lucide-react|clsx|date-fns|react-hot-toast)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          // xlsx hanya dipakai di halaman tertentu, lazy-load otomatis
          xlsx: {
            name: 'xlsx',
            test: /[\\/]node_modules[\\/]xlsx[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      }
    }
    return config
  },
}

export default nextConfig
