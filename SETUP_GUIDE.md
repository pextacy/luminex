# Luminex Setup Guide

This guide will help you set up and run the Luminex platform.

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- Git

## 1. Install Dependencies

You need to install dependencies for both the backend and frontend.

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## 2. Environment Setup

### Backend
Create a `.env` file in the `backend` directory based on the example below:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/luminex?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Blockchain (Somnia Testnet)
BLOCKCHAIN_RPC_URL="https://dream-rpc.somnia.network"
VAULT_CONTRACT_ADDRESS="0x..." # You will get this after deployment
PRIVATE_KEY="your_private_key_here" # For deployment and transactions

# JWT
JWT_SECRET="your_jwt_secret_key_change_this"
JWT_EXPIRES_IN="24h"

# SDS (Somnia Data Streams)
SDS_ENDPOINT="wss://sds.somnia.network"
```

### Frontend
Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_CHAIN_ID=50311
NEXT_PUBLIC_RPC_URL=https://dream-rpc.somnia.network
```

## 3. Start Infrastructure

Start PostgreSQL and Redis using Docker:

```bash
# From the root directory
docker-compose up -d
```

## 4. Database Setup

Run Prisma migrations to set up the database schema:

```bash
cd backend
npm run prisma:migrate
npm run prisma:seed # Optional: Seeds the database with initial data
```

## 5. Smart Contract Deployment

Deploy the LuminexVault contract to the Somnia Testnet:

```bash
cd contracts
npm install
# Configure hardhat.config.js with your private key if needed
npx hardhat run scripts/deploy.js --network somnia
```

Copy the deployed contract address and update `VAULT_CONTRACT_ADDRESS` in `backend/.env`.

## 6. Run the Application

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

- **WebSocket Connection Failed**: Ensure the backend is running and `NEXT_PUBLIC_WS_URL` is correct.
- **Database Errors**: Check if Docker containers are running (`docker ps`).
- **Blockchain Errors**: Ensure you have funds in your wallet for the Somnia Testnet.
