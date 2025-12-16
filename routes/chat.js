const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// Authentication middleware
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
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get all conversations for the current user
router.get('/conversations', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let allowedUserIds = [];
    
    if (userRole === 'patient') {
      // For patients: Only show doctors with confirmed appointments
      const confirmedAppointments = await Appointment.find({
        patient: userId,
        status: 'confirmed'
      }).select('doctor');
      
      // Extract unique doctor IDs
      const doctorIds = confirmedAppointments.map(apt => apt.doctor.toString());
      const uniqueDoctorIds = [...new Set(doctorIds)];
      allowedUserIds = uniqueDoctorIds.map(id => new mongoose.Types.ObjectId(id));
    } else if (userRole === 'doctor') {
      // For doctors: Show all patients with confirmed appointments
      const confirmedAppointments = await Appointment.find({
        doctor: userId,
        status: 'confirmed'
      }).select('patient');
      
      // Extract unique patient IDs
      const patientIds = confirmedAppointments.map(apt => apt.patient.toString());
      const uniquePatientIds = [...new Set(patientIds)];
      allowedUserIds = uniquePatientIds.map(id => new mongoose.Types.ObjectId(id));
    } else {
      // Admin can see all (or handle as needed)
      return res.status(403).json({
        success: false,
        message: 'Chat is only available for patients and doctors'
      });
    }
    
    if (allowedUserIds.length === 0) {
      return res.json({
        success: true,
        conversations: []
      });
    }
    
    // Get all unique users the current user has chatted with (from existing messages)
    const sentMessages = await Chat.find({ 
      sender: userId,
      receiver: { $in: allowedUserIds }
    })
      .select('receiver')
      .distinct('receiver');
    
    const receivedMessages = await Chat.find({ 
      receiver: userId,
      sender: { $in: allowedUserIds }
    })
      .select('sender')
      .distinct('sender');
    
    // Convert all to strings for proper Set comparison
    const messagedUserIdsStr = [
      ...sentMessages.map(id => id.toString()),
      ...receivedMessages.map(id => id.toString())
    ];
    const allowedUserIdsStr = allowedUserIds.map(id => id.toString());
    
    // Combine: users with messages + users with confirmed appointments (even without messages)
    const allConversationIdsStr = [...new Set([...messagedUserIdsStr, ...allowedUserIdsStr])];
    const allConversationIds = allConversationIdsStr.map(id => new mongoose.Types.ObjectId(id));
    
    // Get last message and unread count for each conversation
    const conversations = await Promise.all(
      allConversationIds.map(async (otherUserId) => {
        // Ensure both IDs are ObjectIds for proper comparison
        const currentUserIdObj = userId instanceof mongoose.Types.ObjectId ? userId : mongoose.Types.ObjectId(userId);
        const otherUserIdObj = otherUserId instanceof mongoose.Types.ObjectId ? otherUserId : mongoose.Types.ObjectId(otherUserId);
        
        // Get the last message between these two specific users
        const lastMessage = await Chat.findOne({
          $or: [
            { sender: currentUserIdObj, receiver: otherUserIdObj },
            { sender: otherUserIdObj, receiver: currentUserIdObj }
          ]
        })
        .sort({ createdAt: -1 })
        .populate('sender', 'name email role')
        .populate('receiver', 'name email role');
        
        const unreadCount = await Chat.countDocuments({
          sender: otherUserIdObj,
          receiver: currentUserIdObj,
          read: false
        });
        
        const otherUser = await User.findById(otherUserIdObj).select('name email role specialization');
        
        if (!otherUser) {
          return null;
        }
        
        return {
          user: otherUser,
          lastMessage: lastMessage ? {
            message: lastMessage.message,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.sender._id.toString()
          } : null,
          unreadCount
        };
      })
    );
    
    // Filter out null values and sort by last message time (messages first, then by appointment)
    const validConversations = conversations.filter(conv => conv !== null);
    
    validConversations.sort((a, b) => {
      // Conversations with messages come first
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      }
      // If no messages, sort alphabetically by name
      return a.user.name.localeCompare(b.user.name);
    });
    
    res.json({
      success: true,
      conversations: validConversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get messages between current user and another user
router.get('/messages/:otherUserId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;
    
    // Verify the other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify user has access to chat with this person (confirmed appointment required)
    if (req.user.role === 'patient' && otherUser.role === 'doctor') {
      const confirmedAppointment = await Appointment.findOne({
        patient: userId,
        doctor: otherUserId,
        status: 'confirmed'
      });
      
      if (!confirmedAppointment) {
        return res.status(403).json({
          success: false,
          message: 'You can only chat with doctors who have confirmed your appointments'
        });
      }
    } else if (req.user.role === 'doctor' && otherUser.role === 'patient') {
      const confirmedAppointment = await Appointment.findOne({
        doctor: userId,
        patient: otherUserId,
        status: 'confirmed'
      });
      
      if (!confirmedAppointment) {
        return res.status(403).json({
          success: false,
          message: 'You can only chat with patients who have confirmed appointments'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Invalid chat access'
      });
    }
    
    // Get messages between the two users
    const messages = await Chat.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
    .populate('sender', 'name email role')
    .populate('receiver', 'name email role')
    .populate('appointment', 'date time reason status')
    .sort({ createdAt: 1 });
    
    // Mark messages as read
    await Chat.updateMany(
      {
        sender: otherUserId,
        receiver: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      messages,
      otherUser: {
        _id: otherUser._id,
        name: otherUser.name,
        email: otherUser.email,
        role: otherUser.role,
        specialization: otherUser.specialization
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Send a message
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    const { receiverId, message, appointmentId } = req.body;
    
    if (!receiverId || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and message are required'
      });
    }
    
    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }
    
    // Verify user can message this person
    // Doctors can only message their patients, patients can only message their doctors
    const sender = req.user;
    if (sender.role === 'doctor' && receiver.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Doctors can only message patients'
      });
    }
    if (sender.role === 'patient' && receiver.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Patients can only message doctors'
      });
    }
    
    // For patients: Verify they have a confirmed appointment with this doctor
    if (sender.role === 'patient') {
      const confirmedAppointment = await Appointment.findOne({
        patient: sender._id,
        doctor: receiverId,
        status: 'confirmed'
      });
      
      if (!confirmedAppointment) {
        return res.status(403).json({
          success: false,
          message: 'You can only message doctors with confirmed appointments'
        });
      }
    }
    
    // For doctors: Verify they have a confirmed appointment with this patient
    if (sender.role === 'doctor') {
      const confirmedAppointment = await Appointment.findOne({
        doctor: sender._id,
        patient: receiverId,
        status: 'confirmed'
      });
      
      if (!confirmedAppointment) {
        return res.status(403).json({
          success: false,
          message: 'You can only message patients with confirmed appointments'
        });
      }
    }
    
    // Create message
    const chatMessage = new Chat({
      sender: sender._id,
      receiver: receiverId,
      message: message.trim(),
      appointment: appointmentId || null
    });
    
    await chatMessage.save();
    
    const populatedMessage = await Chat.findById(chatMessage._id)
      .populate('sender', 'name email role')
      .populate('receiver', 'name email role')
      .populate('appointment', 'date time reason status');
    
    res.json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get unread message count
router.get('/unread-count', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const unreadCount = await Chat.countDocuments({
      receiver: userId,
      read: false
    });
    
    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

