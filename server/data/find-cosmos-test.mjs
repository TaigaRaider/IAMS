import { createClient } from "@libsql/client";
const c = createClient({ url: "file:./data/iams-test.db" });
const r = await c.execute('SELECT id, full_name, email, username, is_deleted FROM users WHERE full_name LIKE "%COSMOS%"');
console.log(JSON.stringify(r.rows));
process.exit(0);