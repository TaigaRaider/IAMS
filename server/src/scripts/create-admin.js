import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { users } from "../db/schema.js";

const [username, password, fullName] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node src/scripts/create-admin.js <username> <password> [full name]");
  process.exit(1);
}

const password_hash = bcrypt.hashSync(password, 10);
const email = `${username}@iams.local`;

try {
  const result = await db
    .insert(users)
    .values({ full_name: fullName ?? "Admin", email, username, password_hash, user_role: "admin" })
    .run();
  console.log(`Admin '${username}' created with id ${Number(result.lastInsertRowid)}`);
} catch (err) {
  const cause = err?.cause ?? err;
  if (
    cause?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    cause?.code === "SQLITE_CONSTRAINT" ||
    /UNIQUE constraint failed/i.test(cause?.message ?? "")
  ) {
    console.error("Username or email already exists");
    process.exit(1);
  }
  throw err;
}
