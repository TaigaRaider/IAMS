import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as schema from "./db/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url =
  process.env.TURSO_DATABASE_URL ||
  pathToFileURL(join(__dirname, "..", "data", "iams.db")).href;

const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });

client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle(client, { schema });
