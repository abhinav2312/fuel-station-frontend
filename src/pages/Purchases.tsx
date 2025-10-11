import { useEffect, useState } from 'react';
import axios from 'axios';
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
      const response = await axios.get('/api/tanks');
      setTanks(response.data);
      
      // Extract unique fuel types from tanks
      const uniqueFuelTypes = response.data.reduce((acc: FuelType[], tank: Tank) => {
        const existing = acc.find(ft => ft.id === tank.fuelType.id);
        if (!existing) {
          acc.push(tank.fuelType);
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
      const response = await axios.get('/api/purchases');
      setPurchases(response.data);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  }

  async function loadPurchasePrices() {
    try {
      const response = await axios.get('/api/purchase-prices');
      setPurchasePrices(response.data);
    } catch (error) {
      console.error('Error loading purchase prices:', error);
      // Initialize with empty object if API doesn't exist yet
      setPurchasePrices({});
    }
  }

  async function savePurchasePrices() {
    try {
      await axios.post('/api/purchase-prices', purchasePrices);
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
        return axios.post('/api/purchases', { 
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
              <h3 className="font-medium mb-3 text-gray-700">{fuelType.name}</h3>
              <div className="space-y-2">
                {tanks
                  .filter(tank => tank.fuelType.id === fuelType.id)
                  .map(tank => (
                    <div key={tank.id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{tank.name}</span>
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
                <h3 className="font-medium mb-3">{fuelType.name} Purchase Price</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {tanks
                    .filter(tank => tank.fuelType.id === fuelType.id)
                    .map(tank => (
                      <Input
                        key={tank.id}
                        label={`${tank.name} (₹/L)`}
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
        <Card className="max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Record Purchase</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Tanks</label>
              <div className="grid md:grid-cols-2 gap-2">
                {tanks.map(tank => (
                  <label key={tank.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTanks.includes(tank.id)}
                      onChange={() => toggleTankSelection(tank.id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{tank.name}</div>
                      <div className="text-sm text-gray-500">
                        {tank.fuelType.name} - {tank.currentLevel}L / {tank.capacityLit}L
                      </div>
                      {purchasePrices[tank.id] && (
                        <div className="text-sm text-blue-600">
                          Price: ₹{purchasePrices[tank.id]}/L
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Individual quantity inputs for selected tanks */}
            {selectedTanks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Enter Quantities</h3>
                {selectedTanks.map(tankId => {
                  const tank = tanks.find(t => t.id === tankId);
                  if (!tank) return null;
                  
                  return (
                    <div key={tankId} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{tank.name}</div>
                        <div className="text-xs text-gray-500">{tank.fuelType.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Litres:</label>
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
                          className="w-20 px-2 py-1 border rounded text-sm"
                          placeholder="0"
                        />
                        {purchasePrices[tankId] && tankQuantities[tankId] > 0 && (
                          <span className="text-sm text-blue-600 font-medium">
                            ₹{(purchasePrices[tankId] * tankQuantities[tankId]).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {selectedTanks.length > 0 && Object.values(tankQuantities).some(qty => qty > 0) && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Total Cost:</strong> ₹{selectedTanks.reduce((total, tankId) => {
                    const price = purchasePrices[tankId] || 0;
                    const quantity = tankQuantities[tankId] || 0;
                    return total + (price * quantity);
                  }, 0).toFixed(2)}
                </div>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Purchase Date"
                type="date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={recordPurchase}
                disabled={!isRecordValid()}
                className={!isRecordValid() ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Record Purchase
              </Button>
              <Button variant="ghost" onClick={resetForms}>Clear</Button>
            </div>
            {message && (
              <div className="text-sm text-red-600">{message}</div>
            )}
          </div>
        </Card>
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
                      {new Date(purchase.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.tank.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.tank.fuelType.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.litres}L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{purchase.unitCost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{purchase.totalCost}
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


