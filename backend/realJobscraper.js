/**
 * Real Job Scraper - uses public Greenhouse & Lever APIs
 * FIXED: Uses shared mongoose connection, waits for DB ready
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');
const mongoose = require('mongoose');

// ── Job Schema (shared with rest of app) ──────────────────
const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: String,
  isRemote: { type: Boolean, default: false },
  description: String,
  requiredSkills: [String],
  jobType: { type: String, default: 'full-time' },
  sourceUrl: { type: String, required: true },
  sourceType: { type: String, default: 'official_careers' },
  jobId: { type: String },
  aiAnalysis: {
    isEntryLevel: Boolean,
    keySkills: [String],
    seniorityScore: Number,
    summarizedDescription: String,
  },
  postedAt: { type: Date, default: Date.now },
  scrapedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  alertsSent: { type: Number, default: 0 },
});
JobSchema.index({ sourceType: 1, jobId: 1 }, { unique: true, sparse: true });
JobSchema.index({ company: 1, postedAt: -1 });
JobSchema.index({ title: 'text' });

// Reuse existing model if already registered
const Job = mongoose.models.Job || mongoose.model('Job', JobSchema);

// ── Companies ─────────────────────────────────────────────
const GREENHOUSE = [
  { name: 'Swiggy', token: 'swiggy' },
  { name: 'Razorpay', token: 'razorpay' },
  { name: 'Meesho', token: 'meesho' },
  { name: 'Groww', token: 'groww' },
  { name: 'Airbnb', token: 'airbnb' },
  { name: 'Stripe', token: 'stripe' },
  { name: 'Atlassian', token: 'atlassian' },
  { name: 'Coinbase', token: 'coinbase' },
  { name: 'Notion', token: 'notion' },
  { name: 'Figma', token: 'figma' },
  { name: 'Canva', token: 'canva' },
  { name: 'Postman', token: 'postman' },
  { name: 'BrowserStack', token: 'browserstack' },
  { name: 'Freshworks', token: 'freshworks' },
  { name: 'Chargebee', token: 'chargebee' },
  { name: 'Sentry', token: 'sentry' },
];

const LEVER = [
  { name: 'Zepto', token: 'zepto' },
  { name: 'CRED', token: 'cred' },
  { name: 'Scale AI', token: 'scaleai' },
  { name: 'Plaid', token: 'plaid' },
  { name: 'Airtable', token: 'airtable' },
  { name: 'Rippling', token: 'rippling' },
  { name: 'Retool', token: 'retool' },
  { name: 'Anthropic', token: 'anthropic' },
  { name: 'OpenAI', token: 'openai' },
];

// ── AI Analysis (rule-based, no API needed) ───────────────
const analyzeJob = (title, description = '') => {
  const text = `${title} ${description}`.toLowerCase();
  const entryKw = ['fresher','fresh graduate','0-1','entry level','entry-level',
    'junior','trainee','associate','intern','recent graduate','new grad','0-2 year'];
  const seniorKw = ['3+ year','4+ year','5+ year','senior','lead','manager',
    'principal','staff engineer','architect','director'];
  const isEntryLevel = entryKw.some(k => text.includes(k)) && !seniorKw.some(k => text.includes(k));
  const allSkills = ['python','javascript','typescript','java','react','node.js','nodejs',
    'angular','vue','sql','mongodb','postgresql','aws','docker','kubernetes',
    'machine learning','go','rust','c++','c#','django','flask','flutter','swift',
    'kotlin','android','ios','devops','git','graphql','redis','next.js','express'];
  const keySkills = allSkills.filter(s => text.includes(s)).slice(0, 7);
  const seniorityScore = text.includes('senior')||text.includes('lead') ? 70
    : text.includes('intern')||text.includes('fresher') ? 10 : 30;
  return {
    isEntryLevel,
    keySkills,
    seniorityScore,
    summarizedDescription: description
      ? description.replace(/<[^>]*>/g,'').substring(0,200).trim()
      : `${title} at this company.`,
  };
};

// ── Wait for mongoose to be ready ─────────────────────────
const waitForDB = () => new Promise((resolve, reject) => {
  if (mongoose.connection.readyState === 1) return resolve();
  mongoose.connection.once('connected', resolve);
  mongoose.connection.once('error', reject);
  setTimeout(() => reject(new Error('DB timeout')), 30000);
});

// ── Save a single job safely ───────────────────────────────
const saveJob = async (data) => {
  try {
    await Job.findOneAndUpdate(
      { jobId: data.jobId },
      data,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return true;
  } catch (e) {
    if (e.code !== 11000) console.error(`  ✗ Save error [${data.title?.substring(0,40)}]: ${e.message}`);
    return false;
  }
};

// ── Scrape Greenhouse ──────────────────────────────────────
const scrapeGreenhouse = async (company) => {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs?content=true`;
    const res = await axios.get(url, { timeout: 12000 });
    const jobs = res.data.jobs || [];
    let saved = 0;
    // Save one at a time to avoid overwhelming DB
    for (const job of jobs) {
      const analysis = analyzeJob(job.title, job.content || '');
      const ok = await saveJob({
        title: job.title,
        company: company.name,
        location: job.location?.name || 'See listing',
        isRemote: (job.location?.name || '').toLowerCase().includes('remote'),
        description: (job.content || '').replace(/<[^>]*>/g,'').substring(0,800),
        sourceUrl: job.absolute_url,
        sourceType: 'official_careers',
        jobId: `gh_${job.id}`,
        jobType: 'full-time',
        postedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
        scrapedAt: new Date(),
        isActive: true,
        aiAnalysis: analysis,
        requiredSkills: analysis.keySkills,
      });
      if (ok) saved++;
    }
    console.log(`  ✓ ${company.name}: ${jobs.length} found, ${saved} new (Greenhouse)`);
    return saved;
  } catch (err) {
    console.log(`  ✗ ${company.name} (Greenhouse): ${err.message}`);
    return 0;
  }
};

// ── Scrape Lever ───────────────────────────────────────────
const scrapeLever = async (company) => {
  try {
    const url = `https://api.lever.co/v0/postings/${company.token}?mode=json`;
    const res = await axios.get(url, { timeout: 12000 });
    const jobs = Array.isArray(res.data) ? res.data : [];
    let saved = 0;
    for (const job of jobs) {
      const desc = job.descriptionPlain || job.description || '';
      const analysis = analyzeJob(job.text, desc);
      const ok = await saveJob({
        title: job.text,
        company: company.name,
        location: job.categories?.location || 'See listing',
        isRemote: (job.workplaceType || '').toLowerCase().includes('remote'),
        description: desc.substring(0, 800),
        sourceUrl: job.hostedUrl,
        sourceType: 'official_careers',
        jobId: `lv_${job.id}`,
        jobType: (job.categories?.commitment || 'full-time').toLowerCase(),
        postedAt: job.createdAt ? new Date(job.createdAt) : new Date(),
        scrapedAt: new Date(),
        isActive: true,
        aiAnalysis: analysis,
        requiredSkills: analysis.keySkills,
      });
      if (ok) saved++;
    }
    console.log(`  ✓ ${company.name}: ${jobs.length} found, ${saved} new (Lever)`);
    return saved;
  } catch (err) {
    console.log(`  ✗ ${company.name} (Lever): ${err.message}`);
    return 0;
  }
};

// ── Main export ────────────────────────────────────────────
const scrapeRealJobs = async () => {
  console.log('\n🔍 Scraping real jobs from official career APIs...');
  
  // Wait for DB to be connected before saving anything
  try {
    await waitForDB();
    console.log('✅ DB ready, starting scrape\n');
  } catch (e) {
    console.error('❌ DB not ready:', e.message);
    return 0;
  }

  let total = 0;

  // Greenhouse — one at a time to avoid DB overload
  for (const company of GREENHOUSE) {
    const count = await scrapeGreenhouse(company);
    total += count;
    await new Promise(r => setTimeout(r, 300)); // small delay between companies
  }

  // Lever — one at a time
  for (const company of LEVER) {
    const count = await scrapeLever(company);
    total += count;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Scrape complete! Total new jobs saved: ${total}\n`);
  return total;
};

// Run standalone: node backend/realJobScraper.js
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobalert')
    .then(async () => {
      await scrapeRealJobs();
      await mongoose.disconnect();
    })
    .catch(err => { console.error('DB Error:', err.message); process.exit(1); });
}

module.exports = { scrapeRealJobs };