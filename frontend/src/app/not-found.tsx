import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <Header />
      
      <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="container-custom text-center max-w-lg">
          <div className="text-9xl font-bold gradient-text mb-8">404</div>
          <h1 className="text-3xl font-bold text-white mb-4">Page Not Found</h1>
          <p className="text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/" className="btn-primary btn-lg flex items-center gap-2">
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
            <Link href="/campaigns" className="btn-outline btn-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Browse Campaigns
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
