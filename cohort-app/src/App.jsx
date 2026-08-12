import React, { useEffect, useState } from 'react'
import { loadDB, saveDB } from './data/seed.js'
import Auth from './components/Auth.jsx'
import ApplicantViews from './components/ApplicantViews.jsx'
import InternDashboard from './components/InternDashboard.jsx'
import AdminShell from './components/AdminShell.jsx'
import {
  AdminDashboard,
  AdminApplicants,
  AdminInterns,
  AdminInternDetail,
  AdminTasks,
  AdminResources,
  AdminCohorts,
  AdminCohortEdit,
} from './components/AdminViews.jsx'

export default function App() {
  const [db, setDb] = useState(loadDB)
  const [role, setRole] = useState(null) // null | 'applicant' | 'intern' | 'admin'
  const [adminPage, setAdminPage] = useState('dashboard')
  const [selectedInternId, setSelectedInternId] = useState(null)

  useEffect(() => saveDB(db), [db])

  const logout = () => {
    setRole(null)
    setAdminPage('dashboard')
    setSelectedInternId(null)
  }

  // ---- applicant handlers (demo uses the first seeded applicant as "me") ----
  const myApplicant = db.applicants[0]
  const submitApplication = ({ essay, essayWords }) => {
    setDb((d) => ({
      ...d,
      applicants: d.applicants.map((a, i) => (i === 0 ? { ...a, status: 'applied', essay, essayWords } : a)),
    }))
  }

  // ---- intern (demo uses the first seeded intern as "me") ----
  const myIntern = db.interns[0]

  // ---- admin: applicants ----
  const updateApplicant = (id, patch) =>
    setDb((d) => ({ ...d, applicants: d.applicants.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))

  // ---- admin: interns ----
  const updateIntern = (id, patch) =>
    setDb((d) => ({ ...d, interns: d.interns.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))

  // ---- admin: tasks (org-wide list) ----
  const saveTask = (task) =>
    setDb((d) => ({
      ...d,
      tasks: task.id
        ? d.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))
        : [...d.tasks, { ...task, id: `T-${Date.now()}`, assignedCount: 1, gradedCount: 0 }],
    }))
  const deleteTask = (id) => setDb((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))

  // ---- admin: resources (org-wide list) ----
  const saveResource = (resource) =>
    setDb((d) => ({ ...d, resources: [...d.resources, { ...resource, id: `R-${Date.now()}` }] }))
  const deleteResource = (id) => setDb((d) => ({ ...d, resources: d.resources.filter((r) => r.id !== id) }))

  // ---- admin: cohort ----
  const updateCohort = (cohort) => setDb((d) => ({ ...d, cohort }))

  if (!role) return <Auth onDemoLogin={setRole} />
  if (role === 'applicant') return <ApplicantViews applicant={myApplicant} cohort={db.cohort} onSubmit={submitApplication} onLogout={logout} />
  if (role === 'intern') return <InternDashboard intern={myIntern} onLogout={logout} />

  // ---- admin ----
  const selectedIntern = db.interns.find((i) => i.id === selectedInternId)

  let body
  if (adminPage === 'dashboard') body = <AdminDashboard db={db} goTo={setAdminPage} />
  else if (adminPage === 'applicants') body = <AdminApplicants db={db} updateApplicant={updateApplicant} />
  else if (adminPage === 'interns' && !selectedIntern)
    body = <AdminInterns db={db} goDetail={(id) => setSelectedInternId(id)} />
  else if (adminPage === 'interns' && selectedIntern)
    body = (
      <AdminInternDetail
        intern={selectedIntern}
        db={db}
        updateIntern={updateIntern}
        back={() => setSelectedInternId(null)}
      />
    )
  else if (adminPage === 'tasks') body = <AdminTasks db={db} saveTask={saveTask} deleteTask={deleteTask} />
  else if (adminPage === 'resources') body = <AdminResources db={db} saveResource={saveResource} deleteResource={deleteResource} />
  else if (adminPage === 'cohorts') body = <AdminCohorts db={db} goEdit={() => setAdminPage('cohort-edit')} />
  else if (adminPage === 'cohort-edit')
    body = <AdminCohortEdit db={db} updateCohort={updateCohort} back={() => setAdminPage('cohorts')} />

  return (
    <AdminShell
      page={adminPage === 'cohort-edit' ? 'cohorts' : adminPage}
      setPage={(p) => { setSelectedInternId(null); setAdminPage(p) }}
      onLogout={logout}
    >
      {body}
    </AdminShell>
  )
}
