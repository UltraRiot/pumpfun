import { Connection, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

class SolanaService {
  constructor() {
    const rpcUrl =
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

    if (!rpcUrl.startsWith("http")) {
      console.error("❌ Invalid RPC URL:", rpcUrl);
      throw new Error("SOLANA_RPC_URL must start with http:// or https://");
    }

    this.connection = new Connection(rpcUrl);
    console.log("🟢 Solana connection initialized with URL:", rpcUrl);
  }

  // Test connection
  async testConnection() {
    try {
      const version = await this.connection.getVersion();
      console.log("✅ Solana RPC connected:", version);
      return true;
    } catch (error) {
      console.error("❌ Solana connection failed:", error.message);
      return false;
    }
  }

  // Get real holder count for a token using RPC calls
  async getTokenHolderCount(tokenAddress) {
    try {
      const mintPubkey = new PublicKey(tokenAddress);

      console.log(`📊 Fetching real holder count for token...`);

      // Method 1: Try to get token accounts using getLargestAccounts
      try {
        const largestAccounts =
          await this.connection.getTokenLargestAccounts(mintPubkey);
        if (largestAccounts.value && largestAccounts.value.length > 0) {
          // Count non-zero balance accounts
          const nonZeroAccounts = largestAccounts.value.filter(
            (account) => account.uiAmount && account.uiAmount > 0,
          );

          if (nonZeroAccounts.length > 0) {
            console.log(
              `📊 Found ${nonZeroAccounts.length} holders via largest accounts`,
            );
            return Math.max(nonZeroAccounts.length, 1);
          }
        }
      } catch (largestError) {
        console.log(
          `⚠️ Largest accounts method failed: ${largestError.message}`,
        );
      }

      // Method 2: Alternative approach using program accounts
      try {
        const TOKEN_PROGRAM_ID = new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        );

        const accounts = await this.connection.getProgramAccounts(
          TOKEN_PROGRAM_ID,
          {
            filters: [
              {
                dataSize: 165, // Token account data size
              },
              {
                memcmp: {
                  offset: 0,
                  bytes: mintPubkey.toBase58(),
                },
              },
            ],
            commitment: "confirmed",
          },
        );

        if (accounts && accounts.length > 0) {
          // Sample a few accounts to check if they have balances
          let activeAccounts = 0;
          const sampleSize = Math.min(accounts.length, 10); // Check first 10 accounts

          for (let i = 0; i < sampleSize; i++) {
            try {
              const accountBalance =
                await this.connection.getTokenAccountBalance(
                  accounts[i].pubkey,
                );
              if (accountBalance.value.uiAmount > 0) {
                activeAccounts++;
              }
            } catch (e) {
              // Skip accounts that can't be read
            }
          }

          // Estimate total based on sample - if no sample worked, assume 30% are active
          let estimatedHolders;
          if (activeAccounts > 0) {
            estimatedHolders = Math.floor(
              (activeAccounts / sampleSize) * accounts.length,
            );
          } else {
            // If we can't sample due to rate limits, estimate 30% of accounts are active
            estimatedHolders = Math.floor(accounts.length * 0.3);
          }

          console.log(
            `📊 Estimated ${estimatedHolders} holders from ${accounts.length} total accounts (${activeAccounts}/${sampleSize} sampled)`,
          );
          return Math.max(estimatedHolders, Math.floor(accounts.length * 0.2)); // At least 20% of accounts
        }
      } catch (programError) {
        console.log(
          `⚠️ Program accounts method failed: ${programError.message}`,
        );
      }

      console.log(`📊 RPC methods failed, using fallback estimation`);
      return 0; // Let the calling function handle estimation
    } catch (error) {
      console.log(`⚠️ Failed to get holder count: ${error.message}`);
      return 0;
    }
  }

  // Get token supply information
  async getTokenSupply(tokenAddress) {
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      const supply = await this.connection.getTokenSupply(mintPubkey);

      return {
        total: supply.value.uiAmount || 0,
        decimals: supply.value.decimals || 9,
      };
    } catch (error) {
      console.log(`⚠️ Failed to get token supply: ${error.message}`);
      return { total: 0, decimals: 9 };
    }
  }

  // Get basic token info
  async getTokenInfo(tokenAddress) {
    try {
      const publicKey = new PublicKey(tokenAddress);
      const accountInfo = await this.connection.getAccountInfo(publicKey);

      if (!accountInfo) {
        return { error: "Token not found" };
      }

      return {
        address: tokenAddress,
        owner: accountInfo.owner.toBase58(),
        lamports: accountInfo.lamports,
        executable: accountInfo.executable,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getDetailedHolderAnalysis(mintAddress) {
    try {
      console.log(`🔍 Getting detailed holder analysis for: ${mintAddress}`);

      // Get token supply
      const supplyInfo = await this.getTokenSupply(mintAddress);
      const supply = supplyInfo.total;

      // Get largest token accounts
      const largestAccounts = await this.connection.getTokenLargestAccounts(
        new PublicKey(mintAddress),
      );

      if (!largestAccounts.value || largestAccounts.value.length === 0) {
        return {
          supply,
          topHolders: [],
          top10Concentration: 0,
        };
      }

      // Get token-account wallet owner for each account and aggregate by wallet
      const walletBalances = new Map();

      for (const account of largestAccounts.value) {
        try {
          const parsedAccountInfo = await this.connection.getParsedAccountInfo(
            account.address,
          );
          const parsed = parsedAccountInfo?.value?.data?.parsed;
          const owner = parsed?.info?.owner;
          const amount = Number(account.uiAmount || 0);

          if (owner && amount > 0) {
            const current = walletBalances.get(owner) || 0;
            walletBalances.set(owner, current + amount);
          }
        } catch (error) {
          console.log(`⚠️ Failed to get token account owner: ${error.message}`);
        }
      }

      // Convert to sorted array with curve classification
      const allHolders = Array.from(walletBalances.entries())
        .map(([owner, amount]) => {
          let isOnCurve = true;
          try {
            const ownerPk = new PublicKey(owner);
            isOnCurve = PublicKey.isOnCurve(ownerPk.toBytes());
          } catch (e) {
            isOnCurve = true;
          }

          return {
            owner,
            amount: amount.toString(),
            pct: supply > 0 ? (amount / supply) * 100 : 0,
            isOnCurve,
          };
        })
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 40);

      // Prefer on-curve (user wallet) holders for risk metrics.
      // Off-curve addresses are often PDAs/program vaults and can distort concentration.
      const onCurveHolders = allHolders.filter((h) => h.isOnCurve);
      const sortedHolders =
        onCurveHolders.length > 0
          ? onCurveHolders.slice(0, 20)
          : allHolders.slice(0, 20);

      // Calculate top 10 concentration from selected holder set
      const top10Concentration = sortedHolders
        .slice(0, 10)
        .reduce((sum, holder) => sum + holder.pct, 0);

      const rawTop10Concentration = allHolders
        .slice(0, 10)
        .reduce((sum, holder) => sum + holder.pct, 0);
      const excludedOffCurveHolders = allHolders.filter(
        (h) => !h.isOnCurve,
      ).length;

      return {
        supply: supply.toString(),
        topHolders: sortedHolders,
        top10Concentration,
        rawTopHolders: allHolders.slice(0, 20),
        rawTop10Concentration,
        excludedOffCurveHolders,
      };
    } catch (error) {
      console.error("❌ Detailed holder analysis failed:", error.message);
      throw new Error(`Holder analysis failed: ${error.message}`);
    }
  }

  async getDeployerAnalysis(mintAddress) {
    try {
      console.log(`🔍 Getting deployer analysis for: ${mintAddress}`);

      // Get signatures for the mint (oldest first)
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(mintAddress),
        { limit: 50 },
      );

      if (!signatures || signatures.length === 0) {
        throw new Error("No signatures found for mint");
      }

      // Get the oldest signature (first transaction)
      const oldestSig = signatures[signatures.length - 1];
      const transaction = await this.connection.getParsedTransaction(
        oldestSig.signature,
        {
          maxSupportedTransactionVersion: 0,
        },
      );

      if (!transaction || !transaction.transaction) {
        throw new Error("Failed to fetch deployment transaction");
      }

      // Find the deployer (first signer excluding programs)
      const accountKeys = transaction.transaction.message.accountKeys;
      let deployer = null;

      for (const account of accountKeys) {
        const isSigner = account?.signer === true;
        const isExecutable = account?.executable === true;
        if (isSigner && !isExecutable) {
          deployer =
            typeof account.pubkey === "string"
              ? account.pubkey
              : account.pubkey?.toString?.() || null;
          break;
        }
      }

      if (!deployer) {
        throw new Error("Could not identify deployer");
      }

      // Get deployer age
      const deployerSigs = await this.connection.getSignaturesForAddress(
        new PublicKey(deployer),
        { limit: 1000 },
      );

      let ageDays = 0;
      if (deployerSigs && deployerSigs.length > 0) {
        const oldestDeployerSig = deployerSigs[deployerSigs.length - 1];
        const ageMs = Date.now() - oldestDeployerSig.blockTime * 1000;
        ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }

      // Count other tokens created by this deployer
      let otherTokensCount = 0;
      const recentSigs = deployerSigs.slice(0, 200); // Check last 200 transactions

      for (const sig of recentSigs) {
        try {
          const tx = await this.connection.getTransaction(sig.signature, {
            encoding: "jsonParsed",
            maxSupportedTransactionVersion: 0,
          });

          if (tx && tx.meta && tx.meta.innerInstructions) {
            for (const innerIx of tx.meta.innerInstructions) {
              for (const instruction of innerIx.instructions) {
                if (
                  instruction.program === "spl-token" &&
                  instruction.parsed &&
                  (instruction.parsed.type === "initializeMint" ||
                    instruction.parsed.type === "initializeMint2")
                ) {
                  const newMint = instruction.parsed.info.mint;
                  if (newMint !== mintAddress) {
                    otherTokensCount++;
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip failed transactions
          continue;
        }
      }

      return {
        address: deployer,
        ageDays,
        otherTokensCount,
      };
    } catch (error) {
      console.error("❌ Deployer analysis failed:", error.message);
      throw new Error(`Deployer analysis failed: ${error.message}`);
    }
  }

  async getTokenMetadata(mintAddress) {
    try {
      // Try to get metadata account (this is a simplified version)
      // In reality, you'd need to derive the metadata PDA and parse it
      // For now, return null as metadata parsing is complex
      return null;
    } catch (error) {
      return null;
    }
  }

  async checkMintAuthority(mintAddress) {
    try {
      console.log(`🔍 Checking mint authority for: ${mintAddress}`);

      const mintInfo = await this.connection.getParsedAccountInfo(
        new PublicKey(mintAddress),
      );

      if (!mintInfo || !mintInfo.value) {
        return { hasAuthority: false, authority: null };
      }

      const parsed = mintInfo?.value?.data?.parsed;
      const authority = parsed?.info?.mintAuthority || null;
      const hasAuthority = !!authority;

      console.log(
        `✅ Mint authority check: ${hasAuthority ? "Active" : "Disabled"}`,
      );
      return { hasAuthority, authority };
    } catch (error) {
      console.error("❌ Mint authority check failed:", error.message);
      return { hasAuthority: false, authority: null };
    }
  }

  async analyzeDeployerHistory(deployerAddress) {
    try {
      console.log(`🔍 Analyzing deployer history: ${deployerAddress}`);

      // Get all signatures for the deployer
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(deployerAddress),
        { limit: 100 },
      );

      if (!signatures || signatures.length === 0) {
        return { tokenCount: 0, isNewWallet: true, walletAge: 0 };
      }

      // Count token creation transactions
      let tokenCount = 0;
      for (const sig of signatures.slice(0, 20)) {
        // Check first 20 to avoid rate limits
        try {
          const tx = await this.connection.getTransaction(sig.signature, {
            encoding: "jsonParsed",
            maxSupportedTransactionVersion: 0,
          });

          if (
            tx?.meta?.logMessages?.some(
              (log) =>
                log.includes("InitializeMint") || log.includes("CreateAccount"),
            )
          ) {
            tokenCount++;
          }
        } catch (e) {
          // Skip failed transactions
        }
      }

      // Calculate wallet age
      const oldestTx = signatures[signatures.length - 1];
      const walletAge = Date.now() - oldestTx.blockTime * 1000;
      const isNewWallet = walletAge < 7 * 24 * 60 * 60 * 1000; // 7 days

      console.log(
        `✅ Deployer analysis: ${tokenCount} tokens, ${isNewWallet ? "new" : "old"} wallet`,
      );
      return { tokenCount, isNewWallet, walletAge };
    } catch (error) {
      console.error("❌ Deployer history analysis failed:", error.message);
      return { tokenCount: 1, isNewWallet: false, walletAge: 0 }; // Conservative fallback
    }
  }

  async analyzeTransactionPatterns(mintAddress) {
    try {
      console.log(`🔍 Analyzing transaction patterns for: ${mintAddress}`);

      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(mintAddress),
        { limit: 50 }, // Reduced to avoid rate limits
      );

      if (!signatures || signatures.length < 5) {
        return {
          sniperWallets: 0,
          clustering: false,
          suspiciousPatterns: false,
        };
      }

      let sniperWallets = 0;
      let clustering = false;
      const walletTimestamps = new Map();

      // Analyze transaction timing patterns
      for (const sig of signatures.slice(0, 20)) {
        // Analyze first 20 transactions
        try {
          const tx = await this.connection.getTransaction(sig.signature, {
            encoding: "jsonParsed",
            maxSupportedTransactionVersion: 0,
          });

          if (tx?.transaction?.message?.accountKeys) {
            const signer = tx.transaction.message.accountKeys.find(
              (k) => k.signer,
            );
            if (signer) {
              const wallet = signer.pubkey.toString();
              const timestamp = tx.blockTime;

              if (!walletTimestamps.has(wallet)) {
                walletTimestamps.set(wallet, timestamp);
              }
            }
          }
        } catch (e) {
          // Skip failed transactions
        }
      }

      // Detect clustering (multiple wallets trading within short time windows)
      const timestamps = Array.from(walletTimestamps.values()).sort();
      let clusteredTrades = 0;

      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] - timestamps[i - 1] < 30) {
          // Within 30 seconds
          clusteredTrades++;
        }
      }

      clustering = clusteredTrades > Math.max(3, timestamps.length * 0.3); // >30% clustered or 3+ trades
      sniperWallets = Math.min(clusteredTrades, walletTimestamps.size);

      console.log(
        `✅ Transaction analysis: ${sniperWallets} potential snipers, clustering: ${clustering}`,
      );
      return {
        sniperWallets,
        clustering,
        suspiciousPatterns: clustering && sniperWallets > 5,
      };
    } catch (error) {
      console.error("❌ Transaction pattern analysis failed:", error.message);
      return { sniperWallets: 0, clustering: false, suspiciousPatterns: false };
    }
  }
}

export default new SolanaService();
