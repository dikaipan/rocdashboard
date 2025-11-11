# 🔧 Fix Vercel SPA Routing - 404 NOT_FOUND

## ⚠️ Masalah

Saat mengakses URL langsung seperti `https://rocdashboard.vercel.app/dashboard`, Vercel mengembalikan error 404: NOT_FOUND.

## 🔍 Root Cause

Vercel mengecek apakah file fisik ada terlebih dahulu sebelum menerapkan rewrites. Jika file tidak ada, Vercel mengembalikan 404 sebelum rewrites diterapkan.

## ✅ Solusi

Konfigurasi `vercel.json` dengan rewrite rule yang mengarahkan semua request (kecuali file static dan API) ke `index.html`.

### Konfigurasi `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/machines",
      "destination": "/api/machines.json"
    },
    {
      "source": "/api/engineers",
      "destination": "/api/engineers.json"
    },
    {
      "source": "/api/stock-parts",
      "destination": "/api/stock-parts.json"
    },
    {
      "source": "/api/fsl-locations",
      "destination": "/api/fsl-locations.json"
    },
    {
      "source": "/api/monthly-machines",
      "destination": "/api/monthly-machines.json"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Cara Kerja:

1. **API Rewrites** (di atas): Request ke `/api/*` diarahkan ke file JSON yang sesuai
2. **SPA Fallback** (di bawah): Semua request lainnya diarahkan ke `/index.html`
3. **React Router**: Menangani routing di client-side setelah `index.html` dimuat

### Urutan Pemrosesan Vercel:

1. Vercel mengecek apakah file fisik ada (misalnya `/dashboard/index.html`)
2. Jika tidak ada, Vercel menerapkan rewrites secara berurutan
3. Rewrite pertama yang cocok akan diterapkan
4. Jika tidak ada yang cocok, Vercel mengembalikan 404

### Mengapa Pattern `/(.*)` Bekerja:

- Pattern `/(.*)` menangkap semua request yang tidak cocok dengan API rewrites sebelumnya
- Vercel akan mengarahkan request tersebut ke `/index.html`
- React Router kemudian menangani routing di client-side

## 🚨 Troubleshooting

### Jika Masih 404:

1. **Pastikan `index.html` ada di `frontend/dist/`**
2. **Pastikan `outputDirectory` di `vercel.json` benar**: `"outputDirectory": "frontend/dist"`
3. **Clear Vercel Build Cache** dan redeploy
4. **Pastikan build berhasil** dan `index.html` ter-generate dengan benar

### Verifikasi Build:

```bash
cd frontend
npm run build
ls -la dist/
# Pastikan index.html ada
```

### Verifikasi Deploy:

1. Buka Vercel Dashboard
2. Pilih Project → Deployments
3. Cek build logs untuk memastikan `index.html` ter-deploy
4. Cek file structure di Vercel untuk memastikan `index.html` ada

## 📝 Catatan Penting

- **Static Files**: File di `/assets/*` akan dilayani secara langsung oleh Vercel tanpa melalui rewrites
- **API Files**: File di `/api/*.json` akan dilayani secara langsung jika file ada
- **SPA Routes**: Semua route lainnya (seperti `/dashboard`, `/engineers`, dll) akan diarahkan ke `/index.html`

## 🎯 Expected Result

Setelah deploy:
- ✅ `/dashboard` → Mengarah ke `index.html`, React Router menangani routing
- ✅ `/engineers` → Mengarah ke `index.html`, React Router menangani routing
- ✅ `/machines` → Mengarah ke `index.html`, React Router menangani routing
- ✅ `/assets/*.js` → Dilayani secara langsung (tidak melalui rewrites)
- ✅ `/api/*.json` → Dilayani secara langsung atau melalui rewrites

