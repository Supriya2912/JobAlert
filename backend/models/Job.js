/**
 * ============================================================
 * Job Model
 * ============================================================
 * WHY: Every job we scrape gets saved here. This lets us:
 * 1. Avoid scraping the same job twice
 * 2. Search jobs quickly (database is faster than web scraping)
 * 3. Show job history and trends
 * ============================================================
 */

const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  // Job details
  title: { type: String, required: true, index: true },   // index = faster search
  company: { type: String, required: true, index: true },
  companyLogoUrl: String,
  location: { type: String, index: true },
  isRemote: { type: Boolean, default: false },
  
  // Job requirements
  description: String,
  requiredSkills: [String],
  experienceRequired: {
    min: Number,   // in years
    max: Number,
    raw: String    // original text like "0-1 years"
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'internship', 'contract', 'other'],
    default: 'full-time'
  },
  salary: {
    min: Number,
    max: Number,
    currency: String,
    raw: String    // original text like "6-8 LPA"
  },

  // Source information
  sourceUrl: { type: String, required: true },
  sourceType: {
    type: String,
    enum: ['official_careers', 'linkedin', 'naukri', 'indeed', 'other'],
    required: true
  },
  jobId: String,  // The ID from the source platform (to detect duplicates)

  // AI Analysis results
  // TECHNOLOGY: We use AI to auto-extract structured data from job descriptions
  aiAnalysis: {
    isEntryLevel: Boolean,          // AI determined this is for freshers/juniors
    keySkills: [String],            // AI extracted the must-have skills
    seniorityScore: Number,         // 0-100, lower = more junior
    matchKeywords: [String],        // Keywords useful for matching to users
    summarizedDescription: String,  // Short AI summary of the job
  },

  // Tracking
  postedAt: { type: Date, default: Date.now, index: true },
  scrapedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  alertsSent: { type: Number, default: 0 },
});

// ============================================================
// COMPOUND INDEX
// WHY: When we search "find all React jobs at Google", MongoDB
// uses this combined index to find results in milliseconds
// instead of scanning millions of records one-by-one.
// ============================================================
JobSchema.index({ company: 1, postedAt: -1 });
JobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' });

// Prevent duplicate jobs (same jobId from same source)
JobSchema.index({ sourceType: 1, jobId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Job', JobSchema);
