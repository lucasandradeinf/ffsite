import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { products } from './lib/products';
import './styles.css';

// Pré-carrega o produto principal (o primeiro da lista).
const first = products[0];
if (first) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = first.webp ?? first.src;
  if (first.webp) link.type = 'image/webp';
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
