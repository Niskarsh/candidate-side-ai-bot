// src/agent/profileBuilder.js
import { tools } from '../tools/registry';

/**
 * ProfileBuilderAgent
 * Input: { linkedinUrl }
 * Calls: tools['linkedin.enrich'] to fetch LinkedIn data.
 * Output: normalized profile = {
 *   fullName, headline, location, about,
 *   skills[], experiences[{company,title,date_range,description,is_current}],
 *   educations[{school,degree,field_of_study,date_range}], avatarUrl
 * }
 * Side-effect: writes profile into runtime.context.profile and emits 'state:update'.
 * Use when planner needs authoritative base data; planner then asks user to fill gaps/metrics.
 */


export async function ProfileBuilderAgent({ linkedinUrl }, runtime) {
  runtime.emit({ type: 'agent:enter', name: 'ProfileBuilderAgent', goal: { linkedinUrl } });
  console.log('[ProfileBuilder] start', { linkedinUrl });

  const t0 = Date.now();
  const enriched = await tools['linkedin.enrich']({ linkedinUrl }).catch((e) => {
    console.error('[ProfileBuilder] enrich error:', e?.message);
    throw e;
  });
  const ms = Date.now() - t0;
  console.log('[ProfileBuilder] enrich done', { ms, ok: !!enriched, keys: Object.keys(enriched || {}) });

  const d = (enriched || {}).data || {};
  console.log('###################', d);
  const skills = typeof d.skills === 'string' ? d.skills.split('|').map(s => s.trim()).filter(Boolean) : [];
  const experiences = Array.isArray(d.experiences) ? d.experiences.map(e => ({
    company: e.company, title: e.title, date_range: e.date_range, description: e.description, is_current: !!e.is_current
  })) : [];
  const educations = Array.isArray(d.educations) ? d.educations.map(e => ({
    school: e.school, degree: e.degree, field_of_study: e.field_of_study, date_range: e.date_range
  })) : [];

  const profile = {
    fullName: d.full_name,
    headline: d.headline,
    location: d.location || [d.city, d.state, d.country].filter(Boolean).join(', '),
    about: d.about,
    experiences, educations, skills,
    avatarUrl: d.profile_image_url
  };

  console.log('[ProfileBuilder] normalized profile', {
    name: profile.fullName, headline: !!profile.headline, skills: skills.length,
    exp0: experiences?.[0]?.title, location: profile.location
  });

  runtime.context.profile = profile;
  runtime.emit({ type: 'state:update', key: 'profile', value: profile });
  runtime.emit({ type: 'agent:exit', name: 'ProfileBuilderAgent', result: 'profile_ready' });
  return profile;
}
