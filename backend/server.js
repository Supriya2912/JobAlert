require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/users');
const jobRoutes = require('./routes/jobs');
const alertRoutes = require('./routes/alerts');
const companyRoutes = require('./routes/companies');

app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/companies', companyRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.post('/api/scrape/now', async (req, res) => {
  res.json({ message: 'Scrape started' });
  const { scrapeRealJobs } = require('./realJobScraper');
  scrapeRealJobs().then(n => console.log(`Manual scrape: ${n} jobs`));
});

const PORT = process.env.PORT || 5000;

// ============================================================
// Connect to MongoDB FIRST, then start everything else
// WHY: We must wait for DB to be ready before scraping or
// starting the server. This fixes the "DB not ready" error.
// ============================================================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobalert')
  .then(async () => {
    console.log('✅ MongoDB Connected');

    // Start HTTP server AFTER DB is connected
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Import scraper only after DB is ready
    const { scrapeRealJobs } = require('./realJobScraper');
    const { sendPendingAlerts } = require('./services/emailService');

    // Schedule cron jobs
    cron.schedule('0 * * * *', async () => {
      console.log('🔍 Hourly scrape...');
      await scrapeRealJobs();
      await sendPendingAlerts();
    });

    cron.schedule('*/15 * * * *', async () => {
      console.log('⚡ 15-min scrape...');
      await scrapeRealJobs();
      await sendPendingAlerts({ urgentOnly: true });
    });

    // Run initial scrape after 2 second delay (let server fully start first)
    console.log('⏳ Starting initial job scrape in 2 seconds...');
    setTimeout(async () => {
      try {
        await scrapeRealJobs();
        console.log('✅ Initial scrape done! Jobs are now in the database.');
      } catch (err) {
        console.error('❌ Initial scrape error:', err.message);
      }
    }, 2000);

  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });