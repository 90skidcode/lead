'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

export function useActivityStream(
  onEvent: (event: StreamEvent) => void,
  onError?: (error: Error) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return;
    }

    try {
      const eventSource = new EventSource('/api/activities/stream', {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamEvent;
          onEvent(data);
          reconnectAttemptsRef.current = 0;
        } catch (error) {
          console.error('Failed to parse activity stream event:', error);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (onError) {
          onError(new Error('Max reconnection attempts exceeded'));
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [onEvent, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { connect, disconnect };
}
