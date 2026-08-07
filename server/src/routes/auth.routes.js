import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

const authRouter = Router();

authRouter.post("/signup", (req, res, next) => {
  const { full_name, email, username, password } = req.body ?? {};
  if (!full_name || !email || !username || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  try {
    const result = db
      .prepare(
        "INSERT INTO users (full_name, email, username, password_hash, user_role) VALUES (?, ?, ?, ?, 'applicant')"
      )
      .run(full_name, email, username, password_hash);
    res.status(201).json({ data: { id: result.lastInsertRowid } });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Email or username already exists" });
    }
    next(err);
  }
});

authRouter.post("/login", (req, res, next) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { sub: user.id, role: user.user_role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ data: { token, role: user.user_role, full_name: user.full_name } });
  } catch (err) {
    next(err);
  }
});

export { authRouter };
