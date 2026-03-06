/**
 * ============================================================
 * User Model (Database Schema)
 * ============================================================
 * TECHNOLOGY: Mongoose Schema
 * WHY: A schema is like a "blueprint" for your data. It tells
 * MongoDB exactly what shape each user document should have.
 * Without it, data can be messy and inconsistent.
 * ============================================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define what a "User" looks like in our database
const UserSchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },

  // Job Preferences - what the user is looking for
  preferences: {
    jobTitles: [String],          // e.g. ["Software Engineer", "Backend Developer"]
    yearsOfExp: {
      type: String,
      enum: ['0', '0-1', '1-2', '2-3', '3-5', '5+'],
      default: '0-1'
    },
    locations: [String],           // e.g. ["Bangalore", "Remote", "Mumbai"]
    companies: [String],           // Specific companies to watch
    skills: [String],              // e.g. ["React", "Python", "Java"]
    jobTypes: [String],            // ["Full-time", "Internship", "Contract"]
    minSalary: Number,             // Optional salary filter
  },

  // Alert settings - HOW and WHEN to notify
  alertSettings: {
    frequency: {
      type: String,
      enum: ['instant', '15min', '30min', '1hour', '3hour', '6hour', 'daily'],
      default: '1hour'
    },
    isActive: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    lastAlertSent: Date,
    nextAlertDue: Date,
  },

  // Track what jobs we already showed them (avoid duplicates)
  seenJobIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],

  // Account metadata
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

// ============================================================
// PASSWORD HASHING
// WHY: NEVER store plain text passwords! bcrypt converts
// "mypassword123" → "$2a$10$abc...xyz" (unreadable hash).
// Even if database is hacked, passwords stay safe.
// ============================================================
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to check if a password is correct
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
