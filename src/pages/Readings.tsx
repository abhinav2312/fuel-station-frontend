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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-xl shadow-xl border-l-4 ${
          messageType === 'success' ? 'border-emerald-500' : 'border-red-500'
        }`}>
          <div className="p-4">
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${messageType === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
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
                  messageType === 'success' ? 'text-emerald-800' : 'text-red-800'
                }`}>
                  {message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Tank Readings</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Record daily tank readings and monitor fuel sales performance
          </p>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('add')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'add' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Readings
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  View History
                </div>
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'add' && (
          <div className="space-y-8">
            {/* Date Selection */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-lg p-3 mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Select Date</h3>
                    <p className="text-gray-600">Choose the date for your tank readings</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200 hover:border-blue-300 min-w-[200px]"
                  />
                </div>
              </div>
            </div>

            {/* Pump Readings */}
            <div className="space-y-8">
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
                    <div key={fuelType} className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6">
                        <div className="flex items-center">
                          <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-white">{fuelType} Pumps</h3>
                            <p className="text-blue-100">{pumps.length} pump{pumps.length !== 1 ? 's' : ''} available</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-6">
                        {pumps.map(pump => (
                          <div key={pump.id} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow duration-300">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center">
                                <div className="bg-blue-100 rounded-full p-3 mr-4">
                                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-xl font-bold text-gray-900">{pump.name}</h4>
                                  <p className="text-sm text-gray-600">{fuelType} • Pump #{pump.id}</p>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                              <Input 
                                label="Opening (L)" 
                                type="number" 
                                step="0.01"
                                min="0"
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
                                min="0"
                                value={readings[pump.id]?.closingLitres ?? ''} 
                                onChange={e => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  setField(pump.id, 'closingLitres', value);
                                }} 
                              />
                              <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Current Price/Litre</label>
                                <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-sm font-semibold text-green-800 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  ₹{currentPrices[(pump.fuelType as any).id]?.toFixed(2) || 'N/A'}
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sold (L)</label>
                                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-800 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                  {(() => {
                                    const opening = readings[pump.id]?.openingLitres || 0;
                                    const closing = readings[pump.id]?.closingLitres || 0;
                                    const sold = closing - opening;
                                    return sold.toFixed(2);
                                  })()}L
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Save All Button */}
                  <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl shadow-xl p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center">
                      <div className="mb-4 sm:mb-0 flex-1">
                        <div className="flex items-center mb-2">
                          <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-white">Save All Readings</h3>
                        </div>
                        <p className="text-emerald-100 text-lg">Save all pump readings for {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Button 
                          onClick={saveAllReadings}
                          variant="primary"
                          className="!bg-white !text-emerald-600 hover:!bg-emerald-50 font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-white min-w-[200px]"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Save All Readings
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-8 py-6">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div className="flex items-center mb-4 sm:mb-0">
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Reading History</h2>
                    <p className="text-indigo-100">{new Date(historyDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-indigo-100 mb-2">Filter by Date</label>
                    <input
                      type="date"
                      value={historyDate}
                      onChange={e => setHistoryDate(e.target.value)}
                      className="px-4 py-2 border border-indigo-300 rounded-xl focus:ring-2 focus:ring-white focus:border-white bg-white text-gray-900 min-w-[150px]"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <Button 
                      onClick={() => setHistoryDate(today())}
                      variant="secondary"
                      className="!bg-white !text-indigo-600 hover:!bg-indigo-50 font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-200 min-w-[100px]"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Today
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-gray-100">
                  <tr>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Pump</th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Fuel Type</th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Opening (L)</th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Closing (L)</th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Sold (L)</th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Price/L</th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((reading, index) => {
                    const sold = Number(reading.closingLitres) - Number(reading.openingLitres);
                    const revenue = sold * Number(reading.pricePerLitre);
                    return (
                      <tr key={reading.id} className={`hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="bg-blue-100 rounded-full p-2 mr-3">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                              </svg>
                            </div>
                            <div className="text-sm font-bold text-gray-900">{reading.pump?.name}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {reading.pump?.fuelType?.name}
                          </span>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-700">{Number(reading.openingLitres).toFixed(2)}L</td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-700">{Number(reading.closingLitres).toFixed(2)}L</td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                            {sold.toFixed(2)}L
                          </span>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-700">₹{Number(reading.pricePerLitre).toFixed(2)}</td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">
                            ₹{revenue.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}


