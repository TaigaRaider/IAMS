import express from "express";
import multer from "multer";
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
import { notificationRouter } from "./routes/notifications.routes.js";
import { onboardingRouter } from "./routes/onboarding.routes.js";
import { UPLOADS_DIR, UPLOADS_URL } from "./utils/upload.js";

config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn(
    "WARNING: JWT_SECRET is missing or weaker than 32 characters. Set a long random secret in server/.env before deploying.",
  );
}

// A transient failure (e.g. Turso DNS hiccup) must never kill the process.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason instanceof Error ? reason.stack : reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.stack ?? err);
});

const app = express();

app.disable("x-powered-by");

// Behind a reverse proxy (Cloudflare, nginx, Render, ...) req.ip is the
// proxy's address unless we opt into trusting X-Forwarded-For. Rate limiters
// key on req.ip, so set TRUST_PROXY=<hops> in production to make them see the
// real client address. Leave unset in local dev (all traffic comes in via the
// Vite proxy on 127.0.0.1).
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}

const isProd = process.env.NODE_ENV === "production";

app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cookieParser());

// Auth-sensitive API responses must never be cached by intermediaries.
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
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
app.use(express.json({ limit: "20kb" }));

const jsonError = (message) => (_req, res) =>
  res.status(429).json({ error: message });

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Dev defaults are low because the dashboard fires several requests per
  // mount (StrictMode doubles them); let deployment tune it via env.
  limit: Number(process.env.API_RATE_LIMIT ?? 3000),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonError("Too many requests. Please try again later."),
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
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

const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonError("Too many attempts. Please try again later."),
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonError("Too many requests. Please try again later."),
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/signup", signupLimiter);
app.use("/api/auth/verify-email", codeLimiter);
app.use("/api/auth/reset-password", codeLimiter);
app.use("/api/auth/resend-verification", resendLimiter);
app.use("/api/auth/forgot-password", resendLimiter);
app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/interviews", interviewRouter);
app.use("/api/offers", offerRouter);
app.use("/api/roles", roleRouter);
app.use("/api/applications", applicationRouter);
app.use("/api", internRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/onboarding", onboardingRouter);

// Uploaded documents (resumes/CVs) are stored on disk and served by filename;
// filenames are random UUIDs so they aren't enumerable.
app.use(UPLOADS_URL, express.static(UPLOADS_DIR, { maxAge: "1h" }));

app.get("/", (req, res) => {
  res.send("This is BACKEND...HAHAHAHAHAHAHAH");
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
