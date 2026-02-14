// API endpoints and configuration constants
export const API_ENDPOINTS = {
  PUMPFUN: {
    BASE: "https://frontend-api.pump.fun",
    ENDPOINTS: [
      "https://pump.fun/coin",
      "https://pumpportal.fun/api/coin-data",
      "https://api.pump.fun/coins",
      "https://frontend-api.pump.fun/coins",
    ],
  },
  DEXSCREENER: {
    BASE: "https://api.dexscreener.com/latest",
  },
  SOLSCAN: {
    BASE: "https://api.solscan.io",
  },
};

// Default timeouts and limits
export const TIMEOUTS = {
  DEFAULT: 8000,
  SHORT: 3000,
  LONG: 15000,
};

// Token analysis constants
export const TOKEN_CONSTANTS = {
  MIN_TRUST_SCORE: 5,
  MAX_TRUST_SCORE: 100,
  SCALE_FACTOR: 150,

  // Age calculation constants
  HOURS_IN_DAY: 24,
  DAYS_IN_MONTH: 30,
  DAYS_IN_YEAR: 365,

  // Social scoring thresholds
  SOCIAL_THRESHOLDS: {
    HIGH_VELOCITY: 10,
    MODERATE_VELOCITY: 5,
    LOW_VELOCITY: 1,
    MINIMAL_VELOCITY: 0.1,
  },

  // Market cap thresholds
  MARKET_CAP: {
    SUCCESSFUL_TOKEN: 10000,
    SOL_TO_USD: 240,
  },

  // Bot detection thresholds
  BOT_DETECTION: {
    MAX_CONSECUTIVE_CHARS: 4,
    MAX_DIGIT_RATIO: 0.8,
    MIN_ADDRESS_LENGTH: 20,
    SIMILARITY_THRESHOLD: 0.8,
    MAX_BOT_HOLDERS: 5,
    MAX_SUSPICIOUS_ADDRESSES: 3,
  },
};

// Meme token patterns for social buzz detection
export const MEME_PATTERNS = [
  "dog",
  "cat",
  "moon",
  "rocket",
  "safe",
  "baby",
  "mini",
  "shib",
  "pepe",
];

// Social media scoring points
export const SOCIAL_SCORING = {
  TWITTER: 25,
  TELEGRAM: 25,
  WEBSITE: 15,
  DESCRIPTION: 20,
  MAX_RECENT_ACTIVITY: 30,
};

// Default headers for different APIs
export const API_HEADERS = {
  PUMPFUN: {
    Referer: "https://pump.fun/",
  },
  SOLSCAN: {
    Accept: "application/json",
  },
};
