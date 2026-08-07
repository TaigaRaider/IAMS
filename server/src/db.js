import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "..", "data", "iams.db"));

db.pragma("foreign_keys = ON");

const schema = readFileSync(join(__dirname, "schema", "schema.sql"), "utf8");
db.exec(schema);

export default db;
