import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

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
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    unique("users_email_unique").on(t.email),
    unique("users_username_unique").on(t.username),
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
    status: text("status", { enum: ["Extended", "Accepted", "Declined"] })
      .notNull()
      .default("Extended"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
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
