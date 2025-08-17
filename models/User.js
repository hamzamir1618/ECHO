const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['Student', 'Society', 'Admin'],
    required: true
  },
  applications: [{
    societyName: String,
    status: {
      type: String,
      enum: ['requested', 'accepted', 'rejected'],
      default: 'requested'
    }
  }]
});

module.exports = mongoose.model('User', userSchema); 