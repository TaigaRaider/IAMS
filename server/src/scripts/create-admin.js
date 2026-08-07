import bcrypt from "bcryptjs";
import db from "../db.js";

const [username, password, fullName] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node src/scripts/create-admin.js <username> <password> [full name]");
  process.exit(1);
}

const password_hash = bcrypt.hashSync(password, 10);
const email = `${username}@iams.local`;

try {
  const result = db
    .prepare(
      "INSERT INTO users (full_name, email, username, password_hash, user_role) VALUES (?, ?, ?, ?, 'admin')"
    )
    .run(fullName ?? "Admin", email, username, password_hash);
  console.log(`Admin '${username}' created with id ${result.lastInsertRowid}`);
} catch (err) {
  if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
    console.error(`Username or email already exists`);
    process.exit(1);
  }
  throw err;
}
