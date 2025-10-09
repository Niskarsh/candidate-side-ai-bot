import axios from 'axios';

export const name = `ikigai`;
export const description = `Runs ikigai exercise to help user find their purpose.`;
export const parameters = {
    type: "OBJECT",
    properties: {
        ikagai: { type: "STRING", description: "Will fill ikigai test here" }
    },
    required: ["ikagai"]
};


/** Calls RapidAPI 'fresh-linkedin-profile-data' enrich-lead endpoint.  :contentReference[oaicite:2]{index=2} */
export async function enrichLinkedIn(linkedin_url: string, extras?: Record<string,string|boolean>) {
  const params = {
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
    include_company_public_url: 'true',
    ...extras
  };
console.log(`2222222222222222`, process.env.RAPIDAPI_KEY, process.env.RAPIDAPI_HOST);
  const headers = {
    'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
    'x-rapidapi-host': process.env.RAPIDAPI_HOST ?? 'fresh-linkedin-profile-data.p.rapidapi.com'
  };
  const url = `https://${headers['x-rapidapi-host']}/enrich-lead`;
  const { data } = await axios.get(url, { params, headers });
  return data;
}
