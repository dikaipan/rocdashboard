# Cara Restart Flask Server

## Jika Flask Server Masih Berjalan:

1. **Cari terminal yang menjalankan Flask**
2. **Tekan `Ctrl+C`** untuk menghentikan server
3. **Jalankan lagi:**
   ```bash
   python app.py
   ```

## Atau Restart dari Command Line:

```bash
# Hentikan proses Flask (jika ada)
# Tekan Ctrl+C di terminal Flask

# Jalankan Flask lagi
python app.py
```

## Verifikasi Server Berjalan:

Server akan menampilkan:
```
 * Running on http://0.0.0.0:5000
 * Running on http://127.0.0.1:5000
```

## Setelah Restart:

1. **Buka browser** ke: `http://localhost:5000`
2. **Hard refresh** dengan: `Ctrl+Shift+R` (Windows/Linux) atau `Cmd+Shift+R` (Mac)
3. **Atau clear browser cache** dan refresh

## Troubleshooting:

Jika error masih terjadi setelah restart:
1. Check terminal Flask untuk error messages
2. Verifikasi file ada di `frontend/dist/assets/`
3. Check browser console untuk error details
4. Coba buka langsung: `http://localhost:5000/assets/index-d3VSUkT1.js`

