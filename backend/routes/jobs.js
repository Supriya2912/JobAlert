/**
 * ============================================================
 * Job Routes
 * ============================================================
 * These are the API endpoints for browsing/searching jobs.
 * WHY separate files? Keeps code organized. Each file has
 * one responsibility — easier to debug and understand.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { authenticate } = require('../middleware/auth');

// ============================================================
// SEARCH JOBS
// GET /api/jobs/search?title=React&location=Bangalore&exp=0-1
// ============================================================
router.get('/search', async (req, res) => {
  try {
    const {
      title, location, company, exp, jobType,
      source, page = 1, limit = 20, sortBy = 'postedAt'
    } = req.query;

    // Build MongoDB query dynamically based on what filters user set
    const query = { isActive: true };

    // Text search (uses the text index we created in Job model)
    if (title) {
      query.$text = { $search: title };
    }

    if (location) {
      // "i" flag = case insensitive. So "bangalore" matches "Bangalore"
      query.location = { $regex: location, $options: 'i' };
    }

    if (company) {
      query.company = { $regex: company, $options: 'i' };
    }

    if (jobType) {
      query.jobType = jobType;
    }

    if (source) {
      query.sourceType = source;
    }

    // Experience filter
    if (exp) {
      if (exp === '0-1') {
        query['experienceRequired.max'] = { $lte: 1 };
      } else if (exp === '0') {
        query['experienceRequired.max'] = { $lte: 0 };
      }
    }

    // ============================================================
    // PAGINATION
    // WHY: Don't send 10,000 jobs at once! Send 20 at a time.
    // page=1 shows jobs 1-20, page=2 shows 21-40, etc.
    // ============================================================
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ [sortBy]: -1 })   // -1 = newest first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),                   // .lean() returns plain JS objects (faster)
      Job.countDocuments(query)
    ]);

    res.json({
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: skip + jobs.length < total
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET RECENT JOBS (for homepage)
// GET /api/jobs/recent?hours=2
// ============================================================
router.get('/recent', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 2;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const jobs = await Job.find({
      postedAt: { $gte: since },
      isActive: true
    })
    .sort({ postedAt: -1 })
    .limit(50)
    .lean();

    res.json({ jobs, count: jobs.length, since });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET JOBS MATCHING USER PREFERENCES
// GET /api/jobs/my-matches (requires login)
// ============================================================
router.get('/my-matches', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    const prefs = user.preferences;

    const query = { isActive: true };

    // Build query from user preferences
    if (prefs.jobTitles?.length) {
      query.$or = prefs.jobTitles.map(t => ({
        title: { $regex: t, $options: 'i' }
      }));
    }

    if (prefs.locations?.length) {
      query.location = {
        $in: prefs.locations.map(l => new RegExp(l, 'i'))
      };
    }

    if (prefs.companies?.length) {
      query.company = { $in: prefs.companies };
    }

    // Entry level filter
    if (prefs.yearsOfExp === '0-1' || prefs.yearsOfExp === '0') {
      query['aiAnalysis.isEntryLevel'] = true;
    }

    // Don't show already-seen jobs
    if (user.seenJobIds?.length) {
      query._id = { $nin: user.seenJobIds };
    }

    const jobs = await Job.find(query)
      .sort({ postedAt: -1 })
      .limit(30)
      .lean();

    res.json({ jobs, matchCount: jobs.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single job details
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },    // increment view count
      { new: true }
    );
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
