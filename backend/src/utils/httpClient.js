import axios from "axios";

class HttpClient {
  constructor() {
    this.defaultTimeout = 8000;
    this.defaultHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    };
    this.cache = new Map();
    this.circuit = new Map();
    this.cacheTtlMs = Number(process.env.HTTP_CACHE_TTL_MS || 15_000);
    this.cbFailureThreshold = Number(
      process.env.HTTP_CB_FAILURE_THRESHOLD || 3,
    );
    this.cbCooldownMs = Number(process.env.HTTP_CB_COOLDOWN_MS || 30_000);
  }

  async get(endpoint, options = {}) {
    const now = Date.now();
    const cbState = this.circuit.get(endpoint);
    if (cbState && cbState.openUntil && cbState.openUntil > now) {
      throw new Error(
        "Circuit open for endpoint (temporary upstream protection)",
      );
    }

    const cached = this.cache.get(endpoint);
    if (cached && cached.expiresAt > now) {
      return cached.response;
    }

    const config = {
      timeout: options.timeout || this.defaultTimeout,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`🌐 HTTP GET: ${endpoint}`);
      const response = await axios.get(endpoint, config);

      // Successful call closes circuit and refreshes cache
      this.circuit.set(endpoint, { failures: 0, openUntil: 0 });
      this.cache.set(endpoint, {
        response,
        expiresAt: now + this.cacheTtlMs,
      });

      return response;
    } catch (error) {
      console.log(`❌ HTTP GET failed for ${endpoint}: ${error.message}`);

      const current = this.circuit.get(endpoint) || {
        failures: 0,
        openUntil: 0,
      };
      const failures = current.failures + 1;
      const openUntil =
        failures >= this.cbFailureThreshold
          ? Date.now() + this.cbCooldownMs
          : 0;

      this.circuit.set(endpoint, {
        failures,
        openUntil,
      });

      throw error;
    }
  }

  async getWithFallbacks(endpoints, options = {}) {
    for (const endpoint of endpoints) {
      try {
        return await this.get(endpoint, options);
      } catch (error) {
        console.log(`❌ Failed endpoint: ${endpoint} - ${error.message}`);
        continue;
      }
    }
    throw new Error("All endpoints failed");
  }
}

export default new HttpClient();
