import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { BrowserLocalStorageStorageService } from './platform/storage/index.js';

const rootEl = document.getElementById('root');
if (rootEl === null) throw new Error('Root element not found');

const storageService = new BrowserLocalStorageStorageService();

createRoot(rootEl).render(
  <StrictMode>
    <App storageService={storageService} />
  </StrictMode>,
);
