import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import { logger } from '../utils/logger';

type FuelType = {
  id: number;
  name: string;
  price: number;
};

type Tank = {
  id: number;
  name: string;
  capacityLit: number;
  currentLevel: number;
  fuelType: {
    id: number;
    name: string;
    price: number;
  };
};

export default function Tanks() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.setCurrentPage('Tanks');
    loadTanks();
    loadPrices();
  }, []);

  async function loadTanks() {
    try {
      const response = await apiClient.get('/api/tanks');
      setTanks(response.data);
      logger.info('Tanks loaded', { count: response.data.length });
    } catch (error) {
      console.error('Error loading tanks:', error);
      logger.error('Failed to load tanks', { error });
    } finally {
      setLoading(false);
    }
  }

  async function loadPrices() {
    try {
      const response = await apiClient.get('/api/prices/current');
      setPrices(response.data);
      logger.info('Prices loaded', response.data);
    } catch (error) {
      console.error('Error loading prices:', error);
      logger.error('Failed to load prices', { error });
    }
  }

  function getTankPercentage(tank: Tank): number {
    return (tank.currentLevel / tank.capacityLit) * 100;
  }

  function calculateStockValue(): number {
    return tanks.reduce((total, tank) => {
      const volume = tank.currentLevel || 0;
      const fuelTypeName = tank.fuelType?.name?.toLowerCase().replace(/\s+/g, '') || '';
      const price = prices[fuelTypeName] || 0;
      return total + (volume * price);
    }, 0);
  }

  function getFuelTypeStockValues() {
    const fuelTypeTotals: Record<string, { volume: number; value: number; price: number }> = {};
    
    tanks.forEach(tank => {
      const fuelTypeName = tank.fuelType?.name || 'Unknown';
      const volume = tank.currentLevel || 0;
      const priceKey = fuelTypeName.toLowerCase().replace(/\s+/g, '');
      const price = prices[priceKey] || 0;
      const value = volume * price;
      
      if (fuelTypeTotals[fuelTypeName]) {
        fuelTypeTotals[fuelTypeName].volume += volume;
        fuelTypeTotals[fuelTypeName].value += value;
      } else {
        fuelTypeTotals[fuelTypeName] = { volume, value, price };
      }
    });
    
    return Object.entries(fuelTypeTotals).map(([name, data]) => ({
      name,
      volume: data.volume || 0,
      value: data.value || 0,
      price: data.price || 0
    }));
  }

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="page-header">
          <h1 className="page-title text-2xl sm:text-3xl">Tank Management</h1>
          <p className="page-subtitle text-sm sm:text-base">Monitor fuel tank levels</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Tank Management</h1>
            <p className="text-slate-300 text-sm sm:text-base">Real-time fuel storage monitoring and analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Monitoring</span>
          </div>
        </div>
      </div>

      {/* Tank Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tanks.map((tank) => {
          const percentage = getTankPercentage(tank);
          const isHigh = percentage > 90;
          const isMedium = percentage > 70;
          
          return (
            <div key={tank.id} className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
              {/* Gradient Header */}
              <div className={`h-2 w-full ${
                isHigh ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                isMedium ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                'bg-gradient-to-r from-green-500 to-green-600'
              }`}></div>
              
              <div className="p-6">
                {/* Tank Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{tank.name}</h3>
                    <p className="text-sm text-gray-600 font-medium">{tank.fuelType.name}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isHigh ? 'bg-red-100 text-red-700' : 
                    isMedium ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {percentage.toFixed(1)}%
                  </div>
                </div>

                {/* Tank Metrics */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs text-gray-600 font-medium mb-1">Current Level</div>
                      <div className="text-lg font-bold text-gray-900">{tank.currentLevel.toLocaleString()}L</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs text-gray-600 font-medium mb-1">Capacity</div>
                      <div className="text-lg font-bold text-gray-900">{tank.capacityLit.toLocaleString()}L</div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-xs text-blue-600 font-medium mb-1">Available Space</div>
                    <div className="text-lg font-bold text-blue-700">{(tank.capacityLit - tank.currentLevel).toLocaleString()}L</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Tank Level</span>
                    <span className="text-sm font-bold text-gray-900">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                        isHigh ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                        isMedium ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                        'bg-gradient-to-r from-green-500 to-green-600'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Value Summary */}
      <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl p-6 sm:p-8 border border-emerald-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0-2.08-.402-2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Stock Value Analysis</h3>
        </div>
        
        {/* Individual Fuel Type Values */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {getFuelTypeStockValues().map((fuelType, index) => (
            <div key={fuelType.name} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  index === 0 ? 'bg-blue-100' : 
                  index === 1 ? 'bg-green-100' : 
                  'bg-purple-100'
                }`}>
                  <svg className={`w-4 h-4 ${
                    index === 0 ? 'text-blue-600' : 
                    index === 1 ? 'text-green-600' : 
                    'text-purple-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600">{fuelType.name}</span>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  ₹{(fuelType.value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">
                  {(fuelType.volume || 0).toLocaleString()}L @ ₹{(fuelType.price || 0).toLocaleString()}/L
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Stock Value */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0-2.08-.402-2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600">Total Stock Value</span>
          </div>
          <div className="text-4xl font-bold text-emerald-600 mb-2">
            ₹{(calculateStockValue() || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-gray-500">Current value of all fuel in storage</div>
        </div>
      </div>
    </div>
  );
}
