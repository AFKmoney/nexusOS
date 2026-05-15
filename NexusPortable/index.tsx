import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { hydrateMobileRegistry } from './store/mobileStore';
import { vfs } from '../kernel/fileSystem';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

async function boot() {
  // Init VFS and Registry
  await vfs.init();
  await hydrateMobileRegistry();
  
  createRoot(root!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

boot();
