const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Job = require('../models/Job');
const { authenticate } = require('../middleware/auth');

// GET all companies (with job counts)
router.get('/', async (req, res) => {
  try {
    const { industry, size, search, popular } = req.query;
    const query = {};
    
    if (industry) query.industry = industry;
    if (size) query.size = size;
    if (popular === 'true') query.isPopular = true;
    if (search) query.name = { $regex: search, $options: 'i' };

    const companies = await Company.find(query)
      .sort({ followersCount: -1, name: 1 })
      .limit(100)
      .lean();

    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET company + its recent jobs
router.get('/:slug', async (req, res) => {
  try {
    const company = await Company.findOne({ slug: req.params.slug });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const recentJobs = await Job.find({ company: company.name, isActive: true })
      .sort({ postedAt: -1 })
      .limit(20)
      .lean();

    res.json({ company, recentJobs, jobCount: recentJobs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow/unfollow company alert
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    const company = await Company.findById(req.params.id);

    const isFollowing = user.preferences.companies.includes(company.name);

    if (isFollowing) {
      user.preferences.companies = user.preferences.companies.filter(c => c !== company.name);
      company.followersCount = Math.max(0, company.followersCount - 1);
    } else {
      user.preferences.companies.push(company.name);
      company.followersCount += 1;
    }

    await Promise.all([user.save(), company.save()]);
    res.json({ following: !isFollowing, company: company.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
