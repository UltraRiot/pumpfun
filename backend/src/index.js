import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/api.js";
import solanaService from "./services/solanaService.js";
import {
  requestContextAndMetrics,
  simpleRateLimiter,
  getOpsMetrics,
  optionalApiKeyAuth,
} from "./middleware/opsMiddleware.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
let isShuttingDown = false;
app.locals.isReady = false;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
  }),
);
app.use(express.json({ limit: process.env.JSON_LIMIT || "100kb" }));
app.use(requestContextAndMetrics);
app.use(simpleRateLimiter);

// Basic health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "PumpFun Scanner API is running",
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe
app.get("/live", (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: "shutting_down" });
  }
  return res.json({ status: "alive" });
});

// Readiness probe
app.get("/ready", (req, res) => {
  if (!app.locals.isReady || isShuttingDown) {
    return res.status(503).json({ status: "not_ready" });
  }
  return res.json({ status: "ready" });
});

// Simple metrics endpoint
app.get("/metrics", (req, res) => {
  res.json(getOpsMetrics());
});

// API Routes
app.use("/api", optionalApiKeyAuth, apiRoutes);

// Catch-all route
app.get("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    availableEndpoints: [
      "GET /health",
      "GET /live",
      "GET /ready",
      "GET /metrics",
      "GET /api/test-connection",
      "GET /api/trust-score/:address",
      "GET /api/tokens/recent",
    ],
  });
});

async function startServer() {
  try {
    const connected = await solanaService.testConnection();
    app.locals.isReady = connected === true;

    const server = app.listen(PORT, "127.0.0.1", () => {
      console.log(`🚀 PumpFun Scanner API running on port ${PORT}`);
      console.log(`📊 Health check: http://127.0.0.1:${PORT}/health`);
      console.log(`🫀 Liveness: http://127.0.0.1:${PORT}/live`);
      console.log(`✅ Readiness: http://127.0.0.1:${PORT}/ready`);
      console.log(`📈 Metrics: http://127.0.0.1:${PORT}/metrics`);
      console.log(
        `🔌 Test connection: http://127.0.0.1:${PORT}/api/test-connection`,
      );
    });

    server.on("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use (127.0.0.1:${PORT}).`);
        console.error(
          "👉 Stop the existing process using this port, or set a different PORT in backend/.env",
        );
        process.exit(1);
      }

      console.error("❌ HTTP server failed to start:", error.message);
      process.exit(1);
    });

    const gracefulShutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      app.locals.isReady = false;
      console.log(`🛑 Received ${signal}, shutting down gracefully...`);

      server.close(() => {
        console.log("✅ HTTP server closed");
        process.exit(0);
      });

      setTimeout(() => {
        console.error("❌ Forced shutdown timeout reached");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

export default app;
