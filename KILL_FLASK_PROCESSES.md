# Kill Multiple Flask Processes

## Masalah
Ada **3 proses Flask** yang berjalan di port 5000 secara bersamaan, menyebabkan konflik.

## Solusi: Hentikan Semua Proses Flask

### Method 1: Kill Process by PID (Recommended)

```powershell
# Kill process dengan PID 57536
taskkill /PID 57536 /F

# Kill process dengan PID 52988
taskkill /PID 52988 /F

# Kill process dengan PID 60004
taskkill /PID 60004 /F
```

### Method 2: Kill All Python Processes (Hati-hati!)

```powershell
# Kill semua proses Python (HATI-HATI - akan kill semua Python!)
taskkill /IM python.exe /F
```

### Method 3: Kill by Port (PowerShell)

```powershell
# Get process ID yang menggunakan port 5000
$process = Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique

# Kill process
foreach ($pid in $process) {
    Stop-Process -Id $pid -Force
}
```

### Method 4: Manual (Safest)

1. Buka Task Manager (Ctrl+Shift+Esc)
2. Cari proses Python
3. Klik kanan → End Task
4. Atau buka Command Prompt sebagai Administrator dan jalankan:
   ```cmd
   taskkill /IM python.exe /F
   ```

## Setelah Kill Process

1. **Tunggu 5-10 detik** untuk port 5000 benar-benar bebas
2. **Verifikasi port bebas:**
   ```powershell
   netstat -ano | findstr ":5000"
   ```
   Seharusnya tidak ada yang LISTENING

3. **Start Flask server lagi:**
   ```bash
   python app.py
   ```

4. **Verifikasi hanya 1 proses yang berjalan:**
   ```powershell
   netstat -ano | findstr ":5000" | findstr "LISTENING"
   ```
   Seharusnya hanya ada 1 proses

## Pencegahan

1. **Selalu stop Flask server dengan benar** (Ctrl+C)
2. **Jangan run multiple Flask server** di terminal berbeda
3. **Check port sebelum start:**
   ```powershell
   netstat -ano | findstr ":5000"
   ```
   Jika sudah ada yang LISTENING, kill process tersebut dulu

## Setelah Restart Flask

1. Test endpoint:
   ```bash
   curl http://localhost:5000/api/tools
   ```
   Harus mengembalikan JSON, bukan HTML

2. Refresh browser dengan hard refresh (Ctrl+Shift+R)

3. Error seharusnya hilang

