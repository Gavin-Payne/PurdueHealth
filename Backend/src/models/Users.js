const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
  },
  auth0Id: {
    type: String,
    unique: true,
    sparse: true
  },
  picture: {
    type: String
  },
  name: {
    type: String
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  survey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey'
  },
  hasTakenSurvey: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('User', userSchema);
