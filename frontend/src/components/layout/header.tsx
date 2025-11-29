'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Wallet, ChevronDown, ExternalLink } from 'lucide-react';
import { useWallet } from '@/lib/wallet/provider';
import { shortenAddress } from '@/lib/utils';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const { isConnected, isConnecting, address, balance, connect, disconnect } = useWallet();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <nav className="container-custom">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all duration-300">
              <span className="text-2xl font-bold text-white">L</span>
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">Luminex</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-white font-medium transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-500 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-primary-500 transition-all duration-200"
                >
                  <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-200">
                    {shortenAddress(address || '')}
                  </span>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-gray-400 transition-transform duration-200",
                    walletDropdownOpen && "rotate-180"
                  )} />
                </button>

                <AnimatePresence>
                  {walletDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-64 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-800">
                        <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                        <p className="text-sm font-mono text-gray-200">{shortenAddress(address || '', 8)}</p>
                      </div>
                      <div className="p-4 border-b border-gray-800">
                        <p className="text-xs text-gray-500 mb-1">Balance</p>
                        <p className="text-lg font-bold text-white">{parseFloat(balance || '0').toFixed(4)} STT</p>
                      </div>
                      <div className="p-2">
                        <Link
                          href={`/profile/${address}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                          onClick={() => setWalletDropdownOpen(false)}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Profile
                        </Link>
                        <button
                          onClick={() => {
                            disconnect();
                            setWalletDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-danger-500/10 text-danger-400 hover:text-danger-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Disconnect
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="btn-primary btn-md flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-800 overflow-hidden"
            >
              <div className="py-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
