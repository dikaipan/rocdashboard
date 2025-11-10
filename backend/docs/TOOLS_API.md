# Tools Inventory API Documentation

## Overview
API untuk mengelola inventory tools dari file `stock_detail.csv`.

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### 1. Get All Tools
**GET** `/api/tools`

Mengambil semua tools dengan optional filtering dan pagination.

#### Query Parameters
- `page` (optional, integer): Halaman untuk pagination
- `per_page` (optional, integer): Jumlah item per halaman
- `search` (optional, string): Kata kunci untuk pencarian (tools_name, description, stock_detail, remark)

#### Response
```json
[
  {
    "id": "Screw Driver #6300",
    "tools_name": "Screw Driver #6300",
    "current_stock": 10,
    "stock_new": 5,
    "stock_old": 5,
    "stock_detail": "Detail specification...",
    "photo": "base64_or_url",
    "uom": "Pcs",
    "remark": "Remark text",
    "description": "Detail specification...",
    "Part Name": "Screw Driver #6300",
    "Detail Specification": "Detail specification...",
    "Picture": "base64_or_url",
    "Total": 10,
    "NEW": 5,
    "OLD": 5,
    "UOM": "Pcs",
    "Remark": "Remark text"
  }
]
```

#### Example
```bash
# Get all tools
curl http://localhost:5000/api/tools

# Search tools
curl "http://localhost:5000/api/tools?search=screw"

# With pagination
curl "http://localhost:5000/api/tools?page=1&per_page=10"
```

---

### 2. Get Tool by Name
**GET** `/api/tools/<tools_name>`

Mengambil tool tertentu berdasarkan Part Name.

#### Path Parameters
- `tools_name` (required, string): Part Name dari tool

#### Response
```json
{
  "id": "Screw Driver #6300",
  "tools_name": "Screw Driver #6300",
  "current_stock": 10,
  "stock_new": 5,
  "stock_old": 5,
  "stock_detail": "Detail specification...",
  "photo": "base64_or_url",
  "uom": "Pcs",
  "remark": "Remark text",
  "description": "Detail specification...",
  "Part Name": "Screw Driver #6300",
  "Detail Specification": "Detail specification...",
  "Picture": "base64_or_url",
  "Total": 10,
  "NEW": 5,
  "OLD": 5,
  "UOM": "Pcs",
  "Remark": "Remark text"
}
```

#### Example
```bash
curl http://localhost:5000/api/tools/Screw%20Driver%20%236300
```

---

### 3. Create New Tool
**POST** `/api/tools`

Membuat tool baru.

#### Request Body
```json
{
  "tools_name": "Screw Driver #6300",
  "current_stock": 10,
  "stock_new": 5,
  "stock_old": 5,
  "stock_detail": "Detail specification...",
  "photo": "base64_or_url",
  "uom": "Pcs",
  "remark": "Remark text",
  "description": "Detail specification...",
  "location": "Gudang A, Rak 3"
}
```

#### Required Fields
- `tools_name` (string): Part Name (required)

#### Optional Fields
- `current_stock` (integer): Total stock (default: 0)
- `stock_new` (integer): New stock (default: 0)
- `stock_old` (integer): Old stock (default: 0)
- `stock_detail` (string): Detail specification
- `photo` (string): Photo URL or base64
- `uom` (string): Unit of Measure (default: "Pcs")
- `remark` (string): Remark
- `description` (string): Description (same as stock_detail)
- `location` (string): Location (not saved to CSV)

#### Response
```json
{
  "ok": true,
  "message": "Tool created successfully"
}
```

#### Example
```bash
curl -X POST http://localhost:5000/api/tools \
  -H "Content-Type: application/json" \
  -d '{
    "tools_name": "Screw Driver #6300",
    "current_stock": 10,
    "stock_new": 5,
    "stock_old": 5,
    "stock_detail": "Detail specification...",
    "uom": "Pcs"
  }'
```

---

### 4. Update Tool
**PUT** `/api/tools/<tools_name>`

Update tool yang sudah ada.

#### Path Parameters
- `tools_name` (required, string): Part Name dari tool yang akan di-update

#### Request Body
```json
{
  "tools_name": "Screw Driver #6300",
  "current_stock": 15,
  "stock_new": 8,
  "stock_old": 7,
  "stock_detail": "Updated specification...",
  "photo": "base64_or_url",
  "uom": "Pcs",
  "remark": "Updated remark"
}
```

#### Response
```json
{
  "ok": true,
  "message": "Tool updated successfully"
}
```

#### Example
```bash
curl -X PUT http://localhost:5000/api/tools/Screw%20Driver%20%236300 \
  -H "Content-Type: application/json" \
  -d '{
    "current_stock": 15,
    "stock_new": 8,
    "stock_old": 7
  }'
```

---

### 5. Delete Tool
**DELETE** `/api/tools/<tools_name>`

Menghapus tool.

#### Path Parameters
- `tools_name` (required, string): Part Name dari tool yang akan dihapus

#### Response
```json
{
  "ok": true,
  "message": "Tool deleted successfully"
}
```

#### Example
```bash
curl -X DELETE http://localhost:5000/api/tools/Screw%20Driver%20%236300
```

---

### 6. Bulk Upsert Tools
**POST** `/api/tools/bulk-upsert`

Bulk insert or update tools (untuk CSV import).

#### Request Body
```json
[
  {
    "tools_name": "Screw Driver #6300",
    "current_stock": 10,
    "stock_new": 5,
    "stock_old": 5,
    "stock_detail": "Detail specification...",
    "uom": "Pcs"
  },
  {
    "tools_name": "Hammer #1200",
    "current_stock": 5,
    "stock_new": 3,
    "stock_old": 2,
    "stock_detail": "Detail specification...",
    "uom": "Pcs"
  }
]
```

#### Response
```json
{
  "ok": true,
  "message": "Successfully upserted 2 tools"
}
```

#### Example
```bash
curl -X POST http://localhost:5000/api/tools/bulk-upsert \
  -H "Content-Type: application/json" \
  -d '[
    {
      "tools_name": "Screw Driver #6300",
      "current_stock": 10,
      "stock_new": 5,
      "stock_old": 5,
      "uom": "Pcs"
    }
  ]'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Part Name is required"
}
```

### 404 Not Found
```json
{
  "error": "Tool with name 'Screw Driver #6300' not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to save tool data: ..."
}
```

---

## Data Model

### Tool Object
```typescript
{
  // Normalized fields (for frontend)
  id: string;              // Part Name (used as ID)
  tools_name: string;      // Part Name
  current_stock: number;   // Total stock
  stock_new: number;       // New stock
  stock_old: number;       // Old stock
  stock_detail: string;    // Detail specification
  photo: string;           // Photo URL or base64
  uom: string;             // Unit of Measure (default: "Pcs")
  remark: string;          // Remark
  description: string;     // Description (same as stock_detail)
  
  // Original CSV fields (for compatibility)
  "Part Name": string;
  "Detail Specification": string;
  "Picture": string;
  "Total": number;
  "NEW": number;
  "OLD": number;
  "UOM": string;
  "Remark": string;
}
```

---

## CSV File Structure

File: `data/stock_detail.csv`

| Part Name | Brand | Detail Specification | Picture | Total | NEW | OLD | UOM | Remark |
|-----------|-------|---------------------|---------|-------|-----|-----|-----|--------|
| Screw Driver #6300 | | Detail spec... | base64_or_url | 10 | 5 | 5 | Pcs | Remark text |

**Note:** Brand column is kept for CSV structure but is always empty (not used in UI).

---

## Notes

1. **Primary Key**: `Part Name` (tools_name) digunakan sebagai primary key
2. **Brand Column**: Kolom Brand tetap ada di CSV (kosong) untuk preserve struktur CSV
3. **Photo**: Photo dapat berupa URL atau base64 encoded string
4. **UOM**: Unit of Measure, default: "Pcs"
5. **Location**: Field location tidak disimpan ke CSV (hanya untuk UI)
6. **Search**: Pencarian dilakukan pada: tools_name, description, stock_detail, remark
7. **Pagination**: Optional, menggunakan query parameters `page` dan `per_page`

---

## Testing

### Test dengan curl
```bash
# Get all tools
curl http://localhost:5000/api/tools

# Create tool
curl -X POST http://localhost:5000/api/tools \
  -H "Content-Type: application/json" \
  -d '{"tools_name": "Test Tool", "current_stock": 10}'

# Update tool
curl -X PUT http://localhost:5000/api/tools/Test%20Tool \
  -H "Content-Type: application/json" \
  -d '{"current_stock": 15}'

# Delete tool
curl -X DELETE http://localhost:5000/api/tools/Test%20Tool
```

### Test dengan Postman
1. Import collection dari file `backend/docs/tools_api.postman_collection.json` (if available)
2. Set base URL: `http://localhost:5000/api`
3. Test semua endpoints

---

## Changelog

### v1.0.0 (2025-11-10)
- ✅ Removed Brand and Category fields
- ✅ Updated search to exclude brand/category
- ✅ Updated CSV structure to preserve Brand column (empty)
- ✅ Added bulk upsert endpoint
- ✅ Added pagination support
- ✅ Added search functionality

---

**Last Updated**: November 10, 2025

