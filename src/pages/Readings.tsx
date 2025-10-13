import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { logger, LogCategory } from '../utils/logger';

type Tank = { id: number; name: string; fuelType: { name: string } };
type Reading = { id?: number; pumpId: number; date: string; openingLitres: number; closingLitres: number; pricePerLitre?: number; pump?: Tank };

export default function Readings() {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [date, setDate] = useState<string>(today());
  
  // Set current page for logging
  useEffect(() => {
    logger.setCurrentPage('Readings');
  }, []);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [readings, setReadings] = useState<Record<number, Reading>>({});
  const [history, setHistory] = useState<Reading[]>([]);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [currentPrices, setCurrentPrices] = useState<Record<number, number>>({});
  const [historyDate, setHistoryDate] = useState<string>(today());

  // Message handling with auto-hide
  function showMessage(text: string, type: 'success' | 'error') {
    setMessage(text);
    setMessageType(type);
    if (type === 'success') {
      setTimeout(() => setMessage(''), 2000);
    }
  }

  useEffect(() => {
    loadPumps();
    loadCurrentPrices();
  }, []);

  async function loadPumps() {
    try {
      const response = await apiClient.get('/api/pumps');
      setTanks(response.data); // Keep using tanks state for now to avoid breaking changes
    } catch (error) {
      console.error('Error loading pumps:', error);
    }
  }

  async function loadCurrentPrices() {
    try {
      const response = await apiClient.get('/api/prices/current');
      const prices: Record<number, number> = {};
      
      // Get fuel types from pumps to map fuel type IDs
      const pumpsResponse = await apiClient.get('/api/pumps');
      
      pumpsResponse.data.forEach((pump: any) => {
        if (pump.fuelType) {
          const key = pump.fuelType.name.toLowerCase().replace(/\s+/g, '');
          if (response.data[key]) {
            prices[pump.fuelType.id] = response.data[key];
          }
        }
      });
      
      setCurrentPrices(prices);
      console.log('Loaded current prices:', prices);
    } catch (error) {
      console.error('Error loading current prices:', error);
    }
  }

  useEffect(() => {
    if (activeTab === 'add') {
      loadReadings();
    } else {
      loadHistory();
    }
  }, [date, activeTab, historyDate]);

  async function loadReadings() {
    const r = await apiClient.get('/api/readings', { params: { date } });
    const byTank: Record<number, Reading> = {};
    (r.data as any[]).forEach((dr) => {
      byTank[dr.pumpId] = {
        id: dr.id,
        pumpId: dr.pumpId,
        date,
        openingLitres: Number(dr.openingLitres),
        closingLitres: Number(dr.closingLitres),
        pricePerLitre: Number(dr.pricePerLitre),
      };
    });
    setReadings(byTank);
  }

  async function loadHistory() {
    // Load recent readings for history view with pump information
    const r = await apiClient.get('/api/readings', { params: { date: historyDate } });
    const readingsWithPumps = r.data.map((reading: any) => ({
      ...reading,
      pump: tanks.find(t => t.id === reading.pumpId)
    }));
    setHistory(readingsWithPumps);
  }

  function setField(pumpId: number, field: keyof Reading, value: number | undefined) {
    setReadings(prev => ({
      ...prev,
      [pumpId]: {
        ...prev[pumpId],
        pumpId,
        date,
        openingLitres: prev[pumpId]?.openingLitres ?? undefined,
        closingLitres: prev[pumpId]?.closingLitres ?? undefined,
        pricePerLitre: prev[pumpId]?.pricePerLitre ?? 0,
        [field]: value,
      },
    }));
  }

  async function saveAllReadings() {
    try {
      logger.userAction('Save All Readings Started', { readingsCount: Object.keys(readings).length });
      
      const readingsToSave = Object.values(readings).filter(r => 
        r && 
        r.pumpId &&
        r.date &&
        r.openingLitres !== undefined && r.openingLitres !== null && r.openingLitres >= 0 &&
        r.closingLitres !== undefined && r.closingLitres !== null && r.closingLitres >= 0
      );
      
      if (readingsToSave.length === 0) {
        logger.warn('No readings to save - form is empty');
        showMessage('Please enter readings for at least one pump', 'error');
        return;
      }
      
      logger.info('Filtered readings with data', { count: readingsToSave.length });

      // Add current prices to each reading
      const readingsWithPrices = readingsToSave.map(reading => {
        const pump = tanks.find(t => t.id === reading.pumpId);
        const pricePerLitre = pump ? currentPrices[(pump.fuelType as any).id] || 0 : 0;
        return { ...reading, pricePerLitre };
      });

      console.log('Sending readings data:', { readings: readingsWithPrices });
      console.log('Readings to save:', readingsToSave);
      console.log('Current prices:', currentPrices);
      console.log('Tanks data:', tanks);
      
      // Debug each reading
      readingsWithPrices.forEach((reading, index) => {
        console.log(`Reading ${index}:`, {
          pumpId: reading.pumpId,
          date: reading.date,
          openingLitres: reading.openingLitres,
          closingLitres: reading.closingLitres,
          pricePerLitre: reading.pricePerLitre
        });
        
        // Check each field individually
        console.log(`Reading ${index} validation:`, {
          hasPumpId: !!reading.pumpId,
          hasDate: !!reading.date,
          hasOpeningLitres: reading.openingLitres !== undefined && reading.openingLitres !== null,
          hasClosingLitres: reading.closingLitres !== undefined && reading.closingLitres !== null,
          openingValue: reading.openingLitres,
          closingValue: reading.closingLitres
        });
      });
      
      const response = await apiClient.post('/api/readings/bulk', { readings: readingsWithPrices });
      logger.info('Readings saved successfully', { response: response.data });
      logger.formSubmission('Readings', true, { readingsCount: readingsWithPrices.length });
      showMessage('All readings saved successfully', 'success');
      
      // Clear the form after successful save
      setReadings({});
      
      // Note: We don't reload here to keep form empty for immediate re-entry
      // But when user changes date or reloads page, loadReadings() will populate existing data
    } catch (error: any) {
      logger.error('Error saving readings', { 
        error: error?.response?.data || error?.message,
        readings: readings 
      });
      logger.formSubmission('Readings', false, { error: error?.response?.data?.message || error?.message });
      showMessage(`Error saving readings: ${error?.response?.data?.message || error?.message || 'Unknown error'}`, 'error');
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 ${
          messageType === 'success' ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="p-4">
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${messageType === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {messageType === 'success' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className={`text-sm font-medium ${
                  messageType === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setMessage('')}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title text-2xl sm:text-3xl">Tank Readings</h1>
        <p className="page-subtitle text-sm sm:text-base">Record daily tank readings and view history</p>
      </div>
      
      {/* Tabs */}
      <div className="tab-list">
        <nav className="-mb-px flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8">
          <button
            onClick={() => setActiveTab('add')}
            className={`tab-button ${
              activeTab === 'add' ? 'tab-active' : 'tab-inactive'
            }`}
          >
            Add Readings
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`tab-button ${
              activeTab === 'history' ? 'tab-active' : 'tab-inactive'
            }`}
          >
            View History
          </button>
        </nav>
      </div>

      {activeTab === 'add' && (
        <>
          <div className="bg-white rounded-xl border shadow-sm p-4 max-w-md">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {message && (
            <div className={`text-sm p-3 rounded ${
              messageType === 'error' ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
            }`}>
              {message}
            </div>
          )}
          <div className="space-y-6">
            {(() => {
              // Group pumps by fuel type
              const groupedPumps = tanks.reduce((acc, pump) => {
                const fuelType = pump.fuelType?.name || 'Unknown';
                if (!acc[fuelType]) acc[fuelType] = [];
                acc[fuelType].push(pump);
                return acc;
              }, {} as Record<string, typeof tanks>);

              return (
                <>
                  {Object.entries(groupedPumps).map(([fuelType, pumps]) => (
                    <div key={fuelType} className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                        {fuelType} Pumps
                      </h3>
                      <div className="grid gap-4">
                        {pumps.map(pump => (
                          <div key={pump.id} className="bg-white rounded-xl border shadow-sm p-6">
                            <div className="font-semibold text-lg">{pump.name}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                              <Input 
                                label="Opening (L)" 
                                type="number" 
                                step="0.01"
                                value={readings[pump.id]?.openingLitres ?? ''} 
                                onChange={e => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  setField(pump.id, 'openingLitres', value);
                                }} 
                              />
                              <Input 
                                label="Closing (L)" 
                                type="number" 
                                step="0.01"
                                value={readings[pump.id]?.closingLitres ?? ''} 
                                onChange={e => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  setField(pump.id, 'closingLitres', value);
                                }} 
                              />
                              <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Price/Litre</label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                                  ₹{currentPrices[(pump.fuelType as any).id]?.toFixed(2) || 'N/A'}
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sold (L)</label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                                  {(() => {
                                    const opening = readings[pump.id]?.openingLitres || 0;
                                    const closing = readings[pump.id]?.closingLitres || 0;
                                    const sold = opening - closing;
                                    return sold.toFixed(2);
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Save All Button */}
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Save All Readings</h3>
                        <p className="text-sm text-gray-600">Save all pump readings for {date}</p>
                      </div>
                      <Button 
                        onClick={saveAllReadings}
                        className="btn-primary"
                      >
                        Save All Readings
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Reading History - {historyDate}</h2>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
                  <input
                    type="date"
                    value={historyDate}
                    onChange={e => setHistoryDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <Button 
                  onClick={() => setHistoryDate(today())}
                  className="btn-secondary"
                >
                  Today
                </Button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pump</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening (L)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing (L)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold (L)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map(reading => {
                  const sold = Number(reading.openingLitres) - Number(reading.closingLitres);
                  const revenue = sold * Number(reading.pricePerLitre);
                  return (
                    <tr key={reading.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reading.pump?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reading.pump?.fuelType?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(reading.openingLitres).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(reading.closingLitres).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sold.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(reading.pricePerLitre).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{revenue.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}


