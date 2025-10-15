import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

type Pump = { 
  id: number; 
  name: string; 
  fuelType: { name: string }; 
  fuelTypeId: number;
};

type CashReceipt = {
  id?: number;
  pumpId: number;
  date: string;
  amount: number;
  pump?: Pump;
};

type OnlinePayment = {
  id?: number;
  date: string;
  amount: number;
  method: 'UPI' | 'CARD' | 'NET_BANKING';
  reference?: string;
  description?: string;
};

export default function Payments() {
  const [activeTab, setActiveTab] = useState<'cash' | 'online' | 'history'>('cash');
  const [date, setDate] = useState<string>(today());
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [cashReceipts, setCashReceipts] = useState<Record<number, CashReceipt>>({});
  const [onlinePayments, setOnlinePayments] = useState<OnlinePayment[]>([]);
  const [history, setHistory] = useState<{ cashReceipts: CashReceipt[]; onlinePayments: OnlinePayment[] }>({ cashReceipts: [], onlinePayments: [] });
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [savingCash, setSavingCash] = useState(false);
  const [savingOnline, setSavingOnline] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state for new online payment
  const [newPayment, setNewPayment] = useState<OnlinePayment>({
    date,
    amount: 0,
    method: 'UPI',
    reference: '',
    description: ''
  });

  useEffect(() => {
    loadPumps();
    loadCashReceipts();
    loadOnlinePayments();
  }, [date]);

  async function loadPumps() {
    try {
      const response = await apiClient.get('/api/pumps');
      setPumps(response.data);
    } catch (error) {
      console.error('Error loading pumps:', error);
    }
  }

  async function loadCashReceipts() {
    try {
      const response = await apiClient.get('/api/cash-receipts', { params: { date } });
      const receiptsMap: Record<number, CashReceipt> = {};
      response.data.forEach((receipt: CashReceipt) => {
        receiptsMap[receipt.pumpId] = receipt;
      });
      setCashReceipts(receiptsMap);
    } catch (error) {
      console.error('Error loading cash receipts:', error);
    }
  }

  async function loadOnlinePayments() {
    try {
      const response = await apiClient.get('/api/online-payments', { params: { date } });
      setOnlinePayments(response.data);
    } catch (error) {
      console.error('Error loading online payments:', error);
    }
  }

  async function loadHistory() {
    try {
      const [cashRes, onlineRes] = await Promise.all([
        apiClient.get('/api/cash-receipts', { params: { date } }),
        apiClient.get('/api/online-payments', { params: { date } })
      ]);
      setHistory({ cashReceipts: cashRes.data, onlinePayments: onlineRes.data });
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  // Cash Receipts Functions
  function setCashField(pumpId: number, field: keyof CashReceipt, value: number | string) {
    setCashReceipts(prev => ({
      ...prev,
      [pumpId]: {
        ...prev[pumpId],
        pumpId,
        date,
        amount: prev[pumpId]?.amount ?? 0,
        [field]: value,
      },
    }));
  }

  async function saveCashReceipt(pumpId: number) {
    const receipt = cashReceipts[pumpId];
    if (!receipt || !receipt.amount) return;
    
    try {
      await apiClient.post('/api/cash-receipts', receipt);
      showMessage('Cash receipt saved successfully', 'success');
      await loadCashReceipts();
    } catch (error) {
      console.error('Error saving cash receipt:', error);
      showMessage('Error saving cash receipt', 'error');
    }
  }

  async function saveAllCashReceipts() {
    try {
      setSavingCash(true);
      const receiptsToSave = Object.values(cashReceipts).filter(r => r.amount && r.amount > 0);
      if (receiptsToSave.length === 0) {
        showMessage('No cash receipts to save', 'error');
        return;
      }
      
      await apiClient.post('/api/cash-receipts/bulk', { receipts: receiptsToSave });
      showMessage('All cash receipts saved successfully', 'success');
      
      // Clear the form after successful save
      setCashReceipts({});
      
      // Note: We don't reload here to keep form empty for immediate re-entry
      // But when user changes date or reloads page, loadCashReceipts() will populate existing data
    } catch (error) {
      console.error('Error saving cash receipts:', error);
      showMessage('Error saving cash receipts', 'error');
    } finally {
      setSavingCash(false);
    }
  }

  // Online Payments Functions
  function setOnlineField(field: keyof OnlinePayment, value: string | number) {
    setNewPayment(prev => ({
      ...prev,
      [field]: value,
    }));
  }

  async function saveOnlinePayment() {
    if (!newPayment.amount || newPayment.amount <= 0) {
      showMessage('Please enter a valid amount', 'error');
      return;
    }
    
    try {
      setSavingOnline(true);
      await apiClient.post('/api/online-payments', newPayment);
      showMessage('Online payment recorded successfully', 'success');
      setNewPayment({
        date,
        amount: 0,
        method: 'UPI',
        reference: '',
        description: ''
      });
      await loadOnlinePayments();
    } catch (error) {
      console.error('Error saving online payment:', error);
      showMessage('Error saving online payment', 'error');
    } finally {
      setSavingOnline(false);
    }
  }

  // Message handling with auto-hide
  function showMessage(text: string, type: 'success' | 'error') {
    setMessage(text);
    setMessageType(type);
    if (type === 'success') {
      setTimeout(() => setMessage(''), 2000);
    }
  }

  const totalCash = Object.values(cashReceipts).reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);
  const totalOnline = onlinePayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Payments</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Record cash receipts and online payments for your fuel station
          </p>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Select Date</h3>
                <p className="text-gray-600">Choose the date for your payments</p>
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

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('cash')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'cash' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Cash Receipts
                </div>
              </button>
              <button
                onClick={() => setActiveTab('online')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'online' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Online Payments
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  loadHistory();
                }}
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

      {message && (
        <div className={`text-sm p-3 rounded ${
          messageType === 'error' ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
        }`}>
          {message}
        </div>
      )}

        {/* Cash Receipts Tab */}
        {activeTab === 'cash' && (
          <div className="space-y-8">
            {(() => {
              // Group pumps by fuel type
              const groupedPumps = pumps.reduce((acc, pump) => {
                const fuelType = pump.fuelType?.name || 'Unknown';
                if (!acc[fuelType]) acc[fuelType] = [];
                acc[fuelType].push(pump);
                return acc;
              }, {} as Record<string, typeof pumps>);

              return Object.entries(groupedPumps).map(([fuelType, pumps]) => (
                <div key={fuelType} className="space-y-6">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-xl p-6">
                    <div className="flex items-center">
                      <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{fuelType} Pumps - Cash Received</h3>
                        <p className="text-green-100">{pumps.length} pump{pumps.length !== 1 ? 's' : ''} available</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-6">
                    {pumps.map(pump => (
                      <div key={pump.id} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow duration-300">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center">
                            <div className="bg-green-100 rounded-full p-3 mr-4">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-gray-900">{pump.name}</h4>
                              <p className="text-sm text-gray-600">{fuelType} • Pump #{pump.id}</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Input 
                              label="Cash Received (₹)" 
                              type="number" 
                              step="0.01"
                              min="0"
                              value={cashReceipts[pump.id]?.amount ?? ''} 
                              onChange={e => {
                                const value = e.target.value === '' ? 0 : Number(e.target.value);
                                setCashField(pump.id, 'amount', value);
                              }} 
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-sm font-semibold text-green-800 flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              ₹{Number(cashReceipts[pump.id]?.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}

            {/* Cash Summary */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl shadow-xl p-8">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div className="mb-4 sm:mb-0 flex-1">
                  <div className="flex items-center mb-2">
                    <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Total Cash Received</h3>
                  </div>
                  <p className="text-emerald-100 text-lg">Sum of all pump cash receipts for {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div className="flex-shrink-0 text-center sm:text-right">
                  <div className="text-4xl font-bold text-white mb-2">₹{Number(totalCash).toFixed(2)}</div>
                  <Button 
                    onClick={saveAllCashReceipts} 
                    disabled={savingCash}
                    variant="primary"
                    className={`!bg-white !text-emerald-600 hover:!bg-emerald-50 font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-white min-w-[200px] ${savingCash ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {savingCash ? (
                      <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                    {savingCash ? 'Saving...' : 'Save All Cash Receipts'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Online Payments Tab */}
        {activeTab === 'online' && (
          <div className="space-y-8">
            {/* Add Online Payment Form */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8">
              <div className="flex items-center mb-6">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Add Online Payment</h3>
                  <p className="text-blue-100">Record digital payments and transactions</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input 
                    label="Amount (₹)" 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={newPayment.amount || ''} 
                    onChange={e => setOnlineField('amount', e.target.value === '' ? 0 : Number(e.target.value))} 
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select 
                      value={newPayment.method} 
                      onChange={e => setOnlineField('method', e.target.value as 'UPI' | 'CARD' | 'NET_BANKING')}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200 hover:border-blue-300"
                    >
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card Payment</option>
                      <option value="NET_BANKING">Net Banking</option>
                    </select>
                  </div>
                  <Input 
                    label="Reference/Transaction ID" 
                    value={newPayment.reference || ''} 
                    onChange={e => setOnlineField('reference', e.target.value)} 
                    placeholder="e.g., UPI123456789"
                  />
                  <Input 
                    label="Description (Optional)" 
                    value={newPayment.description || ''} 
                    onChange={e => setOnlineField('description', e.target.value)} 
                    placeholder="e.g., Customer payment"
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={saveOnlinePayment} 
                    disabled={savingOnline}
                    variant="primary"
                    className={`!bg-blue-600 !text-white hover:!bg-blue-700 font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${savingOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {savingOnline ? (
                      <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                    {savingOnline ? 'Recording...' : 'Record Payment'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Online Payments Summary */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div className="mb-4 sm:mb-0 flex-1">
                  <div className="flex items-center mb-2">
                    <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Total Online Payments</h3>
                  </div>
                  <p className="text-indigo-100 text-lg">Sum of all digital payments for {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div className="flex-shrink-0 text-center sm:text-right">
                  <div className="text-4xl font-bold text-white">₹{Number(totalOnline).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            {/* Cash Receipts History */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-8 py-6">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Cash Receipts History</h2>
                    <p className="text-green-100">{new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-gray-100">
                    <tr>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Pump</th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Fuel Type</th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Amount (₹)</th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.cashReceipts.map((receipt, index) => (
                      <tr key={receipt.id} className={`hover:bg-green-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="bg-green-100 rounded-full p-2 mr-3">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div className="text-sm font-bold text-gray-900">{receipt.pump?.name}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            {receipt.pump?.fuelType?.name}
                          </span>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">
                            ₹{Number(receipt.amount || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-700">
                          {new Date(receipt.date).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Online Payments History */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-6">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Online Payments History</h2>
                    <p className="text-indigo-100">{new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-gray-100">
                    <tr>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Method</th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Amount (₹)</th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Reference</th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Description</th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.onlinePayments.map((payment, index) => (
                      <tr key={payment.id} className={`hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            payment.method === 'UPI' ? 'bg-green-100 text-green-800' :
                            payment.method === 'CARD' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {payment.method}
                          </span>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-800">
                            ₹{Number(payment.amount || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-700">
                          {payment.reference || '-'}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-700">
                          {payment.description || '-'}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-700">
                          {new Date(payment.date).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
