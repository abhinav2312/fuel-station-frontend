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
      const response = await apiClient.get('/api/tanks');
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
    try {
      await apiClient.post('/api/purchase-prices', { prices: purchasePrices });
      showMessage('Purchase prices saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving purchase prices:', error);
      showMessage('Failed to save purchase prices - API not available yet', 'error');
    }
  }

  async function recordPurchase() {
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

    try {
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

      await Promise.all(promises);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setSelectedTanks([]);
      setTankQuantities({});
      loadTanks();
      loadPurchases();
    } catch (error: any) {
      showMessage(error?.response?.data?.message || error?.message || 'Failed to record purchase', 'error');
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Purchases</h1>
      
      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Purchase recorded successfully!
        </div>
      )}
      
      {/* Current Purchase Prices Display */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Current Purchase Prices</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {fuelTypes.map(fuelType => (
            <div key={fuelType.id} className="border rounded-lg p-4">
              <h3 className="font-medium mb-3 text-gray-700">{fuelType?.name || 'N/A'}</h3>
              <div className="space-y-2">
                {tanks
                  .filter(tank => tank.fuelType?.id === fuelType.id)
                  .map(tank => (
                    <div key={tank.id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{tank?.name || 'N/A'}</span>
                      <span className="font-medium text-blue-600">
                        {purchasePrices[tank.id] ? `₹${purchasePrices[tank.id]}/L` : 'Not Set'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('record')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'record'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Record Purchase
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Purchase History
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'prices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Set Purchase Prices
          </button>
        </nav>
      </div>

      {/* Set Purchase Prices Tab */}
      {activeTab === 'prices' && (
        <Card className="max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Set Purchase Prices</h2>
          <div className="space-y-4">
            {fuelTypes.map(fuelType => (
              <div key={fuelType.id} className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">{fuelType?.name || 'N/A'} Purchase Price</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {tanks
                    .filter(tank => tank.fuelType?.id === fuelType.id)
                    .map(tank => (
                      <Input
                        key={tank.id}
                        label={`${tank?.name || 'N/A'} (₹/L)`}
                        type="number"
                        step="0.01"
                        value={purchasePrices[tank.id] || ''}
                        onChange={e => setPurchasePrices(prev => ({
                          ...prev,
                          [tank.id]: Number(e.target.value)
                        }))}
                      />
                    ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button 
                onClick={savePurchasePrices}
                disabled={!isPricesValid()}
                className={!isPricesValid() ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Save Prices
              </Button>
            </div>
            {message && (
              <div className={`text-sm ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Record Purchase Tab */}
      {activeTab === 'record' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-4xl">
          <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-semibold text-slate-900">Record Purchase</h2>
            <p className="text-sm text-slate-600 mt-1">Select tanks and enter quantities to record fuel purchases</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-4">Select Tanks</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tanks.map(tank => (
                  <label key={tank.id} className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedTanks.includes(tank.id) 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedTanks.includes(tank.id)}
                      onChange={() => toggleTankSelection(tank.id)}
                      className="mr-3 mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 mb-1">{tank?.name || 'N/A'}</div>
                      <div className="text-sm text-slate-600 mb-2">
                        {tank.fuelType?.name || 'N/A'} - {tank.currentLevel || 0}L / {tank.capacityLit || 0}L
                      </div>
                      {purchasePrices[tank.id] && (
                        <div className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-md inline-block">
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
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Enter Quantities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTanks.map(tankId => {
                    const tank = tanks.find(t => t.id === tankId);
                    if (!tank) return null;
                    
                    return (
                      <div key={tankId} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-semibold text-slate-900">{tank?.name || 'N/A'}</div>
                            <div className="text-sm text-slate-600">{tank.fuelType?.name || 'N/A'}</div>
                          </div>
                          {purchasePrices[tankId] && (
                            <div className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
                              ₹{purchasePrices[tankId]}/L
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-slate-700 min-w-[60px]">Litres:</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tankQuantities[tankId] || ''}
                            onChange={e => {
                              const value = e.target.value;
                              if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                setTankQuantities(prev => ({
                                  ...prev,
                                  [tankId]: value === '' ? 0 : Number(value)
                                }));
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            placeholder="Enter litres"
                          />
                          {purchasePrices[tankId] && tankQuantities[tankId] > 0 && (
                            <div className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-2 rounded-lg">
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
                disabled={!isRecordValid()}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  !isRecordValid() 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Record Purchase
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
        <Card>
          <h2 className="text-lg font-semibold mb-4">Purchase History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Litres</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchases.map(purchase => (
                  <tr key={purchase.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.date ? new Date(purchase.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.tank?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.tank?.fuelType?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.litres || 0}L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{purchase.unitCost || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{purchase.totalCost || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {purchases.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No purchases recorded yet
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}


