import React, { useMemo, useState } from 'react'
import { Initials, StatusPill } from './ui.jsx'
import { ReviewModal, TaskModal, ResourceModal, GradeModal, ReportModal } from './Modals.jsx'

/* ---------------------------- Dashboard ---------------------------- */
export function AdminDashboard({ db, goTo }) {
  const stats = [
    { label: 'Open positions', value: db.cohort.openings },
    { label: 'Applications', value: db.applicants.length },
    { label: 'Active interns', value: db.interns.length },
    { label: 'In screening', value: db.applicants.filter((a) => a.status === 'screening').length },
  ]
  const byDept = db.cohort.depts.map((d) => ({
    name: d,
    count: db.applicants.filter((a) => a.dept === d).length,
  }))
  const maxCount = Math.max(1, ...byDept.map((d) => d.count))

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div className="eyebrow">{db.cohort.name} · Internship intake</div>
        <h1>Program dashboard</h1>
        <p className="sub">Overview of applications, interns and the current cohort.</p>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">
            <span>Recent applications</span>
            <button className="link-btn" onClick={() => goTo('applicants')}>View all →</button>
          </div>
          {db.applicants.slice(0, 5).map((a) => (
            <div className="doc-row" key={a.id}>
              <Initials text={a.initials} />
              <div className="doc-meta">
                <div className="doc-name">{a.name}</div>
                <div className="doc-sub">{a.dept} · {a.school}</div>
              </div>
              <StatusPill status={a.status} />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">By department</div>
          {byDept.map((d) => (
            <div className="dept-row" key={d.name}>
              <span className="dept-name">{d.name}</span>
              <div className="dept-bar-track"><div className="dept-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} /></div>
              <span className="dept-count">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------- Applicants ---------------------------- */
export function AdminApplicants({ db, updateApplicant }) {
  const [filter, setFilter] = useState('all')
  const [reviewing, setReviewing] = useState(null)
  const FLOW = ['applied', 'screening', 'interview', 'offer']

  const filtered = db.applicants.filter((a) => filter === 'all' || a.status === filter)

  const advance = (a) => {
    const idx = FLOW.indexOf(a.status)
    const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : a.status
    updateApplicant(a.id, { status: next })
    setReviewing(null)
  }
  const reject = (a) => { updateApplicant(a.id, { status: 'rejected' }); setReviewing(null) }
  const reset = (a) => { updateApplicant(a.id, { status: 'applied' }); setReviewing(null) }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>Applicants</h1>
        <p className="sub">{db.applicants.length} applications · review submissions and move candidates through stages</p>
      </div>

      <div className="filter-row">
        {['all', 'applied', 'screening', 'interview', 'offer', 'rejected'].map((f) => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Candidate</th><th>Department</th><th>Submitted</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Initials text={a.initials} />
                      <div>
                        <div className="cell-name">{a.name}</div>
                        <div className="cell-sub">{a.school} · {a.level}</div>
                      </div>
                    </div>
                  </td>
                  <td>{a.dept}</td>
                  <td>{a.date}</td>
                  <td><StatusPill status={a.status} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setReviewing(a)}>Review</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5}><div className="empty-state"><div className="glyph">🗂️</div>No applicants in this stage yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewing && (
        <ReviewModal
          applicant={reviewing}
          onClose={() => setReviewing(null)}
          onAdvance={() => advance(reviewing)}
          onReject={() => reject(reviewing)}
          onReset={() => reset(reviewing)}
        />
      )}
    </div>
  )
}

/* ---------------------------- Interns ---------------------------- */
export function AdminInterns({ db, goDetail }) {
  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>Interns</h1>
        <p className="sub">{db.interns.length} active interns · {db.cohort.name} cohort</p>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Intern</th><th>Department</th><th>Mentor</th><th>Duration</th><th>Tasks graded</th><th></th></tr>
            </thead>
            <tbody>
              {db.interns.map((i) => {
                const graded = i.tasks.filter((t) => t.status === 'graded').length
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Initials text={i.initials} />
                        <div className="cell-name">{i.name}</div>
                      </div>
                    </td>
                    <td>{i.dept}</td>
                    <td>{i.mentor}</td>
                    <td>{i.start} – {i.end}</td>
                    <td>{graded}/{i.tasks.length}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => goDetail(i.id)}>Manage →</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function AdminInternDetail({ intern, db, updateIntern, back }) {
  const [taskModal, setTaskModal] = useState(null) // 'new' | task obj | null
  const [resourceModal, setResourceModal] = useState(false)
  const [gradeModal, setGradeModal] = useState(null)
  const [reportModal, setReportModal] = useState(false)

  const teams = db.cohort.depts

  const saveTask = (task) => {
    const tasks = task.id
      ? intern.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))
      : [...intern.tasks, { ...task, id: `T-${Date.now()}`, status: 'in review', grade: null, remark: '' }]
    updateIntern(intern.id, { tasks })
    setTaskModal(null)
  }

  const deleteTask = (id) => updateIntern(intern.id, { tasks: intern.tasks.filter((t) => t.id !== id) })

  const saveGrade = (patch) => {
    const tasks = intern.tasks.map((t) => (t.id === gradeModal.id ? { ...t, ...patch } : t))
    updateIntern(intern.id, { tasks })
    setGradeModal(null)
  }

  const saveResource = (resource) => {
    updateIntern(intern.id, { resources: [...intern.resources, { ...resource, id: `R-${Date.now()}` }] })
    setResourceModal(false)
  }

  const saveReport = (report) => {
    updateIntern(intern.id, { report })
    setReportModal(false)
  }

  return (
    <div className="page page-wide">
      <button className="link-btn" onClick={back} style={{ marginBottom: 14 }}>← Back to interns</button>

      <div className="flex items-center gap-3" style={{ marginBottom: 22 }}>
        <Initials text={intern.initials} />
        <div>
          <h1 style={{ fontSize: 24 }}>{intern.name}</h1>
          <p className="sub">{intern.dept} · {intern.start} – {intern.end} · {intern.location}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, alignItems: 'start' }}>
        <div>
          <div className="card">
            <div className="card-title">
              <span>Tasks & grading</span>
              <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>+ Assign task</button>
            </div>
            {intern.tasks.map((t) => (
              <div className="list-item" key={t.id}>
                <div className="list-item-head">
                  <span className="list-item-title">{t.title}</span>
                  <span className={`pill ${t.status === 'graded' ? 'pill-green' : 'pill-amber'}`}>{t.status}</span>
                </div>
                <p className="list-item-desc">{t.desc}</p>
                <div className="list-item-foot">
                  <span>⏳ {t.deadline}</span><span>· {t.audience}</span>
                </div>
                {t.remark && (
                  <div className="remark-box">
                    <div className="label">Remark / query</div>
                    {t.remark}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-ghost btn-sm" onClick={() => setGradeModal(t)}>
                    {t.status === 'graded' ? `Grade: ${t.grade}` : 'Grade & remark'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTaskModal(t)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTask(t.id)}>Delete</button>
                </div>
              </div>
            ))}
            {intern.tasks.length === 0 && <div className="empty-state"><div className="glyph">✓</div>No tasks assigned yet.</div>}
          </div>

          <div className="card">
            <div className="card-title">
              <span>Resources & links</span>
              <button className="btn btn-primary btn-sm" onClick={() => setResourceModal(true)}>+ Add resource</button>
            </div>
            {intern.resources.map((r) => (
              <div className="doc-row" key={r.id || r.title}>
                <div className="doc-icon">{r.icon}</div>
                <div className="doc-meta">
                  <div className="doc-name">{r.title}</div>
                  <div className="doc-sub">{r.url}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-title">Mentor</div>
            <p className="field-hint" style={{ marginBottom: 10 }}>Assigned mentor</p>
            <div className="field"><input type="text" defaultValue={intern.mentor} /></div>
            <p className="field-hint">The intern sees their mentor on their dashboard and can book 1:1s.</p>
          </div>

          <div className="card">
            <div className="card-title">
              <span>Performance report</span>
              <button className="link-btn" onClick={() => setReportModal(true)}>{intern.report ? 'Edit' : 'Write'}</button>
            </div>
            {intern.report ? (
              <>
                <p className="text-slate" style={{ fontSize: 12.5, marginBottom: 6 }}>{intern.report.period}</p>
                <span className="pill pill-green" style={{ marginBottom: 10 }}>{intern.report.grade}</span>
                <p style={{ fontSize: 13 }}>{intern.report.summary}</p>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p style={{ fontSize: 13, marginBottom: 14 }}>No performance report yet. Write one to share an overall grade and feedback on this intern's dashboard.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setReportModal(true)}>Write performance report</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {taskModal && (
        <TaskModal
          initial={taskModal === 'new' ? null : taskModal}
          interns={[intern]}
          teams={teams}
          onClose={() => setTaskModal(null)}
          onSave={(t) => saveTask({ ...t, audience: intern.name })}
        />
      )}
      {resourceModal && (
        <ResourceModal teams={teams} interns={[intern]} onClose={() => setResourceModal(false)} onSave={saveResource} />
      )}
      {gradeModal && <GradeModal intern={intern} task={gradeModal} onClose={() => setGradeModal(null)} onSave={saveGrade} />}
      {reportModal && <ReportModal intern={intern} onClose={() => setReportModal(false)} onSave={saveReport} />}
    </div>
  )
}

/* ---------------------------- Tasks ---------------------------- */
export function AdminTasks({ db, saveTask, deleteTask }) {
  const [modal, setModal] = useState(null)

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Tasks</h1>
            <p className="sub">{db.tasks.length} tasks · assign to one intern, a team, or everyone — they appear on intern dashboards</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('new')}>+ New task</button>
        </div>
      </div>

      {db.tasks.map((t) => (
        <div className="list-item" key={t.id}>
          <div className="list-item-head">
            <span className="list-item-title">{t.title}</span>
            <div className="row-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(t)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteTask(t.id)}>Delete</button>
            </div>
          </div>
          <p className="list-item-desc">{t.desc}</p>
          <div className="list-item-foot">
            <span>Assigned to {t.audience.name}</span>
            <span>· Deadline {t.deadline}</span>
            <span>· Reach {t.assignedCount}</span>
            <span className="pill pill-maroon">{t.gradedCount}/{t.assignedCount} graded</span>
          </div>
        </div>
      ))}
      {db.tasks.length === 0 && <div className="empty-state"><div className="glyph">✓</div>No tasks yet.</div>}

      {modal && (
        <TaskModal
          initial={modal === 'new' ? null : modal}
          interns={db.interns}
          teams={db.cohort.depts}
          onClose={() => setModal(null)}
          onSave={(t) => { saveTask(t); setModal(null) }}
        />
      )}
    </div>
  )
}

/* ---------------------------- Resources ---------------------------- */
export function AdminResources({ db, saveResource, deleteResource }) {
  const [modal, setModal] = useState(false)

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Resources</h1>
            <p className="sub">{db.resources.length} items · onboarding docs and learning links published to interns</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ New resource</button>
        </div>
      </div>

      {db.resources.map((r) => (
        <div className="doc-row card" key={r.id} style={{ marginBottom: 10 }}>
          <div className="doc-icon">{r.icon}</div>
          <div className="doc-meta">
            <div className="doc-name">{r.title}</div>
            <div className="doc-sub">{r.desc}</div>
            <div className="doc-sub" style={{ marginTop: 2 }}>{r.audience.name} · reach {r.reach}</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => deleteResource(r.id)}>✕</button>
        </div>
      ))}

      {modal && (
        <ResourceModal
          teams={db.cohort.depts}
          interns={db.interns}
          onClose={() => setModal(false)}
          onSave={(r) => { saveResource(r); setModal(false) }}
        />
      )}
    </div>
  )
}

/* ---------------------------- Cohorts ---------------------------- */
export function AdminCohorts({ db, goEdit }) {
  const c = db.cohort
  return (
    <div className="page page-wide">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Cohorts</h1>
            <p className="sub">Set up each intake — deadlines, positions, required documents and the essay prompt</p>
          </div>
          <button className="btn btn-primary" onClick={goEdit}>+ New cohort</button>
        </div>
      </div>
      <div className="cohort-grid">
        <div className="cohort-card">
          <div className="flex justify-between items-center">
            <h3>{c.name}</h3>
            <StatusPill status={c.status.toLowerCase()} />
          </div>
          <p className="desc">{c.desc}</p>
          <div className="kv-grid">
            <div><dt>Deadline</dt><dd>{c.deadline}</dd></div>
            <div><dt>Internship</dt><dd>{c.start} – {c.end}</dd></div>
            <div><dt>Openings</dt><dd>{c.openings}</dd></div>
            <div><dt>Documents</dt><dd>{c.requiredDocs.join(', ')}</dd></div>
            <div><dt>Essay limit</dt><dd>{c.essayLimit} words</dd></div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={goEdit}>Edit setup</button>
        </div>
      </div>
    </div>
  )
}

export function AdminCohortEdit({ db, updateCohort, back }) {
  const [form, setForm] = useState({ ...db.cohort })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleDept = (d) =>
    setForm((f) => ({ ...f, depts: f.depts.includes(d) ? f.depts.filter((x) => x !== d) : [...f.depts, d] }))
  const toggleDoc = (d) =>
    setForm((f) => ({ ...f, requiredDocs: f.requiredDocs.includes(d) ? f.requiredDocs.filter((x) => x !== d) : [...f.requiredDocs, d] }))

  const ALL_DEPTS = ['Engineering', 'Product Design', 'Data Science', 'Marketing', 'Operations']
  const ALL_DOCS = ['CV', 'Transcript', 'Valid ID', 'Portfolio']

  return (
    <div className="page page-wide">
      <button className="link-btn" onClick={back} style={{ marginBottom: 14 }}>← Back to cohorts</button>
      <div className="page-header"><h1>Edit cohort</h1></div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>Basics</div>
        <div className="field"><label>Cohort name</label><input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option>Draft</option><option>Open</option><option>Closed</option>
          </select>
        </div>
        <div className="field"><label>Description</label><textarea value={form.desc} onChange={(e) => set('desc', e.target.value)} rows={3} /></div>

        <div className="section-title">Timeline</div>
        <p className="field-hint" style={{ marginBottom: 12 }}>When applications open and close, and when the internship runs.</p>
        <div className="field-row">
          <div className="field"><label>Applications open</label><input type="text" value={form.opensOn} onChange={(e) => set('opensOn', e.target.value)} /></div>
          <div className="field"><label>Application deadline</label><input type="text" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Internship start</label><input type="text" value={form.start} onChange={(e) => set('start', e.target.value)} /></div>
          <div className="field"><label>Internship end</label><input type="text" value={form.end} onChange={(e) => set('end', e.target.value)} /></div>
        </div>

        <div className="section-title">Positions</div>
        <div className="field"><label>Number of openings</label><input type="number" value={form.openings} onChange={(e) => set('openings', Number(e.target.value))} /></div>
        <div className="field">
          <label>Departments accepting applications</label>
          {ALL_DEPTS.map((d) => (
            <label key={d} className="checkbox-row" style={{ marginBottom: 6 }}>
              <input type="checkbox" checked={form.depts.includes(d)} onChange={() => toggleDept(d)} />
              {d}
            </label>
          ))}
        </div>

        <div className="section-title">Application requirements</div>
        <div className="field">
          <label>Required documents</label>
          {ALL_DOCS.map((d) => (
            <label key={d} className="checkbox-row" style={{ marginBottom: 6 }}>
              <input type="checkbox" checked={form.requiredDocs.includes(d)} onChange={() => toggleDoc(d)} />
              {d}
            </label>
          ))}
        </div>
        <div className="field"><label>Essay word limit</label><input type="number" value={form.essayLimit} onChange={(e) => set('essayLimit', Number(e.target.value))} /></div>
        <div className="field"><label>Essay prompt</label><textarea value={form.essayPrompt} onChange={(e) => set('essayPrompt', e.target.value)} rows={2} /></div>

        <div className="modal-foot" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button className="btn btn-ghost" onClick={back}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { updateCohort(form); back() }}>Save cohort</button>
        </div>
      </div>
    </div>
  )
}
