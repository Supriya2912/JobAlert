/**
 * ============================================================
 * Company Model
 * ============================================================
 * WHY: We maintain a list of companies with their official
 * careers page URLs. This is the CORE of what makes your app
 * special — scraping official pages BEFORE LinkedIn/Naukri
 * picks them up. This gives users a 30min-2hr head start!
 * ============================================================
 */

const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },      // URL-friendly name: "google" "microsoft"
  logoUrl: String,
  website: String,

  // ============================================================
  // THE MOST IMPORTANT FIELD:
  // Official careers page URL — this is scraped first!
  // ============================================================
  careersPageUrl: { type: String, required: true },
  
  // How to scrape this specific company's careers page
  scrapeConfig: {
    type: {
      type: String,
      enum: ['workday', 'greenhouse', 'lever', 'icims', 'taleo', 'custom', 'api'],
      // EXPLANATION of each:
      // workday = Workday ATS (used by Amazon, Walmart, etc.)
      // greenhouse = Greenhouse ATS (used by Airbnb, Stripe, etc.)
      // lever = Lever ATS (used by Netflix, etc.)
      // icims = iCIMS ATS (used by many Indian companies)
      // taleo = Oracle Taleo (used by large enterprises)
      // custom = Company has its own unique careers page
      // api = Company has a public jobs API (best & most reliable!)
    },
    apiEndpoint: String,        // If they have an API, use it
    jobListSelector: String,    // CSS selector to find job listings
    titleSelector: String,      // CSS selector for job title
    locationSelector: String,
    lastScrapedAt: Date,
    scrapeIntervalMinutes: { type: Number, default: 60 },
    isWorking: { type: Boolean, default: true },
  },

  // LinkedIn and Naukri company IDs (for supplemental scraping)
  linkedinCompanyId: String,
  naukriCompanyId: String,

  // Stats
  totalJobsScraped: { type: Number, default: 0 },
  activeJobCount: { type: Number, default: 0 },
  followersCount: { type: Number, default: 0 },  // Users watching this company
  
  // Categorization
  industry: String,
  size: {
    type: String,
    enum: ['startup', 'small', 'medium', 'large', 'enterprise']
  },
  isPopular: { type: Boolean, default: false },  // Show in "Top Companies" list
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Company', CompanySchema);
