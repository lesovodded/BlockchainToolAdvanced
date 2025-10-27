'use client'

import { ethers } from 'ethers'
import './polyfills'

// Real FHE Relayer Client - Only Zama FHEVM, no fallbacks
export class FHERelayerClient {
  private instance: any = null
  private contract: any
  private publicKey: string

  constructor(contract: any, publicKey?: string) {
    this.contract = contract
    this.publicKey = publicKey || 'fhe-demo-key'
  }

  // Helper method to add timeout to async operations
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`FHE operation "${operation}" timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
  }

  // Initialize FHEVM instance with real configuration
  async initialize() {
    try {
      console.log('🔒 Starting FHEVM initialization...')
      
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('FHEVM requires browser environment')
      }

      // Check if polyfills are available
      if (typeof global === 'undefined') {
        throw new Error('Polyfills not loaded - global is undefined')
      }

      console.log('🔒 Browser environment and polyfills OK, importing FHEVM SDK...')
      
      // Dynamic import to avoid SSR issues
      const { initSDK, createInstance, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web')
      
      console.log('🔒 FHEVM SDK imported successfully, initializing Relayer...')
      
      // Initialize TFHE and KMS modules first
      await initSDK()
      
      console.log('🔒 TFHE and KMS modules initialized, creating FHEVM instance...')
      
      // Create FHEVM instance with SepoliaConfig
      this.instance = await createInstance(SepoliaConfig)
      
      console.log('🔒 Real FHEVM Relayer initialized successfully')
      console.log('🔒 Available methods:', Object.keys(this.instance))
      return true
    } catch (error) {
      console.error('❌ Failed to initialize FHEVM Relayer:', error)
      throw error
    }
  }

  // Encrypt price value using real FHEVM (converts ETH to gwei)
  async encryptPrice(value: number, userAddress: string): Promise<any> {
    console.log(`🔒 Starting encryption of price: ${value} ETH`)
    
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized')
    }

    // For FHEVM, we need to work within 32-bit integer limits
    // Convert ETH to gwei (10^9 wei) to fit within 32-bit range
    const valueInGwei = Math.floor(value * 1e9)
    
    // Check if value exceeds 32-bit integer limit
    if (valueInGwei > 4294967295) {
      throw new Error(`Price ${value} ETH (${valueInGwei} gwei) exceeds 32-bit integer limit`)
    }
    
    // Ensure value is a positive integer
    const safeValue = Math.max(1, valueInGwei) // Ensure minimum value of 1 gwei
    console.log(`🔒 Price in gwei: ${valueInGwei}, Safe value for encryption: ${safeValue}`)

    try {
      console.log(`🔒 Creating encrypted input for contract: ${this.contract.target}, user: ${userAddress}`)
      
      // Use real FHEVM createEncryptedInput method with timeout
      const encryptedInput = this.instance.createEncryptedInput(this.contract.target, userAddress)
      
      console.log(`🔒 Adding value ${safeValue} to encrypted input...`)
      const encrypted = await this.withTimeout(
        Promise.resolve(encryptedInput.add32(safeValue).encrypt()),
        30000, // 30 second timeout
        `encryptUint32(${safeValue})`
      )
      
      console.log(`🔒 Encryption successful, returning handles and attestation`)
      console.log(`🔒 Handles:`, encrypted.handles)
      console.log(`🔒 Attestation:`, encrypted.attestation)
      console.log(`🔒 Encrypted object keys:`, Object.keys(encrypted))
      
      // Try to get attestation from different places
      let finalAttestation = encrypted.attestation
      
      // Check if inputProof is the attestation
      if (!finalAttestation && encrypted.inputProof) {
        console.log(`🔒 Found inputProof, using as attestation...`)
        finalAttestation = encrypted.inputProof
      }
      
      if (!finalAttestation && encrypted.encryptedInput) {
        console.log(`🔒 Checking encryptedInput for attestation...`)
        console.log(`🔒 EncryptedInput keys:`, Object.keys(encrypted.encryptedInput))
        finalAttestation = encrypted.encryptedInput.attestation
      }
      
      if (!finalAttestation && encryptedInput) {
        console.log(`🔒 Checking encryptedInput parameter for attestation...`)
        console.log(`🔒 EncryptedInput parameter keys:`, Object.keys(encryptedInput))
        finalAttestation = encryptedInput.attestation
      }
      
      console.log(`🔒 Final attestation:`, finalAttestation)
      
      // Return handles and attestation for contract call
      return {
        handles: encrypted.handles,
        attestation: finalAttestation
      }
    } catch (error) {
      console.error('❌ Failed to encrypt price:', error)
      throw error
    }
  }

  // Encrypt uint32 value using real FHEVM (no unit conversion)
  async encryptUint32(value: number, userAddress: string): Promise<any> {
    console.log(`🔒 Starting encryption of value: ${value}`)
    
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized')
    }

    // Check if value exceeds 32-bit integer limit
    if (value > 4294967295) {
      throw new Error(`Value ${value} exceeds 32-bit integer limit (4294967295)`)
    }
    
    // Ensure value is a positive integer
    const safeValue = Math.max(1, Math.floor(value))
    console.log(`🔒 Safe value for encryption: ${safeValue}`)

    try {
      console.log(`🔒 Creating encrypted input for contract: ${this.contract.target}, user: ${userAddress}`)
      
      // Use real FHEVM createEncryptedInput method with timeout
      const encryptedInput = this.instance.createEncryptedInput(this.contract.target, userAddress)
      
      console.log(`🔒 Adding value ${safeValue} to encrypted input...`)
      const encrypted = await this.withTimeout(
        Promise.resolve(encryptedInput.add32(safeValue).encrypt()),
        30000, // 30 second timeout
        `encryptUint32(${safeValue})`
      )
      
      console.log(`🔒 Encryption successful, returning handles and attestation`)
      console.log(`🔒 Handles:`, encrypted.handles)
      console.log(`🔒 Attestation:`, encrypted.attestation)
      console.log(`🔒 Encrypted object keys:`, Object.keys(encrypted))
      
      // Try to get attestation from different places
      let finalAttestation = encrypted.attestation
      
      // Check if inputProof is the attestation
      if (!finalAttestation && encrypted.inputProof) {
        console.log(`🔒 Found inputProof, using as attestation...`)
        finalAttestation = encrypted.inputProof
      }
      
      if (!finalAttestation && encrypted.encryptedInput) {
        console.log(`🔒 Checking encryptedInput for attestation...`)
        console.log(`🔒 EncryptedInput keys:`, Object.keys(encrypted.encryptedInput))
        finalAttestation = encrypted.encryptedInput.attestation
      }
      
      if (!finalAttestation && encryptedInput) {
        console.log(`🔒 Checking encryptedInput parameter for attestation...`)
        console.log(`🔒 EncryptedInput parameter keys:`, Object.keys(encryptedInput))
        finalAttestation = encryptedInput.attestation
      }
      
      console.log(`🔒 Final attestation:`, finalAttestation)
      
      // Return handles and attestation for contract call
      return {
        handles: encrypted.handles,
        attestation: finalAttestation
      }
    } catch (error) {
      console.error('❌ Failed to encrypt uint32:', error)
      throw error
    }
  }

  // Encrypt boolean value using real FHEVM
  async encryptBool(value: boolean, userAddress: string): Promise<any> {
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized')
    }

    try {
      // Use real FHEVM createEncryptedInput method for boolean
      const encryptedInput = this.instance.createEncryptedInput(this.contract.target, userAddress)
      const encrypted = await Promise.resolve(encryptedInput.addBool(value).encrypt())
      
      // Return handles and attestation for contract call
      console.log(`🔒 Boolean encryption successful`)
      return {
        handles: encrypted.handles,
        attestation: encrypted.attestation
      }
    } catch (error) {
      console.error('❌ Failed to encrypt bool:', error)
      throw error
    }
  }

  // Real FHE decryption using EIP-712 signature
  async decryptUint32(encryptedValue: any, privateKey: string, publicKey: string, signature: string, userAddress: string): Promise<number> {
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized')
    }

    try {
      // Use real FHEVM userDecrypt method with EIP-712 signature
      // FIXED: Removed optional parameters that may not be supported in newer SDK versions
      const decryptedResults = await this.instance.userDecrypt(
        [{ handle: encryptedValue, contractAddress: this.contract.target }],
        privateKey,
        publicKey,
        signature,
        [this.contract.target],
        userAddress
      )
      
      return Number(decryptedResults[Object.keys(decryptedResults)[0]])
    } catch (error) {
      console.error('❌ Failed to decrypt uint32:', error)
      throw error
    }
  }

  // Create encrypted offer data using real FHE
  async createEncryptedOfferData(
    price: number,
    duration: number,
    slots: number,
    userAddress: string
  ) {
    try {
      console.log(`🔒 Creating encrypted offer data: price=${price}, duration=${duration}, slots=${slots}`)
      
      // CRITICAL FIX: Use wei instead of gwei to match public price format
      // Convert ETH to wei (1 ETH = 10^18 wei)
      const priceInWei = Math.floor(price * 1e18)
      
      // For FHE, we need to work within 32-bit integer limits
      // But we'll use a different approach - scale down the price for FHE
      // and store the scaling factor separately
      const priceScale = 1e12 // Scale factor: 1e18 / 1e6 = 1e12
      const scaledPrice = Math.floor(priceInWei / priceScale)
      
      console.log(`🔒 Price conversion: ${price} ETH → ${priceInWei} wei → ${scaledPrice} (scaled for FHE)`)
      
      // Validate scaled values fit in 32-bit range
      if (scaledPrice > 4294967295) {
        throw new Error(`Scaled price ${scaledPrice} exceeds 32-bit integer limit`)
      }
      // Duration and slots are already integers, just check 32-bit limit
      if (duration > 4294967295) {
        throw new Error(`Duration ${duration} exceeds 32-bit integer limit`)
      }
      if (slots > 4294967295) {
        throw new Error(`Slots ${slots} exceeds 32-bit integer limit`)
      }

      console.log(`🔒 Creating single encrypted input with all values...`)
      
      // Create a single encrypted input with all values
      // FIXED: Correct parameter order - contractAddress first, then userAddress
      const encryptedInput = this.instance.createEncryptedInput(this.contract.target, userAddress)
      
      console.log(`🔒 Adding scaled price: ${scaledPrice}`)
      encryptedInput.add32(scaledPrice) // Use scaled price for FHE
      
      console.log(`🔒 Adding duration: ${duration}`)
      encryptedInput.add32(duration)
      
      console.log(`🔒 Adding slots: ${slots}`)
      encryptedInput.add32(slots)
      
      console.log(`🔒 Encrypting all values together...`)
      // Wrap in Promise.resolve to ensure it's always a Promise
      const encrypted = await Promise.resolve(encryptedInput.encrypt())
      
      console.log(`🔒 Encryption successful`)
      console.log(`🔒 Handles count: ${encrypted.handles.length}`)
      console.log(`🔒 Encrypted object keys:`, Object.keys(encrypted))
      
      // CRITICAL FIX: Use inputProof as attestation (not combined data)
      let finalAttestation = encrypted.inputProof
      
      if (!finalAttestation && encrypted.attestation) {
        console.log(`🔒 Using encrypted.attestation as fallback...`)
        finalAttestation = encrypted.attestation
      }
      
      console.log(`🔒 Final attestation type:`, typeof finalAttestation)
      console.log(`🔒 Final attestation length:`, finalAttestation?.length || 'undefined')
      
      // CRITICAL FIX: Return handles as-is (don't modify them)
      const allHandles = encrypted.handles
      
      console.log(`🔒 Raw handles:`, allHandles.map((h: any, i: number) => ({
        index: i,
        type: typeof h,
        length: h?.length || 'undefined',
        preview: h instanceof Uint8Array ? h.slice(0, 8) : h
      })))
      
      console.log(`🔒 Attestation preview:`, finalAttestation instanceof Uint8Array ? 
        finalAttestation.slice(0, 8) : finalAttestation)
      
      return {
        handles: allHandles,
        attestation: finalAttestation,
        priceScale: priceScale // Include scaling factor for reference
      }
    } catch (error) {
      console.error('❌ Failed to create encrypted offer data:', error)
      throw error
    }
  }

  // Create encrypted payment using real FHE
  async createEncryptedPayment(amount: number, userAddress: string) {
    try {
      // Validate amount before encryption
      if (amount > 1000000) {
        throw new Error(`Payment amount ${amount} ETH exceeds reasonable limit (1,000,000 ETH)`)
      }

      const encrypted = await this.encryptUint32(amount, userAddress)
      return encrypted
    } catch (error) {
      console.error('❌ Failed to create encrypted payment:', error)
      throw error
    }
  }

  // Get encrypted offer details (shows encrypted data without decryption)
  async getEncryptedOffer(offerId: string) {
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized')
    }

    try {
      // Get public offer data
      const publicOffer = await this.contract.getPublicOffer(offerId)
      
      // Get encrypted offer data
      const encryptedOffer = await this.contract.getEncryptedOffer(offerId)
      
      return {
        publicPrice: ethers.formatEther(publicOffer.publicPrice),
        publicDuration: publicOffer.publicDuration.toString(),
        publicSlots: publicOffer.publicSlots.toString(),
        publicIsActive: publicOffer.publicIsActive,
        encryptedPrice: encryptedOffer.encryptedPrice,
        encryptedDuration: encryptedOffer.encryptedDuration,
        encryptedSlots: encryptedOffer.encryptedSlots,
        encryptedIsActive: encryptedOffer.encryptedIsActive,
        decryptionNote: "Data is encrypted with real FHE - decryption requires EIP-712 signature"
      }
    } catch (error) {
      console.error('❌ Failed to get encrypted offer:', error)
      throw error
    }
  }
}

// Factory function for creating FHERelayerClient
export function createFHERelayerClient(contract: any, publicKey?: string): FHERelayerClient {
  return new FHERelayerClient(contract, publicKey)
}