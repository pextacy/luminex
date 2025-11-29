import { ethers, Contract, Provider, JsonRpcProvider } from 'ethers';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';
import { redis, CacheKeys } from '../db/redis.js';
import { blockchainLogger, reconciliationLogger } from '../utils/logger.js';
import { RealtimeCampaignUpdateEvent } from '../types/index.js';

// LuminexVault ABI (events we care about)
const VAULT_ABI = [
  'event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount, string message)',
  'event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 targetAmount)',
  'event CampaignCompleted(uint256 indexed campaignId)',
  'event FundsWithdrawn(uint256 indexed campaignId, address indexed to, uint256 amount)',
  
  'function getCampaign(uint256 campaignId) view returns (uint256 totalDonations, uint256 donorCount, bool isActive)',
  'function getDonorContribution(uint256 campaignId, address donor) view returns (uint256)',
];

interface DonationReceivedEvent {
  campaignId: bigint;
  donor: string;
  amount: bigint;
  message: string;
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: number;
}

class BlockchainService {
  private provider: JsonRpcProvider;
  private contract: Contract | null = null;
  private isListening: boolean = false;
  private lastProcessedBlock: number = 0;

  constructor() {
    this.provider = new JsonRpcProvider(config.blockchain.rpcUrl);
  }

  async initialize(): Promise<void> {
    try {
      // Verify connection
      const network = await this.provider.getNetwork();
      blockchainLogger.info({ 
        chainId: network.chainId.toString(),
        rpcUrl: config.blockchain.rpcUrl,
      }, 'Connected to blockchain');

      // Initialize contract if address is set
      if (config.blockchain.vaultAddress && 
          config.blockchain.vaultAddress !== '0x0000000000000000000000000000000000000000') {
        this.contract = new Contract(
          config.blockchain.vaultAddress,
          VAULT_ABI,
          this.provider
        );
        blockchainLogger.info({ 
          address: config.blockchain.vaultAddress 
        }, 'Vault contract initialized');
      } else {
        blockchainLogger.warn('Vault contract address not configured');
      }

    } catch (error) {
      blockchainLogger.error({ error }, 'Failed to initialize blockchain service');
      throw error;
    }
  }

  async startEventListener(): Promise<void> {
    if (!this.contract) {
      blockchainLogger.warn('Cannot start listener - contract not initialized');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.isListening = true;

    // Listen for DonationReceived events
    this.contract.on('DonationReceived', async (campaignId, donor, amount, message, event) => {
      try {
        const txReceipt = await event.getTransactionReceipt();
        const block = await event.getBlock();

        const donationEvent: DonationReceivedEvent = {
          campaignId: campaignId,
          donor: donor,
          amount: amount,
          message: message,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: block.timestamp,
        };

        await this.processDonationConfirmation(donationEvent);
        
      } catch (error) {
        blockchainLogger.error({ 
          error, 
          transactionHash: event.transactionHash 
        }, 'Error processing donation event');
      }
    });

    // Listen for CampaignCompleted events
    this.contract.on('CampaignCompleted', async (campaignId, event) => {
      try {
        await this.handleCampaignCompleted(campaignId.toString(), event.transactionHash);
      } catch (error) {
        blockchainLogger.error({ error }, 'Error processing campaign completed event');
      }
    });

    // Listen for FundsWithdrawn events
    this.contract.on('FundsWithdrawn', async (campaignId, to, amount, event) => {
      try {
        await this.handleWithdrawal(
          campaignId.toString(),
          to,
          amount.toString(),
          event.transactionHash,
          event.blockNumber
        );
      } catch (error) {
        blockchainLogger.error({ error }, 'Error processing withdrawal event');
      }
    });

    blockchainLogger.info('Blockchain event listener started');
  }

  async stopEventListener(): Promise<void> {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
    this.isListening = false;
    blockchainLogger.info('Blockchain event listener stopped');
  }

  private async processDonationConfirmation(event: DonationReceivedEvent): Promise<void> {
    const txHash = event.transactionHash;

    // Find the pending donation
    const donation = await prisma.donation.findUnique({
      where: { txHash },
      include: { campaign: true },
    });

    if (!donation) {
      // This might be a donation we didn't receive via SDS - create it
      reconciliationLogger.info({ txHash }, 'On-chain donation not found in DB, creating...');
      
      const campaign = await prisma.campaign.findUnique({
        where: { onChainId: event.campaignId.toString() },
      });

      if (!campaign) {
        reconciliationLogger.error({ 
          campaignOnChainId: event.campaignId.toString() 
        }, 'Campaign not found for on-chain donation');
        return;
      }

      await prisma.donation.create({
        data: {
          txHash,
          campaignId: campaign.id,
          donorAddress: event.donor.toLowerCase(),
          amount: event.amount.toString(),
          message: event.message || null,
          status: 'CONFIRMED',
          blockNumber: BigInt(event.blockNumber),
          blockTimestamp: new Date(event.blockTimestamp * 1000),
          confirmedAt: new Date(),
        },
      });

      // Update campaign totals
      await this.updateCampaignTotals(campaign.id, event.amount.toString());
      
      return;
    }

    // Update existing donation to CONFIRMED
    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: 'CONFIRMED',
        blockNumber: BigInt(event.blockNumber),
        blockTimestamp: new Date(event.blockTimestamp * 1000),
        confirmedAt: new Date(),
      },
    });

    // Update campaign totals
    await this.updateCampaignTotals(donation.campaignId, event.amount.toString());

    reconciliationLogger.info({ 
      donationId: donation.id,
      txHash,
      blockNumber: event.blockNumber,
    }, 'Donation confirmed on-chain');
  }

  private async updateCampaignTotals(campaignId: string, amountWei: string): Promise<void> {
    // Update campaign current amount and donor count
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        currentAmount: { increment: BigInt(amountWei) },
        donorCount: { increment: 1 },
      },
    });

    // Calculate progress
    const progress = Number(campaign.currentAmount) / Number(campaign.targetAmount) * 100;

    // Update cache
    const updateEvent: RealtimeCampaignUpdateEvent = {
      type: 'campaign_update',
      data: {
        campaignId,
        currentAmount: campaign.currentAmount.toString(),
        donorCount: campaign.donorCount,
        progress: Math.min(progress, 100),
      },
    };

    await redis.publish('campaign_updates', updateEvent);

    // Invalidate campaign cache
    await redis.del(CacheKeys.campaign(campaignId));
    await redis.delPattern(CacheKeys.campaignList('*'));

    // Check if campaign reached target
    if (Number(campaign.currentAmount) >= Number(campaign.targetAmount)) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED' },
      });
      blockchainLogger.info({ campaignId }, 'Campaign reached target, marked as completed');
    }
  }

  private async handleCampaignCompleted(onChainId: string, txHash: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { onChainId },
    });

    if (!campaign) {
      blockchainLogger.warn({ onChainId }, 'Campaign not found for completion event');
      return;
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'COMPLETED' },
    });

    // Invalidate caches
    await redis.del(CacheKeys.campaign(campaign.id));
    await redis.delPattern(CacheKeys.campaignList('*'));

    blockchainLogger.info({ campaignId: campaign.id, txHash }, 'Campaign marked as completed');
  }

  private async handleWithdrawal(
    onChainId: string,
    toAddress: string,
    amount: string,
    txHash: string,
    blockNumber: number
  ): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { onChainId },
    });

    if (!campaign) {
      blockchainLogger.warn({ onChainId }, 'Campaign not found for withdrawal event');
      return;
    }

    // Update any pending withdrawal with matching details
    await prisma.withdrawal.updateMany({
      where: {
        campaignId: campaign.id,
        toAddress: toAddress.toLowerCase(),
        amount: amount,
        status: 'PROCESSING',
      },
      data: {
        status: 'COMPLETED',
        txHash,
        blockNumber: BigInt(blockNumber),
        processedAt: new Date(),
      },
    });

    blockchainLogger.info({ 
      campaignId: campaign.id, 
      amount, 
      txHash 
    }, 'Withdrawal processed');
  }

  // ==========================================
  // RECONCILIATION
  // ==========================================

  async runReconciliation(): Promise<void> {
    reconciliationLogger.info('Starting reconciliation run...');

    // Find donations that are still pending after the timeout
    const orphanTimeout = new Date(Date.now() - config.reconciliation.orphanTimeoutMs);
    
    const pendingDonations = await prisma.donation.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: orphanTimeout },
      },
      include: { campaign: true },
    });

    for (const donation of pendingDonations) {
      try {
        // Check if transaction exists on-chain
        const receipt = await this.provider.getTransactionReceipt(donation.txHash);

        if (receipt) {
          if (receipt.status === 1) {
            // Transaction succeeded - mark as confirmed
            await prisma.donation.update({
              where: { id: donation.id },
              data: {
                status: 'CONFIRMED',
                blockNumber: BigInt(receipt.blockNumber),
                confirmedAt: new Date(),
              },
            });
            
            await this.updateCampaignTotals(donation.campaignId, donation.amount.toString());
            
            reconciliationLogger.info({ 
              donationId: donation.id 
            }, 'Orphan donation reconciled as confirmed');
          } else {
            // Transaction failed
            await prisma.donation.update({
              where: { id: donation.id },
              data: { status: 'FAILED' },
            });
            
            reconciliationLogger.info({ 
              donationId: donation.id 
            }, 'Orphan donation marked as failed');
          }
        } else {
          // No receipt - mark as orphaned
          await prisma.donation.update({
            where: { id: donation.id },
            data: { status: 'ORPHANED' },
          });
          
          reconciliationLogger.warn({ 
            donationId: donation.id,
            txHash: donation.txHash,
          }, 'Donation marked as orphaned - no on-chain record');
        }
      } catch (error) {
        reconciliationLogger.error({ 
          error, 
          donationId: donation.id 
        }, 'Error reconciling donation');
      }
    }

    reconciliationLogger.info({ 
      processed: pendingDonations.length 
    }, 'Reconciliation run completed');
  }

  startReconciliationLoop(): void {
    setInterval(async () => {
      try {
        await this.runReconciliation();
      } catch (error) {
        reconciliationLogger.error({ error }, 'Reconciliation loop error');
      }
    }, config.reconciliation.checkIntervalMs);

    reconciliationLogger.info({ 
      intervalMs: config.reconciliation.checkIntervalMs 
    }, 'Reconciliation loop started');
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async getTransactionStatus(txHash: string): Promise<{
    exists: boolean;
    confirmed: boolean;
    blockNumber?: number;
    status?: number;
  }> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return { exists: false, confirmed: false };
    }

    return {
      exists: true,
      confirmed: receipt.status === 1,
      blockNumber: receipt.blockNumber,
      status: receipt.status ?? undefined,
    };
  }

  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  getProvider(): Provider {
    return this.provider;
  }

  getContract(): Contract | null {
    return this.contract;
  }

  isConnected(): boolean {
    return this.provider !== null;
  }
}

export const blockchainService = new BlockchainService();
export default blockchainService;
