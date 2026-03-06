/**
 * ============================================================
 * Master Scraper - The Heart of JobAlert
 * ============================================================
 * TECHNOLOGY: Puppeteer + Axios + Cheerio
 * 
 * WHY THREE DIFFERENT TOOLS?
 * 
 * 1. AXIOS: Simple HTTP requests. Like "fetch this URL and give
 *    me the HTML". Works for static pages and APIs. FAST!
 *    Use for: Company APIs, simple HTML pages
 * 
 * 2. CHEERIO: Parses HTML like jQuery. Once you have HTML,
 *    cheerio lets you do $('h1').text() to extract data.
 *    Use for: Parsing HTML from axios responses
 * 
 * 3. PUPPETEER: Controls a real Chrome browser. Some sites
 *    load jobs via JavaScript (React/Vue apps) — axios can't
 *    see this content. Puppeteer waits for JS to execute!
 *    Use for: LinkedIn, sites with JavaScript-rendered content
 * 
 * WHY SCRAPE OFFICIAL PAGES FIRST?
 * When a company posts a job, it goes to their ATS (Applicant
 * Tracking System) immediately. LinkedIn/Naukri then CRAWL
 * the company's page — this takes 30min to 2+ hours!
 * By going direct to source, we get jobs before aggregators.
 * ============================================================
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const Company = require('../backend/models/Company');
const Job = require('../backend/models/Job');
const { analyzeJobWithAI } = require('./aiAnalyzer');

// ============================================================
// MAIN FUNCTION: Scrape all companies
// ============================================================
const scrapeAllCompanies = async ({ quickMode = false } = {}) => {
  // In quickMode, only scrape companies that update frequently
  const query = { 'scrapeConfig.isWorking': true };
  if (quickMode) {
    // Only scrape companies we haven't checked in 10 minutes
    query['scrapeConfig.lastScrapedAt'] = {
      $lt: new Date(Date.now() - 10 * 60 * 1000)
    };
  }

  const companies = await Company.find(query);
  console.log(`🔍 Scraping ${companies.length} companies...`);

  const results = { scraped: 0, newJobs: 0, errors: 0 };

  // ============================================================
  // CONCURRENT SCRAPING with rate limiting
  // WHY: Scraping companies one-by-one is slow. We do them in
  // batches of 5 simultaneously. But we don't do ALL at once —
  // that would hammer servers and get us blocked!
  // ============================================================
  const BATCH_SIZE = 5;
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(company => scrapeCompany(company))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.scraped++;
        results.newJobs += result.value?.newJobs || 0;
      } else {
        results.errors++;
        console.error('Scrape error:', result.reason?.message);
      }
    }

    // Wait 2 seconds between batches to be polite to servers
    if (i + BATCH_SIZE < companies.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`✅ Scrape complete:`, results);
  return results;
};

// ============================================================
// SCRAPE A SINGLE COMPANY
// Routes to the right scraper based on their ATS type
// ============================================================
const scrapeCompany = async (company) => {
  const { scrapeConfig } = company;
  let jobs = [];

  try {
    switch (scrapeConfig.type) {
      case 'api':
        jobs = await scrapeViaAPI(company);
        break;
      case 'greenhouse':
        jobs = await scrapeGreenhouse(company);
        break;
      case 'lever':
        jobs = await scrapeLever(company);
        break;
      case 'workday':
        jobs = await scrapeWorkday(company);
        break;
      case 'custom':
        jobs = await scrapeCustom(company);
        break;
      default:
        jobs = await scrapeGeneric(company);
    }

    // Save new jobs and AI-analyze them
    const newJobs = await saveNewJobs(jobs, company);

    // Update scrape timestamp
    await Company.findByIdAndUpdate(company._id, {
      'scrapeConfig.lastScrapedAt': new Date(),
      'scrapeConfig.isWorking': true,
      activeJobCount: jobs.length,
    });

    return { company: company.name, newJobs: newJobs.length };

  } catch (err) {
    console.error(`❌ Failed scraping ${company.name}:`, err.message);
    await Company.findByIdAndUpdate(company._id, {
      'scrapeConfig.isWorking': false
    });
    throw err;
  }
};

// ============================================================
// GREENHOUSE ATS SCRAPER
// Greenhouse has a PUBLIC API! No scraping needed.
// URL format: https://boards-api.greenhouse.io/v1/boards/{company}/jobs
// WHY: Using an API is more reliable than HTML scraping.
// APIs are intentional — companies WANT you to read them.
// ============================================================
const scrapeGreenhouse = async (company) => {
  const boardToken = company.careersPageUrl.match(/boards\.greenhouse\.io\/(.+)/)?.[1]
    || company.name.toLowerCase().replace(/\s+/g, '');
  
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
  const response = await axios.get(url, { timeout: 15000 });
  
  return response.data.jobs.map(job => ({
    title: job.title,
    company: company.name,
    location: job.location?.name || 'Remote',
    sourceUrl: job.absolute_url,
    sourceType: 'official_careers',
    jobId: String(job.id),
    description: job.content,
    postedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
  }));
};

// ============================================================
// LEVER ATS SCRAPER
// Lever also has a public API!
// ============================================================
const scrapeLever = async (company) => {
  const slug = company.name.toLowerCase().replace(/\s+/g, '');
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  
  const response = await axios.get(url, { timeout: 15000 });
  
  return response.data.map(job => ({
    title: job.text,
    company: company.name,
    location: job.categories?.location || 'Remote',
    sourceUrl: job.hostedUrl,
    sourceType: 'official_careers',
    jobId: job.id,
    description: job.descriptionPlain,
    postedAt: job.createdAt ? new Date(job.createdAt) : new Date(),
    jobType: job.categories?.commitment?.toLowerCase() || 'full-time',
  }));
};

// ============================================================
// WORKDAY SCRAPER (requires puppeteer - JS-rendered site)
// Many Indian companies use Workday (Flipkart, Walmart, etc.)
// ============================================================
const scrapeWorkday = async (company) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',           // Run without opening a visible browser
      args: ['--no-sandbox', '--disable-setuid-sandbox']  // Required for Linux servers
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent so we're not detected as a bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto(company.careersPageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for job listings to load (Workday renders via React)
    await page.waitForSelector('[data-automation-id="jobTitle"]', { timeout: 15000 });
    
    // Extract job data from the rendered page
    const jobs = await page.evaluate((companyName) => {
      const jobElements = document.querySelectorAll('[data-automation-id="jobTitle"]');
      return Array.from(jobElements).map(el => ({
        title: el.textContent.trim(),
        company: companyName,
        sourceUrl: el.href || window.location.href,
        sourceType: 'official_careers',
        location: el.closest('[data-automation-id="compositeJob"]')
          ?.querySelector('[data-automation-id="location"]')?.textContent?.trim() || 'Unknown',
      }));
    }, company.name);

    return jobs;
    
  } finally {
    if (browser) await browser.close();  // Always close browser to free memory!
  }
};

// ============================================================
// GENERIC HTML SCRAPER (fallback)
// Uses cheerio to parse HTML like jQuery
// ============================================================
const scrapeGeneric = async (company) => {
  const response = await axios.get(company.careersPageUrl, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)' }
  });
  
  const $ = cheerio.load(response.data);
  const jobs = [];
  const { jobListSelector, titleSelector, locationSelector } = company.scrapeConfig;

  // Use company-specific CSS selectors if configured
  if (jobListSelector) {
    $(jobListSelector).each((i, el) => {
      const title = $(el).find(titleSelector || 'h3, h4, .title').first().text().trim();
      const location = $(el).find(locationSelector || '.location').first().text().trim();
      const link = $(el).find('a').first().attr('href');
      
      if (title) {
        jobs.push({
          title,
          company: company.name,
          location: location || 'See listing',
          sourceUrl: link?.startsWith('http') ? link : `${company.website}${link}`,
          sourceType: 'official_careers',
          jobId: link || title,
        });
      }
    });
  }

  return jobs;
};

const scrapeViaAPI = async (company) => {
  const response = await axios.get(company.scrapeConfig.apiEndpoint, { timeout: 15000 });
  // Company-specific API parsing would go here
  return response.data.jobs || response.data || [];
};

// ============================================================
// SAVE NEW JOBS + AI ANALYSIS
// ============================================================
const saveNewJobs = async (jobs, company) => {
  const newJobs = [];

  for (const jobData of jobs) {
    try {
      // Check if job already exists (using jobId + sourceType unique index)
      const exists = await Job.findOne({
        sourceType: jobData.sourceType,
        jobId: jobData.jobId || jobData.sourceUrl,
      });

      if (!exists) {
        // NEW JOB FOUND! Analyze it with AI
        const aiAnalysis = await analyzeJobWithAI(jobData);
        
        const job = await Job.create({
          ...jobData,
          jobId: jobData.jobId || jobData.sourceUrl,
          aiAnalysis,
        });

        newJobs.push(job);
        console.log(`  ✨ New job: ${job.title} @ ${job.company}`);
      }
    } catch (err) {
      if (err.code !== 11000) {  // 11000 = duplicate key (already exists)
        console.error('Error saving job:', err.message);
      }
    }
  }

  return newJobs;
};

module.exports = { scrapeAllCompanies, scrapeCompany };
