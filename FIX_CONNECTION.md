# 🔧 Fix MongoDB Connection Error

## Step-by-Step Solution

### Step 1: Get Your Correct Password from MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Log in to your account
3. Click **"Database Access"** in the left sidebar
4. Find the user: **adityasajwan1105**
5. Click the **"Edit"** button (pencil icon)
6. You have two options:
   - **Option A**: If you know the password, verify it's correct
   - **Option B**: Click **"Edit Password"** → **"Autogenerate Secure Password"** or enter a new password
   - **IMPORTANT**: Copy the password immediately (you won't see it again!)

### Step 2: Whitelist Your IP Address

1. In MongoDB Atlas, click **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. For development, you can use:
   - **"Allow Access from Anywhere"** (0.0.0.0/0) - Easy but less secure
   - Or click **"Add Current IP Address"** - More secure
4. Click **"Confirm"**

### Step 3: Get Fresh Connection String

1. In MongoDB Atlas, go to **"Clusters"**
2. Click **"Connect"** button on your cluster
3. Select **"Connect your application"**
4. Copy the connection string (it will look like):
   ```
   mongodb+srv://adityasajwan1105:<password>@cluster0.iaghazm.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password from Step 1
6. Add database name: Change `/?` to `/telemedicine?`

### Step 4: Update Your .env File

1. Open `backend/.env` file
2. Update the `MONGODB_URI` line with your new connection string:
   ```
   MONGODB_URI=mongodb+srv://adityasajwan1105:YOUR_ACTUAL_PASSWORD@cluster0.iaghazm.mongodb.net/telemedicine?retryWrites=true&w=majority
   ```
3. **Important**: 
   - Remove any `< >` brackets
   - If password has special characters, URL-encode them:
     - `@` → `%40`
     - `#` → `%23`
     - `/` → `%2F`
     - `:` → `%3A`
     - `%` → `%25`

### Step 5: Test the Connection

Run the test script:
```bash
cd backend
node test-connection.js
```

Or start your server:
```bash
npm start
```

You should see: `✅ Connected to MongoDB`

## Still Having Issues?

If you're still getting errors:

1. **Double-check the password** - Make sure there are no extra spaces
2. **Wait a few minutes** - IP whitelist changes can take 1-2 minutes
3. **Try resetting the database user password** in MongoDB Atlas
4. **Verify the database name** - Make sure it's `telemedicine` or create it if it doesn't exist

