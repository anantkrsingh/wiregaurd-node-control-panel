import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
import authRoutes from "./routes/auth";
import serversRoutes from "./routes/servers";
import countriesRoutes from "./routes/countries";
import statsRoutes from "./routes/stats";
import publicRoutes from "./routes/public";
import { startPeerSnapshotInterval } from "./jobs/peer-snapshot";

app.use(cors({
  origin: ["http://localhost:5173", "https://vpn-admin.netlify.app"],
  credentials: true,
}));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/servers", serversRoutes);
app.use("/api/countries", countriesRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/public", publicRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // startPeerSnapshotInterval(30_000);
  // setTimeout(() => {
  //   import("./jobs/peer-snapshot").then((m) => m.runPeerSnapshotJob().catch((e) => console.error("Initial peer snapshot:", e)));
  // }, 2000);
});

