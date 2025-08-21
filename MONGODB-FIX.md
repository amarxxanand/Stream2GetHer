# 🔧 MongoDB Atlas Setup Checklist

## ❌ Current Issue: Authentication Failed

Your MongoDB connection is failing with "bad auth : authentication failed". Here's how to fix it:

## 🛠️ Steps to Fix:

### 1. **Check MongoDB Atlas Dashboard**
   - Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)
   - Login to your account
   - Select your cluster "Cluster0"

### 2. **Verify Database User**
   - Go to "Database Access" in left sidebar
   - Check if user `amargrd00` exists
   - If it doesn't exist, create a new user:
     - Username: `amargrd00` 
     - Password: `vUIGSdr8S9aoxvzY`
     - Database User Privileges: "Read and write to any database"

### 3. **Check Network Access**
   - Go to "Network Access" in left sidebar
   - Add your current IP address: Click "Add IP Address"
   - For development, you can temporarily add `0.0.0.0/0` (all IPs)
   - For production, add only your server's IP

### 4. **Verify Cluster Connection**
   - Go to "Database" → "Connect" → "Connect your application"
   - Select "Node.js" and version "4.1 or later"
   - Copy the connection string and verify it matches yours

## 🔍 What Your Connection String Should Look Like:

```
mongodb+srv://amargrd00:vUIGSdr8S9aoxvzY@cluster0.er9bdva.mongodb.net/stream2gether?retryWrites=true&w=majority&appName=Cluster0
```

## 🚀 Alternative: Create New Credentials

If the current credentials don't work, create new ones:

1. **Create New Database User:**
   - Username: `stream2gether_user`
   - Password: Generate a secure password
   - Privileges: "Read and write to any database"

2. **Update Your .env Files:**
   ```
   MONGODB_URI=mongodb+srv://stream2gether_user:your_new_password@cluster0.er9bdva.mongodb.net/stream2gether?retryWrites=true&w=majority&appName=Cluster0
   ```

## 📋 Current Status:
- ✅ Connection string format is correct
- ✅ Database name is included (`stream2gether`)
- ❌ Authentication is failing
- ❌ Need to verify Atlas user/network settings

## 🎯 Next Steps:
1. Check MongoDB Atlas dashboard
2. Verify user credentials
3. Update network access rules
4. Test connection again
