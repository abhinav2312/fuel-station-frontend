import { Link, NavLink, Outlet } from 'react-router-dom';
import { PremiumCard, PremiumCardHeader, PremiumCardBody } from '../components/premium';

// Premium Branding Component
function PremiumBranding() {
  return (
    <div className="premium-header">
      <div className="premium-container">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-4 lg:space-x-6">
            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 lg:w-10 lg:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold text-white">FuelStation Pro</h1>
              <p className="text-sm lg:text-lg text-white/90 mt-1 lg:mt-2">Professional Fuel Station Management System</p>
              <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-2 lg:mt-3">
                <div className="premium-badge premium-badge-success text-xs">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Enterprise Ready
                </div>
                <div className="premium-badge premium-badge-primary text-xs">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Secure
                </div>
              </div>
            </div>
          </div>
          <div className="text-center lg:text-right hidden lg:block">
            <div className="premium-badge premium-badge-primary text-sm lg:text-lg px-3 lg:px-4 py-1 lg:py-2">v2.0.0</div>
            <p className="text-xs lg:text-sm text-white/70 mt-1 lg:mt-2">Licensed Software</p>
            <p className="text-xs text-white/60">Build 2024.01.15</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
      </svg>
    )
  },
  { 
    name: 'Tanks', 
    href: '/tanks', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  { 
    name: 'Payments', 
    href: '/payments', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    )
  },
  { 
    name: 'Validation', 
    href: '/validation', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    name: 'Clients', 
    href: '/clients', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    name: 'Prices', 
    href: '/prices', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    )
  },
  { 
    name: 'Purchases', 
    href: '/purchases', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  { 
    name: 'Readings', 
    href: '/readings', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Premium Header */}
      <PremiumBranding />
      
      {/* Premium Navigation */}
      <nav className="premium-nav">
        <div className="premium-container">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 lg:gap-4">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `premium-nav-item ${
                      isActive ? 'active' : ''
                    }`
                  }
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.name}</span>
                </NavLink>
              ))}
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="premium-badge premium-badge-success text-xs">Live</div>
              <div className="text-xs lg:text-sm text-slate-600">
                <span className="font-medium hidden sm:inline">System Status:</span>
                <span className="sm:hidden">Status:</span> Operational
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="premium-container py-8">
        <div className="animate-fadeInUp">
          <Outlet />
        </div>
      </main>
      
      {/* Premium Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-8 lg:py-12 mt-16">
        <div className="premium-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-6 lg:mb-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-base lg:text-lg font-bold">FuelStation Pro</h3>
              </div>
              <p className="text-slate-400 text-xs lg:text-sm mb-4">
                Professional fuel station management system designed for enterprise use.
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="premium-badge premium-badge-success text-xs">Licensed</div>
                <div className="premium-badge premium-badge-primary text-xs">Enterprise</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 lg:mb-4 text-sm lg:text-base">Features</h4>
              <ul className="space-y-1 lg:space-y-2 text-xs lg:text-sm text-slate-400">
                <li>Real-time Analytics</li>
                <li>Multi-pump Management</li>
                <li>Credit Management</li>
                <li>Automated Reporting</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 lg:mb-4 text-sm lg:text-base">Support</h4>
              <ul className="space-y-1 lg:space-y-2 text-xs lg:text-sm text-slate-400">
                <li>24/7 Technical Support</li>
                <li>Documentation</li>
                <li>Training Resources</li>
                <li>API Integration</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 lg:mb-4 text-sm lg:text-base">System Info</h4>
              <div className="space-y-1 lg:space-y-2 text-xs lg:text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span className="text-white">2.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Build:</span>
                  <span className="text-white">2024.01.15</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-green-400">Operational</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-700 pt-6 lg:pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs lg:text-sm text-slate-400">© 2024 FuelStation Pro. All rights reserved.</p>
                <p className="text-xs text-slate-500 mt-1">Licensed Software - Professional Edition</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs lg:text-sm text-slate-400">Powered by Advanced Technology</p>
                <p className="text-xs text-slate-500 mt-1">Built for Enterprise Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


