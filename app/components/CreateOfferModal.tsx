'use client'

import { useState } from 'react'
import { X, Clock, DollarSign, Users, FileText } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { ethers } from 'ethers'

interface CreateOfferModalProps {
  onClose: () => void
  onOfferCreated: () => void
}

export function CreateOfferModal({ onClose, onOfferCreated }: CreateOfferModalProps) {
  const { wallet, contract } = useAppContext()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    availableSlots: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!wallet.signer) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!contract.contract) {
      toast.error('Contract not initialized. Please wait and try again.')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Validate form data
      if (!formData.title.trim() || !formData.description.trim()) {
        toast.error('Title and description are required')
        return
      }

      const price = parseFloat(formData.price)
      const duration = parseInt(formData.duration)
      const slots = parseInt(formData.availableSlots)

      if (price <= 0 || duration <= 0 || slots <= 0) {
        toast.error('Price, duration, and slots must be greater than 0')
        return
      }

      toast.loading('Creating offer...', { id: 'create-offer' })

      // Create FHE offer
      await contract.createFHEOffer(
        formData.title,
        formData.description,
        formData.price,
        formData.duration,
        formData.availableSlots,
        wallet.signer!
      )

      toast.success('Offer created successfully!', { id: 'create-offer' })
      onOfferCreated()
      onClose()
    } catch (error: any) {
      console.error('Failed to create offer:', error)
      toast.error(`Failed to create offer: ${error.message}`, { id: 'create-offer' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create New Offer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* FHE Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">FHE Protected</h3>
                <p className="text-sm text-blue-700">Your offer data is encrypted with Fully Homomorphic Encryption</p>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-2" />
              Title
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Enter offer title"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-2" />
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Describe your time offer"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="inline w-4 h-4 mr-2" />
              Price per Slot (ETH)
            </label>
            <input
              type="number"
              id="price"
              step="0.001"
              min="0"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="0.1"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline w-4 h-4 mr-2" />
              Duration (Days)
            </label>
            <input
              type="number"
              id="duration"
              min="1"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="7"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Available Slots */}
          <div>
            <label htmlFor="availableSlots" className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-4 h-4 mr-2" />
              Available Slots
            </label>
            <input
              type="number"
              id="availableSlots"
              min="1"
              value={formData.availableSlots}
              onChange={(e) => handleInputChange('availableSlots', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="5"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}