PRAGMA foreign_keys=1;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  user_role     TEXT NOT NULL DEFAULT 'applicant' CHECK (user_role IN ('admin','applicant')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  department  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id INTEGER NOT NULL REFERENCES users(id),
  role_id      INTEGER NOT NULL REFERENCES roles(id),
  status       TEXT NOT NULL DEFAULT 'In Review'
               CHECK (status IN ('In Review','Shortlisted','Rejected','Hired')),
  applied_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (applicant_id, role_id)
);

CREATE TABLE IF NOT EXISTS interviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  scheduled_at   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Done','Cancelled'))
);

CREATE TABLE IF NOT EXISTS offers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL UNIQUE REFERENCES applications(id),
  status         TEXT NOT NULL DEFAULT 'Extended' CHECK (status IN ('Extended','Accepted','Declined')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
