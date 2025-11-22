import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { PrismaClient } from "@dev-sam17/prisma-client-for-samflix";

import morgan from "morgan";
dotenv.config({ path: ".env" });

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

// Import routes (to be created)
import movieRoutes from "./api/routes/movie.routes";
import seriesRoutes from "./api/routes/series.routes";
import scannerRoutes from "./api/routes/scanner.routes";
import webhookRoutes from "./api/routes/webhook.routes";
import transcodeRoutes from "./api/routes/transcode.routes";
import progressRoutes from "./api/routes/progress.routes";
import storageRoutes from "./api/routes/storage.routes";
import { MediaScanSchedulerService } from "./services/scheduler/media-scan-scheduler.service";
import { DiskScannerService } from "./services/storage/disk-scanner.service";

// Create Express app
const app = express();

// Initialize Prisma Client
export const prisma = new PrismaClient();
// export const TranscodeStatus = TranscodeStatus;

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Additional middleware to ensure CORS headers are set
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header(
      "Access-Control-Allow-Origin",
      (req.headers.origin as string) || "*"
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET,PUT,POST,DELETE,PATCH,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );

    // Handle OPTIONS method
    if (req.method === "OPTIONS") {
      res.status(204).send();
      return;
    }
    next();
  }
);

app.get("/", (_req, res) => {
  res.send("OK");
});

// Request logger
app.use(morgan("dev"));

// Routes that need raw body (must come before express.json() middleware)
app.use("/api/webhooks", webhookRoutes);

// Apply JSON parsing middleware AFTER the webhook routes
app.use(express.json());

// Other routes that can use parsed JSON body
app.use("/api/movies", movieRoutes);
app.use("/api/series", seriesRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/transcode", transcodeRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/storage", storageRoutes);

// Serve media folder as static content
// In Docker container, media folder is one level up from the project root
app.use(
  "/media",
  express.static("/media", {
    setHeaders: (res, path) => {
      // Set CORS headers for all static media files
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Set appropriate content type headers based on file extension
      if (path.endsWith(".m3u8")) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      } else if (path.endsWith(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
      }
    },
  })
);

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(
  (
    err: Error,
    _: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  }
);
// Start server
const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});

// Initialize cron job for media scanning
const scanInterval = process.env.SCAN_INTERVAL || "0 */2 * * *"; // Every 2 hours
cron.schedule(
  scanInterval,
  async () => {
    await MediaScanSchedulerService.executeScheduledScan();
  },
  {
    timezone: process.env.TZ || "UTC",
  }
);

// Initialize cron job for disk usage scanning (every 24 hours)
const diskScanInterval = process.env.DISK_SCAN_INTERVAL || "0 0 * * *"; // Every day at midnight
cron.schedule(
  diskScanInterval,
  async () => {
    await DiskScannerService.executeScheduledDiskScan();
  },
  {
    timezone: process.env.TZ || "UTC",
  }
);
