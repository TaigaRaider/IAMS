import React from 'react'

const NAV = [
  { key: 'dashboard', icon: '▦', label: 'Dashboard' },
  { key: 'cohorts', icon: '🗂️', label: 'Cohorts' },
  { key: 'applicants', icon: '👥', label: 'Applicants' },
  { key: 'interns', icon: '🎓', label: 'Interns' },
  { key: 'tasks', icon: '✓', label: 'Tasks' },
  { key: 'resources', icon: '📚', label: 'Resources' },
]

export default function AdminShell({ page, setPage, onLogout, children }) {
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark">C</span>
          Cohort<span style={{ opacity: 0.6, fontWeight: 500, fontSize: 13 }}>Admin</span>
        </a>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`side-link ${page === n.key ? 'active' : ''}`}
              onClick={() => setPage(n.key)}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="avatar" style={{ background: 'var(--amber)', color: 'var(--maroon-deep)' }}>RM</div>
            <div>
              <div className="name">Rosa M.</div>
              <div className="role">Program lead</div>
            </div>
          </div>
          <button className="side-link" onClick={onLogout}>⏻ Log out</button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
