'use client'

import { useState } from 'react'
import { NetworkInstructions } from './NetworkInstructions'

interface RPCSelectorProps {
  onRPCSwitch: (rpcUrl: string) => void
  currentRPC?: string
  rpcOptions?: Array<{ name: string; url: string; description: string }>
  isConnected?: boolean
}

export function RPCSelector({ onRPCSwitch, currentRPC, rpcOptions = [], isConnected = false }: RPCSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [selectedRPC, setSelectedRPC] = useState(
    rpcOptions.find(rpc => rpc.url === currentRPC) || rpcOptions[0] || { name: 'Unknown', url: '', description: '' }
  )

  const handleRPCSwitch = (rpc: { name: string; url: string; description: string }) => {
    setSelectedRPC(rpc)
    onRPCSwitch(rpc.url)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center gap-2"
      >
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
        {selectedRPC.name}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Select RPC Provider</h3>
            <div className="space-y-2">
              {rpcOptions.map((rpc) => (
                <button
                  key={rpc.url}
                  onClick={() => handleRPCSwitch(rpc)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedRPC.url === rpc.url
                      ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                      : 'bg-dark-700 border-dark-600 text-white hover:bg-dark-600'
                  }`}
                >
                  <div className="font-medium">{rpc.name}</div>
                  <div className="text-sm text-dark-300">{rpc.description}</div>
                  <div className="text-xs text-dark-400 font-mono mt-1">{rpc.url}</div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-dark-700 rounded-lg">
                <div className="text-sm text-dark-300">
                  <strong>Note:</strong> You may need to switch your MetaMask network to use the selected RPC.
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowInstructions(true)
                  setIsOpen(false)
                }}
                className="w-full btn-secondary text-sm"
              >
                📋 Show MetaMask Setup Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      <NetworkInstructions
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        rpcUrl={selectedRPC.url}
      />
    </div>
  )
}
