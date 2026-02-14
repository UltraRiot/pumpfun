'use client'
import { useState } from 'react'

interface TokenSearchFormProps {
  onSubmit: (tokenAddress: string) => void
  loading: boolean
}

export default function TokenSearchForm({ onSubmit, loading }: TokenSearchFormProps) {
  const [tokenAddress, setTokenAddress] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tokenAddress.trim()) {
      onSubmit(tokenAddress.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          placeholder="Enter Solana token address (e.g., 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R)"
          className="w-full px-6 py-4 text-white bg-gray-900/80 border border-gray-700 rounded-xl 
                     focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20
                     backdrop-blur-sm text-lg placeholder-gray-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !tokenAddress.trim()}
          className="absolute right-2 top-2 bottom-2 px-6 bg-green-600 hover:bg-green-700 
                     disabled:bg-gray-600 disabled:cursor-not-allowed
                     text-white font-semibold rounded-lg transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-green-500/50"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Analyzing...</span>
            </div>
          ) : (
            'Scan'
          )}
        </button>
      </div>
      
      {/* Quick examples */}
      <div className="mt-4 text-center">
        <p className="text-gray-500 text-sm mb-2">Try these examples:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'So11111111111111111111111111111111111111112', // SOL
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          ].map((address) => (
            <button
              key={address}
              onClick={() => setTokenAddress(address)}
              className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 
                         rounded-full transition-colors duration-200"
              disabled={loading}
            >
              {address.slice(0, 8)}...{address.slice(-8)}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}