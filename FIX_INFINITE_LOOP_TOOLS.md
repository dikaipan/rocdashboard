# Fix Infinite Loop - Tools API

## Masalah
Flask server menerima ratusan request `/api/tools` dalam waktu sangat singkat (1-2 detik), menyebabkan:
- Server overload dengan log spam
- Frontend freezing/lag
- Resource usage tinggi
- Koneksi TIME_WAIT menumpuk

## Penyebab Root Cause

Di `InventoryTools.jsx`, `useEffect` memiliki dependency `[alert]`:

```javascript
useEffect(() => {
  // ... fetch logic ...
}, [alert]);  // ❌ BAD - alert object berubah referensi setiap render
```

**Masalahnya:**
1. Object `alert` dari `useAlert()` hook berubah referensi setiap render
2. Setiap kali `alert` berubah, `useEffect` dijalankan ulang
3. `useEffect` memanggil `fetchTools()` setiap kali dijalankan
4. `fetchTools()` men-trigger re-render karena `setTools()`
5. Re-render membuat `alert` object baru
6. Cycle berulang → **infinite loop**

## Solusi

### 1. Dependency Array yang Benar

```javascript
useEffect(() => {
  // ... fetch logic ...
}, []); // ✅ GOOD - empty array, hanya run sekali saat mount
```

### 2. Fetch In Progress Guard

Mencegah multiple simultaneous fetches:

```javascript
let fetchInProgress = false;

const fetchTools = async () => {
  if (fetchInProgress) {
    console.log('[InventoryTools] Fetch already in progress, skipping');
    return;
  }
  
  fetchInProgress = true;
  try {
    // ... fetch logic ...
  } finally {
    fetchInProgress = false;
  }
};
```

### 3. isMounted Guard

Mencegah state update setelah component unmount:

```javascript
let isMounted = true;

const fetchTools = async () => {
  try {
    if (isMounted) setLoading(true);
    const response = await fetch('/api/tools');
    
    if (!isMounted) return; // Abort if unmounted
    
    // ... process response ...
  } finally {
    if (isMounted) setLoading(false);
  }
};

return () => {
  isMounted = false; // Cleanup
};
```

### 4. Event Listener Debouncing

Debounce rapid event dispatches untuk mencegah spam:

```javascript
let debounceTimeout = null;

const handleDataChange = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  
  debounceTimeout = setTimeout(() => {
    console.log('[InventoryTools] Data change event received, fetching...');
    fetchTools();
  }, 300); // 300ms debounce
};

window.addEventListener('toolDataChanged', handleDataChange);

return () => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  window.removeEventListener('toolDataChanged', handleDataChange);
};
```

## Hasil

### Before (❌ Infinite Loop)
```
[INFO] Loaded 27 tool records
192.168.1.43 - - [10/Nov/2025 11:46:15] "GET /api/tools HTTP/1.1" 200 -
[INFO] Loaded 27 tool records
192.168.1.43 - - [10/Nov/2025 11:46:15] "GET /api/tools HTTP/1.1" 200 -
[INFO] Loaded 27 tool records
192.168.1.43 - - [10/Nov/2025 11:46:15] "GET /api/tools HTTP/1.1" 200 -
... (berulang ratusan kali dalam 1-2 detik)
```

### After (✅ Normal)
```
[INFO] Loaded 27 tool records
192.168.1.43 - - [10/Nov/2025 11:46:15] "GET /api/tools HTTP/1.1" 200 -
(hanya 1 request saat mount)
```

## Verifikasi

1. **Refresh browser** (Ctrl+Shift+R)
2. **Buka Toolbox → Inventory Tools**
3. **Check Flask terminal:**
   - Seharusnya hanya ada **1 request** saat page load
   - Tidak ada request berulang

4. **Check browser Network tab:**
   - Hanya 1 request ke `/api/tools`
   - Tidak ada request loop

5. **Check browser Console:**
   - Tidak ada log berulang
   - Tidak ada error

## Best Practices untuk useEffect

### ❌ BAD - Dependency yang berubah setiap render
```javascript
useEffect(() => {
  fetchData();
}, [alert, confirm, someObject]); // Objects berubah reference
```

### ✅ GOOD - Dependency yang stabil
```javascript
useEffect(() => {
  fetchData();
}, []); // Empty - hanya run sekali

// OR dengan primitive dependencies
useEffect(() => {
  fetchData();
}, [id, status]); // Primitives (string, number, boolean)
```

### ✅ GOOD - Menggunakan callback dari context
```javascript
const { showAlert } = useAlert(); // Stable callback

useEffect(() => {
  fetchData().catch(err => {
    showAlert('Error!'); // Safe to use
  });
}, []); // Empty dependency
```

## Catatan Penting

1. **Always use empty dependency array** untuk fetch yang hanya perlu dijalankan sekali saat mount
2. **Debounce event listeners** untuk mencegah rapid fire
3. **Use isMounted guard** untuk mencegah state update after unmount
4. **Use fetchInProgress guard** untuk mencegah multiple simultaneous requests
5. **Clean up properly** - remove event listeners, clear timeouts

## Rebuild Frontend

Setelah perubahan, rebuild frontend:

```bash
cd frontend
npm run build
```

Atau jika menggunakan dev server (akan auto-reload):
```bash
# Dev server sudah auto-reload
```

Setelah rebuild, infinite loop seharusnya sudah teratasi! 🎉

