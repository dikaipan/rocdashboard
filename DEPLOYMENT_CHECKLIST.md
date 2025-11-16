# ROC Dashboard Deployment Checklist

## ✅ Pre-Deployment Checklist

- [x] Backend code ready (`app_api.py`)
- [x] Data files in `data/` folder
- [x] `requirements.txt` complete
- [x] `Dockerfile` configured
- [x] CORS enabled for Vercel
- [x] All code pushed to GitHub

## 🚀 Deployment Steps

### Step 1: Deploy Backend to Railway

1. **Go to Railway**: https://railway.app
2. **Sign in** with GitHub
3. **New Project** → Deploy from GitHub repo
4. **Select**: `dikaipan/rocdashboard`
5. **Wait** for deployment (3-5 minutes)
6. **Check logs** for errors
7. **Generate domain** (Settings → Generate Domain)
8. **Copy URL**: e.g., `https://rocdashboard-production.up.railway.app`

### Step 2: Test Backend API

Test these endpoints (replace with your Railway URL):

```bash
# Root - should return JSON with API info
curl https://your-railway-url.up.railway.app/

# Health check
curl https://your-railway-url.up.railway.app/health

# Engineers endpoint
curl https://your-railway-url.up.railway.app/api/engineers

# Leveling endpoint
curl https://your-railway-url.up.railway.app/api/leveling

# SO Data endpoint
curl https://your-railway-url.up.railway.app/api/so-data
```

**Expected**: All should return JSON (not HTML)

### Step 3: Configure Vercel Frontend

1. **Go to Vercel**: https://vercel.com/dashboard
2. **Select project**: rocdashboard
3. **Settings** → Environment Variables
4. **Add/Edit**:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://your-railway-url.up.railway.app/api` (with `/api` suffix!)
5. **Save**

### Step 4: Redeploy Vercel

**Option A - Via Dashboard:**
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **Redeploy**

**Option B - Via Git:**
```bash
git commit --allow-empty -m "chore: Trigger Vercel redeploy"
git push origin main
```

### Step 5: Test Frontend

1. **Open**: https://rocdashboard.vercel.app/dashboard
2. **Check**: No more "<!doctype" errors in console
3. **Verify**: Data loads correctly

## 🔍 Troubleshooting

### Backend 404 Errors

**Symptoms**: `Failed to load resource: 404`

**Causes**:
1. Railway still building (check deployment status)
2. Data files not copied (check Railway logs)
3. Wrong URL (check domain in Railway settings)

**Fix**:
```bash
# Check Railway logs
# Look for:
# - "Starting ROC Dashboard API Server"
# - "API endpoints available at /api/*"
# - Any Python errors
```

### Frontend CORS Errors

**Symptoms**: `Access-Control-Allow-Origin` error

**Causes**:
1. `VITE_API_BASE_URL` not set in Vercel
2. Wrong URL in environment variable
3. Backend CORS not configured

**Fix**:
1. Verify `VITE_API_BASE_URL` in Vercel settings
2. Ensure URL ends with `/api` (e.g., `https://xxx.up.railway.app/api`)
3. Redeploy Vercel after changing env vars

### Data Not Loading

**Symptoms**: Empty dashboard, no data

**Causes**:
1. CSV files not in Railway deployment
2. File path incorrect
3. CSV parsing error

**Fix**:
```bash
# Check Railway logs for:
# - FileNotFoundError
# - CSV parsing errors
# - Permission errors
```

## 📊 Deployment Status

| Component | Platform | Status | URL |
|-----------|----------|--------|-----|
| Backend API | Railway | ⏳ Pending | `https://your-railway-url.up.railway.app` |
| Frontend | Vercel | ✅ Live | `https://rocdashboard.vercel.app` |

## 🔗 Important Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repo**: https://github.com/dikaipan/rocdashboard
- **Frontend URL**: https://rocdashboard.vercel.app
- **Backend URL**: (Fill after Railway deployment)

## 📝 Notes

- Backend serves **API only** (no frontend)
- Frontend is on **Vercel** (separate deployment)
- Data files are in **git** and will be copied to Railway
- CORS is configured for Vercel domain
- Environment variables must be set in **both** platforms
