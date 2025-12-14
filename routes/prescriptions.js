const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');

const router = express.Router();

// Middleware to check if user is authenticated
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

// Create prescription (Doctor)
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can create prescriptions'
      });
    }

    const { patientId, appointmentId, medications, diagnosis, notes } = req.body;

    if (!patientId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide patientId and at least one medication'
      });
    }

    // Validate medications
    for (const med of medications) {
      if (!med.name || !med.dosage || !med.frequency || !med.duration) {
        return res.status(400).json({
          success: false,
          message: 'Each medication must have name, dosage, frequency, and duration'
        });
      }
    }

    // Check if patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // If appointmentId provided, verify it belongs to this doctor and patient
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment || 
          appointment.doctor.toString() !== req.user._id.toString() ||
          appointment.patient.toString() !== patientId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid appointment'
        });
      }
    }

    const prescription = new Prescription({
      patient: patientId,
      doctor: req.user._id,
      appointment: appointmentId || null,
      medications,
      diagnosis: diagnosis || null,
      notes: notes || null,
      status: 'active'
    });

    await prescription.save();
    await prescription.populate('patient', 'name email');
    await prescription.populate('doctor', 'name email specialization');
    if (appointmentId) {
      await prescription.populate('appointment');
    }

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get patient's prescriptions
router.get('/patient', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const prescriptions = await Prescription.find({ patient: req.user._id })
      .populate('doctor', 'name email specialization hospital')
      .populate('appointment', 'date time reason')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      prescriptions
    });
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get doctor's prescriptions
router.get('/doctor', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const prescriptions = await Prescription.find({ doctor: req.user._id })
      .populate('patient', 'name email phone')
      .populate('appointment', 'date time reason')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      prescriptions
    });
  } catch (error) {
    console.error('Error fetching doctor prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get prescription by ID
router.get('/:prescriptionId', isAuthenticated, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const prescription = await Prescription.findById(prescriptionId)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization hospital')
      .populate('appointment');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Check if user has access (either patient or doctor)
    if (req.user.role === 'patient' && prescription.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'doctor' && prescription.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      prescription
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;


