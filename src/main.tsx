import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles.css';
import './styles/premium.css';

// Initialize logging system
import './utils/apiLogger';
import { logger } from './utils/logger';

import App from './pages/App';
import Dashboard from './pages/Dashboard';
import Tanks from './pages/Tanks';
import Payments from './pages/Payments';
import Validation from './pages/Validation';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Prices from './pages/Prices';
import Purchases from './pages/Purchases';
import Readings from './pages/Readings';
import Settings from './pages/Settings';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'tanks', element: <Tanks /> },
      { path: 'payments', element: <Payments /> },
      { path: 'validation', element: <Validation /> },
      { path: 'clients', element: <Clients /> },
      { path: 'prices', element: <Prices /> },
      { path: 'purchases', element: <Purchases /> },
      { path: 'readings', element: <Readings /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


