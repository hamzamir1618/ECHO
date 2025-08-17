const mongoose = require('mongoose');

const societySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  members: [{
    type: String  // Will store student names
  }],
  memberRoles: [{
    memberName: String,
    role: String
  }],
  memberHistory: [{
    memberName: String,
    action: {
      type: String,
      enum: ['joined', 'left', 'role_assigned', 'role_removed', 'event_attended', 'event_organized']
    },
    details: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  posts: [{
    content: String,
    isAnnouncement: Boolean,
    scheduledFor: Date,  // For scheduled announcements
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastEdited: {
      type: Date,
      default: Date.now
    },
    editedBy: String,
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      author: String,
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  events: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    venue: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    comments: [{
      author: String,
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  venues: [{
    name: {
      type: String,
      required: true
    },
    capacity: {
      type: Number,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    reservations: [{
      eventId: mongoose.Schema.Types.ObjectId,
      date: Date,
      startTime: String,
      endTime: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      }
    }]
  }]
});

module.exports = mongoose.model('Society', societySchema); 