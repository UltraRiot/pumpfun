'use client'
import { useTokenAnalysis } from '@/hooks/useApiCall'
import TokenSearchForm from '@/components/TokenSearchForm'
import TrustScoreDisplay from '@/components/TrustScoreDisplay'

export default function Home() {
  const { data: trustData, error, loading, analyzeToken } = useTokenAnalysis()

  const handleTokenAnalysis = async (tokenAddress: string) => {
    try {
      await analyzeToken(tokenAddress)
    } catch (err) {
      // Error is handled by the hook
    }
  }

  return (
    <main className="min-h-screen grid-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto text-center space-y-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            <span className="text-green-400">PumpFun</span> Scanner
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Analyze pump.fun tokens with AI-powered trust scoring
          </p>
        </div>

        {/* Search Form */}
        <TokenSearchForm 
          onSubmit={handleTokenAnalysis} 
          loading={loading}
        />

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-600 rounded-lg">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {/* Results */}
        {trustData && (
          <TrustScoreDisplay data={trustData} />
        )}

        {/* Footer */}
        <div className="absolute bottom-4 text-center text-gray-600 text-sm">
          <p>Enter a Solana token address to get trust score analysis</p>
        </div>
      </div>
    </main>
  )
}