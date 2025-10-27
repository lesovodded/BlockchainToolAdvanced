'use client'

import { useState, useCallback } from 'react'

const DEFAULT_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'

export function useRPC() {
  const [currentRPC, setCurrentRPC] = useState(DEFAULT_RPC)

  const switchRPC = useCallback((rpcUrl: string) => {
    console.log('Switching RPC to:', rpcUrl)
    setCurrentRPC(rpcUrl)
    
    // You can add additional logic here, like:
    // - Saving to localStorage
    // - Notifying other components
    // - Testing the RPC connection
  }, [])

  const testRPC = useCallback(async (rpcUrl: string) => {
    try {
      console.log('Testing RPC:', rpcUrl)
      
      // Create a simple test to check if RPC is working
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        })
      })
      
      const data = await response.json()
      
      if (data.result) {
        const chainId = parseInt(data.result, 16)
        console.log('RPC test successful. Chain ID:', chainId)
        
        if (chainId === 11155111) {
          console.log('✅ Correct Sepolia network')
          return { success: true, chainId }
        } else {
          console.log('❌ Wrong network. Expected Sepolia (11155111), got:', chainId)
          return { success: false, error: 'Wrong network' }
        }
      } else {
        console.log('❌ RPC test failed:', data.error)
        return { success: false, error: data.error?.message || 'Unknown error' }
      }
    } catch (error) {
      console.error('RPC test error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }, [])

  return {
    currentRPC,
    switchRPC,
    testRPC
  }
}


