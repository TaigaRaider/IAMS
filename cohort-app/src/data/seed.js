// Seed data for the Cohort demo. In a real product this all lives behind an API.
export const seedDB = {
  cohort: {
    name: 'Summer 2026',
    status: 'Open',
    desc: 'Twelve-week paid internship across Engineering, Product Design, Data Science, Marketing and Operations.',
    opensOn: '2026-03-01',
    deadline: '2026-08-30',
    start: '2026-07-07',
    end: '2026-09-26',
    openings: 24,
    depts: ['Engineering', 'Product Design', 'Data Science', 'Marketing', 'Operations'],
    requiredDocs: ['CV', 'Transcript', 'Valid ID'],
    essayLimit: 450,
    essayPrompt: "Tell us about a project you built or contributed to, and what you'd do differently now.",
  },

  applicants: [
    {
      id: 'A-2481',
      initials: 'AN',
      name: 'Ada Nwosu',
      email: 'ada.nwosu@example.edu',
      phone: '+1 555 0142',
      school: 'Rutgers University',
      level: 'Undergraduate',
      gpa: '3.8',
      dept: 'Engineering',
      date: 'Jun 24',
      status: 'screening',
      documents: [
        { icon: '📄', name: 'CV_AdaNwosu.pdf', size: '212 KB' },
        { icon: '📄', name: 'Transcript_2026.pdf', size: '540 KB' },
        { icon: '🖼️', name: 'ID_Nwosu.png', size: '1.1 MB' },
      ],
      essay:
        'I led a three-person team building a campus ride-share matcher. It taught me that the hardest bugs are usually in the assumptions, not the code.',
      essayWords: 27,
    },
    {
      id: 'A-2477',
      initials: 'KO',
      name: 'Kwame Owusu',
      email: 'kwame.owusu@example.edu',
      phone: '+1 555 0119',
      school: 'Georgia Tech',
      level: 'Postgraduate',
      gpa: '3.6',
      dept: 'Data Science',
      date: 'Jun 21',
      status: 'applied',
      documents: [
        { icon: '📄', name: 'CV_KwameOwusu.pdf', size: '198 KB' },
        { icon: '📄', name: 'Transcript.pdf', size: '480 KB' },
        { icon: '🖼️', name: 'ID_Owusu.jpg', size: '900 KB' },
      ],
      essay: 'I want to move from analyzing data to building the systems that collect it well in the first place.',
      essayWords: 19,
    },
    {
      id: 'A-2465',
      initials: 'JL',
      name: 'Jamie Lin',
      email: 'jamie.lin@example.edu',
      phone: '+1 555 0187',
      school: 'UC San Diego',
      level: 'Undergraduate',
      gpa: '3.9',
      dept: 'Product Design',
      date: 'Jun 18',
      status: 'interview',
      documents: [
        { icon: '📄', name: 'CV_JamieLin.pdf', size: '230 KB' },
        { icon: '📄', name: 'Transcript_SD.pdf', size: '410 KB' },
        { icon: '🖼️', name: 'ID_Lin.png', size: '1.3 MB' },
      ],
      essay: 'Design is a series of small honest decisions. I want to make more of them under real constraints.',
      essayWords: 18,
    },
  ],

  interns: [
    {
      id: 'I-1001',
      initials: 'AN',
      name: 'Ada Nwosu',
      dept: 'Engineering',
      mentor: 'Sam Reyes',
      mentorRole: 'Senior Engineer',
      start: 'Jul 7, 2026',
      end: 'Sep 26, 2026',
      location: 'Hybrid · SF',
      checklist: [
        { label: 'Laptop set up', done: true },
        { label: 'Slack & email access', done: true },
        { label: 'Meet your mentor', done: true },
        { label: 'Read the engineering handbook', done: false },
        { label: 'Ship your first PR', done: false },
      ],
      schedule: [
        { day: 'MON', label: 'Team intro & laptop setup' },
        { day: 'WED', label: '1:1 with mentor Sam' },
        { day: 'FRI', label: 'First code review' },
      ],
      tasks: [
        {
          id: 'T-1',
          title: 'Environment setup',
          desc: 'Get the local dev environment running and submit a screenshot of the passing test suite.',
          deadline: 'Jul 9, 2026',
          audience: 'Ada Nwosu',
          status: 'graded',
          grade: 'Pass',
          remark: 'Clean setup, good notes in the PR description.',
        },
        {
          id: 'T-2',
          title: 'Fix a good-first-issue',
          desc: 'Pick up a labeled issue from the backlog and open a PR with a test.',
          deadline: 'Jul 18, 2026',
          audience: 'Engineering interns',
          status: 'in review',
          grade: null,
          remark: '',
        },
      ],
      resources: [
        { icon: '📘', title: 'Engineering Handbook', desc: 'Style guide, PR process, on-call basics.', url: 'https://example.com/handbook' },
        { icon: '🎥', title: 'Codebase walkthrough', desc: '40-min recorded tour of the main services.', url: 'https://example.com/walkthrough' },
      ],
      report: null,
    },
  ],

  tasks: [
    {
      id: 'T-1',
      title: 'Environment setup',
      desc: 'Get the local dev environment running and submit a screenshot of the passing test suite.',
      deadline: 'Jul 9, 2026',
      audience: { type: 'intern', name: 'Ada Nwosu' },
      assignedCount: 1,
      gradedCount: 1,
    },
    {
      id: 'T-2',
      title: 'Fix a good-first-issue',
      desc: 'Pick up a labeled issue from the backlog and open a PR with a test.',
      deadline: 'Jul 18, 2026',
      audience: { type: 'team', name: 'Engineering' },
      assignedCount: 4,
      gradedCount: 0,
    },
    {
      id: 'T-3',
      title: 'Intro survey',
      desc: 'Two-minute survey so mentors can tailor the first two weeks.',
      deadline: 'Jul 8, 2026',
      audience: { type: 'everyone', name: 'Everyone' },
      assignedCount: 12,
      gradedCount: 9,
    },
  ],

  resources: [
    {
      id: 'R-1',
      icon: '📘',
      title: 'Engineering Handbook',
      desc: 'Style guide, PR process, on-call basics.',
      url: 'https://example.com/handbook',
      audience: { type: 'team', name: 'Engineering' },
      reach: 6,
    },
    {
      id: 'R-2',
      icon: '🎥',
      title: 'Codebase walkthrough',
      desc: '40-minute recorded tour of the main services.',
      url: 'https://example.com/walkthrough',
      audience: { type: 'team', name: 'Engineering' },
      reach: 6,
    },
    {
      id: 'R-3',
      icon: '📄',
      title: 'Expense policy',
      desc: "What is and isn't reimbursable during the program.",
      url: 'https://example.com/expenses',
      audience: { type: 'everyone', name: 'Everyone' },
      reach: 12,
    },
  ],
}

const KEY = 'cohort-demo-db'

export function loadDB() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Could not read saved data, starting fresh.', e)
  }
  return structuredClone(seedDB)
}

export function saveDB(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch (e) {
    console.warn('Could not save data.', e)
  }
}

export function resetDB() {
  localStorage.removeItem(KEY)
  return structuredClone(seedDB)
}
