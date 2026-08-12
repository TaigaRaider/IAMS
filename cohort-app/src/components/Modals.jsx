import React, { useState } from 'react'
import { Modal, StatusPill, Initials } from './ui.jsx'

export function ReviewModal({ applicant, onClose, onAdvance, onReject, onReset }) {
  return (
    <Modal title="" onClose={onClose} wide>
      <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
        <Initials text={applicant.initials} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{applicant.name}</div>
          <div className="text-slate" style={{ fontSize: 12.5 }}>{applicant.dept} · {applicant.level}</div>
        </div>
        <StatusPill status={applicant.status} />
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>Candidate details</div>
      <div className="kv-grid" style={{ marginBottom: 20 }}>
        <div><dt>Email</dt><dd>{applicant.email}</dd></div>
        <div><dt>Phone</dt><dd>{applicant.phone}</dd></div>
        <div><dt>School</dt><dd>{applicant.school}</dd></div>
        <div><dt>GPA</dt><dd>{applicant.gpa}</dd></div>
        <div><dt>Department</dt><dd>{applicant.dept}</dd></div>
        <div><dt>Submitted</dt><dd>{applicant.date}, 2026</dd></div>
      </div>

      <div className="section-title">Documents</div>
      {applicant.documents.map((d) => (
        <div className="doc-row" key={d.name}>
          <div className="doc-icon">{d.icon}</div>
          <div className="doc-meta">
            <div className="doc-name">{d.name}</div>
            <div className="doc-sub">{d.size}</div>
          </div>
          <button className="btn btn-ghost btn-sm">View</button>
        </div>
      ))}

      <div className="section-title flex justify-between items-center">
        <span>Motivation essay</span>
        <span className="essay-counter">{applicant.essayWords} / 450 words</span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-soft)' }}>{applicant.essay}</p>

      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onReset}>Reset stage</button>
        <button className="btn btn-danger" onClick={onReject}>Reject</button>
        <button className="btn btn-primary" onClick={onAdvance}>Advance ▸</button>
      </div>
    </Modal>
  )
}

export function TaskModal({ initial, onClose, onSave, interns, teams }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [desc, setDesc] = useState(initial?.desc || '')
  const [deadline, setDeadline] = useState(initial?.deadline || '')
  const [audienceType, setAudienceType] = useState(initial?.audience?.type || 'everyone')
  const [audienceName, setAudienceName] = useState(initial?.audience?.name || '')

  const submit = () => {
    if (!title.trim()) return
    const audience =
      audienceType === 'everyone'
        ? { type: 'everyone', name: 'Everyone' }
        : { type: audienceType, name: audienceName || (audienceType === 'team' ? teams[0] : interns[0]?.name) }
    onSave({ ...initial, title, desc, deadline, audience })
  }

  return (
    <Modal title={initial ? 'Edit task' : 'New task'} onClose={onClose}>
      <div className="field"><label>Task title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fix a good-first-issue" /></div>
      <div className="field"><label>Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
      <div className="field"><label>Deadline</label><input type="text" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Jul 18, 2026" /></div>
      <div className="field">
        <label>Assign to</label>
        <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}>
          <option value="everyone">Everyone</option>
          <option value="team">A team</option>
          <option value="intern">One intern</option>
        </select>
      </div>
      {audienceType === 'team' && (
        <div className="field">
          <label>Team</label>
          <select value={audienceName} onChange={(e) => setAudienceName(e.target.value)}>
            {teams.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      )}
      {audienceType === 'intern' && (
        <div className="field">
          <label>Intern</label>
          <select value={audienceName} onChange={(e) => setAudienceName(e.target.value)}>
            {interns.map((i) => <option key={i.id}>{i.name}</option>)}
          </select>
        </div>
      )}
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>{initial ? 'Save changes' : 'Create task'}</button>
      </div>
    </Modal>
  )
}

export function ResourceModal({ onClose, onSave, teams, interns }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Link')
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [audienceType, setAudienceType] = useState('everyone')
  const [audienceName, setAudienceName] = useState('')

  const icons = { Link: '🔗', Document: '📄', Video: '🎥' }

  const submit = () => {
    if (!title.trim()) return
    const audience =
      audienceType === 'everyone'
        ? { type: 'everyone', name: 'Everyone' }
        : { type: audienceType, name: audienceName || (audienceType === 'team' ? teams[0] : interns[0]?.name) }
    onSave({ icon: icons[type], title, desc, url, audience, reach: audienceType === 'everyone' ? interns.length : 1 })
  }

  return (
    <Modal title="Add a resource" onClose={onClose}>
      <div className="field"><label>Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="field">
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option>Link</option><option>Document</option><option>Video</option>
        </select>
      </div>
      <div className="field"><label>URL</label><input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></div>
      <div className="field"><label>Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
      <div className="field">
        <label>Publish to</label>
        <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}>
          <option value="everyone">Every intern</option>
          <option value="team">A team</option>
          <option value="intern">One intern</option>
        </select>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Publish</button>
      </div>
    </Modal>
  )
}

export function GradeModal({ intern, task, onClose, onSave }) {
  const [grade, setGrade] = useState(task.grade || '')
  const [remark, setRemark] = useState(task.remark || '')
  const grades = ['Excellent', 'Pass', 'Needs revision', 'Incomplete']

  return (
    <Modal title="Grade & remark" onClose={onClose}>
      <p className="text-slate" style={{ fontSize: 13, marginBottom: 16 }}>{intern.name} · {task.title}</p>
      <div className="field">
        <label>Grade</label>
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="" disabled>Select a grade</option>
          {grades.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div className="field"><label>Remark / query</label><textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={4} placeholder="Leave feedback for the intern…" /></div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave({ grade, remark, status: 'graded' })}>Save to dashboard</button>
      </div>
    </Modal>
  )
}

export function ReportModal({ intern, onClose, onSave }) {
  const existing = intern.report
  const [period, setPeriod] = useState(existing?.period || '')
  const [grade, setGrade] = useState(existing?.grade || '')
  const [summary, setSummary] = useState(existing?.summary || '')
  const [strengths, setStrengths] = useState(existing?.strengths || '')
  const [improve, setImprove] = useState(existing?.improve || '')
  const grades = ['Outstanding', 'Strong', 'Solid', 'Developing']

  return (
    <Modal title="Performance report" onClose={onClose} wide>
      <p className="text-slate" style={{ fontSize: 13, marginBottom: 16 }}>{intern.name} · shown on their dashboard when saved</p>
      <div className="field-row">
        <div className="field"><label>Review period</label><input type="text" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Weeks 1–6" /></div>
        <div className="field">
          <label>Overall grade</label>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="" disabled>Select</option>
            {grades.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Summary</label><textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} /></div>
      <div className="field"><label>Strengths</label><textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} /></div>
      <div className="field"><label>Areas to grow</label><textarea value={improve} onChange={(e) => setImprove(e.target.value)} rows={2} /></div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave({ period, grade, summary, strengths, improve })}>Save report</button>
      </div>
    </Modal>
  )
}
