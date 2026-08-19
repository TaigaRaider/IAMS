import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, unique, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    full_name: text("full_name").notNull(),
    email: text("email").notNull(),
    username: text("username").notNull(),
    password_hash: text("password_hash").notNull(),
    user_role: text("user_role", {
      enum: ["admin", "applicant", "intern"],
    })
      .notNull()
      .default("applicant"),
    is_deactivated: integer("is_deactivated").notNull().default(0),
    is_deleted: integer("is_deleted").notNull().default(0),
    email_verified: integer("email_verified").notNull().default(0),
    token_version: integer("token_version").notNull().default(0),
    phone: text("phone"),
    location: text("location"),
    nationality: text("nationality"),
    date_of_birth: text("date_of_birth"),
    education: text("education"),
    experience: text("experience"),
    skills: text("skills"),
    cover_letter: text("cover_letter"),
    avatar_url: text("avatar_url"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    // Email is unique only among live accounts — a soft-deleted account
    // (is_deleted = 1) releases its address so it can be reused.
    uniqueIndex("users_email_active_unique")
      .on(t.email)
      .where(sql`${t.is_deleted} = 0`),
    unique("users_username_unique").on(t.username),
    uniqueIndex("users_username_ci_unique").on(sql`lower(${t.username})`),
  ],
);

export const roles = sqliteTable(
  "roles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    department: text("department").notNull(),
    status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
    description: text("description"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicant_id: integer("applicant_id")
      .notNull()
      .references(() => users.id),
    role_id: integer("role_id")
      .notNull()
      .references(() => roles.id),
    status: text("status", {
      enum: ["In Review", "Shortlisted", "Rejected", "Hired"],
    })
      .notNull()
      .default("In Review"),
    resume_path: text("resume_path"),
    resume_name: text("resume_name"),
    applied_at: text("applied_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [unique("applications_applicant_id_role_id_unique").on(t.applicant_id, t.role_id)],
);

export const interviews = sqliteTable(
  "interviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    application_id: integer("application_id")
      .notNull()
      .references(() => applications.id),
    scheduled_at: text("scheduled_at").notNull(),
    status: text("status", {
      enum: ["Pending", "Confirmed", "Done", "Cancelled"],
    })
      .notNull()
      .default("Pending"),
    interviewer_id: integer("interviewer_id").references(() => users.id),
    venue: text("venue", { enum: ["online", "onsite"] }),
    venue_info: text("venue_info"),
  },
);

export const offers = sqliteTable(
  "offers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    application_id: integer("application_id")
      .notNull()
      .unique()
      .references(() => applications.id),
    status: text("status", {
      enum: [
        "Draft",
        "Extended",
        "In Negotiation",
        "Final",
        "Accepted",
        "Confirmed",
        "Declined",
      ],
    })
      .notNull()
      .default("Draft"),
    current_revision_id: integer("current_revision_id"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const offerRevisions = sqliteTable(
  "offer_revisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offer_id: integer("offer_id")
      .notNull()
      .references(() => offers.id),
    version: integer("version").notNull(),
    kind: text("kind", {
      enum: ["initial", "counter", "final", "reoffer"],
    })
      .notNull()
      .default("initial"),
    role_id: integer("role_id").references(() => roles.id),
    position_title: text("position_title"),
    compensation: text("compensation").notNull(),
    duration: text("duration"),
    start_date: text("start_date"),
    narration: text("narration").notNull(),
    terms: text("terms").notNull(),
    expiry_date: text("expiry_date"),
    status: text("status", {
      enum: ["proposed", "accepted", "declined", "superseded"],
    })
      .notNull()
      .default("proposed"),
    created_by: integer("created_by")
      .notNull()
      .references(() => users.id),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const offerMessages = sqliteTable(
  "offer_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offer_id: integer("offer_id")
      .notNull()
      .references(() => offers.id),
    sender_role: text("sender_role", {
      enum: ["admin", "candidate"],
    }).notNull(),
    message: text("message").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind", { enum: ["verify", "reset"] }).notNull(),
    token_hash: text("token_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expires_at: text("expires_at").notNull(),
    used_at: text("used_at"),
    data: text("data"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("auth_tokens_user_kind_idx").on(t.user_id, t.kind)],
);

export const internTasks = sqliteTable(
  "intern_tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    intern_id: integer("intern_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["pending", "in_progress", "done"],
    })
      .notNull()
      .default("pending"),
    due_date: text("due_date"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind", {
      enum: ["application", "interview", "offer", "task", "account"],
    }).notNull(),
    message: text("message").notNull(),
    is_read: integer("is_read").notNull().default(0),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("notifications_user_read_idx").on(t.user_id, t.is_read)],
);

export const onboardingSteps = sqliteTable(
  "onboarding_steps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    step_key: text("step_key").notNull(),
    label: text("label").notNull(),
    done: integer("done").notNull().default(0),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    unique("onboarding_user_step_unique").on(t.user_id, t.step_key),
    index("onboarding_user_idx").on(t.user_id),
  ],
);

// Text-packet file transport: a file is stored as a set of uniform text
// packets (Reed-Solomon data + parity fragments, ~512 base64 chars each) so
// any `m` of `n` packets per block are enough to reconstruct the file.
export const textFiles = sqliteTable(
  "text_files",
  {
    file_id: text("file_id").primaryKey(), // first 8 hex chars of sha256(file)
    file_name: text("file_name").notNull(),
    mime_type: text("mime_type").notNull(),
    size_bytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    blocks: integer("blocks").notNull(),
    packet_count: integer("packet_count").notNull(),
    manifest: text("manifest").notNull(), // JSON: per-block RS geometry + total
    status: text("status", {
      enum: ["stored", "repaired", "corrupt"],
    })
      .notNull()
      .default("stored"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const textPackets = sqliteTable(
  "text_packets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    file_id: text("file_id")
      .notNull()
      .references(() => textFiles.file_id),
    seq: integer("seq").notNull(), // 0 = manifest, then data, then parity
    type: text("type", {
      enum: ["manifest", "data", "parity"],
    }).notNull(),
    payload: text("payload").notNull(), // base64 fragment
    status: text("status", {
      enum: ["ok", "corrupt", "missing"],
    })
      .notNull()
      .default("ok"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    unique("text_packets_file_seq_unique").on(t.file_id, t.seq),
    index("text_packets_file_idx").on(t.file_id),
  ],
);
