import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { App } from './App';
import { RouterProvider } from './router/Router';
import { MochiProvider } from './state/MochiProvider';
import { StoreProvider } from './state/StoreProvider';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <StoreProvider>
      <RouterProvider>
        <MochiProvider>
          <App />
        </MochiProvider>
      </RouterProvider>
    </StoreProvider>
  </StrictMode>,
);
