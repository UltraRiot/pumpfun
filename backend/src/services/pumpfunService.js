import httpClient from "../utils/httpClient.js";
import { API_ENDPOINTS, API_HEADERS, TIMEOUTS } from "../config/constants.js";
import TokenUtils from "../utils/tokenUtils.js";

class PumpfunService {
  constructor() {
    this.baseUrl = API_ENDPOINTS.PUMPFUN.BASE;
    this.endpoints = API_ENDPOINTS.PUMPFUN.ENDPOINTS;
  }

  async getTokenData(tokenAddress) {
    try {
      console.log(`🔍 Fetching pump.fun data for: ${tokenAddress}`);

      const endpoints = this.endpoints.map((base) => `${base}/${tokenAddress}`);

      const response = await httpClient.getWithFallbacks(endpoints, {
        headers: API_HEADERS.PUMPFUN,
        timeout: TIMEOUTS.DEFAULT,
      });

      const data = response.data;
      if (!data) return null;

      const tokenData = data.data || data;
      const normalizedInfo = TokenUtils.normalizeTokenInfo(tokenData);
      const financialData = TokenUtils.extractFinancialData(tokenData);

      console.log("🔥 Pump.fun API success:", {
        symbol: normalizedInfo.symbol,
        marketCap: financialData.marketCap,
        creator: tokenData.creator,
        hasTimestamp: !!tokenData.created_timestamp,
        comments: this._extractCommentCount(tokenData),
      });

      return {
        ...normalizedInfo,
        ...financialData,
        address: tokenAddress,
        description: tokenData.description || "",
        createdAt: this._extractTimestamp(tokenData),
        creator: tokenData.creator || tokenData.deployer || null,
        bondingCurveComplete:
          tokenData.complete || tokenData.raydium_pool || false,
        isPumpfun: true,
        imageUrl: tokenData.image_uri || tokenData.image || null,
        ...this._extractSocialData(tokenData),
        ...this._extractCommentData(tokenData),
      };
    } catch (error) {
      console.log("❌ Pump.fun API failed:", error.message);
      return null;
    }
  }

  _extractTimestamp(tokenData) {
    if (tokenData.created_timestamp) {
      const timestamp = tokenData.created_timestamp;
      const date =
        timestamp > 1000000000000
          ? new Date(timestamp)
          : new Date(timestamp * 1000);
      return date.toISOString();
    }
    return null;
  }

  _extractSocialData(tokenData) {
    return {
      hasTwitter: !!(tokenData.twitter || tokenData.social?.twitter),
      hasTelegram: !!(tokenData.telegram || tokenData.social?.telegram),
      hasWebsite: !!(tokenData.website || tokenData.social?.website),
    };
  }

  _extractCommentData(tokenData) {
    const commentCount = this._extractCommentCount(tokenData);
    return {
      replies: commentCount,
      commentCount,
      showName: !!tokenData.show_name,
    };
  }

  _extractCommentCount(tokenData) {
    return parseInt(
      tokenData.reply_count ||
        tokenData.replies ||
        tokenData.comment_count ||
        tokenData.comments ||
        tokenData.total_replies ||
        0,
    );
  }
}

export default new PumpfunService();
