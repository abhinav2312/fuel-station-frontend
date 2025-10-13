import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

type ValidationData = {
  date: string;
  grossSales: number;
  cashReceipts: number;
  onlinePayments: number;
  creditSales: number;
  totalReceived: number;
  difference: number;
  isBalanced: boolean;
};

export default function Validation() {
  const [date, setDate] = useState<string>(today());
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Message handling with auto-hide
  function showMessage(text: string, type: 'success' | 'error') {
    setMessage(text);
    setMessageType(type);
    if (type === 'success') {
      setTimeout(() => setMessage(''), 2000);
    }
  }

  useEffect(() => {
    if (date) {
      loadValidationData();
    }
  }, [date]);

  async function loadValidationData() {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/validation', { params: { date } });
      setValidationData(response.data);
    } catch (error) {
      console.error('Error loading validation data:', error);
      showMessage('Error loading validation data', 'error');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (isBalanced: boolean) => {
    return isBalanced ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (isBalanced: boolean) => {
    return isBalanced ? (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) : (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  };

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
        <h1 className="page-title">Daily Validation</h1>
        <p className="page-subtitle">Validate cash receipts and online payments against gross sales</p>
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
            <Button onClick={loadValidationData} disabled={loading} className="btn-primary">
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`text-sm p-3 rounded ${
          messageType === 'error' ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
        }`}>
          {message}
        </div>
      )}

      {validationData && (
        <>
          {/* Status Card */}
          <div className={`card ${getStatusColor(validationData.isBalanced)}`}>
            <div className="card-body">
              <div className="flex items-center space-x-4">
                {getStatusIcon(validationData.isBalanced)}
                <div>
                  <h3 className="text-lg font-semibold">
                    {validationData.isBalanced ? 'Balanced' : 'Not Balanced'}
                  </h3>
                  <p className="text-sm">
                    {validationData.isBalanced 
                      ? 'All payments match gross sales' 
                      : `Difference: ₹${Math.abs(validationData.difference).toFixed(2)}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="metric-card">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="metric-label">Gross Sales</p>
                  <p className="metric-value">₹{validationData.grossSales.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="metric-label">Cash Received</p>
                  <p className="metric-value">₹{validationData.cashReceipts.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="metric-label">Online Payments</p>
                  <p className="metric-value">₹{validationData.onlinePayments.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="metric-label">Credit Sales</p>
                  <p className="metric-value">₹{validationData.creditSales.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-slate-900">Payment Breakdown</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-slate-600">Gross Sales (from readings)</span>
                  <span className="font-semibold text-slate-900">₹{validationData.grossSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-slate-600">Cash Received</span>
                  <span className="font-semibold text-green-600">₹{validationData.cashReceipts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-slate-600">Online Payments</span>
                  <span className="font-semibold text-blue-600">₹{validationData.onlinePayments.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-slate-600">Credit Sales</span>
                  <span className="font-semibold text-amber-600">₹{validationData.creditSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-slate-600 font-medium">Total Received</span>
                  <span className="font-bold text-slate-900">₹{validationData.totalReceived.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between items-center py-2 ${
                  validationData.isBalanced ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="font-medium">Difference</span>
                  <span className="font-bold">
                    {validationData.difference >= 0 ? '+' : ''}₹{validationData.difference.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
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
