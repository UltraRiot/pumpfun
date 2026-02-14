import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

class AIAnalysisService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.log("⚠️  OpenAI API key not found - AI analysis disabled");
      this.enabled = false;
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.enabled = true;
      console.log("🤖 AI Analysis Service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize OpenAI:", error.message);
      this.enabled = false;
    }
  }

  async analyzeToken(tokenData, trustScore, riskLevel) {
    if (!this.enabled) {
      return {
        aiAnalysis: "AI analysis unavailable",
        riskExplanation: `Token has ${riskLevel} risk based on standard metrics`,
        recommendation: "Do your own research before investing",
      };
    }

    try {
      const prompt = this.createAnalysisPrompt(
        tokenData,
        trustScore,
        riskLevel,
      );

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Use the cheaper but capable model
        messages: [
          {
            role: "system",
            content:
              "You are a professional cryptocurrency analyst. Provide clear, accurate, and unbiased analysis of token metrics. Always include risks and never give financial advice.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      const analysis = completion.choices[0]?.message?.content;
      return this.parseAIResponse(analysis, tokenData, trustScore);
    } catch (error) {
      console.error("❌ OpenAI API error:", error.message);
      return {
        aiAnalysis: "AI analysis temporarily unavailable",
        riskExplanation: `Token has ${riskLevel} risk based on standard metrics`,
        recommendation:
          "Technical analysis suggests reviewing market conditions carefully",
      };
    }
  }

  createAnalysisPrompt(tokenData, trustScore, riskLevel) {
    const {
      symbol,
      name,
      marketCap,
      volume24h,
      liquidity,
      hasTwitter,
      hasTelegram,
      hasWebsite,
      realHolderCount,
      holderConcentration,
      totalSupply,
      ageFormatted,
      commentCount,
      socialScore,
      isNewWallet,
      sameDeployerCount,
      rugCreatorRisk,
      freshWalletBuys,
      botActivity,
      dumpRisk,
      buyPressure,
      hasActiveMintAuthority,
      walletClustering,
    } = tokenData;

    const holderRatio =
      marketCap > 0 ? (realHolderCount || 0) / (marketCap / 1000) : 0;
    const volumeRatio = marketCap > 0 ? volume24h / marketCap : 0;
    const topHolderConc = holderConcentration || 0; // This is top 10 concentration
    const actualTopHolder = tokenData.topHolderPercent || 0; // This is the actual top holder
    const isFreshToken =
      ageFormatted && ageFormatted.includes("h") && parseInt(ageFormatted) < 24;
    const hasWeakSocials = !hasTwitter && !hasTelegram && !hasWebsite;
    const hasHighBotActivity = botActivity === true;
    const isSerialRugger = (sameDeployerCount || 0) > 3;
    const hasRugHistory = rugCreatorRisk === true;
    const hasSniper = (freshWalletBuys || 0) > 30;
    // Basic liquidity lock heuristic - tokens with high liquidity relative to market cap likely have some lock
    const liquidityRatio = marketCap > 0 ? (liquidity || 0) / marketCap : 0;
    const likelyHasLiquidityLock = liquidityRatio > 0.15; // 15%+ liquidity suggests some locking

    // Get holder analysis for real top 3 calculation
    const holderAnalysis = tokenData.holderAnalysis || null;

    return `PUMPFUN RISK ENGINE - ${symbol}

Analyze this token and provide ONLY:

1. RUG_PROBABILITY: [percentage 0-99]% [risk level: LOW/MEDIUM/HIGH]

2. KEY_THREATS (max 6 bullets, each = one danger):
- Format: "Threat description"
- Use these indicators when present:
  * Dev wallet owns ${actualTopHolder}% of supply${!likelyHasLiquidityLock ? "\n  * LP not locked/removable" : ""}
  * ${hasActiveMintAuthority ? "Mint authority still active" : ""}
  * ${sameDeployerCount > 1 ? `${sameDeployerCount} tokens from same deployer${isSerialRugger ? " (serial rugger)" : ""}` : ""}
  * ${freshWalletBuys > 0 ? `${freshWalletBuys} sniper wallets detected${hasSniper ? " (high)" : ""}` : ""}
  * ${actualTopHolder && holderAnalysis?.topHolders?.length >= 3 ? `Top 3 holders control ${Math.floor(holderAnalysis.topHolders[0].pct + holderAnalysis.topHolders[1].pct + holderAnalysis.topHolders[2].pct)}%` : ""}
  * Social presence ${hasWeakSocials ? "minimal/fake" : "established"}
  * ${isNewWallet ? "Fresh deployer (new wallet)" : ""}
  * ${walletClustering ? "Wallet clustering detected" : ""}
  * ${hasHighBotActivity ? "High bot activity detected" : ""}

3. TRADER_NOTE (max 2 lines, short conclusion, not advice):
- Format: "Assessment. Risk level."

DATA CONTEXT:
- Top 10 holder concentration: ${topHolderConc}%
- Actual top holder: ${actualTopHolder}%
- Liquidity ratio: ${Math.floor(liquidityRatio * 100)}% (${likelyHasLiquidityLock ? "likely locked" : "unlocked"})
- Same deployer tokens: ${sameDeployerCount || 0} (REAL on-chain data)
- Sniper wallets: ${freshWalletBuys || 0} (REAL transaction analysis)
- Mint authority: ${hasActiveMintAuthority ? "ACTIVE" : "DISABLED"} (REAL on-chain check)
- Wallet clustering: ${walletClustering ? "DETECTED" : "NONE"} (REAL pattern analysis)
- Fresh deployer: ${isNewWallet ? "YES" : "NO"} (REAL wallet age analysis)
- Social score: ${socialScore || 0}/100
- Age: ${ageFormatted || "Unknown"}
- Rug creator risk: ${rugCreatorRisk ? "YES" : "NO"}
- Bot activity: ${hasHighBotActivity ? "HIGH" : "NORMAL"}
- Socials: Twitter=${hasTwitter}, Telegram=${hasTelegram}, Website=${hasWebsite}

OUTPUT EXACTLY THIS FORMAT:

RUG_PROBABILITY: [X]% [LEVEL]

KEY_THREATS:
- [Threat 1]
- [Threat 2]
- [Threat 3]
- [Threat 4]
- [Threat 5]
- [Threat 6]

TRADER_NOTE:
[Line 1 assessment]
[Line 2 risk level]`;
  }

  parseAIResponse(response, tokenData = {}, trustScore = null) {
    const sections = {
      rugProbability: "",
      rugLevel: "MEDIUM",
      keyThreats: [],
      positiveSignals: [],
      traderNote: "",
    };

    try {
      // Build truthful threats from validated fields (no model invention)
      sections.keyThreats = this._buildDeterministicThreats(tokenData);
      sections.positiveSignals = this._buildDeterministicPositives(tokenData);

      // Build deterministic rug score to avoid contradiction with threat bullets
      const deterministicRisk = this._buildDeterministicRugSignal(
        tokenData,
        trustScore,
        sections,
      );
      sections.rugProbability = deterministicRisk.rugProbability;
      sections.rugLevel = deterministicRisk.rugLevel;

      const hasOnlyNoThreatFlag =
        sections.keyThreats.length === 1 &&
        sections.keyThreats[0] ===
          "No material threat signals detected from available data";
      if (hasOnlyNoThreatFlag && sections.rugLevel !== "LOW") {
        sections.keyThreats = [
          "No material threat signals detected from available data",
          "Market-structure risk remains elevated (liquidity/volatility conditions)",
        ];
      }

      // Build trader note from validated metrics to avoid AI-invented claims
      sections.traderNote = this._buildDeterministicTraderNote(
        tokenData,
        sections,
      );

      // Set visual indicator based on rug level
      if (sections.rugLevel === "LOW") {
        sections.visualIndicator = "RESEARCH";
        sections.indicatorColor = "#00FF00";
      } else if (sections.rugLevel === "MEDIUM") {
        sections.visualIndicator = "CAUTION";
        sections.indicatorColor = "#FFA500";
      } else {
        sections.visualIndicator = "RUN";
        sections.indicatorColor = "#FF0000";
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      sections.rugProbability = "85%";
      sections.rugLevel = "HIGH";
      sections.keyThreats = [
        "Analysis failed",
        "Data unavailable, risk increased",
      ];
      sections.positiveSignals = [];
      sections.traderNote = "System error. Extreme caution advised.";
      sections.visualIndicator = "RUN";
      sections.indicatorColor = "#FF0000";
    }

    return sections;
  }

  _buildDeterministicThreats(tokenData) {
    const threats = [];

    const deployerHolder = Number(tokenData.deployerHolderPercent || 0);
    if (deployerHolder > 0) {
      threats.push(`Dev wallet owns ${Math.floor(deployerHolder)}% of supply`);
    }

    if (tokenData.hasActiveMintAuthority === true) {
      threats.push("Mint authority still active");
    }

    const sameDeployerCount = Number(tokenData.sameDeployerCount || 0);
    if (sameDeployerCount > 1) {
      threats.push(`${sameDeployerCount} tokens from same deployer`);
    }

    const sniperWallets = Number(tokenData.freshWalletBuys || 0);
    if (sniperWallets >= 25) {
      threats.push(`${sniperWallets} sniper wallets detected`);
    }

    const top3ExLp = Number(tokenData.top3ExcludingLpPercent || 0);
    if (top3ExLp >= 20) {
      threats.push(`Top 3 holders control ${top3ExLp}%`);
    }

    if (tokenData.isNewWallet === true) {
      threats.push("Fresh deployer (new wallet)");
    }

    if (tokenData.walletClustering === true && sniperWallets >= 25) {
      threats.push("Wallet clustering detected");
    }

    // Simple market-structure risks (non on-chain attribution)
    const marketCap = Number(tokenData.marketCap || 0);
    const volume24h = Number(tokenData.volume24h || 0);
    if (marketCap > 0 && marketCap < 5000) {
      threats.push(
        `Micro-cap size ($${Math.floor(marketCap)}) increases manipulation risk`,
      );
    } else if (marketCap > 0 && marketCap < 50000) {
      threats.push(
        `Small-cap size ($${Math.floor(marketCap)}) has elevated volatility risk`,
      );
    }

    if (marketCap > 0 && volume24h >= 0 && volume24h < 100) {
      threats.push(
        `Very thin 24h trading activity ($${Math.floor(volume24h)}) raises exit/liquidity risk`,
      );
    }

    const volumeToMcRatio = marketCap > 0 ? volume24h / marketCap : 0;
    if (marketCap > 0 && volumeToMcRatio > 0 && volumeToMcRatio < 0.08) {
      threats.push(
        `Low 24h turnover (${Math.floor(volumeToMcRatio * 100)}% of market cap) can reduce exit liquidity`,
      );
    }

    const priceChange24h = Number(tokenData.priceChange24h || 0);
    if (priceChange24h <= -40) {
      threats.push(`Severe 24h drawdown (${Math.floor(priceChange24h)}%)`);
    }

    const ageInHours = Number(tokenData.ageInHours || 0);
    if (ageInHours > 0 && ageInHours < 6) {
      threats.push("Very new token (early lifecycle risk)");
    }

    const lpLikeHolderPercent = Number(tokenData.lpLikeHolderPercent || 0);
    const top3Users = Number(tokenData.top3ExcludingLpPercent || 0);
    if (lpLikeHolderPercent >= 85 && top3Users <= 2) {
      threats.push(
        `Pool/vault dominates supply (~${lpLikeHolderPercent}%), user holder distribution is very thin`,
      );
    }
    if (lpLikeHolderPercent >= 95) {
      threats.push("Very early curve stage (most supply still in pool/vault)");
    }

    const rawTopHolderPct = Number(
      tokenData.holderAnalysis?.rawTopHolders?.[0]?.pct || 0,
    );
    const filteredTopHolderPct = Number(tokenData.topHolderPercent || 0);
    if (rawTopHolderPct >= 25 && filteredTopHolderPct < 20) {
      threats.push(
        `Largest raw holder/vault controls ~${Math.floor(rawTopHolderPct)}% of supply`,
      );
    }

    if (threats.length === 0) {
      threats.push("No material threat signals detected from available data");
    }

    return threats.slice(0, 6);
  }

  _buildDeterministicPositives(tokenData) {
    const positives = [];

    if (tokenData.hasActiveMintAuthority === false) {
      positives.push("Mint authority disabled");
    }

    const top3ExLp = Number(tokenData.top3ExcludingLpPercent || 0);
    if (top3ExLp > 0 && top3ExLp <= 15) {
      positives.push(
        `Top 3 holder concentration relatively healthy (${top3ExLp}%)`,
      );
    }

    const liquidity = Number(tokenData.liquidity || 0);
    const marketCap = Number(tokenData.marketCap || 0);
    if (marketCap > 0) {
      const liqRatio = (liquidity / marketCap) * 100;
      if (liqRatio >= 15) {
        positives.push(
          `Liquidity support is solid (${Math.floor(liqRatio)}% of market cap)`,
        );
      }
    }

    if (tokenData.hasTwitter || tokenData.hasTelegram || tokenData.hasWebsite) {
      const socialCount = [
        tokenData.hasTwitter,
        tokenData.hasTelegram,
        tokenData.hasWebsite,
      ].filter(Boolean).length;
      positives.push(`Social presence detected (${socialCount}/3 channels)`);
    }

    const lpLikeHolderPercent = Number(tokenData.lpLikeHolderPercent || 0);
    const offCurveExcludedCount = Number(tokenData.offCurveExcludedCount || 0);
    if (
      lpLikeHolderPercent >= 10 &&
      lpLikeHolderPercent < 80 &&
      offCurveExcludedCount > 0
    ) {
      positives.push(
        `LP/program vault balance detected (~${lpLikeHolderPercent}%) and excluded from holder-concentration risk`,
      );
    }

    if (Number(tokenData.sameDeployerCount || 0) <= 1) {
      positives.push("No evidence of serial token creation by deployer");
    }

    return positives.slice(0, 6);
  }

  _buildDeterministicRugSignal(tokenData, trustScore, sections) {
    let riskPoints = 10;

    // Blend trust score when available
    if (typeof trustScore === "number" && Number.isFinite(trustScore)) {
      riskPoints += Math.max(0, 100 - trustScore) * 0.5;
    }

    const marketCap = Number(tokenData.marketCap || 0);
    if (marketCap > 0 && marketCap < 5000) riskPoints += 20;
    else if (marketCap > 0 && marketCap < 15000) riskPoints += 12;

    const ageInHours = Number(tokenData.ageInHours || 0);
    if (ageInHours > 0 && ageInHours < 1) riskPoints += 20;
    else if (ageInHours > 0 && ageInHours < 6) riskPoints += 12;

    const absChange = Math.abs(Number(tokenData.priceChange24h || 0));
    if (absChange >= 70) riskPoints += 20;
    else if (absChange >= 40) riskPoints += 14;
    else if (absChange >= 20) riskPoints += 8;

    const top3ExLp = Number(tokenData.top3ExcludingLpPercent || 0);
    if (top3ExLp >= 40) riskPoints += 14;
    else if (top3ExLp >= 25) riskPoints += 8;

    if (tokenData.hasActiveMintAuthority === true) riskPoints += 15;
    if (Number(tokenData.sameDeployerCount || 0) > 1) riskPoints += 8;
    if (Number(tokenData.freshWalletBuys || 0) >= 25) riskPoints += 8;

    const onlyNoThreatFlag =
      sections?.keyThreats?.length === 1 &&
      sections.keyThreats[0] ===
        "No material threat signals detected from available data";
    if (onlyNoThreatFlag) {
      riskPoints = Math.min(riskPoints, 55);
    }

    const finalProb = Math.max(5, Math.min(95, Math.round(riskPoints)));
    const rugLevel =
      finalProb >= 65 ? "HIGH" : finalProb >= 35 ? "MEDIUM" : "LOW";

    return {
      rugProbability: `${finalProb}%`,
      rugLevel,
    };
  }

  _buildDeterministicTraderNote(tokenData, sections) {
    const threats = sections?.keyThreats || [];
    const hasMarketStructureThreat = threats.some(
      (t) =>
        t.includes("Micro-cap size") ||
        t.includes("Small-cap size") ||
        t.includes("drawdown") ||
        t.includes("Very thin 24h trading activity") ||
        t.includes("pool/vault dominates") ||
        t.includes("Very early curve stage") ||
        t.includes("Largest raw holder/vault controls"),
    );
    const hasOnChainThreat = threats.some(
      (t) =>
        t.includes("Dev wallet owns") ||
        t.includes("Mint authority") ||
        t.includes("same deployer") ||
        t.includes("sniper wallets") ||
        t.includes("Wallet clustering") ||
        t.includes("Top 3 holders control") ||
        t.includes("Fresh deployer"),
    );

    const hasOnlyNoThreatFlag =
      sections?.keyThreats?.length === 1 &&
      sections.keyThreats[0] ===
        "No material threat signals detected from available data";

    if (hasOnlyNoThreatFlag) {
      const marketCap = Number(tokenData.marketCap || 0);
      if (marketCap > 0 && marketCap < 100000) {
        return "No major on-chain red flags detected. This is still a small-cap token, so volatility risk remains high.";
      }
      return "No major on-chain red flags detected. Keep normal caution for meme-token volatility.";
    }

    const threatCount = Number(sections?.keyThreats?.length || 0);
    if (hasMarketStructureThreat && !hasOnChainThreat) {
      return "No major on-chain red flags detected, but market-structure risk is high (micro-cap/volatility). Keep position size small.";
    }

    if (threatCount >= 3) {
      return "Multiple on-chain risk signals are present. Treat this as elevated-risk and avoid oversized entries.";
    }

    return "Some on-chain risk signals are present, but not extreme. Use tight risk management and monitor holder changes.";
  }

  async generateSummary(tokenData) {
    if (!this.enabled) {
      return `${tokenData.symbol} - ${tokenData.name} | Price: $${tokenData.price} | Market Cap: $${tokenData.marketCap?.toLocaleString()}`;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Generate a brief, professional one-line summary of this token. Focus on key metrics.",
          },
          {
            role: "user",
            content: `Token: ${tokenData.symbol} - ${tokenData.name}, Price: $${tokenData.price}, Market Cap: $${tokenData.marketCap?.toLocaleString()}, Volume: $${tokenData.volume24h?.toLocaleString()}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.2,
      });

      return (
        completion.choices[0]?.message?.content ||
        `${tokenData.symbol} analysis complete`
      );
    } catch (error) {
      console.error("Error generating summary:", error.message);
      return `${tokenData.symbol} - ${tokenData.name} | Analysis complete`;
    }
  }
}

export default new AIAnalysisService();
