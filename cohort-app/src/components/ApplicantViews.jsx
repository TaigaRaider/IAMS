import React, { useState } from 'react'
import { StageTracker, StatusPill, Initials } from './ui.jsx'

function Topbar({ tab, setTab, onLogout }) {
  return (
    <div className="topbar">
      <a className="brand" href="#" style={{ fontSize: 17 }}>
        <span className="brand-mark" style={{ width: 26, height: 26, fontSize: 13 }}>C</span>
        Cohort
      </a>
      <div className="topbar-right">
        <div className="topbar-tabs">
          <button className={`topbar-tab ${tab === 'application' ? 'active' : ''}`} onClick={() => setTab('application')}>
            My application
          </button>
        </div>
        <button className="icon-btn" aria-label="Notifications">🔔</button>
        <Initials text="AN" />
        <button className="link-btn" onClick={onLogout} style={{ color: 'var(--slate)' }}>Log out</button>
      </div>
    </div>
  )
}

export default function ApplicantViews({ applicant, cohort, onSubmit, onLogout }) {
  const [tab] = useState('application')
  const submitted = applicant.status !== 'draft'

  return (
    <div>
      <Topbar tab={tab} onLogout={onLogout} />
      {submitted ? <ApplicationStatus applicant={applicant} /> : <ApplicationForm cohort={cohort} onSubmit={onSubmit} />}
    </div>
  )
}

function ApplicationForm({ cohort, onSubmit }) {
  const [essay, setEssay] = useState('')
  const [docs, setDocs] = useState({ cv: false, transcript: false, id: false })
  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0
  const over = words > cohort.essayLimit

  const docList = [
    { key: 'cv', icon: '📄', label: 'CV / Résumé', sub: 'PDF, up to 10MB' },
    { key: 'transcript', icon: '📄', label: 'Transcript', sub: 'PDF, up to 10MB' },
    { key: 'id', icon: '🪪', label: 'Valid ID', sub: 'PDF or image' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="eyebrow">{cohort.name} · Application</div>
        <h1>Internship application</h1>
        <p className="sub">Fill in your details and upload your documents. You can save and return anytime.</p>
        <p className="sub" style={{ marginTop: 6 }}>⏳ Closes {cohort.deadline}</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ essay, essayWords: words }) }}>
        <div className="card">
          <div className="section-title">Personal details</div>
          <div className="field"><label>Full name</label><input type="text" placeholder="Ada Nwosu" required /></div>
          <div className="field-row">
            <div className="field"><label>Email</label><input type="email" placeholder="you@school.edu" required /></div>
            <div className="field"><label>Phone</label><input type="tel" placeholder="+1 555 0100" required /></div>
          </div>

          <div className="section-title">Academic background</div>
          <div className="field"><label>School / University</label><input type="text" placeholder="Rutgers University" required /></div>
          <div className="field-row">
            <div className="field">
              <label>Level of study</label>
              <select required defaultValue="">
                <option value="" disabled>Select level</option>
                <option>Undergraduate</option>
                <option>Postgraduate</option>
                <option>Masters</option>
                <option>PhD</option>
              </select>
            </div>
            <div className="field">
              <label>Department of interest</label>
              <select required defaultValue="">
                <option value="" disabled>Select department</option>
                {cohort.depts.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="section-title">Documents</div>
          <p className="field-hint" style={{ marginBottom: 10 }}>Upload your CV, transcript and a valid ID (PDF or image).</p>
          {docList.map((d) => (
            <div className="doc-row" key={d.key}>
              <div className="doc-icon">{d.icon}</div>
              <div className="doc-meta">
                <div className="doc-name">{d.label}</div>
                <div className="doc-sub">{docs[d.key] ? 'Uploaded' : d.sub}</div>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${docs[d.key] ? 'btn-ghost' : 'btn-primary'}`}
                onClick={() => setDocs((p) => ({ ...p, [d.key]: !p[d.key] }))}
              >
                {docs[d.key] ? 'Replace' : 'Upload'}
              </button>
            </div>
          ))}

          <div className="section-title">
            <div className="flex justify-between items-center" style={{ width: '100%' }}>
              <span>Why this internship?</span>
              <span className={`essay-counter ${over ? 'over' : ''}`}>{words} / {cohort.essayLimit} words</span>
            </div>
          </div>
          <p className="field-hint" style={{ marginBottom: 10 }}>{cohort.essayPrompt}</p>
          <textarea value={essay} onChange={(e) => setEssay(e.target.value)} rows={6} placeholder="Write your answer here…" />

          <div className="flex gap-2 mt-6" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost">Save draft</button>
            <button type="submit" className="btn btn-primary" disabled={over}>Submit application</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ApplicationStatus({ applicant }) {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Hi {applicant.name.split(' ')[0]} 👋</h1>
        <p className="sub">Here's where your application stands.</p>
      </div>

      <div className="card">
        <div className="card-title">
          <span>Software Engineering Intern</span>
          <StatusPill status={applicant.status} />
        </div>
        <p className="text-slate" style={{ fontSize: 12.5, marginBottom: 4 }}>APPLICATION #{applicant.id}</p>
        <StageTracker status={applicant.status} />

        <div className="card" style={{ background: 'var(--paper)', boxShadow: 'none' }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Submitted documents</div>
          {applicant.documents.map((d) => (
            <div className="doc-row" key={d.name}>
              <div className="doc-icon">{d.icon}</div>
              <div className="doc-meta">
                <div className="doc-name">{d.name}</div>
                <div className="doc-sub">{d.size}</div>
              </div>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ background: 'var(--paper)', boxShadow: 'none' }}>
          <div className="card-title" style={{ marginBottom: 8 }}>What happens next?</div>
          <p className="text-slate" style={{ fontSize: 13.5 }}>
            Screening usually takes 5–7 days. We'll email you and update this page when your status changes.
          </p>
        </div>

        <div className="mt-4" style={{ textAlign: 'right' }}>
          <button className="btn btn-ghost">Edit application</button>
        </div>
      </div>
    </div>
  )
}
