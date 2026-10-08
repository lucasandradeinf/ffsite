import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App360 from './App360';
import './styles.css';
import './styles360.css';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App360 />
  </StrictMode>,
);
