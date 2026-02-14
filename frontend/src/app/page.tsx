'use client'
import Image from 'next/image'
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
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 w-full flex items-center justify-center text-center gap-2">
            <Image
              src="/pumpscanner.png"
              alt="PumpScanner logo"
              width={1024}
              height={1024}
              className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-[0_0_14px_rgba(34,197,94,0.25)]"
              priority
            />
            <span>
              <span className="text-green-400">Pump</span>
              <span className="text-white">Scanner(beta)</span>
            </span>
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

        {/* Disclaimer */}
        <div className="w-full text-center -mt-2">
          <p className="inline-block mx-auto px-3 py-1 rounded-full border border-gray-700 bg-gray-900/60 backdrop-blur-sm text-green-400 text-sm">
            Beta test run: results are experimental and may change.
          </p>
        </div>

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

      </div>
    </main>
  )
}