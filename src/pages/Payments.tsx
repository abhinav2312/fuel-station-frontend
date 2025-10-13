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
    <div className="space-y-8">
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
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Record cash receipts and online payments</p>
      </div>

      {/* Date Selection */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <Input 
              label="Date" 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="max-w-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="card-body">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('cash')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cash'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cash Receipts
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'online'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Online Payments
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                loadHistory();
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              View History
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
        <>
          <div className="space-y-6">
            {(() => {
              // Group pumps by fuel type
              const groupedPumps = pumps.reduce((acc, pump) => {
                const fuelType = pump.fuelType?.name || 'Unknown';
                if (!acc[fuelType]) acc[fuelType] = [];
                acc[fuelType].push(pump);
                return acc;
              }, {} as Record<string, typeof pumps>);

              return Object.entries(groupedPumps).map(([fuelType, pumps]) => (
                <div key={fuelType} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    {fuelType} Pumps - Cash Received
                  </h3>
                  <div className="grid gap-4">
                    {pumps.map(pump => (
                      <div key={pump.id} className="bg-white rounded-xl border shadow-sm p-6">
                        <div className="font-semibold text-lg">{pump.name}</div>
                        <div className="grid md:grid-cols-3 gap-4 mt-4">
                          <div className="md:col-span-2">
                            <Input 
                              label="Cash Received (₹)" 
                              type="number" 
                              step="0.01"
                              value={cashReceipts[pump.id]?.amount ?? ''} 
                              onChange={e => {
                                const value = e.target.value === '' ? 0 : Number(e.target.value);
                                setCashField(pump.id, 'amount', value);
                              }} 
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
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
          </div>

          {/* Cash Summary */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Total Cash Received</h3>
                <p className="text-sm text-gray-600">Sum of all pump cash receipts</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">₹{Number(totalCash).toFixed(2)}</div>
                <div className="text-sm text-gray-500">for {date}</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveAllCashReceipts} className="btn-primary">
                Save All Cash Receipts
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Online Payments Tab */}
      {activeTab === 'online' && (
        <>
          {/* Add Online Payment Form */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Online Payment</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Input 
                label="Amount (₹)" 
                type="number" 
                step="0.01"
                value={newPayment.amount || ''} 
                onChange={e => setOnlineField('amount', e.target.value === '' ? 0 : Number(e.target.value))} 
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select 
                  value={newPayment.method} 
                  onChange={e => setOnlineField('method', e.target.value as 'UPI' | 'CARD' | 'NET_BANKING')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <Button onClick={saveOnlinePayment} className="btn-primary">
                Record Payment
              </Button>
            </div>
          </div>

          {/* Online Payments Summary */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Total Online Payments</h3>
                <p className="text-sm text-gray-600">Sum of all online payments for the day</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">₹{Number(totalOnline).toFixed(2)}</div>
                <div className="text-sm text-gray-500">for {date}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-8">
          {/* Cash Receipts History */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Cash Receipts History - {date}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pump</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.cashReceipts.map(receipt => (
                    <tr key={receipt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {receipt.pump?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {receipt.pump?.fuelType?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ₹{Number(receipt.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(receipt.date).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Online Payments History */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Online Payments History - {date}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.onlinePayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.method === 'UPI' ? 'bg-green-100 text-green-800' :
                          payment.method === 'CARD' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {payment.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                        ₹{Number(payment.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.reference || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
  );
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
