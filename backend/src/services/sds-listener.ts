import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';
import { redis, CacheKeys } from '../db/redis.js';
import { sdsLogger } from '../utils/logger.js';
import { DonationEventSchema, DonationEvent } from '../types/schemas.js';
import { SdsConnectionState, RealtimeDonationEvent } from '../types/index.js';
import { EventEmitter } from 'events';

// SDS Event types from the stream
interface RawSdsEvent {
  id: string;
  type: string;
  streamId: string;
  payload: unknown;
  timestamp: number;
}

class SdsListenerService extends EventEmitter {
  private ws: WebSocket | null = null;
  private state: SdsConnectionState = {
    connected: false,
    reconnectAttempts: 0,
    subscribedStreams: [],
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pendingSubscriptions: Set<string> = new Set();

  constructor() {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(config.sds.endpoint);
        if (config.sds.apiKey) {
          wsUrl.searchParams.set('apiKey', config.sds.apiKey);
        }

        sdsLogger.info({ endpoint: config.sds.endpoint }, 'Connecting to SDS...');
        
        this.ws = new WebSocket(wsUrl.toString());

        this.ws.on('open', () => {
          sdsLogger.info('Connected to SDS');
          this.state.connected = true;
          this.state.reconnectAttempts = 0;
          this.state.lastConnectedAt = new Date();
          
          this.startHeartbeat();
          this.resubscribeToStreams();
          
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', (code, reason) => {
          sdsLogger.warn({ code, reason: reason.toString() }, 'SDS connection closed');
          this.handleDisconnect();
        });

        this.ws.on('error', (error) => {
          sdsLogger.error({ error: error.message }, 'SDS WebSocket error');
          this.state.lastError = error.message;
          this.emit('error', error);
          
          if (!this.state.connected) {
            reject(error);
          }
        });

      } catch (error) {
        sdsLogger.error({ error }, 'Failed to connect to SDS');
        reject(error);
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleDisconnect(): void {
    this.state.connected = false;
    this.stopHeartbeat();
    this.emit('disconnected');
    
    // Attempt reconnection
    if (this.state.reconnectAttempts < config.sds.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      sdsLogger.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      config.sds.reconnectInterval * Math.pow(2, this.state.reconnectAttempts),
      60000 // Max 60 seconds
    );

    sdsLogger.info({ 
      attempt: this.state.reconnectAttempts + 1, 
      delayMs: delay 
    }, 'Scheduling reconnection...');

    this.reconnectTimer = setTimeout(async () => {
      this.state.reconnectAttempts++;
      try {
        await this.connect();
      } catch (error) {
        sdsLogger.error({ error }, 'Reconnection failed');
        this.scheduleReconnect();
      }
    }, delay);
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'event':
          await this.handleEvent(message as RawSdsEvent);
          break;
        case 'subscribed':
          sdsLogger.info({ streamId: message.streamId }, 'Subscribed to stream');
          if (!this.state.subscribedStreams.includes(message.streamId)) {
            this.state.subscribedStreams.push(message.streamId);
          }
          break;
        case 'unsubscribed':
          sdsLogger.info({ streamId: message.streamId }, 'Unsubscribed from stream');
          this.state.subscribedStreams = this.state.subscribedStreams.filter(
            s => s !== message.streamId
          );
          break;
        case 'error':
          sdsLogger.error({ error: message.error }, 'SDS error message');
          break;
        case 'pong':
          // Heartbeat response
          break;
        default:
          sdsLogger.debug({ type: message.type }, 'Unknown message type');
      }
    } catch (error) {
      sdsLogger.error({ error, data }, 'Failed to parse SDS message');
    }
  }

  private async handleEvent(event: RawSdsEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Store raw event for replay/debugging
      await prisma.sdsEvent.create({
        data: {
          eventId: event.id,
          streamId: event.streamId,
          eventType: event.type,
          payload: event.payload as any,
          receivedAt: new Date(),
        },
      });

      // Handle donation events
      if (event.type === 'donation') {
        await this.handleDonationEvent(event);
      }

      // Mark as processed
      await prisma.sdsEvent.update({
        where: { eventId: event.id },
        data: { processedAt: new Date() },
      });

      const processingTime = Date.now() - startTime;
      sdsLogger.debug({ 
        eventId: event.id, 
        type: event.type,
        processingTimeMs: processingTime 
      }, 'Event processed');

    } catch (error) {
      sdsLogger.error({ error, eventId: event.id }, 'Failed to process event');
      
      // Update event with error
      await prisma.sdsEvent.update({
        where: { eventId: event.id },
        data: {
          processingError: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      }).catch(e => sdsLogger.error({ error: e }, 'Failed to update event error'));
    }
  }

  private async handleDonationEvent(event: RawSdsEvent): Promise<void> {
    // Validate event payload
    const validationResult = DonationEventSchema.safeParse(event.payload);
    
    if (!validationResult.success) {
      sdsLogger.warn({ 
        eventId: event.id, 
        errors: validationResult.error.errors 
      }, 'Invalid donation event schema');
      return;
    }

    const donation = validationResult.data;

    // Check for duplicate (idempotency)
    const existing = await prisma.donation.findUnique({
      where: { txHash: donation.txHash },
    });

    if (existing) {
      sdsLogger.debug({ txHash: donation.txHash }, 'Duplicate donation event, skipping');
      return;
    }

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { onChainId: donation.campaignOnChainId },
    });

    if (!campaign) {
      sdsLogger.warn({ 
        campaignOnChainId: donation.campaignOnChainId 
      }, 'Campaign not found for donation');
      return;
    }

    // Create donation record (PENDING status - awaiting on-chain confirmation)
    const newDonation = await prisma.donation.create({
      data: {
        txHash: donation.txHash,
        campaignId: campaign.id,
        donorAddress: donation.donor.toLowerCase(),
        amount: donation.amount,
        message: donation.message,
        sdsEventId: donation.eventId,
        sdsReceivedAt: new Date(donation.timestamp),
        status: 'PENDING',
        blockNumber: donation.blockNumber ? BigInt(donation.blockNumber) : null,
      },
    });

    // Update or create donor
    await prisma.donor.upsert({
      where: { address: donation.donor.toLowerCase() },
      create: {
        address: donation.donor.toLowerCase(),
        totalDonated: donation.amount,
        donationCount: 1,
        campaignCount: 1,
        firstDonationAt: new Date(),
        lastDonationAt: new Date(),
      },
      update: {
        totalDonated: { increment: BigInt(donation.amount) },
        donationCount: { increment: 1 },
        lastDonationAt: new Date(),
      },
    });

    // Update cache - push to recent donations feed
    const donationEvent: RealtimeDonationEvent = {
      type: 'donation',
      data: {
        id: newDonation.id,
        txHash: donation.txHash,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        donorAddress: donation.donor,
        amount: donation.amount,
        message: donation.message,
        isAnonymous: false,
        status: 'PENDING',
        timestamp: donation.timestamp,
      },
    };

    // Push to Redis feeds
    await Promise.all([
      redis.pushToFeed(CacheKeys.recentDonations.global(), donationEvent),
      redis.pushToFeed(CacheKeys.recentDonations.campaign(campaign.id), donationEvent),
      // Update leaderboards
      redis.incrementLeaderboard(
        CacheKeys.leaderboard.global(),
        donation.donor.toLowerCase(),
        parseFloat(donation.amount)
      ),
      redis.incrementLeaderboard(
        CacheKeys.leaderboard.campaign(campaign.id),
        donation.donor.toLowerCase(),
        parseFloat(donation.amount)
      ),
    ]);

    // Publish real-time event to connected clients
    await redis.publish('donations', donationEvent);

    // Emit event for other services
    this.emit('donation', newDonation, donation);

    sdsLogger.info({ 
      donationId: newDonation.id,
      txHash: donation.txHash,
      campaignId: campaign.id,
      amount: donation.amount,
    }, 'Donation event processed');
  }

  async subscribeToStream(streamId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingSubscriptions.add(streamId);
      sdsLogger.warn({ streamId }, 'Not connected, subscription queued');
      return;
    }

    this.ws.send(JSON.stringify({
      action: 'subscribe',
      streamId,
    }));

    sdsLogger.info({ streamId }, 'Subscription request sent');
  }

  async unsubscribeFromStream(streamId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingSubscriptions.delete(streamId);
      return;
    }

    this.ws.send(JSON.stringify({
      action: 'unsubscribe',
      streamId,
    }));
  }

  private resubscribeToStreams(): void {
    // Resubscribe to previously subscribed streams
    for (const streamId of this.state.subscribedStreams) {
      this.subscribeToStream(streamId);
    }

    // Subscribe to pending subscriptions
    for (const streamId of this.pendingSubscriptions) {
      this.subscribeToStream(streamId);
      this.pendingSubscriptions.delete(streamId);
    }
  }

  async subscribeToAllCampaigns(): Promise<void> {
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      select: { sdsStreamId: true },
    });

    for (const campaign of campaigns) {
      await this.subscribeToStream(campaign.sdsStreamId);
    }

    sdsLogger.info({ count: campaigns.length }, 'Subscribed to all active campaigns');
  }

  getState(): SdsConnectionState {
    return { ...this.state };
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state.connected = false;
    sdsLogger.info('SDS listener disconnected');
  }
}

export const sdsListener = new SdsListenerService();
export default sdsListener;
