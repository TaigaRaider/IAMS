import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { config } from "dotenv";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { interviewRouter } from "./routes/interviews.routes.js";
import { offerRouter } from "./routes/offers.routes.js";
import { roleRouter } from "./routes/roles.routes.js";
import { applicationRouter } from "./routes/applications.routes.js";
import { internRouter } from "./routes/interns.routes.js";

config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn(
    "WARNING: JWT_SECRET is missing or weaker than 32 characters. Set a long random secret in server/.env before deploying.",
  );
}

const app = express();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(
      `[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`,
    );
  });
  next();
});
app.use(
  cors({
    origin: `${process.env.ORIGIN}`,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));

const jsonError = (message) => (_req, res) =>
  res.status(429).json({ error: message });

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonError("Too many requests. Please try again later."),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonError("Too many login attempts. Try again later."),
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonError("Too many accounts created from this address. Try again later."),
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/signup", signupLimiter);
app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/interviews", interviewRouter);
app.use("/api/offers", offerRouter);
app.use("/api/roles", roleRouter);
app.use("/api/applications", applicationRouter);
app.use("/api", internRouter);

app.get("/", (req, res) => {
  res.send("This is BACKEND...HAHAHAHAHAHAHAH");
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
