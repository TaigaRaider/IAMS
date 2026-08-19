import "dotenv/config";
import { db } from "../src/db.js";
import { users } from "../src/db/schema.js";
import { like } from "drizzle-orm";

const rows = await db
  .select({ id: users.id, full_name: users.full_name, email: users.email, username: users.username, role: users.user_role, is_deleted: users.is_deleted })
  .from(users)
  .where(like(users.full_name, "%COSMOS%"))
  .all();
console.log(JSON.stringify(rows, null, 2));
process.exit(0);