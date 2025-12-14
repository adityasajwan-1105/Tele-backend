const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN 
    ? process.env.CLIENT_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'https://tele-frontend.vercel.app'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/admin', require('../routes/admin'));
app.use('/api/patient', require('../routes/patient'));
app.use('/api/appointments', require('../routes/appointments'));
app.use('/api/prescriptions', require('../routes/prescriptions'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Telemedicine Backend API',
    endpoints: [
      '/api/health',
      '/api/auth',
      '/api/admin',
      '/api/patient',
      '/api/appointments',
      '/api/prescriptions'
    ]
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
};

// Connect to database
connectDB();

// Export for Vercel serverless
module.exports = app;

