# 🚀 Deployment Guide - Vercel

## ✅ Perubahan yang Sudah Diterapkan

### 1. Migrasi dari rolldown-vite ke Vite Standar
- ✅ Mengganti `rolldown-vite` dengan `vite@^5.4.21` (standard Vite)
- ✅ Menghapus `overrides` yang memaksa penggunaan rolldown-vite
- ✅ Menghapus dependency `vite-standard` (tidak diperlukan lagi)
- ✅ Memperbarui script `fix-vitest-vite.js` untuk menggunakan Vite standar

### 2. Konfigurasi Build
- ✅ Menambahkan `NODE_ENV=production` ke script build
- ✅ Memastikan mode production di `vite.config.js`
- ✅ Menambahkan logging untuk debugging

### 3. Scripts yang Tersedia
- `npm run clean` - Membersihkan folder dist
- `npm run clean:install` - Membersihkan node_modules, package-lock.json, dan dist
- `npm run build` - Build production dengan Vite standar
- `npm run dev` - Development server

## 📋 Persiapan Deployment

### Untuk Deploy di Vercel

1. **Pastikan perubahan sudah di-commit:**
   ```bash
   git add .
   git commit -m "Fix: Migrate from rolldown-vite to standard Vite"
   git push
   ```

2. **Vercel akan otomatis:**
   - Menjalankan `npm install` (clean install)
   - Menjalankan `npm run build` (production build)
   - Deploy hasil build dari `frontend/dist`

### Untuk Testing Lokal

1. **Clean install (opsional, untuk memastikan fresh install):**
   ```bash
   cd frontend
   npm run clean:install
   npm install
   ```

2. **Build production:**
   ```bash
   npm run build
   ```

3. **Preview build:**
   ```bash
   npm run preview
   ```

## 🔍 Troubleshooting

### Jika build masih gagal di Vercel:

1. **Clear Vercel Build Cache:**
   - Buka project di Vercel dashboard
   - Settings → General → Clear Build Cache
   - Redeploy

2. **Verifikasi package.json:**
   - Pastikan `"vite": "^5.4.21"` (bukan rolldown-vite)
   - Pastikan tidak ada `overrides` untuk vite
   - Pastikan `NODE_ENV=production` di script build

3. **Check Vercel Build Logs:**
   - Pastikan menggunakan Vite standar (bukan rolldown-vite)
   - Pastikan tidak ada error module resolution
   - Pastikan react-router dapat di-resolve dengan benar

### Jika ada error module resolution:

1. **Pastikan menggunakan Vite standar:**
   ```bash
   cd frontend
   npm list vite
   # Should show: vite@5.4.21 (not rolldown-vite)
   ```

2. **Clean install:**
   ```bash
   npm run clean:install
   npm install
   npm run build
   ```

## 📝 Catatan Penting

- ✅ Vite standar (5.4.21) sudah kompatibel dengan react-router v7.9.5
- ✅ Tidak perlu script `fix-build-vite.js` lagi
- ✅ Build akan menggunakan production mode secara otomatis
- ✅ Vitest akan menggunakan Vite standar untuk testing

## 🎯 Next Steps

1. Commit dan push perubahan
2. Deploy ke Vercel
3. Monitor build logs untuk memastikan tidak ada error
4. Test aplikasi setelah deploy

## 📚 Referensi

- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Vercel Deployment](https://vercel.com/docs)

