import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { users } from "../db/schema.js";

const authRouter = Router();

function isUniqueViolation(err) {
  const cause = err?.cause ?? err;
  return (
    cause?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    cause?.code === "SQLITE_CONSTRAINT" ||
    /UNIQUE constraint failed/i.test(cause?.message ?? "")
  );
}

authRouter.post("/signup", async (req, res, next) => {
  const { full_name, email, username, password } = req.body ?? {};
  if (!full_name || !email || !username || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  try {
    const result = await db
      .insert(users)
      .values({ full_name, email, username, password_hash, user_role: "applicant" })
      .run();
    res.status(201).json({ data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "Email or username already exists" });
    }
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { sub: user.id, role: user.user_role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.json({ data: { token, role: user.user_role, full_name: user.full_name } });
  } catch (err) {
    next(err);
  }
});

export { authRouter };
