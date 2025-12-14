const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      dateOfBirth,
      phone,
      address,
      gender,
      emergencyContact,
      emergencyPhone,
      specialization,
      licenseNumber,
      yearsOfExperience,
      hospital,
      qualifications,
      consultationFee
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Prevent admin signup through this route
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be created through this route'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate role-specific fields
    if (role === 'patient') {
      if (!dateOfBirth || !phone || !address || !gender || !emergencyContact || !emergencyPhone) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required patient fields'
        });
      }
    } else if (role === 'doctor') {
      if (!specialization || !licenseNumber || !yearsOfExperience || !hospital || !qualifications || !consultationFee) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required doctor fields'
        });
      }
    }

    // Create user
    const userData = {
      name,
      email,
      password,
      role
    };

    if (role === 'patient') {
      userData.dateOfBirth = dateOfBirth;
      userData.phone = phone;
      userData.address = address;
      userData.gender = gender;
      userData.emergencyContact = emergencyContact;
      userData.emergencyPhone = emergencyPhone;
    } else if (role === 'doctor') {
      userData.specialization = specialization;
      userData.licenseNumber = licenseNumber;
      userData.yearsOfExperience = yearsOfExperience;
      userData.hospital = hospital;
      userData.qualifications = qualifications;
      userData.consultationFee = consultationFee;
      // Doctors need admin approval
      userData.isApproved = false;
      userData.approvalStatus = 'pending';
    }

    const user = new User(userData);
    await user.save();

    // Generate token only for patients (doctors must be approved first)
    const token = role === 'patient' ? generateToken(user._id) : null;

    res.status(201).json({
      success: true,
      message: role === 'patient' 
        ? 'Patient account created successfully' 
        : 'Doctor account created successfully. Please wait for admin approval before logging in.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ...(user.role === 'patient' && {
          dateOfBirth: user.dateOfBirth,
          phone: user.phone,
          address: user.address,
          gender: user.gender
        }),
        ...(user.role === 'doctor' && {
          specialization: user.specialization,
          licenseNumber: user.licenseNumber,
          yearsOfExperience: user.yearsOfExperience,
          hospital: user.hospital,
          qualifications: user.qualifications,
          consultationFee: user.consultationFee
        })
      }
    });
  } catch (error) {
    console.error('Signup error:', error);

    // Handle common, more specific error cases to give clearer feedback
    if (error.code === 11000) {
      // Duplicate key (e.g., email already exists)
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError?.message || 'Invalid data. Please check your input.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if doctor is approved
    if (user.role === 'doctor' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending admin approval. Please wait for approval before logging in.',
        approvalStatus: user.approvalStatus
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ...(user.role === 'patient' && {
          dateOfBirth: user.dateOfBirth,
          phone: user.phone,
          address: user.address,
          gender: user.gender
        }),
        ...(user.role === 'doctor' && {
          specialization: user.specialization,
          licenseNumber: user.licenseNumber,
          yearsOfExperience: user.yearsOfExperience,
          hospital: user.hospital,
          qualifications: user.qualifications,
          consultationFee: user.consultationFee,
          isApproved: user.isApproved,
          approvalStatus: user.approvalStatus
        }),
        ...(user.role === 'admin' && {
          // Admin specific fields if needed in future
        })
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message
    });
  }
});

// Get current user (protected route)
router.get('/me', async (req, res) => {
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

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ...(user.role === 'patient' && {
          dateOfBirth: user.dateOfBirth,
          phone: user.phone,
          address: user.address,
          gender: user.gender
        }),
        ...(user.role === 'doctor' && {
          specialization: user.specialization,
          licenseNumber: user.licenseNumber,
          yearsOfExperience: user.yearsOfExperience,
          hospital: user.hospital,
          qualifications: user.qualifications,
          consultationFee: user.consultationFee
        })
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

module.exports = router;

