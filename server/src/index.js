import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { interviewRouter } from "./routes/interviews.routes.js";
import { offerRouter } from "./routes/offers.routes.js";
import { roleRouter } from "./routes/roles.routes.js";
import { applicationRouter } from "./routes/applications.routes.js";

config();

const app = express();

app.use(
  cors({
    origin: `${process.env.ORIGIN}`,
  })
);
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/interviews", interviewRouter);
app.use("/api/offers", offerRouter);
app.use("/api/roles", roleRouter);
app.use("/api/applications", applicationRouter);

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
