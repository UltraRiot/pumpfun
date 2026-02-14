import TokenUtils from "../utils/tokenUtils.js";
import httpClient from "../utils/httpClient.js";
import solanaService from "./solanaService.js";
import pumpfunService from "./pumpfunService.js";

class DataFetcher {
  constructor() {
    console.log("🟢 Data Fetcher with Jupiter/DEXScreener APIs");
  }

  async getTokenData(tokenAddress) {
    try {
      // Validate token address format first
      if (!TokenUtils.isValidSolanaAddress(tokenAddress)) {
        throw new Error("Invalid token address format");
      }

      console.log(`🔍 Analyzing token: ${tokenAddress}`);

      // Try to get real data from DEX APIs
      let tokenData = await this._tryRealDexData(tokenAddress);

      if (!tokenData) {
        console.log("❌ All DEX APIs failed - no real market data available");
        throw new Error(
          "No real market data available from Jupiter/DEXScreener",
        );
      }

      console.log(
        `✅ Token analysis complete: ${tokenData.symbol} - ${tokenData.name}`,
      );

      return tokenData;
    } catch (error) {
      console.error("❌ Token analysis failed:", error.message);
      throw new Error(`Token analysis failed: ${error.message}`);
    }
  }

  async _tryRealDexData(tokenAddress) {
    try {
      console.log(
        `🌐 Attempting Jupiter/DEXScreener APIs for: ${tokenAddress}`,
      );

      // Try Jupiter API first
      const jupiterData = await this._getJupiterData(tokenAddress);
      if (jupiterData) {
        console.log(`✅ Got data from Jupiter API`);
        return jupiterData;
      }

      // Try DEXScreener API as backup
      const dexScreenerData = await this._getDexScreenerData(tokenAddress);
      if (dexScreenerData) {
        console.log(`✅ Got data from DEXScreener API`);
        return dexScreenerData;
      }

      console.log(`❌ All DEX APIs failed - no data available`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching DEX data:`, error.message);
      return null;
    }
  }

  async _getJupiterData(tokenAddress) {
    try {
      console.log(`🔍 Trying Jupiter API...`);

      // Jupiter price API
      const priceResponse = await httpClient.get(
        `https://price.jup.ag/v4/price?ids=${tokenAddress}`,
        {
          timeout: 10000,
        },
      );

      if (priceResponse?.data?.data?.[tokenAddress]) {
        const priceData = priceResponse.data.data[tokenAddress];

        // Get token metadata from Jupiter token list
        try {
          const metadataResponse = await httpClient.get(
            `https://tokens.jup.ag/token/${tokenAddress}`,
            {
              timeout: 10000,
            },
          );

          const metadata = metadataResponse?.data || {};

          return await this._buildTokenData({
            symbol: metadata.symbol || "N/A(Error)",
            name: metadata.name || "N/A(Error)",
            address: tokenAddress,
            description: metadata.name
              ? `${metadata.name} on Solana`
              : "N/A(Error)",

            // Financial data from Jupiter
            price: priceData.price || 0,
            marketCap: priceData.price * (metadata.supply || 0) || 0,
            liquidity: 0, // Jupiter doesn't provide this directly
            volume24h: 0, // Jupiter doesn't provide this directly
            priceChange24h: 0,

            // Token metadata
            isPumpfun: false,
            bondingCurveComplete: false,
            imageUrl: metadata.logoURI || null,

            // Data source info
            source: "jupiter",
          });
        } catch (metaError) {
          // Use price data only if metadata fails
          return await this._buildTokenData({
            symbol: "N/A(Error)",
            name: "N/A(Error)",
            address: tokenAddress,
            description: "N/A(Error)",
            price: priceData.price || 0,
            marketCap: 0,
            liquidity: 0,
            volume24h: 0,
            priceChange24h: 0,
            isPumpfun: false,
            bondingCurveComplete: false,
            imageUrl: null,
            source: "jupiter-price-only",
          });
        }
      }
      return null;
    } catch (error) {
      console.log(`⚠️ Jupiter API failed: ${error.message}`);
      return null;
    }
  }

  async _getDexScreenerData(tokenAddress) {
    try {
      console.log(`🔍 Trying DEXScreener API...`);

      const response = await httpClient.get(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        {
          timeout: 10000,
        },
      );

      const pairs = response?.data?.pairs;
      if (pairs && pairs.length > 0) {
        const mainPair = pairs[0]; // Use first/most liquid pair

        return await this._buildTokenData({
          symbol: mainPair.baseToken?.symbol || "N/A(Error)",
          name: mainPair.baseToken?.name || "N/A(Error)",
          address: tokenAddress,
          description: mainPair.baseToken?.name
            ? `${mainPair.baseToken.name} on Solana`
            : "N/A(Error)",

          // Financial data from DEXScreener
          price: parseFloat(mainPair.priceUsd) || 0,
          marketCap: parseFloat(mainPair.marketCap) || 0,
          liquidity: parseFloat(mainPair.liquidity?.usd) || 0,
          volume24h: parseFloat(mainPair.volume?.h24) || 0,
          priceChange24h: parseFloat(mainPair.priceChange?.h24) || 0,

          // Token metadata
          isPumpfun: mainPair.dexId?.includes("pump") || false,
          bondingCurveComplete: parseFloat(mainPair.marketCap) > 25000,
          imageUrl: mainPair.info?.imageUrl || null,
          dexId: mainPair.dexId || mainPair.chainId || "pumpfun", // Default to pumpfun instead of Unknown

          // Social data
          hasTwitter: !!mainPair.info?.socials?.find(
            (s) => s.type === "twitter",
          ),
          hasTelegram: !!mainPair.info?.socials?.find(
            (s) => s.type === "telegram",
          ),
          hasWebsite: !!mainPair.info?.websites?.length,

          // Data source info
          source: "dexscreener",
        });
      }
      return null;
    } catch (error) {
      console.log(`⚠️ DEXScreener API failed: ${error.message}`);
      return null;
    }
  }

  async _buildTokenData(baseData) {
    // Enrich with pump.fun metadata when available (creator/social/comments)
    try {
      if (
        baseData.isPumpfun ||
        (baseData.address && baseData.address.toLowerCase().endsWith("pump"))
      ) {
        const pumpData = await pumpfunService.getTokenData(baseData.address);
        if (pumpData) {
          baseData.creator = baseData.creator || pumpData.creator || null;
          baseData.createdAt = baseData.createdAt || pumpData.createdAt || null;
          baseData.hasTwitter = baseData.hasTwitter || pumpData.hasTwitter;
          baseData.hasTelegram = baseData.hasTelegram || pumpData.hasTelegram;
          baseData.hasWebsite = baseData.hasWebsite || pumpData.hasWebsite;
          baseData.commentCount = Math.max(
            baseData.commentCount || 0,
            pumpData.commentCount || 0,
          );
          baseData.replies = Math.max(
            baseData.replies || 0,
            pumpData.replies || 0,
          );
        }
      }
    } catch (error) {
      console.log(`⚠️ pump.fun enrichment failed: ${error.message}`);
    }

    // Calculate age if we have creation data
    let ageInHours = null;
    let ageFormatted = "N/A(Error)";
    let createdAt = null;

    if (baseData.createdAt) {
      createdAt = new Date(baseData.createdAt).toISOString();
      ageInHours = TokenUtils.calculateTokenAgeInHours(createdAt);
      ageFormatted = TokenUtils.formatTokenAge(ageInHours);
    }

    // Get real holder data from Solana RPC (no synthetic estimates)
    let realHolderCount = 0;
    let holderCountVerified = false;
    let tokenSupply = { total: 0, decimals: 9 };

    try {
      console.log(`📊 Fetching on-chain data...`);
      realHolderCount = await solanaService.getTokenHolderCount(
        baseData.address,
      );
      tokenSupply = await solanaService.getTokenSupply(baseData.address);

      holderCountVerified = Number.isFinite(realHolderCount);

      console.log(`✅ Final holder count: ${realHolderCount}`);
    } catch (error) {
      console.log(`⚠️ Failed to get on-chain data: ${error.message}`);
      realHolderCount = 0;
      holderCountVerified = false;
    }

    // Extract social data from available metadata
    const socialData = this._extractSocialData(baseData);

    // Enhanced social scoring with extracted social data
    const socialEnhancement = this._enhanceSocialScoring({
      ...baseData,
      ...socialData, // Merge extracted social data
    });

    // Get sniper intelligence
    const sniperIntel = await this._getSniperIntelligence(
      baseData.address,
      baseData,
    );

    // Get real holder distribution from Solana RPC (no synthetic fallback)
    let holderConcentration = 0;
    let topHolderPercent = 0;
    let holderAnalysis = null;
    let topHolderVerified = false;

    try {
      holderAnalysis = await solanaService.getDetailedHolderAnalysis(
        baseData.address,
      );

      if (
        holderAnalysis &&
        holderAnalysis.topHolders &&
        holderAnalysis.topHolders.length > 0
      ) {
        // Use real top 10 concentration from on-chain data
        holderConcentration = Math.min(
          95,
          Math.max(10, Math.floor(holderAnalysis.top10Concentration)),
        );

        // Top holder percentage from the actual top holder
        topHolderPercent = Math.floor(holderAnalysis.topHolders[0].pct);
        topHolderVerified = true;

        console.log(
          `✅ Real concentration: ${holderConcentration}%, Top holder: ${topHolderPercent}%`,
        );
      }
    } catch (error) {
      console.log(`⚠️ Failed to get real holder data: ${error.message}`);
      holderConcentration = 0;
      topHolderPercent = 0;
      topHolderVerified = false;
    }

    const top5Percent = holderAnalysis?.topHolders
      ? holderAnalysis.topHolders
          .slice(0, 5)
          .reduce((sum, holder) => sum + holder.pct, 0)
      : 0;
    const top10Percent =
      holderAnalysis?.top10Concentration || holderConcentration;
    const deployerHolderPercent = holderAnalysis?.topHolders?.length
      ? holderAnalysis.topHolders
          .filter(
            (h) =>
              sniperIntel.deployerAddress &&
              h.owner === sniperIntel.deployerAddress,
          )
          .reduce((sum, holder) => sum + holder.pct, 0)
      : 0;
    const holdersForTop3 = holderAnalysis?.topHolders || [];
    const rawHolders = holderAnalysis?.rawTopHolders || [];
    const offCurveHolders = rawHolders.filter((h) => h.isOnCurve === false);
    const lpLikeHolderPercent = offCurveHolders.length
      ? Math.floor(offCurveHolders[0].pct || 0)
      : 0;
    const offCurveExcludedCount = Number(
      holderAnalysis?.excludedOffCurveHolders || 0,
    );
    const likelyLpAtTop =
      holdersForTop3.length >= 2 &&
      holdersForTop3[0].pct > 15 &&
      holdersForTop3[1].pct < 8;
    const top3ExcludingLpPercent =
      holdersForTop3.length >= 3 && holdersForTop3[0].pct <= 12
        ? Math.floor(
            holdersForTop3
              .slice(0, 3)
              .reduce((sum, holder) => sum + (holder.pct || 0), 0),
          )
        : likelyLpAtTop
          ? Math.floor(
              holdersForTop3
                .slice(1, 4)
                .reduce((sum, holder) => sum + (holder.pct || 0), 0),
            )
          : 0; // Unknown when distribution likely includes LP/program accounts

    const mentionVelocity = baseData.commentCount || 0;
    const organicGrowth = (baseData.volume24h || 0) > 1000;
    const buzzLevel =
      (baseData.volume24h || 0) > 50000
        ? 5
        : Math.max(1, Math.ceil((baseData.volume24h || 0) / 10000));

    // Build complete token data structure (single source of truth)
    return {
      // Basic token info
      symbol: baseData.symbol,
      name: baseData.name,
      address: baseData.address,
      description: baseData.description,

      // Financial data
      marketCap: baseData.marketCap,
      price: baseData.price,
      liquidity: baseData.liquidity,
      volume24h: baseData.volume24h,
      priceChange24h: baseData.priceChange24h,
      source: baseData.source,
      dexId: baseData.dexId || "Unknown",

      // Holder data
      holderCount: realHolderCount,
      holderCountVerified,
      realHolderCount,
      holderConcentration,
      topHolderPercent,
      topHolderVerified,
      deployerHolderPercent: Math.floor(deployerHolderPercent),
      top3ExcludingLpPercent,
      lpLikeHolderPercent,
      offCurveExcludedCount,
      totalSupply: tokenSupply.total,
      decimals: tokenSupply.decimals,
      holderAnalysis,

      // Time data
      createdAt,
      ageInHours,
      ageFormatted,

      // Social data
      hasTwitter: socialData.hasTwitter,
      hasTelegram: socialData.hasTelegram,
      hasWebsite: socialData.hasWebsite,
      commentCount: baseData.commentCount || 0,
      replies: baseData.replies || 0,
      socialScore: socialEnhancement.socialScore,
      engagementRate: socialEnhancement.engagementRate,
      botSuspicion: socialEnhancement.botSuspicion,
      estimatedFollowers: socialEnhancement.estimatedFollowers,
      mentionVelocity,
      organicGrowth,
      buzzLevel,
      suspiciousSocialActivity: false,

      // Risk intel from on-chain analysis
      freshWalletBuys: sniperIntel.freshWalletBuys,
      sameDeployerCount: sniperIntel.sameDeployerCount,
      rugCreatorRisk: sniperIntel.rugCreatorRisk,
      dumpRisk: sniperIntel.dumpRisk,
      buyPressure: sniperIntel.buyPressure,
      botActivity: sniperIntel.botActivity,
      isNewWallet: sniperIntel.isNewWallet,
      hasActiveMintAuthority: sniperIntel.hasActiveMintAuthority,
      walletClustering: sniperIntel.walletClustering,
      deployerAddress: sniperIntel.deployerAddress,

      // Pump.fun specific
      isPumpfun: baseData.isPumpfun || false,
      bondingCurveComplete: baseData.bondingCurveComplete || false,
      showName: baseData.showName || baseData.symbol !== "N/A(Error)",
      creator: baseData.creator || null,
      imageUrl: baseData.imageUrl,

      // Derived structures used by scorer/UI
      socialData: {
        socialScore: socialEnhancement.socialScore,
        mentionVelocity,
        organicGrowth,
        replyCount: baseData.replies || 0,
        commentCount: baseData.commentCount || 0,
        buzzLevel,
        suspiciousSocialActivity: false,
      },
      creatorReputation: {
        reputationScore: 50,
        tokensCreated: Math.max(0, (sniperIntel.sameDeployerCount || 0) - 1),
        successfulTokens: 0,
        suspiciousActivity: false,
        hasHistory: (sniperIntel.sameDeployerCount || 0) > 1,
        walletAge: ageInHours || 0,
      },
      distributionAnalysis: {
        distributionScore: Math.max(0, 100 - Math.floor(holderConcentration)),
        concentrationRisk:
          holderConcentration > 80
            ? "EXTREME"
            : holderConcentration > 60
              ? "HIGH"
              : holderConcentration > 40
                ? "MEDIUM"
                : "LOW",
        topHolderPercent,
        top5Percent: Math.floor(top5Percent),
        top10Percent: Math.floor(top10Percent),
        qualityMetrics: {
          hasHealthyDistribution: holderConcentration < 40,
          hasSuspiciousHolders: holderConcentration > 70,
          whaleCount: holderAnalysis?.topHolders
            ? holderAnalysis.topHolders.filter((h) => h.pct >= 5).length
            : 0,
          smallHolderRatio: holderAnalysis?.topHolders
            ? holderAnalysis.topHolders.filter((h) => h.pct < 1).length /
              Math.max(1, holderAnalysis.topHolders.length)
            : 0,
        },
      },
      dataSources: {
        primary: baseData.source,
        hasJupiterInfo: baseData.source === "jupiter",
        hasSolscanData: false,
      },

      analyzedAt: new Date().toISOString(),
    };
  }

  _calculateSocialScore(data) {
    let score = 0;
    if (data.hasTwitter) score += 25;
    if (data.hasTelegram) score += 25;
    if (data.hasWebsite) score += 15;
    if (data.commentCount) score += Math.min(data.commentCount * 2, 35);
    return Math.min(score, 100);
  }

  // SNIPER INTELLIGENCE METHODS
  async _getSniperIntelligence(tokenAddress, tokenData) {
    try {
      const rpcUrl =
        process.env.SOLANA_RPC_URL ||
        solanaService?.connection?.rpcEndpoint ||
        "";
      const usingPublicRpc = rpcUrl.includes("api.mainnet-beta.solana.com");

      // Public RPC is heavily rate-limited. Avoid multi-call heuristics there.
      if (usingPublicRpc) {
        const mintAuthority =
          await solanaService.checkMintAuthority(tokenAddress);
        return {
          freshWalletBuys: 0,
          sameDeployerCount: 0,
          rugCreatorRisk: false,
          dumpRisk: "UNKNOWN",
          buyPressure: "UNKNOWN",
          botActivity: false,
          isNewWallet: false,
          hasActiveMintAuthority: mintAuthority.hasAuthority,
          walletClustering: false,
          deployerAddress: null,
        };
      }

      const creatorAddress =
        tokenData?.creator && TokenUtils.isValidSolanaAddress(tokenData.creator)
          ? tokenData.creator
          : null;

      if (!creatorAddress) {
        const mintAuthority =
          await solanaService.checkMintAuthority(tokenAddress);
        return {
          freshWalletBuys: 0,
          sameDeployerCount: 0,
          rugCreatorRisk: false,
          dumpRisk: "UNKNOWN",
          buyPressure: "UNKNOWN",
          botActivity: false,
          isNewWallet: false,
          hasActiveMintAuthority: mintAuthority.hasAuthority,
          walletClustering: false,
          deployerAddress: null,
        };
      }

      // Use verified creator wallet for deployer analysis
      const deployerInfo = {
        address: creatorAddress,
        ageDays: 0,
        otherTokensCount: 0,
      };

      let creatorHistory = { tokenCount: 1, isNewWallet: false };
      if (deployerInfo.address) {
        try {
          creatorHistory = await solanaService.analyzeDeployerHistory(
            deployerInfo.address,
          );
        } catch (historyError) {
          console.log(
            `⚠️ Creator history analysis failed: ${historyError.message}`,
          );
        }
      }
      const txPatterns =
        await solanaService.analyzeTransactionPatterns(tokenAddress);
      const mintAuthority =
        await solanaService.checkMintAuthority(tokenAddress);

      const sameDeployerCount = Math.max(
        1,
        creatorHistory.tokenCount || (deployerInfo.otherTokensCount || 0) + 1,
      );
      const isNewWallet =
        creatorHistory.isNewWallet === true ||
        (deployerInfo.ageDays || 9999) < 7;

      return {
        freshWalletBuys: txPatterns.sniperWallets,
        sameDeployerCount,
        rugCreatorRisk: sameDeployerCount > 5 && isNewWallet,
        dumpRisk: txPatterns.suspiciousPatterns ? "HIGH" : "LOW",
        buyPressure: txPatterns.clustering ? "WEAK" : "NORMAL",
        botActivity: txPatterns.suspiciousPatterns,
        isNewWallet,
        hasActiveMintAuthority: mintAuthority.hasAuthority,
        walletClustering: txPatterns.clustering,
        deployerAddress: deployerInfo.address || null,
      };
    } catch (error) {
      console.log("⚠️ Real blockchain analysis failed:", error.message);
      console.log("📊 Using minimal fallback data...");
      return {
        freshWalletBuys: 0,
        sameDeployerCount: 0,
        rugCreatorRisk: false,
        dumpRisk: "UNKNOWN",
        buyPressure: "UNKNOWN",
        botActivity: false,
        isNewWallet: false,
        hasActiveMintAuthority: null,
        walletClustering: false,
        deployerAddress: null,
      };
    }
  }

  _enhanceSocialScoring(tokenData) {
    let socialScore = 0;
    let engagementRate = 0;
    let botSuspicion = 0;

    // Basic social presence (0-40 points)
    if (tokenData.hasTwitter) socialScore += 20;
    if (tokenData.hasTelegram) socialScore += 15;
    if (tokenData.hasWebsite) socialScore += 5;

    // Engagement scoring (0-40 points)
    const comments = tokenData.commentCount || 0;
    if (comments > 100) socialScore += 20;
    else if (comments > 50) socialScore += 15;
    else if (comments > 20) socialScore += 10;
    else if (comments > 5) socialScore += 5;

    // Calculate engagement rate
    const followers = this._estimateFollowers(tokenData);
    if (followers > 0) {
      engagementRate = Math.min((comments / followers) * 100, 10);
      socialScore += engagementRate * 2;
    }

    // Bot suspicion
    if (comments > 0 && followers > 0) {
      const commentToFollowerRatio = comments / followers;
      if (commentToFollowerRatio > 0.5) {
        botSuspicion = 30;
        socialScore -= 30;
      } else if (commentToFollowerRatio > 0.2) {
        botSuspicion = 15;
        socialScore -= 15;
      }
    }

    return {
      socialScore: Math.max(0, Math.min(100, socialScore)),
      engagementRate: engagementRate.toFixed(1),
      botSuspicion,
      estimatedFollowers: followers,
    };
  }

  _estimateFollowers(tokenData) {
    const marketCap = tokenData.marketCap || 0;
    const hasMultipleSocials = [
      tokenData.hasTwitter,
      tokenData.hasTelegram,
      tokenData.hasWebsite,
    ].filter(Boolean).length;

    let baseFollowers = Math.sqrt(marketCap) * 2;
    baseFollowers *= hasMultipleSocials;

    return Math.floor(baseFollowers);
  }

  // Keep this method for backwards compatibility but make it call the new DEX method
  async getTokenAnalytics(tokenAddress) {
    return this.getTokenData(tokenAddress);
  }

  _extractSocialData(tokenData) {
    // Extract social presence from available data
    let hasTwitter = false;
    let hasTelegram = false;
    let hasWebsite = false;

    // Check direct properties first (from PumpFun API)
    if (tokenData.hasTwitter || tokenData.twitter) hasTwitter = true;
    if (tokenData.hasTelegram || tokenData.telegram) hasTelegram = true;
    if (tokenData.hasWebsite || tokenData.website) hasWebsite = true;

    // Check nested social object
    if (tokenData.social) {
      if (tokenData.social.twitter) hasTwitter = true;
      if (tokenData.social.telegram) hasTelegram = true;
      if (tokenData.social.website) hasWebsite = true;
    }

    // Fallback: scan description for social links
    const description = tokenData.description || "";
    if (
      description.toLowerCase().includes("twitter.com") ||
      description.toLowerCase().includes("x.com")
    ) {
      hasTwitter = true;
    }
    if (
      description.toLowerCase().includes("t.me/") ||
      description.toLowerCase().includes("telegram")
    ) {
      hasTelegram = true;
    }
    if (description.match(/https?:\/\//)) {
      hasWebsite = true;
    }

    return {
      hasTwitter,
      hasTelegram,
      hasWebsite,
    };
  }

  _calculateRealisticConcentration(holderCount, marketCap, volume24h) {
    // Realistic concentration calculation based on market patterns
    if (holderCount === 0) return 95; // No holders = maximum concentration

    // Base concentration depends on holder count (more holders = lower concentration)
    let baseConcentration;
    if (holderCount < 10) {
      baseConcentration = 85; // Very few holders = high concentration
    } else if (holderCount < 50) {
      baseConcentration = 70; // Small holder base
    } else if (holderCount < 200) {
      baseConcentration = 50; // Medium distribution
    } else if (holderCount < 1000) {
      baseConcentration = 35; // Good distribution
    } else {
      baseConcentration = 25; // Wide distribution
    }

    // Adjust based on market cap (higher MC usually means better distribution)
    if (marketCap > 1000000) {
      baseConcentration -= 10; // Large cap = better distribution
    } else if (marketCap < 10000) {
      baseConcentration += 15; // Very small cap = concentrated
    }

    // Adjust based on trading activity (higher volume = more distributed)
    const volumeRatio = marketCap > 0 ? (volume24h || 0) / marketCap : 0;
    if (volumeRatio > 0.5) {
      baseConcentration -= 5; // High volume ratio = active trading
    } else if (volumeRatio < 0.05) {
      baseConcentration += 10; // Low volume = likely concentrated
    }

    // Ensure realistic bounds (10-95%)
    return Math.min(95, Math.max(10, Math.floor(baseConcentration)));
  }
}

export default new DataFetcher();
