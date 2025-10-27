'use client'

import { useState } from 'react'
import { Clock, User, DollarSign, Users, ShoppingCart, Shield } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

interface OfferCardProps {
  offer: {
    id: string
    seller: string
    title: string
    description: string
    price: string
    duration: string
    availableSlots: string
    isActive: boolean
    createdAt: Date
  }
  onPurchase: () => void
  onDeactivate?: () => void
  isOwner?: boolean
}

export function OfferCard({ offer, onPurchase, onDeactivate, isOwner = false }: OfferCardProps) {
  const { wallet, contract } = useAppContext()
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const handlePurchase = async () => {
    if (!wallet.signer) {
      toast.error('Please connect your wallet first')
      return
    }

    if (wallet.address?.toLowerCase() === offer.seller.toLowerCase()) {
      toast.error('Cannot purchase your own offer')
      return
    }

    try {
      setIsPurchasing(true)
      
      // Purchase using public price (UI shows this, blockchain validates with encrypted price)
      await contract.purchaseOffer(offer.id, '1') // Purchase 1 slot by default
      
      toast.success('Offer purchased successfully!')
      onPurchase()
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase offer')
    } finally {
      setIsPurchasing(false)
    }
  }


  const handleDeactivate = async () => {
    if (!wallet.signer) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setIsDeactivating(true)
      await contract.deactivateOffer(offer.id, wallet.signer)
      toast.success('Offer deactivated successfully!')
      onDeactivate?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate offer')
    } finally {
      setIsDeactivating(false)
    }
  }


  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="card-hover group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
            {offer.title}
          </h3>
          <div className="flex items-center text-sm text-dark-400 mb-2">
            <User className="w-4 h-4 mr-1" />
            <span>{formatAddress(offer.seller)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-green-400">Active</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-dark-300 text-sm mb-4 line-clamp-3">
        {offer.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-primary-400" />
          <div>
            <div className="text-sm text-dark-400">Price</div>
            <div className="text-white font-semibold">{offer.price} ETH</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-primary-400" />
          <div>
            <div className="text-sm text-dark-400">Duration</div>
            <div className="text-white font-semibold">{offer.duration} hours</div>
          </div>
        </div>
      </div>

      {/* Available Slots */}
      <div className="flex items-center space-x-2 mb-4">
        <Users className="w-4 h-4 text-primary-400" />
        <div>
          <div className="text-sm text-dark-400">Available Slots</div>
          <div className="text-white font-semibold">{offer.availableSlots}</div>
        </div>
      </div>

      {/* FHE Badge */}
      <div className="flex items-center mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
            <Shield className="w-3 h-3 text-black" />
          </div>
          <span className="text-xs text-primary-400 font-medium">FHE Encrypted</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-dark-500">
          Created {formatDate(offer.createdAt)}
        </div>
        
        {isOwner ? (
          <div className="flex space-x-2">
            <button
              onClick={handleDeactivate}
              disabled={isDeactivating || !wallet.isConnected}
              className="btn-secondary text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
            </button>
          </div>
        ) : (
          <button
            onClick={handlePurchase}
            disabled={isPurchasing || !wallet.isConnected}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            {isPurchasing ? 'Purchasing...' : 'Purchase'}
          </button>
        )}
      </div>
    </div>
  )
}
