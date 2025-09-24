import { enrichLinkedIn } from './api';


export const tools = {
    'linkedin.enrich': async ({ linkedinUrl }) => enrichLinkedIn(linkedinUrl),
    // ask.user is client-side (rendered by UI via plan → request_clarification)
};