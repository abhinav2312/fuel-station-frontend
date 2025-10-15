import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Card } from '../components/ui/Card';

type Tank = { 
  id: number; 
  name: string; 
  fuelType: { id: number; name: string };
  currentLevel: number;
  capacityLit: number;
};

type FuelType = { id: number; name: string };

type Purchase = {
  id: number;
  tankId: number;
  litres: number;
  unitCost: number;
  totalCost: number;
  date: string;
  status?: string;
  tank: Tank;
};

export default function Purchases() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'prices'>('record');
  
  // Purchase price settings
  const [purchasePrices, setPurchasePrices] = useState<Record<number, number>>({});
  
  // Record purchase form
  const [selectedTanks, setSelectedTanks] = useState<number[]>([]);
  const [tankQuantities, setTankQuantities] = useState<Record<number, number>>({});
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUnloadModal, setShowUnloadModal] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Message handling with auto-hide
  function showMessage(text: string, type: 'success' | 'error') {
    setMessage(text);
    setMessageType(type);
    if (type === 'success') {
      setTimeout(() => setMessage(''), 2000);
    }
  }

  useEffect(() => {
    loadTanks();
    loadPurchases();
    loadPurchasePrices();
  }, []);

  async function loadTanks() {
    try {
      console.log('Loading tanks...');
      const response = await apiClient.get('/api/tanks');
      console.log('Tanks loaded:', response.data);
      setTanks(response.data);
      
      // Extract unique fuel types from tanks
      const uniqueFuelTypes = response.data.reduce((acc: FuelType[], tank: Tank) => {
        if (tank.fuelType && tank.fuelType.id) {
          const existing = acc.find(ft => ft.id === tank.fuelType.id);
          if (!existing) {
            acc.push(tank.fuelType);
          }
        }
        return acc;
      }, []);
      setFuelTypes(uniqueFuelTypes);
    } catch (error) {
      console.error('Error loading tanks:', error);
    }
  }

  async function loadPurchases() {
    try {
      const response = await apiClient.get('/api/purchases');
      setPurchases(response.data);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  }

  async function loadPurchasePrices() {
    try {
      const response = await apiClient.get('/api/purchase-prices');
      setPurchasePrices(response.data);
    } catch (error) {
      console.error('Error loading purchase prices:', error);
      // Initialize with empty object if API doesn't exist yet
      setPurchasePrices({});
    }
  }

  async function savePurchasePrices() {
    setLoadingPrices(true);
    
    try {
      await apiClient.post('/api/purchase-prices', { prices: purchasePrices });
      showMessage('Purchase prices saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving purchase prices:', error);
      showMessage('Failed to save purchase prices - API not available yet', 'error');
    } finally {
      setLoadingPrices(false);
    }
  }

  async function recordPurchase() {
    setSaving(true);
    
    try {
      if (selectedTanks.length === 0) {
        showMessage('Please select at least one tank', 'error');
        return;
      }

      // Check if all selected tanks have quantities
      const missingQuantities = selectedTanks.filter(tankId => !tankQuantities[tankId] || tankQuantities[tankId] <= 0);
      if (missingQuantities.length > 0) {
        showMessage('Please enter quantities for all selected tanks', 'error');
        return;
      }

      // Check if all selected tanks have purchase prices
      const missingPrices = selectedTanks.filter(tankId => !purchasePrices[tankId] || purchasePrices[tankId] <= 0);
      if (missingPrices.length > 0) {
        showMessage('Please set purchase prices for all selected tanks', 'error');
        return;
      }
      const promises = selectedTanks.map(tankId => {
        const unitCost = purchasePrices[tankId];
        const litres = tankQuantities[tankId];
        if (!unitCost) {
          throw new Error(`Purchase price not set for selected tank. Please set purchase prices first.`);
        }
        return apiClient.post('/api/purchases', { 
          tankId, 
          litres, 
          unitCost,
          date: purchaseDate
        });
      });

      console.log('Recording purchases for tanks:', selectedTanks);
      await Promise.all(promises);
      console.log('Purchases recorded successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setSelectedTanks([]);
      setTankQuantities({});
      console.log('Refreshing tank data...');
      await loadTanks();
      await loadPurchases();
      console.log('Tank data refreshed');
    } catch (error: any) {
      showMessage(error?.response?.data?.message || error?.message || 'Failed to record purchase', 'error');
    } finally {
      setSaving(false);
    }
  }

  function openUnloadModal(purchaseId: number) {
    setSelectedPurchaseId(purchaseId);
    setShowUnloadModal(true);
  }

  async function confirmUnload() {
    if (!selectedPurchaseId) return;
    
    try {
      setSaving(true);
      await apiClient.put(`/api/purchases/${selectedPurchaseId}/unload`);
      showMessage('Purchase marked as unloaded and tank updated successfully!', 'success');
      await loadTanks(); // Refresh tank data
      await loadPurchases(); // Refresh purchase history
      setShowUnloadModal(false);
      setSelectedPurchaseId(null);
    } catch (error: any) {
      showMessage(error?.response?.data?.message || error?.message || 'Failed to mark purchase as unloaded', 'error');
    } finally {
      setSaving(false);
    }
  }

  function toggleTankSelection(tankId: number) {
    setSelectedTanks(prev => {
      if (prev.includes(tankId)) {
        // Remove tank and its quantity
        const newQuantities = { ...tankQuantities };
        delete newQuantities[tankId];
        setTankQuantities(newQuantities);
        return prev.filter(id => id !== tankId);
      } else {
        // Add tank with default quantity
        setTankQuantities(prev => ({ ...prev, [tankId]: 0 }));
        return [...prev, tankId];
      }
    });
  }

  function resetForms() {
    setSelectedTanks([]);
    setTankQuantities({});
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setMessage('');
  }

  const isRecordValid = () => {
    if (selectedTanks.length === 0) return false;
    return selectedTanks.every(tankId => tankQuantities[tankId] && tankQuantities[tankId] > 0);
  };

  const isPricesValid = () => {
    return Object.values(purchasePrices).every(price => price > 0);
  };

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="premium-card">
        <div className="premium-card-header p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="premium-heading-1 premium-gradient-text">Fuel Purchase Management</h1>
              <p className="premium-text-large text-slate-600 mt-2">
                Record purchases, set prices, and track fuel inventory
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="premium-badge premium-badge-primary">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Purchase System
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Purchase recorded successfully!
        </div>
      )}
      
      {/* Current Purchase Prices Display */}
      <div className="premium-card">
        <div className="premium-card-header p-4 sm:p-6">
          <h2 className="premium-heading-2">Current Purchase Prices</h2>
          <p className="premium-text text-slate-600 mt-1">View current purchase prices for each fuel type</p>
        </div>
        <div className="premium-card-body p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fuelTypes.map((fuelType, index) => {
              const colors = [
                { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
                { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600' },
                { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-600' }
              ];
              const color = colors[index % colors.length];
              
              return (
                <div key={fuelType.id} className={`${color.bg} ${color.border} border rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200`}>
                  <div className="flex items-center mb-4">
                    <div className={`p-3 ${color.bg} rounded-lg border ${color.border}`}>
                      <svg className={`w-6 h-6 ${color.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{fuelType?.name || 'N/A'}</h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {tanks
                      .filter(tank => tank.fuelType?.id === fuelType.id)
                      .map(tank => (
                        <div key={tank.id} className="flex justify-between items-center bg-white/50 rounded-lg p-3">
                          <span className="text-sm font-medium text-slate-700">{tank?.name || 'N/A'}</span>
                          <span className={`text-sm font-bold ${color.text} bg-white/70 px-3 py-1 rounded-full`}>
                            {purchasePrices[tank.id] ? `₹${purchasePrices[tank.id]}/L` : 'Not Set'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Premium Tabs */}
      <div className="premium-card">
        <div className="premium-card-body p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 mb-6 sm:mb-8 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                activeTab === 'record' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4 mr-1 sm:mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <span className="hidden sm:inline">Record Purchase</span>
              <span className="sm:hidden">Record</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                activeTab === 'history' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4 mr-1 sm:mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Purchase History</span>
              <span className="sm:hidden">History</span>
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                activeTab === 'prices' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4 mr-1 sm:mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="hidden sm:inline">Set Purchase Prices</span>
              <span className="sm:hidden">Prices</span>
            </button>
          </div>

      {/* Set Purchase Prices Tab */}
      {activeTab === 'prices' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Set Purchase Prices</h2>
            <p className="text-sm text-slate-600 mt-1">Configure purchase prices for each fuel type</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              {fuelTypes.map(fuelType => (
                <div key={fuelType.id} className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {fuelType?.name || 'N/A'} Purchase Price
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {tanks
                      .filter(tank => tank.fuelType?.id === fuelType.id)
                      .map(tank => (
                        <div key={tank.id} className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            {tank?.name || 'N/A'} (₹/L)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={purchasePrices[tank.id] || ''}
                            onChange={e => setPurchasePrices(prev => ({
                              ...prev,
                              [tank.id]: Number(e.target.value)
                            }))}
                            onKeyDown={e => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                              }
                            }}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base"
                            placeholder="Enter purchase price"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={savePurchasePrices}
                  disabled={!isPricesValid() || loadingPrices}
                  className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                    !isPricesValid() || loadingPrices
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  {loadingPrices ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 inline animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {loadingPrices ? 'Saving...' : 'Save Purchase Prices'}
                </button>
              </div>
              {message && (
                <div className={`text-sm px-4 py-3 rounded-lg ${
                  messageType === 'success' 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Purchase Tab */}
      {activeTab === 'record' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Record Purchase</h2>
            <p className="text-sm text-slate-600 mt-1">Select tanks and enter quantities to record fuel purchases</p>
          </div>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 sm:mb-4">Select Tanks</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {tanks.map(tank => (
                  <label key={tank.id} className={`flex items-start p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedTanks.includes(tank.id) 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedTanks.includes(tank.id)}
                      onChange={() => toggleTankSelection(tank.id)}
                      className="mr-2 sm:mr-3 mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 mb-1 text-sm sm:text-base truncate">{tank?.name || 'N/A'}</div>
                      <div className="text-xs sm:text-sm text-slate-600 mb-2">
                        {tank.fuelType?.name || 'N/A'} - {tank.currentLevel || 0}L / {tank.capacityLit || 0}L
                      </div>
                      {purchasePrices[tank.id] && (
                        <div className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-md inline-block">
                          ₹{purchasePrices[tank.id]}/L
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Individual quantity inputs for selected tanks */}
            {selectedTanks.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Enter Quantities
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {selectedTanks.map(tankId => {
                    const tank = tanks.find(t => t.id === tankId);
                    if (!tank) return null;
                    
                    return (
                      <div key={tankId} className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 text-sm sm:text-base truncate">{tank?.name || 'N/A'}</div>
                            <div className="text-xs sm:text-sm text-slate-600">{tank.fuelType?.name || 'N/A'}</div>
                          </div>
                          {purchasePrices[tankId] && (
                            <div className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-md ml-2">
                              ₹{purchasePrices[tankId]}/L
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <label className="text-xs sm:text-sm font-medium text-slate-700 sm:min-w-[60px]">Litres:</label>
                          <div className="flex-1 w-full">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={tankQuantities[tankId] || ''}
                              onChange={e => {
                                const value = e.target.value;
                                setTankQuantities(prev => ({
                                  ...prev,
                                  [tankId]: value === '' ? 0 : Number(value)
                                }));
                              }}
                              onKeyDown={e => {
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                }
                              }}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base"
                              placeholder="Enter litres"
                            />
                          </div>
                          {purchasePrices[tankId] && tankQuantities[tankId] > 0 && (
                            <div className="text-xs sm:text-sm font-semibold text-green-600 bg-green-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg w-full sm:w-auto text-center">
                              ₹{((purchasePrices[tankId] || 0) * (tankQuantities[tankId] || 0)).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {selectedTanks.length > 0 && Object.values(tankQuantities).some(qty => qty > 0) && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Total Cost:</span>
                  </div>
                  <div className="text-lg font-bold text-green-700">
                    ₹{selectedTanks.reduce((total, tankId) => {
                      const price = purchasePrices[tankId] || 0;
                      const quantity = tankQuantities[tankId] || 0;
                      return total + (price * quantity);
                    }, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
              <button 
                onClick={recordPurchase}
                disabled={!isRecordValid() || saving}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  !isRecordValid() || saving
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {saving ? (
                  <>
                    <svg className="w-5 h-5 mr-2 inline animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Recording...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Record Purchase
                  </>
                )}
              </button>
              <button 
                onClick={resetForms}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            </div>
            {message && (
              <div className={`text-sm px-4 py-3 rounded-lg ${
                messageType === 'success' 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Purchase History</h2>
                <p className="text-sm text-slate-600 mt-1">Track all fuel purchase transactions</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tank</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fuel Type</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Litres</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {purchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                      {purchase.date ? new Date(purchase.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900">
                      {purchase.tank?.name || 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-900">
                      {purchase.tank?.fuelType?.name || 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900">
                      {purchase.litres || 0}L
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900">
                      ₹{purchase.unitCost || 0}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-slate-900">
                      ₹{purchase.totalCost || 0}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (purchase.status || 'pending') === 'unloaded' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(purchase.status || 'pending') === 'unloaded' ? 'Unloaded' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(purchase.status || 'pending') === 'pending' && (
                        <button
                          onClick={() => openUnloadModal(purchase.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Unload
                        </button>
                      )}
                      {(purchase.status || 'pending') === 'unloaded' && (
                        <span className="text-sm text-green-600 font-medium">✓ Unloaded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {purchases.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">No purchases recorded</h3>
                <p className="mt-1 text-sm text-slate-500">Get started by recording your first fuel purchase.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unload Confirmation Modal */}
      {showUnloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-slate-900">Confirm Unload</h3>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-sm text-slate-600">
                  Are you sure you want to mark this purchase as unloaded? This will update the tank levels and cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUnloadModal(false);
                    setSelectedPurchaseId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnload}
                  disabled={saving}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 flex items-center gap-2 ${
                    saving 
                      ? 'bg-slate-400 text-white cursor-not-allowed' 
                      : 'text-white bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {saving ? 'Unloading...' : 'Confirm Unload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}


