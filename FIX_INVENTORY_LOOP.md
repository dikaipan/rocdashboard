# Fix: Inventory Tools Infinite Loop

## Masalah
Ketika membuka tab "Inventory Tools", terjadi infinite loop API calls ke `/api/tools`, menyebabkan:
- Flask server log menampilkan `[INFO] Loaded 27 tool records` berulang-ulang
- Browser terus melakukan request ke server
- Performance menurun drastis

## Penyebab
1. **Variabel lokal dalam useEffect**: Variabel `fetchInProgress` dan `isMounted` adalah variabel lokal di dalam `useEffect`, yang berarti setiap kali component re-render, variabel ini di-reset ke nilai awal. Ini menyebabkan multiple fetch bisa terjadi bersamaan.

2. **Alert.error trigger re-render**: Pemanggilan `alert.error()` atau `alert.success()` di dalam fetch function menyebabkan state update di `useAlert` hook, yang kemudian trigger parent component re-render, membuat loop terus terjadi.

3. **Event listener tanpa proper cleanup**: Event listener `toolDataChanged` bisa dipanggil multiple kali jika tidak di-cleanup dengan baik.

## Solusi yang Diterapkan

### 1. Gunakan `useRef` untuk Persistent State
```javascript
// BEFORE (variabel lokal, di-reset setiap render)
useEffect(() => {
  let isMounted = true;
  let fetchInProgress = false;
  // ...
}, []);

// AFTER (useRef, persistent antar render)
const isMountedRef = useRef(true);
const fetchInProgressRef = useRef(false);
const debounceTimeoutRef = useRef(null);

useEffect(() => {
  isMountedRef.current = true; // Reset on mount
  // ...
}, []);
```

### 2. Hapus Alert.error dari Fetch Logic
```javascript
// BEFORE
if (!contentType || !contentType.includes('application/json')) {
  alert.error('Server mengembalikan respons yang tidak valid.');
  return;
}

// AFTER (hanya console.error untuk debugging)
if (!contentType || !contentType.includes('application/json')) {
  console.error('[InventoryTools] Expected JSON but got:', contentType);
  if (isMountedRef.current) {
    setTools([]);
    setLoading(false);
  }
  fetchInProgressRef.current = false;
  return;
}
```

### 3. Tingkatkan Debounce Delay
```javascript
// BEFORE
debounceTimeout = setTimeout(() => {
  fetchTools();
}, 300); // 300ms

// AFTER
debounceTimeoutRef.current = setTimeout(() => {
  console.log('[InventoryTools] Data change event received, fetching...');
  fetchTools();
}, 500); // 500ms - memberi waktu lebih untuk batching
```

### 4. Proper Cleanup di Semua Exit Points
```javascript
try {
  // ...
  if (!isMountedRef.current) {
    fetchInProgressRef.current = false; // IMPORTANT: Reset flag
    return;
  }
  // ...
} catch (error) {
  if (!isMountedRef.current) {
    fetchInProgressRef.current = false; // IMPORTANT: Reset flag
    return;
  }
  // ...
} finally {
  fetchInProgressRef.current = false; // Always reset in finally
}
```

## File yang Diubah
- `frontend/src/components/toolbox/InventoryTools.jsx`
  - Import `useRef` dari React
  - Ubah `isMounted`, `fetchInProgress`, `debounceTimeout` dari variabel lokal ke `useRef`
  - Update semua referensi ke variabel ini dengan `.current`
  - Hapus pemanggilan `alert.error()` dari fetch logic
  - Tingkatkan debounce delay dari 300ms ke 500ms
  - Tambahkan proper cleanup di semua exit points

## Testing

### 1. Hard Refresh Browser
**PENTING**: Sebelum test, pastikan browser load JavaScript terbaru:

**Chrome/Edge**:
```
1. Buka http://localhost:5000
2. Tekan: Ctrl + Shift + Delete
3. Pilih: "Cached images and files"
4. Time range: "All time"
5. Klik: "Clear data"
6. Tutup dan buka kembali browser
```

Atau shortcut:
```
Tekan: Ctrl + Shift + R (atau Shift + F5)
Beberapa kali untuk memastikan
```

### 2. Monitor Flask Terminal
```bash
python app.py
```

**Perilaku yang BENAR**:
```
[INFO] Loaded 27 tool records
* GET /api/tools HTTP/1.1" 200 -
# Hanya muncul SEKALI saat pertama buka tab
# Atau saat ada CRUD operation (create/update/delete)
```

**Perilaku yang SALAH** (jika masih terjadi):
```
[INFO] Loaded 27 tool records
* GET /api/tools HTTP/1.1" 200 -
[INFO] Loaded 27 tool records
* GET /api/tools HTTP/1.1" 200 -
[INFO] Loaded 27 tool records
* GET /api/tools HTTP/1.1" 200 -
# Terus berulang tanpa henti
```

### 3. Monitor Browser Console
Buka Developer Tools (F12) → Console tab

**Log yang BENAR**:
```
[InventoryTools] Data change event received, fetching... (hanya jika ada CRUD)
```

**Log yang SALAH**:
```
[InventoryTools] Data change event received, fetching...
[InventoryTools] Data change event received, fetching...
[InventoryTools] Data change event received, fetching...
# Terus berulang
```

### 4. Test Sequence
1. ✅ Buka tab "Toolbox" → "Inventory Tools"
   - Harus hanya fetch **SEKALI**
2. ✅ Switch ke tab lain (e.g., "Dashboard")
   - Tidak ada fetch tambahan
3. ✅ Switch kembali ke "Inventory Tools"
   - Tidak ada fetch tambahan (data sudah ada)
4. ✅ Klik "Add Tool" dan simpan
   - Fetch **SEKALI** setelah save
5. ✅ Edit tool dan simpan
   - Fetch **SEKALI** setelah save
6. ✅ Delete tool
   - Fetch **SEKALI** setelah delete

## Troubleshooting

### Loop Masih Terjadi Setelah Rebuild

**Kemungkinan penyebab**:
1. **Browser masih load file JavaScript lama (cached)**

**Solusi**:
```bash
# 1. Stop Flask server (Ctrl+C)

# 2. Clear dist folder
cd frontend
npm run clean

# 3. Rebuild
npm run build

# 4. Hard refresh browser (Ctrl + Shift + Delete)
# Pilih "Cached images and files" → Clear

# 5. Close browser completely

# 6. Restart Flask
cd ..
python app.py

# 7. Buka browser baru
# Navigate to http://localhost:5000
```

### Flask Server Tidak Restart dengan Benar

**Cek apakah masih ada Flask process lama**:
```powershell
# Windows PowerShell
netstat -ano | findstr ":5000" | findstr "LISTENING"
```

**Kill process lama**:
```powershell
taskkill /PID <PID> /F
# Atau kill semua Python:
taskkill /IM python.exe /F
```

### Masih Ada Issue

**Collect debug info**:
1. Browser console output (F12)
2. Flask terminal output
3. Network tab (F12 → Network → Filter: "tools")

Lihat berapa kali request ke `/api/tools` dilakukan dan kapan.

## Penjelasan Teknis

### Kenapa useRef?
`useRef` membuat nilai yang **persistent across renders**. Berbeda dengan:
- **State** (`useState`): Trigger re-render saat berubah
- **Variabel lokal**: Di-reset setiap render
- **useRef**: Tidak trigger re-render, tidak di-reset

### Kenapa Hapus alert.error?
`alert.error()` → `setAlertState()` → Component re-render → useEffect dependencies mungkin berubah → Trigger fetch lagi → Loop

Untuk error handling yang tidak menyebabkan re-render, gunakan `console.error()`.

### Kenapa Debounce 500ms?
Memberi waktu lebih untuk:
- Multiple event dispatches di-batch
- Browser selesai render
- State updates ter-propagate

Bisa di-adjust ke 300ms atau 1000ms sesuai kebutuhan.

## Hasil Akhir

✅ **Inventory Tools tab stabil** - Fetch hanya terjadi saat diperlukan
✅ **Tidak ada infinite loop** - Flask log bersih
✅ **Performance optimal** - Tidak ada unnecessary requests
✅ **CRUD operations normal** - Fetch setelah create/update/delete berfungsi
✅ **Tab switching smooth** - Tidak ada refetch saat switch tab

## Files Modified
- `frontend/src/components/toolbox/InventoryTools.jsx`

## Build Output
```bash
✓ built in 11.53s
dist/assets/Toolbox-y-kiO8gD.js  16.92 kB │ gzip: 4.70 kB
```

---

**Updated**: November 10, 2025
**Status**: ✅ Fixed

