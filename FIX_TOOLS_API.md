# Fix Tools API Error

## Error yang Terjadi

1. **`Expected JSON but got: text/html`**
   - Flask server mengembalikan HTML (`index.html`) bukan JSON
   - Route `/api/tools` tidak ditemukan

2. **`ERR_ADDRESS_IN_USE`**
   - Port 5000 memiliki banyak koneksi TIME_WAIT
   - Flask server mungkin crash atau perlu restart

## Penyebab

Flask server **BELUM DI-RESTART** setelah route baru `/api/tools` ditambahkan. Server masih menggunakan kode lama yang tidak memiliki route tersebut, sehingga request ke `/api/tools` di-catch oleh catch-all route yang mengembalikan `index.html`.

## Solusi

### Langkah 1: Stop Flask Server yang Berjalan

**PENTING:** Hentikan Flask server yang sedang berjalan!

1. Buka terminal yang menjalankan Flask server
2. Tekan `Ctrl+C` untuk menghentikan server
3. Tunggu beberapa detik hingga server benar-benar berhenti

### Langkah 2: Clear TIME_WAIT Connections (Opsional)

Jika ada banyak koneksi TIME_WAIT, tunggu beberapa detik atau restart komputer.

### Langkah 3: Restart Flask Server

```bash
# Pastikan berada di direktori root project
cd D:\rocdash

# Start Flask server
python app.py
```

### Langkah 4: Verifikasi Route Terdaftar

Setelah server start, Anda akan melihat output seperti:
```
 * Running on http://0.0.0.0:5000
 * Running on http://127.0.0.1:5000
```

Untuk memastikan route terdaftar, test endpoint:
```bash
# Test di browser atau curl
curl http://localhost:5000/api/tools
```

Harus mengembalikan JSON array, bukan HTML.

### Langkah 5: Clear Browser Cache

1. Buka DevTools (F12)
2. Klik kanan tombol Refresh
3. Pilih "Empty Cache and Hard Reload"

Atau tekan:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

## Verifikasi Route

Route `/api/tools` sudah terdaftar di:
- ✅ `backend/routes/__init__.py` - Import dan register `tool_bp`
- ✅ `backend/routes/tools.py` - Route definition
- ✅ `backend/services/tool_service.py` - Service logic

## Test Endpoint

Setelah restart Flask, test endpoint:

```bash
# Test GET /api/tools
curl http://localhost:5000/api/tools

# Harus mengembalikan JSON seperti:
# [{"id": "1", "tools_name": "...", "current_stock": 23, ...}, ...]
```

## Troubleshooting

### Jika masih error setelah restart:

1. **Check Flask logs:**
   - Lihat terminal Flask untuk error messages
   - Pastikan tidak ada import error

2. **Verify route registration:**
   ```bash
   python -c "from app import create_app; app = create_app(); print([str(rule) for rule in app.url_map.iter_rules() if 'tools' in str(rule)])"
   ```
   Harus menampilkan: `['/api/tools', '/api/tools/<path:tools_name>', '/api/tools/bulk-upsert']`

3. **Check file exists:**
   - Pastikan `data/tools_name.csv` ada
   - Pastikan file dapat dibaca

4. **Clear Python cache:**
   ```bash
   # Windows
   del /s /q backend\__pycache__
   del /s /q backend\routes\__pycache__
   del /s /q backend\services\__pycache__
   ```

5. **Restart Flask lagi:**
   ```bash
   python app.py
   ```

## Workflow yang Benar

### Development:
```bash
# Terminal 1: Flask server
python app.py

# Terminal 2: Vite dev server (jika perlu)
cd frontend
npm run dev
```

### Production:
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Start Flask server
cd ..
python app.py
```

## Catatan Penting

- **SELALU restart Flask server setelah menambahkan route baru**
- **Route API harus terdaftar SEBELUM catch-all route** (sudah benar di `app.py`)
- **Test endpoint langsung setelah restart untuk memastikan bekerja**

