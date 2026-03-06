/**
 * ============================================================
 * AI Job Analyzer
 * ============================================================
 * TECHNOLOGY: OpenAI GPT-4 API (or Claude API)
 * 
 * WHY AI FOR JOB ANALYSIS?
 * Job postings are messy text. We need to automatically:
 * 1. Determine if a job is truly entry-level (0-1 years)
 *    - "0-2 years" → entry level
 *    - "Fresh graduates welcome" → entry level
 *    - "2+ years required" → NOT entry level
 * 2. Extract key skills (Python, React, SQL, etc.)
 * 3. Summarize the description to 2-3 sentences
 * 4. Give it a "seniority score" (0=intern, 100=VP)
 * 
 * Without AI, you'd need to write hundreds of regex rules
 * and still miss many cases. AI handles natural language!
 * ============================================================
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeJobWithAI = async (jobData) => {
  // If no OpenAI key configured, return smart defaults
  if (!process.env.OPENAI_API_KEY) {
    return analyzeJobWithRules(jobData);
  }

  try {
    // ============================================================
    // PROMPT ENGINEERING
    // This is carefully crafted to get structured JSON output.
    // The prompt tells the AI exactly what to extract and return.
    // WHY JSON: So we can parse and store it in our database!
    // ============================================================
    const prompt = `Analyze this job posting and return a JSON object with these exact fields:
{
  "isEntryLevel": boolean,           // true if requires 0-2 years experience or says "fresher/graduate welcome"
  "experienceMin": number,           // minimum years required (0 if fresher)
  "experienceMax": number,           // maximum years required
  "keySkills": string[],             // top 5-8 technical skills mentioned
  "seniorityScore": number,          // 0-100 where 0=intern, 25=junior, 50=mid, 75=senior, 100=lead/manager
  "matchKeywords": string[],         // keywords useful for job matching
  "summarizedDescription": string,   // 2-3 sentence plain English summary
  "jobType": string                  // "full-time", "internship", "contract", or "part-time"
}

Job Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location}
Description: ${(jobData.description || '').slice(0, 2000)}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',     // Cheapest GPT-4 model — fast and accurate
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },   // Force JSON output
      max_tokens: 500,
      temperature: 0.1,         // Low temperature = more consistent/predictable output
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    return analysis;

  } catch (err) {
    console.error('AI analysis failed, using rules:', err.message);
    return analyzeJobWithRules(jobData);
  }
};

// ============================================================
// RULE-BASED FALLBACK (no API key needed)
// Simple but effective — catches most cases
// ============================================================
const analyzeJobWithRules = (jobData) => {
  const text = `${jobData.title} ${jobData.description || ''}`.toLowerCase();

  // Check for entry-level indicators
  const entryLevelKeywords = [
    'fresher', 'fresh graduate', '0-1', '0 to 1', '0-2', 'entry level',
    'entry-level', 'junior', 'trainee', 'associate', 'intern',
    'no experience', 'recent graduate', 'campus hire', 'apprentice'
  ];
  const seniorKeywords = [
    '3+ years', '4+ years', '5+ years', 'senior', 'lead', 'manager',
    'principal', 'staff engineer', 'architect', 'vp ', 'director'
  ];

  const isEntryLevel = entryLevelKeywords.some(kw => text.includes(kw))
    && !seniorKeywords.some(kw => text.includes(kw));

  // Extract skills using keyword matching
  const allSkills = [
    'python', 'javascript', 'java', 'react', 'node.js', 'nodejs', 'angular',
    'vue', 'sql', 'mongodb', 'postgresql', 'aws', 'docker', 'kubernetes',
    'machine learning', 'deep learning', 'data science', 'typescript',
    'go', 'rust', 'c++', 'c#', '.net', 'spring boot', 'django', 'flask',
    'flutter', 'swift', 'kotlin', 'android', 'ios', 'devops', 'git',
    'linux', 'rest api', 'graphql', 'redis', 'elasticsearch', 'kafka',
  ];
  const keySkills = allSkills.filter(skill => text.includes(skill)).slice(0, 8);

  // Calculate seniority score
  let seniorityScore = isEntryLevel ? 15 : 50;
  if (text.includes('senior')) seniorityScore = 70;
  if (text.includes('lead') || text.includes('principal')) seniorityScore = 80;
  if (text.includes('manager') || text.includes('director')) seniorityScore = 90;

  // Simple summary
  const summarizedDescription = `${jobData.title} role at ${jobData.company}. `
    + (isEntryLevel ? 'Entry-level position suitable for freshers/junior candidates. ' : '')
    + (keySkills.length > 0 ? `Key skills: ${keySkills.slice(0, 4).join(', ')}.` : '');

  return {
    isEntryLevel,
    experienceMin: isEntryLevel ? 0 : 2,
    experienceMax: isEntryLevel ? 1 : 5,
    keySkills,
    seniorityScore,
    matchKeywords: [...keySkills, jobData.title.toLowerCase()],
    summarizedDescription,
    jobType: text.includes('intern') ? 'internship' : 'full-time',
  };
};

module.exports = { analyzeJobWithAI };
