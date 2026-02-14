import { TOKEN_CONSTANTS } from "../config/constants.js";

class TokenUtils {
  // Validate Solana token address format
  static isValidSolanaAddress(address) {
    if (!address || typeof address !== "string") return false;

    // Solana addresses are base58 encoded and typically 32-44 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    // Check length and character set
    if (!base58Regex.test(address)) return false;

    // Additional validation - avoid obviously invalid addresses
    const invalidPatterns = [
      /^1{32,}$/, // All 1s
      /^[1-9A-HJ-NP-Za-km-z]\1{31,}$/, // Repeating characters
    ];

    return !invalidPatterns.some((pattern) => pattern.test(address));
  }

  // Check if token data contains valid information (not mock/empty data)
  static hasValidTokenData(data) {
    if (!data || data.error) return false;

    // Check for meaningful token data
    const hasValidSymbol =
      data.symbol && data.symbol !== "UNKNOWN" && data.symbol !== "";
    const hasValidName =
      data.name && data.name !== "Unknown Token" && data.name !== "";
    const hasFinancialData =
      data.marketCap > 0 || data.liquidity > 0 || data.volume24h > 0;
    const hasTimestamp =
      data.createdAt !== undefined && data.createdAt !== null;
    const hasAddress = data.address && data.address !== "";

    // Accept token if it has:
    // - Valid symbol OR name, OR
    // - Financial data (market cap, liquidity, volume), OR
    // - Valid timestamp (indicates real token), OR
    // - Valid address (basic requirement)
    return (
      hasValidSymbol ||
      hasValidName ||
      hasFinancialData ||
      hasTimestamp ||
      hasAddress
    );
  }
  // Format age as Year/Month/Days/Hours
  static formatTokenAge(ageInHours) {
    if (ageInHours <= 0) return "0h";

    const { HOURS_IN_DAY, DAYS_IN_MONTH, DAYS_IN_YEAR } = TOKEN_CONSTANTS;

    const years = Math.floor(ageInHours / (DAYS_IN_YEAR * HOURS_IN_DAY));
    const months = Math.floor(
      (ageInHours % (DAYS_IN_YEAR * HOURS_IN_DAY)) /
        (DAYS_IN_MONTH * HOURS_IN_DAY),
    );
    const days = Math.floor(
      (ageInHours % (DAYS_IN_MONTH * HOURS_IN_DAY)) / HOURS_IN_DAY,
    );
    const hours = Math.floor(ageInHours % HOURS_IN_DAY);

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || parts.length === 0) parts.push(`${hours}h`);

    return parts.join(" ");
  }

  // Calculate token age in hours from timestamp
  static calculateTokenAgeInHours(timestamp) {
    if (!timestamp) return 0;

    const createdDate = new Date(timestamp);
    const now = new Date();
    return (now - createdDate) / (1000 * 60 * 60);
  }

  // Estimate token age based on simple heuristics
  static estimateTokenAge(data) {
    try {
      // Try to get age from various timestamp sources
      const timestamps = [
        data.created_timestamp,
        data.createdAt,
        data.pairCreatedAt,
        data.blockTime,
        data.createTime,
      ].filter(Boolean);

      if (timestamps.length > 0) {
        const timestamp = timestamps[0];
        const date =
          timestamp > 1000000000000
            ? new Date(timestamp)
            : new Date(timestamp * 1000);

        return this.calculateTokenAgeInHours(date.toISOString());
      }

      // No valid timestamp found
      console.log("⚠️ No timestamp found, age unknown");
      return null;
    } catch (error) {
      console.log("⚠️ Age estimation error:", error.message);
      return null;
    }
  }

  // Calculate volatility score based on price changes
  static calculateVolatilityScore(priceData) {
    try {
      const changes = [
        Math.abs(priceData.priceChange?.m5 || 0),
        Math.abs(priceData.priceChange?.h1 || 0),
        Math.abs(priceData.priceChange?.h6 || 0),
        Math.abs(priceData.priceChange?.h24 || 0),
      ];

      const avgVolatility = changes.reduce((a, b) => a + b, 0) / changes.length;
      console.log(`📈 Volatility calculation: ${avgVolatility.toFixed(2)}%`);

      return Math.min(100, Math.floor(avgVolatility));
    } catch (error) {
      console.log("⚠️ Error calculating volatility, using default");
      return 50;
    }
  }

  // Normalize token name and symbol (avoid mock data)
  static normalizeTokenInfo(data) {
    // Only return data if we have real information
    const symbol = data.symbol || data.baseToken?.symbol || data.mint;
    const name = data.name || data.baseToken?.name;

    return {
      symbol: symbol && symbol !== "" ? symbol : null,
      name: name && name !== "" ? name : null,
    };
  }

  // Extract financial data with fallbacks
  static extractFinancialData(data) {
    return {
      marketCap: parseFloat(
        data.usd_market_cap ||
          data.market_cap ||
          data.marketCap ||
          data.fdv ||
          0,
      ),
      liquidity: parseFloat(
        data.liquidity?.usd ||
          (data.virtual_sol_reserves || data.virtual_token_reserves || 0) *
            TOKEN_CONSTANTS.MARKET_CAP.SOL_TO_USD,
      ),
      volume24h: parseFloat(
        data.volume_24h || data.volume?.h24 || data.volume || 0,
      ),
      price: parseFloat(data.priceUsd || data.price || 0),
      priceChange24h: parseFloat(
        data.priceChange?.h24 || data.priceChange24h || 0,
      ),
    };
  }
}

export default TokenUtils;
