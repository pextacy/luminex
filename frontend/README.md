# Luminex Frontend

Real-time decentralized crowdfunding platform built with Next.js 14 and powered by Somnia blockchain.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: React Query
- **Blockchain**: ethers.js v6
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Features

- 🔗 Wallet connection (MetaMask, WalletConnect)
- 💸 Real-time donation processing
- 📊 Live campaign progress tracking
- 🏆 Donor leaderboards
- 🔔 Real-time WebSocket updates
- 📱 Fully responsive design
- ✨ Smooth animations

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend server running (see `/backend`)

## Getting Started

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x...
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Homepage
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   ├── about/              # About page
│   │   ├── campaigns/          # Campaign pages
│   │   │   ├── page.tsx        # Campaigns list
│   │   │   └── [id]/           # Campaign detail
│   │   ├── dashboard/          # User dashboard
│   │   └── leaderboard/        # Leaderboard page
│   ├── components/             # React components
│   │   ├── layout/             # Header, Footer
│   │   ├── campaigns/          # Campaign components
│   │   ├── donations/          # Donation components
│   │   └── leaderboard/        # Leaderboard components
│   └── lib/                    # Utilities and providers
│       ├── api.ts              # API client
│       ├── config.ts           # Configuration
│       ├── types.ts            # TypeScript types
│       ├── utils.ts            # Utility functions
│       ├── wallet/             # Wallet provider
│       └── websocket/          # WebSocket provider
├── public/                     # Static assets
├── tailwind.config.js          # Tailwind configuration
├── next.config.js              # Next.js configuration
└── tsconfig.json               # TypeScript configuration
```

## Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## Somnia Network

This app connects to the Somnia Testnet:

| Property | Value |
|----------|-------|
| Network Name | Somnia Testnet |
| Chain ID | 50311 |
| RPC URL | https://dream-rpc.somnia.network |
| Currency | STT |
| Explorer | https://somnia-testnet.socialscan.io |

### Adding Somnia to MetaMask

The app will automatically prompt to add the Somnia network when connecting.

## Wallet Integration

The wallet provider (`src/lib/wallet/provider.tsx`) handles:

- MetaMask connection
- Network switching
- Balance queries
- Transaction signing
- Donation processing

## Real-time Updates

WebSocket integration (`src/lib/websocket/provider.tsx`) provides:

- Live donation feed
- Campaign progress updates
- Global statistics
- Auto-reconnection

## Styling

The app uses a custom Tailwind theme with:

- **Primary**: Blue gradient (`#3b82f6` to `#8b5cf6`)
- **Accent**: Purple tones
- **Success**: Green for positive states
- **Dark**: Dark background theme

Custom CSS classes are defined in `globals.css`:
- `.gradient-bg` - Gradient backgrounds
- `.gradient-text` - Gradient text
- `.btn-*` - Button variants
- `.container-custom` - Responsive container
- `.animate-*` - Custom animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License
