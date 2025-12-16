const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
// Configure CORS to allow browser requests
// NOTE: This is permissive (allows any origin). For stricter security,
//       pass an explicit list of allowed origins instead.
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Root route (for base URL health/info)
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Telemedicine backend is running',
    docs: '/api/health'
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/prescriptions', require('./routes/prescriptions'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }
    
    // Check if already connected (for Vercel serverless)
    if (mongoose.connection.readyState === 1) {
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('1. Check if your MongoDB password is correct');
      console.error('2. If password contains special characters, URL-encode them:');
      console.error('   - @ becomes %40');
      console.error('   - # becomes %23');
      console.error('   - / becomes %2F');
      console.error('   - : becomes %3A');
      console.error('3. Make sure your IP address is whitelisted in MongoDB Atlas');
      console.error('4. Verify the database user exists in MongoDB Atlas');
      console.error('\n📝 Connection string format:');
      console.error('mongodb+srv://username:password@cluster.mongodb.net/database');
    }
    
    throw error;
  }
};

// For Vercel serverless: export the app
// For local development: start the server
if (require.main === module) {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} else {
  // For Vercel: connect to DB when module loads
  connectDB().catch(console.error);
}

module.exports = app;

