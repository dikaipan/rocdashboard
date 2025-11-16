# Deploy Flask Backend to Railway

## Step 1: Prepare Repository

```bash
# Commit all changes
git add .
git commit -m "chore: Prepare for Railway deployment"
git push origin main
```

## Step 2: Deploy to Railway

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose `rocdashboard` repository
6. Railway will auto-detect Python and deploy

## Step 3: Configure Environment

Railway will automatically:
- Install dependencies from `requirements.txt`
- Run `python app.py`
- Expose public URL (e.g., `https://rocdashboard-production.up.railway.app`)

## Step 4: Get Backend URL

After deployment:
1. Go to Railway project settings
2. Copy the public URL (e.g., `https://rocdashboard-production.up.railway.app`)
3. Your API will be at: `https://rocdashboard-production.up.railway.app/api`

## Step 5: Configure Vercel Frontend

1. Go to Vercel project: https://vercel.com/dashboard
2. Select `rocdashboard` project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://rocdashboard-production.up.railway.app/api`
5. Redeploy frontend

## Step 6: Redeploy Frontend

```bash
# In Vercel dashboard
# Go to Deployments → Click "..." → Redeploy
```

Or trigger new deployment:

```bash
git commit --allow-empty -m "chore: Trigger Vercel redeploy"
git push origin main
```

## Verify Deployment

1. **Test Backend**: https://rocdashboard-production.up.railway.app/api/engineers
2. **Test Frontend**: https://rocdashboard.vercel.app/dashboard

## Troubleshooting

### Backend not responding
- Check Railway logs: Project → Deployments → View Logs
- Verify `requirements.txt` has all dependencies
- Check if `data/` folder is included in git

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` is set correctly in Vercel
- Check CORS is enabled in Flask (already configured)
- Verify Railway backend is running

### Data files not found
Railway needs CSV files. Make sure they're in git:

```bash
git add data/*.csv
git commit -m "chore: Add data files"
git push origin main
```

## Cost

- **Railway**: Free tier (500 hours/month, $5 credit)
- **Vercel**: Free tier (unlimited for personal projects)

Total: **FREE** ✅
