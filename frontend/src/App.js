import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AuthContext = createContext(null);
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.get('/users/me').then(res => setUser(res.data)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);
  const login = async (email, password) => {
    const res = await API.post('/users/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user); return res.data;
  };
  const register = async (data) => {
    const res = await API.post('/users/register', data);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user); return res.data;
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
};
const useAuth = () => useContext(AuthContext);

// ── Shared Styles ──────────────────────────────────────────
const S = {
  input: {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
    color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  },
  btn: {
    padding: '11px 22px', borderRadius: '8px',
    background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
    color: 'white', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
  },
  card: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '12px', padding: '20px',
  },
};

// ── Navbar ─────────────────────────────────────────────────
const Navbar = () => {
  const { user, logout } = useAuth();
  return (
    <nav style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000 }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '22px' }}>⚡</span>
        <span style={{ fontWeight: '800', fontSize: '18px', background: 'linear-gradient(90deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>JobAlert</span>
      </Link>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <Link to="/jobs" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '7px 12px', fontSize: '14px' }}>Browse Jobs</Link>
        <Link to="/companies" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '7px 12px', fontSize: '14px' }}>Companies</Link>
        {user ? (
          <>
            <Link to="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '7px 12px', fontSize: '14px' }}>Dashboard</Link>
            <button onClick={logout} style={{ ...S.btn, background: 'rgba(255,255,255,0.08)', fontSize: '13px', padding: '7px 14px' }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '7px 12px', fontSize: '14px' }}>Login</Link>
            <Link to="/signup" style={{ ...S.btn, textDecoration: 'none', fontSize: '13px', padding: '8px 16px' }}>Get Alerts Free</Link>
          </>
        )}
      </div>
    </nav>
  );
};

// ── Time ago helper ────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Job Card ───────────────────────────────────────────────
const JobCard = ({ job }) => {
  const isOfficial = job.sourceType === 'official_careers';
  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${isOfficial ? '#10b981' : '#6366f1'}`, transition: 'background 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'white' }}>{job.title}</h3>
            {job.aiAnalysis?.isEntryLevel && (
              <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>FRESHER OK</span>
            )}
          </div>
          <p style={{ margin: '0 0 6px', color: '#a78bfa', fontWeight: '600', fontSize: '14px' }}>{job.company}</p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            📍 {job.location || 'Remote'} &nbsp;·&nbsp; 💼 {job.jobType || 'Full-time'} &nbsp;·&nbsp; 🕐 {timeAgo(job.postedAt)}
          </p>
          {job.aiAnalysis?.keySkills?.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {job.aiAnalysis.keySkills.slice(0, 5).map(skill => (
                <span key={skill} style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px', fontSize: '11px' }}>{skill}</span>
              ))}
            </div>
          )}
          {job.aiAnalysis?.summarizedDescription && (
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: '1.5' }}>
              {job.aiAnalysis.summarizedDescription.substring(0, 120)}...
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', minWidth: '100px' }}>
          <span style={{ background: isOfficial ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: isOfficial ? '#10b981' : '#818cf8', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
            {isOfficial ? '⚡ Official' : '🔗 ' + job.sourceType}
          </span>
          <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: 'white', padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' }}>
            Apply →
          </a>
        </div>
      </div>
    </div>
  );
};

// ── Home Page ──────────────────────────────────────────────
const HomePage = () => {
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    API.get('/jobs/search?limit=6&sortBy=postedAt').then(res => setRecentJobs(res.data.jobs || [])).finally(() => setLoading(false));
  }, []);
  return (
    <div style={{ minHeight: '100vh', background: '#080616', color: 'white' }}>
      <div style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,0.25) 0%,transparent 70%)', padding: '64px 24px 48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', color: '#a78bfa', marginBottom: '20px', fontWeight: '600' }}>
          ⚡ Jobs scraped from official pages — 30min to 2hr before LinkedIn/Naukri
        </div>
        <h1 style={{ fontFamily: 'system-ui', fontSize: 'clamp(28px,5vw,56px)', fontWeight: '800', lineHeight: '1.1', marginBottom: '16px', background: 'linear-gradient(135deg,#fff 0%,#a78bfa 50%,#60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Get hired before others<br />even see the posting
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '16px', marginBottom: '32px', maxWidth: '560px', margin: '0 auto 32px' }}>
          We scrape official company career pages every 15 minutes and send you personalized email alerts. Built for 0-2 year experience candidates.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/signup')} style={{ ...S.btn, fontSize: '15px', padding: '13px 28px' }}>🚀 Start Getting Alerts — Free</button>
          <button onClick={() => navigate('/jobs')} style={{ ...S.btn, background: 'rgba(255,255,255,0.08)', fontSize: '15px', padding: '13px 28px' }}>Browse Live Jobs →</button>
        </div>
        <div style={{ display: 'flex', gap: '36px', justifyContent: 'center', marginTop: '48px', flexWrap: 'wrap' }}>
          {[['30+','Companies Tracked'],['15min','Scrape Frequency'],['2hr','Avg Head Start'],['Free','Always']].map(([n,l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#a78bfa' }}>{n}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '3px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>🔴 Latest Jobs</h2>
          <Link to="/jobs" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '13px' }}>View all →</Link>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>Loading jobs...</div>
        ) : recentJobs.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Jobs are being scraped. Check back in a minute!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>{recentJobs.map(job => <JobCard key={job._id} job={job} />)}</div>
        )}
      </div>
    </div>
  );
};

// ── Jobs Browse Page (FIXED: dark dropdowns, real jobs) ────
const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ title: '', location: '', exp: '', jobType: '' });

  const search = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.title) params.set('title', filters.title);
      if (filters.location) params.set('location', filters.location);
      if (filters.exp) params.set('exp', filters.exp);
      if (filters.jobType) params.set('jobType', filters.jobType);
      params.set('limit', '30');
      const res = await API.get(`/jobs/search?${params}`);
      setJobs(res.data.jobs || []);
      setTotal(res.data.pagination?.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { search(); }, []);

  const selectStyle = { ...S.input, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' };

  return (
    <div style={{ minHeight: '100vh', background: '#080616', color: 'white', padding: '32px 24px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>Browse Jobs</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '24px', fontSize: '14px' }}>
          {total > 0 ? `${total} real jobs from official career pages` : 'Real jobs from official career pages'}
        </p>

        {/* Search filters */}
        <div style={{ ...S.card, marginBottom: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>Job Title / Skills</label>
            <input placeholder="React, Python, SDE..." value={filters.title} onChange={e => setFilters(p => ({ ...p, title: e.target.value }))}
              onKeyPress={e => e.key === 'Enter' && search()} style={S.input} />
          </div>
          <div style={{ flex: '1', minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>Location</label>
            <input placeholder="Bangalore, Remote..." value={filters.location} onChange={e => setFilters(p => ({ ...p, location: e.target.value }))}
              onKeyPress={e => e.key === 'Enter' && search()} style={S.input} />
          </div>
          <div style={{ flex: '1', minWidth: '130px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>Experience</label>
            <select value={filters.exp} onChange={e => setFilters(p => ({ ...p, exp: e.target.value }))} style={selectStyle}>
              <option value="" style={{ background: '#1e1b4b' }}>All Levels</option>
              <option value="0" style={{ background: '#1e1b4b' }}>Fresher (0 yrs)</option>
              <option value="0-1" style={{ background: '#1e1b4b' }}>0-1 Year</option>
              <option value="1-2" style={{ background: '#1e1b4b' }}>1-2 Years</option>
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>Job Type</label>
            <select value={filters.jobType} onChange={e => setFilters(p => ({ ...p, jobType: e.target.value }))} style={selectStyle}>
              <option value="" style={{ background: '#1e1b4b' }}>All Types</option>
              <option value="full-time" style={{ background: '#1e1b4b' }}>Full-time</option>
              <option value="internship" style={{ background: '#1e1b4b' }}>Internship</option>
              <option value="contract" style={{ background: '#1e1b4b' }}>Contract</option>
            </select>
          </div>
          <button onClick={search} style={{ ...S.btn, alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>🔍 Search</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>Searching...</div>
        ) : jobs.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>No jobs found for these filters.</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>Try broader search terms or clear filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {jobs.map(job => <JobCard key={job._id} job={job} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Companies Page (FIXED: show following status + job count) ──
const CompaniesPage = () => {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [following, setFollowing] = useState(new Set());
  const { user } = useAuth();

  useEffect(() => {
    API.get('/companies').then(res => {
      setCompanies(res.data);
      if (user?.preferences?.companies) {
        setFollowing(new Set(user.preferences.companies));
      }
    });
  }, [user]);

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const toggleFollow = async (company) => {
    if (!user) { alert('Please login to follow companies'); return; }
    try {
      const res = await API.post(`/companies/${company._id}/follow`);
      const newFollowing = new Set(following);
      if (res.data.following) newFollowing.add(company.name);
      else newFollowing.delete(company.name);
      setFollowing(newFollowing);
      // Update company follower count in local state
      setCompanies(prev => prev.map(c => c._id === company._id
        ? { ...c, followersCount: res.data.following ? (c.followersCount||0)+1 : Math.max(0,(c.followersCount||0)-1) }
        : c
      ));
    } catch (err) { alert('Please login to follow companies'); }
  };

  const isFollowing = (companyName) => following.has(companyName);

  return (
    <div style={{ minHeight: '100vh', background: '#080616', color: 'white', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>Companies</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '24px', fontSize: '14px' }}>
          Follow companies to get instant alerts when they post new jobs
        </p>
        {user && following.size > 0 && (
          <div style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#a78bfa' }}>
            ✅ You're following <strong>{following.size}</strong> {following.size === 1 ? 'company' : 'companies'}: {Array.from(following).join(', ')}
          </div>
        )}
        <input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...S.input, maxWidth: '340px', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '14px' }}>
          {filtered.map(company => {
            const followed = isFollowing(company.name);
            return (
              <div key={company._id} style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '12px', border: followed ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.09)', background: followed ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: '700' }}>{company.name}</h3>
                    {followed && <span style={{ fontSize: '16px' }}>✅</span>}
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{company.industry} · {company.size}</p>
                </div>

                {/* Job count + followers */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: company.activeJobCount > 0 ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
                    📋 {company.activeJobCount || 0} open {company.activeJobCount > 0 ? 'now' : ''}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>👥 {company.followersCount || 0}</span>
                </div>

                {/* Follow button */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => toggleFollow(company)} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                    border: '1px solid',
                    borderColor: followed ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                    background: followed ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                    color: followed ? '#a78bfa' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s',
                  }}>
                    {followed ? '✓ Following' : '+ Follow'}
                  </button>
                  <a href={company.careersPageUrl} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', fontSize: '13px' }}>
                    🔗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Dashboard ──────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertResult, setAlertResult] = useState(null);

  useEffect(() => {
    API.get('/jobs/my-matches').then(res => setMatches(res.data.jobs || [])).finally(() => setLoading(false));
  }, []);

  const sendTest = async () => {
    setAlertResult(null);
    try {
      const res = await API.post('/alerts/test');
      setAlertResult({ type: 'success', message: res.data.message, url: res.data.previewUrl });
    } catch {
      setAlertResult({ type: 'error', message: 'Failed to send. Check backend terminal.' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080616', color: 'white', padding: '32px 24px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 4px' }}>Hey {user?.name} 👋</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '14px' }}>
              Alert frequency: <strong style={{ color: '#a78bfa' }}>{user?.alertSettings?.frequency || '1hour'}</strong> &nbsp;·&nbsp;
              Watching: <strong style={{ color: '#a78bfa' }}>{user?.preferences?.jobTitles?.join(', ') || 'All jobs'}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={sendTest} style={{ ...S.btn, fontSize: '13px', padding: '9px 16px' }}>📧 Test Alert</button>
            <Link to="/settings" style={{ ...S.btn, textDecoration: 'none', fontSize: '13px', padding: '9px 16px', background: 'rgba(255,255,255,0.08)' }}>⚙️ Settings</Link>
          </div>
        </div>

        {alertResult && (
          <div style={{
            background: alertResult.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${alertResult.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '14px',
            color: alertResult.type === 'success' ? '#10b981' : '#f87171',
          }}>
            {alertResult.message}
            {alertResult.url && (
              <div style={{ marginTop: '8px' }}>
                <a href={alertResult.url} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#60a5fa', fontWeight: '700', fontSize: '13px' }}>
                  👉 Click here to view your email →
                </a>
              </div>
            )}
          </div>
        )}

        <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '14px' }}>
          🎯 Jobs Matching Your Profile ({matches.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)' }}>Loading matches...</div>
        ) : matches.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>No matches yet</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>
              Jobs matching your preferences appear here. Check back in 15 minutes after the scraper runs!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>{matches.map(job => <JobCard key={job._id} job={job} />)}</div>
        )}
      </div>
    </div>
  );
};

// ── Signup ─────────────────────────────────────────────────
const SignupPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name:'',email:'',password:'',jobTitles:'',locations:'',yearsOfExp:'0-1',skills:'',companies:'',frequency:'1hour' });
  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await register({
        name: form.name, email: form.email, password: form.password,
        preferences: {
          jobTitles: form.jobTitles.split(',').map(s=>s.trim()).filter(Boolean),
          locations: form.locations.split(',').map(s=>s.trim()).filter(Boolean),
          yearsOfExp: form.yearsOfExp,
          skills: form.skills.split(',').map(s=>s.trim()).filter(Boolean),
          companies: form.companies.split(',').map(s=>s.trim()).filter(Boolean),
        },
        alertSettings: { frequency: form.frequency },
      });
      navigate('/dashboard');
    } catch(err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const selectStyle = { ...S.input, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' };

  return (
    <div style={{ minHeight:'100vh',background:'#080616',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px' }}>
      <div style={{ width:'100%',maxWidth:'500px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'36px' }}>
        <h1 style={{ textAlign:'center',fontSize:'24px',fontWeight:'800',marginBottom:'6px' }}>⚡ Start Getting Alerts</h1>
        <p style={{ textAlign:'center',color:'rgba(255,255,255,0.4)',marginBottom:'28px',fontSize:'13px' }}>Free forever. No credit card.</p>
        <div style={{ display:'flex',gap:'6px',marginBottom:'28px' }}>
          {[1,2].map(s => <div key={s} style={{ flex:1,height:'3px',borderRadius:'2px',background: step>=s ? 'linear-gradient(90deg,#7c3aed,#2563eb)' : 'rgba(255,255,255,0.1)' }} />)}
        </div>
        {error && <div style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'8px',padding:'10px',color:'#f87171',marginBottom:'16px',fontSize:'13px' }}>{error}</div>}
        {step===1 ? (
          <>
            {[{n:'name',l:'Full Name',p:'Rahul Sharma'},{n:'email',l:'Email',p:'rahul@gmail.com',t:'email'},{n:'password',l:'Password',p:'Min 8 chars',t:'password'}].map(f => (
              <div key={f.n} style={{ marginBottom:'14px' }}>
                <label style={{ display:'block',fontSize:'12px',color:'rgba(255,255,255,0.5)',marginBottom:'5px' }}>{f.l}</label>
                <input name={f.n} type={f.t||'text'} placeholder={f.p} value={form[f.n]} onChange={set} style={S.input} />
              </div>
            ))}
            <button onClick={() => form.name&&form.email&&form.password ? setStep(2) : setError('Fill all fields')} style={{ ...S.btn,width:'100%',marginTop:'4px' }}>Continue →</button>
          </>
        ) : (
          <>
            {[{n:'jobTitles',l:'Job Titles',p:'Software Engineer, React Developer, SDE'},{n:'locations',l:'Preferred Locations',p:'Bangalore, Remote, Mumbai'},{n:'skills',l:'Your Skills',p:'React, JavaScript, Python, SQL'},{n:'companies',l:'Specific Companies (optional)',p:'Swiggy, Razorpay, Google'}].map(f => (
              <div key={f.n} style={{ marginBottom:'12px' }}>
                <label style={{ display:'block',fontSize:'12px',color:'rgba(255,255,255,0.5)',marginBottom:'5px' }}>{f.l}</label>
                <input name={f.n} placeholder={f.p} value={form[f.n]} onChange={set} style={S.input} />
              </div>
            ))}
            <div style={{ marginBottom:'12px' }}>
              <label style={{ display:'block',fontSize:'12px',color:'rgba(255,255,255,0.5)',marginBottom:'5px' }}>Experience Level</label>
              <select name="yearsOfExp" value={form.yearsOfExp} onChange={set} style={selectStyle}>
                <option value="0" style={{background:'#1e1b4b'}}>Fresher (0 years)</option>
                <option value="0-1" style={{background:'#1e1b4b'}}>0-1 Year</option>
                <option value="1-2" style={{background:'#1e1b4b'}}>1-2 Years</option>
                <option value="2-3" style={{background:'#1e1b4b'}}>2-3 Years</option>
              </select>
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block',fontSize:'12px',color:'rgba(255,255,255,0.5)',marginBottom:'8px' }}>Alert Frequency</label>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px' }}>
                {[{v:'15min',l:'⚡ 15 min',s:'Instant'},{v:'1hour',l:'🕐 1 Hour',s:'Recommended'},{v:'daily',l:'📅 Daily',s:'Digest'}].map(o => (
                  <button key={o.v} onClick={() => setForm(p=>({...p,frequency:o.v}))} style={{ padding:'10px 6px',borderRadius:'8px',border:`2px solid ${form.frequency===o.v?'#7c3aed':'rgba(255,255,255,0.1)'}`,background: form.frequency===o.v?'rgba(124,58,237,0.2)':'transparent',color:'white',cursor:'pointer',textAlign:'center',fontSize:'12px' }}>
                    <div style={{ fontWeight:'700' }}>{o.l}</div>
                    <div style={{ fontSize:'10px',color:'rgba(255,255,255,0.4)',marginTop:'2px' }}>{o.s}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex',gap:'10px' }}>
              <button onClick={() => setStep(1)} style={{ ...S.btn,flex:1,background:'rgba(255,255,255,0.08)' }}>← Back</button>
              <button onClick={submit} disabled={loading} style={{ ...S.btn,flex:2 }}>{loading?'Setting up...':'🚀 Start Alerts!'}</button>
            </div>
          </>
        )}
        <p style={{ textAlign:'center',marginTop:'16px',fontSize:'12px',color:'rgba(255,255,255,0.3)' }}>
          Already have account? <Link to="/login" style={{ color:'#a78bfa' }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

// ── Login ──────────────────────────────────────────────────
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:'',password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setLoading(true); setError('');
    try { await login(form.email, form.password); navigate('/dashboard'); }
    catch { setError('Invalid email or password'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight:'100vh',background:'#080616',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px' }}>
      <div style={{ width:'100%',maxWidth:'400px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'36px' }}>
        <h1 style={{ textAlign:'center',fontSize:'24px',fontWeight:'800',marginBottom:'28px' }}>Welcome back ⚡</h1>
        {error && <div style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'8px',padding:'10px',color:'#f87171',marginBottom:'16px',fontSize:'13px' }}>{error}</div>}
        {[{n:'email',l:'Email',t:'email',p:'you@gmail.com'},{n:'password',l:'Password',t:'password',p:'••••••••'}].map(f => (
          <div key={f.n} style={{ marginBottom:'14px' }}>
            <label style={{ display:'block',fontSize:'12px',color:'rgba(255,255,255,0.5)',marginBottom:'5px' }}>{f.l}</label>
            <input name={f.n} type={f.t} placeholder={f.p} value={form[f.n]} onChange={e => setForm(p=>({...p,[e.target.name]:e.target.value}))} onKeyPress={e => e.key==='Enter'&&submit()} style={S.input} />
          </div>
        ))}
        <button onClick={submit} disabled={loading} style={{ ...S.btn,width:'100%' }}>{loading?'Logging in...':'Login →'}</button>
        <p style={{ textAlign:'center',marginTop:'16px',fontSize:'12px',color:'rgba(255,255,255,0.3)' }}>
          New here? <Link to="/signup" style={{ color:'#a78bfa' }}>Create account</Link>
        </p>
      </div>
    </div>
  );
};

// ── App ────────────────────────────────────────────────────
const App = () => (
  <AuthProvider>
    <Router>
      <div style={{ minHeight:'100vh',background:'#080616',color:'white' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  </AuthProvider>
);

export default App;