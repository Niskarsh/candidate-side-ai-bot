import express from 'express';
dotenv.config();


const app = express();
app.use(cors({ origin: [/localhost:3000$/], credentials: false }));
app.use(express.json());


const PORT = Number(process.env.PORT || 8787);


// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));


// RapidAPI → LinkedIn enrich proxy
app.get('/api/linkedin/enrich', async (req, res) => {
try {
const linkedin_url = String(req.query.linkedin_url || '');
if (!linkedin_url) return res.status(400).json({ error: 'linkedin_url is required' });


const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'fresh-linkedin-profile-data.p.rapidapi.com';


const resp = await axios.request({
method: 'GET',
url: `https://${RAPIDAPI_HOST}/enrich-lead`,
params: {
linkedin_url,
include_skills: 'true',
include_certifications: 'true',
include_publications: 'true',
include_honors: 'true',
include_volunteers: 'true',
include_projects: 'true',
include_patents: 'true',
include_courses: 'true',
include_organizations: 'true',
include_profile_status: 'true',
include_company_public_url: 'true'
},
headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST },
timeout: 20000
});


res.json(resp.data);
} catch (err) {
const status = err?.response?.status || 500;
const msg = err?.response?.data || { error: 'Failed to fetch LinkedIn data' };
console.error('LinkedIn enrich error', status, msg);
res.status(status).json(msg);
}
});


// LLM planning endpoint (agentic supervisor)
app.post('/api/plan', async (req, res) => {
try {
const { goal, state, last_user_message } = req.body || {};
const planner = createPlanner();
const plan = await planner.plan({ goal, state, last_user_message });
res.json(plan);
} catch (e) {
console.error('Planner error:', e);
res.status(500).json({ error: 'Planner failed', detail: String(e?.message || e) });
}
});


app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));