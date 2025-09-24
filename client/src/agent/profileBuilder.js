import { tools } from '../tools/registry';


export async function ProfileBuilderAgent({ linkedinUrl }, runtime) {
    runtime.emit({ type: 'agent:enter', name: 'ProfileBuilderAgent', goal: { linkedinUrl } });
    const enriched = await tools['linkedin.enrich']({ linkedinUrl });
    const d = (enriched || {}).data || {};


    const skills = typeof d.skills === 'string' ? d.skills.split('|').map(s => s.trim()).filter(Boolean) : [];
    const experiences = Array.isArray(d.experiences) ? d.experiences.map(e => ({
        company: e.company,
        title: e.title,
        date_range: e.date_range,
        description: e.description,
        is_current: !!e.is_current
    })) : [];
    const educations = Array.isArray(d.educations) ? d.educations.map(e => ({
        school: e.school,
        degree: e.degree,
        field_of_study: e.field_of_study,
        date_range: e.date_range
    })) : [];


    const profile = {
        fullName: d.full_name,
        headline: d.headline,
        location: d.location || [d.city, d.state, d.country].filter(Boolean).join(', '),
        about: d.about,
        experiences,
        educations,
        skills,
        avatarUrl: d.profile_image_url
    };


    runtime.context.profile = profile;
    runtime.emit({ type: 'state:update', key: 'profile', value: profile });
    runtime.emit({ type: 'agent:exit', name: 'ProfileBuilderAgent', result: 'profile_ready' });
    return profile;
}