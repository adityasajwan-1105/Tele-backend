# Vercel Deployment Guide

## Video Calling Setup

Your video calling feature uses **ZEGOCLOUD**, which works entirely client-side and doesn't require WebSocket connections. This makes it compatible with Vercel's free tier.

### Required Environment Variables

You need to set these environment variables in your **Vercel project settings**:

#### Frontend Environment Variables (in Vercel Frontend Project):
1. `VITE_API_BASE_URL` - Your backend API URL (e.g., `https://your-backend.vercel.app`)
2. `VITE_ZEGO_APP_ID` - Your ZEGOCLOUD App ID (get from https://console.zegocloud.com)
3. `VITE_ZEGO_SERVER_SECRET` - Your ZEGOCLOUD Server Secret

#### Backend Environment Variables (in Vercel Backend Project):
1. `MONGODB_URI` - Your MongoDB connection string
2. `JWT_SECRET` - Secret key for JWT tokens
3. `CLIENT_ORIGIN` - Your frontend URL (comma-separated if multiple)

### Setting Up ZEGOCLOUD

1. **Sign up for ZEGOCLOUD** (free tier available):
   - Go to https://www.zegocloud.com/
   - Create an account
   - Create a new project

2. **Get your credentials**:
   - App ID: Found in your project dashboard
   - Server Secret: Found in your project settings (keep this secret!)

3. **Add to Vercel**:
   - Go to your Vercel project → Settings → Environment Variables
   - Add `VITE_ZEGO_APP_ID` and `VITE_ZEGO_SERVER_SECRET`
   - Make sure to add them for **Production**, **Preview**, and **Development** environments

### Important Notes

- ✅ **Socket.IO has been removed** - It's not needed since ZEGOCLOUD handles all video communication client-side
- ✅ **Backend is now Vercel-compatible** - Uses serverless functions instead of persistent connections
- ✅ **Video calling works on free tier** - ZEGOCLOUD's free tier supports up to 10,000 minutes/month

### Deployment Steps

1. **Deploy Backend**:
   ```bash
   cd backend
   vercel --prod
   ```

2. **Deploy Frontend**:
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set Environment Variables**:
   - Add all required env vars in Vercel dashboard
   - Redeploy after adding env vars

### Troubleshooting

**Video calling not working?**
- Check browser console for errors
- Verify `VITE_ZEGO_APP_ID` and `VITE_ZEGO_SERVER_SECRET` are set correctly
- Make sure ZEGOCLOUD credentials are valid
- Check ZEGOCLOUD dashboard for usage limits

**Backend not connecting?**
- Verify `MONGODB_URI` is set correctly
- Check MongoDB Atlas IP whitelist (allow all IPs: `0.0.0.0/0` for Vercel)
- Check Vercel function logs for errors

### Local Development

For local development, create `.env` files:

**Backend `.env`:**
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

**Frontend `.env`:**
```
VITE_API_BASE_URL=http://localhost:5000
VITE_ZEGO_APP_ID=your_zego_app_id
VITE_ZEGO_SERVER_SECRET=your_zego_server_secret
```

