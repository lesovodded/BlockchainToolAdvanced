'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import contractInfo from '../contract-info.json'
import { zamaRelayer } from '../lib/zamaRelayer'

// Debug mode - set DEBUG=true in .env.local to enable verbose logging
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true'

const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

const infoLog = (...args: any[]) => {
  console.log(...args)
}

// Centralized RPC provider management with fallback
const getPreferredProvider = async () => {
  // Sepolia RPC endpoints with fallback
  const rpcUrls = [
    'https://ethereum-sepolia-rpc.publicnode.com',  // Primary Sepolia RPC
    'https://rpc.sepolia.org',
    'https://sepolia.gateway.tenderly.co',
    'https://endpoints.omniatech.io/v1/eth/sepolia/public',
    'https://sepolia.drpc.org',
    'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
    // Removed 1rpc.io completely due to quota issues
  ]

  for (const url of rpcUrls) {
    try {
      debugLog(`🔍 Testing RPC: ${url}`)
      const provider = new ethers.JsonRpcProvider(url)
      
      // Test connection with a simple call and timeout
      const testPromise = provider.getBlockNumber()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 5000)
      )
      
      await Promise.race([testPromise, timeoutPromise])
      
      infoLog(`✅ Using RPC: ${url}`)
      return provider
    } catch (err: any) {
      debugLog(`❌ RPC ${url} недоступен:`, err?.message || 'Unknown error')
      continue
    }
  }
  
  throw new Error('All RPC endpoints are unavailable')
}

// Error parsing utility
const parseContractError = (error: any, contract: any) => {
  try {
    if (error.data && contract?.interface) {
      const parsedError = contract.interface.parseError(error.data)
      if (parsedError) {
        return `Contract Error: ${parsedError.name}(${parsedError.args.join(', ')})`
      }
    }
  } catch (parseError) {
    debugLog('Failed to parse contract error:', parseError)
  }
  
  // Fallback to original error message
  return error.reason || error.message || 'Unknown error'
}

interface ContractState {
  contract: any | null
  contractWithSigner: any | null
  fheRelayer: any | null
  loading: boolean
  error: string | null
}

export function useContract() {
  const [state, setState] = useState<ContractState>({
    contract: null,
    contractWithSigner: null,
    fheRelayer: null,
    loading: true,
    error: null,
  })

  const initializeContract = async (provider: ethers.JsonRpcProvider | ethers.BrowserProvider) => {
    try {
      // Force use of reliable RPC - always use fallback system
      infoLog('🔄 Initializing contract with fallback RPC system')
      
      // Always use our fallback RPC system instead of any cached provider
      const reliableProvider = await getPreferredProvider()
      
      // Override the provider with our reliable one
      provider = reliableProvider
      
      infoLog('📡 Provider initialized:', {
        network: (await provider.getNetwork()).name,
        chainId: (await provider.getNetwork()).chainId.toString()
      })

      // Get contract address and ABI
      console.log('🔍 Contract info loaded:', contractInfo)
      
      if (!contractInfo.marketplace) {
        console.error('❌ Contract info structure:', contractInfo)
        throw new Error('Contract info not found. Please deploy the contract first.')
      }
      
      const contractAddress = contractInfo.marketplace.address
      const contractABI = contractInfo.marketplace.abi

      infoLog('📋 Contract info:', {
        address: contractAddress,
        name: contractInfo.marketplace.name,
        network: contractInfo.network
      })

      // Create contract instance
      const contract = new ethers.Contract(contractAddress, contractABI, provider)

      // Test contract connection
      try {
        const totalOffers = await contract.totalOffersCreated()
        infoLog('✅ Contract connection test successful:', {
          totalOffers: totalOffers.toString()
        })
      } catch (testError: any) {
        console.warn('⚠️ Contract connection test failed:', testError.message)
        // Don't fail initialization if test fails, contract might still work
      }

      // Initialize FHE Relayer
      let fheRelayerClient = null;
      try {
        const isRelayerAvailable = await zamaRelayer.isRelayerAvailable();
        if (isRelayerAvailable) {
          fheRelayerClient = zamaRelayer;
          infoLog('✅ Zama Relayer initialized');
        } else {
          infoLog('⚠️ Zama Relayer not available');
        }
      } catch (error: any) {
        infoLog('⚠️ Failed to initialize Zama Relayer:', error.message);
      }

      setState({
        contract,
        contractWithSigner: null, // Will be set when wallet connects
        fheRelayer: fheRelayerClient,
        loading: false,
        error: null,
      })

      infoLog('✅ Contract initialized successfully')
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to initialize contract'
      console.error('❌ Contract initialization failed:', errorMessage)
      
      setState({
        contract: null,
        contractWithSigner: null,
        fheRelayer: null,
        loading: false,
        error: errorMessage,
      })
    }
  }

  const connectSigner = async (signer: ethers.Signer) => {
    if (!state.contract) {
      throw new Error('Contract not initialized')
    }

    try {
      const signerAddress = await signer.getAddress()
      infoLog('🔄 Connecting signer to contract:', signerAddress)
      
      const contractWithSigner = state.contract.connect(signer)
      setState(prev => ({
        ...prev,
        contractWithSigner
      }))
      
      infoLog('✅ Signer connected to contract:', signerAddress)
      return contractWithSigner
    } catch (error: any) {
      console.error('❌ Failed to connect signer:', error.message)
      throw new Error(`Failed to connect signer: ${error.message}`)
    }
  }

  const createOffer = async (
    title: string,
    description: string,
    price: string,
    duration: string,
    slots: string,
    signer: ethers.Signer
  ) => {
    if (!state.contractWithSigner) {
      throw new Error('Contract not connected to wallet. Please connect your wallet first.')
    }

    // Always use the provided signer to ensure we have a valid connection
    const contractWithSigner = state.contract.connect(signer)
    const signerAddress = await signer.getAddress()
    infoLog('🔍 Using signer address for offer:', signerAddress)
    
    // Update the state with the new contract instance
    setState(prev => ({
      ...prev,
      contractWithSigner
    }))

    try {
      infoLog('📝 Creating offer with parameters:', {
        title,
        description,
        price,
        duration,
        slots
      })

      // Convert string values to BigInt
      const priceWei = ethers.parseEther(price)
      const durationBigInt = BigInt(duration)
      const slotsBigInt = BigInt(slots)

      infoLog('📝 Converted values:', {
        priceWei: priceWei.toString(),
        duration: durationBigInt.toString(),
        slots: slotsBigInt.toString()
      })

      // Call the contract method
      const tx = await contractWithSigner.createOffer(
        title,
        description,
        priceWei,
        durationBigInt,
        slotsBigInt
      )

      infoLog('📝 Transaction sent:', tx.hash)
      
      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      infoLog('✅ Offer created successfully:', {
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      })

      return receipt
    } catch (error: any) {
      const errorMessage = parseContractError(error, state.contract)
      console.error('📝 Failed to create offer:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  const purchaseOffer = async (offerId: string, slots: string) => {
    if (!state.contract) {
      throw new Error('Contract not initialized')
    }

    try {
      infoLog('🛒 Purchasing offer:', {
        offerId,
        slots
      })

      // Get offer details to calculate total price
      const offer = await state.contract.offers(offerId)
      
      infoLog('📋 Offer details:', {
        offerId,
        offer: offer,
        price: offer?.price,
        priceType: typeof offer?.price,
        publicPrice: offer?.publicPrice,
        allFields: Object.keys(offer || {})
      })
      
      // Check if offer exists and has price (try both price and publicPrice fields)
      if (!offer || (offer.price === undefined && offer.publicPrice === undefined)) {
        throw new Error('Offer not found or invalid')
      }
      
      // Use publicPrice if available, otherwise use price
      const priceField = offer.publicPrice !== undefined ? offer.publicPrice : offer.price
      
      const pricePerSlot = BigInt(priceField.toString())
      const slotsBigInt = BigInt(slots)
      const totalPrice = pricePerSlot * slotsBigInt

      infoLog('💰 Purchase details:', {
        pricePerSlot: pricePerSlot.toString(),
        slots: slotsBigInt.toString(),
        totalPrice: totalPrice.toString(),
        totalPriceETH: ethers.formatEther(totalPrice)
      })

      // Call the contract method with payment
      const tx = await state.contractWithSigner.purchaseOffer(offerId, slotsBigInt, {
        value: totalPrice
      })

      infoLog('📝 Purchase transaction sent:', tx.hash)
      
      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      infoLog('✅ Purchase completed successfully:', {
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      })

      return receipt
    } catch (error: any) {
      const errorMessage = parseContractError(error, state.contract)
      console.error('📝 Failed to purchase offer:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  const getContractStats = async () => {
    if (!state.contract) {
      throw new Error('Contract not initialized')
    }

    try {
      const [totalOffers, totalPurchases, totalVolume, activeOffers] = await state.contract.getContractStats()
      
      return {
        totalOffers: totalOffers.toString(),
        totalPurchases: totalPurchases.toString(),
        totalVolume: ethers.formatEther(totalVolume),
        activeOffers: activeOffers.toString()
      }
    } catch (error: any) {
      const errorMessage = parseContractError(error, state.contract)
      console.error('📝 Failed to get contract stats:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  const getActiveOffers = async () => {
    if (!state.contract) {
      throw new Error('Contract not initialized')
    }

    try {
      const offerIds = await state.contract.getActiveOfferIds()
      console.log('📋 Active offer IDs:', offerIds)
      
      const offers = []

      for (const id of offerIds) {
        const offer = await state.contract.offers(id)
        offers.push({
          id: id.toString(),
          seller: offer.creator, // Map creator to seller for UI compatibility
          creator: offer.creator,
          title: offer.title,
          description: offer.description,
          price: ethers.formatEther(offer.publicPrice),
          duration: offer.duration.toString(),
          slots: offer.slots.toString(),
          availableSlots: offer.availableSlots.toString(),
          isActive: offer.isActive,
          createdAt: new Date(Number(offer.createdAt) * 1000),
          expiresAt: new Date(Number(offer.expiresAt) * 1000)
        })
      }

      console.log('📋 Processed offers:', offers)
      return offers
    } catch (error: any) {
      const errorMessage = parseContractError(error, state.contract)
      console.error('📝 Failed to get active offers:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  const createFHEOffer = async (
    title: string,
    description: string,
    publicPrice: string,
    duration: string,
    slots: string,
    signer: ethers.Signer
  ) => {
    if (!state.contractWithSigner) {
      throw new Error('Contract not connected to wallet. Please connect your wallet first.')
    }

    // Always use the provided signer to ensure we have a valid connection
    const contractWithSigner = state.contract.connect(signer)
    const signerAddress = await signer.getAddress()
    infoLog('🔍 Using signer address for FHE offer:', signerAddress)
    
    // Update the state with the new contract instance
    setState(prev => ({
      ...prev,
      contractWithSigner
    }))

    if (!state.fheRelayer) {
      throw new Error('FHE Relayer not available')
    }

    try {
      infoLog('🔐 Creating FHE offer with parameters:', {
        title,
        description,
        publicPrice,
        duration,
        slots
      })

      // Create encrypted data using Zama Relayer
      const encryptedData = await state.fheRelayer.createEncryptedOfferData(
        publicPrice,
        duration,
        slots
      )

      infoLog('🔐 FHE encryption completed, calling smart contract...')

      // Convert handles to proper format for contract
      const handle1 = ethers.getBytes(encryptedData.handles[0])
      const handle2 = ethers.getBytes(encryptedData.handles[1])
      const handle3 = ethers.getBytes(encryptedData.handles[2])
      const attestation = ethers.getBytes(encryptedData.attestation)

      // Call the FHE contract method
      const tx = await contractWithSigner.createOfferWithFHE(
        title,
        description,
        ethers.parseEther(publicPrice), // public price for display
        BigInt(duration),
        BigInt(slots),
        handle1,
        handle2,
        handle3,
        attestation
      )

      infoLog('📝 FHE transaction sent:', tx.hash)
      
      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      infoLog('✅ FHE offer created successfully:', {
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      })

      return receipt
    } catch (error: any) {
      const errorMessage = parseContractError(error, state.contract)
      console.error('📝 Failed to create FHE offer:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Alias for getActiveOffers to match the expected interface
  const deactivateOffer = async (offerId: string, signer: ethers.Signer) => {
    if (!state.contract) {
      throw new Error('Contract not initialized')
    }

    // Always use the provided signer to ensure we have a valid connection
    const contractWithSigner = state.contract.connect(signer)
    const signerAddress = await signer.getAddress()
    infoLog('🔍 Using signer address for deactivation:', signerAddress)
    
    // Update the state with the new contract instance
    setState(prev => ({
      ...prev,
      contractWithSigner
    }))

    try {
      infoLog('📝 Deactivating offer:', offerId)
      
      const tx = await contractWithSigner.deactivateOffer(offerId)
      infoLog('📝 Deactivation transaction sent:', tx.hash)
      
      const receipt = await tx.wait()
      infoLog('✅ Offer deactivated successfully:', receipt)
      
      return receipt
    } catch (error: any) {
      const errorMessage = error.reason || error.message || 'Unknown error'
      console.error('📝 Failed to deactivate offer:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  const loadOffers = getActiveOffers

  return {
    ...state,
    initializeContract,
    connectSigner,
    createOffer,
    createFHEOffer,
    purchaseOffer,
    deactivateOffer,
    getContractStats,
    getActiveOffers,
    loadOffers,
  }
}
