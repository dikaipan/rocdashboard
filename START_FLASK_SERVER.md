# Start Flask Server untuk Tools API

## Masalah
Error "Error fetching tools" terjadi karena **Flask server tidak berjalan**.

## Solusi: Start Flask Server

### Langkah 1: Buka Terminal Baru

Buka PowerShell atau Command Prompt di direktori project:
```powershell
cd D:\rocdash
```

### Langkah 2: Start Flask Server

```bash
python app.py
```

Anda akan melihat output seperti:
```
 * Running on http://0.0.0.0:5000
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit
```

### Langkah 3: Verifikasi Server Berjalan

Di terminal lain, test endpoint:
```powershell
# Test dengan curl (jika tersedia)
curl http://localhost:5000/api/tools

# Atau buka di browser
# http://localhost:5000/api/tools
```

Harus mengembalikan JSON array seperti:
```json
[
  {
    "id": "1",
    "tools_name": "...",
    "current_stock": 23,
    ...
  },
  ...
]
```

### Langkah 4: Refresh Browser

Setelah Flask server berjalan:
1. Buka browser
2. Tekan **Ctrl + Shift + R** (hard refresh)
3. Atau buka DevTools (F12) → Network tab → Disable cache → Refresh

### Langkah 5: Verifikasi di Browser Console

Buka DevTools (F12) → Console tab, seharusnya:
- ✅ Tidak ada error "Error fetching tools"
- ✅ Data tools ter-load
- ✅ Tabel Inventory Tools menampilkan data

## Troubleshooting

### Jika Flask server tidak start:

1. **Check Python installed:**
   ```bash
   python --version
   ```
   Harus Python 3.7+

2. **Check dependencies:**
   ```bash
   pip install flask pandas
   ```

3. **Check file exists:**
   ```bash
   dir data\tools_name.csv
   ```
   File harus ada

4. **Check port 5000 bebas:**
   ```powershell
   netstat -ano | findstr ":5000" | findstr "LISTENING"
   ```
   Jika ada output, kill process tersebut:
   ```powershell
   taskkill /PID <PID> /F
   ```

### Jika endpoint mengembalikan HTML:

1. **Flask server belum di-restart** setelah menambahkan route baru
2. **Route tidak terdaftar** - check `backend/routes/__init__.py`
3. **Cache browser** - hard refresh (Ctrl+Shift+R)

### Jika endpoint mengembalikan error:

1. **Check Flask terminal** untuk error messages
2. **Check file `data/tools_name.csv`** ada dan dapat dibaca
3. **Check permissions** - file harus readable

## Workflow Development

### Terminal 1: Flask Server
```bash
cd D:\rocdash
python app.py
```

### Terminal 2: Frontend Dev (jika perlu)
```bash
cd D:\rocdash\frontend
npm run dev
```

### Terminal 3: Build Frontend (untuk production)
```bash
cd D:\rocdash\frontend
npm run build
```

## Catatan Penting

- ✅ **Flask server HARUS berjalan** untuk API bekerja
- ✅ **Route `/api/tools` sudah terdaftar** di `backend/routes/__init__.py`
- ✅ **File `data/tools_name.csv` sudah ada**
- ✅ **Error handling sudah diperbaiki** untuk memberikan pesan yang lebih jelas

Setelah Flask server berjalan, error seharusnya hilang dan halaman Inventory Tools dapat memuat data dengan benar.

