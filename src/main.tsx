import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App } from './App.js';
import { BrowserLocalStorageStorageService, CapacitorStorageService } from './platform/storage/index.js';
import type { StorageService } from './application/storage/StorageService.js';

const rootEl = document.getElementById('root');
if (rootEl === null) throw new Error('Root element not found');

// Use Capacitor Preferences on native (Android/iOS); localStorage on browser/Vite.
const storageService: StorageService = Capacitor.isNativePlatform()
  ? new CapacitorStorageService()
  : new BrowserLocalStorageStorageService();

createRoot(rootEl).render(
  <StrictMode>
    <App storageService={storageService} />
  </StrictMode>,
);
