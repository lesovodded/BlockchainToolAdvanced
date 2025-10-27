'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'

interface NetworkInstructionsProps {
  isOpen: boolean
  onClose: () => void
  rpcUrl: string
}

export function NetworkInstructions({ isOpen, onClose, rpcUrl }: NetworkInstructionsProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-600 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Configure MetaMask for Sepolia</h2>
            <button
              onClick={onClose}
              className="text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Step 1: Add Sepolia Network</h3>
              <div className="bg-dark-700 p-4 rounded-lg">
                <p className="text-dark-300 mb-3">
                  If you don&apos;t have Sepolia network in MetaMask, add it manually:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-dark-600 p-3 rounded">
                    <span className="text-white font-mono text-sm">Network Name:</span>
                    <span className="text-primary-400">Sepolia Test Network</span>
                  </div>
                  <div className="flex items-center justify-between bg-dark-600 p-3 rounded">
                    <span className="text-white font-mono text-sm">RPC URL:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400 font-mono text-sm">{rpcUrl}</span>
                      <button
                        onClick={() => copyToClipboard(rpcUrl)}
                        className="text-dark-400 hover:text-white transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-dark-600 p-3 rounded">
                    <span className="text-white font-mono text-sm">Chain ID:</span>
                    <span className="text-primary-400">11155111</span>
                  </div>
                  <div className="flex items-center justify-between bg-dark-600 p-3 rounded">
                    <span className="text-white font-mono text-sm">Currency Symbol:</span>
                    <span className="text-primary-400">ETH</span>
                  </div>
                  <div className="flex items-center justify-between bg-dark-600 p-3 rounded">
                    <span className="text-white font-mono text-sm">Block Explorer:</span>
                    <span className="text-primary-400">https://sepolia.etherscan.io</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Step 2: Switch to Sepolia</h3>
              <div className="bg-dark-700 p-4 rounded-lg">
                <p className="text-dark-300 mb-3">
                  Make sure your MetaMask is connected to the Sepolia network:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-dark-300">
                  <li>Open MetaMask extension</li>
                  <li>Click on the network dropdown at the top</li>
                  <li>Select &quot;Sepolia Test Network&quot;</li>
                  <li>If you don&apos;t see it, add it using the details above</li>
                </ol>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Step 3: Get Test ETH</h3>
              <div className="bg-dark-700 p-4 rounded-lg">
                <p className="text-dark-300 mb-3">
                  For testing, you need Sepolia testnet ETH:
                </p>
                <div className="space-y-3">
                  <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded">
                    <p className="text-blue-200 text-sm">
                      <strong>Option 1:</strong> Use your existing MetaMask account
                      <br />
                      Get test ETH from <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-300">Sepolia Faucet</a>
                    </p>
                  </div>
                  <div className="bg-green-900/20 border border-green-500/30 p-3 rounded">
                    <p className="text-green-200 text-sm">
                      <strong>Option 2:</strong> Create a new test account
                      <br />
                      Generate a new wallet in MetaMask for testing
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary-500/20 border border-primary-500 p-4 rounded-lg">
              <p className="text-primary-400 text-sm">
                <strong>Note:</strong> This is a test account with test ETH. Never use this private key on mainnet!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
