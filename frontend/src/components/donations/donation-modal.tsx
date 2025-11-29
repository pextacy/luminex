'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Heart, Loader2, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { useWallet } from '@/lib/wallet/provider';
import { DONATION_PRESETS } from '@/lib/config';
import { formatAmount, cn } from '@/lib/utils';
import type { Campaign } from '@/lib/types';
import toast from 'react-hot-toast';

interface DonationModalProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
}

type DonationStep = 'amount' | 'confirm' | 'processing' | 'success' | 'error';

export function DonationModal({ campaign, isOpen, onClose, onSuccess }: DonationModalProps) {
  const { isConnected, address, balance, connect, donate } = useWallet();
  const [step, setStep] = useState<DonationStep>('amount');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const handleAmountSelect = (preset: string) => {
    setAmount(preset);
  };

  const handleDonate = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance || '0')) {
      toast.error('Insufficient balance');
      return;
    }

    setStep('processing');
    setError('');

    try {
      const hash = await donate(campaign.onChainId, amount, message);
      setTxHash(hash);
      setStep('success');
      onSuccess?.(hash);
      toast.success('Donation successful! 🎉');
    } catch (err) {
      console.error('Donation error:', err);
      setError(err instanceof Error ? err.message : 'Donation failed');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('amount');
    setAmount('');
    setMessage('');
    setTxHash('');
    setError('');
    onClose();
  };

  const renderContent = () => {
    switch (step) {
      case 'amount':
        return (
          <>
            {/* Amount Selection */}
            <div className="mb-6">
              <label className="label">Select Amount</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {DONATION_PRESETS.map((preset) => (
                  <button
                    key={preset.amount}
                    onClick={() => handleAmountSelect(preset.amount)}
                    className={cn(
                      "py-3 px-4 rounded-xl border-2 font-medium transition-all",
                      amount === preset.amount
                        ? "border-primary-500 bg-primary-500/10 text-primary-400"
                        : "border-gray-700 hover:border-gray-600 text-gray-300"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter custom amount"
                  className="input pr-16"
                  step="0.01"
                  min="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  STT
                </span>
              </div>
              
              {balance && (
                <p className="mt-2 text-sm text-gray-500">
                  Your balance: <span className="text-gray-300">{parseFloat(balance).toFixed(4)} STT</span>
                </p>
              )}
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className="label">Leave a message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a supportive message..."
                className="input resize-none h-24"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {message.length}/200
              </p>
            </div>

            {/* Donate Button */}
            <button
              onClick={handleDonate}
              disabled={!amount || parseFloat(amount) <= 0}
              className="btn-primary btn-lg w-full flex items-center justify-center gap-2"
            >
              {isConnected ? (
                <>
                  <Heart className="w-5 h-5" />
                  Donate {amount && `${amount} STT`}
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Connect Wallet to Donate
                </>
              )}
            </button>
          </>
        );

      case 'processing':
        return (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Processing Donation</h3>
            <p className="text-gray-400">
              Please confirm the transaction in your wallet...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 mx-auto mb-6 rounded-full bg-success-500/20 flex items-center justify-center"
            >
              <CheckCircle className="w-8 h-8 text-success-500" />
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">Thank You! 🎉</h3>
            <p className="text-gray-400 mb-6">
              Your donation of <span className="text-white font-medium">{amount} STT</span> has been sent successfully!
            </p>
            
            {txHash && (
              <a
                href={`https://somnia-devnet.socialscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
              >
                View transaction <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={handleClose}
              className="btn-primary btn-lg w-full mt-8"
            >
              Done
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-danger-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-danger-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Transaction Failed</h3>
            <p className="text-gray-400 mb-6">
              {error || 'Something went wrong. Please try again.'}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="btn-secondary btn-lg flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('amount')}
                className="btn-primary btn-lg flex-1"
              >
                Try Again
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-50"
          >
            <div className="card p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Donate to Campaign</h2>
                  <p className="text-sm text-gray-400 truncate max-w-[250px]">{campaign.title}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
