'use client'

import { useState, useEffect } from 'react'
import { CreateOfferModal } from './components/CreateOfferModal'
import { OfferCard } from './components/OfferCard'
import { RPCSelector } from './components/RPCSelector'
import { useAppContext } from './context/AppContext'
import { Clock, Plus, Zap, Shield } from 'lucide-react'
import contractInfo from './contract-info.json'

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [walletError, setWalletError] = useState<string | null>(null)
  const { wallet, contract, blockchain } = useAppContext()
  const { isConnected, address, connectWallet, disconnectWallet } = wallet
  const { loadOffers, error } = contract
  const { currentRPC, switchRPC, isConnected: blockchainConnected } = blockchain

  useEffect(() => {
    if (contract) {
      loadOffersData()
    }
  }, [contract, isConnected])

  const loadOffersData = async () => {
    try {
      setLoading(true)
      const offersData = await loadOffers()
      setOffers(offersData)
    } catch (error) {
      // Silent error handling for production
    } finally {
      setLoading(false)
    }
  }

  const handleOfferCreated = () => {
    setShowCreateModal(false)
    loadOffersData()
  }

  const handleConnectWallet = async () => {
    try {
      setWalletError(null)
      await connectWallet()
    } catch (error) {
      console.error('Wallet connection error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet'
      setWalletError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full flex items-center justify-center glow">
                <Clock className="w-12 h-12 text-black" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-black" />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold mb-4">
            <span className="gradient-text">Time Marketplace</span>
          </h1>
          <p className="text-xl text-dark-300 mb-8 max-w-2xl mx-auto">
            Decentralized marketplace for time-based services powered by 
            <span className="text-primary-400 font-semibold"> Fully Homomorphic Encryption</span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {!isConnected ? (
              <button
                onClick={handleConnectWallet}
                className="btn-primary text-lg px-8 py-4 glow-hover"
              >
                <Shield className="w-5 h-5 mr-2" />
                Connect Wallet
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary text-lg px-8 py-4 glow-hover"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Time Offer
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-dark-300">Connected:</span>
                  <span className="text-primary-400 font-mono text-sm">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <button
                    onClick={disconnectWallet}
                    className="btn-outline text-sm px-3 py-1"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
            
            <RPCSelector 
              onRPCSwitch={switchRPC}
              currentRPC={currentRPC.url}
              rpcOptions={blockchain.rpcOptions}
              isConnected={blockchainConnected}
            />
          </div>
        </div>

        {/* Error Display */}
        {(error || walletError) && (
          <div className="bg-red-900 border border-red-500 text-red-100 px-4 py-3 rounded mb-6">
            <p className="font-bold">Error:</p>
            <p>{error || walletError}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-400 mb-2">
              {offers.length}
            </div>
            <div className="text-dark-300">Active Offers</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-400 mb-2 flex items-center justify-center gap-2">
              <Shield className="w-8 h-8" />
              FHE
            </div>
            <div className="text-dark-300">Encrypted Data</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-400 mb-2">
              Sepolia
            </div>
            <div className="text-dark-300">Test Network</div>
          </div>
        </div>


        {/* Offers Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Available Time Offers</h2>
            <button
              onClick={loadOffersData}
              className="btn-outline"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 bg-dark-700 rounded mb-4"></div>
                  <div className="h-3 bg-dark-700 rounded mb-2"></div>
                  <div className="h-3 bg-dark-700 rounded mb-4"></div>
                  <div className="h-10 bg-dark-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-400 mb-2">
                No offers available
              </h3>
              <p className="text-dark-500">
                Be the first to create a time offer!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onPurchase={loadOffersData}
                  onDeactivate={loadOffersData}
                  isOwner={wallet.address?.toLowerCase() === offer.seller.toLowerCase()}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateOfferModal
          onClose={() => setShowCreateModal(false)}
          onOfferCreated={handleOfferCreated}
        />
      )}
    </div>
  )
}
