# ⚡ JobAlert — Get Hired Before Others See the Posting

> A full-stack job alert platform that scrapes **official company career pages** every 15 minutes and sends you personalized email alerts. Designed for 0-2 year experience candidates who want a head start over LinkedIn and Naukri.

---

## 🎯 What Makes This Special

| Normal Job Search | JobAlert |
|---|---|
| Company posts job → Waits for LinkedIn/Naukri to crawl it (30min-2hrs) → You see it | Company posts job → **We scrape it in 15 min** → **You get email alert instantly** |

---

## 🛠️ Technology Stack (and WHY each was chosen)

### Backend
| Tech | Why We Use It |
|---|---|
| **Node.js** | JavaScript on the server. One language for both frontend and backend. |
| **Express.js** | Simple framework to create API endpoints. The "router" of our server. |
| **MongoDB** | Stores job data as flexible JSON documents. Perfect for varying job fields. |
| **Mongoose** | Gives MongoDB a schema so our data stays clean and consistent. |
| **JWT (JSON Web Tokens)** | Secure login sessions. User gets a "token" after login, sends it with every request. |
| **bcryptjs** | Hashes passwords before storing. Even if DB is hacked, passwords are safe. |
| **node-cron** | Runs scraping code on a schedule (every 15min, hourly, etc.) |
| **Nodemailer** | Sends HTML emails. Works with Gmail for dev, SendGrid for production. |
| **Puppeteer** | Controls real Chrome browser. For sites that load jobs via JavaScript (React apps). |
| **Axios** | Makes HTTP requests. Simpler than built-in `fetch`. |
| **Cheerio** | Parses HTML like jQuery. Extracts job data from HTML pages. |
| **OpenAI API** | Analyzes job descriptions to determine if entry-level, extract skills, summarize. |

### Frontend
| Tech | Why We Use It |
|---|---|
| **React** | Component-based UI. Updates only what changes. Industry standard. |
| **React Router** | Navigate between pages without full reload (Single Page Application). |
| **Axios** | Same HTTP library, used to call our backend API. |
| **CSS-in-JS** | Styles written directly in JavaScript. No separate CSS files to manage. |

---

## 📁 Project Structure

```
jobalert/
├── backend/                 # Server-side code
│   ├── server.js           # Main entry point, starts Express server + cron jobs
│   ├── models/             # Database schemas (blueprints for data)
│   │   ├── User.js         # User accounts + preferences + alert settings
│   │   ├── Job.js          # Scraped job postings
│   │   └── Company.js      # Companies we scrape + their career page URLs
│   ├── routes/             # API endpoints
│   │   ├── users.js        # /api/users - register, login, preferences
│   │   ├── jobs.js         # /api/jobs - search, recent, my-matches
│   │   ├── companies.js    # /api/companies - list, follow
│   │   └── alerts.js       # /api/alerts - test email, history
│   ├── middleware/
│   │   └── auth.js         # JWT token verification (protects private routes)
│   ├── services/
│   │   └── emailService.js # Sends beautiful HTML job alert emails
│   ├── seedCompanies.js    # Run once to add 50+ companies to database
│   └── package.json
│
├── scraper/                 # Web scraping code
│   ├── masterScraper.js    # Orchestrates all scrapers, saves to DB
│   └── aiAnalyzer.js       # AI analysis of job postings (entry-level? skills?)
│
├── frontend/                # React application
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── src/
│   │   ├── index.js        # React entry point
│   │   └── App.js          # All pages + components (Home, Signup, Dashboard, etc.)
│   └── package.json
│
├── .env.example            # Template for environment variables
└── README.md               # This file!
```

---

## 🚀 Setup Guide (Step by Step for Beginners)

### Prerequisites
Install these if you haven't:
1. **Node.js** → https://nodejs.org (download LTS version)
2. **VS Code** → https://code.visualstudio.com
3. **Git** (optional) → https://git-scm.com

### Step 1: MongoDB Setup (Free Database)
1. Go to https://cloud.mongodb.com
2. Click "Try Free" → Create account
3. Create a new project → Build a database → **Free Shared** tier
4. Choose a region close to you → Create cluster
5. Set up database user: **Database Access** → Add new user (save the password!)
6. Allow network access: **Network Access** → Add IP Address → Allow from anywhere (0.0.0.0/0)
7. Get connection string: **Connect** → Connect your application → Copy the URI
8. It looks like: `mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/jobalert`

### Step 2: Environment Variables
```bash
# In the jobalert folder, copy the example file:
cp .env.example .env

# Then open .env in VS Code and fill in your values:
# - MONGODB_URI (from Step 1)
# - JWT_SECRET (any long random string)
# - EMAIL_USER and EMAIL_APP_PASSWORD (Gmail setup below)
```

**Gmail App Password Setup:**
1. Go to your Google Account → Security
2. Enable 2-Step Verification (if not already)
3. Search for "App passwords" → Select app: Mail → Generate
4. Copy the 16-character password into `.env` as `EMAIL_APP_PASSWORD`

### Step 3: Install Dependencies and Start Backend
```bash
# Open terminal in VS Code (Ctrl+` or Terminal → New Terminal)

# Navigate to backend folder
cd backend

# Install all packages (this reads package.json and downloads them)
npm install

# This might take 2-5 minutes. Puppeteer downloads Chromium (~120MB)

# Seed the database with 50+ companies
node seedCompanies.js

# Start the backend server
npm run dev
# You should see: "🚀 JobAlert Server running on port 5000"
```

### Step 4: Start Frontend
```bash
# Open a NEW terminal tab (Ctrl+Shift+` in VS Code)

# Navigate to frontend folder
cd frontend

# Install React packages
npm install

# Start the frontend
npm start
# Browser opens automatically at http://localhost:3000
```

### Step 5: Test Everything
1. Open http://localhost:3000
2. Click "Get Alerts Free" → Create an account
3. Set your preferences (job title, location, etc.)
4. Go to Dashboard → Click "📧 Test Alert Email"
5. Check your email! You should receive a test alert.

---

## 📧 How Email Alerts Work

1. User registers and sets preferences + frequency (15min/1hr/daily)
2. `node-cron` runs every 15 minutes
3. It calls `scrapeAllCompanies()` → fetches new jobs from career pages
4. New jobs are saved to MongoDB + analyzed by AI
5. `sendPendingAlerts()` finds users whose alert is "due"
6. For each user, it queries MongoDB for jobs matching their preferences
7. Sends a beautiful HTML email with job cards + direct apply links
8. Updates `seenJobIds` so user never sees same job twice

---

## 🤖 How AI Analysis Works

When a new job is scraped, we send its title + description to GPT-4o-mini.
The AI returns structured JSON:
```json
{
  "isEntryLevel": true,
  "keySkills": ["React", "JavaScript", "Node.js"],
  "seniorityScore": 20,
  "summarizedDescription": "Frontend role at Swiggy building consumer web. Entry-level, React-focused.",
  "jobType": "full-time"
}
```

This lets us:
- Filter jobs accurately (not show senior jobs to freshers)
- Show skill tags on job cards
- Rank matches better

**Without an OpenAI key** → Falls back to rule-based analysis (keyword matching). Still works!

---

## 🔧 Adding More Companies

Edit `backend/seedCompanies.js` and add entries like:
```javascript
{
  name: 'YourCompany',
  slug: 'yourcompany',
  website: 'https://yourcompany.com',
  careersPageUrl: 'https://yourcompany.com/careers',
  scrapeConfig: {
    type: 'greenhouse',  // or 'lever', 'workday', 'custom'
    scrapeIntervalMinutes: 60,
    isWorking: true
  },
  industry: 'Technology',
  size: 'large',
  isPopular: true,
}
```

**How to know which type to use:**
- Check the careers URL. If it contains `greenhouse.io` → `greenhouse`
- If it contains `lever.co` → `lever`  
- If it contains `myworkday.com` → `workday`
- Otherwise → `custom` (will try HTML scraping)

---

## 🚀 Deploying to Production (Sell it!)

### Option A: Free Tier
- **Backend**: Railway.app or Render.com (free Node.js hosting)
- **Frontend**: Vercel.com (free React hosting)
- **Database**: MongoDB Atlas (already set up — free tier)
- **Email**: SendGrid (100 free emails/day)

### Option B: Paid (₹500-2000/month)
- **Backend**: DigitalOcean Droplet ($6/month)
- **Email**: SendGrid Essentials ($15/month for 50k emails)

### Monetization Ideas
1. **Freemium**: Free = 1 alert/day. Premium (₹299/mo) = instant alerts + more companies
2. **B2B**: Sell to placement cells, coding bootcamps
3. **Affiliate**: Earn commission when users apply through your links
4. **Resume Review**: Upsell resume services when sending alerts

---

## 📚 Learning Resources

If you want to understand the technologies deeper:
- **Node.js**: https://nodejs.org/en/learn
- **React**: https://react.dev/learn
- **MongoDB**: https://learn.mongodb.com (free courses)
- **Express**: https://expressjs.com/en/guide/routing.html
- **Web Scraping Ethics**: Always check robots.txt before scraping!

---

## ⚠️ Important Notes

1. **Respect robots.txt**: Some sites disallow scraping. Check `yoursite.com/robots.txt`
2. **Rate limiting**: Don't scrape too fast. Our 2-second batch delay is intentional.
3. **Terms of Service**: LinkedIn's ToS prohibits scraping. Use their official Job Search API for production.
4. **Legal**: For a commercial product, consult a lawyer about which sites you can scrape.

---

Built with ❤️ for job seekers who deserve a fair shot.
