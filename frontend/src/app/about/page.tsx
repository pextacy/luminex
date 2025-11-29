import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Zap, Shield, Globe, Users, Clock, Heart, CheckCircle } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Sub-Second Finality',
    description: 'Powered by Somnia blockchain with over 1 million TPS and sub-second transaction finality.',
  },
  {
    icon: Shield,
    title: 'Fully Transparent',
    description: 'All donations are recorded on-chain and verifiable. No hidden fees or intermediaries.',
  },
  {
    icon: Globe,
    title: 'Global Scale',
    description: 'Support campaigns worldwide with minimal transaction fees and instant processing.',
  },
  {
    icon: Users,
    title: 'Real-Time Updates',
    description: 'See donations appear instantly with Somnia Data Streams synchronizing all connected users.',
  },
  {
    icon: Clock,
    title: 'Instant Impact',
    description: 'Your donation reaches campaigns immediately with no waiting or processing delays.',
  },
  {
    icon: Heart,
    title: 'Verified Campaigns',
    description: 'All campaigns are verified to ensure your donations go to legitimate causes.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Connect Your Wallet',
    description: 'Connect your Somnia-compatible wallet to get started. We support MetaMask and other popular wallets.',
  },
  {
    number: '02',
    title: 'Choose a Campaign',
    description: 'Browse verified campaigns across categories like disaster relief, medical aid, and education.',
  },
  {
    number: '03',
    title: 'Make Your Donation',
    description: 'Enter your donation amount and an optional message. Confirm the transaction in your wallet.',
  },
  {
    number: '04',
    title: 'See Instant Impact',
    description: 'Watch your donation appear in real-time on the campaign page. Track the progress as it happens.',
  },
];

const faqs = [
  {
    question: 'What is Luminex?',
    answer: 'Luminex is a decentralized crowdfunding platform built on Somnia blockchain. It enables instant, transparent donations to verified campaigns worldwide.',
  },
  {
    question: 'How are donations processed?',
    answer: 'All donations are processed directly on the Somnia blockchain. This means instant settlement, full transparency, and no intermediaries taking a cut.',
  },
  {
    question: 'What wallet do I need?',
    answer: 'You can use any EVM-compatible wallet like MetaMask. Just add the Somnia network and you\'re ready to donate.',
  },
  {
    question: 'Are donations refundable?',
    answer: 'Blockchain transactions are irreversible by design. Please verify your donation amount before confirming.',
  },
  {
    question: 'How are campaigns verified?',
    answer: 'Campaigns go through a verification process to ensure legitimacy. Verified campaigns display a checkmark badge.',
  },
  {
    question: 'What are the fees?',
    answer: 'Luminex charges no platform fees. You only pay minimal gas fees for blockchain transactions.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      
      <main className="min-h-screen pt-24 pb-16">
        {/* Hero */}
        <section className="container-custom text-center mb-20">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            How <span className="gradient-text">Luminex</span> Works
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Experience the future of crowdfunding with blockchain-powered transparency, 
            real-time updates, and global scale.
          </p>
        </section>

        {/* How It Works */}
        <section className="container-custom mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Start Donating in 4 Simple Steps
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary-500 to-transparent" />
                )}
                <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-primary-500/50 transition-colors h-full">
                  <div className="text-4xl font-bold gradient-text mb-4">{step.number}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-900/50 py-20 mb-20">
          <div className="container-custom">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              Why Choose Luminex?
            </h2>
            <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
              Built on cutting-edge blockchain technology for the best crowdfunding experience.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-primary-500/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Somnia Section */}
        <section className="container-custom mb-20">
          <div className="rounded-3xl gradient-bg p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Powered by Somnia Blockchain
              </h2>
              <p className="text-lg text-white/80 max-w-3xl mx-auto mb-8">
                Somnia is a next-generation Layer-1 blockchain capable of processing over 
                1 million transactions per second with sub-second finality. This enables 
                Luminex to deliver instant, real-time donation experiences at global scale.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">1M+</p>
                  <p className="text-white/70">TPS</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">&lt;1s</p>
                  <p className="text-white/70">Finality</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">~$0.001</p>
                  <p className="text-white/70">Avg Gas Fee</p>
                </div>
              </div>
              <a
                href="https://somnia.network"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-8 btn bg-white text-gray-900 hover:bg-gray-100 btn-lg"
              >
                Learn More About Somnia
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container-custom mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
              >
                <h3 className="text-lg font-semibold text-white mb-2 flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-500 flex-shrink-0 mt-0.5" />
                  {faq.question}
                </h3>
                <p className="text-gray-400 pl-9">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-custom">
          <div className="text-center p-12 rounded-3xl bg-gray-900/50 border border-gray-800">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Make a Difference?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of donors supporting causes worldwide with instant, transparent donations.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/campaigns" className="btn-primary btn-xl">
                Explore Campaigns
              </Link>
              <Link href="/" className="btn-outline btn-xl">
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
