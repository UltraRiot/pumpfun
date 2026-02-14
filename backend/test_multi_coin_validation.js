import dataFetcher from "./src/services/dataFetcher.js";
import trustScorer from "./src/services/trustScorer.js";
import aiAnalysisService from "./src/services/aiAnalysisService.js";

const TEST_MINTS = [
  "5sTUgEVTcRvPNK6CFpHBgVfDm6Vb7yKhb9ovMbvUpump", // KRNL
  "4FmCt1YxmJwYDGgYEX9Ap2RemmjmrKESwVN7syFWpump", // GOON
  "J2eaKn35rp82T6RFEsNK9CLRHEKV9BLXjedFM3q6pump", // FTP
  "8SSWWB4ZuwaMqsoxQpJH3FryJWwyGKCGE89qpAKepump", // CTO
  "2nP9yKQNSGQy851iyawDvBkzkK2R2aqKArQCKc2gpump", // PsyopAnime
];

const BANNED_THREAT_PHRASES = [
  "AI analysis temporarily unavailable",
  "No high-confidence on-chain threat flags",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function validateMint(mint) {
  const tokenData = await dataFetcher.getTokenData(mint);
  const report = trustScorer.generateReport(tokenData);
  const ai = await aiAnalysisService.analyzeToken(
    tokenData,
    report.trustScore,
    report.riskLevel,
  );

  assert(Number.isFinite(report.trustScore), "trustScore missing/invalid");
  assert(
    typeof report.riskLevel === "string" && report.riskLevel.length > 0,
    "riskLevel missing",
  );
  assert(
    typeof ai.rugProbability === "string" && ai.rugProbability.length > 0,
    "rugProbability missing",
  );
  assert(
    typeof ai.rugLevel === "string" && ai.rugLevel.length > 0,
    "rugLevel missing",
  );
  assert(
    Array.isArray(ai.keyThreats) && ai.keyThreats.length > 0,
    "keyThreats missing/empty",
  );

  for (const threat of ai.keyThreats) {
    for (const banned of BANNED_THREAT_PHRASES) {
      assert(
        !String(threat).includes(banned),
        `banned phrase found: ${banned}`,
      );
    }
  }

  const firstThreat = ai.keyThreats[0] || "n/a";
  return {
    mint,
    trustScore: report.trustScore,
    riskLevel: report.riskLevel,
    rugProbability: ai.rugProbability,
    rugLevel: ai.rugLevel,
    firstThreat,
  };
}

async function main() {
  console.log(
    `\n🧪 Running multi-coin validation (${TEST_MINTS.length} mints) ...\n`,
  );

  let passed = 0;
  const failures = [];

  for (const mint of TEST_MINTS) {
    try {
      const result = await validateMint(mint);
      passed += 1;
      console.log(`✅ PASS ${mint}`);
      console.log(
        `   trust=${result.trustScore} ${result.riskLevel} | rug=${result.rugProbability} ${result.rugLevel} | threat=${result.firstThreat}`,
      );
    } catch (error) {
      failures.push({ mint, error: error.message });
      console.log(`❌ FAIL ${mint}`);
      console.log(`   ${error.message}`);
    }
  }

  console.log(`\nResult: ${passed}/${TEST_MINTS.length} passed`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`- ${f.mint}: ${f.error}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal validation error:", error.message);
  process.exit(1);
});
