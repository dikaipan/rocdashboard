# Restart Flask Server untuk Tools API

## Masalah
Error: `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`

Ini terjadi karena Flask server mengembalikan HTML (`index.html`) bukan JSON saat mengakses `/api/tools`.

## Solusi

### 1. Restart Flask Server

**WAJIB:** Flask server HARUS di-restart setelah menambahkan route baru!

1. **Hentikan Flask server yang sedang berjalan:**
   - Buka terminal yang menjalankan Flask
   - Tekan `Ctrl+C` untuk menghentikan

2. **Jalankan Flask server lagi:**
   ```bash
   python app.py
   ```

3. **Verifikasi route terdaftar:**
   Server akan menampilkan routes yang tersedia. Pastikan `/api/tools` ada di daftar.

### 2. Test Endpoint

Setelah restart, test endpoint dengan:

```bash
# Test GET /api/tools
curl http://localhost:5000/api/tools

# Atau buka di browser:
# http://localhost:5000/api/tools
```

Harus mengembalikan JSON array, bukan HTML.

### 3. Clear Browser Cache

1. Buka DevTools (F12)
2. Klik kanan tombol Refresh
3. Pilih "Empty Cache and Hard Reload"

### 4. Verifikasi Route

Route `/api/tools` sudah terdaftar di:
- `backend/routes/__init__.py` - Import dan register blueprint
- `backend/routes/tools.py` - Route definition
- `backend/services/tool_service.py` - Service logic

### 5. Check Flask Logs

Jika masih error, cek Flask terminal untuk error messages:
```
[ERROR] Failed to get tools: ...
```

## Troubleshooting

### Route tidak ditemukan
- Pastikan Flask server sudah di-restart
- Cek `backend/routes/__init__.py` sudah import `tool_bp`
- Cek `backend/routes/__init__.py` sudah register blueprint dengan `url_prefix='/api'`

### File tidak ditemukan
- Pastikan `data/tools_name.csv` ada
- Cek path di `config.py` benar

### Import error
- Pastikan `backend/services/tool_service.py` ada
- Cek semua import statement benar

## Quick Fix

Jika masih error setelah restart:

1. **Stop Flask server** (Ctrl+C)
2. **Clear Python cache:**
   ```bash
   # Windows
   del /s /q backend\__pycache__
   del /s /q backend\routes\__pycache__
   del /s /q backend\services\__pycache__
   
   # Linux/Mac
   find . -type d -name __pycache__ -exec rm -r {} +
   ```
3. **Start Flask server lagi:**
   ```bash
   python app.py
   ```

