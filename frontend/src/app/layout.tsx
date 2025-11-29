import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Luminex - Real-Time Decentralized Crowdfunding',
  description: 'Donate to global causes with instant feedback, powered by Somnia blockchain and real-time data streams.',
  keywords: ['crowdfunding', 'blockchain', 'somnia', 'donation', 'charity', 'decentralized'],
  authors: [{ name: 'Luminex Team' }],
  openGraph: {
    title: 'Luminex - Real-Time Decentralized Crowdfunding',
    description: 'Donate to global causes with instant feedback, powered by Somnia blockchain.',
    url: 'https://luminex.app',
    siteName: 'Luminex',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luminex - Real-Time Decentralized Crowdfunding',
    description: 'Donate to global causes with instant feedback, powered by Somnia blockchain.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-white min-h-screen`}>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#fff',
                borderRadius: '12px',
                border: '1px solid #374151',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
