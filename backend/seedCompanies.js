require('dotenv').config();
const mongoose = require('mongoose');

// Flat schema avoids Mongoose treating "type" as a schema keyword
const CompanySchema = new mongoose.Schema({
  name: String, slug: String, website: String, careersPageUrl: String,
  scrapeConfig: {
    atsType: String, apiEndpoint: String, scrapeIntervalMinutes: Number, isWorking: Boolean,
  },
  totalJobsScraped: { type: Number, default: 0 },
  activeJobCount: { type: Number, default: 0 },
  followersCount: { type: Number, default: 0 },
  industry: String, size: String, isPopular: Boolean,
}, { collection: 'companies' });

const Company = mongoose.model('Company', CompanySchema);

const COMPANIES = [
  { name: 'Google', slug: 'google', website: 'https://google.com', careersPageUrl: 'https://careers.google.com/jobs', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Technology', size: 'enterprise', isPopular: true },
  { name: 'Microsoft', slug: 'microsoft', website: 'https://microsoft.com', careersPageUrl: 'https://jobs.careers.microsoft.com', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Technology', size: 'enterprise', isPopular: true },
  { name: 'Amazon', slug: 'amazon', website: 'https://amazon.com', careersPageUrl: 'https://www.amazon.jobs/en/search', scrapeConfig: { atsType: 'workday', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Technology', size: 'enterprise', isPopular: true },
  { name: 'Meta', slug: 'meta', website: 'https://meta.com', careersPageUrl: 'https://www.metacareers.com/jobs', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Technology', size: 'enterprise', isPopular: true },
  { name: 'Apple', slug: 'apple', website: 'https://apple.com', careersPageUrl: 'https://jobs.apple.com', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Technology', size: 'enterprise', isPopular: true },
  { name: 'Flipkart', slug: 'flipkart', website: 'https://flipkart.com', careersPageUrl: 'https://www.flipkartcareers.com/#!/joblist', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 30, isWorking: true }, industry: 'E-Commerce', size: 'enterprise', isPopular: true },
  { name: 'Swiggy', slug: 'swiggy', website: 'https://swiggy.com', careersPageUrl: 'https://careers.swiggy.com/#/careers', scrapeConfig: { atsType: 'greenhouse', scrapeIntervalMinutes: 30, isWorking: true }, industry: 'Food Tech', size: 'large', isPopular: true },
  { name: 'Zomato', slug: 'zomato', website: 'https://zomato.com', careersPageUrl: 'https://www.zomato.com/careers', scrapeConfig: { atsType: 'lever', scrapeIntervalMinutes: 30, isWorking: true }, industry: 'Food Tech', size: 'large', isPopular: true },
  { name: 'CRED', slug: 'cred', website: 'https://cred.club', careersPageUrl: 'https://careers.cred.club', scrapeConfig: { atsType: 'lever', scrapeIntervalMinutes: 30, isWorking: true }, industry: 'Fintech', size: 'medium', isPopular: true },
  { name: 'Razorpay', slug: 'razorpay', website: 'https://razorpay.com', careersPageUrl: 'https://razorpay.com/jobs', scrapeConfig: { atsType: 'greenhouse', scrapeIntervalMinutes: 30, isWorking: true }, industry: 'Fintech', size: 'large', isPopular: true },
  { name: 'Meesho', slug: 'meesho', website: 'https://meesho.com', careersPageUrl: 'https://meesho.io/jobs', scrapeConfig: { atsType: 'greenhouse', scrapeIntervalMinutes: 30, isWorking: true }, industry: 'E-Commerce', size: 'large', isPopular: true },
  { name: 'PhonePe', slug: 'phonepe', website: 'https://phonepe.com', careersPageUrl: 'https://www.phonepe.com/careers', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Fintech', size: 'large', isPopular: true },
  { name: 'Paytm', slug: 'paytm', website: 'https://paytm.com', careersPageUrl: 'https://paytm.com/careers', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Fintech', size: 'large', isPopular: true },
  { name: 'Ola', slug: 'ola', website: 'https://olacabs.com', careersPageUrl: 'https://jobs.olacabs.com', scrapeConfig: { atsType: 'lever', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Mobility', size: 'large', isPopular: true },
  { name: 'Uber', slug: 'uber', website: 'https://uber.com', careersPageUrl: 'https://www.uber.com/global/en/careers', scrapeConfig: { atsType: 'greenhouse', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Mobility', size: 'enterprise', isPopular: true },
  { name: 'Infosys', slug: 'infosys', website: 'https://infosys.com', careersPageUrl: 'https://career.infosys.com/joblist', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'IT Services', size: 'enterprise', isPopular: true },
  { name: 'TCS', slug: 'tcs', website: 'https://tcs.com', careersPageUrl: 'https://ibegin.tcs.com/iBegin/', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'IT Services', size: 'enterprise', isPopular: true },
  { name: 'Wipro', slug: 'wipro', website: 'https://wipro.com', careersPageUrl: 'https://careers.wipro.com/careers-home', scrapeConfig: { atsType: 'workday', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'IT Services', size: 'enterprise', isPopular: true },
  { name: 'HCL Technologies', slug: 'hcl', website: 'https://hcltech.com', careersPageUrl: 'https://www.hcltech.com/careers', scrapeConfig: { atsType: 'custom', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'IT Services', size: 'enterprise', isPopular: true },
  { name: 'Groww', slug: 'groww', website: 'https://groww.in', careersPageUrl: 'https://careers.groww.in', scrapeConfig: { atsType: 'greenhouse', scrapeIntervalMinutes: 30, isWorking: true }, industry: 'Fintech', size: 'large', isPopular: true },
  { name: 'Zepto', slug: 'zepto', website: 'https://www.zeptonow.com', careersPageUrl: 'https://jobs.lever.co/zepto', scrapeConfig: { atsType: 'lever', scrapeIntervalMinutes: 30, isWorking: true }, industry: 'Quick Commerce', size: 'medium', isPopular: true },
  { name: 'Atlassian', slug: 'atlassian', website: 'https://atlassian.com', careersPageUrl: 'https://www.atlassian.com/company/careers', scrapeConfig: { atsType: 'greenhouse', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Technology', size: 'large', isPopular: true },
  { name: 'Stripe', slug: 'stripe', website: 'https://stripe.com', careersPageUrl: 'https://stripe.com/jobs', scrapeConfig: { atsType: 'greenhouse', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Fintech', size: 'large', isPopular: true },
  { name: 'Airbnb', slug: 'airbnb', website: 'https://airbnb.com', careersPageUrl: 'https://careers.airbnb.com', scrapeConfig: { atsType: 'greenhouse', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Travel', size: 'large', isPopular: true },
  { name: 'Dunzo', slug: 'dunzo', website: 'https://dunzo.com', careersPageUrl: 'https://www.dunzo.com/blog/careers', scrapeConfig: { atsType: 'lever', scrapeIntervalMinutes: 60, isWorking: true }, industry: 'Quick Commerce', size: 'medium', isPopular: false },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobalert');
    console.log('✅ Connected to MongoDB\n');

    let added = 0, failed = 0;

    for (const company of COMPANIES) {
      try {
        await Company.findOneAndUpdate(
          { slug: company.slug },
          { ...company, followersCount: 0, totalJobsScraped: 0, activeJobCount: 0 },
          { upsert: true, new: true, runValidators: false }
        );
        console.log(`  ✓ ${company.name}`);
        added++;
      } catch (err) {
        console.error(`  ✗ ${company.name}: ${err.message}`);
        failed++;
      }
    }

    console.log(`\n🎉 Done! Added: ${added} | Failed: ${failed}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  }
};

seed();