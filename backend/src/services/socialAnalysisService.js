import {
  MEME_PATTERNS,
  SOCIAL_SCORING,
  TOKEN_CONSTANTS,
} from "../config/constants.js";
import TokenUtils from "../utils/tokenUtils.js";
import dexScreenerService from "./dexScreenerService.js";

class SocialAnalysisService {
  async calculateSocialMentionVelocity(data, tokenAddress) {
    try {
      console.log(`📱 Analyzing social velocity for: ${tokenAddress}`);

      const baseScore = this._calculateBaseSocialScore(data);
      const { replyCount, velocity, organicGrowth } =
        this._analyzeCommentVelocity(data);
      const recentActivity = Math.min(
        SOCIAL_SCORING.MAX_RECENT_ACTIVITY,
        replyCount * 2,
      );
      const buzzData = await this._estimateSocialBuzz(
        tokenAddress,
        data.symbol,
      );

      const finalScore = {
        socialScore: Math.min(100, baseScore + recentActivity),
        mentionVelocity: velocity,
        organicGrowth,
        replyCount,
        commentCount: replyCount,
        buzzLevel: buzzData.level,
        suspiciousSocialActivity: velocity > 80 && !organicGrowth,
      };

      console.log(`📱 Social analysis complete:`, finalScore);
      return finalScore;
    } catch (error) {
      console.log("⚠️ Error calculating social velocity:", error.message);
      return this._getDefaultSocialData();
    }
  }

  async getCreatorReputation(creatorAddress) {
    if (!creatorAddress) {
      return this._getDefaultCreatorReputation();
    }

    try {
      console.log(`🕵️ Checking creator reputation: ${creatorAddress}`);

      let reputationScore = 30; // Base score
      let tokensCreated = 1;
      let successfulTokens = 0;
      let suspiciousActivity = false;

      const addressAge = this._estimateWalletAge(creatorAddress);
      if (addressAge < 7) {
        suspiciousActivity = true;
        reputationScore -= 15;
      } else if (addressAge > 90) {
        reputationScore += 10;
      }

      // Get creator's other tokens from DexScreener
      const creatorPairs =
        await dexScreenerService.searchCreator(creatorAddress);

      if (creatorPairs.length > 0) {
        tokensCreated = Math.min(creatorPairs.length + 1, 10);

        successfulTokens = creatorPairs.filter((pair) => {
          const mcap = parseFloat(pair.marketCap) || 0;
          return mcap > TOKEN_CONSTANTS.MARKET_CAP.SUCCESSFUL_TOKEN;
        }).length;

        if (successfulTokens > 0) {
          reputationScore += Math.min(successfulTokens * 5, 20);
        }

        if (tokensCreated > 5) {
          suspiciousActivity = true;
          reputationScore -= 10;
        }
      }

      console.log(
        `🎯 Creator reputation: ${reputationScore} points, ${tokensCreated} tokens created`,
      );

      return {
        reputationScore: Math.max(0, Math.min(100, reputationScore)),
        tokensCreated,
        successfulTokens,
        suspiciousActivity,
        hasHistory: tokensCreated > 1,
        walletAge: addressAge,
      };
    } catch (error) {
      console.log("⚠️ Error checking creator reputation:", error.message);
      return this._getDefaultCreatorReputation();
    }
  }

  _calculateBaseSocialScore(data) {
    let baseScore = 0;

    if (data.twitter) baseScore += SOCIAL_SCORING.TWITTER;
    if (data.telegram) baseScore += SOCIAL_SCORING.TELEGRAM;
    if (data.website) baseScore += SOCIAL_SCORING.WEBSITE;
    if (data.description && data.description.length > 50) {
      baseScore += SOCIAL_SCORING.DESCRIPTION;
    }

    return baseScore;
  }

  _analyzeCommentVelocity(data) {
    const replyCount = parseInt(
      data.reply_count ||
        data.replies ||
        data.comment_count ||
        data.comments ||
        data.total_replies ||
        0,
    );

    console.log(`💬 Comments found: ${replyCount}`);

    if (replyCount === 0) {
      return { replyCount: 0, velocity: 0, organicGrowth: true };
    }

    const tokenAgeHours = TokenUtils.estimateTokenAge(data);
    const repliesPerHour = tokenAgeHours > 0 ? replyCount / tokenAgeHours : 0;

    const { HIGH_VELOCITY, MODERATE_VELOCITY, LOW_VELOCITY, MINIMAL_VELOCITY } =
      TOKEN_CONSTANTS.SOCIAL_THRESHOLDS;

    let velocity = 0;
    let organicGrowth = true;

    if (repliesPerHour > HIGH_VELOCITY) {
      velocity = 100;
      organicGrowth = false;
    } else if (repliesPerHour > MODERATE_VELOCITY) {
      velocity = 70;
    } else if (repliesPerHour > LOW_VELOCITY) {
      velocity = 40;
    } else if (repliesPerHour > MINIMAL_VELOCITY) {
      velocity = 20;
    }

    console.log(
      `📱 Social velocity: ${repliesPerHour.toFixed(2)} replies/hour, velocity: ${velocity}`,
    );

    return { replyCount, velocity, organicGrowth };
  }

  async _estimateSocialBuzz(tokenAddress, symbol) {
    try {
      let buzzLevel = 0;

      if (symbol && symbol.length <= 6) {
        buzzLevel += 10;
      }

      const symbolLower = (symbol || "").toLowerCase();
      for (const pattern of MEME_PATTERNS) {
        if (symbolLower.includes(pattern)) {
          buzzLevel += 15;
          break;
        }
      }

      return {
        level: Math.min(50, buzzLevel),
        isMemeToken: buzzLevel > 10,
      };
    } catch (error) {
      return { level: 0, isMemeToken: false };
    }
  }

  _estimateWalletAge(address) {
    if (!address || address.length < 40) return 0;

    const randomness = this._calculateAddressRandomness(address);
    const estimatedDays = Math.max(1, Math.floor((100 - randomness) * 3.65));

    return estimatedDays;
  }

  _calculateAddressRandomness(address) {
    let randomness = 0;
    const chars = address.toLowerCase();

    for (let i = 0; i < chars.length - 1; i++) {
      if (chars[i] === chars[i + 1]) randomness += 1;
      if ("0123456789".includes(chars[i])) randomness += 0.5;
    }

    return Math.min(100, randomness);
  }

  _getDefaultSocialData() {
    return {
      socialScore: 15,
      mentionVelocity: 0,
      organicGrowth: true,
      replyCount: 0,
      commentCount: 0,
      buzzLevel: 0,
      suspiciousSocialActivity: false,
    };
  }

  _getDefaultCreatorReputation() {
    return {
      reputationScore: 0,
      tokensCreated: 0,
      successfulTokens: 0,
      suspiciousActivity: true,
      hasHistory: false,
      walletAge: 0,
    };
  }
}

export default new SocialAnalysisService();
