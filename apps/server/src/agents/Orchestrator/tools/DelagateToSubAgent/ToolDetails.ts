export const name = `linkedin_enrich`;
export const description = `Fetch and normalize a candidate profile from a LinkedIn public URL.`;
export const parameters = {
    type: "OBJECT",
    properties: {
        linkedin_url: { type: "STRING", description: "Public LinkedIn profile URL" }
    },
    required: ["linkedin_url"]
};
