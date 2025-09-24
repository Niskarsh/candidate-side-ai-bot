import axios from 'axios';
const SERVER_BASE = process.env.REACT_APP_SERVER_BASE || 'http://localhost:8787';


export async function planWithLLM(goal, state, last_user_message) {
const resp = await axios.post(`${SERVER_BASE}/api/plan`, { goal, state, last_user_message });
return resp.data; // { action, args }
}


export async function enrichLinkedIn(linkedinUrl) {
const resp = await axios.get(`${SERVER_BASE}/api/linkedin/enrich`, { params: { linkedin_url: linkedinUrl } });
return resp.data;
}