'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { WS_URL } from '@/lib/config';
import type { WsEvent, WsDonationEvent, WsCampaignUpdateEvent } from '@/lib/types';

interface WebSocketContextValue {
  isConnected: boolean;
  lastEvent: WsEvent | null;
  subscribeToDonations: () => void;
  subscribeToCampaign: (campaignId: string) => void;
  subscribeToStats: () => void;
  unsubscribeFromCampaign: (campaignId: string) => void;
  onDonation: (callback: (event: WsDonationEvent) => void) => () => void;
  onCampaignUpdate: (callback: (event: WsCampaignUpdateEvent) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  
  const donationCallbacks = useRef<Set<(event: WsDonationEvent) => void>>(new Set());
  const campaignUpdateCallbacks = useRef<Set<(event: WsCampaignUpdateEvent) => void>>(new Set());
  const pendingSubscriptions = useRef<string[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Send any pending subscriptions
        pendingSubscriptions.current.forEach(sub => {
          ws.send(sub);
        });
        pendingSubscriptions.current = [];
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsEvent;
          setLastEvent(data);

          // Dispatch to appropriate callbacks
          if (data.type === 'donation') {
            donationCallbacks.current.forEach(cb => cb(data as WsDonationEvent));
          } else if (data.type === 'campaign_update') {
            campaignUpdateCallbacks.current.forEach(cb => cb(data as WsCampaignUpdateEvent));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((message: object) => {
    const msgStr = JSON.stringify(message);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msgStr);
    } else {
      // Queue for when connection is established
      pendingSubscriptions.current.push(msgStr);
    }
  }, []);

  const subscribeToDonations = useCallback(() => {
    sendMessage({ type: 'subscribe', streams: ['donations'] });
  }, [sendMessage]);

  const subscribeToCampaign = useCallback((campaignId: string) => {
    sendMessage({ type: 'subscribe', streams: [`campaign:${campaignId}`] });
  }, [sendMessage]);

  const subscribeToStats = useCallback(() => {
    sendMessage({ type: 'subscribe', streams: ['stats'] });
  }, [sendMessage]);

  const unsubscribeFromCampaign = useCallback((campaignId: string) => {
    sendMessage({ type: 'unsubscribe', streams: [`campaign:${campaignId}`] });
  }, [sendMessage]);

  const onDonation = useCallback((callback: (event: WsDonationEvent) => void) => {
    donationCallbacks.current.add(callback);
    return () => {
      donationCallbacks.current.delete(callback);
    };
  }, []);

  const onCampaignUpdate = useCallback((callback: (event: WsCampaignUpdateEvent) => void) => {
    campaignUpdateCallbacks.current.add(callback);
    return () => {
      campaignUpdateCallbacks.current.delete(callback);
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        lastEvent,
        subscribeToDonations,
        subscribeToCampaign,
        subscribeToStats,
        unsubscribeFromCampaign,
        onDonation,
        onCampaignUpdate,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
