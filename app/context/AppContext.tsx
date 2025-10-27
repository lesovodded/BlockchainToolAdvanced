'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useContract } from '../hooks/useContract'
import { useBlockchainProvider } from '../hooks/useBlockchainProvider'
import { useRPC } from '../hooks/useRPC'

interface AppContextType {
  wallet: ReturnType<typeof useWallet>
  contract: ReturnType<typeof useContract>
  blockchain: ReturnType<typeof useBlockchainProvider>
  rpc: ReturnType<typeof useRPC>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet()
  const blockchain = useBlockchainProvider()
  const rpc = useRPC()
  const contract = useContract()

  // Initialize contract when blockchain provider is ready
  React.useEffect(() => {
    if (blockchain.provider && !contract.contract) {
      contract.initializeContract(blockchain.provider)
    }
  }, [blockchain.provider, contract.contract])

  // Connect signer when wallet is connected or changes
  React.useEffect(() => {
    if (wallet.signer && contract.contract) {
      // Always reconnect signer when wallet changes
      contract.connectSigner(wallet.signer).catch((error) => {
        console.error('Failed to connect signer:', error)
      })
    }
  }, [wallet.signer, contract.contract])

  const value = {
    wallet,
    contract,
    blockchain,
    rpc,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}


