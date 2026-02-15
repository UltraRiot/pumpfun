class TrustScorer {
  constructor() {
    console.log("🟢 Trust Scorer initialized");
  }

  // Enhanced trust score calculation with pump.fun data (0-150)
  calculateTrustScore(tokenData) {
    let score = 30; // Base score for new tokens
    // Liquidity analysis (35 points max)
    if (tokenData.liquidity) {
      if (tokenData.liquidity > 50000) score += 35;
      else if (tokenData.liquidity > 20000) score += 25;
      else if (tokenData.liquidity > 10000) score += 15;
      else if (tokenData.liquidity > 5000) score += 10;
      else if (tokenData.liquidity > 1000) score += 5;
      else score -= 10; // Penalty for very low liquidity
    } else {
      score -= 15; // No liquidity data penalty
    }

    // Enhanced holder distribution analysis (25 points max) - UPDATED
    if (tokenData.distributionAnalysis) {
      const dist = tokenData.distributionAnalysis;

      // Base distribution scoring
      if (dist.distributionScore > 80) {
        score += 25; // Excellent distribution
      } else if (dist.distributionScore > 60) {
        score += 20; // Good distribution
      } else if (dist.distributionScore > 40) {
        score += 10; // Average distribution
      } else {
        score -= 5; // Poor distribution (reduced penalty)
      }

      // Apply only the worst penalty to avoid double penalization
      if (dist.concentrationRisk === "EXTREME") {
        score -= 20; // Major penalty (reduced)
        console.log(
          `⚠️ EXTREME holder concentration: ${dist.topHolderPercent}%`,
        );
      } else if (dist.concentrationRisk === "HIGH") {
        score -= 10; // High penalty (reduced)
      } else if (dist.qualityMetrics?.hasSuspiciousHolders) {
        score -= 8; // Bot/suspicious holders penalty (only if no concentration risk)
        console.log("⚠️ Suspicious holder patterns detected");
      }

      // Healthy distribution bonus
      if (dist.qualityMetrics?.hasHealthyDistribution) {
        score += 10; // Bonus for good distribution
        console.log(`🎆 Healthy holder distribution detected`);
      }

      console.log(
        `👥 Distribution impact: ${dist.distributionScore} score, ${dist.concentrationRisk} risk`,
      );
    } else {
      // Fallback to simple holder count scoring if distribution analysis unavailable
      if (tokenData.holderCount) {
        if (tokenData.holderCount > 2000) score += 25;
        else if (tokenData.holderCount > 1000) score += 20;
        else if (tokenData.holderCount > 500) score += 15;
        else if (tokenData.holderCount > 100) score += 10;
        else if (tokenData.holderCount > 50) score += 5;
        else score -= 5; // Very few holders penalty
      }
    }

    // Enhanced social media presence with mention velocity (30 points max) - UPDATED
    if (tokenData.socialScore !== undefined) {
      const clampedSocial = Math.max(0, Math.min(100, tokenData.socialScore));
      score += Math.floor(clampedSocial * 0.3); // Base social score (0-30 points)
    }

    // Social mention velocity assessment (20 points max) - NEW
    if (tokenData.mentionVelocity !== undefined) {
      if (tokenData.suspiciousSocialActivity) {
        score -= 20; // Artificial/bot mentions - major penalty
        console.log("⚠️ Suspicious social activity detected");
      } else if (tokenData.mentionVelocity > 50) {
        score += 15; // High organic mention velocity - bonus
        console.log(
          `🚀 High organic social velocity: ${tokenData.mentionVelocity}`,
        );
      } else if (tokenData.mentionVelocity > 20) {
        score += 10; // Moderate mention velocity - good
      } else if (tokenData.mentionVelocity > 5) {
        score += 5; // Some mention velocity - okay
      }
    }

    // Organic growth bonus (10 points max) - NEW
    if (tokenData.organicGrowth === false) {
      score -= 15; // Non-organic growth penalty
    } else if (tokenData.buzzLevel && tokenData.buzzLevel > 20) {
      score += 10; // High buzz level bonus
    }

    // Community engagement bonus (NEW - 15 points max)
    if (tokenData.replies) {
      if (tokenData.replies > 100) score += 15;
      else if (tokenData.replies > 50) score += 10;
      else if (tokenData.replies > 10) score += 5;
    }

    // Pump.fun specific bonuses (NEW)
    if (tokenData.isPumpfun) {
      if (tokenData.bondingCurveComplete) score += 20; // Graduated to Raydium
      if (tokenData.creator) score += 5; // Has identifiable creator
      if (tokenData.description && tokenData.description.length > 100)
        score += 10;
    }

    // Volume activity + turnover quality
    if (tokenData.volume24h) {
      if (tokenData.volume24h > 100000) score += 20;
      else if (tokenData.volume24h > 50000) score += 15;
      else if (tokenData.volume24h > 20000) score += 10;
      else if (tokenData.volume24h > 5000) score += 5;
      else score -= 5;

      if (tokenData.marketCap && tokenData.marketCap > 0) {
        const turnover = tokenData.volume24h / tokenData.marketCap;
        if (turnover < 0.03) score -= 6;
        else if (turnover < 0.08) score -= 3;
        else if (turnover > 0.25) score += 4;
      }
    } else {
      score -= 10;
    }

    // Age factor (15 points max) - More realistic for pump.fun
    if (tokenData.ageInHours !== undefined) {
      if (tokenData.ageInHours > 720)
        score += 15; // > 1 month
      else if (tokenData.ageInHours > 168)
        score += 10; // > 1 week
      else if (tokenData.ageInHours > 72)
        score += 5; // > 3 days
      else if (tokenData.ageInHours < 1)
        score -= 20; // Less than 1 hour - MAJOR penalty
      else if (tokenData.ageInHours < 6)
        score -= 15; // Less than 6 hours - HIGH penalty
      else if (tokenData.ageInHours < 24) score -= 10; // Less than 1 day - penalty
    }

    // Volatility assessment (15 points max) - NEW (adjusted thresholds)
    if (tokenData.volatilityScore !== undefined) {
      if (tokenData.volatilityScore > 300)
        score -= 15; // Extremely volatile - MAJOR penalty (reduced)
      else if (tokenData.volatilityScore > 150)
        score -= 10; // Very volatile - HIGH penalty (reduced)
      else if (tokenData.volatilityScore > 80)
        score -= 3; // Moderate volatility - small penalty (adjusted threshold)
      else if (tokenData.volatilityScore < 10)
        score += 15; // Very stable
      else if (tokenData.volatilityScore < 20) score += 10; // Stable price - bonus

      console.log(
        `📊 Volatility impact: ${tokenData.volatilityScore}% volatility`,
      );
    }

    // Creator reputation assessment (20 points max) - NEW (balanced penalties)
    if (tokenData.creatorReputation) {
      const rep = tokenData.creatorReputation;

      // Apply creator penalties more fairly - avoid stacking
      if (rep.suspiciousActivity && rep.tokensCreated > 5) {
        score -= 12; // Combined penalty for suspicious + many tokens
        console.log("⚠️ Suspicious creator with multiple tokens detected");
      } else if (rep.suspiciousActivity) {
        score -= 8; // Reduced suspicious creator penalty
        console.log("⚠️ Suspicious creator detected");
      } else if (rep.tokensCreated > 8) {
        score -= 8; // Too many tokens = potential scammer (higher threshold)
        console.log(
          `⚠️ Creator has launched ${rep.tokensCreated} tokens (suspicious)`,
        );
      }

      if (rep.successfulTokens > 0) {
        score += Math.min(rep.successfulTokens * 3, 15); // Max 15 points for track record
        console.log(`🎆 Creator has ${rep.successfulTokens} successful tokens`);
      }

      if (rep.walletAge > 90) {
        score += 5; // Established wallet bonus
      } else if (rep.walletAge < 3) {
        score -= 5; // Very new wallet penalty (reduced and higher threshold)
      }

      console.log(`🕵️ Creator reputation impact: ${rep.reputationScore} score`);
    }

    // Major red flags (heavy penalties) - skip if distribution analysis already handled concentration
    if (!tokenData.distributionAnalysis) {
      if (tokenData.topHolderPercent > 70)
        score -= 30; // Extreme concentration
      else if (tokenData.topHolderPercent > 50) score -= 20;
      else if (tokenData.topHolderPercent > 30) score -= 10;
    }

    // Market cap reality check (adjusted thresholds)
    if (tokenData.marketCap) {
      if (tokenData.marketCap < 5000)
        score -= 5; // Very small market cap (reduced penalty, lower threshold)
      else if (tokenData.marketCap > 1000000) score += 10; // Established size
    }

    // Price stability (if available) - adjusted thresholds
    if (tokenData.priceChange24h !== undefined) {
      const absChange = Math.abs(tokenData.priceChange24h);
      if (absChange > 500)
        score -= 12; // Extreme volatility (higher threshold, reduced penalty)
      else if (absChange > 200)
        score -= 8; // High volatility (higher threshold, reduced penalty)
      else if (absChange < 15) score += 5; // Stable price
    }

    // Reduced new token penalties
    if (tokenData.isNewToken) score -= 8; // Reduced from -15
    if (tokenData.hasLowLiquidity) score -= 5; // Reduced from -10

    // Simple hard guardrails for critical red flags
    const top3Users = Number(tokenData.top3ExcludingLpPercent || 0);
    const mintAuthorityActive = tokenData.hasActiveMintAuthority === true;
    const serialDeployer = Number(tokenData.sameDeployerCount || 0) > 1;

    if (mintAuthorityActive && top3Users >= 35) {
      // Prevent very high trust when core rug controls are weak
      score = Math.min(score, 72);
    } else if (mintAuthorityActive && serialDeployer) {
      score = Math.min(score, 82);
    }

    // Return enhanced score with minimum floor (0-150 range, converted to 0-100 for display)
    const finalScore = Math.max(5, score); // Minimum score of 5 for functioning tokens
    const scaledScore = Math.min(100, Math.floor((finalScore * 100) / 150)); // Scale to 0-100

    // Additional safety: ensure reasonable minimum for tokens with basic functionality
    if (
      scaledScore < 10 &&
      tokenData.liquidity > 1000 &&
      tokenData.holderCount > 5
    ) {
      return 10; // Minimum 10 for tokens with basic liquidity and holders
    }

    return scaledScore;
  }

  // Enhanced risk level based on trust score
  getRiskLevel(trustScore) {
    if (trustScore >= 85) return "VERY LOW";
    if (trustScore >= 70) return "LOW";
    if (trustScore >= 50) return "MEDIUM";
    if (trustScore >= 40) return "HIGH";
    return "VERY HIGH";
  }

  // Generate detailed report with real data
  generateReport(tokenData) {
    const trustScore = this.calculateTrustScore(tokenData);
    const riskLevel = this.getRiskLevel(trustScore);

    return {
      trustScore,
      riskLevel,
      ageInHours: tokenData.ageInHours || 0, // Add at top level for frontend
      holderContext: {
        topHolderPercent: tokenData.topHolderPercent || 0,
        top3ExcludingLpPercent: tokenData.top3ExcludingLpPercent || 0,
        lpLikeHolderPercent: tokenData.lpLikeHolderPercent || 0,
        offCurveExcludedCount: tokenData.offCurveExcludedCount || 0,
      },
      tokenInfo: {
        symbol: tokenData.symbol || "UNKNOWN",
        name: tokenData.name || "Unknown Token",
        address: tokenData.address,
        price: tokenData.price || 0,
        marketCap: tokenData.marketCap || 0,
        dexId: tokenData.dexId,
        creator: tokenData.creator || null,
        imageUrl: tokenData.imageUrl || null,
      },
      breakdown: {
        liquidity: tokenData.liquidity || 0,
        holders: tokenData.holderCount || 0,
        volume24h: tokenData.volume24h || 0,
        age: tokenData.ageInHours || 0,
        topHolderPercent: tokenData.topHolderPercent || 0,
        priceChange24h: tokenData.priceChange24h || 0,
        volatilityScore: tokenData.volatilityScore || 0,
      },
      // Enhanced social and community data
      socialData: {
        socialScore: tokenData.socialScore || 0,
        mentionVelocity: tokenData.mentionVelocity || 0,
        organicGrowth: tokenData.organicGrowth !== false,
        buzzLevel: tokenData.buzzLevel || 0,
        hasTwitter: tokenData.hasTwitter || false,
        hasTelegram: tokenData.hasTelegram || false,
        hasWebsite: tokenData.hasWebsite || false,
        replies: tokenData.replies || 0,
        description: tokenData.description || "",
        suspiciousSocialActivity: tokenData.suspiciousSocialActivity || false,
      },
      // Creator reputation data (NEW)
      creatorData: {
        reputationScore: tokenData.creatorReputation?.reputationScore || 0,
        tokensCreated: tokenData.creatorReputation?.tokensCreated || 0,
        successfulTokens: tokenData.creatorReputation?.successfulTokens || 0,
        suspiciousActivity:
          tokenData.creatorReputation?.suspiciousActivity || false,
        hasHistory: tokenData.creatorReputation?.hasHistory || false,
        walletAge: tokenData.creatorReputation?.walletAge || 0,
      },
      // Enhanced holder distribution data (NEW)
      distributionData: {
        distributionScore:
          tokenData.distributionAnalysis?.distributionScore || 0,
        concentrationRisk:
          tokenData.distributionAnalysis?.concentrationRisk || "UNKNOWN",
        topHolderPercent:
          tokenData.distributionAnalysis?.topHolderPercent ||
          tokenData.topHolderPercent ||
          0,
        top5Percent: tokenData.distributionAnalysis?.top5Percent || 0,
        top10Percent: tokenData.distributionAnalysis?.top10Percent || 0,
        hasHealthyDistribution:
          tokenData.distributionAnalysis?.qualityMetrics
            ?.hasHealthyDistribution || false,
        hasSuspiciousHolders:
          tokenData.distributionAnalysis?.qualityMetrics
            ?.hasSuspiciousHolders || false,
        whaleCount:
          tokenData.distributionAnalysis?.qualityMetrics?.whaleCount || 0,
        smallHolderRatio:
          tokenData.distributionAnalysis?.qualityMetrics?.smallHolderRatio || 0,
      },
      riskFactors: {
        isNewToken: tokenData.isNewToken || false,
        hasLowLiquidity: tokenData.hasLowLiquidity || false,
        hasHighTopHolder: tokenData.hasHighTopHolder || false,
        extremeVolatility: Math.abs(tokenData.priceChange24h || 0) > 200,
        bondingCurveComplete: tokenData.bondingCurveComplete || false,
        hasSuspiciousCreator: tokenData.hasSuspiciousCreator || false,
        suspiciousSocialActivity: tokenData.suspiciousSocialActivity || false,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export default new TrustScorer();
