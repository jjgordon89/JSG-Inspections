/**
 * PWA Utilities for JSG Inspections
 * Handles service worker registration, installation prompts, and PWA features
 */

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    this.serviceWorkerRegistration = null;
    
    this.init();
  }

  /**
   * Initialize PWA features
   */
  async init() {
    this.setupEventListeners();
    await this.registerServiceWorker();
    this.checkInstallation();
    this.setupNotifications();
  }

  /**
   * Setup event listeners for PWA events
   */
  setupEventListeners() {
    // Install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // App installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed successfully');
      this.isInstalled = true;
      this.hideInstallButton();
      this.deferredPrompt = null;
    });

    // Online/offline events
    window.addEventListener('online', () => {
      console.log('PWA: Back online');
      this.isOnline = true;
      this.handleOnlineStatus(true);
    });

    window.addEventListener('offline', () => {
      console.log('PWA: Gone offline');
      this.isOnline = false;
      this.handleOnlineStatus(false);
    });

    // Visibility change (for background sync)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerBackgroundSync();
      }
    });
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('PWA: Registering service worker...');
        
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('PWA: Service worker registered:', this.serviceWorkerRegistration.scope);

        // Handle service worker updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = this.serviceWorkerRegistration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('PWA: New service worker available');
              this.showUpdateAvailable();
            }
          });
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });

      } catch (error) {
        console.error('PWA: Service worker registration failed:', error);
      }
    } else {
      console.warn('PWA: Service workers not supported');
    }
  }

  /**
   * Check if app is already installed
   */
  checkInstallation() {
    // Check if running in standalone mode
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true;
    
    if (this.isInstalled) {
      console.log('PWA: App is installed');
      this.hideInstallButton();
    }
  }

  /**
   * Setup push notifications
   */
  async setupNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        const permission = await Notification.requestPermission();
        console.log('PWA: Notification permission:', permission);
        
        if (permission === 'granted' && this.serviceWorkerRegistration) {
          await this.subscribeToPushNotifications();
        }
      } catch (error) {
        console.error('PWA: Notification setup failed:', error);
      }
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications() {
    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
      });

      console.log('PWA: Push subscription created:', subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
    } catch (error) {
      console.error('PWA: Push subscription failed:', error);
    }
  }

  /**
   * Show install button
   */
  showInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => this.promptInstall());
    } else {
      // Create install button if it doesn't exist
      this.createInstallButton();
    }
  }

  /**
   * Hide install button
   */
  hideInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  /**
   * Create install button
   */
  createInstallButton() {
    const button = document.createElement('button');
    button.id = 'pwa-install-button';
    button.innerHTML = '📱 Install App';
    button.className = 'pwa-install-btn';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      z-index: 1000;
      transition: all 0.3s ease;
    `;
    
    button.addEventListener('mouseover', () => {
      button.style.background = '#1d4ed8';
      button.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.background = '#2563eb';
      button.style.transform = 'translateY(0)';
    });
    
    button.addEventListener('click', () => this.promptInstall());
    
    document.body.appendChild(button);
  }

  /**
   * Prompt user to install the app
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('PWA: No install prompt available');
      return;
    }

    try {
      console.log('PWA: Showing install prompt');
      this.deferredPrompt.prompt();
      
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log('PWA: Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted install prompt');
      } else {
        console.log('PWA: User dismissed install prompt');
      }
      
      this.deferredPrompt = null;
    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
    }
  }

  /**
   * Show update available notification
   */
  showUpdateAvailable() {
    const updateBanner = document.createElement('div');
    updateBanner.id = 'pwa-update-banner';
    updateBanner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #059669;
        color: white;
        padding: 12px;
        text-align: center;
        z-index: 1001;
        font-size: 14px;
      ">
        <span>🔄 New version available!</span>
        <button id="pwa-update-button" style="
          background: white;
          color: #059669;
          border: none;
          padding: 4px 12px;
          margin-left: 12px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
        ">Update Now</button>
        <button id="pwa-dismiss-update" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 4px 12px;
          margin-left: 8px;
          border-radius: 4px;
          cursor: pointer;
        ">Later</button>
      </div>
    `;
    
    document.body.appendChild(updateBanner);
    
    document.getElementById('pwa-update-button').addEventListener('click', () => {
      this.applyUpdate();
    });
    
    document.getElementById('pwa-dismiss-update').addEventListener('click', () => {
      updateBanner.remove();
    });
  }

  /**
   * Apply service worker update
   */
  async applyUpdate() {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.waiting) {
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  /**
   * Handle online/offline status changes
   */
  handleOnlineStatus(isOnline) {
    const statusIndicator = document.getElementById('pwa-status-indicator');
    
    if (!statusIndicator) {
      this.createStatusIndicator();
    }
    
    const indicator = document.getElementById('pwa-status-indicator');
    if (indicator) {
      if (isOnline) {
        indicator.style.background = '#10b981';
        indicator.title = 'Online';
        setTimeout(() => {
          indicator.style.display = 'none';
        }, 3000);
      } else {
        indicator.style.background = '#ef4444';
        indicator.style.display = 'block';
        indicator.title = 'Offline - Limited functionality';
      }
    }
  }

  /**
   * Create status indicator
   */
  createStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'pwa-status-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      z-index: 1000;
      display: none;
    `;
    
    document.body.appendChild(indicator);
  }

  /**
   * Trigger background sync
   */
  async triggerBackgroundSync() {
    if (this.serviceWorkerRegistration && 'sync' in this.serviceWorkerRegistration) {
      try {
        await this.serviceWorkerRegistration.sync.register('background-sync');
        console.log('PWA: Background sync triggered');
      } catch (error) {
        console.error('PWA: Background sync failed:', error);
      }
    }
  }

  /**
   * Handle messages from service worker
   */
  handleServiceWorkerMessage(data) {
    console.log('PWA: Message from service worker:', data);
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('PWA: Cache updated');
        break;
      case 'SYNC_COMPLETE':
        console.log('PWA: Background sync completed');
        break;
      default:
        console.log('PWA: Unknown message type:', data.type);
    }
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });
      
      if (response.ok) {
        console.log('PWA: Subscription sent to server');
      } else {
        console.error('PWA: Failed to send subscription to server');
      }
    } catch (error) {
      console.error('PWA: Error sending subscription to server:', error);
    }
  }

  /**
   * Convert VAPID key
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get PWA status
   */
  getStatus() {
    return {
      isInstalled: this.isInstalled,
      isOnline: this.isOnline,
      hasServiceWorker: !!this.serviceWorkerRegistration,
      canInstall: !!this.deferredPrompt,
      notificationsEnabled: Notification.permission === 'granted'
    };
  }

  /**
   * Cache important URLs
   */
  async cacheUrls(urls) {
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'CACHE_URLS',
        payload: urls
      });
    }
  }
}

// Create and export singleton instance
const pwaManager = new PWAManager();

export default pwaManager;

// Export utility functions
export const {
  promptInstall,
  getStatus,
  triggerBackgroundSync,
  cacheUrls
} = pwaManager;