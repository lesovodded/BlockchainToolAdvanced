'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

interface WalletState {
  isConnected: boolean
  address: string | null
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  chainId: number | null
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    provider: null,
    signer: null,
    chainId: null,
  })

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const network = await provider.getNetwork()

      setWallet({
        isConnected: true,
        address: accounts[0],
        provider,
        signer,
        chainId: Number(network.chainId),
      })

      // Check if we're on Sepolia
      if (Number(network.chainId) !== 11155111) {
        await switchToSepolia()
      }

      return true
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw error
    }
  }

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
      })
    } catch (switchError: any) {
      // If the chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'SepoliaETH',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          })
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError)
        }
      } else {
        console.error('Error switching to Sepolia:', switchError)
      }
    }
  }

  const disconnectWallet = () => {
    setWallet({
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
      chainId: null,
    })
  }

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const accounts = await provider.listAccounts()
          
          if (accounts.length > 0) {
            const signer = await provider.getSigner()
            const network = await provider.getNetwork()
            
            setWallet({
              isConnected: true,
              address: accounts[0].address,
              provider,
              signer,
              chainId: Number(network.chainId),
            })
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error)
        }
      }
    }

    checkConnection()

    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        checkConnection()
      }
    }

    // Listen for chain changes
    const handleChainChanged = () => {
      checkConnection()
    }

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  return {
    ...wallet,
    connectWallet,
    disconnectWallet,
  }
}

