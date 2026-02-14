import express from "express";
import solanaService from "../services/solanaService.js";
import trustScorer from "../services/trustScorer.js";
import dataFetcher from "../services/dataFetcher.js";
import aiAnalysisService from "../services/aiAnalysisService.js";
const router = express.Router();

// Test Solana connection
router.get("/test-connection", async (req, res) => {
  try {
    const connected = await solanaService.testConnection();
    res.json({
      connected,
      rpcUrl: process.env.SOLANA_RPC_URL,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get token trust score
router.get("/trust-score/:address", async (req, res) => {
  try {
    const { address } = req.params;

    console.log(`🔍 Analyzing token: ${address}`);

    // Get real token data from multiple sources
    const tokenData = await dataFetcher.getTokenData(address);

    // Generate trust score report with real data
    const report = trustScorer.generateReport(tokenData);

    // Add AI analysis if available
    try {
      const aiAnalysis = await aiAnalysisService.analyzeToken(
        tokenData,
        report.trustScore,
        report.riskLevel,
      );
      report.rugProbability = aiAnalysis.rugProbability;
      report.rugLevel = aiAnalysis.rugLevel;
      report.keyThreats = aiAnalysis.keyThreats;
      report.positiveSignals = aiAnalysis.positiveSignals || [];
      report.traderNote = aiAnalysis.traderNote;
      report.visualIndicator = aiAnalysis.visualIndicator;
      report.indicatorColor = aiAnalysis.indicatorColor;

      // Generate AI summary
      const summary = await aiAnalysisService.generateSummary(tokenData);
      report.aiSummary = summary;
    } catch (aiError) {
      console.log("⚠️ AI analysis failed:", aiError.message);
      report.rugProbability = "Data unavailable, risk increased";
      report.rugLevel = "HIGH";
      report.keyThreats = ["AI analysis temporarily unavailable"];
      report.traderNote = "System error. Extreme caution advised.";
    }

    if (tokenData._isError) {
      report._isError = true;
      report._errorMessage = tokenData._errorMessage;
      report._apiStatus = "error";
    }

    console.log(
      `✅ Trust score calculated: ${report.trustScore} (${report.riskLevel})`,
    );

    res.json(report);
  } catch (error) {
    console.error("Trust score error:", error.message);

    // Handle specific error types
    if (error.message.includes("Invalid token address format")) {
      return res.status(400).json({
        error: "Invalid token address",
        message: "Please provide a valid Solana token address",
      });
    }

    if (
      error.message.includes("Token not found") ||
      error.message.includes("no valid data available")
    ) {
      return res.status(404).json({
        error: "Token not found",
        message:
          "This token address does not exist or has no valid data available",
      });
    }

    if (error.message.includes("No real market data available")) {
      return res.status(503).json({
        error: "Real market data unavailable",
        message:
          "Unable to fetch live token market data from upstream providers right now",
      });
    }

    res.status(500).json({
      error: "Internal server error while analyzing token",
      details: error.message,
    });
  }
});

// New risk analysis endpoint
router.get("/risk", async (req, res) => {
  try {
    const { mint } = req.query;

    if (!mint) {
      return res.status(400).json({
        error: "Missing mint parameter",
        message: "Please provide a mint address: /api/risk?mint=<MINT_ADDRESS>",
      });
    }

    console.log(`🎯 Risk analysis for: ${mint}`);

    // Get on-chain holder data
    const holderData = await solanaService.getDetailedHolderAnalysis(mint);

    // Get deployer info
    const deployerInfo = await solanaService.getDeployerAnalysis(mint);

    // Get liquidity data from DexScreener
    const liquidityData = await getLiquidityData(mint);

    // Get social data from token metadata
    const socialData = await getSocialPresence(mint);

    // Calculate risk flags
    const riskFlags = {
      devWalletOwns100Percent: holderData.topHolders[0]?.pct >= 99.9,
      top10HoldersOwn100Percent: holderData.top10Concentration >= 99.9,
      deployerOtherTokensCount: deployerInfo.otherTokensCount,
      freshDeployer: deployerInfo.ageDays < 30,
      socialPresenceMinimal: socialData.isMinimal,
      noLockedLiquidity:
        liquidityData.pairsFound === 0 || liquidityData.liquidityUsd < 1000,
    };

    // Generate explanation notes
    const notes = [];
    if (riskFlags.devWalletOwns100Percent)
      notes.push("Top holder owns ≥99.9% of supply");
    if (riskFlags.top10HoldersOwn100Percent)
      notes.push("Top 10 holders control ≥99.9% of supply");
    if (riskFlags.deployerOtherTokensCount > 0)
      notes.push(
        `Deployer created ${deployerInfo.otherTokensCount} other tokens`,
      );
    if (riskFlags.freshDeployer)
      notes.push(`Deployer wallet is only ${deployerInfo.ageDays} days old`);
    if (riskFlags.socialPresenceMinimal === true)
      notes.push("Missing 2+ of: website, twitter, telegram");
    if (riskFlags.noLockedLiquidity) {
      if (liquidityData.pairsFound === 0) {
        notes.push("No liquidity pairs found");
      } else {
        notes.push(
          "No verifiable LP lock check implemented; treat as unverified",
        );
      }
    }

    const response = {
      mint,
      supply: holderData.supply,
      topHolders: holderData.topHolders,
      deployer: deployerInfo.address,
      deployerAgeDays: deployerInfo.ageDays,
      liquidityUsd: liquidityData.liquidityUsd,
      pairsFound: liquidityData.pairsFound,
      ...riskFlags,
      notes,
      analyzedAt: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error("Risk analysis error:", error.message);
    res.status(500).json({
      error: "Risk analysis failed",
      message: error.message,
    });
  }
});

// Helper function for liquidity data
async function getLiquidityData(mint) {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
    );
    const data = await response.json();

    if (data.pairs && data.pairs.length > 0) {
      // Find highest liquidity pair
      const bestPair = data.pairs.reduce((best, current) => {
        const bestLiq = parseFloat(best.liquidity?.usd) || 0;
        const currentLiq = parseFloat(current.liquidity?.usd) || 0;
        return currentLiq > bestLiq ? current : best;
      });

      return {
        liquidityUsd: parseFloat(bestPair.liquidity?.usd) || 0,
        pairsFound: data.pairs.length,
      };
    }

    return { liquidityUsd: 0, pairsFound: 0 };
  } catch (error) {
    console.log("Liquidity data fetch failed:", error.message);
    return { liquidityUsd: 0, pairsFound: 0 };
  }
}

// Helper function for social presence
async function getSocialPresence(mint) {
  try {
    // Try to get metadata from token
    const metadataAccount = await solanaService.getTokenMetadata(mint);

    if (metadataAccount) {
      const hasWebsite = !!(
        metadataAccount.website || metadataAccount.external_url
      );
      const hasTwitter = !!(
        metadataAccount.twitter ||
        (metadataAccount.external_url &&
          metadataAccount.external_url.includes("twitter"))
      );
      const hasTelegram = !!(
        metadataAccount.telegram ||
        (metadataAccount.external_url &&
          metadataAccount.external_url.includes("telegram"))
      );

      const missing = [hasWebsite, hasTwitter, hasTelegram].filter(
        (x) => !x,
      ).length;
      return { isMinimal: missing >= 2 };
    }

    return { isMinimal: null }; // No metadata available
  } catch (error) {
    return { isMinimal: null };
  }
}

// List recent tokens (not implemented - no mock output)
router.get("/tokens/recent", (req, res) => {
  res.status(501).json({
    error: "Not implemented",
    message:
      "Recent tokens endpoint is disabled until live-data source is wired",
  });
});

export default router;
