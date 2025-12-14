const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

// Book an appointment (Patient)
router.post('/book', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Only patients can book appointments'
      });
    }

    const { doctorId, date, time, reason } = req.body;

    if (!doctorId || !date || !time || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide doctorId, date, time, and reason'
      });
    }

    // Check if doctor exists and is approved
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor' || doctor.approvalStatus !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or not approved'
      });
    }

    // Check if date is in the future
    const appointmentDate = new Date(date);
    if (appointmentDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date must be in the future'
      });
    }

    // Create appointment
    const appointment = new Appointment({
      patient: req.user._id,
      doctor: doctorId,
      date: appointmentDate,
      time,
      reason,
      status: 'pending'
    });

    await appointment.save();
    await appointment.populate('doctor', 'name email specialization hospital');
    await appointment.populate('patient', 'name email');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get patient's appointments
router.get('/patient', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const appointments = await Appointment.find({ patient: req.user._id })
      .populate('doctor', 'name email specialization hospital consultationFee')
      .sort({ date: -1 });

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get doctor's appointments
router.get('/doctor', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { status } = req.query;
    const query = { doctor: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Accept or reject appointment (Doctor)
router.patch('/:appointmentId/status', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can update appointment status'
      });
    }

    const { appointmentId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "confirmed" or "rejected"'
      });
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own appointments'
      });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    appointment.status = status;
    if (status === 'rejected') {
      appointment.rejectionReason = rejectionReason;
    } else {
      appointment.rejectionReason = null;
    }

    await appointment.save();
    await appointment.populate('patient', 'name email');
    await appointment.populate('doctor', 'name email specialization');

    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Cancel appointment (Patient)
router.patch('/:appointmentId/cancel', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Only patients can cancel appointments'
      });
    }

    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own appointments'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled'
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get details for a specific appointment (Patient or Doctor)
router.get('/:appointmentId', isAuthenticated, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization hospital');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const isPatient = appointment.patient?._id?.toString() === req.user._id.toString();
    const isDoctor = appointment.doctor?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this appointment'
      });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Error fetching appointment details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;


