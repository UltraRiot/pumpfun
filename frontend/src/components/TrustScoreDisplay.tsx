'use client'

import { 
  getScoreColor, 
  getRiskColor
} from '@/utils/colorUtils'

interface TrustScoreDisplayProps {
  data: {
    [key: string]: unknown
    error?: string
    message?: string
    trustScore?: number
    riskLevel?: string
    visualIndicator?: string
    indicatorColor?: string
    rugProbability?: string
    rugLevel?: string
    keyThreats?: string[]
    positiveSignals?: string[]
    traderNote?: string
    timestamp?: string
    freshWalletBuys?: number
    sameDeployerCount?: number
    rugCreatorRisk?: boolean
    botActivity?: boolean
    dumpRisk?: string
    buyPressure?: string
    _isError?: boolean
    _errorMessage?: string
    holderContext?: {
      top3ExcludingLpPercent?: number
      lpLikeHolderPercent?: number
      offCurveExcludedCount?: number
    }
  }
}

export default function TrustScoreDisplay({ data }: TrustScoreDisplayProps) {
  if (data.error) {
    const isInvalidAddress = data.error.includes('Invalid token address') || data.message?.includes('valid Solana token address');
    const isNotFound = data.error.includes('Token not found') || data.message?.includes('does not exist');
    
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-6 max-w-2xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">!</span>
          </div>
          <div>
            <h3 className="text-red-400 font-semibold">
              {isInvalidAddress ? 'Invalid Address' : isNotFound ? 'Token Not Found' : 'Error'}
            </h3>
            <p className="text-red-300">
              {data.message || data.error}
            </p>
            {isInvalidAddress && (
              <p className="text-red-400 text-sm mt-2">
                Please enter a valid Solana token address (32-44 characters, base58 encoded)
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const showSniperIntel =
    (data.freshWalletBuys || 0) > 0 ||
    (data.sameDeployerCount || 0) > 1 ||
    data.rugCreatorRisk === true ||
    data.botActivity === true ||
    data.dumpRisk === 'HIGH' ||
    data.buyPressure === 'WEAK'

  const signal = String(data.visualIndicator || '').toUpperCase()
  const trustScoreValue = Number(data.trustScore ?? 0)
  const riskLevelValue = String(data.riskLevel ?? 'MEDIUM')
  const analyzedAtValue = String(data.timestamp ?? new Date().toISOString())
  const signalHelper =
    signal === 'RUN'
      ? {
          title: 'RUN',
          text: 'Higher-confidence momentum setup. Still volatile — use position sizing and exits.',
          className: 'text-green-300 border-green-500/40 bg-green-900/20',
        }
      : signal === 'RESEARCH'
      ? {
          title: 'RESEARCH',
          text: 'Mixed signals. Do more checks (holders, liquidity, volume trend, and social quality) before entry.',
          className: 'text-yellow-300 border-yellow-500/40 bg-yellow-900/20',
        }
      : signal === 'AVOID'
      ? {
          title: 'AVOID',
          text: 'Elevated risk profile detected. Capital preservation is prioritized over chasing entries.',
          className: 'text-red-300 border-red-500/40 bg-red-900/20',
        }
      : null

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-700 rounded-xl p-8 max-w-4xl mx-auto">
      {/* Compact AI signal banner (avoid duplicate rug-risk panels) */}
      {data.visualIndicator && (
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-3 px-4 py-2 rounded-lg border"
               style={{ borderColor: data.indicatorColor, backgroundColor: `${data.indicatorColor}20` }}>
            <span className="text-xl" style={{ color: data.indicatorColor }}>●</span>
            <span className="text-sm font-bold uppercase tracking-wide text-white">
              Signal: {data.visualIndicator}
            </span>
          </div>
          {signalHelper && (
            <div className={`mt-3 inline-block max-w-2xl rounded-lg border px-4 py-2 text-sm ${signalHelper.className}`}>
              <span className="font-bold mr-1">{signalHelper.title}:</span>
              <span>{signalHelper.text}</span>
            </div>
          )}
        </div>
      )}
      {/* Trust Score Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-4">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(trustScoreValue)}`}>
              {trustScoreValue}
            </div>
            <div className="text-gray-400 text-sm">Trust Score</div>
          </div>
          
          <div className={`px-4 py-2 rounded-lg border ${getRiskColor(riskLevelValue)}`}>
            <div className="font-semibold">{riskLevelValue} RISK</div>
          </div>
        </div>
      </div>

      {/* SNIPER INTELLIGENCE SECTION */}
      {showSniperIntel && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/50 rounded-xl p-6 mb-8">
          <h3 className="text-purple-300 font-bold text-xl mb-4 flex items-center">
            🎯 SNIPER INTELLIGENCE
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {data.freshWalletBuys || 0}
              </div>
              <div className="text-purple-200 text-sm">Fresh Wallets</div>
              <div className="text-xs text-purple-300">
                {(data.freshWalletBuys || 0) > 50 ? '🚨 SNIPING' : '📊 Normal'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {data.sameDeployerCount || 0}
              </div>
              <div className="text-purple-200 text-sm">Same Deployer</div>
              <div className="text-xs text-purple-300">
                {(data.sameDeployerCount || 0) > 5 ? '🚨 SERIAL RUG' : '✅ Clean'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {data.dumpRisk || 'MEDIUM'}
              </div>
              <div className="text-purple-200 text-sm">Dump Risk</div>
              <div className="text-xs text-purple-300">
                {data.dumpRisk === 'HIGH' ? '🚨 DANGER' : data.dumpRisk === 'LOW' ? '✅ Safe' : '⚠️ Watch'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {data.buyPressure || 'MEDIUM'}
              </div>
              <div className="text-purple-200 text-sm">Buy Pressure</div>
              <div className="text-xs text-purple-300">
                {data.buyPressure === 'STRONG' ? '🚀 BULLISH' : data.buyPressure === 'WEAK' ? '📉 Weak' : '📊 Steady'}
              </div>
            </div>
          </div>
          
          {data.rugCreatorRisk && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
              <span className="text-red-300 font-bold">🚨 RUG CREATOR DETECTED</span>
            </div>
          )}
          
          {data.botActivity && (
            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-500 rounded-lg">
              <span className="text-yellow-300 font-bold">🤖 HIGH BOT ACTIVITY</span>
            </div>
          )}
        </div>
      )}

      {/* Data Source Warning */}
      {data._isError && (
        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-red-400 text-lg">❌</span>
            <div>
              <p className="text-red-300 font-semibold text-sm">API Error</p>
              <p className="text-red-200 text-sm">
                {data._errorMessage || 'Unable to fetch token data from Jupiter or DEXScreener APIs.'}
              </p>
              <p className="text-red-200/80 text-xs mt-1">
                This token may not exist or may not be traded on major DEXs.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* TRADER-FOCUSED RISK ENGINE */}
      {(data.rugProbability || data.keyThreats || data.traderNote) && (
        <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 border-2 border-red-500/60 rounded-2xl p-8 mb-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className="text-4xl animate-pulse">⚠️</span>
            <h3 className="text-red-200 text-3xl font-black tracking-wider uppercase">
              Risk Engine
            </h3>
          </div>

          {/* Rug Probability - Large Display */}
          {data.rugProbability && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-6 bg-black/30 rounded-2xl p-6 border border-red-500/50">
                <div className="text-center">
                  <div className="text-6xl font-black text-red-400 tracking-wider">
                    {data.rugProbability}
                  </div>
                  <div className="text-red-300 text-sm font-bold uppercase tracking-wide mt-2">
                    Rug Probability
                  </div>
                </div>
                
                <div className={`px-6 py-3 rounded-xl border-2 ${
                  data.rugLevel === 'VERY HIGH' || data.rugLevel === 'HIGH'
                    ? 'bg-red-900/60 border-red-400 text-red-100'
                    : data.rugLevel === 'MEDIUM'
                    ? 'bg-orange-900/60 border-orange-400 text-orange-100'
                    : 'bg-green-900/60 border-green-400 text-green-100'
                }`}>
                  <div className="text-2xl font-black tracking-wide">
                    {data.rugLevel} RISK
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simple holder context */}
          {data.holderContext && (
            <div className="bg-black/20 rounded-xl p-6 mb-6 border border-cyan-600/30">
              <h4 className="text-cyan-200 text-xl font-bold mb-4">Holder Context</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg bg-cyan-950/30 p-3 border border-cyan-800/40">
                  <div className="text-cyan-300">Top 3 (users)</div>
                  <div className="text-white font-bold text-lg">{data.holderContext.top3ExcludingLpPercent || 0}%</div>
                </div>
                <div className="rounded-lg bg-cyan-950/30 p-3 border border-cyan-800/40">
                  <div className="text-cyan-300">LP/program vault</div>
                  <div className="text-white font-bold text-lg">~{data.holderContext.lpLikeHolderPercent || 0}%</div>
                </div>
                <div className="rounded-lg bg-cyan-950/30 p-3 border border-cyan-800/40">
                  <div className="text-cyan-300">Filtered non-user wallets</div>
                  <div className="text-white font-bold text-lg">{data.holderContext.offCurveExcludedCount || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Key Threats - Bullet Points */}
          {data.keyThreats && data.keyThreats.length > 0 && (
            <div className="bg-black/20 rounded-xl p-6 mb-6 border border-red-600/30">
              <h4 className="text-red-200 text-xl font-bold mb-4 flex items-center">
                ⚠️ Key Threats
              </h4>
              <div className="space-y-3">
                {data.keyThreats.slice(0, 6).map((threat: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-red-400 text-lg mt-0.5 animate-pulse">⚠</span>
                    <span className="text-red-100 text-lg font-semibold leading-relaxed">
                      {threat}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positive Signals - Bullet Points */}
          {data.positiveSignals && data.positiveSignals.length > 0 && (
            <div className="bg-black/20 rounded-xl p-6 mb-6 border border-green-600/30">
              <h4 className="text-green-200 text-xl font-bold mb-4 flex items-center">
                ✅ Positive Signals
              </h4>
              <div className="space-y-3">
                {data.positiveSignals.slice(0, 6).map((signal: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-green-400 text-lg mt-0.5">✓</span>
                    <span className="text-green-100 text-lg font-semibold leading-relaxed">
                      {signal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trader Note - Max 2 Lines */}
          {data.traderNote && (
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/50 rounded-xl p-6">
              <h4 className="text-purple-200 text-lg font-bold mb-3 flex items-center">
                📝 Trader Note
              </h4>
              <p className="text-purple-100 text-xl font-semibold leading-relaxed max-w-4xl">
                {data.traderNote}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center space-x-2 text-red-400/80 text-sm font-bold uppercase tracking-wide">
              <span>⚠️</span>
              <span>Extreme Volatility - Trade At Your Own Risk - Not Financial Advice</span>
              <span>⚠️</span>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-center text-gray-500 text-sm">
        Analyzed at {new Date(analyzedAtValue).toLocaleString()}
      </div>
    </div>
  )
}