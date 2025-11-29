# Luminex Backend

Real-time decentralized crowdfunding platform powered by Somnia Blockchain and SDS (Somnia Data Streams).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LUMINEX ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────────────────────────────────────┐    │
│  │   Somnia    │────▶│              SDS (Fast Lane)                │    │
│  │ Blockchain  │     │   Real-time event broadcasting (~50ms)      │    │
│  │             │     └──────────────────────┬──────────────────────┘    │
│  │ Settlement  │                            │                           │
│  │   Layer     │     ┌──────────────────────▼──────────────────────┐    │
│  │             │────▶│         Backend API (Intelligence)          │    │
│  └─────────────┘     │  • Express REST API                         │    │
│        │             │  • SDS WebSocket Listener                   │    │
│        │             │  • Blockchain Reconciliation                │    │
│        ▼             │  • PostgreSQL + Redis                       │    │
│  ┌─────────────┐     └──────────────────────┬──────────────────────┘    │
│  │ LuminexVault│                            │                           │
│  │   Contract  │                            ▼                           │
│  │             │     ┌─────────────────────────────────────────────┐    │
│  │ • donate()  │     │         WebSocket Clients                   │    │
│  │ • withdraw()│     │    Real-time updates to Frontend            │    │
│  │ • campaigns │     └─────────────────────────────────────────────┘    │
│  └─────────────┘                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Blockchain**: Somnia L1 (EVM-compatible)
- **Real-time**: SDS WebSocket + Custom WebSocket Server
- **Validation**: Zod
- **Logging**: Pino
- **Authentication**: JWT + API Keys + RBAC

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm, npm, or yarn

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT signing (generate with `openssl rand -hex 32`)
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `SOMNIA_RPC_URL`: Somnia blockchain RPC endpoint
- `SOMNIA_WSS_URL`: Somnia WebSocket endpoint
- `VAULT_CONTRACT_ADDRESS`: Deployed LuminexVault contract address
- `SDS_WS_URL`: SDS WebSocket URL

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database
npx prisma db seed

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/health/detailed` | Detailed system status |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/admin/login` | Admin login |
| POST | `/api/auth/admin/refresh` | Refresh tokens |
| POST | `/api/auth/admin/logout` | Admin logout |
| POST | `/api/auth/api-key/generate` | Generate API key |
| POST | `/api/auth/api-key/validate` | Validate API key |
| DELETE | `/api/auth/api-key/:key` | Revoke API key |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/:id` | Get category by ID |

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List organizations |
| GET | `/api/organizations/:id` | Get organization |
| GET | `/api/organizations/:id/campaigns` | Get org campaigns |
| POST | `/api/organizations` | Create organization |
| PUT | `/api/organizations/:id` | Update organization |
| POST | `/api/organizations/:id/verify` | Verify organization |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns |
| GET | `/api/campaigns/featured` | Get featured campaigns |
| GET | `/api/campaigns/recent` | Get recent campaigns |
| GET | `/api/campaigns/:id` | Get campaign |
| GET | `/api/campaigns/:id/donations` | Get campaign donations |
| GET | `/api/campaigns/:id/stats` | Get campaign stats |
| POST | `/api/campaigns` | Create campaign |
| PUT | `/api/campaigns/:id` | Update campaign |
| POST | `/api/campaigns/:id/feature` | Feature campaign |

### Donations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/donations` | List donations |
| GET | `/api/donations/recent` | Recent donations |
| GET | `/api/donations/leaderboard` | Top donors |
| GET | `/api/donations/:id` | Get donation |
| GET | `/api/donations/donor/:address` | Donor history |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Platform overview |
| GET | `/api/analytics/live` | Live activity |
| GET | `/api/analytics/trends` | Donation trends |
| GET | `/api/analytics/categories` | Category breakdown |
| GET | `/api/analytics/timeline` | Activity timeline |
| GET | `/api/analytics/daily/:campaignId?` | Daily stats |
| GET | `/api/analytics/monthly/:campaignId?` | Monthly stats |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Admin dashboard |
| GET | `/api/admin/users` | List admin users |
| POST | `/api/admin/users` | Create admin user |
| PUT | `/api/admin/users/:id` | Update admin user |
| DELETE | `/api/admin/users/:id` | Delete admin user |
| GET | `/api/admin/audit` | Audit logs |
| POST | `/api/admin/system/pause` | Pause system |
| POST | `/api/admin/system/resume` | Resume system |
| GET | `/api/admin/sds/status` | SDS connection status |
| POST | `/api/admin/sds/reconnect` | Force SDS reconnect |
| GET | `/api/admin/pending` | Pending donations |
| POST | `/api/admin/reconcile` | Force reconciliation |

## WebSocket Events

Connect to `ws://localhost:3001` for real-time updates.

### Subscribe to Events
```javascript
// Subscribe to all donations
ws.send(JSON.stringify({ type: 'subscribe', channel: 'donations' }));

// Subscribe to specific campaign
ws.send(JSON.stringify({ 
  type: 'subscribe', 
  channel: 'campaign', 
  campaignId: 'uuid' 
}));

// Subscribe to live stats
ws.send(JSON.stringify({ type: 'subscribe', channel: 'stats' }));
```

### Incoming Events
```javascript
// New donation
{ type: 'donation', data: { ... } }

// Campaign update
{ type: 'campaign_update', data: { ... } }

// Campaign completed
{ type: 'campaign_completed', data: { ... } }

// Live stats
{ type: 'stats', data: { ... } }
```

## Authentication

### JWT Authentication
Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### API Key Authentication
Include the API key in the X-API-Key header:
```
X-API-Key: <your-api-key>
```

## Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Full access to all resources |
| ADMIN | Manage campaigns, donations, organizations |
| MODERATOR | Review and approve content |
| VIEWER | Read-only access to admin panel |

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
├── src/
│   ├── config/            # Configuration
│   ├── controllers/       # Route handlers
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── campaigns/
│   │   ├── categories/
│   │   ├── donations/
│   │   └── organizations/
│   ├── db/                # Database clients
│   │   ├── prisma.ts
│   │   └── redis.ts
│   ├── middleware/        # Express middleware
│   │   └── auth.ts
│   ├── routes/            # Route definitions
│   ├── services/          # Business logic
│   │   ├── blockchain.ts  # Blockchain interaction
│   │   ├── sds-listener.ts # SDS event subscription
│   │   └── websocket.ts   # WebSocket server
│   ├── types/             # TypeScript types
│   │   ├── index.ts
│   │   └── schemas.ts     # Zod schemas
│   ├── utils/             # Utilities
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   └── response.ts
│   └── server.ts          # Entry point
├── .env.example
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Docker Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose up -d
```

## Smart Contract

The LuminexVault contract is located in `/contracts/LuminexVault.sol`.

### Deploy Contract
```bash
cd ..
npm install  # Install Hardhat dependencies
npx hardhat compile
npx hardhat run scripts/deploy.js --network somnia
```

Update the `VAULT_CONTRACT_ADDRESS` in your `.env` file with the deployed address.

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Scripts

```bash
npm run dev           # Start development server with hot reload
npm run build         # Build for production
npm run start         # Start production server
npm run prisma:studio # Open Prisma Studio
npm run lint          # Run ESLint
npm run typecheck     # TypeScript type checking
```

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check `DATABASE_URL` format: `postgresql://user:pass@host:5432/db`
3. Run `npx prisma migrate reset` to reset database

### SDS Connection Issues
1. Check `SDS_WS_URL` is correct
2. Verify network connectivity
3. Check admin dashboard for SDS status

### Blockchain Sync Issues
1. Verify `SOMNIA_RPC_URL` is accessible
2. Check contract address is correct
3. Use admin endpoint to force reconciliation

## License

MIT
