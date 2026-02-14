import { randomUUID } from "crypto";

const metrics = {
  startedAt: new Date().toISOString(),
  requestsTotal: 0,
  errorsTotal: 0,
  routeStats: {},
};

const rateLimitStore = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export function requestContextAndMetrics(req, res, next) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const endedAt = process.hrtime.bigint();
    const durationMs = Number(endedAt - startedAt) / 1_000_000;
    const routeKey = `${req.method} ${req.path}`;

    metrics.requestsTotal += 1;

    if (!metrics.routeStats[routeKey]) {
      metrics.routeStats[routeKey] = {
        count: 0,
        errors: 0,
        avgLatencyMs: 0,
      };
    }

    const stat = metrics.routeStats[routeKey];
    stat.count += 1;
    stat.avgLatencyMs =
      (stat.avgLatencyMs * (stat.count - 1) + durationMs) / stat.count;

    if (res.statusCode >= 400) {
      metrics.errorsTotal += 1;
      stat.errors += 1;
    }
  });

  next();
}

export function simpleRateLimiter(req, res, next) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX || 60);
  const now = Date.now();
  const ip = getClientIp(req);

  const current = rateLimitStore.get(ip);
  if (!current || now > current.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
    return next();
  }

  if (current.count >= maxRequests) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000),
    );
    res.setHeader("retry-after", retryAfterSec.toString());
    return res.status(429).json({
      error: "Too many requests",
      message: "Rate limit exceeded, please retry shortly",
    });
  }

  current.count += 1;
  return next();
}

export function getOpsMetrics() {
  return {
    ...metrics,
    uptimeSec: Math.floor(process.uptime()),
  };
}

export function optionalApiKeyAuth(req, res, next) {
  const configuredApiKey = process.env.API_KEY;
  if (!configuredApiKey) return next();

  const provided = req.headers["x-api-key"];
  if (provided !== configuredApiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing API key",
    });
  }

  return next();
}
