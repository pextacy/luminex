import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../db/redis.js';
import { createLogger } from '../utils/logger.js';
import { RealtimeEvent } from '../types/index.js';

const logger = createLogger('websocket');

interface Client {
  id: string;
  ws: WebSocket;
  subscribedStreams: Set<string>;
  connectedAt: Date;
  lastPing: Date;
}

class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Subscribe to Redis channels for broadcasting
    this.subscribeToChannels();

    // Start ping/pong health check
    this.startPingInterval();

    logger.info('WebSocket server initialized');
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = uuidv4();
    const client: Client = {
      id: clientId,
      ws,
      subscribedStreams: new Set(),
      connectedAt: new Date(),
      lastPing: new Date(),
    };

    this.clients.set(clientId, client);
    logger.info({ clientId }, 'Client connected');

    // Send welcome message
    this.sendToClient(client, {
      type: 'connected',
      data: { clientId },
    });

    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(client, data.toString());
    });

    // Handle close
    ws.on('close', () => {
      this.clients.delete(clientId);
      logger.info({ clientId }, 'Client disconnected');
    });

    // Handle pong
    ws.on('pong', () => {
      client.lastPing = new Date();
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error({ clientId, error: error.message }, 'WebSocket error');
    });
  }

  private handleMessage(client: Client, data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(client, message.streams);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(client, message.streams);
          break;
        case 'ping':
          this.sendToClient(client, { type: 'pong' });
          break;
        default:
          logger.debug({ type: message.type }, 'Unknown message type');
      }
    } catch (error) {
      logger.error({ error, data }, 'Failed to parse message');
    }
  }

  private handleSubscribe(client: Client, streams: string[]): void {
    if (!Array.isArray(streams)) return;

    for (const stream of streams) {
      client.subscribedStreams.add(stream);
    }

    this.sendToClient(client, {
      type: 'subscribed',
      data: { streams: Array.from(client.subscribedStreams) },
    });

    logger.debug({ 
      clientId: client.id, 
      streams 
    }, 'Client subscribed to streams');
  }

  private handleUnsubscribe(client: Client, streams: string[]): void {
    if (!Array.isArray(streams)) return;

    for (const stream of streams) {
      client.subscribedStreams.delete(stream);
    }

    this.sendToClient(client, {
      type: 'unsubscribed',
      data: { streams },
    });
  }

  private sendToClient(client: Client, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private async subscribeToChannels(): Promise<void> {
    // Subscribe to donation events
    await redis.subscribe('donations', (event: unknown) => {
      const donationEvent = event as RealtimeEvent;
      this.broadcastToStream('donations', donationEvent);
      
      // Also broadcast to campaign-specific subscribers
      if (donationEvent.type === 'donation') {
        this.broadcastToStream(
          `campaign:${donationEvent.data.campaignId}`,
          donationEvent
        );
      }
    });

    // Subscribe to campaign update events
    await redis.subscribe('campaign_updates', (event: unknown) => {
      const updateEvent = event as RealtimeEvent;
      this.broadcastToStream('campaign_updates', updateEvent);
      
      if (updateEvent.type === 'campaign_update') {
        this.broadcastToStream(
          `campaign:${updateEvent.data.campaignId}`,
          updateEvent
        );
      }
    });

    logger.info('Subscribed to Redis channels for broadcasting');
  }

  private broadcastToStream(stream: string, event: RealtimeEvent): void {
    let sentCount = 0;

    for (const client of this.clients.values()) {
      // Send to clients subscribed to this specific stream or '*' (all)
      if (client.subscribedStreams.has(stream) || 
          client.subscribedStreams.has('*') ||
          client.subscribedStreams.has('donations') && event.type === 'donation') {
        this.sendToClient(client, {
          type: 'event',
          stream,
          ...event,
        });
        sentCount++;
      }
    }

    logger.debug({ stream, sentCount }, 'Broadcast event');
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      for (const [id, client] of this.clients.entries()) {
        // Check if client is stale
        if (now - client.lastPing.getTime() > timeout) {
          logger.warn({ clientId: id }, 'Client timed out, disconnecting');
          client.ws.terminate();
          this.clients.delete(id);
          continue;
        }

        // Send ping
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, 30000); // Every 30 seconds
  }

  getStats(): { 
    connectedClients: number; 
    subscriptions: Record<string, number>;
  } {
    const subscriptions: Record<string, number> = {};

    for (const client of this.clients.values()) {
      for (const stream of client.subscribedStreams) {
        subscriptions[stream] = (subscriptions[stream] || 0) + 1;
      }
    }

    return {
      connectedClients: this.clients.size,
      subscriptions,
    };
  }

  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    for (const client of this.clients.values()) {
      client.ws.close();
    }

    if (this.wss) {
      this.wss.close();
    }

    logger.info('WebSocket server shut down');
  }
}

export const wsHandler = new WebSocketHandler();
export default wsHandler;
