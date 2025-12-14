# MongoDB Connection Troubleshooting

## Common Authentication Errors

### Error: "bad auth : authentication failed"

This error occurs when MongoDB cannot authenticate with the provided credentials.

## Solutions

### 1. Verify Your Password

Make sure the password in your `.env` file matches exactly with your MongoDB Atlas password.

**Important:** If your password contains special characters, you need to URL-encode them:

- `@` → `%40`
- `#` → `%23`
- `/` → `%2F`
- `:` → `%3A`
- `?` → `%3F`
- `&` → `%26`
- `=` → `%3D`
- `+` → `%2B`
- `%` → `%25`
- ` ` (space) → `%20`

**Example:**
If your password is `my@pass#123`, the connection string should be:
```
mongodb+srv://username:my%40pass%23123@cluster.mongodb.net/database
```

### 2. Check MongoDB Atlas Settings

1. **Database Access:**
   - Go to MongoDB Atlas → Database Access
   - Verify your database user exists
   - Make sure the password is correct
   - If needed, reset the password

2. **Network Access:**
   - Go to MongoDB Atlas → Network Access
   - Add your current IP address (or use `0.0.0.0/0` for development)
   - Click "Add IP Address"

### 3. Get Your Connection String

1. Go to MongoDB Atlas → Clusters
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password (URL-encoded if needed)
6. Replace `<dbname>` with your database name (e.g., `telemedicine`)

### 4. Update Your .env File

Your `.env` file should look like this:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/telemedicine?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
```

**Note:** Remove the angle brackets `< >` from the connection string.

### 5. Test Connection

After updating your `.env` file, restart the server:
```bash
npm start
```

You should see: `✅ Connected to MongoDB`

