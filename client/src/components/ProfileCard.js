import React from 'react';

export default function ProfileCard({ p }) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-4">
        {p.avatarUrl
          ? <img src={p.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
          : <div className="w-16 h-16 rounded-full bg-gray-200" />
        }
        <div>
          <div className="text-lg font-semibold">{p.fullName || '—'}</div>
          <div className="text-sm text-gray-600">{p.headline || '—'}</div>
          <div className="text-xs text-gray-500">{p.location || '—'}</div>
        </div>
      </div>

      <section>
        <h3 className="font-medium">About</h3>
        <p className="text-sm whitespace-pre-wrap">{p.about || '—'}</p>
      </section>

      <section>
        <h3 className="font-medium">Experience</h3>
        <ul className="text-sm list-disc ml-5 space-y-2">
          {p.experiences?.length ? p.experiences.map((e, idx) => (
            <li key={idx}>
              <div className="font-medium">{e.title || '—'} @ {e.company || '—'}</div>
              <div className="text-xs text-gray-600">{e.date_range || '—'}{e.is_current ? ' · (Current)' : ''}</div>
              {e.description && <p className="text-sm mt-1 whitespace-pre-wrap">{e.description}</p>}
            </li>
          )) : <li className="text-gray-500">No experience parsed</li>}
        </ul>
      </section>

      <section>
        <h3 className="font-medium">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {p.skills?.length ? p.skills.map((s, i) => (
            <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-full border">{s}</span>
          )) : <span className="text-gray-500">No skills parsed</span>}
        </div>
      </section>
    </div>
  );
}
