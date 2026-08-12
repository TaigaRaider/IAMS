# Cohort — internship tracker (demo rebuild)

A React + CSS rebuild of the "Cohort" internship-tracking product: applicants
apply and follow their status, interns get a dashboard with tasks/mentor/
resources, and admins run the whole pipeline (cohorts, applicants, interns,
tasks, resources).

This is an original implementation built to match the **feature set and
layout** of the reference site — not a copy of its source code. All copy,
mock data and styling are new.

## Stack

- React 18 + Vite (no router library — view state is handled in `App.jsx`)
- Plain CSS with a small design-token system (`src/styles.css`)
- No backend: data is seeded in `src/data/seed.js` and persisted to
  `localStorage` so edits survive a refresh. Swap `loadDB`/`saveDB` in that
  file for real API calls when you're ready to wire up a backend.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. Vite's dev server hot-reloads on save.

To produce a static production build:

```bash
npm run build
npm run preview   # serve the build locally to sanity-check it
```

## How the app is organized

```
src/
  main.jsx                 # React entry point
  App.jsx                  # top-level state: current role, current admin page
  styles.css                # design tokens + all component styles
  data/seed.js              # mock data + localStorage load/save helpers
  components/
    Auth.jsx                # login / register / forgot / reset password
    ApplicantViews.jsx       # application form + status tracker
    InternDashboard.jsx      # onboarding, tasks, mentor, resources, report
    AdminShell.jsx           # sidebar layout for the admin area
    AdminViews.jsx           # dashboard, applicants, interns, tasks,
                              # resources, cohorts (list + edit) pages
    Modals.jsx               # review / task / resource / grade / report modals
    ui.jsx                   # shared atoms: Modal, StatusPill, StageTracker
```

There's no real authentication — the login/register/forgot/reset screens are
fully built but don't call an API. Use the **"Jump into a demo role"**
shortcuts on the sign-in screen to drop straight into the Applicant, Intern,
or Admin experience with seeded data.

## Roles

- **Applicant** — fills out the application form (personal details, academic
  background, document upload, motivation essay with a live word counter),
  then sees a status tracker once submitted.
- **Intern** — sees an onboarding checklist, this week's schedule, mentor
  card, assigned tasks with mentor feedback, learning resources, and a
  performance report once one's been written.
- **Admin** — a sidebar app with a program dashboard (stats + by-department
  breakdown), an applicants table with a review modal (advance / reject /
  reset stage), an interns table with a per-intern detail page (assign +
  grade tasks, publish resources, write performance reports), a global
  tasks/resources list, and cohort setup (timeline, openings, required
  documents, essay prompt).

## Next steps if you take this further

- Replace the localStorage persistence in `data/seed.js` with real API calls.
- Add real authentication and route guarding.
- Add real file upload handling for the applicant's documents.
- Consider a router (React Router) once the admin section grows beyond a
  handful of pages.
