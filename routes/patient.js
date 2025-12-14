const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware to check if user is authenticated (patient or any authenticated user)
const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Get all approved doctors with optional search
router.get('/doctors', isAuthenticated, async (req, res) => {
  try {
    const { search, specialization } = req.query;
    
    // Build query for approved doctors only
    const query = {
      role: 'doctor',
      approvalStatus: 'approved',
      isApproved: true
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { hospital: { $regex: search, $options: 'i' } },
        { qualifications: { $regex: search, $options: 'i' } }
      ];
    }

    // Add specialization filter if provided
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    const doctors = await User.find(query)
      .select('-password -rejectionReason')
      .sort({ name: 1 });

    res.json({
      success: true,
      doctors: doctors,
      count: doctors.length
    });
  } catch (error) {
    console.error('Error fetching approved doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get a single doctor by ID
router.get('/doctors/:doctorId', isAuthenticated, async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      approvalStatus: 'approved',
      isApproved: true
    }).select('-password -rejectionReason');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or not approved'
      });
    }

    res.json({
      success: true,
      doctor: doctor
    });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;


