'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Only register in production (not localhost)
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      !window.location.hostname.includes('localhost')
    ) {
      registerServiceWorker();
    }
  }, []);

  return null;
}

async function registerServiceWorker() {
  try {
    const swUrl = '/sw.js';

    // Check if sw.js exists before registering
    const response = await fetch(swUrl, { method: 'HEAD' });
    if (!response.ok) {
      return;
    }

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      updateViaCache: 'none',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            notifyUserOfUpdate();
          }
        });
      }
    });

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);
  } catch {
    // Service Worker registration failed - app works without it (graceful degradation)
  }
}

function notifyUserOfUpdate() {
  if ('Notification' in window) {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification('Update Available', {
          body: 'A new version of Lead CRM is available. Please refresh to update.',
          icon: '/icon-192.png',
        });
      }
    });
  }
}
