import httpClient from "../utils/httpClient.js";
import { TIMEOUTS } from "../config/constants.js";

class JupiterService {
  constructor() {
    // Use Jupiter's public token list endpoint
    this.tokenListUrl = "https://tokens.jup.ag/token-list";
  }

  async getTokenInfo(tokenAddress) {
    try {
      console.log(`📝 Checking token info: ${tokenAddress}`);

      // Skip Jupiter for now due to DNS issues, return null to avoid errors
      console.log(
        `⚠️ Jupiter service temporarily disabled due to connectivity issues`,
      );
      return null;
    } catch (error) {
      console.log(`❌ Jupiter token lookup failed: ${error.message}`);
      return null;
    }
  }
}

export default new JupiterService();
