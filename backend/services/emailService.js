require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Job = require('../models/Job');

let cachedTransporter = null;

const createTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  // Option 1: SendGrid
  if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net', port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
    });
    return cachedTransporter;
  }

  // Option 2: Gmail with App Password
  const gmailUser = process.env.EMAIL_USER;
  const gmailPass = process.env.EMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass && !gmailUser.includes('your.email') && !gmailPass.includes('xxxx') && gmailPass.replace(/\s/g,'').length >= 16) {
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass.replace(/\s/g, '') }
    });
    try {
      await t.verify();
      console.log('✅ Gmail transporter ready');
      cachedTransporter = t;
      return cachedTransporter;
    } catch (err) {
      console.log('⚠️  Gmail auth failed:', err.message);
    }
  }

  // Option 3: Ethereal — fake inbox, view emails in browser
  console.log('📧 Using Ethereal test inbox');
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
  cachedTransporter._ethereal = testAccount;
  return cachedTransporter;
};

// ============================================================
// SEND TEST ALERT — sends to the currently logged-in user's email
// ============================================================
const sendTestAlert = async (user) => {
  const transporter = await createTransporter();

  // Real company URLs so Apply buttons actually work!
  const mockJobs = [
    {
      title: 'Frontend Developer (React)',
      company: 'Swiggy',
      location: 'Bangalore',
      jobType: 'Full-time',
      sourceType: 'official_careers',
      sourceUrl: 'https://careers.swiggy.com/#/careers',
      postedAt: new Date(),
      salary: '6-10 LPA',
      skills: ['React', 'JavaScript', 'CSS', 'TypeScript'],
      isEntryLevel: true,
    },
    {
      title: 'Backend Engineer (Node.js)',
      company: 'Razorpay',
      location: 'Bangalore / Remote',
      jobType: 'Full-time',
      sourceType: 'official_careers',
      sourceUrl: 'https://razorpay.com/jobs/',
      postedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
      salary: '8-12 LPA',
      skills: ['Node.js', 'MongoDB', 'AWS', 'REST APIs'],
      isEntryLevel: true,
    },
  ];

  const jobCards = mockJobs.map(job => `
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid ${job.isEntryLevel ? '#10b981' : '#6366f1'};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <h3 style="margin:0;color:#1a202c;font-size:16px;">${job.title}</h3>
            ${job.isEntryLevel ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">FRESHER OK</span>` : ''}
          </div>
          <p style="margin:0 0 8px;color:#6366f1;font-weight:600;font-size:15px;">${job.company}</p>
          <p style="margin:0;color:#64748b;font-size:13px;">
            📍 ${job.location} &nbsp;|&nbsp; 💼 ${job.jobType} &nbsp;|&nbsp; 🕐 ${timeAgo(job.postedAt)}
          </p>
          ${job.salary ? `<p style="margin:6px 0 0;color:#059669;font-size:13px;font-weight:600;">💰 ${job.salary}</p>` : ''}
          <div style="margin-top:10px;">
            ${job.skills.map(s => `<span style="display:inline-block;background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:6px;font-size:12px;margin-right:6px;margin-bottom:4px;">${s}</span>`).join('')}
          </div>
        </div>
        <span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;margin-left:12px;">⚡ Official</span>
      </div>
      <a href="${job.sourceUrl}" 
         target="_blank"
         style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        Apply Now →
      </a>
      <span style="margin-left:12px;color:#94a3b8;font-size:12px;">Opens official careers page</span>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:32px;margin-bottom:8px;">⚡</div>
      <h1 style="color:white;margin:0 0 8px;font-size:24px;font-weight:800;">JobAlert — Test Email</h1>
      <p style="color:rgba(255,255,255,0.9);margin:0;font-size:16px;">Hi ${user.name}! Your alerts are working! 🎉</p>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:13px;">
        Sent to: ${user.email} &nbsp;|&nbsp; Frequency: ${user.alertSettings?.frequency || '1hour'}
      </p>
    </div>

    <!-- Info banner -->
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#92400e;">
      <strong>ℹ️ This is a test.</strong> These are sample jobs with real company URLs. 
      Click "Apply Now" to verify the buttons work — they open official career pages!
    </div>

    <!-- Job Cards -->
    ${jobCards}

    <!-- What happens next -->
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin-top:8px;">
      <p style="margin:0;font-size:14px;color:#166534;">
        <strong>✅ Everything is working!</strong> Real alerts will send jobs matching your profile 
        (${user.preferences?.jobTitles?.join(', ') || 'your saved preferences'}) 
        every ${user.alertSettings?.frequency || '1 hour'}.
      </p>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      JobAlert ⚡ — Get hired before others see the posting<br>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="color:#6366f1;">Manage your alerts</a>
    </p>
  </div>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"JobAlert ⚡" <${process.env.EMAIL_USER || 'jobalert@test.com'}>`,
    to: user.email,   // ← Always sends to the LOGGED IN user's email
    subject: `⚡ JobAlert Test — Your alerts are working, ${user.name.split(' ')[0]}!`,
    html,
  });

  console.log(`📧 Test alert sent to: ${user.email}`);

  if (transporter._ethereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n🔗 VIEW EMAIL: ${previewUrl}\n`);
    return previewUrl;
  }
  return null;
};

// ============================================================
// SEND REAL JOB ALERTS (called by cron scheduler)
// ============================================================
const sendPendingAlerts = async ({ urgentOnly = false } = {}) => {
  const now = new Date();
  const query = {
    'alertSettings.isActive': true,
    'alertSettings.emailEnabled': true,
    'alertSettings.nextAlertDue': { $lte: now },
  };
  if (urgentOnly) query['alertSettings.frequency'] = { $in: ['instant', '15min'] };

  const users = await User.find(query);
  console.log(`📬 Sending alerts to ${users.length} users`);
  let emailsSent = 0;

  for (const user of users) {
    try {
      const matchingJobs = await findMatchingJobs(user);
      if (matchingJobs.length === 0) { await updateNextAlertTime(user); continue; }
      await sendJobAlertEmail(user, matchingJobs);
      const jobIds = matchingJobs.map(j => j._id);
      await User.findByIdAndUpdate(user._id, { $addToSet: { seenJobIds: { $each: jobIds } } });
      await updateNextAlertTime(user);
      emailsSent++;
    } catch (err) {
      console.error(`❌ Failed to send alert to ${user.email}:`, err.message);
    }
  }
  console.log(`✅ Sent ${emailsSent} alert emails`);
  return emailsSent;
};

const findMatchingJobs = async (user) => {
  const prefs = user.preferences;
  const query = { isActive: true };
  if (user.seenJobIds?.length > 0) query._id = { $nin: user.seenJobIds };
  query.postedAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
  if (prefs.jobTitles?.length) query.$or = prefs.jobTitles.map(t => ({ title: { $regex: t, $options: 'i' } }));
  if (prefs.locations?.length) query.location = { $in: prefs.locations.map(l => new RegExp(l, 'i')) };
  if (prefs.yearsOfExp === '0-1' || prefs.yearsOfExp === '0') query['aiAnalysis.isEntryLevel'] = true;
  return Job.find(query).sort({ postedAt: -1 }).limit(10).lean();
};

const sendJobAlertEmail = async (user, jobs) => {
  const transporter = await createTransporter();

  const jobCards = jobs.map(job => `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid #6366f1;">
      <h3 style="margin:0 0 4px;color:#1a202c;">${job.title}</h3>
      <p style="margin:0 0 8px;color:#6366f1;font-weight:600;">${job.company}</p>
      <p style="margin:0;color:#64748b;font-size:14px;">📍 ${job.location || 'Remote'} | 💼 ${job.jobType || 'Full-time'} | 🕐 ${timeAgo(job.postedAt)}</p>
      ${job.aiAnalysis?.keySkills?.length ? `<div style="margin-top:10px;">${job.aiAnalysis.keySkills.slice(0,5).map(s=>`<span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:12px;margin-right:6px;">${s}</span>`).join('')}</div>` : ''}
      <a href="${job.sourceUrl}" target="_blank" style="display:inline-block;margin-top:14px;background:#6366f1;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Apply Now →</a>
    </div>`).join('');

  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:0;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0 0 8px;">⚡ JobAlert</h1>
        <p style="color:rgba(255,255,255,0.9);margin:0;">${jobs.length} new job${jobs.length>1?'s':''} matching your profile!</p>
        <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:13px;">Hi ${user.name} 🎯</p>
      </div>
      ${jobCards}
      <p style="text-align:center;color:#94a3b8;font-size:13px;">JobAlert — Get hired before others see the posting</p>
    </div></body></html>`;

  const info = await transporter.sendMail({
    from: `"JobAlert ⚡" <${process.env.EMAIL_USER || 'jobalert@test.com'}>`,
    to: user.email,
    subject: `⚡ ${jobs.length} new job opening${jobs.length>1?'s':''} for you!`,
    html,
  });

  if (transporter._ethereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n📧 EMAIL PREVIEW: ${previewUrl}\n`);
  }

  await Job.updateMany({ _id: { $in: jobs.map(j=>j._id) } }, { $inc: { alertsSent: 1 } });
};

const updateNextAlertTime = async (user) => {
  const map = { 'instant':1,'15min':15,'30min':30,'1hour':60,'3hour':180,'6hour':360,'daily':1440 };
  const minutes = map[user.alertSettings.frequency] || 60;
  await User.findByIdAndUpdate(user._id, {
    'alertSettings.lastAlertSent': new Date(),
    'alertSettings.nextAlertDue': new Date(Date.now() + minutes * 60 * 1000),
  });
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

module.exports = { sendPendingAlerts, sendTestAlert };