import { createClient } from "@libsql/client";
const c = createClient({ url: "file:./data/iams-test.db" });
const r = await c.execute("UPDATE users SET email_verified = 1 WHERE email LIKE 'reuse%' OR email LIKE 'live%'");
console.log("updated rows:", r.rowsAffected);
process.exit(0);