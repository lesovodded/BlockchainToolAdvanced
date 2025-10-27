'use client'

import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'

const RPC_OPTIONS = [
  {
    name: 'Ankr',
    url: 'https://rpc.ankr.com/eth_sepolia',
    description: 'Ankr (free tier - most reliable)'
  },
  {
    name: 'Alchemy',
    url: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    description: 'Alchemy (demo key)'
  },
  {
    name: 'Gateway.fm',
    url: 'https://sepolia.gateway.tenderly.co',
    description: 'Gateway.fm (backup)'
  },
  {
    name: '1RPC',
    url: 'https://1rpc.io/eth/sepolia',
    description: '1RPC (free tier)'
  },
  {
    name: 'DRPC',
    url: 'https://sepolia.drpc.org',
    description: 'DRPC (fallback)'
  }
]

export function useBlockchainProvider() {
  // Use Ankr as default (most reliable)
  const [currentRPC, setCurrentRPC] = useState(RPC_OPTIONS[0])
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize provider
  const initializeProvider = useCallback(async (rpcUrl: string) => {
    try {
      console.log('Initializing blockchain provider with RPC:', rpcUrl)
      setError(null)
      
      const newProvider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
        polling: false, // Disable automatic polling
        pollingInterval: 10000 // Poll every 10 seconds if polling is enabled
      })
      
      // Test connection with timeout
      const networkPromise = newProvider.getNetwork()
      const network = await Promise.race([
        networkPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network request timeout')), 10000)
        )
      ]) as any
      
      console.log('Provider network:', network)
      
      if (network.chainId !== BigInt(11155111)) {
        throw new Error(`Wrong network! Expected Sepolia (11155111), got: ${network.chainId}`)
      }
      
      // Test with a simple call
      const blockNumberPromise = newProvider.getBlockNumber()
      const blockNumber = await Promise.race([
        blockNumberPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Block number request timeout')), 10000)
        )
      ]) as any
      
      console.log('Provider connection test - Block number:', blockNumber)
      
      setProvider(newProvider)
      setIsConnected(true)
      console.log('✅ Blockchain provider connected successfully')
      
    } catch (err) {
      console.error('❌ Failed to initialize blockchain provider:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsConnected(false)
      setProvider(null)
    }
  }, [])

  // Switch RPC
  const switchRPC = useCallback((rpcUrl: string) => {
    const rpcOption = RPC_OPTIONS.find(rpc => rpc.url === rpcUrl)
    if (rpcOption) {
      setCurrentRPC(rpcOption)
      // Initialize provider directly without useEffect
      initializeProvider(rpcUrl)
    }
  }, [initializeProvider])

  // Test RPC
  const testRPC = useCallback(async (rpcUrl: string) => {
    try {
      console.log('Testing RPC:', rpcUrl)
      
      const testProvider = new ethers.JsonRpcProvider(rpcUrl)
      const network = await testProvider.getNetwork()
      
      if (network.chainId === BigInt(11155111)) {
        console.log('✅ RPC test successful')
        return { success: true, chainId: network.chainId }
      } else {
        console.log('❌ Wrong network')
        return { success: false, error: 'Wrong network' }
      }
    } catch (error) {
      console.error('❌ RPC test failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }, [])

  // Initialize only once on mount
  useEffect(() => {
    let mounted = true
    
    const initProvider = async () => {
      if (!mounted) return
      
      // Wait 2 seconds before initializing to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (!mounted) return
      
      console.log('🔄 Initializing blockchain provider with RPC:', currentRPC.url)
      initializeProvider(currentRPC.url)
    }
    
    initProvider()
    
    return () => {
      mounted = false
    }
  }, []) // Only run once on mount

  return {
    provider,
    isConnected,
    error,
    currentRPC,
    switchRPC,
    testRPC,
    rpcOptions: RPC_OPTIONS
  }
}
