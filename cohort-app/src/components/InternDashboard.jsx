import React from 'react'
import { Initials } from './ui.jsx'

export default function InternDashboard({ intern, onLogout }) {
  const doneCount = intern.checklist.filter((c) => c.done).length
  const gradedCount = intern.tasks.filter((t) => t.status === 'graded').length

  return (
    <div>
      <div className="topbar">
        <a className="brand" href="#" style={{ fontSize: 17 }}>
          <span className="brand-mark" style={{ width: 26, height: 26, fontSize: 13 }}>C</span>
          Cohort
        </a>
        <div className="topbar-right">
          <button className="icon-btn" aria-label="Notifications">🔔</button>
          <Initials text={intern.initials} />
          <button className="link-btn" onClick={onLogout} style={{ color: 'var(--slate)' }}>Log out</button>
        </div>
      </div>

      <div className="page">
        <div className="page-header">
          <h1>Welcome to the team, {intern.name.split(' ')[0]}!</h1>
          <p className="sub">{intern.dept} Intern · {intern.start} – {intern.end} · {intern.location}</p>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Onboarding checklist</span>
            <span className="pill pill-maroon">{doneCount}/{intern.checklist.length} done</span>
          </div>
          {intern.checklist.map((c) => (
            <div className={`check-row ${c.done ? 'on' : ''}`} key={c.label}>
              <div className={`check-mark ${c.done ? 'on' : ''}`}>{c.done ? '✓' : ''}</div>
              <span className="check-label">{c.label}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">This week</div>
          {intern.schedule.map((s) => (
            <div className="flex items-center gap-3" key={s.label} style={{ padding: '8px 0' }}>
              <span className="pill pill-neutral" style={{ width: 44, justifyContent: 'center' }}>{s.day}</span>
              <span style={{ fontSize: 13.5 }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Your mentor</div>
          <div className="flex items-center gap-3">
            <Initials text={intern.mentor.split(' ').map((n) => n[0]).join('')} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{intern.mentor}</div>
              <div className="text-slate" style={{ fontSize: 12.5 }}>{intern.mentorRole}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Your tasks</span>
            <span className="pill pill-maroon">{gradedCount}/{intern.tasks.length} graded</span>
          </div>
          {intern.tasks.map((t) => (
            <div className="list-item" key={t.id}>
              <div className="list-item-head">
                <span className="list-item-title">{t.title}</span>
                <span className={`pill ${t.status === 'graded' ? 'pill-green' : 'pill-amber'}`}>
                  {t.status === 'graded' ? `Grade: ${t.grade}` : t.status}
                </span>
              </div>
              <p className="list-item-desc">{t.desc}</p>
              <div className="list-item-foot">
                <span>📅 Due {t.deadline}</span>
                <span>· {t.audience}</span>
              </div>
              {t.remark && (
                <div className="remark-box">
                  <div className="label">Feedback from your mentor</div>
                  {t.remark}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Learning & onboarding resources</div>
          {intern.resources.map((r) => (
            <div className="doc-row" key={r.title}>
              <div className="doc-icon">{r.icon}</div>
              <div className="doc-meta">
                <div className="doc-name">{r.title}</div>
                <div className="doc-sub">{r.desc}</div>
              </div>
              <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open →</a>
            </div>
          ))}
        </div>

        {intern.report && (
          <div className="card">
            <div className="card-title">
              <span>Performance report</span>
              <span className="text-slate" style={{ fontSize: 12.5 }}>{intern.report.period}</span>
            </div>
            <span className="pill pill-green" style={{ marginBottom: 12 }}>{intern.report.grade}</span>
            <p style={{ fontSize: 13.5, marginBottom: 14 }}>{intern.report.summary}</p>
            <div className="kv-grid">
              <div><dt className="text-slate" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Strengths</dt><dd style={{ fontWeight: 400 }}>{intern.report.strengths}</dd></div>
              <div><dt className="text-slate" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Areas to grow</dt><dd style={{ fontWeight: 400 }}>{intern.report.improve}</dd></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
