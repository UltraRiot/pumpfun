import httpClient from "../utils/httpClient.js";
import { API_ENDPOINTS, TIMEOUTS } from "../config/constants.js";
import TokenUtils from "../utils/tokenUtils.js";

class DexScreenerService {
  constructor() {
    this.baseUrl = API_ENDPOINTS.DEXSCREENER.BASE;
  }

  async getTokenData(tokenAddress) {
    try {
      console.log(`📊 Fetching DexScreener data for: ${tokenAddress}`);

      const response = await httpClient.get(
        `${this.baseUrl}/dex/tokens/${tokenAddress}`,
        { timeout: TIMEOUTS.DEFAULT },
      );

      const pairs = response.data.pairs;
      if (!pairs || pairs.length === 0) {
        return { error: "Token not found on DEX" };
      }

      const bestPair = this._selectBestPair(pairs, tokenAddress);
      console.log(`📊 Using ${bestPair.dexId} pair for ${tokenAddress}`);

      const financialData = TokenUtils.extractFinancialData({
        ...bestPair,
        marketCap: bestPair.marketCap,
        liquidity: bestPair.liquidity,
        volume_24h: bestPair.volume?.h24,
        priceUsd: bestPair.priceUsd,
        priceChange24h: bestPair.priceChange?.h24,
      });

      return {
        ...TokenUtils.normalizeTokenInfo(bestPair.baseToken || {}),
        ...financialData,
        address: tokenAddress,
        dexId: bestPair.dexId,
        pairAddress: bestPair.pairAddress,
        createdAt: this._extractCreationTime(bestPair),
        priceChange: this._extractPriceChanges(bestPair),
        volatilityScore: TokenUtils.calculateVolatilityScore({
          priceChange: this._extractPriceChanges(bestPair),
        }),
        rawLiquidityData: bestPair.liquidity,
      };
    } catch (error) {
      console.error("DexScreener API error:", error.message);
      return { error: "Failed to fetch DEX data" };
    }
  }

  async searchCreator(creatorAddress) {
    try {
      const response = await httpClient.get(
        `${this.baseUrl}/dex/search/?q=${creatorAddress}`,
        { timeout: TIMEOUTS.SHORT },
      );

      return response.data.pairs || [];
    } catch (error) {
      console.log("⚠️ Creator search failed:", error.message);
      return [];
    }
  }

  _selectBestPair(pairs, tokenAddress) {
    // Priority: pump.fun > raydium > highest liquidity
    let bestPair = pairs.find(
      (p) => p.dexId === "pumpfun" || p.baseToken?.address === tokenAddress,
    );

    if (!bestPair) {
      bestPair = pairs.find((p) => p.dexId === "raydium");
    }

    if (!bestPair) {
      bestPair = pairs.reduce((best, current) => {
        const bestLiq = parseFloat(best.liquidity?.usd) || 0;
        const currentLiq = parseFloat(current.liquidity?.usd) || 0;
        return currentLiq > bestLiq ? current : best;
      });
    }

    return bestPair;
  }

  _extractCreationTime(pair) {
    if (pair.pairCreatedAt && pair.pairCreatedAt > 0) {
      console.log(
        `🕰️ Using DexScreener pair creation time: ${new Date(pair.pairCreatedAt)}`,
      );
      return pair.pairCreatedAt;
    }

    // No valid timestamp available
    console.log("⚠️ No valid pair creation time available");
    return null;
  }

  _extractPriceChanges(pair) {
    return {
      m5: parseFloat(pair.priceChange?.m5) || 0,
      h1: parseFloat(pair.priceChange?.h1) || 0,
      h6: parseFloat(pair.priceChange?.h6) || 0,
      h24: parseFloat(pair.priceChange?.h24) || 0,
    };
  }
}

export default new DexScreenerService();
