import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Remove the instant splash screen as soon as React mounts.
// This gives an immediate visual response before JS parses.
function removeLoader() {
  const el = document.getElementById('initial-loader');
  if (el) {
    el.classList.add('hidden');
    setTimeout(() => el.remove(), 500);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Remove loader on next frame — React has painted by now.
requestAnimationFrame(removeLoader);
