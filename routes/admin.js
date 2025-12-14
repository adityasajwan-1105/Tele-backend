const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
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

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    req.admin = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Get all pending doctor registrations
router.get('/pending-doctors', isAdmin, async (req, res) => {
  try {
    const pendingDoctors = await User.find({
      role: 'doctor',
      approvalStatus: 'pending'
    }).select('-password');

    res.json({
      success: true,
      doctors: pendingDoctors
    });
  } catch (error) {
    console.error('Error fetching pending doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all approved doctors
router.get('/approved-doctors', isAdmin, async (req, res) => {
  try {
    const approvedDoctors = await User.find({
      role: 'doctor',
      approvalStatus: 'approved'
    }).select('-password');

    res.json({
      success: true,
      doctors: approvedDoctors
    });
  } catch (error) {
    console.error('Error fetching approved doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all rejected doctors
router.get('/rejected-doctors', isAdmin, async (req, res) => {
  try {
    const rejectedDoctors = await User.find({
      role: 'doctor',
      approvalStatus: 'rejected'
    }).select('-password');

    res.json({
      success: true,
      doctors: rejectedDoctors
    });
  } catch (error) {
    console.error('Error fetching rejected doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Approve a doctor
router.post('/approve-doctor/:doctorId', isAdmin, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const adminId = req.admin._id;

    const doctor = await User.findById(doctorId);

    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.isApproved = true;
    doctor.approvalStatus = 'approved';
    doctor.approvedBy = adminId;
    doctor.approvedAt = new Date();
    doctor.rejectionReason = null;

    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor approved successfully',
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization
      }
    });
  } catch (error) {
    console.error('Error approving doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reject a doctor
router.post('/reject-doctor/:doctorId', isAdmin, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason } = req.body;

    const doctor = await User.findById(doctorId);

    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.isApproved = false;
    doctor.approvalStatus = 'rejected';
    doctor.rejectionReason = reason || 'Credentials did not meet requirements';

    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor rejected',
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email
      }
    });
  } catch (error) {
    console.error('Error rejecting doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get dashboard statistics
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const approvedDoctors = await User.countDocuments({ role: 'doctor', approvalStatus: 'approved' });
    const pendingDoctors = await User.countDocuments({ role: 'doctor', approvalStatus: 'pending' });
    const rejectedDoctors = await User.countDocuments({ role: 'doctor', approvalStatus: 'rejected' });

    res.json({
      success: true,
      stats: {
        totalPatients,
        totalDoctors,
        approvedDoctors,
        pendingDoctors,
        rejectedDoctors
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

