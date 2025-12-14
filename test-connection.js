// Test MongoDB connection script
require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🔍 Testing MongoDB Connection...\n');

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Display connection string (with password hidden)
const uri = process.env.MONGODB_URI;
const maskedUri = uri.replace(/:(.*?)@/, ':****@');
console.log('📝 Connection String:', maskedUri);
console.log('');

// Extract username and check format
const usernameMatch = uri.match(/mongodb\+srv:\/\/([^:]+):/);
if (usernameMatch) {
  console.log('👤 Username:', usernameMatch[1]);
}

// Try to connect
mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000,
})
  .then(() => {
    console.log('✅ SUCCESS! Connected to MongoDB');
    console.log('🎉 Your connection string is correct!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection failed:', error.message);
    console.log('\n📋 Troubleshooting Checklist:');
    console.log('1. ✅ Check MongoDB Atlas → Database Access');
    console.log('   - Verify username: adityasajwan1105');
    console.log('   - Click "Edit" and verify/reset password');
    console.log('');
    console.log('2. ✅ Check MongoDB Atlas → Network Access');
    console.log('   - Click "Add IP Address"');
    console.log('   - For development: Use "0.0.0.0/0" (allows all IPs)');
    console.log('   - Or add your current IP address');
    console.log('');
    console.log('3. ✅ Update .env file with correct password');
    console.log('   - Open: backend/.env');
    console.log('   - Replace password in MONGODB_URI');
    console.log('   - If password has special chars, URL-encode them');
    console.log('');
    console.log('4. ✅ Get fresh connection string from MongoDB Atlas');
    console.log('   - Go to Clusters → Connect → Connect your application');
    console.log('   - Copy the connection string');
    console.log('   - Replace <password> with your actual password');
    process.exit(1);
  });

