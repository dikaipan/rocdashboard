# Fix Build Permission Error

## Error
```
EPERM, Permission denied: \\?\D:\rocdash\frontend\dist\index.html
```

## Penyebab
File di folder `dist/` terkunci oleh proses lain, biasanya:
1. **Flask server** sedang berjalan dan membuka file dari `dist/`
2. **Browser** masih membuka file dari `dist/`
3. **File Explorer** memiliki folder `dist/` terbuka
4. **Text editor** (VS Code, Notepad, dll) membuka file dari `dist/`

## Solusi

### 1. Stop Flask Server (WAJIB)

**Sebelum build, HENTIKAN Flask server:**

```bash
# Di terminal Flask server, tekan:
Ctrl+C
```

### 2. Tutup Program yang Menggunakan dist/

- Tutup browser yang membuka aplikasi
- Tutup File Explorer jika folder `dist/` terbuka
- Tutup text editor jika ada file dari `dist/` terbuka

### 3. Build dengan Script Baru

Script build sekarang akan:
1. Membersihkan folder `dist/` sebelum build
2. Memberikan error message yang jelas jika file terkunci

```bash
cd frontend
npm run build
```

### 4. Jika Masih Error

#### Manual Cleanup:
```bash
# Windows PowerShell
cd frontend
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build
```

#### Atau gunakan script cleanup:
```bash
cd frontend
npm run clean
npm run build
```

### 5. Check Processes (Windows)

```powershell
# Check if Python/Flask is running
Get-Process | Where-Object {$_.ProcessName -like "*python*"}

# Kill Python processes if needed (HATI-HATI!)
# Get-Process python | Stop-Process -Force
```

## Pencegahan

### Workflow yang Benar:

1. **Development:**
   ```bash
   # Terminal 1: Flask server
   python app.py
   
   # Terminal 2: Vite dev server
   cd frontend
   npm run dev
   ```

2. **Production Build:**
   ```bash
   # 1. Stop Flask server (Ctrl+C)
   # 2. Stop Vite dev server (Ctrl+C)
   # 3. Build
   cd frontend
   npm run build
   # 4. Start Flask server again
   python app.py
   ```

## Konfigurasi yang Sudah Diperbaiki

1. **`frontend/vite.config.js`:**
   - `emptyOutDir: false` - Tidak otomatis menghapus dist (dilakukan manual di prebuild)

2. **`frontend/package.json`:**
   - `prebuild` script: Membersihkan dist folder sebelum build
   - `clean` script: Script terpisah untuk cleanup manual

3. **`frontend/scripts/clean-dist.js`:**
   - Script untuk membersihkan dist folder dengan error handling yang baik

## Tips

- **Selalu stop Flask server sebelum build**
- **Gunakan `npm run clean` jika perlu cleanup manual**
- **Jangan buka folder `dist/` di File Explorer saat build**
- **Tutup browser sebelum build jika menggunakan file dari dist**

